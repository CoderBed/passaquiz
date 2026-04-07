package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.dto.QuestionRequest;
import com.bedirhan.passaparola.entity.Question;
import com.bedirhan.passaparola.repository.QuestionRepository;
import org.springframework.stereotype.Service;

@Service
public class QuestionService {

    private final QuestionRepository questionRepository;

    public QuestionService(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    public Question addQuestion(QuestionRequest request) {

        // Aynı soru tekrar eklenmesin
        boolean exists = questionRepository.existsByLetterAndQuestionText(
                request.getLetter(),
                request.getQuestionText()
        );

        if (exists) {
            throw new RuntimeException("Bu soru zaten kayıtlı");
        }

        Question question = new Question();
        question.setLetter(request.getLetter());
        question.setQuestionText(request.getQuestionText());
        question.setAnswer(request.getAnswer());

        return questionRepository.save(question);
    }
}