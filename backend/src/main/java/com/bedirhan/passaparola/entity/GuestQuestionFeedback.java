package com.bedirhan.passaparola.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "guest_question_feedback",
        uniqueConstraints = {
                @UniqueConstraint(columnNames = {"question_id", "guest_key"})
        }
)
public class GuestQuestionFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(name = "guest_key", nullable = false, length = 255)
    private String guestKey;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FeedbackReaction reaction;

    @Column(name = "game_mode", nullable = false, length = 50)
    private String gameMode;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Question getQuestion() {
        return question;
    }

    public void setQuestion(Question question) {
        this.question = question;
    }

    public String getGuestKey() {
        return guestKey;
    }

    public void setGuestKey(String guestKey) {
        this.guestKey = guestKey;
    }

    public FeedbackReaction getReaction() {
        return reaction;
    }

    public void setReaction(FeedbackReaction reaction) {
        this.reaction = reaction;
    }

    public String getGameMode() {
        return gameMode;
    }

    public void setGameMode(String gameMode) {
        this.gameMode = gameMode;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
}
