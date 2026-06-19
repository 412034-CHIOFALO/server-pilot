package com.serverpilot.idrac;

import com.serverpilot.ssh.ExecResult;
import com.serverpilot.ssh.SshService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class IdracService {

    private final IdracConfigService configService;
    private final SshService         sshService;

    public IdracService(IdracConfigService configService, SshService sshService) {
        this.configService = configService;
        this.sshService    = sshService;
    }

    // ── Shell helpers ─────────────────────────────────────────────────────────

    /** Builds: ipmitool -I lanplus -H 'ip' -U 'user' -P 'pass' <subcmd> */
    private String buildCmd(IdracConfig cfg, String subcmd) {
        return "ipmitool -I lanplus"
             + " -H " + shellEscape(cfg.ip())
             + " -U " + shellEscape(cfg.username())
             + " -P " + shellEscape(cfg.password())
             + " " + subcmd;
    }

    /** POSIX single-quote escaping to guard against special chars in credentials */
    private static String shellEscape(String s) {
        if (s == null || s.isBlank()) return "''";
        return "'" + s.replace("'", "'\\''") + "'";
    }

    /** Produces a human-readable error from a failed ExecResult */
    private static String classifyError(ExecResult r) {
        String combined = (r.stdout() + " " + r.stderr()).toLowerCase();
        if (combined.contains("command not found") || combined.contains("no such file"))
            return "ipmitool no está instalado en el host SSH";
        if (combined.contains("connection refused") || combined.contains("unable to establish") || combined.contains("get device id command failed"))
            return "IPMI no responde en el host configurado — verificá que LAN/IPMI esté habilitado en el iDRAC";
        if (combined.contains("unauthorized") || combined.contains("incorrect") || combined.contains("login"))
            return "Credenciales IPMI incorrectas";
        if (combined.contains("timeout"))
            return "Timeout: IPMI no responde en el host configurado";
        String msg = r.stderr().isBlank() ? r.stdout() : r.stderr();
        return "ipmitool: " + msg.trim();
    }

    // ── Power ─────────────────────────────────────────────────────────────────

    public String getPowerState() {
        IdracConfig cfg = configService.get();
        if (cfg.ip() == null || cfg.ip().isBlank()) return "NOT_CONFIGURED";
        try {
            ExecResult r = sshService.execCommand(buildCmd(cfg, "chassis power status"));
            if (r.exitCode() != 0) return "UNREACHABLE";
            String out = r.stdout().trim().toLowerCase();
            if (out.contains("chassis power is on"))  return "On";
            if (out.contains("chassis power is off")) return "Off";
            return "UNREACHABLE";
        } catch (Exception e) {
            return "UNREACHABLE";
        }
    }

    /**
     * @param ipmiPowerCmd one of: on, soft, off, cycle, reset
     *   on    = power on
     *   soft  = graceful shutdown (ACPI)
     *   off   = immediate power off
     *   cycle = power cycle (graceful)
     *   reset = hard reset
     */
    public void powerAction(String ipmiPowerCmd) throws Exception {
        IdracConfig cfg = configService.get();
        if (cfg.ip() == null || cfg.ip().isBlank())
            throw new IllegalStateException("iDRAC no configurado");

        ExecResult r = sshService.execCommand(buildCmd(cfg, "chassis power " + ipmiPowerCmd));
        if (r.exitCode() != 0) throw new RuntimeException(classifyError(r));
    }

    // ── Sensors ───────────────────────────────────────────────────────────────

    /**
     * Returns list of sensors: temperature, fan, and power consumption.
     * Each entry: {name, value, status, type}
     */
    public List<Map<String, String>> getSensors() throws Exception {
        IdracConfig cfg = configService.get();
        if (cfg.ip() == null || cfg.ip().isBlank())
            throw new IllegalStateException("iDRAC no configurado");

        List<Map<String, String>> sensors = new ArrayList<>();
        runSdr(cfg, "Temperature", "temperature", sensors);
        runSdr(cfg, "Fan",         "fan",         sensors);
        runPowerConsumption(cfg, sensors);
        return sensors;
    }

    private void runSdr(IdracConfig cfg, String sdrType, String kind,
                        List<Map<String, String>> out) {
        try {
            ExecResult r = sshService.execCommand(buildCmd(cfg, "sdr type " + sdrType));
            if (r.exitCode() == 0) {
                for (String line : r.stdout().split("\\R")) parseLine(line, kind, out);
            }
        } catch (Exception ignored) {}
    }

    private void runPowerConsumption(IdracConfig cfg, List<Map<String, String>> out) {
        try {
            // Pipe inside SSH exec — works because JSch passes the command to the remote shell
            ExecResult r = sshService.execCommand(
                buildCmd(cfg, "sensor") + " | grep -i 'Pwr Consumption'"
            );
            if (r.exitCode() == 0) {
                for (String line : r.stdout().split("\\R")) parseLine(line, "power", out);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Parses both sdr and sensor output formats:
     *   sdr:    "Inlet Temp       | 24 degrees C      | ok"
     *   sensor: "Pwr Consumption  | 84.000 | Watts | ok | ..."
     */
    private static void parseLine(String line, String kind, List<Map<String, String>> out) {
        String[] parts = line.split("\\|");
        if (parts.length < 3) return;

        String name = parts[0].trim();
        if (name.isBlank()) return;

        String value, status;
        if (parts.length >= 4) {
            // Full sensor output: name | number | unit | status | ...
            value  = parts[1].trim() + " " + parts[2].trim();
            status = parts[3].trim();
        } else {
            // SDR output: name | value_with_unit | status
            value  = parts[1].trim();
            status = parts[2].trim();
        }

        if (value.isBlank()
                || value.equalsIgnoreCase("no reading")
                || value.equalsIgnoreCase("disabled")) return;

        Map<String, String> sensor = new LinkedHashMap<>();
        sensor.put("name",   name);
        sensor.put("value",  value);
        sensor.put("status", status);
        sensor.put("type",   kind);
        out.add(sensor);
    }
}
