package com.serverpilot.auth;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final TicketService ticketService;

    public AuthController(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @PostMapping("/ticket")
    public ResponseEntity<Map<String, String>> getTicket() {
        String ticket = ticketService.generateTicket();
        return ResponseEntity.ok(Map.of("ticket", ticket));
    }
}
