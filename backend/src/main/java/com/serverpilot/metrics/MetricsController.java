package com.serverpilot.metrics;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    private final MetricsScheduler metricsScheduler;

    public MetricsController(MetricsScheduler metricsScheduler) {
        this.metricsScheduler = metricsScheduler;
    }

    @GetMapping("/snapshot")
    public ResponseEntity<MetricsSnapshot> getSnapshot() {
        MetricsSnapshot snapshot = metricsScheduler.getLastSnapshot();
        if (snapshot == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(snapshot);
    }
}
