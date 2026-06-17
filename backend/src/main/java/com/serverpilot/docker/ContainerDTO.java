package com.serverpilot.docker;

import java.util.List;

public record ContainerDTO(
    String id,
    String shortId,
    String name,
    String image,
    String status,
    String state,
    List<String> ports,
    String project
) {}
