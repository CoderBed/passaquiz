package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.dto.ProfileStatsResponse;
import com.bedirhan.passaparola.entity.GameResult;
import com.bedirhan.passaparola.repository.GameResultRepository;
import com.bedirhan.passaparola.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class ProfileStatsService {

    private final GameResultRepository gameResultRepository;
    private final UserRepository userRepository;

    public ProfileStatsService(GameResultRepository gameResultRepository, UserRepository userRepository) {
        this.gameResultRepository = gameResultRepository;
        this.userRepository = userRepository;
    }

    public ProfileStatsResponse getStatsByEmail(String email) {
        var user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

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

        for (GameResult game : myGames) {
            if (!"duel".equalsIgnoreCase(game.getGameMode()) || game.getWon() == null) {
                continue;
            }

            if (Boolean.TRUE.equals(game.getWon())) {
                duelWinStreak++;
            } else {
                break;
            }
        }

        java.util.Map<String, Integer> opponentWinCounts = new java.util.HashMap<>();

        for (GameResult game : myGames) {
            if (!"duel".equalsIgnoreCase(game.getGameMode()) || !Boolean.TRUE.equals(game.getWon())) {
                continue;
            }

            String opponentName = game.getOpponentName();
            if (opponentName == null || opponentName.isBlank()) {
                continue;
            }

            opponentWinCounts.put(opponentName, opponentWinCounts.getOrDefault(opponentName, 0) + 1);
        }

        int sameOpponentWinCount = opponentWinCounts.values().stream()
                .max(Integer::compareTo)
                .orElse(0);

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

        int best200ScoreStreak = 0;
        int current200ScoreStreak = 0;

        java.util.List<GameResult> chronologicalGames = new java.util.ArrayList<>(myGames);
        java.util.Collections.reverse(chronologicalGames);

        for (GameResult game : chronologicalGames) {
            if (game.getScore() >= 200) {
                current200ScoreStreak++;
                if (current200ScoreStreak > best200ScoreStreak) {
                    best200ScoreStreak = current200ScoreStreak;
                }
            } else {
                current200ScoreStreak = 0;
            }
        }


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
        response.setBest200ScoreStreak(best200ScoreStreak);
        response.setNoPassGameCount(noPassGameCount);
        response.setNoPassBadgeEarned(noPassGameCount >= 1);

        response.setWeeklyDailyBadgeEarned(dailyStreak >= 7);
        response.setMonthlyDailyBadgeEarned(dailyStreak >= 30);
        response.setStreak5BadgeEarned(bestCorrectStreak >= 5);
        response.setStreak10BadgeEarned(bestCorrectStreak >= 10);
        response.setDuel5BadgeEarned(duelMatchCount >= 5);
        response.setDuel10BadgeEarned(duelMatchCount >= 10);
        response.setDuelWinStreak(duelWinStreak);
        response.setSameOpponentWinCount(sameOpponentWinCount);
        response.setLoginStreak(user.getLoginStreak() == null ? 0 : user.getLoginStreak());

        java.util.Set<String> uniqueOpponents = new java.util.HashSet<>();
        for (GameResult game : myGames) {
            if ("duel".equalsIgnoreCase(game.getGameMode()) && Boolean.TRUE.equals(game.getWon())) {
                if (game.getOpponentName() != null && !game.getOpponentName().isBlank()) {
                    uniqueOpponents.add(game.getOpponentName().toLowerCase());
                }
            }
        }
        int uniqueOpponentWinCount = uniqueOpponents.size();
        response.setUniqueOpponentWinCount(uniqueOpponentWinCount);

        return response;
    }
}