package com.bedirhan.passaparola.entity;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public class DuelRoom {

    private String roomCode;
    private Long player1Id;
    private String player1Name;
    private Long player2Id;
    private String player2Name;

    private boolean player1Ready;
    private boolean player2Ready;

    private DuelStatus status;
    private LocalDateTime createdAt;

    private List<Question> questions;
    private int currentIndex;

    private int player1Score;
    private int player2Score;

    private boolean player1Finished;
    private boolean player2Finished;

    private int player1ElapsedTime;
    private int player2ElapsedTime;

    private int player1CorrectCount;
    private int player2CorrectCount;

    private int player1WrongCount;
    private int player2WrongCount;

    private int player1PassedCount;
    private int player2PassedCount;

    private LocalDateTime gameStartAt;

    public DuelRoom() {
        this.roomCode = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        this.status = DuelStatus.WAITING;
        this.createdAt = LocalDateTime.now();
        this.currentIndex = 0;
        this.player1Score = 0;
        this.player2Score = 0;
        this.player1Finished = false;
        this.player2Finished = false;
        this.player1ElapsedTime = 0;
        this.player2ElapsedTime = 0;
        this.player1CorrectCount = 0;
        this.player2CorrectCount = 0;
        this.player1WrongCount = 0;
        this.player2WrongCount = 0;
        this.player1PassedCount = 0;
        this.player2PassedCount = 0;
    }

    public boolean isFull() {
        return player1Id != null && player2Id != null;
    }

    public boolean isBothReady() {
        return player1Ready && player2Ready;
    }

    public void updateStatus() {
        if (player1Id != null && player2Id != null) {
            this.status = DuelStatus.READY;
        } else {
            this.status = DuelStatus.WAITING;
        }
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public Long getPlayer1Id() {
        return player1Id;
    }

    public void setPlayer1Id(Long player1Id) {
        this.player1Id = player1Id;
    }

    public String getPlayer1Name() {
        return player1Name;
    }

    public void setPlayer1Name(String player1Name) {
        this.player1Name = player1Name;
    }

    public Long getPlayer2Id() {
        return player2Id;
    }

    public void setPlayer2Id(Long player2Id) {
        this.player2Id = player2Id;
    }

    public String getPlayer2Name() {
        return player2Name;
    }

    public void setPlayer2Name(String player2Name) {
        this.player2Name = player2Name;
    }

    public boolean isPlayer1Ready() {
        return player1Ready;
    }

    public void setPlayer1Ready(boolean player1Ready) {
        this.player1Ready = player1Ready;
    }

    public boolean isPlayer2Ready() {
        return player2Ready;
    }

    public void setPlayer2Ready(boolean player2Ready) {
        this.player2Ready = player2Ready;
    }

    public DuelStatus getStatus() {
        return status;
    }

    public void setStatus(DuelStatus status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public List<Question> getQuestions() {
        return questions;
    }

    public void setQuestions(List<Question> questions) {
        this.questions = questions;
    }

    public int getCurrentIndex() {
        return currentIndex;
    }

    public void setCurrentIndex(int currentIndex) {
        this.currentIndex = currentIndex;
    }

    public int getPlayer1Score() {
        return player1Score;
    }

    public void setPlayer1Score(int player1Score) {
        this.player1Score = player1Score;
    }

    public int getPlayer2Score() {
        return player2Score;
    }

    public void setPlayer2Score(int player2Score) {
        this.player2Score = player2Score;
    }

    public boolean isPlayer1Finished() {
        return player1Finished;
    }

    public void setPlayer1Finished(boolean player1Finished) {
        this.player1Finished = player1Finished;
    }

    public boolean isPlayer2Finished() {
        return player2Finished;
    }

    public void setPlayer2Finished(boolean player2Finished) {
        this.player2Finished = player2Finished;
    }

    public int getPlayer1ElapsedTime() {
        return player1ElapsedTime;
    }

    public void setPlayer1ElapsedTime(int player1ElapsedTime) {
        this.player1ElapsedTime = player1ElapsedTime;
    }

    public int getPlayer2ElapsedTime() {
        return player2ElapsedTime;
    }

    public void setPlayer2ElapsedTime(int player2ElapsedTime) {
        this.player2ElapsedTime = player2ElapsedTime;
    }

    public int getPlayer1CorrectCount() {
        return player1CorrectCount;
    }

    public void setPlayer1CorrectCount(int player1CorrectCount) {
        this.player1CorrectCount = player1CorrectCount;
    }

    public int getPlayer2CorrectCount() {
        return player2CorrectCount;
    }

    public void setPlayer2CorrectCount(int player2CorrectCount) {
        this.player2CorrectCount = player2CorrectCount;
    }

    public int getPlayer1WrongCount() {
        return player1WrongCount;
    }

    public void setPlayer1WrongCount(int player1WrongCount) {
        this.player1WrongCount = player1WrongCount;
    }

    public int getPlayer2WrongCount() {
        return player2WrongCount;
    }

    public void setPlayer2WrongCount(int player2WrongCount) {
        this.player2WrongCount = player2WrongCount;
    }

    public int getPlayer1PassedCount() {
        return player1PassedCount;
    }

    public void setPlayer1PassedCount(int player1PassedCount) {
        this.player1PassedCount = player1PassedCount;
    }

    public int getPlayer2PassedCount() {
        return player2PassedCount;
    }

    public void setPlayer2PassedCount(int player2PassedCount) {
        this.player2PassedCount = player2PassedCount;
    }

    public LocalDateTime getGameStartAt() {
        return gameStartAt;
    }

    public void setGameStartAt(LocalDateTime gameStartAt) {
        this.gameStartAt = gameStartAt;
    }
}