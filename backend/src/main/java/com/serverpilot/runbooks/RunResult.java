package com.serverpilot.runbooks;

public record RunResult(String stdout, String stderr, int exitCode) {}
