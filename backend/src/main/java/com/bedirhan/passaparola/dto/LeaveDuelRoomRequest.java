package com.bedirhan.passaparola.dto;

public class LeaveDuelRoomRequest {

    private Long playerId;

    public LeaveDuelRoomRequest() {
    }

    public LeaveDuelRoomRequest(Long playerId) {
        this.playerId = playerId;
    }

    public Long getPlayerId() {
        return playerId;
    }

    public void setPlayerId(Long playerId) {
        this.playerId = playerId;
    }
}
