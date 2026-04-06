package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.dto.DuelReactionResponse;
import com.bedirhan.passaparola.entity.DuelReaction;
import com.bedirhan.passaparola.entity.User;
import com.bedirhan.passaparola.repository.DuelReactionRepository;
import com.bedirhan.passaparola.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class DuelReactionService {

    private final DuelReactionRepository duelReactionRepository;
    private final UserRepository userRepository;

    public DuelReactionService(DuelReactionRepository duelReactionRepository,
                               UserRepository userRepository) {
        this.duelReactionRepository = duelReactionRepository;
        this.userRepository = userRepository;
    }

    public void sendReaction(String userEmail, String roomCode, String emoji) {
        if (roomCode == null || roomCode.isBlank()) {
            throw new RuntimeException("Oda kodu boş olamaz");
        }

        if (emoji == null || emoji.isBlank()) {
            throw new RuntimeException("Emoji boş olamaz");
        }

        if (!emoji.equals("👍")
                && !emoji.equals("😅")
                && !emoji.equals("🔥")
                && !emoji.equals("😂")
                && !emoji.equals("😡")
                && !emoji.equals("😉")
                && !emoji.equals("👎")
                && !emoji.equals("🤫")
                && !emoji.equals("😩")) {
            throw new RuntimeException("Geçersiz emoji");
        }

        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + userEmail));

        DuelReaction reaction = new DuelReaction();
        reaction.setRoomCode(roomCode);
        reaction.setSender(user);
        reaction.setEmoji(emoji);

        duelReactionRepository.save(reaction);
    }

    @Transactional(readOnly = true)
    public DuelReactionResponse getLatestReaction(String roomCode) {
        DuelReaction reaction = duelReactionRepository.findTopByRoomCodeOrderByCreatedAtDesc(roomCode)
                .orElse(null);

        if (reaction == null) {
            return null;
        }

        return new DuelReactionResponse(
                reaction.getId(),
                reaction.getRoomCode(),
                reaction.getSender().getId(),
                reaction.getSender().getName() != null
                        ? reaction.getSender().getName()
                        : reaction.getSender().getEmail(),
                reaction.getEmoji(),
                reaction.getCreatedAt()
        );
    }
}