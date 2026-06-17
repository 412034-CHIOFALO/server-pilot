package com.serverpilot.settings;

import com.serverpilot.audit.AuditService;
import com.serverpilot.ssh.SshService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/settings")
public class SettingsController {

    private final SettingsService settingsService;
    private final SshService sshService;
    private final AuditService auditService;

    public SettingsController(SettingsService settingsService, SshService sshService,
                              AuditService auditService) {
        this.settingsService = settingsService;
        this.sshService      = sshService;
        this.auditService    = auditService;
    }

    @GetMapping
    public ResponseEntity<Map<String, Object>> get() {
        AppSettings s = settingsService.get();
        return ResponseEntity.ok(Map.of(
            "ssh", Map.of(
                "host",     s.ssh.host,
                "port",     s.ssh.port,
                "username", s.ssh.username,
                "keyPath",  s.ssh.keyPath
            ),
            "idrac", Map.of(
                "enabled",  s.idrac.enabled,
                "host",     s.idrac.host,
                "username", s.idrac.username,
                "password", s.idrac.password.isBlank() ? "" : "********"
            ),
            "alerts", Map.of(
                "url",  s.alerts.url,
                "type", s.alerts.type
            ),
            "auth", Map.of(
                "username", s.auth.username
            )
        ));
    }

    @PutMapping
    public ResponseEntity<Void> update(@RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        Map<String, Object> ssh = (Map<String, Object>) body.get("ssh");
        if (ssh != null) {
            String host     = (String)  ssh.getOrDefault("host", "");
            int    port     = ((Number) ssh.getOrDefault("port", 22)).intValue();
            String username = (String)  ssh.getOrDefault("username", "");
            String keyPath  = (String)  ssh.getOrDefault("keyPath", "");
            settingsService.updateSsh(host, port, username, keyPath);
            sshService.setConfig(host, port, username, keyPath);
            auditService.log("SETTINGS_SSH", host, "OK", "");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> idrac = (Map<String, Object>) body.get("idrac");
        if (idrac != null) {
            boolean enabled  = Boolean.TRUE.equals(idrac.get("enabled"));
            String  host     = (String) idrac.getOrDefault("host", "");
            String  username = (String) idrac.getOrDefault("username", "");
            String  password = (String) idrac.getOrDefault("password", "");
            settingsService.updateIdrac(enabled, host, username, password);
            auditService.log("SETTINGS_IDRAC", host, "OK", "");
        }

        @SuppressWarnings("unchecked")
        Map<String, Object> alerts = (Map<String, Object>) body.get("alerts");
        if (alerts != null) {
            String url  = (String) alerts.getOrDefault("url", "");
            String type = (String) alerts.getOrDefault("type", "webhook");
            settingsService.updateAlerts(url, type);
            auditService.log("SETTINGS_ALERTS", url, "OK", "");
        }
        return ResponseEntity.ok().build();
    }

    @PutMapping("/credentials")
    public ResponseEntity<Map<String, String>> updateCredentials(@RequestBody Map<String, String> body) {
        String username    = body.getOrDefault("username", "").trim();
        String newPassword = body.getOrDefault("newPassword", "");
        if (username.isBlank() || newPassword.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username y password son requeridos"));
        }
        settingsService.updateCredentials(username, newPassword);
        auditService.log("SETTINGS_CREDENTIALS", username, "OK", "password changed");
        return ResponseEntity.ok(Map.of("result", "ok"));
    }

    @PostMapping("/test/ssh")
    public ResponseEntity<Map<String, String>> testSsh() {
        try {
            com.serverpilot.ssh.ExecResult r = sshService.execCommand("echo ok");
            if (r.exitCode() == 0) return ResponseEntity.ok(Map.of("result", "OK", "detail", r.stdout().trim()));
            return ResponseEntity.ok(Map.of("result", "ERROR", "detail", r.stderr()));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("result", "ERROR", "detail", e.getMessage()));
        }
    }

    @PostMapping("/test/idrac")
    public ResponseEntity<Map<String, String>> testIdrac() {
        AppSettings s = settingsService.get();
        if (s.idrac.host.isBlank()) {
            return ResponseEntity.ok(Map.of("result", "ERROR", "detail", "Host iDRAC no configurado"));
        }
        try {
            javax.net.ssl.SSLContext ctx = javax.net.ssl.SSLContext.getInstance("TLS");
            ctx.init(null, new javax.net.ssl.TrustManager[]{
                new javax.net.ssl.X509TrustManager() {
                    public java.security.cert.X509Certificate[] getAcceptedIssuers() { return new java.security.cert.X509Certificate[0]; }
                    public void checkClientTrusted(java.security.cert.X509Certificate[] c, String a) {}
                    public void checkServerTrusted(java.security.cert.X509Certificate[] c, String a) {}
                }
            }, new java.security.SecureRandom());
            java.net.URL url = new java.net.URL("https://" + s.idrac.host + "/redfish/v1/");
            javax.net.ssl.HttpsURLConnection conn = (javax.net.ssl.HttpsURLConnection) url.openConnection();
            conn.setSSLSocketFactory(ctx.getSocketFactory());
            conn.setHostnameVerifier((h, sess) -> true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            int code = conn.getResponseCode();
            conn.disconnect();
            return ResponseEntity.ok(Map.of("result", "OK", "detail", "HTTP " + code));
        } catch (Exception e) {
            return ResponseEntity.ok(Map.of("result", "ERROR", "detail", e.getMessage()));
        }
    }
}
