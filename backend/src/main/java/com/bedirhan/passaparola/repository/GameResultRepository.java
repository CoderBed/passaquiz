package com.bedirhan.passaparola.repository;

import com.bedirhan.passaparola.entity.GameResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameResultRepository extends JpaRepository<GameResult, Long> {
    List<GameResult> findByUserEmailOrderByIdDesc(String userEmail);
    List<GameResult> findTop10ByOrderByScoreDesc();
    List<GameResult> findByUserEmailAndGameModeOrderByPlayedAtDesc(String userEmail, String gameMode);

    long countByUserEmailAndGameMode(String userEmail, String gameMode);

    long countByUserEmailAndGameModeAndWonTrue(String userEmail, String gameMode);

    long countByUserEmailAndGameModeAndWonFalse(String userEmail, String gameMode);

    List<GameResult> findByUserEmail(String userEmail);
}