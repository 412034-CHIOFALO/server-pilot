package com.serverpilot.ssh;

public record ExecResult(String stdout, String stderr, int exitCode) {}
