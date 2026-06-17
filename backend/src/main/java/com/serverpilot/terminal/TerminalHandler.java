package com.serverpilot.terminal;

import com.jcraft.jsch.Channel;
import com.jcraft.jsch.ChannelShell;
import com.jcraft.jsch.JSch;
import com.jcraft.jsch.Session;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.BinaryMessage;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.PipedInputStream;
import java.io.PipedOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class TerminalHandler extends AbstractWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(TerminalHandler.class);

    @Value("${sp.ssh.host}")
    private String sshHost;

    @Value("${sp.ssh.port}")
    private int sshPort;

    @Value("${sp.ssh.username}")
    private String sshUser;

    @Value("${sp.ssh.privateKeyPath}")
    private String sshKeyPath;

    private final AtomicReference<TerminalSession> activeSession = new AtomicReference<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession wsSession) throws Exception {
        TerminalSession existing = activeSession.get();
        if (existing != null) {
            wsSession.sendMessage(new TextMessage("ERROR: Terminal ocupada"));
            wsSession.close();
            return;
        }

        try {
            JSch jsch = new JSch();
            Path keyPath = Path.of(sshKeyPath);
            if (Files.exists(keyPath)) {
                jsch.addIdentity(sshKeyPath);
            }

            Session sshSession = jsch.getSession(sshUser, sshHost, sshPort);
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

            if (!activeSession.compareAndSet(null, ts)) {
                channel.disconnect();
                sshSession.disconnect();
                wsSession.sendMessage(new TextMessage("ERROR: Terminal ocupada"));
                wsSession.close();
                return;
            }

            Thread readerThread = new Thread(() -> {
                byte[] buf = new byte[4096];
                try {
                    int n;
                    while ((n = shellOut.read(buf)) != -1) {
                        if (wsSession.isOpen()) {
                            wsSession.sendMessage(new BinaryMessage(buf, 0, n, true));
                        }
                    }
                } catch (IOException e) {
                    // connection closed
                } finally {
                    closeTerminalSession(ts);
                }
            }, "terminal-reader");
            readerThread.setDaemon(true);
            readerThread.start();

        } catch (Exception e) {
            log.error("SSH connection failed", e);
            wsSession.sendMessage(new TextMessage("ERROR: " + e.getMessage()));
            wsSession.close();
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        TerminalSession ts = activeSession.get();
        if (ts == null || ts.wsSession() != session) return;
        try {
            byte[] data = message.getPayload().getBytes();
            ts.stdin().write(data);
            ts.stdin().flush();
        } catch (IOException e) {
            log.error("Write to SSH stdin failed", e);
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        TerminalSession ts = activeSession.get();
        if (ts == null || ts.wsSession() != session) return;
        try {
            byte[] data = message.getPayload().array();
            ts.stdin().write(data);
            ts.stdin().flush();
        } catch (IOException e) {
            log.error("Write to SSH stdin failed", e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        TerminalSession ts = activeSession.get();
        if (ts != null && ts.wsSession() == session) {
            closeTerminalSession(ts);
        }
    }

    private void closeTerminalSession(TerminalSession ts) {
        if (!activeSession.compareAndSet(ts, null)) return;
        try { ts.stdin().close(); } catch (Exception e) { /* ignore */ }
        try { ts.channel().disconnect(); } catch (Exception e) { /* ignore */ }
        try { ts.sshSession().disconnect(); } catch (Exception e) { /* ignore */ }
    }

    private record TerminalSession(
        WebSocketSession wsSession,
        Session sshSession,
        Channel channel,
        OutputStream stdin
    ) {}
}
