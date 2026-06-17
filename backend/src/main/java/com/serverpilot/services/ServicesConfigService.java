package com.serverpilot.services;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class ServicesConfigService {

    @Value("${sp.data.path}")
    private String dataPath;

    private final ObjectMapper objectMapper;
    private File servicesFile;

    public ServicesConfigService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        File dir = new File(dataPath);
        if (!dir.exists()) dir.mkdirs();
        servicesFile = new File(dir, "services.json");
        if (!servicesFile.exists()) {
            try {
                objectMapper.writeValue(servicesFile, new ArrayList<>());
            } catch (Exception e) {
                throw new RuntimeException("Failed to create services.json", e);
            }
        }
    }

    public synchronized List<ServiceEntry> getAll() {
        try {
            return objectMapper.readValue(servicesFile, new TypeReference<List<ServiceEntry>>() {});
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public synchronized ServiceEntry add(String name, String host, int port) {
        List<ServiceEntry> entries = getAll();
        ServiceEntry entry = new ServiceEntry(UUID.randomUUID().toString(), name, host, port);
        entries.add(entry);
        save(entries);
        return entry;
    }

    public synchronized ServiceEntry update(String id, String name, String host, int port) {
        List<ServiceEntry> entries = getAll();
        for (int i = 0; i < entries.size(); i++) {
            if (entries.get(i).id().equals(id)) {
                ServiceEntry updated = new ServiceEntry(id, name, host, port);
                entries.set(i, updated);
                save(entries);
                return updated;
            }
        }
        throw new IllegalArgumentException("Service not found: " + id);
    }

    public synchronized void delete(String id) {
        List<ServiceEntry> entries = getAll();
        boolean removed = entries.removeIf(e -> e.id().equals(id));
        if (!removed) throw new IllegalArgumentException("Service not found: " + id);
        save(entries);
    }

    private void save(List<ServiceEntry> entries) {
        try {
            objectMapper.writeValue(servicesFile, entries);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save services.json", e);
        }
    }
}
