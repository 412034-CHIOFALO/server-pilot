package com.serverpilot.quicklinks;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/quicklinks")
public class QuickLinkController {

    private final QuickLinkService service;

    public QuickLinkController(QuickLinkService service) {
        this.service = service;
    }

    @GetMapping
    public List<QuickLink> list() {
        return service.getAll();
    }

    @PostMapping
    public ResponseEntity<QuickLink> create(@RequestBody QuickLink link) {
        return ResponseEntity.ok(service.add(link));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody QuickLink link) {
        try {
            return ResponseEntity.ok(service.update(id, link));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            service.delete(id);
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/suggestions")
    public List<QuickLinkSuggestion> suggestions() {
        return service.getSuggestions();
    }
}
