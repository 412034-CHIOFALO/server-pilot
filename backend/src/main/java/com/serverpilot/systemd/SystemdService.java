package com.serverpilot.systemd;

import com.serverpilot.ssh.ExecResult;
import com.serverpilot.ssh.SshService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class SystemdService {

    private final SshService sshService;

    public SystemdService(SshService sshService) {
        this.sshService = sshService;
    }

    public List<UnitDTO> listUnits() throws Exception {
        ExecResult r = sshService.execCommand(
            "systemctl list-units --type=service --all --no-pager --plain --no-legend 2>/dev/null");
        List<UnitDTO> units = new ArrayList<>();
        for (String line : r.stdout().split("\n")) {
            line = line.strip();
            if (line.isBlank()) continue;
            String[] parts = line.split("\\s+", 5);
            if (parts.length < 4) continue;
            String name  = parts[0];
            String load  = parts[1];
            String active = parts[2];
            String sub   = parts[3];
            String desc  = parts.length > 4 ? parts[4] : "";
            units.add(new UnitDTO(name, load, active, sub, desc));
        }
        return units;
    }

    public String getStatus(String unit) throws Exception {
        ExecResult r = sshService.execCommand("systemctl status " + sanitize(unit) + " --no-pager 2>&1");
        return r.stdout() + r.stderr();
    }

    public ExecResult action(String unit, String action) throws Exception {
        String allowed = switch (action) {
            case "start", "stop", "restart", "enable", "disable" -> action;
            default -> throw new IllegalArgumentException("Invalid action: " + action);
        };
        return sshService.execCommand("sudo systemctl " + allowed + " " + sanitize(unit));
    }

    private String sanitize(String unit) {
        return unit.replaceAll("[^a-zA-Z0-9.@_:\\-]", "");
    }
}
