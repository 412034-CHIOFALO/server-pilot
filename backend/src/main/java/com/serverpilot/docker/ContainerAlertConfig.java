package com.serverpilot.docker;

import java.util.ArrayList;
import java.util.List;

public class ContainerAlertConfig {
    public boolean      enabled       = true;
    public List<String> excludedNames = new ArrayList<>();
}
