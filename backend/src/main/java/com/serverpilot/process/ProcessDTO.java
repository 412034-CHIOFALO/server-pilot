package com.serverpilot.process;

public record ProcessDTO(int pid, String name, String user, double cpuPercent, long memRssMB, String state) {}
