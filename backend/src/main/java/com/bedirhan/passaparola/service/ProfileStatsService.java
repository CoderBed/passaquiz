package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.dto.ProfileStatsResponse;
import com.bedirhan.passaparola.repository.GameResultRepository;
import com.bedirhan.passaparola.entity.GameResult;
import org.springframework.stereotype.Service;

@Service
public class ProfileStatsService {

    private final GameResultRepository gameResultRepository;

    public ProfileStatsService(GameResultRepository gameResultRepository) {
        this.gameResultRepository = gameResultRepository;
    }

    public ProfileStatsResponse getStatsByEmail(String email) {
        var myGames = gameResultRepository.findByUserEmailOrderByIdDesc(email);

        long totalGames = myGames.size();

        int highestScore = myGames.stream()
                .mapToInt(game -> game.getScore())
                .max()
                .orElse(0);

        int averageScore = myGames.isEmpty()
                ? 0
                : (int) Math.round(
                myGames.stream()
                        .mapToInt(game -> game.getScore())
                        .average()
                        .orElse(0)
        );

        long dailyWins = gameResultRepository.countByUserEmailAndGameModeAndWonTrue(email, "daily");
        long duelWins = gameResultRepository.countByUserEmailAndGameModeAndWonTrue(email, "duel");
        long duelLosses = gameResultRepository.countByUserEmailAndGameModeAndWonFalse(email, "duel");

        int dailyGameCount = (int) myGames.stream()
                .filter(game -> "daily".equalsIgnoreCase(game.getGameMode()))
                .count();

        int duelMatchCount = (int) myGames.stream()
                .filter(game -> "duel".equalsIgnoreCase(game.getGameMode()))
                .count();

        int duelWinStreak = 0;
        int currentDuelWinStreak = 0;

        for (GameResult game : myGames) {
            if (!"duel".equalsIgnoreCase(game.getGameMode()) || game.getWon() == null) {
                continue;
            }

            if (Boolean.TRUE.equals(game.getWon())) {
                currentDuelWinStreak++;
                if (currentDuelWinStreak > duelWinStreak) {
                    duelWinStreak = currentDuelWinStreak;
                }
            } else {
                currentDuelWinStreak = 0;
            }
        }

        int dailyStreak = 0;

        java.time.LocalDate lastDate = null;

        for (GameResult game : myGames) {
            if (!"daily".equalsIgnoreCase(game.getGameMode()) || game.getPlayedAt() == null) {
                continue;
            }

            java.time.LocalDate gameDate = game.getPlayedAt().toLocalDate();

            if (lastDate == null) {
                dailyStreak = 1;
                lastDate = gameDate;
                continue;
            }

            if (gameDate.equals(lastDate)) {
                continue;
            }

            if (gameDate.equals(lastDate.minusDays(1))) {
                dailyStreak++;
                lastDate = gameDate;
            } else {
                break;
            }
        }

        int bestCorrectStreak = myGames.stream()
                .map(GameResult::getMaxCorrectStreak)
                .filter(java.util.Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0);

        int perfectGameCount = (int) myGames.stream()
                .filter(GameResult::isPerfectGame)
                .count();

        int noPassGameCount = (int) myGames.stream()
                .filter(GameResult::isNoPassGame)
                .count();

        int totalCorrectAnswers = myGames.stream()
                .mapToInt(GameResult::getCorrectCount)
                .sum();

        int fastGameCount = (int) myGames.stream()
                .filter(game -> game.getDurationSeconds() < 60)
                .count();


        ProfileStatsResponse response = new ProfileStatsResponse(
                totalGames,
                highestScore,
                averageScore,
                dailyWins,
                duelWins,
                duelLosses
        );

        response.setDailyGameCount(dailyGameCount);
        response.setDuelMatchCount(duelMatchCount);
        response.setBestCorrectStreak(bestCorrectStreak);
        response.setDailyStreak(dailyStreak);
        response.setPerfectGameCount(perfectGameCount);
        response.setPerfectGameBadgeEarned(perfectGameCount >= 1);
        response.setTotalCorrectAnswers(totalCorrectAnswers);
        response.setFastGameCount(fastGameCount);
        response.setNoPassGameCount(noPassGameCount);
        response.setNoPassBadgeEarned(noPassGameCount >= 1);

        response.setWeeklyDailyBadgeEarned(dailyStreak >= 7);
        response.setMonthlyDailyBadgeEarned(dailyStreak >= 30);
        response.setStreak5BadgeEarned(bestCorrectStreak >= 5);
        response.setStreak10BadgeEarned(bestCorrectStreak >= 10);
        response.setDuel5BadgeEarned(duelMatchCount >= 5);
        response.setDuel10BadgeEarned(duelMatchCount >= 10);
        response.setDuelWinStreak(duelWinStreak);

        return response;
    }
}