package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.entity.Question;
import com.bedirhan.passaparola.repository.QuestionRepository;
import com.bedirhan.passaparola.dto.GameResultRequest;
import com.bedirhan.passaparola.entity.GameResult;
import com.bedirhan.passaparola.repository.GameResultRepository;
import com.bedirhan.passaparola.entity.User;
import com.bedirhan.passaparola.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
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
    private final GameResultRepository gameResultRepository;
    private final UserRepository userRepository;
    private final Random random = new Random();

    public GameController(QuestionRepository questionRepository, GameResultRepository gameResultRepository, UserRepository userRepository) {
        this.questionRepository = questionRepository;
        this.gameResultRepository = gameResultRepository;
        this.userRepository = userRepository;
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

    @PostMapping("/api/game/result")
    public ResponseEntity<?> saveResult(@RequestBody GameResultRequest request) {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email).orElseThrow();

        GameResult result = new GameResult();
        result.setUserEmail(user.getEmail());
        result.setUserName(user.getName());
        result.setScore(request.getScore());
        result.setCorrectCount(request.getCorrectCount());
        result.setWrongCount(request.getWrongCount());
        result.setPassedCount(request.getPassedCount());
        result.setDurationSeconds(request.getDurationSeconds());

        gameResultRepository.save(result);

        return ResponseEntity.ok("Kaydedildi");
    }

    @GetMapping("/api/game/leaderboard")
    public List<GameResult> getLeaderboard() {
        return gameResultRepository.findTop10ByOrderByScoreDesc();
    }
}