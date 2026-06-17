package com.serverpilot;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ServerPilotApplication {
    public static void main(String[] args) {
        SpringApplication.run(ServerPilotApplication.class, args);
    }
}
