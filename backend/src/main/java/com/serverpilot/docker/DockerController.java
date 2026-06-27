package com.serverpilot.docker;

import com.serverpilot.audit.AuditService;
import com.serverpilot.ssh.ExecResult;
import com.serverpilot.ssh.SshService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/docker")
public class DockerController {

    private static final Set<String> COMPOSE_ACTIONS = Set.of("up", "stop", "restart", "down");

    private final DockerService dockerService;
    private final AuditService  auditService;
    private final SshService    sshService;

    public DockerController(DockerService dockerService, AuditService auditService, SshService sshService) {
        this.dockerService = dockerService;
        this.auditService  = auditService;
        this.sshService    = sshService;
    }

    @GetMapping("/containers")
    public ResponseEntity<List<ContainerDTO>> listContainers(
            @RequestParam(defaultValue = "true") boolean all) {
        try {
            return ResponseEntity.ok(dockerService.listContainers(all));
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    @PostMapping("/containers/{id}/start")
    public ResponseEntity<Map<String, String>> start(@PathVariable String id) {
        try {
            dockerService.startContainer(id);
            auditService.log("DOCKER_START", id, "OK", "");
            return ResponseEntity.ok(Map.of("result", "started"));
        } catch (Exception e) {
            auditService.log("DOCKER_START", id, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/containers/{id}/stop")
    public ResponseEntity<Map<String, String>> stop(@PathVariable String id) {
        try {
            dockerService.stopContainer(id);
            auditService.log("DOCKER_STOP", id, "OK", "");
            return ResponseEntity.ok(Map.of("result", "stopped"));
        } catch (Exception e) {
            auditService.log("DOCKER_STOP", id, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/containers/{id}/restart")
    public ResponseEntity<Map<String, String>> restart(@PathVariable String id) {
        try {
            dockerService.restartContainer(id);
            auditService.log("DOCKER_RESTART", id, "OK", "");
            return ResponseEntity.ok(Map.of("result", "restarted"));
        } catch (Exception e) {
            auditService.log("DOCKER_RESTART", id, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/containers/{id}")
    public ResponseEntity<Map<String, String>> remove(@PathVariable String id) {
        try {
            dockerService.removeContainer(id);
            auditService.log("DOCKER_REMOVE", id, "OK", "");
            return ResponseEntity.ok(Map.of("result", "removed"));
        } catch (Exception e) {
            auditService.log("DOCKER_REMOVE", id, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/projects/{project}/compose")
    public ResponseEntity<Map<String, Object>> composeAction(
            @PathVariable String project,
            @RequestBody Map<String, String> body) {

        String action = body.get("action");
        if (!COMPOSE_ACTIONS.contains(action)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Acción inválida: " + action));
        }

        try {
            DockerService.ComposeInfo info = dockerService.getComposeInfo(project);

            if (info != null) {
                String cmd = buildComposeCommand(info, action);
                ExecResult r = sshService.execCommand(cmd, 120_000);
                String output = r.stdout() + (r.stderr().isBlank() ? "" : "\n[stderr]\n" + r.stderr());
                String status = r.exitCode() == 0 ? "OK" : "ERROR";
                auditService.log("COMPOSE_" + action.toUpperCase(), project, status,
                    "cmd=" + cmd + " exit=" + r.exitCode());
                return ResponseEntity.ok(Map.of("output", output, "exitCode", r.exitCode()));
            }

            // Fallback: per-container via docker-java
            List<String> ids = dockerService.getContainerIdsByProject(project);
            StringBuilder out = new StringBuilder("(Sin labels compose — operación por contenedor)\n");
            int errors = 0;
            for (String id : ids) {
                String shortId = id.length() >= 12 ? id.substring(0, 12) : id;
                try {
                    switch (action) {
                        case "up"      -> dockerService.startContainer(id);
                        case "stop"    -> dockerService.stopContainer(id);
                        case "restart" -> dockerService.restartContainer(id);
                        case "down"    -> dockerService.stopContainer(id);
                    }
                    out.append(shortId).append(": OK\n");
                } catch (Exception ex) {
                    out.append(shortId).append(": ").append(ex.getMessage()).append("\n");
                    errors++;
                }
            }
            String status = errors == 0 ? "OK" : "PARTIAL";
            auditService.log("COMPOSE_" + action.toUpperCase(), project, status, "fallback containers=" + ids.size());
            return ResponseEntity.ok(Map.of("output", out.toString(), "exitCode", errors == 0 ? 0 : 1));

        } catch (Exception e) {
            auditService.log("COMPOSE_" + action.toUpperCase(), project, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    private String buildComposeCommand(DockerService.ComposeInfo info, String action) {
        StringBuilder cmd = new StringBuilder("docker compose");
        for (String f : info.configFiles().split(",")) {
            String t = f.trim();
            if (!t.isEmpty()) cmd.append(" -f ").append(t);
        }
        cmd.append(" --project-directory ").append(info.workingDir());
        String base = cmd.toString();
        return switch (action) {
            case "up"      -> base + " up -d";
            case "stop"    -> base + " stop";
            case "restart" -> base + " restart";
            case "down"    -> base + " down";
            default        -> throw new IllegalArgumentException("Unknown action: " + action);
        };
    }

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        try {
            return ResponseEntity.ok(dockerService.getInfo());
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
