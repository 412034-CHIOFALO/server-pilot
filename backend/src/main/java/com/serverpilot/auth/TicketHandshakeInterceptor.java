package com.serverpilot.auth;

import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Component
public class TicketHandshakeInterceptor implements HandshakeInterceptor {

    private final TicketService ticketService;

    public TicketHandshakeInterceptor(TicketService ticketService) {
        this.ticketService = ticketService;
    }

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        String query = request.getURI().getQuery();
        String ticket = null;
        if (query != null) {
            for (String param : query.split("&")) {
                if (param.startsWith("ticket=")) {
                    ticket = param.substring(7);
                    break;
                }
            }
        }
        return ticketService.validateAndConsume(ticket);
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
    }
}
