package com.serverpilot.systemd;

public record UnitDTO(String name, String load, String active, String sub, String description) {}
