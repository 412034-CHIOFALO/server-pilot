package com.serverpilot.process;

import com.serverpilot.audit.AuditService;
import com.serverpilot.ssh.SshService;
import oshi.SystemInfo;
import oshi.software.os.OSProcess;
import oshi.software.os.OperatingSystem;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ProcessService {

    private final SystemInfo si = new SystemInfo();
    private final OperatingSystem os = si.getOperatingSystem();
    private final Map<Integer, OSProcess> prevSnapshot = new ConcurrentHashMap<>();

    private final SshService sshService;
    private final AuditService auditService;

    public ProcessService(SshService sshService, AuditService auditService) {
        this.sshService   = sshService;
        this.auditService = auditService;
    }

    public List<ProcessDTO> getTopProcesses(int limit) {
        List<OSProcess> procs = os.getProcesses(null, OperatingSystem.ProcessSorting.CPU_DESC, limit * 2);
        if (procs == null) return List.of();

        List<ProcessDTO> result = new ArrayList<>();
        for (OSProcess proc : procs) {
            OSProcess prev = prevSnapshot.get(proc.getProcessID());
            double cpu = prev != null
                ? proc.getProcessCpuLoadBetweenTicks(prev) * 100.0
                : 0.0;
            cpu = Math.max(0.0, Math.min(100.0, cpu));

            long rssMB = proc.getResidentSetSize() / (1024 * 1024);
            result.add(new ProcessDTO(
                proc.getProcessID(),
                proc.getName(),
                proc.getUser() != null ? proc.getUser() : "?",
                Math.round(cpu * 10.0) / 10.0,
                rssMB,
                proc.getState().name()
            ));
        }

        // update snapshot
        Map<Integer, OSProcess> newSnap = new HashMap<>();
        for (OSProcess p : procs) newSnap.put(p.getProcessID(), p);
        prevSnapshot.clear();
        prevSnapshot.putAll(newSnap);

        result.sort(Comparator.comparingDouble(ProcessDTO::cpuPercent).reversed());
        return result.subList(0, Math.min(limit, result.size()));
    }

    public void kill(int pid, boolean force) throws Exception {
        String signal = force ? "KILL" : "TERM";
        var r = sshService.execCommand("kill -" + signal + " " + pid);
        String detail = "exit=" + r.exitCode() + (r.stderr().isBlank() ? "" : " " + r.stderr().trim());
        if (r.exitCode() != 0) {
            auditService.log("PROCESS_KILL", String.valueOf(pid), "ERROR", detail);
            throw new RuntimeException("kill failed: " + r.stderr());
        }
        auditService.log("PROCESS_KILL", String.valueOf(pid), "OK", "signal=" + signal);
    }
}
