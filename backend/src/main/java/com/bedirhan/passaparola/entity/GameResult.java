package com.bedirhan.passaparola.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

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

    private String opponentName;

    private Integer opponentScore;

    private Integer durationDifferenceSeconds;

    private String winnerName;

    private String duelRoomCode;

    private LocalDateTime playedAt;

    private Integer maxCorrectStreak;

    private boolean perfectGame;

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

    public String getOpponentName() {
        return opponentName;
    }

    public void setOpponentName(String opponentName) {
        this.opponentName = opponentName;
    }

    public Integer getOpponentScore() {
        return opponentScore;
    }

    public void setOpponentScore(Integer opponentScore) {
        this.opponentScore = opponentScore;
    }

    public Integer getDurationDifferenceSeconds() {
        return durationDifferenceSeconds;
    }

    public void setDurationDifferenceSeconds(Integer durationDifferenceSeconds) {
        this.durationDifferenceSeconds = durationDifferenceSeconds;
    }

    public String getWinnerName() {
        return winnerName;
    }

    public void setWinnerName(String winnerName) {
        this.winnerName = winnerName;
    }

    public String getDuelRoomCode() {
        return duelRoomCode;
    }

    public void setDuelRoomCode(String duelRoomCode) {
        this.duelRoomCode = duelRoomCode;
    }

    public LocalDateTime getPlayedAt() {
        return playedAt;
    }

    public void setPlayedAt(LocalDateTime playedAt) {
        this.playedAt = playedAt;
    }

    public Integer getMaxCorrectStreak() {
        return maxCorrectStreak;
    }

    public void setMaxCorrectStreak(Integer maxCorrectStreak) {
        this.maxCorrectStreak = maxCorrectStreak;
    }

    public boolean isPerfectGame() {
        return perfectGame;
    }

    public void setPerfectGame(boolean perfectGame) {
        this.perfectGame = perfectGame;
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