package com.serverpilot.metrics;

import java.util.List;

public record MetricsSnapshot(
    Cpu cpu,
    Ram ram,
    List<Disk> disks,
    List<Net> net,
    long uptimeSeconds,
    long timestamp
) {
    public record Cpu(double usagePercent) {}

    public record Ram(long totalMB, long usedMB, long freeMB, double usagePercent) {}

    public record Disk(String path, double totalGB, double usedGB, double freeGB, double usagePercent) {}

    public record Net(String name, long rxBytesPerSec, long txBytesPerSec) {}
}
