package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.dto.RegisterRequest;
import com.bedirhan.passaparola.dto.LoginRequest;
import com.bedirhan.passaparola.entity.User;
import com.bedirhan.passaparola.repository.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.bedirhan.passaparola.service.JwtService;
import com.bedirhan.passaparola.dto.LoginResponse;
import com.bedirhan.passaparola.service.NotificationService;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final NotificationService notificationService;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          NotificationService notificationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.notificationService = notificationService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            return ResponseEntity.badRequest().body("Bu e-mail zaten kayıtlı.");
        }

        User user = new User(
                request.getName(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword())
        );

        userRepository.save(user);

        return ResponseEntity.ok("Kayıt olma işlemi başarılı.");
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {

        var userOptional = userRepository.findByEmail(request.getEmail());

        if (userOptional.isEmpty()) {
            return ResponseEntity.badRequest().body("Kullanıcı bulunamadı.");
        }

        User user = userOptional.get();

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body("Şifreyi hatalı girdiniz.");
        }

        LocalDate today = LocalDate.now();

        if (user.getLastLoginDate() == null) {
            user.setLoginStreak(1);
        } else {
            LocalDate lastLogin = user.getLastLoginDate();

            if (lastLogin.plusDays(1).isEqual(today)) {
                user.setLoginStreak((user.getLoginStreak() == null ? 0 : user.getLoginStreak()) + 1);
            } else if (!lastLogin.isEqual(today)) {
                user.setLoginStreak(1);
            }
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime previousSeenAt = user.getLastSeenAt();

        if (previousSeenAt == null && user.getLastLoginDate() != null) {
            previousSeenAt = user.getLastLoginDate().atStartOfDay();
        }

        user.setLastLoginDate(today);
        user.setLastSeenAt(now);
        userRepository.save(user);

        if (previousSeenAt != null && previousSeenAt.isBefore(now.minusDays(5))) {
            notificationService.createWelcomeBackNotificationIfNotExists(user.getEmail());
        }

        String token = jwtService.generateToken(user.getEmail());
        return ResponseEntity.ok(new LoginResponse(
                token,
                user.getId(),
                user.getName(),
                user.getEmail()
        ));
    }

    @PostMapping("/guest-login")
    public ResponseEntity<?> guestLogin() {
        String guestCode = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
        String guestName = "Misafir-" + guestCode;
        String guestEmail = "guest_" + guestCode + "@guest.local";
        long guestId = -Math.abs(UUID.randomUUID().getMostSignificantBits());

        String token = jwtService.generateToken(guestEmail);

        return ResponseEntity.ok(new LoginResponse(
                token,
                guestId,
                guestName,
                guestEmail
        ));
    }
}