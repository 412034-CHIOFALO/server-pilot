package com.serverpilot.docker;

import com.serverpilot.audit.AuditService;
import com.serverpilot.settings.WebhookService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/containers/alerts")
public class ContainerAlertsController {

    private final ContainerAlertConfigService configService;
    private final WebhookService              webhookService;
    private final AuditService                auditService;

    public ContainerAlertsController(ContainerAlertConfigService configService,
                                     WebhookService webhookService,
                                     AuditService auditService) {
        this.configService  = configService;
        this.webhookService = webhookService;
        this.auditService   = auditService;
    }

    @GetMapping("/config")
    public ResponseEntity<ContainerAlertConfig> getConfig() {
        return ResponseEntity.ok(configService.get());
    }

    @PutMapping("/config")
    public ResponseEntity<Void> saveConfig(@RequestBody ContainerAlertConfig body) {
        configService.save(body);
        auditService.log("CONTAINER_ALERTS_CONFIG",
                "enabled=" + body.enabled, "OK",
                "excluded=" + body.excludedNames);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/test")
    public ResponseEntity<Map<String, String>> test() {
        boolean ok = webhookService.send("🔔 Server Pilot: test de alerta de contenedores");
        String result = ok ? "OK" : "ERROR";
        String detail = ok ? "Notificación enviada" : "Falló o URL no configurada";
        auditService.log("CONTAINER_ALERTS_TEST", "", result, detail);
        return ResponseEntity.ok(Map.of("result", result, "detail", detail));
    }
}
