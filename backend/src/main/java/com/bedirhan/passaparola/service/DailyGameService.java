package com.bedirhan.passaparola.service;

import com.bedirhan.passaparola.entity.DailyQuestionSet;
import com.bedirhan.passaparola.entity.Question;
import com.bedirhan.passaparola.repository.DailyQuestionSetRepository;
import com.bedirhan.passaparola.repository.QuestionRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.*;

@Service
public class DailyGameService {

    private final DailyQuestionSetRepository dailyQuestionSetRepository;
    private final QuestionRepository questionRepository;

    public DailyGameService(DailyQuestionSetRepository dailyQuestionSetRepository,
                            QuestionRepository questionRepository) {
        this.dailyQuestionSetRepository = dailyQuestionSetRepository;
        this.questionRepository = questionRepository;
    }

    public List<Question> getTodayQuestions() {
        LocalDate today = LocalDate.now();

        Optional<DailyQuestionSet> existingSet = dailyQuestionSetRepository.findBySetDate(today);
        if (existingSet.isPresent()) {
            return existingSet.get().getQuestions();
        }

        List<Question> allQuestions = questionRepository.findAll();

        List<String> alphabetOrder = Arrays.asList(
                "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", "K", "L",
                "M", "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z"
        );

        Map<String, List<Question>> groupedByLetter = new HashMap<>();
        for (Question question : allQuestions) {
            String letter = question.getLetter() == null
                    ? ""
                    : question.getLetter().toUpperCase(new Locale("tr", "TR"));

            groupedByLetter.computeIfAbsent(letter, k -> new ArrayList<>()).add(question);
        }

        Random random = new Random(today.toEpochDay());
        List<Question> selectedQuestions = new ArrayList<>();

        for (String letter : alphabetOrder) {
            List<Question> questionsForLetter = groupedByLetter.get(letter);
            if (questionsForLetter != null && !questionsForLetter.isEmpty()) {
                Question selected = questionsForLetter.get(random.nextInt(questionsForLetter.size()));
                selectedQuestions.add(selected);
            }
        }

        DailyQuestionSet dailyQuestionSet = new DailyQuestionSet();
        dailyQuestionSet.setSetDate(today);
        dailyQuestionSet.setQuestions(selectedQuestions);

        dailyQuestionSetRepository.save(dailyQuestionSet);

        return selectedQuestions;
    }
}