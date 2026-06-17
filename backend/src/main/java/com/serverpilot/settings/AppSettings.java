package com.serverpilot.settings;

public class AppSettings {

    public SshSettings  ssh      = new SshSettings();
    public IdracSettings idrac   = new IdracSettings();
    public AuthSettings  auth    = new AuthSettings();
    public AlertSettings alerts  = new AlertSettings();

    public static class SshSettings {
        public String host     = "";
        public int    port     = 22;
        public String username = "";
        public String keyPath  = "";
    }

    public static class IdracSettings {
        public boolean enabled  = false;
        public String  host     = "";
        public String  username = "";
        public String  password = "";
    }

    public static class AuthSettings {
        public String username     = "admin";
        public String passwordHash = "";
    }

    public static class AlertSettings {
        public String url  = "";
        public String type = "webhook";
    }
}
