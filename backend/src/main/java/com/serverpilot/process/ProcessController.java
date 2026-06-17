package com.serverpilot.process;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/processes")
public class ProcessController {

    private final ProcessService processService;

    public ProcessController(ProcessService processService) {
        this.processService = processService;
    }

    @GetMapping
    public ResponseEntity<List<ProcessDTO>> list(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(processService.getTopProcesses(Math.min(limit, 100)));
    }

    @PostMapping("/{pid}/kill")
    public ResponseEntity<Map<String, String>> kill(@PathVariable int pid,
                                                     @RequestParam(defaultValue = "false") boolean force) {
        try {
            processService.kill(pid, force);
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
