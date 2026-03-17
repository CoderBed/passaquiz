package com.bedirhan.passaparola.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "game_results")
public class GameResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userEmail;

    private String userName;

    private int score;

    private int correctCount;

    private int wrongCount;

    private int passedCount;

    private int durationSeconds;

    public GameResult() {
    }

    public GameResult(String userEmail, int score, int correctCount, int wrongCount, int passedCount, int durationSeconds) {
        this.userEmail = userEmail;
        this.score = score;
        this.correctCount = correctCount;
        this.wrongCount = wrongCount;
        this.passedCount = passedCount;
        this.durationSeconds = durationSeconds;
    }

    public Long getId() {
        return id;
    }

    public String getUserEmail() {
        return userEmail;
    }

    public String getUserName() {
        return userName;
    }

    public void setUserName(String userName) {
        this.userName = userName;
    }

    public void setUserEmail(String userEmail) {
        this.userEmail = userEmail;
    }

    public int getScore() {
        return score;
    }

    public void setScore(int score) {
        this.score = score;
    }

    public int getCorrectCount() {
        return correctCount;
    }

    public void setCorrectCount(int correctCount) {
        this.correctCount = correctCount;
    }

    public int getWrongCount() {
        return wrongCount;
    }

    public void setWrongCount(int wrongCount) {
        this.wrongCount = wrongCount;
    }

    public int getPassedCount() {
        return passedCount;
    }

    public void setPassedCount(int passedCount) {
        this.passedCount = passedCount;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(int durationSeconds) {
        this.durationSeconds = durationSeconds;
    }
}