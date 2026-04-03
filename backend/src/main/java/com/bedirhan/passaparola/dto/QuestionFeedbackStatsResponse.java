package com.bedirhan.passaparola.dto;

public class QuestionFeedbackStatsResponse {

    private Long questionId;
    private long likeCount;
    private long dislikeCount;

    public QuestionFeedbackStatsResponse(Long questionId, long likeCount, long dislikeCount) {
        this.questionId = questionId;
        this.likeCount = likeCount;
        this.dislikeCount = dislikeCount;
    }

    public Long getQuestionId() {
        return questionId;
    }

    public long getLikeCount() {
        return likeCount;
    }

    public long getDislikeCount() {
        return dislikeCount;
    }
}