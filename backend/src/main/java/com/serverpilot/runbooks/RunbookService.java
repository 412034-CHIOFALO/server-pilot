package com.serverpilot.runbooks;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.serverpilot.audit.AuditService;
import com.serverpilot.ssh.ExecResult;
import com.serverpilot.ssh.SshService;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;

@Service
public class RunbookService {

    @Value("${sp.data.path}")
    private String dataPath;

    private final ObjectMapper objectMapper;
    private final SshService sshService;
    private final AuditService auditService;
    private File dataFile;
    private List<Runbook> runbooks;

    public RunbookService(ObjectMapper objectMapper, SshService sshService, AuditService auditService) {
        this.objectMapper = objectMapper;
        this.sshService   = sshService;
        this.auditService = auditService;
    }

    @PostConstruct
    public synchronized void init() {
        dataFile = new File(dataPath, "runbooks.json");
        if (dataFile.exists()) {
            try {
                runbooks = objectMapper.readValue(dataFile, new TypeReference<>() {});
            } catch (Exception e) {
                runbooks = seedDefaults();
                save();
            }
        } else {
            runbooks = seedDefaults();
            save();
        }
        // Migration: seed updates runbook if absent
        if (runbooks.stream().noneMatch(r -> "Aplicar updates del SO".equals(r.name))) {
            runbooks.add(new Runbook(uuid(), "Aplicar updates del SO",
                "Actualiza todos los paquetes del sistema", "sudo apt-get upgrade -y", true));
            save();
        }
    }

    private List<Runbook> seedDefaults() {
        return new ArrayList<>(List.of(
            new Runbook(uuid(), "Uso de disco",       "Muestra el uso de cada partición",       "df -h",                             false),
            new Runbook(uuid(), "Uptime",             "Tiempo de actividad y carga del sistema", "uptime",                            false),
            new Runbook(uuid(), "Limpiar Docker",     "Elimina imágenes y contenedores sin uso", "docker system prune -f",            true),
            new Runbook(uuid(), "Top memoria",        "Top 10 procesos por uso de memoria",      "ps aux --sort=-%mem | head -10",    false)
        ));
    }

    private String uuid() { return UUID.randomUUID().toString(); }

    private void save() {
        try {
            new File(dataPath).mkdirs();
            objectMapper.writeValue(dataFile, runbooks);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save runbooks.json", e);
        }
    }

    public synchronized List<Runbook> getAll() {
        return List.copyOf(runbooks);
    }

    public synchronized Runbook getById(String id) {
        return runbooks.stream().filter(r -> r.id.equals(id)).findFirst()
            .orElseThrow(() -> new NoSuchElementException("Runbook not found: " + id));
    }

    public synchronized Runbook add(Runbook rb) {
        rb.id = uuid();
        runbooks.add(rb);
        save();
        return rb;
    }

    public synchronized Runbook update(String id, Runbook rb) {
        Runbook existing = getById(id);
        existing.name        = rb.name;
        existing.description = rb.description;
        existing.command     = rb.command;
        existing.confirm     = rb.confirm;
        save();
        return existing;
    }

    public synchronized void delete(String id) {
        runbooks.removeIf(r -> r.id.equals(id));
        save();
    }

    public RunResult run(String id) throws Exception {
        Runbook rb = getById(id);
        ExecResult r = sshService.execCommand(rb.command);
        RunResult result = new RunResult(r.stdout(), r.stderr(), r.exitCode());
        String status = r.exitCode() == 0 ? "OK" : "ERROR";
        auditService.log("RUNBOOK_RUN", rb.name, status, "exit=" + r.exitCode());
        return result;
    }
}
