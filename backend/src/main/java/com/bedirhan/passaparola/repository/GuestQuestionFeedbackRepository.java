package com.bedirhan.passaparola.repository;

import com.bedirhan.passaparola.entity.FeedbackReaction;
import com.bedirhan.passaparola.entity.GuestQuestionFeedback;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GuestQuestionFeedbackRepository extends JpaRepository<GuestQuestionFeedback, Long> {

    Optional<GuestQuestionFeedback> findByQuestionIdAndGuestKey(Long questionId, String guestKey);

    long countByQuestionIdAndReaction(Long questionId, FeedbackReaction reaction);
}
