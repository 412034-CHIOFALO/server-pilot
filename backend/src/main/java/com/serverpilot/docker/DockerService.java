package com.serverpilot.docker;

import com.github.dockerjava.api.DockerClient;
import com.github.dockerjava.api.model.Container;
import com.github.dockerjava.api.model.ContainerPort;
import com.github.dockerjava.api.model.Info;
import com.github.dockerjava.core.DefaultDockerClientConfig;
import com.github.dockerjava.core.DockerClientConfig;
import com.github.dockerjava.core.DockerClientImpl;
import com.github.dockerjava.httpclient5.ApacheDockerHttpClient;
import com.github.dockerjava.transport.DockerHttpClient;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class DockerService {

    private DockerClient docker;

    @PostConstruct
    public void init() {
        DockerClientConfig cfg = DefaultDockerClientConfig.createDefaultConfigBuilder()
            .withDockerHost("unix:///var/run/docker.sock")
            .build();
        DockerHttpClient http = new ApacheDockerHttpClient.Builder()
            .dockerHost(cfg.getDockerHost())
            .sslConfig(cfg.getSSLConfig())
            .maxConnections(100)
            .build();
        docker = DockerClientImpl.getInstance(cfg, http);
    }

    public DockerClient getDockerClient() {
        return docker;
    }

    public List<ContainerDTO> listContainers(boolean all) {
        List<Container> containers = docker.listContainersCmd().withShowAll(all).exec();
        List<ContainerDTO> result = new ArrayList<>();
        for (Container c : containers) {
            String name = c.getNames() != null && c.getNames().length > 0
                ? c.getNames()[0].replaceFirst("^/", "") : "";
            List<String> ports = new ArrayList<>();
            if (c.getPorts() != null) {
                for (ContainerPort p : c.getPorts()) {
                    if (p.getPublicPort() != null) {
                        ports.add(p.getPublicPort() + "->" + p.getPrivatePort() + "/" + p.getType());
                    }
                }
            }
            String project = "standalone";
            if (c.getLabels() != null) {
                String composeProject = c.getLabels().get("com.docker.compose.project");
                if (composeProject != null && !composeProject.isBlank()) {
                    project = composeProject;
                }
            }
            result.add(new ContainerDTO(
                c.getId(),
                c.getId().length() >= 12 ? c.getId().substring(0, 12) : c.getId(),
                name,
                c.getImage(),
                c.getStatus(),
                c.getState(),
                ports,
                project
            ));
        }
        return result;
    }

    public void startContainer(String id) {
        docker.startContainerCmd(id).exec();
    }

    public void stopContainer(String id) {
        docker.stopContainerCmd(id).exec();
    }

    public void restartContainer(String id) {
        docker.restartContainerCmd(id).exec();
    }

    public void removeContainer(String id) {
        docker.removeContainerCmd(id).withForce(false).exec();
    }

    public Map<String, Object> getInfo() {
        Info info = docker.infoCmd().exec();
        return Map.of(
            "version", info.getServerVersion() != null ? info.getServerVersion() : "unknown",
            "running", info.getContainersRunning() != null ? info.getContainersRunning() : 0,
            "stopped", info.getContainersStopped() != null ? info.getContainersStopped() : 0,
            "images", info.getImages() != null ? info.getImages() : 0
        );
    }
}
