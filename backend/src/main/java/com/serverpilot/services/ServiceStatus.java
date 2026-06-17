package com.serverpilot.services;

public record ServiceStatus(String id, String name, String host, int port, String status) {}
