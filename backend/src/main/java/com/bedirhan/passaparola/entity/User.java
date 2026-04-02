package com.bedirhan.passaparola.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    private java.time.LocalDate lastLoginDate;

    private Integer loginStreak = 0;

    public User() {
    }

    public User(String name, String email, String password) {
        this.name = name;
        this.email = email;
        this.password = password;
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public java.time.LocalDate getLastLoginDate() {
        return lastLoginDate;
    }

    public void setLastLoginDate(java.time.LocalDate lastLoginDate) {
        this.lastLoginDate = lastLoginDate;
    }

    public Integer getLoginStreak() {
        return loginStreak;
    }

    public void setLoginStreak(Integer loginStreak) {
        this.loginStreak = loginStreak;
    }
}