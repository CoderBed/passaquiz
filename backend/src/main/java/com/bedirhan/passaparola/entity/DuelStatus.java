package com.bedirhan.passaparola.entity;

public enum DuelStatus {

    WAITING("Rakip bekleniyor"),
    READY("Başlatılabilir"),
    STARTED("Oyun başladı"),
    FINISHED("Oyun bitti");

    private final String description;

    DuelStatus(String description) {
        this.description = description;
    }

    public String getDescription() {
        return description;
    }
}