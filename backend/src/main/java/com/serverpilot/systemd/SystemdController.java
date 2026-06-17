package com.serverpilot.systemd;

import com.serverpilot.audit.AuditService;
import com.serverpilot.ssh.ExecResult;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/systemd")
public class SystemdController {

    private final SystemdService systemdService;
    private final AuditService   auditService;

    public SystemdController(SystemdService systemdService, AuditService auditService) {
        this.systemdService = systemdService;
        this.auditService   = auditService;
    }

    @GetMapping("/units")
    public ResponseEntity<?> listUnits() {
        try {
            List<UnitDTO> units = systemdService.listUnits();
            return ResponseEntity.ok(units);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{unit}/status")
    public ResponseEntity<?> status(@PathVariable String unit) {
        try {
            String status = systemdService.getStatus(unit);
            return ResponseEntity.ok(Map.of("status", status));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{unit}/{action}")
    public ResponseEntity<?> action(@PathVariable String unit, @PathVariable String action) {
        try {
            ExecResult r = systemdService.action(unit, action);
            String result = r.exitCode() == 0 ? "OK" : "ERROR";
            auditService.log("SYSTEMD_" + action.toUpperCase(), unit, result, "exit=" + r.exitCode());
            return ResponseEntity.ok(Map.of("result", result, "exitCode", r.exitCode(),
                "output", r.stdout() + r.stderr()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
