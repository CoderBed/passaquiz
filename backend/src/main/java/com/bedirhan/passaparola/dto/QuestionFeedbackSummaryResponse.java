package com.bedirhan.passaparola.dto;

import com.bedirhan.passaparola.entity.FeedbackReaction;

public class QuestionFeedbackSummaryResponse {

    private Long questionId;
    private long likeCount;
    private long dislikeCount;
    private boolean hasVoted;
    private FeedbackReaction userReaction;

    public QuestionFeedbackSummaryResponse(Long questionId,
                                           long likeCount,
                                           long dislikeCount,
                                           boolean hasVoted,
                                           FeedbackReaction userReaction) {
        this.questionId = questionId;
        this.likeCount = likeCount;
        this.dislikeCount = dislikeCount;
        this.hasVoted = hasVoted;
        this.userReaction = userReaction;
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

    public boolean isHasVoted() {
        return hasVoted;
    }

    public FeedbackReaction getUserReaction() {
        return userReaction;
    }
}