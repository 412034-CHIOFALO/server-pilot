package com.serverpilot.config;

import com.serverpilot.security.LoginAttemptService;
import com.serverpilot.security.LockoutFilter;
import com.serverpilot.settings.SettingsService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationEventPublisher;
import org.springframework.security.authentication.DefaultAuthenticationEventPublisher;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.www.BasicAuthenticationFilter;
import org.springframework.context.ApplicationEventPublisher;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final SettingsService settingsService;
    private final LoginAttemptService loginAttemptService;

    public SecurityConfig(SettingsService settingsService, LoginAttemptService loginAttemptService) {
        this.settingsService = settingsService;
        this.loginAttemptService = loginAttemptService;
    }

    @Bean
    public AuthenticationEventPublisher authenticationEventPublisher(ApplicationEventPublisher eventPublisher) {
        return new DefaultAuthenticationEventPublisher(eventPublisher);
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public UserDetailsService userDetailsService() {
        // Dynamic: reads username+hash from SettingsService at each authentication attempt
        return username -> {
            var s = settingsService.get();
            if (!username.equals(s.auth.username)) {
                throw new org.springframework.security.core.userdetails.UsernameNotFoundException(username);
            }
            return User.withUsername(s.auth.username)
                .password(s.auth.passwordHash)
                .roles("ADMIN")
                .build();
        };
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configure(http))
            .addFilterBefore(new LockoutFilter(loginAttemptService), BasicAuthenticationFilter.class)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/health").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/actuator/prometheus").authenticated()
                .requestMatchers("/api/**").authenticated()
                .anyRequest().permitAll()
            )
            .httpBasic(basic -> basic.authenticationEntryPoint(
                (request, response, authException) -> {
                    response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                    response.setContentType("application/json");
                    response.getWriter().write("{\"error\":\"Unauthorized\"}");
                }
            ));

        return http.build();
    }
}
