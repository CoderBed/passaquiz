package com.bedirhan.passaparola.dto;

public class DuelPlayerActionRequest {

    private Long playerId;
    private String action;

    public Long getPlayerId() {
        return playerId;
    }

    public void setPlayerId(Long playerId) {
        this.playerId = playerId;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }
}