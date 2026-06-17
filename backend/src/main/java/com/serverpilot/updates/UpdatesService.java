package com.serverpilot.updates;

import com.serverpilot.ssh.ExecResult;
import com.serverpilot.ssh.SshService;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
public class UpdatesService {

    private final SshService sshService;

    public UpdatesService(SshService sshService) {
        this.sshService = sshService;
    }

    public UpdateInfo check() throws Exception {
        ExecResult pkgResult = sshService.execCommand(
            "apt list --upgradable 2>/dev/null | grep -v '^Listing' | grep -v '^$'");
        List<String> packages = pkgResult.stdout().isBlank() ? List.of() :
            Arrays.stream(pkgResult.stdout().strip().split("\n"))
                .map(String::strip)
                .filter(s -> !s.isBlank())
                .toList();

        ExecResult rebootResult = sshService.execCommand(
            "test -f /var/run/reboot-required && echo yes || echo no");
        boolean rebootRequired = "yes".equals(rebootResult.stdout().strip());

        return new UpdateInfo(packages.size(), rebootRequired, packages);
    }
}
