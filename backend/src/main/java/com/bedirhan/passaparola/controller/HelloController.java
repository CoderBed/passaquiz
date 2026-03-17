package com.bedirhan.passaparola.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

@CrossOrigin(origins = "http://localhost:5173")

@RestController
public class HelloController {

    @GetMapping("/api/hello")
    public String sayHello() {
        return "Backend çalışıyor";
    }
}