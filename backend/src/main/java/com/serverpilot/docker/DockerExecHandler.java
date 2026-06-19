package com.serverpilot.docker;

import com.jcraft.jsch.ChannelExec;
import com.jcraft.jsch.Session;
import com.serverpilot.ssh.SshService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.AbstractWebSocketHandler;

import java.io.*;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DockerExecHandler extends AbstractWebSocketHandler {

    private static final Logger log = LoggerFactory.getLogger(DockerExecHandler.class);

    private final SshService sshService;
    private final Map<String, ExecSession> sessions = new ConcurrentHashMap<>();

    public DockerExecHandler(SshService sshService) {
        this.sshService = sshService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession wsSession) throws Exception {
        String path = wsSession.getUri().getPath();
        String[] parts = path.split("/");
        String containerId = sanitize(parts[parts.length - 1]);

        if (containerId.isEmpty()) {
            wsSession.sendMessage(new TextMessage("ERROR: ID de contenedor inválido"));
            wsSession.close();
            return;
        }

        try {
            Session jschSession = sshService.openJschSession();
            ChannelExec channel = (ChannelExec) jschSession.openChannel("exec");
            channel.setCommand("docker exec -it " + containerId
                + " sh -c 'exec bash 2>/dev/null || exec sh'");
            channel.setPty(true);
            channel.setPtyType("xterm-256color");
            channel.setPtySize(220, 50, 0, 0);

            PipedOutputStream stdinPipe = new PipedOutputStream();
            PipedInputStream stdinStream = new PipedInputStream(stdinPipe, 65536);
            channel.setInputStream(stdinStream);

            InputStream shellOut = channel.getInputStream();
            channel.connect(5000);

            ExecSession es = new ExecSession(wsSession, jschSession, channel, stdinPipe);
            sessions.put(wsSession.getId(), es);

            Thread readerThread = new Thread(() -> {
                byte[] buf = new byte[4096];
                try {
                    int n;
                    while ((n = shellOut.read(buf)) != -1) {
                        if (wsSession.isOpen())
                            wsSession.sendMessage(new BinaryMessage(buf, 0, n, true));
                    }
                } catch (IOException e) {
                    // stream closed when exec ends or WS closes
                } finally {
                    cleanup(wsSession.getId());
                }
            }, "docker-exec-" + wsSession.getId().substring(0, 8));
            readerThread.setDaemon(true);
            readerThread.start();

        } catch (Exception e) {
            log.error("Docker exec failed for container {}", containerId, e);
            wsSession.sendMessage(new TextMessage("ERROR: " + e.getMessage()));
            wsSession.close();
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        ExecSession es = sessions.get(session.getId());
        if (es == null) return;
        try {
            es.stdin().write(message.getPayload().getBytes());
            es.stdin().flush();
        } catch (IOException e) {
            log.error("Write to docker exec stdin failed", e);
        }
    }

    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        ExecSession es = sessions.get(session.getId());
        if (es == null) return;
        try {
            byte[] bytes = new byte[message.getPayload().remaining()];
            message.getPayload().get(bytes);
            es.stdin().write(bytes);
            es.stdin().flush();
        } catch (IOException e) {
            log.error("Write to docker exec stdin failed", e);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        cleanup(session.getId());
    }

    private void cleanup(String sessionId) {
        ExecSession es = sessions.remove(sessionId);
        if (es == null) return;
        try { es.stdin().close(); }          catch (Exception ignored) {}
        try { es.channel().disconnect(); }   catch (Exception ignored) {}
        try { es.jschSession().disconnect(); } catch (Exception ignored) {}
    }

    private String sanitize(String id) {
        return id.replaceAll("[^a-zA-Z0-9_.-]", "");
    }

    private record ExecSession(
        WebSocketSession wsSession,
        Session jschSession,
        ChannelExec channel,
        OutputStream stdin
    ) {}
}
