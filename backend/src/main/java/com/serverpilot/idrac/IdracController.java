package com.serverpilot.idrac;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/idrac")
public class IdracController {

    private final IdracConfigService configService;
    private final IdracService idracService;

    public IdracController(IdracConfigService configService, IdracService idracService) {
        this.configService = configService;
        this.idracService = idracService;
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        IdracConfig cfg = configService.get();
        // never return the password to the frontend
        return ResponseEntity.ok(Map.of(
            "ip", cfg.ip() != null ? cfg.ip() : "",
            "username", cfg.username() != null ? cfg.username() : "",
            "hasPassword", (cfg.password() != null && !cfg.password().isBlank()) ? "true" : "false"
        ));
    }

    @PutMapping("/config")
    public ResponseEntity<Void> saveConfig(@RequestBody Map<String, String> body) {
        String ip = body.getOrDefault("ip", "").trim();
        String username = body.getOrDefault("username", "").trim();
        String password = body.get("password");
        if (password == null || password.isBlank()) {
            // keep existing password if not provided
            password = configService.get().password();
        }
        configService.save(new IdracConfig(ip, username, password));
        return ResponseEntity.ok().build();
    }

    @GetMapping("/power")
    public ResponseEntity<Map<String, String>> getPowerState() {
        return ResponseEntity.ok(Map.of("state", idracService.getPowerState()));
    }

    @PostMapping("/power/{action}")
    public ResponseEntity<Map<String, String>> powerAction(@PathVariable String action) {
        String resetType = switch (action) {
            case "on" -> "On";
            case "off" -> "GracefulShutdown";
            case "force-off" -> "ForceOff";
            case "restart" -> "GracefulRestart";
            case "force-restart" -> "ForceRestart";
            default -> throw new IllegalArgumentException("Acción desconocida: " + action);
        };
        try {
            idracService.powerAction(resetType);
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
