package com.bedirhan.passaparola.dto;

public class ProfileStatsResponse {
    private long totalGames;
    private int highestScore;
    private int averageScore;
    private long dailyWins;
    private long duelWins;
    private long duelLosses;

    public ProfileStatsResponse() {
    }

    public ProfileStatsResponse(long totalGames, int highestScore, int averageScore,
                                long dailyWins, long duelWins, long duelLosses) {
        this.totalGames = totalGames;
        this.highestScore = highestScore;
        this.averageScore = averageScore;
        this.dailyWins = dailyWins;
        this.duelWins = duelWins;
        this.duelLosses = duelLosses;
    }

    public long getTotalGames() {
        return totalGames;
    }

    public void setTotalGames(long totalGames) {
        this.totalGames = totalGames;
    }

    public int getHighestScore() {
        return highestScore;
    }

    public void setHighestScore(int highestScore) {
        this.highestScore = highestScore;
    }

    public int getAverageScore() {
        return averageScore;
    }

    public void setAverageScore(int averageScore) {
        this.averageScore = averageScore;
    }

    public long getDailyWins() {
        return dailyWins;
    }

    public void setDailyWins(long dailyWins) {
        this.dailyWins = dailyWins;
    }

    public long getDuelWins() {
        return duelWins;
    }

    public void setDuelWins(long duelWins) {
        this.duelWins = duelWins;
    }

    public long getDuelLosses() {
        return duelLosses;
    }

    public void setDuelLosses(long duelLosses) {
        this.duelLosses = duelLosses;
    }
}