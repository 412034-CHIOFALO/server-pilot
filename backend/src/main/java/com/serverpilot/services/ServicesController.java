package com.serverpilot.services;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.InetSocketAddress;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/services")
public class ServicesController {

    private final ServicesConfigService configService;

    public ServicesController(ServicesConfigService configService) {
        this.configService = configService;
    }

    @GetMapping
    public List<ServiceEntry> getAll() {
        return configService.getAll();
    }

    @PostMapping
    public ResponseEntity<ServiceEntry> add(@RequestBody Map<String, Object> body) {
        String name = (String) body.get("name");
        String host = (String) body.get("host");
        int port = ((Number) body.get("port")).intValue();
        ServiceEntry entry = configService.add(name, host, port);
        return ResponseEntity.status(HttpStatus.CREATED).body(entry);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ServiceEntry> update(@PathVariable String id,
                                               @RequestBody Map<String, Object> body) {
        try {
            String name = (String) body.get("name");
            String host = (String) body.get("host");
            int port = ((Number) body.get("port")).intValue();
            return ResponseEntity.ok(configService.update(id, name, host, port));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable String id) {
        try {
            configService.delete(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/status")
    public List<ServiceStatus> getStatus() {
        List<ServiceEntry> entries = configService.getAll();
        List<ServiceStatus> result = new ArrayList<>();
        for (ServiceEntry entry : entries) {
            String status = checkPort(entry.host(), entry.port()) ? "UP" : "DOWN";
            result.add(new ServiceStatus(entry.id(), entry.name(), entry.host(), entry.port(), status));
        }
        return result;
    }

    private boolean checkPort(String host, int port) {
        try (Socket socket = new Socket()) {
            socket.connect(new InetSocketAddress(host, port), 2000);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
