package com.serverpilot.systemd;

import com.jcraft.jsch.ChannelExec;
import com.jcraft.jsch.Session;
import com.serverpilot.ssh.SshService;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class JournalHandler extends TextWebSocketHandler {

    private final SshService sshService;
    private final Map<String, Thread> readers = new ConcurrentHashMap<>();

    public JournalHandler(SshService sshService) {
        this.sshService = sshService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String path = session.getUri().getPath();
        String[] parts = path.split("/");
        String unit = sanitize(parts[parts.length - 1]);

        Thread t = new Thread(() -> {
            Session jschSession = null;
            try {
                jschSession = sshService.openJschSession();
                ChannelExec channel = (ChannelExec) jschSession.openChannel("exec");
                channel.setCommand("journalctl -f -n 100 -u " + unit + " --no-pager --output=short 2>&1");
                BufferedReader reader = new BufferedReader(
                    new InputStreamReader(channel.getInputStream(), StandardCharsets.UTF_8));
                channel.connect(5000);

                String line;
                while (!Thread.currentThread().isInterrupted() && session.isOpen()) {
                    if (reader.ready()) {
                        line = reader.readLine();
                        if (line == null) break;
                        session.sendMessage(new TextMessage(line + "\n"));
                    } else {
                        Thread.sleep(50);
                    }
                }
                channel.disconnect();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            } catch (Exception e) {
                try {
                    if (session.isOpen()) {
                        session.sendMessage(new TextMessage("[ERROR] " + e.getMessage() + "\n"));
                        session.close();
                    }
                } catch (IOException ex) { /* ignore */ }
            } finally {
                if (jschSession != null && jschSession.isConnected()) {
                    jschSession.disconnect();
                }
            }
        });
        t.setDaemon(true);
        t.start();
        readers.put(session.getId(), t);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Thread t = readers.remove(session.getId());
        if (t != null) t.interrupt();
    }

    private String sanitize(String unit) {
        return unit.replaceAll("[^a-zA-Z0-9.@_:\\-]", "");
    }
}
