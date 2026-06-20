package com.serverpilot.docker;

import com.serverpilot.audit.AuditService;
import com.serverpilot.settings.WebhookService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Polls Docker every 20 s and fires webhook notifications on container state transitions.
 * The first poll only establishes the baseline — no notifications are sent on startup.
 */
@Component
public class ContainerStateMonitor {

    private static final Logger log = LoggerFactory.getLogger(ContainerStateMonitor.class);
    private static final Pattern EXIT_CODE_PATTERN = Pattern.compile("Exited \\((\\d+)\\)");

    private final DockerService               dockerService;
    private final WebhookService              webhookService;
    private final ContainerAlertConfigService configService;
    private final AuditService                auditService;

    /** id → snapshot of last known state */
    private final ConcurrentHashMap<String, Snapshot> previous = new ConcurrentHashMap<>();
    private volatile boolean initialized = false;

    public ContainerStateMonitor(DockerService dockerService,
                                 WebhookService webhookService,
                                 ContainerAlertConfigService configService,
                                 AuditService auditService) {
        this.dockerService  = dockerService;
        this.webhookService = webhookService;
        this.configService  = configService;
        this.auditService   = auditService;
    }

    @Scheduled(fixedDelay = 20_000)
    public void check() {
        ContainerAlertConfig cfg = configService.get();

        List<ContainerDTO> current;
        try {
            current = dockerService.listContainers(true);
        } catch (Exception e) {
            log.debug("ContainerStateMonitor: Docker not reachable — {}", e.getMessage());
            return;
        }

        Set<String> currentIds = new HashSet<>();

        for (ContainerDTO c : current) {
            currentIds.add(c.id());

            // Skip containers the user wants to ignore
            if (cfg.excludedNames != null && cfg.excludedNames.contains(c.name())) continue;

            Snapshot curr = new Snapshot(c.name(), c.state(), health(c.status()));

            if (!initialized) {
                previous.put(c.id(), curr);
                continue;
            }

            Snapshot prev = previous.get(c.id());
            if (prev != null && cfg.enabled) {
                detectAndNotify(prev, curr, c.status());
            }
            previous.put(c.id(), curr);
        }

        // Forget containers that no longer exist
        previous.keySet().retainAll(currentIds);

        if (!initialized) {
            initialized = true;
            log.info("ContainerStateMonitor: baseline recorded for {} containers", previous.size());
        }
    }

    // ── transition detection ─────────────────────────────────────────────────

    private void detectAndNotify(Snapshot prev, Snapshot curr, String rawStatus) {
        String name = curr.name;

        // running → exited / dead
        if ("running".equals(prev.state)
                && ("exited".equals(curr.state) || "dead".equals(curr.state))) {
            String exitCode = parseExitCode(rawStatus);
            String msg = "⚠️ " + name + " se detuvo"
                    + (exitCode != null ? " (exit code " + exitCode + ")" : "");
            fire(msg, "CONTAINER_STOPPED", name);
        }

        // non-running → running
        else if (!"running".equals(prev.state) && "running".equals(curr.state)) {
            fire("✅ " + name + " volvió a estar arriba", "CONTAINER_STARTED", name);
        }

        // health transitions to unhealthy (only once per transition)
        if (!"unhealthy".equals(prev.health) && "unhealthy".equals(curr.health)) {
            fire("⚠️ " + name + " está unhealthy", "CONTAINER_UNHEALTHY", name);
        }
    }

    private void fire(String message, String action, String target) {
        log.info("Container alert: {}", message);
        webhookService.send(message);
        auditService.log(action, target, "OK", message);
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static String health(String status) {
        if (status == null) return "";
        if (status.contains("(unhealthy)")) return "unhealthy";
        if (status.contains("(healthy)"))   return "healthy";
        return "";
    }

    private static String parseExitCode(String status) {
        if (status == null) return null;
        Matcher m = EXIT_CODE_PATTERN.matcher(status);
        return m.find() ? m.group(1) : null;
    }

    // ── inner snapshot ───────────────────────────────────────────────────────

    private record Snapshot(String name, String state, String health) {}
}
