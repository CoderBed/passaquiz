package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.dto.DuelReactionRequest;
import com.bedirhan.passaparola.dto.DuelReactionResponse;
import com.bedirhan.passaparola.service.DuelReactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/duel-reactions")
public class DuelReactionController {

    private final DuelReactionService duelReactionService;

    public DuelReactionController(DuelReactionService duelReactionService) {
        this.duelReactionService = duelReactionService;
    }

    @PostMapping
    public ResponseEntity<Void> sendReaction(@RequestBody DuelReactionRequest request,
                                             Authentication authentication) {
        String userEmail = authentication.getName();

        duelReactionService.sendReaction(
                userEmail,
                request.getRoomCode(),
                request.getEmoji()
        );

        return ResponseEntity.ok().build();
    }

    @GetMapping("/latest")
    public ResponseEntity<DuelReactionResponse> getLatestReaction(@RequestParam String roomCode,
                                                                  Authentication authentication) {
        String userEmail = authentication.getName();

        DuelReactionResponse response = duelReactionService.getLatestReaction(roomCode);
        return ResponseEntity.ok(response);
    }
}