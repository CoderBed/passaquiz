package com.bedirhan.passaparola.repository;

import com.bedirhan.passaparola.entity.Question;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface QuestionRepository extends JpaRepository<Question, Long> {
    List<Question> findByLetter(String letter);
}