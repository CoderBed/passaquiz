package com.bedirhan.passaparola.controller;

import com.bedirhan.passaparola.dto.ProfileStatsResponse;
import com.bedirhan.passaparola.service.ProfileStatsService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/profile")
public class ProfileStatsController {

    private final ProfileStatsService profileStatsService;

    public ProfileStatsController(ProfileStatsService profileStatsService) {
        this.profileStatsService = profileStatsService;
    }

    @GetMapping("/stats")
    public ProfileStatsResponse getProfileStats(Authentication authentication) {
        String email = authentication.getName();
        return profileStatsService.getStatsByEmail(email);
    }
}