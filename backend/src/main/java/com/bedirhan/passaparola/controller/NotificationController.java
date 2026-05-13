package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.entity.Notification;
import com.bedirhan.passaparola.service.NotificationService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.PathVariable;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;

    public NotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<Notification>> getNotifications(
            @RequestHeader("X-User-Email") String userEmail
    ) {
        List<Notification> notifications =
                notificationService.getNotificationsForUser(userEmail);

        return ResponseEntity.ok(notifications);
    }

    @PostMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @RequestHeader("X-User-Email") String userEmail
    ) {
        notificationService.markAllAsRead(userEmail);

        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Bildirimler okundu olarak işaretlendi.");

        return ResponseEntity.ok(response);
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, Object>> markOneAsRead(
            @RequestHeader("X-User-Email") String userEmail,
            @PathVariable Long notificationId
    ) {
        boolean updated = notificationService.markOneAsRead(userEmail, notificationId);

        Map<String, Object> response = new HashMap<>();
        response.put("success", updated);

        if (!updated) {
            response.put("message", "Bildirim bulunamadı veya kullanıcıya ait değil.");
            return ResponseEntity.status(404).body(response);
        }

        response.put("message", "Bildirim okundu olarak işaretlendi.");
        return ResponseEntity.ok(response);
    }
}
