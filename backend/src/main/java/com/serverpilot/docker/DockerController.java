package com.serverpilot.docker;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/docker")
public class DockerController {

    private final DockerService dockerService;

    public DockerController(DockerService dockerService) {
        this.dockerService = dockerService;
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
            return ResponseEntity.ok(Map.of("result", "started"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/containers/{id}/stop")
    public ResponseEntity<Map<String, String>> stop(@PathVariable String id) {
        try {
            dockerService.stopContainer(id);
            return ResponseEntity.ok(Map.of("result", "stopped"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/containers/{id}/restart")
    public ResponseEntity<Map<String, String>> restart(@PathVariable String id) {
        try {
            dockerService.restartContainer(id);
            return ResponseEntity.ok(Map.of("result", "restarted"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/containers/{id}")
    public ResponseEntity<Map<String, String>> remove(@PathVariable String id) {
        try {
            dockerService.removeContainer(id);
            return ResponseEntity.ok(Map.of("result", "removed"));
        } catch (Exception e) {
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
