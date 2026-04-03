package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.entity.*;
import com.bedirhan.passaparola.repository.*;
import com.bedirhan.passaparola.dto.QuestionFeedbackStatsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class QuestionFeedbackService {

    private final QuestionFeedbackRepository questionFeedbackRepository;
    private final QuestionRepository questionRepository;
    private final UserRepository userRepository;

    public QuestionFeedbackService(QuestionFeedbackRepository questionFeedbackRepository,
                                   QuestionRepository questionRepository,
                                   UserRepository userRepository) {
        this.questionFeedbackRepository = questionFeedbackRepository;
        this.questionRepository = questionRepository;
        this.userRepository = userRepository;
    }

    public void saveOrToggleFeedback(Long questionId, String userEmail, FeedbackReaction reaction, String gameMode) {

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + userEmail));

        QuestionFeedback existing = questionFeedbackRepository
                .findByQuestionIdAndUserId(questionId, user.getId())
                .orElse(null);

        if (existing == null) {
            Question question = questionRepository.findById(questionId)
                    .orElseThrow(() -> new RuntimeException("Soru bulunamadı: " + questionId));

            QuestionFeedback feedback = new QuestionFeedback();
            feedback.setQuestion(question);
            feedback.setUser(user);
            feedback.setReaction(reaction);
            feedback.setGameMode(gameMode);

            questionFeedbackRepository.save(feedback);
            return;
        }

        if (existing.getReaction() == reaction) {
            questionFeedbackRepository.delete(existing);
            return;
        }

        existing.setReaction(reaction);
        existing.setGameMode(gameMode);
        questionFeedbackRepository.save(existing);
    }

    @Transactional(readOnly = true)
    public QuestionFeedbackStatsResponse getStats(Long questionId) {

        long likeCount = questionFeedbackRepository
                .countByQuestionIdAndReaction(questionId, FeedbackReaction.LIKE);

        long dislikeCount = questionFeedbackRepository
                .countByQuestionIdAndReaction(questionId, FeedbackReaction.DISLIKE);

        return new QuestionFeedbackStatsResponse(questionId, likeCount, dislikeCount);
    }
}