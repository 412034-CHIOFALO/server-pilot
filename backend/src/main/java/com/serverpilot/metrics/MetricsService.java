package com.serverpilot.metrics;

import org.springframework.stereotype.Service;
import oshi.SystemInfo;
import oshi.hardware.CentralProcessor;
import oshi.hardware.GlobalMemory;
import oshi.hardware.NetworkIF;
import oshi.software.os.OSFileStore;
import oshi.software.os.OperatingSystem;

import jakarta.annotation.PostConstruct;
import java.util.*;

@Service
public class MetricsService {

    private final SystemInfo si = new SystemInfo();
    private final CentralProcessor processor = si.getHardware().getProcessor();
    private final GlobalMemory memory = si.getHardware().getMemory();
    private final OperatingSystem os = si.getOperatingSystem();

    private long[] prevCpuTicks;
    private final Map<String, long[]> prevNetBytes = new HashMap<>();
    private final Map<String, Long> prevNetTime = new HashMap<>();

    private static final Set<String> EXCLUDED_FS = Set.of("tmpfs", "devtmpfs", "overlay", "squashfs");

    @PostConstruct
    public void init() {
        prevCpuTicks = processor.getSystemCpuLoadTicks();
    }

    public MetricsSnapshot getSnapshot() {
        double cpuLoad = processor.getSystemCpuLoadBetweenTicks(prevCpuTicks) * 100.0;
        prevCpuTicks = processor.getSystemCpuLoadTicks();

        long totalMB = memory.getTotal() / (1024 * 1024);
        long availMB = memory.getAvailable() / (1024 * 1024);
        long usedMB = totalMB - availMB;
        double ramUsage = totalMB > 0 ? (usedMB * 100.0 / totalMB) : 0;

        List<MetricsSnapshot.Disk> disks = new ArrayList<>();
        for (OSFileStore fs : os.getFileSystem().getFileStores()) {
            if (EXCLUDED_FS.contains(fs.getType())) continue;
            double totalGB = fs.getTotalSpace() / (1024.0 * 1024 * 1024);
            double freeGB = fs.getFreeSpace() / (1024.0 * 1024 * 1024);
            double usedGB = totalGB - freeGB;
            double usagePercent = totalGB > 0 ? (usedGB / totalGB * 100.0) : 0;
            disks.add(new MetricsSnapshot.Disk(fs.getMount(), totalGB, usedGB, freeGB, usagePercent));
        }

        List<MetricsSnapshot.Net> nets = new ArrayList<>();
        List<NetworkIF> interfaces = si.getHardware().getNetworkIFs();
        for (NetworkIF nif : interfaces) {
            String name = nif.getName();
            if ("lo".equals(name)) continue;
            nif.updateAttributes();
            long curRx = nif.getBytesRecv();
            long curTx = nif.getBytesSent();
            long now = System.nanoTime();

            long rxRate = 0;
            long txRate = 0;
            if (prevNetBytes.containsKey(name)) {
                long[] prev = prevNetBytes.get(name);
                long prevTime = prevNetTime.get(name);
                double dtSec = (now - prevTime) / 1_000_000_000.0;
                if (dtSec > 0) {
                    rxRate = (long) Math.max(0, (curRx - prev[0]) / dtSec);
                    txRate = (long) Math.max(0, (curTx - prev[1]) / dtSec);
                }
            }
            prevNetBytes.put(name, new long[]{curRx, curTx});
            prevNetTime.put(name, now);
            nets.add(new MetricsSnapshot.Net(name, rxRate, txRate));
        }

        long uptimeSeconds = os.getSystemUptime();
        long timestamp = System.currentTimeMillis();

        return new MetricsSnapshot(
            new MetricsSnapshot.Cpu(Math.min(100.0, Math.max(0.0, cpuLoad))),
            new MetricsSnapshot.Ram(totalMB, usedMB, availMB, ramUsage),
            disks,
            nets,
            uptimeSeconds,
            timestamp
        );
    }
}
