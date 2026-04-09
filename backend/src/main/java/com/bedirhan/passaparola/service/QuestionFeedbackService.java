package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.entity.*;
import com.bedirhan.passaparola.repository.*;
import com.bedirhan.passaparola.dto.QuestionFeedbackStatsResponse;
import com.bedirhan.passaparola.dto.QuestionFeedbackSummaryResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class QuestionFeedbackService {

    private final QuestionFeedbackRepository questionFeedbackRepository;
    private final GuestQuestionFeedbackRepository guestQuestionFeedbackRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;

    public QuestionFeedbackService(QuestionFeedbackRepository questionFeedbackRepository,
                                   GuestQuestionFeedbackRepository guestQuestionFeedbackRepository,
                                   QuestionRepository questionRepository,
                                   UserRepository userRepository) {
        this.questionFeedbackRepository = questionFeedbackRepository;
        this.guestQuestionFeedbackRepository = guestQuestionFeedbackRepository;
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
    }

    public void saveOrToggleFeedback(Long questionId, String userEmail, FeedbackReaction reaction, String gameMode) {

        if (reaction == null) {
            throw new RuntimeException("Geçersiz oy bilgisi");
        }

        boolean isGuest = userEmail != null && userEmail.endsWith("@guest.local");

        Question question = questionRepository.findById(questionId)
                .orElseThrow(() -> new RuntimeException("Soru bulunamadı: " + questionId));

        if (!isGuest) {
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + userEmail));

            QuestionFeedback existing = questionFeedbackRepository
                    .findByQuestionIdAndUserId(questionId, user.getId())
                    .orElse(null);

            if (existing != null) {
                return;
            }

            QuestionFeedback feedback = new QuestionFeedback();
            feedback.setQuestion(question);
            feedback.setUser(user);
            feedback.setReaction(reaction);
            feedback.setGameMode(gameMode);

            questionFeedbackRepository.save(feedback);
            return;
        }

        String guestKey = userEmail;

        GuestQuestionFeedback existingGuestFeedback = guestQuestionFeedbackRepository
                .findByQuestionIdAndGuestKey(questionId, guestKey)
                .orElse(null);

        if (existingGuestFeedback != null) {
            return;
        }

        GuestQuestionFeedback feedback = new GuestQuestionFeedback();
        feedback.setQuestion(question);
        feedback.setGuestKey(guestKey);
        feedback.setReaction(reaction);
        feedback.setGameMode(gameMode);

        guestQuestionFeedbackRepository.save(feedback);
    }

    @Transactional(readOnly = true)
    public QuestionFeedbackStatsResponse getStats(Long questionId) {

        long likeCount = questionFeedbackRepository
                .countByQuestionIdAndReaction(questionId, FeedbackReaction.LIKE)
                + guestQuestionFeedbackRepository.countByQuestionIdAndReaction(questionId, FeedbackReaction.LIKE);

        long dislikeCount = questionFeedbackRepository
                .countByQuestionIdAndReaction(questionId, FeedbackReaction.DISLIKE)
                + guestQuestionFeedbackRepository.countByQuestionIdAndReaction(questionId, FeedbackReaction.DISLIKE);

        return new QuestionFeedbackStatsResponse(questionId, likeCount, dislikeCount);
    }

    @Transactional(readOnly = true)
    public QuestionFeedbackSummaryResponse getSummary(Long questionId, String userEmail, String gameMode) {

        boolean isGuest = userEmail != null && userEmail.endsWith("@guest.local");

        long likeCount = questionFeedbackRepository
                .countByQuestionIdAndReaction(questionId, FeedbackReaction.LIKE)
                + guestQuestionFeedbackRepository.countByQuestionIdAndReaction(questionId, FeedbackReaction.LIKE);

        long dislikeCount = questionFeedbackRepository
                .countByQuestionIdAndReaction(questionId, FeedbackReaction.DISLIKE)
                + guestQuestionFeedbackRepository.countByQuestionIdAndReaction(questionId, FeedbackReaction.DISLIKE);

        if (isGuest) {
            return new QuestionFeedbackSummaryResponse(
                    questionId,
                    likeCount,
                    dislikeCount,
                    false,
                    null
            );
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + userEmail));

        QuestionFeedback existingFeedback = questionFeedbackRepository
                .findByQuestionIdAndUserId(questionId, user.getId())
                .orElse(null);

        boolean hasVoted = existingFeedback != null;
        FeedbackReaction userReaction = hasVoted ? existingFeedback.getReaction() : null;

        return new QuestionFeedbackSummaryResponse(
                questionId,
                likeCount,
                dislikeCount,
                hasVoted,
                userReaction
        );
    }
}