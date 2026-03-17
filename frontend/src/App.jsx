import { useEffect, useMemo, useRef, useState } from "react";

function App() {
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [questionStatuses, setQuestionStatuses] = useState([]);
  const [passedQueue, setPassedQueue] = useState([]);
  const [isReviewingPassed, setIsReviewingPassed] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(180);
  const [timeLeft, setTimeLeft] = useState(180);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [scorePop, setScorePop] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const previousScoreRef = useRef(0);
  const resultSavedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) return;

    const token = localStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      return;
    }

    setQuestionsLoading(true);

    fetch("http://localhost:8080/api/game/questions", {
      headers: {
        Authorization: "Bearer " + token,
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Sorular alınamadı");
        }
        return res.json();
      })
      .then((data) => {
        const alphabet = [
          "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", "K", "L",
          "M", "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z",
        ];

        const sorted = [...data].sort(
          (a, b) => alphabet.indexOf(a.letter) - alphabet.indexOf(b.letter)
        );

        setQuestions(sorted);
        setQuestionStatuses(sorted.map(() => "pending"));
      })
      .catch((err) => {
        console.error(err);
        localStorage.removeItem("token");
        setIsAuthenticated(false);
        setQuestions([]);
        setQuestionStatuses([]);
        setAuthMessage("Oturum geçersiz. Lütfen tekrar giriş yapın.");
      })
      .finally(() => {
        setQuestionsLoading(false);
      });
  }, [isAuthenticated]);

  useEffect(() => {
    localStorage.removeItem("token");
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    if (!answered || !gameStarted || gameFinished) return;

    const shouldAutoAdvance =
      resultMessage === "Doğru cevap" ||
      resultMessage === "Yanlış cevap" ||
      resultMessage === "Pas geçildi";

    if (!shouldAutoAdvance) return;

    const timeoutId = setTimeout(() => {
      nextQuestion();
    }, 900);

    return () => clearTimeout(timeoutId);
  }, [answered, resultMessage, gameStarted, gameFinished]);

  useEffect(() => {
    if (!gameStarted || gameFinished) return;

    if (timeLeft <= 0) {
      finishGame();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameStarted, gameFinished, timeLeft]);

  useEffect(() => {
    if (!gameStarted) {
      previousScoreRef.current = score;
      return;
    }

    if (score === previousScoreRef.current) return;

    previousScoreRef.current = score;
    setScorePop(true);

    const timeoutId = setTimeout(() => {
      setScorePop(false);
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [score, gameStarted]);

  const checkAnswer = () => {
    if (answered || !gameStarted || gameFinished) return;

    const currentQuestion = questions[currentIndex];
    const normalizedUserAnswer = userAnswer.trim().toLocaleLowerCase("tr-TR");
    const normalizedCorrectAnswer = currentQuestion.answer.trim().toLocaleLowerCase("tr-TR");

    if (!normalizedUserAnswer) {
      setResultMessage("Lütfen bir cevap yazın");
      return;
    }

    if (normalizedUserAnswer === normalizedCorrectAnswer) {
      setResultMessage("Doğru cevap");
      setScore((prevScore) => prevScore + 10);
      setQuestionStatuses((prevStatuses) => {
        const updatedStatuses = [...prevStatuses];
        updatedStatuses[currentIndex] = "correct";
        return updatedStatuses;
      });
      setPassedQueue((prevQueue) => prevQueue.filter((index) => index !== currentIndex));
      setAnswered(true);
    } else {
      setResultMessage("Yanlış cevap");
      setScore((prevScore) => prevScore - 5);
      setQuestionStatuses((prevStatuses) => {
        const updatedStatuses = [...prevStatuses];
        updatedStatuses[currentIndex] = "wrong";
        return updatedStatuses;
      });
      setPassedQueue((prevQueue) => prevQueue.filter((index) => index !== currentIndex));
      setAnswered(true);
    }
  };

  const passQuestion = () => {
    if (answered || !gameStarted || gameFinished) return;

    setResultMessage("Pas geçildi");
    setQuestionStatuses((prevStatuses) => {
      const updatedStatuses = [...prevStatuses];
      updatedStatuses[currentIndex] = "passed";
      return updatedStatuses;
    });
    setPassedQueue((prevQueue) =>
      prevQueue.includes(currentIndex) ? prevQueue : [...prevQueue, currentIndex]
    );
    setAnswered(true);
  };

  const nextQuestion = () => {
    const moveToQuestion = (nextIndex) => {
      setCurrentIndex(nextIndex);
      setUserAnswer("");
      setResultMessage("");
      setAnswered(false);
    };

    if (isReviewingPassed) {
      if (passedQueue.length > 0) {
        const [nextPassedIndex, ...restQueue] = passedQueue;
        setPassedQueue(restQueue);
        moveToQuestion(nextPassedIndex);
        return;
      }

      finishGame();
      return;
    }

    if (currentIndex < questions.length - 1) {
      moveToQuestion(currentIndex + 1);
      return;
    }

    if (passedQueue.length > 0) {
      const [nextPassedIndex, ...restQueue] = passedQueue;
      setPassedQueue(restQueue);
      setIsReviewingPassed(true);
      moveToQuestion(nextPassedIndex);
      return;
    }

    finishGame();
  };

  const startGame = () => {
    resultSavedRef.current = false;
    setCurrentIndex(0);
    setUserAnswer("");
    setResultMessage("");
    setScore(0);
    setAnswered(false);
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setGameFinished(false);
    setTimeLeft(selectedDuration);
    setQuestionStatuses(questions.map(() => "pending"));
    setShowHowToPlay(false);
    setShowLeaderboard(false);
    setGameStarted(true);
  };

  const restartGame = () => {
      resultSavedRef.current = false;
    setCurrentIndex(0);
    setUserAnswer("");
    setResultMessage("");
    setScore(0);
    setAnswered(false);
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setGameFinished(false);
    setQuestionStatuses(questions.map(() => "pending"));
    setTimeLeft(selectedDuration);
    setGameStarted(false);
  };

  const exitGame = () => {
      resultSavedRef.current = false;
    setCurrentIndex(0);
    setUserAnswer("");
    setResultMessage("");
    setScore(0);
    setAnswered(false);
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setGameFinished(false);
    setQuestionStatuses(questions.map(() => "pending"));
    setTimeLeft(selectedDuration);
    setGameStarted(false);
  };

  const resetAuthForm = () => {
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthMessage("");
    setShowLeaderboard(false);
  };

  const handleRegister = async () => {
    if (!authName.trim() || !authEmail.trim() || !authPassword.trim()) {
      setAuthMessage("Lütfen tüm alanları doldurun.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthMessage("");

      const response = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: authName,
          email: authEmail,
          password: authPassword,
        }),
      });

      const data = await response.text();
      setAuthMessage(data);

      if (response.ok) {
        setAuthMode("login");
        setAuthPassword("");
      }
    } catch (error) {
      setAuthMessage("Kayıt sırasında bir hata oluştu.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!authEmail.trim() || !authPassword.trim()) {
      setAuthMessage("Email ve şifre alanlarını doldurun.");
      return;
    }

    try {
      setAuthLoading(true);
      setAuthMessage("");

      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: authEmail,
          password: authPassword,
        }),
      });

      const data = await response.text();
      setAuthMessage(data);

            if (response.ok) {
              localStorage.setItem("token", data);
              setShowLeaderboard(false);
              setIsAuthenticated(true);
              setAuthPassword("");
              setAuthMessage("");
            }
    } catch (error) {
      setAuthMessage("Giriş sırasında bir hata oluştu.");
    } finally {
      setAuthLoading(false);
    }
  };

  const saveGameResult = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch("http://localhost:8080/api/game/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          score: score,
          correctCount: correctCount,
          wrongCount: wrongCount,
          passedCount: passedCount,
          durationSeconds: elapsedTime,
        }),
      });

      if (!response.ok) {
        throw new Error("Oyun sonucu kaydedilemedi");
      }
    } catch (error) {
      console.error("Oyun sonucu kaydedilemedi:", error);
    }
  };

  const finishGame = () => {
    if (resultSavedRef.current) return;
    resultSavedRef.current = true;
    setGameFinished(true);
    saveGameResult();
  };

  const fetchLeaderboard = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch("http://localhost:8080/api/game/leaderboard", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const data = await response.json();
      setLeaderboard(data);
    } catch (error) {
      console.error("Leaderboard alınamadı:", error);
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  const formatElapsedTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} dk ${remainingSeconds} sn`;
  };

  const pageStyle = {
    minHeight: "100vh",
    background: "radial-gradient(circle at top, #1e3a8a 0%, #0f172a 38%, #020617 100%)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "32px 24px",
    fontFamily: "Arial, sans-serif",
  };

  const timerBoxStyle = {
    minWidth: "140px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "8px 12px",
    borderRadius: "16px",
    background: "rgba(15, 23, 42, 0.34)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 10px 22px rgba(2, 6, 23, 0.16)",
  };

  const dangerTimerBoxStyle = {
    ...timerBoxStyle,
    background: "rgba(127, 29, 29, 0.22)",
    border: "1px solid rgba(248, 113, 113, 0.36)",
    boxShadow: "0 0 0 3px rgba(248, 113, 113, 0.10), 0 14px 28px rgba(127, 29, 29, 0.22)",
  };

  const scoreBoxStyle = {
    minWidth: "140px",
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "12px",
    padding: "8px 12px",
    borderRadius: "16px",
    background: "rgba(15, 23, 42, 0.34)",
    border: "1px solid rgba(148, 163, 184, 0.12)",
    boxShadow: "0 10px 22px rgba(2, 6, 23, 0.16)",
  };

  const cardStyle = {
    width: "100%",
    maxWidth: "1220px",
    background: "rgba(15, 23, 42, 0.82)",
    borderRadius: "28px",
    padding: "36px 40px 42px",
    boxShadow: "0 30px 80px rgba(2, 6, 23, 0.55)",
    border: "1px solid rgba(148, 163, 184, 0.16)",
    backdropFilter: "blur(10px)",
  };

  const primaryButtonStyle = {
    padding: "12px 20px",
    fontSize: "15px",
    marginTop: "15px",
    marginRight: "10px",
    border: "none",
    borderRadius: "14px",
    cursor: "pointer",
    color: "white",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    boxShadow: "0 12px 26px rgba(37, 99, 235, 0.28)",
  };

  const secondaryButtonStyle = {
    ...primaryButtonStyle,
    background: "linear-gradient(135deg, #f59e0b, #ea580c)",
    boxShadow: "0 12px 26px rgba(234, 88, 12, 0.24)",
  };

  const successButtonStyle = {
    ...primaryButtonStyle,
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
    boxShadow: "0 12px 26px rgba(22, 163, 74, 0.24)",
    marginRight: "0",
  };

  const exitButtonStyle = {
    padding: "10px 16px",
    fontSize: "14px",
    border: "1px solid rgba(248, 113, 113, 0.28)",
    borderRadius: "12px",
    cursor: "pointer",
    color: "#fecaca",
    background: "linear-gradient(135deg, rgba(127, 29, 29, 0.82), rgba(69, 10, 10, 0.9))",
    boxShadow: "0 10px 22px rgba(127, 29, 29, 0.18)",
  };

  const authInputStyle = {
    padding: "14px 16px",
    fontSize: "16px",
    width: "100%",
    borderRadius: "14px",
    border: "1px solid rgba(96, 165, 250, 0.32)",
    backgroundColor: "rgba(15, 23, 42, 0.78)",
    color: "#f8fafc",
    boxSizing: "border-box",
    outline: "none",
  };

  const durationButtonStyle = (duration) => ({
    padding: "16px 22px",
    minWidth: "120px",
    borderRadius: "18px",
    border: duration === selectedDuration
      ? "1px solid rgba(147, 197, 253, 0.85)"
      : "1px solid rgba(255, 255, 255, 0.10)",
    background: duration === selectedDuration
      ? "linear-gradient(135deg, rgba(59,130,246,0.35), rgba(37,99,235,0.55))"
      : "linear-gradient(135deg, rgba(51,65,85,0.85), rgba(30,41,59,0.95))",
    color: "#f8fafc",
    fontSize: "20px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: duration === selectedDuration
      ? "0 16px 30px rgba(37, 99, 235, 0.25)"
      : "0 12px 24px rgba(2, 6, 23, 0.22)",
  });

  const circleSize = 620;
  const radius = 240;

  const correctCount = useMemo(
    () => questionStatuses.filter((status) => status === "correct").length,
    [questionStatuses]
  );
  const wrongCount = useMemo(
    () => questionStatuses.filter((status) => status === "wrong").length,
    [questionStatuses]
  );
  const passedCount = useMemo(
    () => questionStatuses.filter((status) => status === "passed").length,
    [questionStatuses]
  );
  const elapsedTime = selectedDuration - timeLeft;

  if (!isAuthenticated) {
    return (
      <div style={pageStyle}>
        <div
          style={{
            ...cardStyle,
            maxWidth: "560px",
            textAlign: "center",
          }}
        >
          <img
            src="/passaquiz.png"
            alt="PassaQuiz Logo"
            style={{ width: "260px", marginBottom: "16px" }}
          />

          <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "10px" }}>
            {authMode === "login" ? "Giriş Yap" : "Kayıt Ol"}
          </h2>

          <p style={{ color: "#cbd5e1", marginTop: 0, marginBottom: "24px", fontSize: "16px" }}>
            Oyuna başlamadan önce hesabınla giriş yapman gerekiyor.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "12px",
              marginBottom: "22px",
            }}
          >
            <button
              onClick={() => {
                setAuthMode("login");
                resetAuthForm();
              }}
              style={{
                ...primaryButtonStyle,
                marginTop: 0,
                marginRight: 0,
                minWidth: "140px",
                opacity: authMode === "login" ? 1 : 0.7,
              }}
            >
              Giriş Yap
            </button>

            <button
              onClick={() => {
                setAuthMode("register");
                resetAuthForm();
              }}
              style={{
                ...secondaryButtonStyle,
                marginTop: 0,
                marginRight: 0,
                minWidth: "140px",
                opacity: authMode === "register" ? 1 : 0.7,
              }}
            >
              Kayıt Ol
            </button>
          </div>

          <div style={{ display: "grid", gap: "14px", maxWidth: "380px", margin: "0 auto" }}>
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Ad Soyad"
                value={authName}
                onChange={(e) => setAuthName(e.target.value)}
                style={authInputStyle}
              />
            )}

            <input
              type="email"
              placeholder="Email"
              value={authEmail}
              onChange={(e) => setAuthEmail(e.target.value)}
              style={authInputStyle}
            />

            <input
              type="password"
              placeholder="Şifre"
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  authMode === "login" ? handleLogin() : handleRegister();
                }
              }}
              style={authInputStyle}
            />
          </div>

          <button
            onClick={authMode === "login" ? handleLogin : handleRegister}
            disabled={authLoading}
            style={{
              ...(authMode === "login" ? primaryButtonStyle : successButtonStyle),
              marginTop: "22px",
              marginRight: 0,
              minWidth: "220px",
              fontSize: "17px",
              padding: "14px 24px",
              opacity: authLoading ? 0.75 : 1,
            }}
          >
            {authLoading
              ? authMode === "login"
                ? "Giriş Yapılıyor..."
                : "Kayıt Oluşturuluyor..."
              : authMode === "login"
                ? "Giriş Yap"
                : "Kayıt Ol"}
          </button>

          {authMessage && (
            <p
              style={{
                marginTop: "18px",
                marginBottom: 0,
                color:
                  authMessage.toLocaleLowerCase("tr-TR").includes("başarılı")
                    ? "#4ade80"
                    : "#fca5a5",
                fontSize: "16px",
                fontWeight: "600",
              }}
            >
              {authMessage}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (isAuthenticated && questionsLoading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h2 style={{ textAlign: "center", margin: 0, color: "#f8fafc" }}>Yükleniyor...</h2>
        </div>
      </div>
    );
  }

  if (isAuthenticated && !questionsLoading && questions.length === 0) {
    return (
      <div style={pageStyle}>
        <div
          style={{
            ...cardStyle,
            maxWidth: "620px",
            textAlign: "center",
          }}
        >
          <h2 style={{ color: "#f8fafc", marginTop: 0 }}>Soru bulunamadı</h2>
          <p style={{ color: "#cbd5e1", marginBottom: "22px" }}>
            Oyunu başlatmak için önce soru verilerinin yüklenmesi gerekiyor.
          </p>
          <button
            onClick={() => {
              localStorage.removeItem("token");
              setIsAuthenticated(false);
              resetAuthForm();
            }}
            style={{
              ...exitButtonStyle,
              marginTop: 0,
              minWidth: "200px",
              fontSize: "16px",
              padding: "14px 24px",
            }}
          >
            Giriş Ekranına Dön
          </button>
        </div>
      </div>
    );
  }

  if (!gameStarted) {
    return (
      <div style={pageStyle}>
        <div
          style={{
            ...cardStyle,
            maxWidth: "760px",
            textAlign: "center",
          }}
        >
          <img
            src="/passaquiz.png"
            alt="PassaQuiz Logo"
            style={{ width: "280px", marginBottom: "18px" }}
          />

          <h2 style={{ color: "#f8fafc", marginBottom: "10px" }}>Oyun Süresini Seç</h2>
          <p style={{ color: "#cbd5e1", marginTop: 0, marginBottom: "28px", fontSize: "18px" }}>
            Oyunu başlatmadan önce süre seç. Süre dolunca oyun otomatik olarak bitecek.
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "28px",
            }}
          >
            <button onClick={() => setSelectedDuration(180)} style={durationButtonStyle(180)}>
              3 Dakika
            </button>
            <button onClick={() => setSelectedDuration(240)} style={durationButtonStyle(240)}>
              4 Dakika
            </button>
            <button onClick={() => setSelectedDuration(300)} style={durationButtonStyle(300)}>
              5 Dakika
            </button>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "14px",
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={startGame}
              style={{
                ...successButtonStyle,
                marginRight: "0",
                marginTop: 0,
                minWidth: "180px",
                fontSize: "18px",
                padding: "14px 24px",
              }}
            >
              Oyunu Başlat
            </button>

            <button
              onClick={() => setShowHowToPlay(true)}
              style={{
                ...primaryButtonStyle,
                marginTop: 0,
                marginRight: 0,
                minWidth: "180px",
                fontSize: "18px",
                padding: "14px 24px",
              }}
            >
              Nasıl Oynanır?
            </button>
            <button
              onClick={() => {
                fetchLeaderboard();
                setShowLeaderboard(true);
              }}
              style={{
                ...secondaryButtonStyle,
                marginTop: 0,
                marginRight: 0,
                minWidth: "180px",
                fontSize: "18px",
                padding: "14px 24px",
              }}
            >
              Leaderboard
            </button>
            <button
              onClick={() => {
                localStorage.removeItem("token");
                setIsAuthenticated(false);
                resetAuthForm();
              }}
              style={{
                ...exitButtonStyle,
                marginTop: 0,
                minWidth: "180px",
                fontSize: "18px",
                padding: "14px 24px",
              }}
            >
              Çıkış Yap
            </button>
          </div>
          {showLeaderboard && (
            <div
              style={{
                marginTop: "28px",
                background: "rgba(15, 23, 42, 0.72)",
                border: "1px solid rgba(148, 163, 184, 0.16)",
                borderRadius: "18px",
                padding: "20px",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "14px",
                }}
              >
                <h3 style={{ margin: 0, color: "#f8fafc" }}>Leaderboard</h3>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  style={{
                    ...exitButtonStyle,
                    marginTop: 0,
                    padding: "8px 12px",
                    fontSize: "13px",
                  }}
                >
                  Kapat
                </button>
              </div>

              {leaderboard.length === 0 ? (
                <p style={{ color: "#cbd5e1", margin: 0 }}>Henüz skor bulunmuyor.</p>
              ) : (
                leaderboard.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 0",
                      borderBottom: "1px solid rgba(148, 163, 184, 0.12)",
                      color: "#e2e8f0",
                    }}
                  >
                    <span>{index + 1}. {item.userName || item.userEmail}</span>
                    <span style={{ color: "#60a5fa", fontWeight: "700" }}>{item.score}</span>
                  </div>
                ))
              )}
            </div>
          )}
          {showHowToPlay && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(2, 6, 23, 0.72)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "24px",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "680px",
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                  border: "1px solid rgba(96, 165, 250, 0.18)",
                  borderRadius: "24px",
                  padding: "30px 28px",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "12px", textAlign: "center" }}>
                  Nasıl Oynanır?
                </h2>

                <p style={{ color: "#cbd5e1", fontSize: "17px", lineHeight: 1.7, marginTop: 0, marginBottom: "18px" }}>
                  PassaQuiz’de amaç, ekrana gelen harfe ait soruları süre dolmadan doğru cevaplayarak en yüksek puanı elde etmektir.
                </p>

                <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Oyun Akışı</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Önce oyun süresini seçersin. Oyun başladığında her harf için bir soru gelir ve aktif harf ekranda gösterilir.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Cevaplama Kuralları</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Cevabını kutuya yazıp "Enter" tuşuna basabilir veya <strong>Cevabı Kontrol Et</strong> butonunu kullanabilirsin. Boş cevap gönderemezsin.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Pas ve Puanlama</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Doğru cevap <strong>+10 puan</strong>, yanlış cevap <strong>-5 puan</strong> kazandırır. <strong>Pas</strong> dediğinde soru sona bırakılır ve tüm normal sorular bittikten sonra tekrar karşına gelir.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Oyun Sonu</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Süre bittiğinde ya da tüm sorular tamamlandığında oyun sona erer. İstattistik ekranında puanın, doğru, yanlış ve pas sayın gösterilir.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowHowToPlay(false)}
                    style={{
                      ...successButtonStyle,
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const question = questions[currentIndex];
  const letters = questions.map((q, index) => {
    const angle = (360 / questions.length) * index - 90;
    const radian = (angle * Math.PI) / 180;
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;

    return {
      letter: q.letter.toLocaleUpperCase("tr-TR"),
      x,
      y,
      status:
        questionStatuses[index] && questionStatuses[index] !== "pending"
          ? questionStatuses[index]
          : index === currentIndex
            ? "active"
            : "pending",
    };
  });

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "20px",
            marginBottom: "28px",
            flexWrap: "wrap",
          }}
        >
          <div style={timeLeft <= 30 ? dangerTimerBoxStyle : timerBoxStyle}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `2px solid ${timeLeft <= 30 ? "rgba(254, 202, 202, 0.9)" : "rgba(226, 232, 240, 0.72)"}`,
                color: timeLeft <= 30 ? "#fee2e2" : "#e2e8f0",
                boxSizing: "border-box",
                position: "relative",
                flexShrink: 0,
              }}
            >
              <div
                style={{
                  width: "2px",
                  height: "11px",
                  backgroundColor: timeLeft <= 30 ? "#fee2e2" : "#e2e8f0",
                  position: "absolute",
                  top: "7px",
                  left: "18px",
                  borderRadius: "2px",
                }}
              />
              <div
                style={{
                  width: "9px",
                  height: "2px",
                  backgroundColor: timeLeft <= 30 ? "#fee2e2" : "#e2e8f0",
                  position: "absolute",
                  top: "19px",
                  left: "18px",
                  transform: "rotate(35deg)",
                  transformOrigin: "left center",
                  borderRadius: "2px",
                }}
              />
            </div>

            <div
              style={{
                color: timeLeft <= 30 ? "#fee2e2" : "#f8fafc",
                fontSize: timeLeft <= 30 ? "32px" : "30px",
                fontWeight: "800",
                letterSpacing: "0.6px",
                textShadow: timeLeft <= 30 ? "0 0 18px rgba(248, 113, 113, 0.35)" : "none",
                transition: "all 180ms ease",
                lineHeight: 1,
              }}
            >
              {formatTime(timeLeft)}
            </div>
          </div>

          <div style={{ textAlign: "center", flex: 1 }}>
            <img
              src="/passaquiz.png"
              alt="PassaQuiz Logo"
              style={{ width: "230px", marginBottom: "4px" }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: "10px",
            }}
          >
            <div style={scoreBoxStyle}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                  lineHeight: 1,
                }}
              >
                <div style={{ color: "#93c5fd", fontSize: "14px", marginBottom: "8px", letterSpacing: "0.4px" }}>
                  Puan
                </div>
                <div
                  style={{
                    color: "#60a5fa",
                    fontSize: scorePop ? "36px" : "30px",
                    fontWeight: "800",
                    letterSpacing: "0.6px",
                    transform: scorePop ? "scale(1.12)" : "scale(1)",
                    textShadow: scorePop ? "0 0 20px rgba(96, 165, 250, 0.35)" : "none",
                    transition: "all 180ms ease",
                  }}
                >
                  {score}
                </div>
              </div>
            </div>

            <button onClick={exitGame} style={exitButtonStyle}>
              Oyundan Çık
            </button>
          </div>
        </div>

        <div
          style={{
            position: "relative",
            width: `${circleSize}px`,
            height: `${circleSize}px`,
            margin: "10px auto 40px",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: "190px",
              height: "190px",
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: "radial-gradient(circle at top, rgba(59, 130, 246, 0.24), rgba(15, 23, 42, 0.92))",
              border: "2px solid rgba(96, 165, 250, 0.45)",
              boxShadow: "0 18px 45px rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              padding: "12px",
              boxSizing: "border-box",
            }}
          >
            <div>
              <div style={{ fontSize: "18px", color: "#cbd5e1", marginBottom: "16px" }}>Aktif Harf</div>
              <div style={{ fontSize: "56px", fontWeight: "bold", color: "#f8fafc", textShadow: "0 6px 18px rgba(96, 165, 250, 0.35)" }}>
                {question.letter}
              </div>
            </div>
          </div>

          {letters.map((l, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: `calc(50% + ${l.y}px - 24px)`,
                left: `calc(50% + ${l.x}px - 24px)`,
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "20px",
                fontWeight: "800",
                letterSpacing: "0.3px",
                background:
                  l.status === "active"
                    ? "radial-gradient(circle at 30% 25%, #93c5fd, #3b82f6 48%, #1d4ed8 100%)"
                    : l.status === "correct"
                      ? "radial-gradient(circle at 30% 25%, #86efac, #22c55e 48%, #15803d 100%)"
                      : l.status === "wrong"
                        ? "radial-gradient(circle at 30% 25%, #fca5a5, #ef4444 48%, #b91c1c 100%)"
                        : l.status === "passed"
                          ? "radial-gradient(circle at 30% 25%, #fde68a, #f59e0b 48%, #c2410c 100%)"
                          : "radial-gradient(circle at 30% 25%, #94a3b8, #475569 55%, #1e293b 100%)",
                color: "#f8fafc",
                border: l.status === "active"
                  ? "1px solid rgba(191, 219, 254, 0.95)"
                  : "1px solid rgba(255, 255, 255, 0.14)",
                boxShadow:
                  l.status === "active"
                    ? "0 0 0 3px rgba(96, 165, 250, 0.22), 0 18px 32px rgba(37, 99, 235, 0.34), inset 0 1px 1px rgba(255,255,255,0.35)"
                    : l.status === "correct"
                      ? "0 14px 26px rgba(22, 163, 74, 0.24), inset 0 1px 1px rgba(255,255,255,0.28)"
                      : l.status === "wrong"
                        ? "0 14px 26px rgba(220, 38, 38, 0.24), inset 0 1px 1px rgba(255,255,255,0.24)"
                        : l.status === "passed"
                          ? "0 14px 26px rgba(234, 88, 12, 0.22), inset 0 1px 1px rgba(255,255,255,0.24)"
                          : "0 14px 26px rgba(2, 6, 23, 0.32), inset 0 1px 1px rgba(255,255,255,0.18)",
                transform: l.status === "active" ? "scale(1.08)" : "scale(1)",
                transition: "all 180ms ease",
              }}
            >
              {l.letter}
            </div>
          ))}
        </div>

        {gameFinished ? (
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "520px",
                background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.96))",
                border: "1px solid rgba(96, 165, 250, 0.18)",
                borderRadius: "24px",
                padding: "30px 28px",
                boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  margin: "0 auto 18px",
                  borderRadius: "50%",
                  background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.55), rgba(37, 99, 235, 0.18))",
                  border: "1px solid rgba(147, 197, 253, 0.32)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#f8fafc",
                  fontSize: "30px",
                  fontWeight: "800",
                }}
              >
                ✓
              </div>

              <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "10px", fontSize: "42px" }}>
                Oyun Bitti
              </h2>

              <p
                style={{
                  marginTop: 0,
                  marginBottom: "24px",
                  color: "#93c5fd",
                  fontSize: "16px",
                  letterSpacing: "0.4px",
                }}
              >
                Oyun istatistiklerin aşağıda hazır.
              </p>

              <div
                style={{
                  background: "rgba(15, 23, 42, 0.68)",
                  border: "1px solid rgba(148, 163, 184, 0.12)",
                  borderRadius: "18px",
                  padding: "20px 18px",
                  display: "grid",
                  gap: "12px",
                  marginBottom: "22px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
                  <span style={{ color: "#cbd5e1", fontSize: "18px" }}>Toplam Puan</span>
                  <span style={{ color: "#60a5fa", fontSize: "28px", fontWeight: "800" }}>{score}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
                  <span style={{ color: "#cbd5e1", fontSize: "18px" }}>Oyun Süresi</span>
                  <span style={{ color: "#f8fafc", fontSize: "20px", fontWeight: "700" }}>{formatElapsedTime(elapsedTime)}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
                  <span style={{ color: "#cbd5e1", fontSize: "18px" }}>Doğru Sayısı</span>
                  <span style={{ color: "#4ade80", fontSize: "20px", fontWeight: "700" }}>{correctCount}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
                  <span style={{ color: "#cbd5e1", fontSize: "18px" }}>Yanlış Sayısı</span>
                  <span style={{ color: "#f87171", fontSize: "20px", fontWeight: "700" }}>{wrongCount}</span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "center" }}>
                  <span style={{ color: "#cbd5e1", fontSize: "18px" }}>Pas Sayısı</span>
                  <span style={{ color: "#fbbf24", fontSize: "20px", fontWeight: "700" }}>{passedCount}</span>
                </div>
              </div>

              <button
                onClick={restartGame}
                style={{
                  ...successButtonStyle,
                  marginRight: "0",
                  marginTop: 0,
                  minWidth: "220px",
                  fontSize: "17px",
                  padding: "14px 24px",
                }}
              >
                Yeniden Başla
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.94))",
              borderRadius: "18px",
              padding: "24px",
              textAlign: "center",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#93c5fd" }}>Soru</h2>
            <p style={{ fontSize: "22px", marginBottom: "20px", color: "#e2e8f0", lineHeight: 1.45 }}>{question.questionText}</p>

            <input
              type="text"
              placeholder="Cevabınızı yazın"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  checkAnswer();
                }
              }}
              style={{
                padding: "14px 16px",
                fontSize: "16px",
                width: "100%",
                maxWidth: "360px",
                margin: "0 auto",
                display: "block",
                borderRadius: "14px",
                border: "1px solid rgba(96, 165, 250, 0.4)",
                backgroundColor: "rgba(15, 23, 42, 0.75)",
                color: "#f8fafc",
                boxSizing: "border-box",
                outline: "none",
              }}
            />

            <button onClick={passQuestion} style={secondaryButtonStyle}>
              Pas
            </button>

            <button onClick={checkAnswer} style={primaryButtonStyle}>
              Cevabı Kontrol Et
            </button>

            {resultMessage && (
              <p
                style={{
                  marginTop: "20px",
                  marginBottom: 0,
                  fontSize: "18px",
                  fontWeight: "bold",
                  color:
                    resultMessage === "Doğru cevap"
                      ? "#16a34a"
                      : resultMessage === "Yanlış cevap"
                        ? "#dc2626"
                        : resultMessage === "Lütfen bir cevap yazın"
                          ? "#475569"
                          : "#d97706",
                }}
              >
                {resultMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
