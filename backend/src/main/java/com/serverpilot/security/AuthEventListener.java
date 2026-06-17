package com.serverpilot.security;

import org.springframework.context.event.EventListener;
import org.springframework.security.authentication.event.AbstractAuthenticationFailureEvent;
import org.springframework.security.authentication.event.AuthenticationSuccessEvent;
import org.springframework.security.web.authentication.WebAuthenticationDetails;
import org.springframework.stereotype.Component;

@Component
public class AuthEventListener {

    private final LoginAttemptService loginAttemptService;

    public AuthEventListener(LoginAttemptService loginAttemptService) {
        this.loginAttemptService = loginAttemptService;
    }

    @EventListener
    public void onFailure(AbstractAuthenticationFailureEvent event) {
        String ip = extractIp(event.getAuthentication().getDetails());
        if (ip != null) loginAttemptService.recordFailure(ip);
    }

    @EventListener
    public void onSuccess(AuthenticationSuccessEvent event) {
        String ip = extractIp(event.getAuthentication().getDetails());
        if (ip != null) loginAttemptService.recordSuccess(ip);
    }

    private String extractIp(Object details) {
        if (details instanceof WebAuthenticationDetails w) return w.getRemoteAddress();
        return null;
    }
}
