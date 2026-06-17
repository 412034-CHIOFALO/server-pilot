package com.serverpilot.idrac;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;

import javax.net.ssl.*;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.Base64;

@Service
public class IdracService {

    private final IdracConfigService configService;
    private final ObjectMapper objectMapper;

    public IdracService(IdracConfigService configService, ObjectMapper objectMapper) {
        this.configService = configService;
        this.objectMapper = objectMapper;
    }

    private HttpClient buildClient() throws Exception {
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, new TrustManager[]{new X509TrustManager() {
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            public void checkClientTrusted(X509Certificate[] c, String a) {}
            public void checkServerTrusted(X509Certificate[] c, String a) {}
        }}, new SecureRandom());

        return HttpClient.newBuilder()
            .sslContext(sslContext)
            .connectTimeout(Duration.ofSeconds(5))
            .build();
    }

    private String basicAuth(IdracConfig cfg) {
        return "Basic " + Base64.getEncoder().encodeToString(
            (cfg.username() + ":" + cfg.password()).getBytes()
        );
    }

    public String getPowerState() {
        IdracConfig cfg = configService.get();
        if (cfg.ip() == null || cfg.ip().isBlank()) return "NOT_CONFIGURED";
        try {
            HttpClient client = buildClient();
            HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create("https://" + cfg.ip() + "/redfish/v1/Systems/System.Embedded.1"))
                .header("Authorization", basicAuth(cfg))
                .header("Accept", "application/json")
                .GET()
                .build();
            HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode node = objectMapper.readTree(resp.body());
            return node.path("PowerState").asText("Unknown");
        } catch (Exception e) {
            return "UNREACHABLE";
        }
    }

    public void powerAction(String resetType) throws Exception {
        IdracConfig cfg = configService.get();
        if (cfg.ip() == null || cfg.ip().isBlank()) throw new IllegalStateException("iDRAC no configurado");

        String body = "{\"ResetType\":\"" + resetType + "\"}";
        HttpClient client = buildClient();
        HttpRequest req = HttpRequest.newBuilder()
            .uri(URI.create("https://" + cfg.ip() + "/redfish/v1/Systems/System.Embedded.1/Actions/ComputerSystem.Reset"))
            .header("Authorization", basicAuth(cfg))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        HttpResponse<String> resp = client.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 400) {
            throw new RuntimeException("iDRAC error " + resp.statusCode() + ": " + resp.body());
        }
    }
}
