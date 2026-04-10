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

        boolean isGuest = userEmail != null && userEmail.endsWith("@guest.local");

        DuelReaction reaction = new DuelReaction();
        reaction.setRoomCode(roomCode);
        reaction.setEmoji(emoji);

        if (!isGuest) {
            User user = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("Kullanıcı bulunamadı: " + userEmail));
            reaction.setSender(user);
        } else {
            reaction.setGuestSenderEmail(userEmail);

            String guestName = "Misafir";
            if (userEmail != null) {
                String guestPrefix = userEmail.split("@")[0];
                if (guestPrefix.startsWith("guest_")) {
                    guestName = "Misafir-" + guestPrefix.substring("guest_".length()).toUpperCase();
                } else {
                    guestName = guestPrefix;
                }
            }

            reaction.setGuestSenderName(guestName);
        }

        duelReactionRepository.save(reaction);
    }

    @Transactional(readOnly = true)
    public DuelReactionResponse getLatestReaction(String roomCode) {
        DuelReaction reaction = duelReactionRepository.findTopByRoomCodeOrderByCreatedAtDesc(roomCode)
                .orElse(null);

        if (reaction == null) {
            return null;
        }

        Long senderId = reaction.getSender() != null ? reaction.getSender().getId() : null;

        String senderName;
        if (reaction.getSender() != null) {
            senderName = reaction.getSender().getName() != null
                    ? reaction.getSender().getName()
                    : reaction.getSender().getEmail();
        } else {
            senderName = reaction.getGuestSenderName() != null
                    ? reaction.getGuestSenderName()
                    : "Misafir";
        }

        return new DuelReactionResponse(
                reaction.getId(),
                reaction.getRoomCode(),
                senderId,
                senderName,
                reaction.getEmoji(),
                reaction.getCreatedAt()
        );
    }
}