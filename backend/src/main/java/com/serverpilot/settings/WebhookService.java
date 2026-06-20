package com.serverpilot.settings;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

@Service
public class WebhookService {

    private static final Logger log = LoggerFactory.getLogger(WebhookService.class);

    private final SettingsService settingsService;

    public WebhookService(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    /**
     * Sends a message to the configured webhook URL.
     * Adapts the payload format to the configured type (ntfy, discord, slack/webhook).
     * Returns false silently if the URL is not configured.
     */
    public boolean send(String message) {
        AppSettings.AlertSettings a = settingsService.get().alerts;
        if (a.url == null || a.url.isBlank()) return false;
        try {
            URL u = new URL(a.url);
            HttpURLConnection conn = (HttpURLConnection) u.openConnection();
            conn.setRequestMethod("POST");
            conn.setDoOutput(true);
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);

            String body;
            if ("ntfy".equalsIgnoreCase(a.type)) {
                conn.setRequestProperty("Content-Type", "text/plain;charset=UTF-8");
                body = message;
            } else if ("discord".equalsIgnoreCase(a.type)) {
                conn.setRequestProperty("Content-Type", "application/json");
                body = "{\"content\":\"" + escapeJson(message) + "\"}";
            } else {
                conn.setRequestProperty("Content-Type", "application/json");
                body = "{\"text\":\"" + escapeJson(message) + "\"}";
            }

            conn.getOutputStream().write(body.getBytes(StandardCharsets.UTF_8));
            int code = conn.getResponseCode();
            conn.disconnect();
            return code < 400;
        } catch (Exception e) {
            log.warn("Webhook send failed: {}", e.getMessage());
            return false;
        }
    }

    private String escapeJson(String s) {
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
