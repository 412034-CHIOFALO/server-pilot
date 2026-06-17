package com.serverpilot.ssh;

import com.jcraft.jsch.*;
import com.serverpilot.settings.SettingsService;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class SshService {

    // Fallback from properties; overridden by SettingsService on init
    @Value("${sp.ssh.host}")
    private String host;

    @Value("${sp.ssh.port}")
    private int port;

    @Value("${sp.ssh.username}")
    private String username;

    @Value("${sp.ssh.privateKeyPath}")
    private String keyPath;

    private final SettingsService settingsService;

    public SshService(SettingsService settingsService) {
        this.settingsService = settingsService;
    }

    @PostConstruct
    public void syncFromSettings() {
        var ssh = settingsService.get().ssh;
        if (ssh.host != null && !ssh.host.isBlank()) {
            host     = ssh.host;
            port     = ssh.port;
            username = ssh.username;
            keyPath  = ssh.keyPath;
        }
    }

    public String getHost()     { return host; }
    public int    getPort()     { return port; }
    public String getUsername() { return username; }
    public String getKeyPath()  { return keyPath; }

    public void setConfig(String host, int port, String username, String keyPath) {
        this.host     = host;
        this.port     = port;
        this.username = username;
        this.keyPath  = keyPath;
    }

    private Session openSession() throws Exception {
        JSch jsch = new JSch();
        Path kp = Path.of(keyPath);
        if (Files.exists(kp)) jsch.addIdentity(keyPath);
        Session session = jsch.getSession(username, host, port);
        session.setConfig("StrictHostKeyChecking", "no");
        session.connect(8000);
        return session;
    }

    public ExecResult execCommand(String cmd) throws Exception {
        Session session = openSession();
        try {
            ChannelExec channel = (ChannelExec) session.openChannel("exec");
            channel.setCommand(cmd);

            ByteArrayOutputStream stdoutBuf = new ByteArrayOutputStream();
            ByteArrayOutputStream stderrBuf = new ByteArrayOutputStream();
            channel.setOutputStream(stdoutBuf);
            channel.setErrStream(stderrBuf);

            channel.connect(5000);

            long deadline = System.currentTimeMillis() + 30_000;
            while (!channel.isClosed() && System.currentTimeMillis() < deadline) {
                try { Thread.sleep(100); } catch (InterruptedException e) { Thread.currentThread().interrupt(); break; }
            }

            int exitCode = channel.getExitStatus();
            channel.disconnect();
            return new ExecResult(
                stdoutBuf.toString(StandardCharsets.UTF_8),
                stderrBuf.toString(StandardCharsets.UTF_8),
                exitCode
            );
        } finally {
            session.disconnect();
        }
    }

    public SftpSession openSftp() throws Exception {
        Session session = openSession();
        ChannelSftp sftp = (ChannelSftp) session.openChannel("sftp");
        sftp.connect(5000);
        return new SftpSession(session, sftp);
    }

    public Session openJschSession() throws Exception {
        return openSession();
    }
}
