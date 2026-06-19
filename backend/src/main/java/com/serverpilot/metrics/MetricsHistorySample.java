package com.serverpilot.metrics;

public record MetricsHistorySample(long ts, double cpu, double ram, double disk) {}
