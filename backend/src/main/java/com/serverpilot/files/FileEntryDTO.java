package com.serverpilot.files;

public record FileEntryDTO(
    String name,
    String path,
    String type,
    long sizeBytes,
    long mtimeEpoch,
    String permissions
) {}
