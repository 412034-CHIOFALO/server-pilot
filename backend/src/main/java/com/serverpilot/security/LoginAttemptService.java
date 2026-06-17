package com.serverpilot.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class LoginAttemptService {

    @Value("${sp.security.maxAttempts:5}")
    private int maxAttempts;

    @Value("${sp.security.lockMinutes:15}")
    private int lockMinutes;

    private record AttemptData(int fails, Instant lockedUntil) {}

    private final Map<String, AttemptData> attempts = new ConcurrentHashMap<>();

    public boolean isBlocked(String ip) {
        AttemptData data = attempts.get(ip);
        if (data == null || data.lockedUntil() == null) return false;
        if (Instant.now().isBefore(data.lockedUntil())) return true;
        attempts.remove(ip);
        return false;
    }

    public long getRetryAfterSeconds(String ip) {
        AttemptData data = attempts.get(ip);
        if (data == null || data.lockedUntil() == null) return 0;
        return Math.max(0, data.lockedUntil().getEpochSecond() - Instant.now().getEpochSecond());
    }

    public void recordFailure(String ip) {
        attempts.compute(ip, (k, existing) -> {
            int fails = (existing == null ? 0 : existing.fails()) + 1;
            Instant lockedUntil = fails >= maxAttempts
                ? Instant.now().plusSeconds((long) lockMinutes * 60) : null;
            return new AttemptData(fails, lockedUntil);
        });
    }

    public void recordSuccess(String ip) {
        attempts.remove(ip);
    }
}
