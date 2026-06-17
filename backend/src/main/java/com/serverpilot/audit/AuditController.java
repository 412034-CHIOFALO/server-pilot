package com.serverpilot.audit;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/audit")
public class AuditController {

    private final AuditService auditService;

    public AuditController(AuditService auditService) {
        this.auditService = auditService;
    }

    @GetMapping
    public List<AuditEntry> getAudit(@RequestParam(defaultValue = "200") int limit) {
        return auditService.readLast(Math.min(limit, 1000));
    }
}
