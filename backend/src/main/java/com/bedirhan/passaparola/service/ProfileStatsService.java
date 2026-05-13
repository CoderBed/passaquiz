package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.dto.ProfileStatsResponse;
import com.bedirhan.passaparola.entity.GameResult;
import com.bedirhan.passaparola.repository.GameResultRepository;
import com.bedirhan.passaparola.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ProfileStatsService {

    private final GameResultRepository gameResultRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public ProfileStatsService(GameResultRepository gameResultRepository,
                               UserRepository userRepository,
                               NotificationService notificationService) {
        this.gameResultRepository = gameResultRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private void notifyBadgeIfEarned(String email, boolean earned, String badgeName) {
        if (!earned) {
            return;
        }

        notificationService.createBadgeNotificationIfNotExists(email, badgeName);
    }

    @Transactional
    public ProfileStatsResponse getStatsByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);

        var user = userRepository.findByEmail(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı"));

        var myGames = gameResultRepository.findByUserEmailIgnoreCaseOrderByIdDesc(normalizedEmail);

        if (myGames.isEmpty()) {
            myGames = gameResultRepository.findAll().stream()
                    .filter(game -> normalizeEmail(game.getUserEmail()).equals(normalizedEmail))
                    .sorted(java.util.Comparator.comparing(GameResult::getId).reversed())
                    .toList();
        }

        long totalGames = myGames.size();

        int highestScore = myGames.stream()
                .mapToInt(GameResult::getScore)
                .max()
                .orElse(0);

        int averageScore = myGames.isEmpty()
                ? 0
                : (int) Math.round(
                myGames.stream()
                        .mapToInt(GameResult::getScore)
                        .average()
                        .orElse(0)
        );

        long dailyWins = gameResultRepository.countByUserEmailIgnoreCaseAndGameModeIgnoreCaseAndWonTrue(normalizedEmail, "daily");
        long duelWins = gameResultRepository.countByUserEmailIgnoreCaseAndGameModeIgnoreCaseAndWonTrue(normalizedEmail, "duel");
        long duelDraws = myGames.stream()
                .filter(game -> "duel".equalsIgnoreCase(game.getGameMode()))
                .filter(game -> "-".equals(game.getWinnerName()))
                .count();
        long duelLosses = myGames.stream()
                .filter(game -> "duel".equalsIgnoreCase(game.getGameMode()))
                .filter(game -> !Boolean.TRUE.equals(game.getWon()))
                .filter(game -> !"-".equals(game.getWinnerName()))
                .count();

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

        java.util.List<java.time.LocalDate> dailyPlayDates = myGames.stream()
                .filter(game -> "daily".equalsIgnoreCase(game.getGameMode()))
                .filter(game -> game.getPlayedAt() != null)
                .map(game -> game.getPlayedAt().toLocalDate())
                .distinct()
                .sorted(java.util.Comparator.reverseOrder())
                .toList();

        int dailyStreak = 0;
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalDate expectedDate = null;

        for (java.time.LocalDate gameDate : dailyPlayDates) {
            if (expectedDate == null) {
                // İlk gün kontrolü: bugün oynadıysa veya en fazla dün oynadıysa başlat
                if (gameDate.equals(today)) {
                    dailyStreak = 1;
                    expectedDate = today.minusDays(1);
                } else if (gameDate.equals(today.minusDays(1))) {
                    dailyStreak = 1;
                    expectedDate = today.minusDays(2);
                } else {
                    // Bugün ve dün yoksa seri sıfır
                    dailyStreak = 0;
                }
                continue;
            }

            if (dailyStreak == 0) {
                break;
            }

            if (gameDate.equals(expectedDate)) {
                dailyStreak++;
                expectedDate = expectedDate.minusDays(1);
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
        response.setDuelDraws((int) duelDraws);

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
        int storedLoginStreak = user.getLoginStreak() == null ? 0 : user.getLoginStreak();
        int badgeLoginStreak = Math.max(0, storedLoginStreak - 1);
        response.setLoginStreak(badgeLoginStreak);

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

        notifyBadgeIfEarned(normalizedEmail, perfectGameCount >= 1, "Kusursuz Oyun");
        notifyBadgeIfEarned(normalizedEmail, noPassGameCount >= 1, "Pas Vermeden Bitir");
        notifyBadgeIfEarned(normalizedEmail, dailyStreak >= 7, "7 Günlük Günlük Oyun Serisi");
        notifyBadgeIfEarned(normalizedEmail, dailyStreak >= 30, "30 Günlük Günlük Oyun Serisi");
        notifyBadgeIfEarned(normalizedEmail, bestCorrectStreak >= 5, "5 Doğru Seri");
        notifyBadgeIfEarned(normalizedEmail, bestCorrectStreak >= 10, "10 Doğru Seri");
        notifyBadgeIfEarned(normalizedEmail, duelMatchCount >= 5, "5 Düello Oyna");
        notifyBadgeIfEarned(normalizedEmail, duelMatchCount >= 10, "10 Düello Oyna");
        notifyBadgeIfEarned(normalizedEmail, uniqueOpponentWinCount >= 3, "3 Farklı Rakibi Yen");
        notifyBadgeIfEarned(normalizedEmail, duelWinStreak >= 3, "3 Düello Galibiyet Serisi");

        return response;
    }
}