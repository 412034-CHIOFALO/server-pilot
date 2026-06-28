package com.serverpilot.terminal;

import com.jcraft.jsch.*;
import com.serverpilot.ssh.SshService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class TerminalHandler extends AbstractWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(TerminalHandler.class);

    private final SshService sshService;
    private final ConcurrentHashMap<String, TerminalSession> sessions = new ConcurrentHashMap<>();

    public TerminalHandler(SshService sshService) {
        this.sshService = sshService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession wsSession) throws Exception {
        try {
            JSch jsch = new JSch();
            Path kp = Path.of(sshService.getKeyPath());
            if (Files.exists(kp)) jsch.addIdentity(sshService.getKeyPath());

            Session sshSession = jsch.getSession(sshService.getUsername(), sshService.getHost(), sshService.getPort());
            sshSession.setConfig("StrictHostKeyChecking", "no");
            sshSession.connect(5000);

            ChannelShell channel = (ChannelShell) sshSession.openChannel("shell");
            channel.setPtyType("xterm-256color");
            channel.setPtySize(220, 50, 0, 0);

            PipedOutputStream pipedOut = new PipedOutputStream();
            PipedInputStream pipedIn = new PipedInputStream(pipedOut);
            channel.setInputStream(pipedIn);

            InputStream shellOut = channel.getInputStream();
            channel.connect();

            TerminalSession ts = new TerminalSession(wsSession, sshSession, channel, pipedOut);
            sessions.put(wsSession.getId(), ts);

            Thread readerThread = new Thread(() -> {
                byte[] buf = new byte[4096];
                try {
                    int n;
                    while ((n = shellOut.read(buf)) != -1) {
                        if (wsSession.isOpen()) wsSession.sendMessage(new BinaryMessage(buf, 0, n, true));
                    }
                } catch (IOException e) {
                    // connection closed
                } finally {
                    closeSession(wsSession.getId());
                }
            }, "terminal-reader-" + wsSession.getId());
            readerThread.setDaemon(true);
            readerThread.start();

        } catch (Exception e) {
            log.error("SSH connection failed for session {}", wsSession.getId(), e);
            wsSession.sendMessage(new TextMessage("ERROR: " + e.getMessage()));
            wsSession.close();
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        TerminalSession ts = sessions.get(session.getId());
        if (ts == null) return;
        try {
            ts.stdin().write(message.getPayload().getBytes());
            ts.stdin().flush();
        } catch (IOException e) {
            log.error("Write to SSH stdin failed", e);
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        TerminalSession ts = sessions.get(session.getId());
        if (ts == null) return;
        try {
            ts.stdin().write(message.getPayload().array());
            ts.stdin().flush();
        } catch (IOException e) {
            log.error("Write to SSH stdin failed", e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        closeSession(session.getId());
    }

    private void closeSession(String id) {
        TerminalSession ts = sessions.remove(id);
        if (ts == null) return;
        try { ts.stdin().close(); }           catch (Exception ignored) {}
        try { ts.channel().disconnect(); }    catch (Exception ignored) {}
        try { ts.sshSession().disconnect(); } catch (Exception ignored) {}
        log.debug("Terminal session {} closed", id);
    }

    private record TerminalSession(
        WebSocketSession wsSession,
        Session sshSession,
        Channel channel,
        OutputStream stdin
    ) {}
}
