package com.bedirhan.passaparola.dto;

public class CreateDuelRoomRequest {
    private Long playerId;
    private String playerName;

    public Long getPlayerId() {
        return playerId;
    }

    public void setPlayerId(Long playerId) {
        this.playerId = playerId;
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }
}