package com.bedirhan.passaparola.repository;

import com.bedirhan.passaparola.entity.DuelReaction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DuelReactionRepository extends JpaRepository<DuelReaction, Long> {

    Optional<DuelReaction> findTopByRoomCodeOrderByCreatedAtDesc(String roomCode);
}