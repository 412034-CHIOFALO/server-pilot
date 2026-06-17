package com.serverpilot.config;

import com.serverpilot.auth.TicketHandshakeInterceptor;
import com.serverpilot.docker.DockerLogsHandler;
import com.serverpilot.metrics.MetricsSocketHandler;
import com.serverpilot.terminal.TerminalHandler;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.EnableWebSocket;
import org.springframework.web.socket.config.annotation.WebSocketConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketHandlerRegistry;

@Configuration
@EnableWebSocket
public class WebSocketConfig implements WebSocketConfigurer {

    private final MetricsSocketHandler metricsSocketHandler;
    private final TerminalHandler terminalHandler;
    private final DockerLogsHandler dockerLogsHandler;
    private final TicketHandshakeInterceptor ticketHandshakeInterceptor;

    public WebSocketConfig(MetricsSocketHandler metricsSocketHandler,
                           TerminalHandler terminalHandler,
                           DockerLogsHandler dockerLogsHandler,
                           TicketHandshakeInterceptor ticketHandshakeInterceptor) {
        this.metricsSocketHandler = metricsSocketHandler;
        this.terminalHandler = terminalHandler;
        this.dockerLogsHandler = dockerLogsHandler;
        this.ticketHandshakeInterceptor = ticketHandshakeInterceptor;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(metricsSocketHandler, "/ws/metrics")
            .addInterceptors(ticketHandshakeInterceptor)
            .setAllowedOrigins("*");

        registry.addHandler(terminalHandler, "/ws/terminal")
            .addInterceptors(ticketHandshakeInterceptor)
            .setAllowedOrigins("*");

        registry.addHandler(dockerLogsHandler, "/ws/docker/logs/**")
            .addInterceptors(ticketHandshakeInterceptor)
            .setAllowedOrigins("*");
    }
}
