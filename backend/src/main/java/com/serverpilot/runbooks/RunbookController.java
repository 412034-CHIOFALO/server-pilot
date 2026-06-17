package com.serverpilot.runbooks;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/runbooks")
public class RunbookController {

    private final RunbookService runbookService;

    public RunbookController(RunbookService runbookService) {
        this.runbookService = runbookService;
    }

    @GetMapping
    public List<Runbook> list() {
        return runbookService.getAll();
    }

    @PostMapping
    public ResponseEntity<Runbook> create(@RequestBody Runbook rb) {
        return ResponseEntity.ok(runbookService.add(rb));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Runbook rb) {
        try {
            return ResponseEntity.ok(runbookService.update(id, rb));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        try {
            runbookService.delete(id);
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/run")
    public ResponseEntity<?> run(@PathVariable String id) {
        try {
            return ResponseEntity.ok(runbookService.run(id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
