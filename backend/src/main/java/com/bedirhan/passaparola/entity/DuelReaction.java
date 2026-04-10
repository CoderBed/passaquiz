package com.bedirhan.passaparola.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "duel_reactions")
public class DuelReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_code", nullable = false)
    private String roomCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "sender_id", nullable = true)
    private User sender;

    @Column(name = "guest_sender_name")
    private String guestSenderName;

    @Column(name = "guest_sender_email")
    private String guestSenderEmail;

    @Column(name = "emoji", nullable = false, length = 10)
    private String emoji;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    public DuelReaction() {
    }

    @PrePersist
    public void prePersist() {
        this.createdAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public User getSender() {
        return sender;
    }

    public void setSender(User sender) {
        this.sender = sender;
    }

    public String getGuestSenderName() {
        return guestSenderName;
    }

    public void setGuestSenderName(String guestSenderName) {
        this.guestSenderName = guestSenderName;
    }

    public String getGuestSenderEmail() {
        return guestSenderEmail;
    }

    public void setGuestSenderEmail(String guestSenderEmail) {
        this.guestSenderEmail = guestSenderEmail;
    }

    public String getEmoji() {
        return emoji;
    }

    public void setEmoji(String emoji) {
        this.emoji = emoji;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
