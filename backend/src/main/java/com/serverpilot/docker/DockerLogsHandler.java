package com.serverpilot.docker;

import com.github.dockerjava.api.async.ResultCallback;
import com.github.dockerjava.api.model.Frame;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.Closeable;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class DockerLogsHandler extends TextWebSocketHandler {

    private final DockerService dockerService;
    private final Map<String, Closeable> callbacks = new ConcurrentHashMap<>();

    public DockerLogsHandler(DockerService dockerService) {
        this.dockerService = dockerService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String path = session.getUri().getPath();
        String[] parts = path.split("/");
        String containerId = parts[parts.length - 1];

        ResultCallback<Frame> callback = new ResultCallback<>() {
            @Override
            public void onStart(Closeable stream) {
            }

            @Override
            public void onNext(Frame frame) {
                if (session.isOpen()) {
                    try {
                        String line = new String(frame.getPayload(), StandardCharsets.UTF_8);
                        session.sendMessage(new TextMessage(line));
                    } catch (IOException e) {
                        // ignore
                    }
                }
            }

            @Override
            public void onError(Throwable throwable) {
                try {
                    if (session.isOpen()) {
                        session.sendMessage(new TextMessage("ERROR: " + throwable.getMessage()));
                        session.close();
                    }
                } catch (IOException e) {
                    // ignore
                }
            }

            @Override
            public void onComplete() {
                try {
                    if (session.isOpen()) {
                        session.close();
                    }
                } catch (IOException e) {
                    // ignore
                }
            }

            @Override
            public void close() throws IOException {
            }
        };

        try {
            Closeable result = dockerService.getDockerClient()
                .logContainerCmd(containerId)
                .withStdOut(true)
                .withStdErr(true)
                .withFollowStream(true)
                .withTail(200)
                .exec(callback);
            callbacks.put(session.getId(), result);
        } catch (Exception e) {
            try {
                session.sendMessage(new TextMessage("ERROR: " + e.getMessage()));
                session.close();
            } catch (IOException ex) {
                // ignore
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Closeable cb = callbacks.remove(session.getId());
        if (cb != null) {
            try {
                cb.close();
            } catch (IOException e) {
                // ignore
            }
        }
    }
}
