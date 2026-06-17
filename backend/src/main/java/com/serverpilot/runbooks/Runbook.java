package com.serverpilot.runbooks;

public class Runbook {
    public String  id;
    public String  name;
    public String  description;
    public String  command;
    public boolean confirm;

    public Runbook() {}

    public Runbook(String id, String name, String description, String command, boolean confirm) {
        this.id          = id;
        this.name        = name;
        this.description = description;
        this.command     = command;
        this.confirm     = confirm;
    }
}
