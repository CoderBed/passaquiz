package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.entity.Notification;
import com.bedirhan.passaparola.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;

    public NotificationService(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    private String normalizeEmail(String userEmail) {
        return userEmail == null ? "" : userEmail.trim().toLowerCase();
    }

    private boolean hasNotificationToday(String userEmail, String type, String title) {
        LocalDate today = LocalDate.now();

        return notificationRepository.findByUserEmailOrderByCreatedAtDesc(userEmail).stream()
                .filter(notification -> type.equalsIgnoreCase(notification.getType()))
                .filter(notification -> title.equals(notification.getTitle()))
                .filter(notification -> notification.getCreatedAt() != null)
                .anyMatch(notification -> notification.getCreatedAt().toLocalDate().equals(today));
    }

    private boolean hasNotificationInLastHours(String userEmail, String type, String title, long hours) {
        LocalDateTime limit = LocalDateTime.now().minusHours(hours);

        return notificationRepository.findByUserEmailOrderByCreatedAtDesc(userEmail).stream()
                .filter(notification -> type.equalsIgnoreCase(notification.getType()))
                .filter(notification -> title.equals(notification.getTitle()))
                .filter(notification -> notification.getCreatedAt() != null)
                .anyMatch(notification -> notification.getCreatedAt().isAfter(limit));
    }

    public List<Notification> getNotificationsForUser(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return List.of();
        }
        return notificationRepository.findByUserEmailOrderByCreatedAtDesc(normalizeEmail(userEmail));
    }

    public Notification createNotification(String userEmail, String type, String title, String description) {
        if (userEmail == null || userEmail.isBlank()) {
            return null;
        }

        String normalizedEmail = normalizeEmail(userEmail);

        Notification notification = new Notification();
        notification.setUserEmail(normalizedEmail);
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

    public void createDailyGameReadyNotificationIfNotExistsToday(String userEmail) {
        String normalizedEmail = normalizeEmail(userEmail);
        if (normalizedEmail.isBlank()) {
            return;
        }

        String type = "daily_game_ready";
        String title = "Bugünkü günlük oyun hazır";
        String description = "Bugünkü günlük oyunu oynayabilirsin.";

        if (hasNotificationToday(normalizedEmail, type, title)) {
            return;
        }

        createNotification(normalizedEmail, type, title, description);
    }

    public void createDailyGameReminderIfAllowed(String userEmail) {
        String normalizedEmail = normalizeEmail(userEmail);
        if (normalizedEmail.isBlank()) {
            return;
        }

        String type = "daily_game_reminder";
        String title = "Günlük oyununu henüz oynamadın";
        String description = "Günlük oyununu tamamlamadın. Oynamak için günlük oyun moduna girebilirsin.";

        if (hasNotificationInLastHours(normalizedEmail, type, title, 6)) {
            return;
        }

        createNotification(normalizedEmail, type, title, description);
    }

    public void createLeaderboardTop10NotificationIfNotExists(String userEmail) {
        String normalizedEmail = normalizeEmail(userEmail);
        if (normalizedEmail.isBlank() || normalizedEmail.endsWith("@guest.local")) {
            return;
        }

        String type = "leaderboard_top_10";
        String title = "Liderlik tablosunda ilk 10'a girdin";
        String description = "Liderlik tablosunda ilk 10 oyuncu arasına girdin.";

        boolean alreadyExists = notificationRepository.existsByUserEmailAndTypeAndTitle(
                normalizedEmail,
                type,
                title
        );

        if (alreadyExists) {
            return;
        }

        createNotification(normalizedEmail, type, title, description);
    }

    public void createWelcomeBackNotificationIfNotExists(String userEmail) {
        String normalizedEmail = normalizeEmail(userEmail);
        if (normalizedEmail.isBlank() || normalizedEmail.endsWith("@guest.local")) {
            return;
        }

        String type = "welcome_back";
        String title = "Tekrar hoş geldin";
        String description = "Liderlik tablosu seni bekliyor.";

        boolean alreadyExistsToday = hasNotificationToday(normalizedEmail, type, title);

        if (alreadyExistsToday) {
            return;
        }

        createNotification(normalizedEmail, type, title, description);
    }

    @Transactional
    public void markAllAsRead(String userEmail) {
        if (userEmail == null || userEmail.isBlank()) {
            return;
        }
        List<Notification> notifications = notificationRepository.findByUserEmailOrderByCreatedAtDesc(normalizeEmail(userEmail));

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
        return notificationRepository.findByIdAndUserEmail(notificationId, normalizeEmail(userEmail))
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
