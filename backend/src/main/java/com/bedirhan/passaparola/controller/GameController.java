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
import org.springframework.web.bind.annotation.PathVariable;
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
import java.util.UUID;

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

    // Arkadaşına Meydan Oku - Helper Methods
    private String generateChallengeCode() {
        while (true) {
            String generatedCode = UUID.randomUUID().toString()
                    .replace("-", "")
                    .substring(0, 8)
                    .toUpperCase();

            boolean exists = gameResultRepository.findAll().stream()
                    .anyMatch(result -> generatedCode.equalsIgnoreCase(result.getChallengeCode()));

            if (!exists) {
                return generatedCode;
            }
        }
    }

    private int toInt(Object value, int defaultValue) {
        if (value == null) {
            return defaultValue;
        }

        if (value instanceof Number number) {
            return number.intValue();
        }

        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (NumberFormatException exception) {
            return defaultValue;
        }
    }

    private Boolean toBoolean(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Boolean bool) {
            return bool;
        }

        return Boolean.parseBoolean(String.valueOf(value));
    }

    private String toText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    // Arkadaşına Meydan Oku - Endpoints
    @PostMapping("/api/challenge/create")
    public ResponseEntity<?> createChallenge(@RequestBody Map<String, Object> request) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication != null ? authentication.getName() : null;

        String userEmail = email;
        String userName = toText(request.get("userName"));

        if (userName == null || userName.isBlank()) {
            userName = "Oyuncu";
        }

        if (email != null && !email.isBlank() && !"anonymousUser".equals(email) && !email.endsWith("@guest.local")) {
            Optional<User> userOptional = userRepository.findByEmail(email);
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                userEmail = user.getEmail();
                userName = user.getName();
            }
        }

        String questionSetJson = toText(request.get("questionSetJson"));
        if (questionSetJson == null || questionSetJson.isBlank()) {
            return ResponseEntity.badRequest().body("Meydan okuma oluşturmak için soru seti bilgisi gerekli.");
        }

        String challengeCode = generateChallengeCode();
        int score = toInt(request.get("score"), 0);
        int durationSeconds = toInt(request.get("durationSeconds"), 0);
        int correctCount = toInt(request.get("correctCount"), 0);
        int wrongCount = toInt(request.get("wrongCount"), 0);
        int passedCount = toInt(request.get("passedCount"), 0);

        GameResult result = new GameResult();
        result.setUserEmail(userEmail == null || userEmail.isBlank() ? "challenge@guest.local" : userEmail);
        result.setUserName(userName);
        result.setGameMode(toText(request.get("gameMode")) == null ? "challenge" : toText(request.get("gameMode")));
        result.setWon(toBoolean(request.get("won")));
        result.setMaxCorrectStreak(toInt(request.get("maxCorrectStreak"), 0));
        result.setPerfectGame(Boolean.TRUE.equals(toBoolean(request.get("perfectGame"))));
        result.setNoPassGame(passedCount == 0);
        result.setPlayedAt(LocalDateTime.now());
        result.setScore(score);
        result.setCorrectCount(correctCount);
        result.setWrongCount(wrongCount);
        result.setPassedCount(passedCount);
        result.setDurationSeconds(durationSeconds);
        result.setChallengeCode(challengeCode);
        result.setQuestionSetJson(questionSetJson);
        result.setChallengeTargetScore(score);
        result.setChallengeTargetDuration(durationSeconds);

        GameResult saved = gameResultRepository.save(result);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("challengeCode", saved.getChallengeCode());
        response.put("challengerName", saved.getUserName());
        response.put("targetScore", saved.getChallengeTargetScore());
        response.put("targetDuration", saved.getChallengeTargetDuration());
        response.put("correctCount", saved.getCorrectCount());
        response.put("wrongCount", saved.getWrongCount());
        response.put("passedCount", saved.getPassedCount());
        response.put("questionSetJson", saved.getQuestionSetJson());

        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/challenge/{code}")
    public ResponseEntity<?> getChallenge(@PathVariable String code) {
        if (code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body("Meydan okuma kodu gerekli.");
        }

        Optional<GameResult> challengeOptional = gameResultRepository.findAll().stream()
                .filter(result -> result.getChallengeCode() != null)
                .filter(result -> result.getChallengeCode().equalsIgnoreCase(code.trim()))
                .findFirst();

        if (challengeOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Meydan okuma bulunamadı.");
        }

        GameResult challenge = challengeOptional.get();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("challengeCode", challenge.getChallengeCode());
        response.put("challengerName", challenge.getUserName());
        response.put("targetScore", challenge.getChallengeTargetScore());
        response.put("targetDuration", challenge.getChallengeTargetDuration());
        response.put("correctCount", challenge.getCorrectCount());
        response.put("wrongCount", challenge.getWrongCount());
        response.put("passedCount", challenge.getPassedCount());
        response.put("questionSetJson", challenge.getQuestionSetJson());
        response.put("playedAt", challenge.getPlayedAt());

        return ResponseEntity.ok(response);
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