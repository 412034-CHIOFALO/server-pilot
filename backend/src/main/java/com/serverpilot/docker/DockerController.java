package com.serverpilot.docker;

import com.serverpilot.audit.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/docker")
public class DockerController {

    private final DockerService dockerService;
    private final AuditService auditService;

    public DockerController(DockerService dockerService, AuditService auditService) {
        this.dockerService = dockerService;
        this.auditService  = auditService;
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

    @GetMapping("/info")
    public ResponseEntity<Map<String, Object>> info() {
        try {
            return ResponseEntity.ok(dockerService.getInfo());
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
