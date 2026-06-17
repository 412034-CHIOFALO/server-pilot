package com.serverpilot.metrics;

import io.micrometer.core.instrument.Gauge;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

@Component
public class PrometheusMetricsBinder {

    private final MeterRegistry registry;
    private final MetricsScheduler metricsScheduler;

    public PrometheusMetricsBinder(MeterRegistry registry, MetricsScheduler metricsScheduler) {
        this.registry = registry;
        this.metricsScheduler = metricsScheduler;
    }

    @PostConstruct
    public void bindGauges() {
        Gauge.builder("server_pilot_cpu_usage_percent", metricsScheduler,
                s -> s.getLastSnapshot() != null ? s.getLastSnapshot().cpu().usagePercent() : 0)
            .description("CPU usage percent")
            .register(registry);

        Gauge.builder("server_pilot_ram_used_mb", metricsScheduler,
                s -> s.getLastSnapshot() != null ? s.getLastSnapshot().ram().usedMB() : 0)
            .description("RAM used in MB")
            .register(registry);

        Gauge.builder("server_pilot_ram_total_mb", metricsScheduler,
                s -> s.getLastSnapshot() != null ? s.getLastSnapshot().ram().totalMB() : 0)
            .description("RAM total in MB")
            .register(registry);

        Gauge.builder("server_pilot_ram_usage_percent", metricsScheduler,
                s -> s.getLastSnapshot() != null ? s.getLastSnapshot().ram().usagePercent() : 0)
            .description("RAM usage percent")
            .register(registry);

        Gauge.builder("server_pilot_uptime_seconds", metricsScheduler,
                s -> s.getLastSnapshot() != null ? s.getLastSnapshot().uptimeSeconds() : 0)
            .description("System uptime in seconds")
            .register(registry);

        Gauge.builder("server_pilot_disk_used_gb", metricsScheduler,
                s -> {
                    if (s.getLastSnapshot() == null || s.getLastSnapshot().disks().isEmpty()) return 0.0;
                    return s.getLastSnapshot().disks().stream()
                        .filter(d -> d.path().equals("/") || d.path().equals("C:\\"))
                        .findFirst()
                        .map(MetricsSnapshot.Disk::usedGB)
                        .orElse(s.getLastSnapshot().disks().get(0).usedGB());
                })
            .description("Root disk used in GB")
            .register(registry);

        Gauge.builder("server_pilot_disk_total_gb", metricsScheduler,
                s -> {
                    if (s.getLastSnapshot() == null || s.getLastSnapshot().disks().isEmpty()) return 0.0;
                    return s.getLastSnapshot().disks().stream()
                        .filter(d -> d.path().equals("/") || d.path().equals("C:\\"))
                        .findFirst()
                        .map(MetricsSnapshot.Disk::totalGB)
                        .orElse(s.getLastSnapshot().disks().get(0).totalGB());
                })
            .description("Root disk total in GB")
            .register(registry);
    }
}
