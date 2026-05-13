package com.bedirhan.passaparola.repository;

import com.bedirhan.passaparola.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserEmailOrderByCreatedAtDesc(String userEmail);

    boolean existsByUserEmailAndTypeAndTitle(String userEmail,
                                             String type,
                                             String title);

    java.util.Optional<Notification> findByIdAndUserEmail(Long id, String userEmail);
}
