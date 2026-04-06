package com.bedirhan.passaparola.dto;

import java.time.LocalDateTime;

public class DuelReactionResponse {

    private Long id;
    private String roomCode;
    private Long senderId;
    private String senderName;
    private String emoji;
    private LocalDateTime createdAt;

    public DuelReactionResponse(Long id, String roomCode, Long senderId, String senderName, String emoji, LocalDateTime createdAt) {
        this.id = id;
        this.roomCode = roomCode;
        this.senderId = senderId;
        this.senderName = senderName;
        this.emoji = emoji;
        this.createdAt = createdAt;
    }

    public Long getId() {
        return id;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public Long getSenderId() {
        return senderId;
    }

    public String getSenderName() {
        return senderName;
    }

    public String getEmoji() {
        return emoji;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}