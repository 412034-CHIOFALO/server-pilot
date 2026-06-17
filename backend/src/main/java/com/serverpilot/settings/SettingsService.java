package com.serverpilot.settings;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.io.File;

@Service
public class SettingsService {

    @Value("${sp.data.path}")
    private String dataPath;

    @Value("${sp.ssh.host}")
    private String defaultSshHost;

    @Value("${sp.ssh.port}")
    private int defaultSshPort;

    @Value("${sp.ssh.username}")
    private String defaultSshUser;

    @Value("${sp.ssh.privateKeyPath}")
    private String defaultSshKey;

    @Value("${spring.security.user.name:admin}")
    private String defaultUser;

    @Value("${spring.security.user.password:changeme}")
    private String defaultPass;

    private final ObjectMapper objectMapper;
    private final BCryptPasswordEncoder encoder;
    private File settingsFile;
    private AppSettings settings;

    public SettingsService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
        this.encoder = new BCryptPasswordEncoder();
    }

    @PostConstruct
    public synchronized void init() {
        settingsFile = new File(dataPath, "settings.json");
        if (settingsFile.exists()) {
            try {
                settings = objectMapper.readValue(settingsFile, AppSettings.class);
            } catch (Exception e) {
                settings = buildDefaults();
                save();
            }
        } else {
            settings = buildDefaults();
            save();
        }
    }

    private AppSettings buildDefaults() {
        AppSettings s = new AppSettings();
        s.ssh.host     = defaultSshHost;
        s.ssh.port     = defaultSshPort;
        s.ssh.username = defaultSshUser;
        s.ssh.keyPath  = defaultSshKey;
        s.auth.username     = defaultUser;
        s.auth.passwordHash = encoder.encode(defaultPass);
        return s;
    }

    public synchronized AppSettings get() {
        return settings;
    }

    public synchronized void save() {
        try {
            settingsFile.getParentFile().mkdirs();
            objectMapper.writeValue(settingsFile, settings);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save settings.json", e);
        }
    }

    public synchronized void updateSsh(String host, int port, String username, String keyPath) {
        settings.ssh.host     = host;
        settings.ssh.port     = port;
        settings.ssh.username = username;
        settings.ssh.keyPath  = keyPath;
        save();
    }

    public synchronized void updateIdrac(boolean enabled, String host, String username, String password) {
        settings.idrac.enabled  = enabled;
        settings.idrac.host     = host;
        settings.idrac.username = username;
        if (password != null && !password.isBlank() && !password.equals("********")) {
            settings.idrac.password = password;
        }
        save();
    }

    public synchronized void updateAlerts(String url, String type) {
        settings.alerts.url  = url;
        settings.alerts.type = type;
        save();
    }

    public synchronized void updateCredentials(String username, String newPassword) {
        settings.auth.username     = username;
        settings.auth.passwordHash = encoder.encode(newPassword);
        save();
    }

    public BCryptPasswordEncoder getEncoder() {
        return encoder;
    }
}
