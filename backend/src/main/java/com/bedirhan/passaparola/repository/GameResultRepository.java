package com.bedirhan.passaparola.repository;

import com.bedirhan.passaparola.entity.GameResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface GameResultRepository extends JpaRepository<GameResult, Long> {
    List<GameResult> findByUserEmailOrderByIdDesc(String userEmail);
    List<GameResult> findTop10ByOrderByScoreDesc();
}