package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.dto.ProfileStatsResponse;
import com.bedirhan.passaparola.service.ProfileStatsService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"})
@RequestMapping
public class ProfileStatsController {

    private final ProfileStatsService profileStatsService;

    public ProfileStatsController(ProfileStatsService profileStatsService) {
        this.profileStatsService = profileStatsService;
    }

    @GetMapping({"/api/profile/stats", "/api/auth/profile-stats"})
    public ProfileStatsResponse getProfileStats(
            Authentication authentication,
            @RequestHeader(value = "X-User-Email", required = false) String userEmailHeader,
            @RequestParam(value = "email", required = false) String userEmailParam
    ) {
        String email = resolveEmail(authentication, userEmailHeader, userEmailParam);
        return profileStatsService.getStatsByEmail(email);
    }

    private String resolveEmail(Authentication authentication, String userEmailHeader, String userEmailParam) {
        if (userEmailParam != null && !userEmailParam.isBlank()) {
            return userEmailParam.trim().toLowerCase();
        }

        if (userEmailHeader != null && !userEmailHeader.isBlank()) {
            return userEmailHeader.trim().toLowerCase();
        }

        if (authentication != null
                && authentication.getName() != null
                && !"anonymoususer".equalsIgnoreCase(authentication.getName())) {
            return authentication.getName().trim().toLowerCase();
        }

        return "";
    }
}