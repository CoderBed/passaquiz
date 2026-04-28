package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.dto.CreateDuelRoomRequest;
import com.bedirhan.passaparola.dto.JoinDuelRoomRequest;
import com.bedirhan.passaparola.dto.LeaveDuelRoomRequest;
import com.bedirhan.passaparola.dto.DuelPlayerActionRequest;
import com.bedirhan.passaparola.dto.ReadyRequest;
import com.bedirhan.passaparola.dto.FinishDuelGameRequest;
import com.bedirhan.passaparola.entity.DuelRoom;
import com.bedirhan.passaparola.service.DuelRoomService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/duel")
@CrossOrigin
public class DuelRoomController {

    private final DuelRoomService duelRoomService;

    public DuelRoomController(DuelRoomService duelRoomService) {
        this.duelRoomService = duelRoomService;
    }

    @PostMapping("/rooms")
    public ResponseEntity<DuelRoom> createRoom(@RequestBody CreateDuelRoomRequest request) {
        return ResponseEntity.ok(duelRoomService.createRoom(request));
    }

    @PostMapping("/rooms/join")
    public ResponseEntity<DuelRoom> joinRoom(@RequestBody JoinDuelRoomRequest request) {
        return ResponseEntity.ok(duelRoomService.joinRoom(request));
    }

    @PostMapping("/rooms/{roomCode}/ready")
    public ResponseEntity<DuelRoom> setReady(
            @PathVariable String roomCode,
            @RequestBody ReadyRequest request
    ) {
        return ResponseEntity.ok(duelRoomService.setReady(roomCode, request));
    }

    @GetMapping("/rooms/{roomCode}")
    public ResponseEntity<DuelRoom> getRoom(@PathVariable String roomCode) {
        return ResponseEntity.ok(duelRoomService.getRoom(roomCode));
    }

    @PostMapping("/rooms/{roomCode}/leave")
    public ResponseEntity<DuelRoom> leaveRoom(
            @PathVariable String roomCode,
            @RequestBody LeaveDuelRoomRequest request
    ) {
        DuelRoom room = duelRoomService.leaveRoom(roomCode, request.getPlayerId());
        return ResponseEntity.ok(room);
    }

    @PostMapping("/rooms/{roomCode}/answer")
    public ResponseEntity<DuelRoom> submitAnswer(
            @PathVariable String roomCode,
            @RequestParam Long playerId,
            @RequestParam boolean correct
    ) {
        return ResponseEntity.ok(
                duelRoomService.submitAnswer(roomCode, playerId, correct)
        );
    }

    @PostMapping("/rooms/{roomCode}/rematch-request")
    public ResponseEntity<DuelRoom> requestRematch(
            @PathVariable String roomCode,
            @RequestParam Long playerId
    ) {
        return ResponseEntity.ok(duelRoomService.requestRematch(roomCode, playerId));
    }

    @PostMapping("/rooms/{roomCode}/action")
    public ResponseEntity<DuelRoom> updatePlayerAction(
            @PathVariable String roomCode,
            @RequestBody DuelPlayerActionRequest request
    ) {
        return ResponseEntity.ok(
                duelRoomService.updatePlayerAction(roomCode, request.getPlayerId(), request.getAction())
        );
    }

    @PostMapping("/rooms/{roomCode}/finish")
    public ResponseEntity<DuelRoom> finishGame(
            @PathVariable String roomCode,
            @RequestBody FinishDuelGameRequest request
    ) {
        return ResponseEntity.ok(duelRoomService.finishGame(roomCode, request));
    }
}