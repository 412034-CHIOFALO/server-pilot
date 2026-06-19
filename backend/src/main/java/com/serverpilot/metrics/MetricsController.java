package com.serverpilot.metrics;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    private final MetricsScheduler      metricsScheduler;
    private final MetricsHistoryService historyService;

    public MetricsController(MetricsScheduler metricsScheduler,
                             MetricsHistoryService historyService) {
        this.metricsScheduler = metricsScheduler;
        this.historyService   = historyService;
    }

    @GetMapping("/snapshot")
    public ResponseEntity<MetricsSnapshot> getSnapshot() {
        MetricsSnapshot snapshot = metricsScheduler.getLastSnapshot();
        if (snapshot == null) return ResponseEntity.noContent().build();
        return ResponseEntity.ok(snapshot);
    }

    @GetMapping("/history")
    public ResponseEntity<List<MetricsHistorySample>> getHistory(
            @RequestParam(defaultValue = "1h") String range) {
        try {
            return ResponseEntity.ok(historyService.getRange(range));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
