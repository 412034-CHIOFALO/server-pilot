package com.serverpilot.quicklinks;

public class QuickLink {
    public String id;
    public String name;
    public String url;
    public String color;
    public String icon;
    public int sortOrder;

    public QuickLink() {}

    public QuickLink(String id, String name, String url, String color, String icon, int sortOrder) {
        this.id = id;
        this.name = name;
        this.url = url;
        this.color = color;
        this.icon = icon;
        this.sortOrder = sortOrder;
    }
}
