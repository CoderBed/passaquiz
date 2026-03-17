package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.entity.Question;
import com.bedirhan.passaparola.repository.QuestionRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class QuestionController {

    private final QuestionRepository questionRepository;

    public QuestionController(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    @GetMapping("/api/questions")
    public List<Question> getAllQuestions() {
        return questionRepository.findAll();
    }
}