package com.serverpilot.metrics;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.locks.ReentrantLock;

@Service
public class MetricsHistoryService {

    private final Path         historyFile;
    private final ObjectMapper mapper;
    private final ReentrantLock lock = new ReentrantLock();

    public MetricsHistoryService(
            @Value("${sp.data.path:/data}") String dataPath,
            ObjectMapper mapper) {
        this.historyFile = Path.of(dataPath, "metrics-history.jsonl");
        this.mapper = mapper;
    }

    public void append(MetricsSnapshot snap) {
        MetricsHistorySample sample = new MetricsHistorySample(
            snap.timestamp(),
            snap.cpu().usagePercent(),
            snap.ram().usagePercent(),
            snap.disks().isEmpty() ? 0 : snap.disks().get(0).usagePercent()
        );
        lock.lock();
        try {
            Files.createDirectories(historyFile.getParent());
            String line = mapper.writeValueAsString(sample) + System.lineSeparator();
            Files.writeString(historyFile, line, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        } catch (Exception ignored) {
        } finally {
            lock.unlock();
        }
    }

    public List<MetricsHistorySample> getRange(String range) throws IOException {
        if (!Files.exists(historyFile)) return List.of();
        long cutoff = System.currentTimeMillis() - parseDuration(range);

        List<MetricsHistorySample> result = new ArrayList<>();
        try (BufferedReader reader = Files.newBufferedReader(historyFile, StandardCharsets.UTF_8)) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                try {
                    MetricsHistorySample s = mapper.readValue(line, MetricsHistorySample.class);
                    if (s.ts() >= cutoff) result.add(s);
                } catch (Exception ignored) {}
            }
        }
        return subsample(result, 300);
    }

    public void purgeOld() {
        if (!Files.exists(historyFile)) return;
        long cutoff = System.currentTimeMillis() - 7L * 24 * 3600 * 1000;

        lock.lock();
        try {
            List<String> lines = Files.readAllLines(historyFile, StandardCharsets.UTF_8);
            List<String> kept  = new ArrayList<>();
            for (String line : lines) {
                if (line.isBlank()) continue;
                try {
                    MetricsHistorySample s = mapper.readValue(line, MetricsHistorySample.class);
                    if (s.ts() >= cutoff) kept.add(line);
                } catch (Exception ignored) {}
            }
            Path tmp = historyFile.resolveSibling("metrics-history.jsonl.tmp");
            Files.write(tmp, kept, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
            Files.move(tmp, historyFile,
                StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } catch (Exception ignored) {
        } finally {
            lock.unlock();
        }
    }

    private static long parseDuration(String range) {
        return switch (range) {
            case "24h" -> 24L * 3600 * 1000;
            case "7d"  ->  7L * 24 * 3600 * 1000;
            default    ->       3600L * 1000;
        };
    }

    private static List<MetricsHistorySample> subsample(List<MetricsHistorySample> list, int max) {
        if (list.size() <= max) return list;
        List<MetricsHistorySample> result = new ArrayList<>(max);
        double step = (double) list.size() / max;
        for (int i = 0; i < max; i++) result.add(list.get((int) (i * step)));
        return result;
    }
}
