package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.dto.*;
import com.bedirhan.passaparola.entity.FeedbackReaction;
import com.bedirhan.passaparola.service.QuestionFeedbackService;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/question-feedback")
public class QuestionFeedbackController {

    private final QuestionFeedbackService questionFeedbackService;

    public QuestionFeedbackController(QuestionFeedbackService questionFeedbackService) {
        this.questionFeedbackService = questionFeedbackService;
    }

    @PostMapping
    public ResponseEntity<Void> saveFeedback(@RequestBody QuestionFeedbackRequest request,
                                             Authentication authentication) {

        String userEmail = authentication.getName();

        questionFeedbackService.saveOrToggleFeedback(
                request.getQuestionId(),
                userEmail,
                request.getReaction(),
                request.getGameMode()
        );

        return ResponseEntity.ok().build();
    }

    @GetMapping("/stats/{questionId}")
    public ResponseEntity<QuestionFeedbackStatsResponse> getStats(@PathVariable Long questionId) {
        return ResponseEntity.ok(questionFeedbackService.getStats(questionId));
    }
}