package com.bedirhan.passaparola.dto;

public class DuelReactionRequest {

    private String roomCode;
    private String emoji;

    public DuelReactionRequest() {
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getEmoji() {
        return emoji;
    }

    public void setEmoji(String emoji) {
        this.emoji = emoji;
    }
}