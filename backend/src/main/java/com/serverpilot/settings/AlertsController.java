package com.serverpilot.settings;

import com.serverpilot.audit.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertsController {

    private final SettingsService settingsService;
    private final AuditService    auditService;
    private final WebhookService  webhookService;

    public AlertsController(SettingsService settingsService,
                            AuditService auditService,
                            WebhookService webhookService) {
        this.settingsService = settingsService;
        this.auditService    = auditService;
        this.webhookService  = webhookService;
    }

    @GetMapping("/config")
    public ResponseEntity<Map<String, String>> getConfig() {
        AppSettings.AlertSettings a = settingsService.get().alerts;
        return ResponseEntity.ok(Map.of("url", a.url, "type", a.type));
    }

    @PutMapping("/config")
    public ResponseEntity<Void> saveConfig(@RequestBody Map<String, String> body) {
        String url  = body.getOrDefault("url", "");
        String type = body.getOrDefault("type", "webhook");
        settingsService.updateAlerts(url, type);
        auditService.log("ALERTS_CONFIG", url, "OK", type);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> test() {
        AppSettings.AlertSettings a = settingsService.get().alerts;
        if (a.url.isBlank()) {
            return ResponseEntity.ok(Map.of("result", "ERROR", "detail", "URL no configurada"));
        }
        boolean ok = webhookService.send("Server Pilot: test de notificación");
        return ResponseEntity.ok(Map.of(
            "result", ok ? "OK" : "ERROR",
            "detail", ok ? "Notificación enviada" : "Error al enviar"
        ));
    }
}
