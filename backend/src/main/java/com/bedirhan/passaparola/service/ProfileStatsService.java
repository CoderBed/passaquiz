package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.dto.ProfileStatsResponse;
import com.bedirhan.passaparola.repository.GameResultRepository;
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

        long dailyWins = 0;
        long duelWins = 0;
        long duelLosses = 0;

        return new ProfileStatsResponse(
                totalGames,
                highestScore,
                averageScore,
                dailyWins,
                duelWins,
                duelLosses
        );
    }
}