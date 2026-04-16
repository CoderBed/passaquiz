package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.entity.Question;
import com.bedirhan.passaparola.repository.QuestionRepository;
import com.bedirhan.passaparola.dto.GameResultRequest;
import com.bedirhan.passaparola.entity.GameResult;
import com.bedirhan.passaparola.repository.GameResultRepository;
import com.bedirhan.passaparola.entity.User;
import com.bedirhan.passaparola.repository.UserRepository;
import com.bedirhan.passaparola.service.DailyGameService;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Optional;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
public class GameController {

    private final QuestionRepository questionRepository;
    private final GameResultRepository gameResultRepository;
    private final UserRepository userRepository;
    private final DailyGameService dailyGameService;
    private final Random random = new Random();

    public GameController(QuestionRepository questionRepository,
                          GameResultRepository gameResultRepository,
                          UserRepository userRepository,
                          DailyGameService dailyGameService) {
        this.questionRepository = questionRepository;
        this.gameResultRepository = gameResultRepository;
        this.userRepository = userRepository;
        this.dailyGameService = dailyGameService;
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

    @GetMapping("/api/game/daily-questions")
    public List<Question> getDailyQuestions() {
        return dailyGameService.getTodayQuestions();
    }

    @PostMapping("/api/game/result")
    public ResponseEntity<?> saveResult(@RequestBody GameResultRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication != null ? authentication.getName() : null;

        if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Kullanıcı doğrulanamadı.");
        }

        if (email.endsWith("@guest.local")) {
            return ResponseEntity.ok("Misafir kullanıcı için sonuç kaydedilmedi.");
        }

        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Kullanıcı bulunamadı: " + email);
        }

        User user = userOptional.get();

        GameResult result = new GameResult();
        result.setUserEmail(user.getEmail());
        result.setUserName(user.getName());

        System.out.println("saveResult endpointine girildi");
        System.out.println("request.getGameMode() = " + request.getGameMode());
        System.out.println("request.getWon() = " + request.getWon());
        System.out.println("request.getScore() = " + request.getScore());

        result.setGameMode(request.getGameMode() != null ? request.getGameMode() : "classic");
        result.setWon(request.getWon());
        result.setMaxCorrectStreak(request.getMaxCorrectStreak());
        result.setPerfectGame(request.isPerfectGame());
        result.setNoPassGame(request.getPassedCount() == 0);
        result.setPlayedAt(LocalDateTime.now());

        result.setScore(request.getScore());
        result.setCorrectCount(request.getCorrectCount());
        result.setWrongCount(request.getWrongCount());
        result.setPassedCount(request.getPassedCount());
        result.setDurationSeconds(request.getDurationSeconds());

        GameResult saved = gameResultRepository.save(result);
        System.out.println("saved gameMode = " + saved.getGameMode());
        System.out.println("saved won = " + saved.getWon());

        return ResponseEntity.ok("Kaydedildi");
    }

    @PostMapping("/api/game/duel-result")
    public ResponseEntity<?> saveDuelResult(@RequestBody GameResultRequest request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication != null ? authentication.getName() : null;

        if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Kullanıcı doğrulanamadı.");
        }

        if (email.endsWith("@guest.local")) {
            return ResponseEntity.ok("Misafir kullanıcı için düello sonucu kaydedilmedi.");
        }

        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Kullanıcı bulunamadı: " + email);
        }

        User user = userOptional.get();

        GameResult result = new GameResult();
        result.setUserEmail(user.getEmail());
        result.setUserName(user.getName());
        result.setGameMode("duel");
        result.setWon(request.getWon()); // frontend’den gelecek
        result.setMaxCorrectStreak(request.getMaxCorrectStreak());
        result.setPerfectGame(request.isPerfectGame());
        result.setNoPassGame(request.getPassedCount() == 0);
        result.setPlayedAt(LocalDateTime.now());
        result.setScore(request.getScore());
        result.setCorrectCount(request.getCorrectCount());
        result.setWrongCount(request.getWrongCount());
        result.setPassedCount(request.getPassedCount());
        result.setDurationSeconds(request.getDurationSeconds());
        result.setOpponentName(request.getOpponentName());
        result.setOpponentScore(request.getOpponentScore());
        result.setDurationDifferenceSeconds(request.getDurationDifferenceSeconds());
        result.setWinnerName(request.getWinnerName());
        result.setDuelRoomCode(request.getDuelRoomCode());

        gameResultRepository.save(result);

        return ResponseEntity.ok("Düello sonucu kaydedildi");
    }

    @GetMapping("/api/game/leaderboard")
    public List<GameResult> getLeaderboard() {
        return gameResultRepository.findTop10ByOrderByScoreDesc();
    }

    @GetMapping("/api/game/duel-history")
    public ResponseEntity<?> getDuelHistory() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication != null ? authentication.getName() : null;

        if (email == null || email.isBlank() || "anonymousUser".equals(email)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Kullanıcı doğrulanamadı.");
        }
        List<GameResult> history = gameResultRepository.findByUserEmailAndGameModeOrderByPlayedAtDesc(email, "duel");
        return ResponseEntity.ok(history);
    }

}