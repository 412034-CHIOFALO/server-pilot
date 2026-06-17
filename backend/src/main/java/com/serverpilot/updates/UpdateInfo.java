package com.serverpilot.updates;

import java.util.List;

public record UpdateInfo(int count, boolean rebootRequired, List<String> packages) {}
