package com.serverpilot.idrac;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;

@Service
public class IdracConfigService {

    @Value("${sp.data.path}")
    private String dataPath;

    private final ObjectMapper objectMapper;
    private File configFile;

    public IdracConfigService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        configFile = new File(dataPath, "idrac.json");
    }

    public synchronized IdracConfig get() {
        if (!configFile.exists()) return new IdracConfig("", "", "");
        try {
            return objectMapper.readValue(configFile, IdracConfig.class);
        } catch (Exception e) {
            return new IdracConfig("", "", "");
        }
    }

    public synchronized void save(IdracConfig config) {
        try {
            objectMapper.writeValue(configFile, config);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save idrac.json", e);
        }
    }
}
