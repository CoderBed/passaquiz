package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.dto.CreateDuelRoomRequest;
import com.bedirhan.passaparola.dto.JoinDuelRoomRequest;
import com.bedirhan.passaparola.dto.ReadyRequest;
import com.bedirhan.passaparola.dto.FinishDuelGameRequest;
import com.bedirhan.passaparola.entity.DuelRoom;
import com.bedirhan.passaparola.entity.DuelStatus;
import com.bedirhan.passaparola.entity.Question;
import com.bedirhan.passaparola.repository.QuestionRepository;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.Arrays;
import java.util.Comparator;
import java.util.LinkedHashMap;

import org.springframework.stereotype.Service;

@Service
public class DuelRoomService {

    private final Map<String, DuelRoom> rooms = new ConcurrentHashMap<>();

    private final QuestionRepository questionRepository;

    public DuelRoomService(QuestionRepository questionRepository) {
        this.questionRepository = questionRepository;
    }

    public DuelRoom createRoom(CreateDuelRoomRequest request) {
        DuelRoom room = new DuelRoom();
        room.setPlayer1Id(request.getPlayerId());
        room.setPlayer1Name(request.getPlayerName());
        room.setPlayer1Ready(false);
        room.setStatus(DuelStatus.WAITING);

        rooms.put(room.getRoomCode(), room);
        return room;
    }

    public DuelRoom joinRoom(JoinDuelRoomRequest request) {
        DuelRoom room = rooms.get(request.getRoomCode());

        if (room == null) {
            throw new RuntimeException("Oda bulunamadı.");
        }

        if (room.isFull()) {
            throw new RuntimeException("Oda dolu.");
        }

        if (room.getPlayer1Id().equals(request.getPlayerId())) {
            throw new RuntimeException("Aynı oyuncu kendi odasına tekrar katılamaz.");
        }

        room.setPlayer2Id(request.getPlayerId());
        room.setPlayer2Name(request.getPlayerName());
        room.setPlayer2Ready(false);
        room.updateStatus();

        return room;
    }

    public DuelRoom setReady(String roomCode, ReadyRequest request) {
        DuelRoom room = rooms.get(roomCode);

        if (room == null) {
            throw new RuntimeException("Oda bulunamadı.");
        }

        if (room.getPlayer1Id() != null && room.getPlayer1Id().equals(request.getPlayerId())) {
            room.setPlayer1Ready(request.isReady());
        } else if (room.getPlayer2Id() != null && room.getPlayer2Id().equals(request.getPlayerId())) {
            room.setPlayer2Ready(request.isReady());
        } else {
            throw new RuntimeException("Oyuncu bu odada değil.");
        }

        if (room.isFull()) {
            room.setStatus(DuelStatus.READY);
        }

        if (room.isBothReady()) {
            room.setStatus(DuelStatus.STARTED);
            room.setGameStartAt(LocalDateTime.now().plusSeconds(10));

            List<String> alphabetOrder = Arrays.asList(
                    "A", "B", "C", "D", "E", "F", "G", "H", "İ", "K", "L", "M", "N", "O", "P", "R", "S", "T", "U", "V", "Y", "Z"
            );

            List<Question> questions = questionRepository.findAll();
            Collections.shuffle(questions);

            LinkedHashMap<String, Question> oneQuestionPerLetter = new LinkedHashMap<>();
            for (Question question : questions) {
                String letter = question.getLetter() == null
                        ? ""
                        : question.getLetter().toUpperCase(new java.util.Locale("tr", "TR"));

                if (!oneQuestionPerLetter.containsKey(letter)) {
                    oneQuestionPerLetter.put(letter, question);
                }
            }

            List<Question> selected = oneQuestionPerLetter.values().stream()
                    .sorted(Comparator.comparingInt(q -> {
                        String letter = q.getLetter() == null
                                ? ""
                                : q.getLetter().toUpperCase(new java.util.Locale("tr", "TR"));
                        int index = alphabetOrder.indexOf(letter);
                        return index >= 0 ? index : Integer.MAX_VALUE;
                    }))
                    .toList();

            room.setQuestions(selected);
            room.setCurrentIndex(0);
            room.setPlayer1Score(0);
            room.setPlayer2Score(0);
            room.setPlayer1Finished(false);
            room.setPlayer2Finished(false);
        }

        return room;
    }

    public DuelRoom submitAnswer(String roomCode, Long playerId, boolean correct) {
        DuelRoom room = rooms.get(roomCode);

        if (room == null) {
            throw new RuntimeException("Oda bulunamadı.");
        }

        if (room.getStatus() != DuelStatus.STARTED) {
            throw new RuntimeException("Oyun başlamadı.");
        }

        if (correct) {
            if (room.getPlayer1Id() != null && room.getPlayer1Id().equals(playerId)) {
                room.setPlayer1Score(room.getPlayer1Score() + 1);
            } else if (room.getPlayer2Id() != null && room.getPlayer2Id().equals(playerId)) {
                room.setPlayer2Score(room.getPlayer2Score() + 1);
            } else {
                throw new RuntimeException("Oyuncu bu odada değil.");
            }
        }

        room.setCurrentIndex(room.getCurrentIndex() + 1);

        if (room.getQuestions() != null && room.getCurrentIndex() >= room.getQuestions().size()) {
            room.setStatus(DuelStatus.FINISHED);
        }

        return room;
    }

    public DuelRoom finishGame(String roomCode, FinishDuelGameRequest request) {
        DuelRoom room = rooms.get(roomCode);

        if (room == null) {
            throw new RuntimeException("Oda bulunamadı.");
        }

        if (room.getPlayer1Id() != null && room.getPlayer1Id().equals(request.getPlayerId())) {
            room.setPlayer1Score(request.getScore());
            room.setPlayer1ElapsedTime(request.getElapsedTime());
            room.setPlayer1CorrectCount(request.getCorrectCount());
            room.setPlayer1WrongCount(request.getWrongCount());
            room.setPlayer1PassedCount(request.getPassedCount());
            room.setPlayer1Finished(true);
        } else if (room.getPlayer2Id() != null && room.getPlayer2Id().equals(request.getPlayerId())) {
            room.setPlayer2Score(request.getScore());
            room.setPlayer2ElapsedTime(request.getElapsedTime());
            room.setPlayer2CorrectCount(request.getCorrectCount());
            room.setPlayer2WrongCount(request.getWrongCount());
            room.setPlayer2PassedCount(request.getPassedCount());
            room.setPlayer2Finished(true);
        } else {
            throw new RuntimeException("Oyuncu bu odada değil.");
        }

        if (room.isPlayer1Finished() && room.isPlayer2Finished()) {
            room.setStatus(DuelStatus.FINISHED);
        }

        return room;
    }

    public DuelRoom getRoom(String roomCode) {
        DuelRoom room = rooms.get(roomCode);

        if (room == null) {
            throw new RuntimeException("Oda bulunamadı.");
        }

        return room;
    }
}