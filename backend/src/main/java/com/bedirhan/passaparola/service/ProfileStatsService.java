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

        int bestCorrectStreak = myGames.stream()
                .map(GameResult::getMaxCorrectStreak)
                .filter(java.util.Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(0);

        int perfectGameCount = (int) myGames.stream()
                .filter(GameResult::isPerfectGame)
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
        response.setPerfectGameCount(perfectGameCount);
        response.setPerfectGameBadgeEarned(perfectGameCount >= 1);

        response.setWeeklyDailyBadgeEarned(dailyGameCount >= 7);
        response.setStreak5BadgeEarned(bestCorrectStreak >= 5);
        response.setStreak10BadgeEarned(bestCorrectStreak >= 10);
        response.setDuel5BadgeEarned(duelMatchCount >= 5);
        response.setDuel10BadgeEarned(duelMatchCount >= 10);

        return response;
    }
}