package com.bedirhan.passaparola.repository;

import com.bedirhan.passaparola.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    boolean existsByUserEmailAndTypeAndTitle(String userEmail,
                                             String type,
                                             String title);

    Optional<Notification> findByIdAndUserEmail(Long id, String userEmail);

    boolean existsByUserEmailAndTypeAndTitleAndCreatedAtBetween(
            String userEmail,
            String type,
            String title,
            LocalDateTime start,
            LocalDateTime end
    );

    boolean existsByUserEmailAndTypeAndTitleAndCreatedAtAfter(
            String userEmail,
            String type,
            String title,
            LocalDateTime createdAt
    );
}
