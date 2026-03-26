package com.bedirhan.passaparola.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "game_results")
public class GameResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String userEmail;

    private String gameMode;

    private Boolean won;

    private String userName;

    private int score;

    private int correctCount;

    private int wrongCount;

    private int passedCount;

    private int durationSeconds;

    public GameResult() {
    }

    public GameResult(String userEmail, String gameMode, Boolean won, int score, int correctCount, int wrongCount, int passedCount, int durationSeconds) {
        this.userEmail = userEmail;
        this.gameMode = gameMode;
        this.won = won;
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

    public String getGameMode() {
        return gameMode;
    }

    public Boolean getWon() {
        return won;
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

    public void setGameMode(String gameMode) {
        this.gameMode = gameMode;
    }

    public void setWon(Boolean won) {
        this.won = won;
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