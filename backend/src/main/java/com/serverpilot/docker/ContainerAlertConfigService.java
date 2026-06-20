package com.serverpilot.docker;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;

@Service
public class ContainerAlertConfigService {

    @Value("${sp.data.path}")
    private String dataPath;

    private final ObjectMapper objectMapper;
    private File configFile;
    private ContainerAlertConfig config;

    public ContainerAlertConfigService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public synchronized void init() {
        configFile = new File(dataPath, "container-alerts.json");
        if (configFile.exists()) {
            try {
                config = objectMapper.readValue(configFile, ContainerAlertConfig.class);
            } catch (Exception e) {
                config = new ContainerAlertConfig();
                persist();
            }
        } else {
            config = new ContainerAlertConfig();
            persist();
        }
    }

    public synchronized ContainerAlertConfig get() {
        return config;
    }

    public synchronized void save(ContainerAlertConfig newConfig) {
        config = newConfig;
        persist();
    }

    private void persist() {
        try {
            configFile.getParentFile().mkdirs();
            objectMapper.writeValue(configFile, config);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save container-alerts.json", e);
        }
    }
}
