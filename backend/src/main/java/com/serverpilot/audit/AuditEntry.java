package com.serverpilot.audit;

public record AuditEntry(long timestamp, String user, String action, String target, String result, String detail) {}
