package com.bedirhan.passaparola.dto;

import com.bedirhan.passaparola.entity.FeedbackReaction;

public class QuestionFeedbackRequest {

    private Long questionId;
    private FeedbackReaction reaction;
    private String gameMode;

    public QuestionFeedbackRequest() {
    }

    public Long getQuestionId() {
        return questionId;
    }

    public void setQuestionId(Long questionId) {
        this.questionId = questionId;
    }

    public FeedbackReaction getReaction() {
        return reaction;
    }

    public void setReaction(FeedbackReaction reaction) {
        this.reaction = reaction;
    }

    public String getGameMode() {
        return gameMode;
    }

    public void setGameMode(String gameMode) {
        this.gameMode = gameMode;
    }
}