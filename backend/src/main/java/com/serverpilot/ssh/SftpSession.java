package com.serverpilot.ssh;

import com.jcraft.jsch.ChannelSftp;
import com.jcraft.jsch.Session;

public record SftpSession(Session session, ChannelSftp sftp) {
    public void close() {
        try { sftp.disconnect(); } catch (Exception ignored) {}
        try { session.disconnect(); } catch (Exception ignored) {}
    }
}
