package com.bedirhan.passaparola.entity;

import jakarta.persistence.*;

@Entity
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String letter;

    @Column(name = "difficulty_level")
    private Integer difficultyLevel;

    @Column(columnDefinition = "TEXT")
    private String questionText;

    @Column(columnDefinition = "TEXT")
    private String answer;

    public Question() {
    }

    public Question(String letter, String questionText, String answer) {
        this.letter = letter;
        this.questionText = questionText;
        this.answer = answer;
    }

    public Question(String letter, Integer difficultyLevel, String questionText, String answer) {
        this.letter = letter;
        this.difficultyLevel = difficultyLevel;
        this.questionText = questionText;
        this.answer = answer;
    }

    public Long getId() {
        return id;
    }

    public String getLetter() {
        return letter;
    }

    public void setLetter(String letter) {
        this.letter = letter;
    }

    public String getQuestionText() {
        return questionText;
    }

    public void setQuestionText(String questionText) {
        this.questionText = questionText;
    }

    public String getAnswer() {
        return answer;
    }

    public void setAnswer(String answer) {
        this.answer = answer;
    }
    public Integer getDifficultyLevel() {
        return difficultyLevel;
    }

    public void setDifficultyLevel(Integer difficultyLevel) {
        this.difficultyLevel = difficultyLevel;
    }
}