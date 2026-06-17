package com.serverpilot.files;

import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.SftpATTRS;
import com.serverpilot.ssh.SftpSession;
import com.serverpilot.ssh.SshService;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Service
public class SftpService {

    private final SshService sshService;

    public SftpService(SshService sshService) {
        this.sshService = sshService;
    }

    public List<FileEntryDTO> list(String path) throws Exception {
        SftpSession s = sshService.openSftp();
        try {
            List<ChannelSftp.LsEntry> entries = new ArrayList<>();
            s.sftp().ls(path, entry -> { entries.add(entry); return ChannelSftp.LsEntrySelector.CONTINUE; });

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
        } finally {
            s.close();
        }
    }

    public InputStream download(String path) throws Exception {
        SftpSession s = sshService.openSftp();
        InputStream is = s.sftp().get(path);
        // wrap to close session when stream is closed
        return new java.io.FilterInputStream(is) {
            @Override public void close() throws java.io.IOException {
                try { super.close(); } finally { s.close(); }
            }
        };
    }

    public String readText(String path) throws Exception {
        SftpSession s = sshService.openSftp();
        try {
            SftpATTRS attrs = s.sftp().stat(path);
            if (attrs.getSize() > 1_000_000) throw new IllegalArgumentException("Archivo mayor a 1MB");
            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            s.sftp().get(path, buf);
            return buf.toString(StandardCharsets.UTF_8);
        } finally {
            s.close();
        }
    }

    public void writeText(String path, String content) throws Exception {
        SftpSession s = sshService.openSftp();
        try {
            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            s.sftp().put(new java.io.ByteArrayInputStream(bytes), path, ChannelSftp.OVERWRITE);
        } finally {
            s.close();
        }
    }

    public void upload(String dirPath, MultipartFile file) throws Exception {
        String destPath = dirPath.endsWith("/") ? dirPath + file.getOriginalFilename()
                                                 : dirPath + "/" + file.getOriginalFilename();
        SftpSession s = sshService.openSftp();
        try {
            s.sftp().put(file.getInputStream(), destPath, ChannelSftp.OVERWRITE);
        } finally {
            s.close();
        }
    }

    public void mkdir(String path) throws Exception {
        SftpSession s = sshService.openSftp();
        try { s.sftp().mkdir(path); } finally { s.close(); }
    }

    public void delete(String path) throws Exception {
        SftpSession s = sshService.openSftp();
        try {
            SftpATTRS attrs = s.sftp().stat(path);
            if (attrs.isDir()) s.sftp().rmdir(path);
            else               s.sftp().rm(path);
        } finally {
            s.close();
        }
    }

    public void rename(String from, String to) throws Exception {
        SftpSession s = sshService.openSftp();
        try { s.sftp().rename(from, to); } finally { s.close(); }
    }
}
