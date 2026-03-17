package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.entity.Question;
import com.bedirhan.passaparola.repository.QuestionRepository;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class GameController {

    private final QuestionRepository questionRepository;
    private final Random random = new Random();

    public GameController(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    @GetMapping("/api/game/questions")
    public List<Question> getRandomGameQuestions() {
        List<Question> allQuestions = questionRepository.findAll();

        Map<String, List<Question>> groupedByLetter = new LinkedHashMap<>();
        for (Question question : allQuestions) {
            groupedByLetter
                    .computeIfAbsent(question.getLetter(), key -> new ArrayList<>())
                    .add(question);
        }

        List<String> sortedLetters = new ArrayList<>(groupedByLetter.keySet());
        sortedLetters.sort(Comparator.naturalOrder());

        List<Question> selectedQuestions = new ArrayList<>();
        for (String letter : sortedLetters) {
            List<Question> questionsForLetter = groupedByLetter.get(letter);
            if (questionsForLetter != null && !questionsForLetter.isEmpty()) {
                int randomIndex = random.nextInt(questionsForLetter.size());
                selectedQuestions.add(questionsForLetter.get(randomIndex));
            }
        }

        return selectedQuestions;
    }
}