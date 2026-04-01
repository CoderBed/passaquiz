package com.bedirhan.passaparola.dto;

public class ProfileStatsResponse {
    private long totalGames;
    private int highestScore;
    private int averageScore;
    private long dailyWins;
    private long duelWins;
    private long duelLosses;

    private int dailyGameCount;
    private int duelMatchCount;
    private int bestCorrectStreak;

    private boolean weeklyDailyBadgeEarned;
    private boolean streak5BadgeEarned;
    private boolean streak10BadgeEarned;
    private boolean duel5BadgeEarned;
    private boolean duel10BadgeEarned;
    private int perfectGameCount;
    private boolean perfectGameBadgeEarned;

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

    public int getDailyGameCount() {
        return dailyGameCount;
    }

    public void setDailyGameCount(int dailyGameCount) {
        this.dailyGameCount = dailyGameCount;
    }

    public int getDuelMatchCount() {
        return duelMatchCount;
    }

    public void setDuelMatchCount(int duelMatchCount) {
        this.duelMatchCount = duelMatchCount;
    }

    public int getBestCorrectStreak() {
        return bestCorrectStreak;
    }

    public void setBestCorrectStreak(int bestCorrectStreak) {
        this.bestCorrectStreak = bestCorrectStreak;
    }

    public boolean isWeeklyDailyBadgeEarned() {
        return weeklyDailyBadgeEarned;
    }

    public void setWeeklyDailyBadgeEarned(boolean weeklyDailyBadgeEarned) {
        this.weeklyDailyBadgeEarned = weeklyDailyBadgeEarned;
    }

    public boolean isStreak5BadgeEarned() {
        return streak5BadgeEarned;
    }

    public void setStreak5BadgeEarned(boolean streak5BadgeEarned) {
        this.streak5BadgeEarned = streak5BadgeEarned;
    }

    public boolean isStreak10BadgeEarned() {
        return streak10BadgeEarned;
    }

    public void setStreak10BadgeEarned(boolean streak10BadgeEarned) {
        this.streak10BadgeEarned = streak10BadgeEarned;
    }

    public boolean isDuel5BadgeEarned() {
        return duel5BadgeEarned;
    }

    public void setDuel5BadgeEarned(boolean duel5BadgeEarned) {
        this.duel5BadgeEarned = duel5BadgeEarned;
    }

    public boolean isDuel10BadgeEarned() {
        return duel10BadgeEarned;
    }

    public void setDuel10BadgeEarned(boolean duel10BadgeEarned) {
        this.duel10BadgeEarned = duel10BadgeEarned;
    }

    public int getPerfectGameCount() {
        return perfectGameCount;
    }

    public void setPerfectGameCount(int perfectGameCount) {
        this.perfectGameCount = perfectGameCount;
    }

    public boolean isPerfectGameBadgeEarned() {
        return perfectGameBadgeEarned;
    }

    public void setPerfectGameBadgeEarned(boolean perfectGameBadgeEarned) {
        this.perfectGameBadgeEarned = perfectGameBadgeEarned;
    }
}