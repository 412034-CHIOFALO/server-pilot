package com.serverpilot.updates;

import com.serverpilot.audit.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/updates")
public class UpdatesController {

    private final UpdatesService updatesService;
    private final AuditService auditService;

    public UpdatesController(UpdatesService updatesService, AuditService auditService) {
        this.updatesService = updatesService;
        this.auditService   = auditService;
    }

    @GetMapping
    public ResponseEntity<?> check() {
        try {
            UpdateInfo info = updatesService.check();
            auditService.log("UPDATES_CHECK", "apt", "OK", "count=" + info.count());
            return ResponseEntity.ok(info);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
