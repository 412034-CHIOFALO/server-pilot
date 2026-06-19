package com.serverpilot.idrac;

import com.serverpilot.audit.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/idrac")
public class IdracController {

    private final IdracConfigService configService;
    private final IdracService       idracService;
    private final AuditService       auditService;

    public IdracController(IdracConfigService configService, IdracService idracService,
                           AuditService auditService) {
        this.configService = configService;
        this.idracService  = idracService;
        this.auditService  = auditService;
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        IdracConfig cfg = configService.get();
        return ResponseEntity.ok(Map.of(
            "ip",          cfg.ip()       != null ? cfg.ip()       : "",
            "username",    cfg.username() != null ? cfg.username() : "",
            "hasPassword", (cfg.password() != null && !cfg.password().isBlank()) ? "true" : "false"
        ));
    }

    @PutMapping("/config")
    public ResponseEntity<Void> saveConfig(@RequestBody Map<String, String> body) {
        String ip       = body.getOrDefault("ip", "").trim();
        String username = body.getOrDefault("username", "").trim();
        String password = body.get("password");
        if (password == null || password.isBlank()) {
            password = configService.get().password();
        }
        configService.save(new IdracConfig(ip, username, password));
        auditService.log("IDRAC_CONFIG_SAVE", ip, "OK", "");
        return ResponseEntity.ok().build();
    }

    @GetMapping("/power")
    public ResponseEntity<Map<String, String>> getPowerState() {
        return ResponseEntity.ok(Map.of("state", idracService.getPowerState()));
    }

    @PostMapping("/power/{action}")
    public ResponseEntity<Map<String, String>> powerAction(@PathVariable String action) {
        // Map UI action names to ipmitool chassis power subcommands
        String ipmiCmd = switch (action) {
            case "on"            -> "on";    // Power on
            case "off"           -> "soft";  // Graceful shutdown via ACPI
            case "force-off"     -> "off";   // Immediate power cut
            case "restart"       -> "cycle"; // Power cycle (graceful)
            case "force-restart" -> "reset"; // Hard reset (no OS notification)
            default -> throw new IllegalArgumentException("Acción desconocida: " + action);
        };
        try {
            idracService.powerAction(ipmiCmd);
            auditService.log("IDRAC_POWER", action, "OK", "ipmitool chassis power " + ipmiCmd);
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            auditService.log("IDRAC_POWER", action, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/sensors")
    public ResponseEntity<?> getSensors() {
        try {
            List<Map<String, String>> sensors = idracService.getSensors();
            return ResponseEntity.ok(sensors);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
