package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.entity.Notification;
import com.bedirhan.passaparola.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    public List<Notification> getNotificationsForUser(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return List.of();
        }

        return notificationRepository.findByUserEmailOrderByCreatedAtDesc(userEmail);
    }

    public Notification createNotification(String userEmail, String type, String title, String description) {
        if (userEmail == null || userEmail.isBlank()) {
            return null;
        }

        Notification notification = new Notification();
        notification.setUserEmail(userEmail);
        notification.setType(type);
        notification.setTitle(title);
        notification.setDescription(description);
        notification.setUnread(true);
        notification.setCreatedAt(LocalDateTime.now());

        return notificationRepository.save(notification);
    }

    public void createBadgeNotificationIfNotExists(String userEmail,
                                                    String badgeName) {
        if (userEmail == null || userEmail.isBlank()) {
            return;
        }

        if (badgeName == null || badgeName.isBlank()) {
            return;
        }

        String title = "Yeni rozet kazandın";
        String description = badgeName + " rozeti açıldı.";

        boolean alreadyExists =
                notificationRepository.existsByUserEmailAndTypeAndTitle(
                        userEmail,
                        "badge",
                        title + ": " + badgeName
                );

        if (alreadyExists) {
            return;
        }

        createNotification(
                userEmail,
                "badge",
                title + ": " + badgeName,
                description
        );
    }

    @Transactional
    public void markAllAsRead(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return;
        }

        List<Notification> notifications = notificationRepository.findByUserEmailOrderByCreatedAtDesc(userEmail);

        for (Notification notification : notifications) {
            notification.setUnread(false);
        }
    }

    @Transactional
    public boolean markOneAsRead(String userEmail, Long notificationId) {
        if (userEmail == null || userEmail.isBlank()) {
            return false;
        }

        if (notificationId == null) {
            return false;
        }

        return notificationRepository.findByIdAndUserEmail(notificationId, userEmail)
                .map(notification -> {
                    notification.setUnread(false);
                    return true;
                })
                .orElse(false);
    }

    public String formatTime(LocalDateTime createdAt) {
        if (createdAt == null) {
            return "";
        }

        Duration duration = Duration.between(createdAt, LocalDateTime.now());
        long minutes = duration.toMinutes();
        long hours = duration.toHours();
        long days = duration.toDays();

        if (minutes < 1) {
            return "Şimdi";
        }

        if (minutes < 60) {
            return minutes + " dk önce";
        }

        if (hours < 24) {
            return hours + " saat önce";
        }

        if (days == 1) {
            return "Dün";
        }

        return days + " gün önce";
    }
}
