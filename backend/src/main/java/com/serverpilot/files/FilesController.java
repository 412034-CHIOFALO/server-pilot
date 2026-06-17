package com.serverpilot.files;

import com.serverpilot.audit.AuditService;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/files")
public class FilesController {

    private final SftpService sftpService;
    private final AuditService auditService;

    public FilesController(SftpService sftpService, AuditService auditService) {
        this.sftpService  = sftpService;
        this.auditService = auditService;
    }

    @GetMapping
    public ResponseEntity<?> list(@RequestParam String path) {
        if (path == null || path.isBlank()) path = "/";
        try {
            List<FileEntryDTO> entries = sftpService.list(path);
            return ResponseEntity.ok(entries);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/download")
    public ResponseEntity<?> download(@RequestParam String path) {
        if (path == null || path.isBlank()) return ResponseEntity.badRequest().build();
        try {
            InputStream is = sftpService.download(path);
            String filename = path.contains("/") ? path.substring(path.lastIndexOf('/') + 1) : path;
            String encoded  = URLEncoder.encode(filename, StandardCharsets.UTF_8).replace("+", "%20");
            return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename*=UTF-8''" + encoded)
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .body(new InputStreamResource(is));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/content")
    public ResponseEntity<?> readContent(@RequestParam String path) {
        if (path == null || path.isBlank()) return ResponseEntity.badRequest().build();
        try {
            return ResponseEntity.ok(Map.of("content", sftpService.readText(path)));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/content")
    public ResponseEntity<?> writeContent(@RequestBody Map<String, String> body) {
        String path    = body.get("path");
        String content = body.get("content");
        if (path == null || path.isBlank()) return ResponseEntity.badRequest().build();
        try {
            sftpService.writeText(path, content != null ? content : "");
            auditService.log("FILE_WRITE", path, "OK", "");
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            auditService.log("FILE_WRITE", path, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> upload(@RequestParam String path,
                                    @RequestParam("file") MultipartFile file) {
        if (path == null || path.isBlank()) return ResponseEntity.badRequest().build();
        try {
            sftpService.upload(path, file);
            auditService.log("FILE_UPLOAD", path + "/" + file.getOriginalFilename(), "OK", "");
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            auditService.log("FILE_UPLOAD", path, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/mkdir")
    public ResponseEntity<?> mkdir(@RequestBody Map<String, String> body) {
        String path = body.get("path");
        if (path == null || path.isBlank()) return ResponseEntity.badRequest().build();
        try {
            sftpService.mkdir(path);
            auditService.log("FILE_MKDIR", path, "OK", "");
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            auditService.log("FILE_MKDIR", path, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping
    public ResponseEntity<?> delete(@RequestParam String path) {
        if (path == null || path.isBlank()) return ResponseEntity.badRequest().build();
        try {
            sftpService.delete(path);
            auditService.log("FILE_DELETE", path, "OK", "");
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            auditService.log("FILE_DELETE", path, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/rename")
    public ResponseEntity<?> rename(@RequestBody Map<String, String> body) {
        String from = body.get("from");
        String to   = body.get("to");
        if (from == null || to == null || from.isBlank() || to.isBlank())
            return ResponseEntity.badRequest().build();
        try {
            sftpService.rename(from, to);
            auditService.log("FILE_RENAME", from + " → " + to, "OK", "");
            return ResponseEntity.ok(Map.of("result", "ok"));
        } catch (Exception e) {
            auditService.log("FILE_RENAME", from, "ERROR", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
