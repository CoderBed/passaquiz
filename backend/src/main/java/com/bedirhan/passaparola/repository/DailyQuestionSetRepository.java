package com.bedirhan.passaparola.repository;

import com.bedirhan.passaparola.entity.DailyQuestionSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface DailyQuestionSetRepository extends JpaRepository<DailyQuestionSet, Long> {
    Optional<DailyQuestionSet> findBySetDate(LocalDate setDate);
}