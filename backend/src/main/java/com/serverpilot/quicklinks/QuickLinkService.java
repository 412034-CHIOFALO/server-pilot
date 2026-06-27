package com.serverpilot.quicklinks;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.dockerjava.api.model.Container;
import com.github.dockerjava.api.model.ContainerPort;
import com.serverpilot.docker.DockerService;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.util.*;

@Service
public class QuickLinkService {

    @Value("${sp.data.path}")
    private String dataPath;

    @Value("${sp.host:localhost}")
    private String host;

    private final ObjectMapper objectMapper;
    private final DockerService dockerService;
    private File dataFile;
    private List<QuickLink> links;

    // Known non-HTTP ports to exclude from suggestions
    private static final Set<Integer> EXCLUDED_PORTS = Set.of(
        3306, 5432, 27017, 6379, 5984, 9300, 6432, 5672, 4369,
        1433, 1521, 50000, 7000, 7001, 9042, 2181, 9092, 11211
    );

    public QuickLinkService(ObjectMapper objectMapper, DockerService dockerService) {
        this.objectMapper = objectMapper;
        this.dockerService = dockerService;
    }

    @PostConstruct
    public synchronized void init() {
        dataFile = new File(dataPath, "quicklinks.json");
        if (dataFile.exists()) {
            try {
                links = objectMapper.readValue(dataFile, new TypeReference<>() {});
            } catch (Exception e) {
                links = new ArrayList<>();
                save();
            }
        } else {
            links = new ArrayList<>();
            save();
        }
    }

    private void save() {
        try {
            new File(dataPath).mkdirs();
            objectMapper.writeValue(dataFile, links);
        } catch (Exception e) {
            throw new RuntimeException("Failed to save quicklinks.json", e);
        }
    }

    private String uuid() { return UUID.randomUUID().toString(); }

    public synchronized List<QuickLink> getAll() {
        return links.stream()
            .sorted(Comparator.comparingInt(l -> l.sortOrder))
            .toList();
    }

    public synchronized QuickLink add(QuickLink link) {
        link.id = uuid();
        if (link.sortOrder == 0) {
            link.sortOrder = links.stream().mapToInt(l -> l.sortOrder).max().orElse(0) + 1;
        }
        links.add(link);
        save();
        return link;
    }

    public synchronized QuickLink update(String id, QuickLink link) {
        QuickLink existing = links.stream().filter(l -> l.id.equals(id)).findFirst()
            .orElseThrow(() -> new NoSuchElementException("QuickLink not found: " + id));
        existing.name = link.name;
        existing.url = link.url;
        existing.color = link.color;
        existing.icon = link.icon;
        existing.sortOrder = link.sortOrder;
        save();
        return existing;
    }

    public synchronized void delete(String id) {
        links.removeIf(l -> l.id.equals(id));
        save();
    }

    public List<QuickLinkSuggestion> getSuggestions() {
        List<QuickLinkSuggestion> suggestions = new ArrayList<>();
        try {
            List<Container> containers = dockerService.getDockerClient()
                .listContainersCmd().withShowAll(false).exec();
            for (Container c : containers) {
                if (c.getPorts() == null) continue;
                String name = c.getNames() != null && c.getNames().length > 0
                    ? c.getNames()[0].replaceFirst("^/", "")
                    : c.getId().substring(0, 12);
                for (ContainerPort p : c.getPorts()) {
                    if (p.getPublicPort() == null) continue;
                    int port = p.getPublicPort();
                    if (EXCLUDED_PORTS.contains(port)) continue;
                    suggestions.add(new QuickLinkSuggestion(name, "http://" + host + ":" + port));
                }
            }
        } catch (Exception ignored) {}
        return suggestions;
    }
}
