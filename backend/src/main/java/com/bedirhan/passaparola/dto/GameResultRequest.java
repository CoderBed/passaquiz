package com.bedirhan.passaparola.dto;

public class GameResultRequest {

    private int score;
    private int correctCount;
    private int wrongCount;
    private int passedCount;
    private int durationSeconds;
    private Boolean won;
    private String gameMode;
    private String opponentName;
    private Integer opponentScore;
    private Integer durationDifferenceSeconds;
    private String winnerName;
    private String duelRoomCode;
    private Integer maxCorrectStreak;
    private boolean perfectGame;
    private boolean noPassGame;
    private String challengeCode;

    public GameResultRequest() {
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

    public Boolean getWon() {
        return won;
    }

    public void setWon(Boolean won) {
        this.won = won;
    }

    public String getGameMode() {
        return gameMode;
    }

    public void setGameMode(String gameMode) {
        this.gameMode = gameMode;
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

    public boolean isNoPassGame() {
        return noPassGame;
    }

    public void setNoPassGame(boolean noPassGame) {
        this.noPassGame = noPassGame;
    }

    public String getChallengeCode() {
        return challengeCode;
    }

    public void setChallengeCode(String challengeCode) {
        this.challengeCode = challengeCode;
    }
}