package com.serverpilot.ssh;

import com.jcraft.jsch.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class SshService {

    @Value("${sp.ssh.host}")
    private String host;

    @Value("${sp.ssh.port}")
    private int port;

    @Value("${sp.ssh.username}")
    private String username;

    @Value("${sp.ssh.privateKeyPath}")
    private String keyPath;

    // Config getters — used by TerminalHandler and updated by SettingsService in Feature 2
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

            // wait for channel to close (command completes)
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
}
