package com.serverpilot.metrics;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class MetricsScheduler {

    private final MetricsService metricsService;
    private final MetricsSocketHandler metricsSocketHandler;
    private final ObjectMapper objectMapper;

    private volatile MetricsSnapshot lastSnapshot;

    public MetricsScheduler(MetricsService metricsService,
                            MetricsSocketHandler metricsSocketHandler,
                            ObjectMapper objectMapper) {
        this.metricsService = metricsService;
        this.metricsSocketHandler = metricsSocketHandler;
        this.objectMapper = objectMapper;
    }

    @Scheduled(fixedDelay = 2000)
    public void collect() {
        try {
            MetricsSnapshot snapshot = metricsService.getSnapshot();
            lastSnapshot = snapshot;
            String json = objectMapper.writeValueAsString(snapshot);
            metricsSocketHandler.broadcast(json);
        } catch (Exception e) {
            // silent
        }
    }

    public MetricsSnapshot getLastSnapshot() {
        return lastSnapshot;
    }
}
