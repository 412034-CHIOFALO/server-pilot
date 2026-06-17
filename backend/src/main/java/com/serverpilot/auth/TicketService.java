package com.serverpilot.auth;

import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TicketService {

    private final Map<String, Instant> tickets = new ConcurrentHashMap<>();
    private static final long TTL_SECONDS = 30;

    public String generateTicket() {
        String ticket = UUID.randomUUID().toString();
        tickets.put(ticket, Instant.now().plusSeconds(TTL_SECONDS));
        return ticket;
    }

    public boolean validateAndConsume(String ticket) {
        if (ticket == null) return false;
        Instant expiry = tickets.remove(ticket);
        return expiry != null && Instant.now().isBefore(expiry);
    }
}
