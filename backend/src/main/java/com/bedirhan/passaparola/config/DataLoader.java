package com.bedirhan.passaparola.config;

import com.bedirhan.passaparola.entity.Question;
import com.bedirhan.passaparola.repository.QuestionRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner loadData(QuestionRepository questionRepository) {
        return args -> {
            questionRepository.deleteAll();

            InputStream inputStream = getClass().getClassLoader().getResourceAsStream("question.csv");

            if (inputStream == null) {
                System.out.println("question.csv bulunamadı");
                return;
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));

            reader.lines().skip(1).forEach(line -> {
                int firstComma = line.indexOf(",");
                int lastComma = line.lastIndexOf(",");

                if (firstComma != -1 && lastComma != -1 && firstComma != lastComma) {
                    String letter = line.substring(0, firstComma).trim();
                    String questionText = line.substring(firstComma + 1, lastComma).trim();
                    String answer = line.substring(lastComma + 1).trim();

                    questionRepository.save(new Question(letter, questionText, answer));
                }
            });
        };
    }

    private void saveIfNotExists(QuestionRepository questionRepository, String letter, String questionText, String answer) {
        boolean exists = questionRepository.findAll().stream()
                .anyMatch(q -> q.getLetter().equals(letter) && q.getQuestionText().equals(questionText));

        if (!exists) {
            questionRepository.save(new Question(letter, questionText, answer));
        }
    }
}