package com.serverpilot.settings;

import com.serverpilot.audit.AuditService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/alerts")
public class AlertsController {

    private final SettingsService settingsService;
    private final AuditService auditService;

    public AlertsController(SettingsService settingsService, AuditService auditService) {
        this.settingsService = settingsService;
        this.auditService    = auditService;
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
        try {
            java.net.URL u = new java.net.URL(a.url);
            java.net.HttpURLConnection conn = (java.net.HttpURLConnection) u.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.getOutputStream().write("{\"text\":\"Server Pilot: test de notificación\"}".getBytes());
            int code = conn.getResponseCode();
            conn.disconnect();
            return ResponseEntity.ok(Map.of("result", code < 400 ? "OK" : "ERROR", "detail", "HTTP " + code));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("result", "ERROR", "detail", e.getMessage()));
        }
    }
}
