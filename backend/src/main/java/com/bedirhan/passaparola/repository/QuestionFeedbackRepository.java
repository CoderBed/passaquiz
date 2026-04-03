package com.bedirhan.passaparola.repository;

import com.bedirhan.passaparola.entity.QuestionFeedback;
import com.bedirhan.passaparola.entity.FeedbackReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface QuestionFeedbackRepository extends JpaRepository<QuestionFeedback, Long> {

    Optional<QuestionFeedback> findByQuestionIdAndUserId(Long questionId, Long userId);

    long countByQuestionIdAndReaction(Long questionId, FeedbackReaction reaction);
}