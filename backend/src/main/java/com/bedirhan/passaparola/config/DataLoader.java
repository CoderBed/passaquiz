package com.bedirhan.passaparola.config;

import com.bedirhan.passaparola.entity.Question;
import com.bedirhan.passaparola.repository.QuestionRepository;
import com.bedirhan.passaparola.repository.DailyQuestionSetRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner loadData(QuestionRepository questionRepository,
                               DailyQuestionSetRepository dailyQuestionSetRepository) {
        return args -> {
            System.out.println("question.csv kontrol ediliyor, yeni sorular varsa eklenecek...");

            InputStream inputStream = getClass().getClassLoader().getResourceAsStream("question.csv");

            if (inputStream == null) {
                System.out.println("question.csv bulunamadı");
                return;
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(inputStream));

            reader.lines().skip(1).forEach(line -> {
                if (line == null || line.isBlank()) {
                    return;
                }

                int firstComma = line.indexOf(",");
                int lastComma = line.lastIndexOf(",");

                if (firstComma == -1 || lastComma == -1 || firstComma == lastComma) {
                    System.out.println("Atlanan satır (kolon eksik): " + line);
                    return;
                }

                String letter = line.substring(0, firstComma).trim();
                String questionText = line.substring(firstComma + 1, lastComma).trim();
                String answer = line.substring(lastComma + 1).trim();

                if (questionText.startsWith("\"") && questionText.endsWith("\"") && questionText.length() >= 2) {
                    questionText = questionText.substring(1, questionText.length() - 1);
                }

                if (answer.startsWith("\"") && answer.endsWith("\"") && answer.length() >= 2) {
                    answer = answer.substring(1, answer.length() - 1);
                }

                if (letter.isEmpty() || questionText.isEmpty() || answer.isEmpty()) {
                    System.out.println("Atlanan satır (boş alan): " + line);
                    return;
                }

                saveIfNotExists(questionRepository, letter, questionText, answer);
            });
        };
    }

    private void saveIfNotExists(QuestionRepository questionRepository, String letter, String questionText, String answer) {
        boolean exists = questionRepository.findAll().stream()
                .anyMatch(q -> letter.equals(q.getLetter()) && questionText.equals(q.getQuestionText()));

        if (!exists) {
            questionRepository.save(new Question(letter, questionText, answer));
        }
    }
}