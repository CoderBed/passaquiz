package com.bedirhan.passaparola.entity;

import jakarta.persistence.*;

@Entity
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String letter;

    private String questionText;

    private String answer;

    public Question() {
    }

    public Question(String letter, String questionText, String answer) {
        this.letter = letter;
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
}