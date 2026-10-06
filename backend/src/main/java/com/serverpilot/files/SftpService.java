package com.serverpilot.files;

import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.SftpATTRS;
import com.serverpilot.ssh.SftpSession;
import com.serverpilot.ssh.SshService;
import jakarta.annotation.PreDestroy;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * File operations over SFTP.
 *
 * A single SSH+SFTP session is cached and reused across requests. On any failure the
 * session is discarded, a fresh one is opened, and the operation is retried once.
 * This eliminates the per-request SSH handshake that made listings feel slow.
 *
 * download() intentionally opens its own dedicated session because it returns a live
 * InputStream that spans the HTTP response write — sharing the cached session would
 * block every other file operation until the download completed.
 */
@Service
public class SftpService {

    private static final Logger log = LoggerFactory.getLogger(SftpService.class);

    private final SshService sshService;
    private SftpSession cachedSession;
    private final Object lock = new Object();

    public SftpService(SshService sshService) {
        this.sshService = sshService;
    }

    @PreDestroy
    public void destroy() {
        synchronized (lock) {
            silentClose(cachedSession);
            cachedSession = null;
        }
    }

    // ── internal session management ──────────────────────────────────────────

    @FunctionalInterface
    private interface SftpOp<T> { T run(ChannelSftp sftp) throws Exception; }

    /** Run an SFTP operation against the shared cached session, reconnecting on failure. */
    private <T> T exec(SftpOp<T> op) throws Exception {
        synchronized (lock) {
            try {
                return op.run(session().sftp());
            } catch (Exception first) {
                log.debug("SFTP op failed ({}), reconnecting and retrying", first.getMessage());
                invalidate();
                return op.run(session().sftp()); // propagates if it fails again
            }
        }
    }

    private SftpSession session() throws Exception {
        if (cachedSession != null && isAlive(cachedSession)) return cachedSession;
        silentClose(cachedSession);
        cachedSession = sshService.openSftp();
        log.debug("SFTP session (re)connected");
        return cachedSession;
    }

    private void invalidate() {
        silentClose(cachedSession);
        cachedSession = null;
    }

    private boolean isAlive(SftpSession s) {
        try { return s.session().isConnected() && s.sftp().isConnected(); }
        catch (Exception e) { return false; }
    }

    private void silentClose(SftpSession s) {
        if (s != null) try { s.close(); } catch (Exception ignored) {}
    }

    // ── public API ────────────────────────────────────────────────────────────

    public List<FileEntryDTO> list(String path) throws Exception {
        return exec(sftp -> {
            List<ChannelSftp.LsEntry> entries = new ArrayList<>();
            sftp.ls(path, entry -> { entries.add(entry); return ChannelSftp.LsEntrySelector.CONTINUE; });

            List<FileEntryDTO> dirs  = new ArrayList<>();
            List<FileEntryDTO> files = new ArrayList<>();
            for (ChannelSftp.LsEntry e : entries) {
                if (".".equals(e.getFilename()) || "..".equals(e.getFilename())) continue;
                SftpATTRS attrs = e.getAttrs();
                String type = attrs.isDir() ? "dir" : attrs.isLink() ? "link" : "file";
                String entryPath = path.endsWith("/") ? path + e.getFilename() : path + "/" + e.getFilename();
                FileEntryDTO dto = new FileEntryDTO(
                    e.getFilename(), entryPath, type,
                    attrs.isDir() ? 0 : attrs.getSize(),
                    (long) attrs.getMTime() * 1000L,
                    attrs.getPermissionsString()
                );
                if ("dir".equals(type)) dirs.add(dto); else files.add(dto);
            }
            dirs.sort(Comparator.comparing(FileEntryDTO::name));
            files.sort(Comparator.comparing(FileEntryDTO::name));
            dirs.addAll(files);
            return dirs;
        });
    }

    /** download() opens a dedicated session — the returned stream must stay open during HTTP response write. */
    public InputStream download(String path) throws Exception {
        SftpSession s = sshService.openSftp();
        InputStream is = s.sftp().get(path);
        return new java.io.FilterInputStream(is) {
            @Override public void close() throws java.io.IOException {
                try { super.close(); } finally { s.close(); }
            }
        };
    }

    public String readText(String path) throws Exception {
        return exec(sftp -> {
            SftpATTRS attrs = sftp.stat(path);
            if (attrs.getSize() > 1_000_000) throw new IllegalArgumentException("Archivo mayor a 1MB");
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            sftp.get(path, buf);
            return buf.toString(StandardCharsets.UTF_8);
        });
    }

    public void writeText(String path, String content) throws Exception {
        exec(sftp -> {
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            sftp.put(new java.io.ByteArrayInputStream(bytes), path, ChannelSftp.OVERWRITE);
            return null;
        });
    }

    public void upload(String dirPath, MultipartFile file) throws Exception {
        String destPath = dirPath.endsWith("/") ? dirPath + file.getOriginalFilename()
                                                 : dirPath + "/" + file.getOriginalFilename();
        // read into memory first so the multipart stream doesn't block while holding the lock
        byte[] bytes = file.getBytes();
        exec(sftp -> {
            sftp.put(new java.io.ByteArrayInputStream(bytes), destPath, ChannelSftp.OVERWRITE);
            return null;
        });
    }

    public void mkdir(String path) throws Exception {
        exec(sftp -> { sftp.mkdir(path); return null; });
    }

    public void delete(String path) throws Exception {
        exec(sftp -> {
            SftpATTRS attrs = sftp.stat(path);
            if (attrs.isDir()) sftp.rmdir(path);
            else               sftp.rm(path);
            return null;
        });
    }

    public void rename(String from, String to) throws Exception {
        exec(sftp -> { sftp.rename(from, to); return null; });
    }
}
