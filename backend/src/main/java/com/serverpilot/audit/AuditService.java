package com.serverpilot.audit;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;

@Service
public class AuditService {

    @Value("${sp.data.path}")
    private String dataPath;

    private final ObjectMapper objectMapper;
    private Path logFile;

    public AuditService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        logFile = Path.of(dataPath, "audit.log");
    }

    public void log(String action, String target, String result, String detail) {
        String user = "system";
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getName() != null) user = auth.getName();
        } catch (Exception ignored) {}

        AuditEntry entry = new AuditEntry(
            System.currentTimeMillis(), user, action, target, result, detail
        );
        synchronized (this) {
            try {
                String line = objectMapper.writeValueAsString(entry) + "\n";
                Files.write(logFile, line.getBytes(StandardCharsets.UTF_8),
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            } catch (Exception e) {
                // don't crash the caller
            }
        }
    }

    public synchronized List<AuditEntry> readLast(int limit) {
        if (!Files.exists(logFile)) return List.of();
        try {
            List<String> lines = Files.readAllLines(logFile, StandardCharsets.UTF_8);
            int from = Math.max(0, lines.size() - limit);
            List<AuditEntry> result = new ArrayList<>();
            for (int i = lines.size() - 1; i >= from; i--) {
                String line = lines.get(i).trim();
                if (!line.isEmpty()) {
                    try { result.add(objectMapper.readValue(line, AuditEntry.class)); }
                    catch (Exception ignored) {}
                }
            }
            return result;
        } catch (Exception e) {
            return List.of();
        }
    }
}
