import { useEffect, useMemo, useRef, useState } from "react";

function DuelLobby({ currentUser, onBack, onStartDuel }) {
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const [startCountdown, setStartCountdown] = useState(null);
  const countdownStartedRef = useRef(false);

  const createRoom = async () => {
    if (!currentUser?.id) {
      setError("Düello modu için kullanıcı bilgisi bulunamadı. Lütfen yeniden giriş yapın.");
      return;
    }

    try {
      setError("");
      const response = await fetch("http://localhost:8080/api/duel/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: currentUser.id,
          playerName: currentUser.name || currentUser.email || "Oyuncu",
        }),
      });

      const raw = await response.text();
      let data = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.message || raw || "Oda oluşturulamadı.");
      }

      if (!data) {
        throw new Error("Sunucudan geçerli bir oda bilgisi dönmedi.");
      }

      setRoom(data);
      setRoomCode(data.roomCode);
    } catch (err) {
      setError(err.message || "Oda oluşturulamadı.");
    }
  };

  const joinRoom = async () => {
    if (!currentUser?.id) {
      setError("Düello modu için kullanıcı bilgisi bulunamadı. Lütfen yeniden giriş yapın.");
      return;
    }

    try {
      setError("");
      const response = await fetch("http://localhost:8080/api/duel/rooms/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: currentUser.id,
          playerName: currentUser.name || currentUser.email || "Oyuncu",
          roomCode: joinCode.trim().toUpperCase(),
        }),
      });

      const raw = await response.text();
      let data = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.message || raw || "Odaya katılınamadı.");
      }

      if (!data) {
        throw new Error("Sunucudan geçerli bir oda bilgisi dönmedi.");
      }

      setRoom(data);
      setRoomCode(data.roomCode);
    } catch (err) {
      setError(err.message || "Odaya katılınamadı.");
    }
  };

  const setReady = async (ready) => {
    if (!roomCode || !currentUser?.id) return;

    try {
      setError("");
      const response = await fetch(`http://localhost:8080/api/duel/rooms/${roomCode}/ready`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: currentUser.id,
          ready,
        }),
      });

      const raw = await response.text();
      let data = null;

      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(data?.message || raw || "Hazır durumu güncellenemedi.");
      }

      if (!data) {
        throw new Error("Sunucudan geçerli bir oda bilgisi dönmedi.");
      }

      setRoom(data);
    } catch (err) {
      setError(err.message || "Hazır durumu güncellenemedi.");
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/duel/rooms/${roomCode}`);
        if (!response.ok) return;

        const raw = await response.text();
        if (!raw) return;

        const data = JSON.parse(raw);
        setRoom(data);
      } catch (error) {
        // Sessizce tekrar dene
      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [roomCode]);

  useEffect(() => {
    if (room?.status !== "STARTED") {
      countdownStartedRef.current = false;
      setStartCountdown(null);
      return;
    }

    const sharedStartAt = room?.gameStartAt || room?.startAt || room?.matchStartAt || null;

    if (sharedStartAt) {
      const updateCountdown = () => {
        const targetTime = new Date(sharedStartAt).getTime();
        const now = Date.now();
        const remainingMs = targetTime - now;
        const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));

        setStartCountdown(remainingSeconds);

        if (remainingMs <= 0) {
          if (!countdownStartedRef.current) {
            countdownStartedRef.current = true;
            if (typeof onStartDuel === "function") {
              onStartDuel(room);
            }
          }
          return true;
        }

        return false;
      };

      const finished = updateCountdown();
      if (finished) return;

      const intervalId = setInterval(() => {
        const done = updateCountdown();
        if (done) {
          clearInterval(intervalId);
        }
      }, 200);

      return () => clearInterval(intervalId);
    }

    if (countdownStartedRef.current) return;

    countdownStartedRef.current = true;
    setStartCountdown(10);

    let countdownValue = 10;
    const intervalId = setInterval(() => {
      countdownValue -= 1;

      if (countdownValue <= 0) {
        clearInterval(intervalId);
        setStartCountdown(0);
        if (typeof onStartDuel === "function") {
          onStartDuel(room);
        }
        return;
      }

      setStartCountdown(countdownValue);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [room, onStartDuel]);

  useEffect(() => {
    if (!roomCodeCopied) return;

    const timeoutId = setTimeout(() => {
      setRoomCodeCopied(false);
    }, 20000);

    return () => clearTimeout(timeoutId);
  }, [roomCodeCopied]);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "760px",
        margin: "0 auto",
        textAlign: "center",
      }}
    >

      {!room && (
        <>
          <button
            onClick={createRoom}
            style={{
              padding: "14px 22px",
              fontSize: "16px",
              border: "none",
              borderRadius: "14px",
              cursor: "pointer",
              color: "white",
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              boxShadow: "0 12px 26px rgba(22, 163, 74, 0.24)",
              marginBottom: "22px",
            }}
          >
            Oda Oluştur
          </button>

          <div
            style={{
              maxWidth: "360px",
              margin: "0 auto",
              display: "grid",
              gap: "12px",
            }}
          >
            <input
              type="text"
              placeholder="Oda kodu gir"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              style={{
                padding: "14px 16px",
                fontSize: "16px",
                width: "100%",
                borderRadius: "14px",
                border: "1px solid rgba(96, 165, 250, 0.32)",
                backgroundColor: "rgba(15, 23, 42, 0.78)",
                color: "#f8fafc",
                boxSizing: "border-box",
                outline: "none",
                textTransform: "uppercase",
              }}
            />

            <button
              onClick={joinRoom}
              style={{
                padding: "14px 22px",
                fontSize: "16px",
                border: "none",
                borderRadius: "14px",
                cursor: "pointer",
                color: "white",
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                boxShadow: "0 12px 26px rgba(37, 99, 235, 0.28)",
              }}
            >
              Odaya Katıl
            </button>
          </div>
        </>
      )}

      {error && (
        <p
          style={{
            marginTop: "18px",
            marginBottom: 0,
            color: "#fca5a5",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          {error}
        </p>
      )}

      {room && (
        <div
          style={{
            marginTop: "12px",
            background: "rgba(15, 23, 42, 0.72)",
            border: "1px solid rgba(148, 163, 184, 0.16)",
            borderRadius: "18px",
            padding: "22px",
            textAlign: "left",
          }}
        >
          <div
            style={{
              marginBottom: "16px",
              color: "#f8fafc",
              fontSize: "20px",
              fontWeight: "700",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <span>
              Oda Kodu: <span style={{ color: "#93c5fd", letterSpacing: "1px" }}>{room.roomCode}</span>
            </span>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(room?.roomCode || "");
                  setError("");
                  setRoomCodeCopied(true);
                } catch (err) {
                  setError("Oda kodu kopyalanamadı.");
                }
              }}
              style={{
                padding: "8px 14px",
                borderRadius: "14px",
                border: "1px solid rgba(163, 163, 163, 0.28)",
                cursor: "pointer",
                fontSize: "13px",
                fontWeight: "800",
                color: "#737373",
                background: "linear-gradient(135deg, rgba(245, 245, 245, 0.98), rgba(229, 229, 229, 0.98))",
                boxShadow: "0 10px 20px rgba(163, 163, 163, 0.18)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                whiteSpace: "nowrap",
                transition: "all 0.2s ease",
              }}
              title="Oda kodunu kopyala"
              aria-label="Oda kodunu kopyala"
              type="button"
            >
              {roomCodeCopied ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                  </svg>
                  Kopyalandı
                </>
              ) : (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                  </svg>
                  Kodu Kopyala
                </>
              )}
            </button>
          </div>

          <div style={{ marginBottom: "18px", color: "#cbd5e1", fontSize: "16px" }}>
            Durum: <strong style={{ color: "#f8fafc" }}>{room.status}</strong>
          </div>

          <div style={{ display: "grid", gap: "12px", marginBottom: "20px" }}>
            <div
              style={{
                padding: "14px 16px",
                borderRadius: "14px",
                background: "rgba(30, 41, 59, 0.86)",
                color: "#e2e8f0",
              }}
            >
              Oyuncu 1: {room.player1Name} {room.player1Ready ? "✅" : "⏳"}
            </div>

            <div
              style={{
                padding: "14px 16px",
                borderRadius: "14px",
                background: "rgba(30, 41, 59, 0.86)",
                color: "#e2e8f0",
              }}
            >
              Oyuncu 2: {room.player2Name || "Bekleniyor..."} {room.player2Ready ? "✅" : room.player2Name ? "⏳" : ""}
            </div>
          </div>

          {room.status !== "STARTED" && (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <button
                onClick={() => setReady(true)}
                style={{
                  padding: "12px 18px",
                  border: "none",
                  borderRadius: "14px",
                  cursor: "pointer",
                  color: "white",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  boxShadow: "0 12px 26px rgba(22, 163, 74, 0.24)",
                }}
              >
                Hazırım
              </button>
              <button
                onClick={() => setReady(false)}
                style={{
                  padding: "12px 18px",
                  border: "none",
                  borderRadius: "14px",
                  cursor: "pointer",
                  color: "white",
                  background: "linear-gradient(135deg, #f59e0b, #ea580c)",
                  boxShadow: "0 12px 26px rgba(234, 88, 12, 0.24)",
                }}
              >
                Hazır Değilim
              </button>
            </div>
          )}

          {room.status === "STARTED" && (
            <div
              style={{
                marginTop: "18px",
                padding: "18px 20px",
                borderRadius: "16px",
                background: "rgba(30, 41, 59, 0.82)",
                border: "1px solid rgba(148, 163, 184, 0.16)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  marginBottom: "8px",
                  color: "#4ade80",
                  fontSize: "20px",
                  fontWeight: "800",
                }}
              >
                Oyun {typeof startCountdown === "number" ? startCountdown : 10} saniye sonra başlayacak
              </div>
              <div style={{ color: "#cbd5e1", fontSize: "15px", lineHeight: 1.6 }}>
                Her iki oyuncu da hazır. Geri sayım tamamlanınca düello otomatik başlayacak.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

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
  const [gameMode, setGameMode] = useState("classic");
  const [duelRoomCode, setDuelRoomCode] = useState("");
  const [duelRoomData, setDuelRoomData] = useState(null);
  const [duelWaitingForOpponent, setDuelWaitingForOpponent] = useState(false);
  const [dailyResult, setDailyResult] = useState(null);
  const [dailyCountdownSeconds, setDailyCountdownSeconds] = useState(0);
  const [authUserId, setAuthUserId] = useState(null);
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
  const [authUserName, setAuthUserName] = useState("");
  const [authUserEmail, setAuthUserEmail] = useState("");
  const [authUserImage, setAuthUserImage] = useState("");
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [answerHistory, setAnswerHistory] = useState([]);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [resultTab, setResultTab] = useState("stats");
  const [expandedAnswerIndex, setExpandedAnswerIndex] = useState(null);
  const [hoveredResultTab, setHoveredResultTab] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [activePulse, setActivePulse] = useState(false);
  const previousScoreRef = useRef(0);
  const resultSavedRef = useRef(false);
  const duelResultSavedRef = useRef(false);
  const lastSavedDuelRoomCodeRef = useRef("");
  const activeGameModeRef = useRef("classic");
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [showBadgesModal, setShowBadgesModal] = useState(false);
  const [currentCorrectStreak, setCurrentCorrectStreak] = useState(0);
  const [maxCorrectStreak, setMaxCorrectStreak] = useState(0);
  const [profileStats, setProfileStats] = useState(null);
  const [profileStatsLoading, setProfileStatsLoading] = useState(false);
  const [showDuelHistoryModal, setShowDuelHistoryModal] = useState(false);
  const [duelHistory, setDuelHistory] = useState([]);
  const [duelHistoryLoading, setDuelHistoryLoading] = useState(false);

  const profileFileInputRef = useRef(null);

  const getNormalizedLetter = (item) => (item?.letter || "").toLocaleUpperCase("tr-TR");

  const normalizeAnswer = (value) => {
    return String(value || "")
      .toLocaleLowerCase("tr-TR")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  const splitAcceptedAnswers = (answerText) => {
    return String(answerText || "")
      .split("/")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const formatAcceptedAnswers = (answerText) => {
    return splitAcceptedAnswers(answerText)
      .map((item) => item.charAt(0).toLocaleUpperCase("tr-TR") + item.slice(1))
      .join(", ");
  };

  const getQuestionKey = (item) => {
    const letter = getNormalizedLetter(item);
    if (item?.id !== undefined && item?.id !== null) {
      return `${letter}:${item.id}`;
    }
    return `${letter}:${item?.questionText || ""}`;
  };

  const getQuestionHistoryStorageKey = () => {
    if (!authUserEmail) return "";
    return `questionHistory_${authUserEmail}`;
  };

  const getTodayDateKey = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const getDailyResultStorageKey = () => {
    if (!authUserEmail) return "";
    return `dailyResult_${authUserEmail}_${getTodayDateKey()}`;
  };

  const loadDailyResultFromStorage = () => {
    const storageKey = getDailyResultStorageKey();
    if (!storageKey) return null;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch (error) {
      return null;
    }
  };

  const saveDailyResultToStorage = (result) => {
    const storageKey = getDailyResultStorageKey();
    if (!storageKey || !result) return;
    localStorage.setItem(storageKey, JSON.stringify(result));
    setDailyResult(result);
  };

  const formatDailyCountdown = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  };

  const getRecentQuestionHistory = () => {
    const storageKey = getQuestionHistoryStorageKey();
    if (!storageKey) return [];

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  };

  const saveCurrentGameQuestionHistory = (selectedQuestions) => {
    const storageKey = getQuestionHistoryStorageKey();
    if (!storageKey || !Array.isArray(selectedQuestions) || selectedQuestions.length === 0) return;

    const gameRecord = selectedQuestions.reduce((acc, item) => {
      const letter = getNormalizedLetter(item);
      acc[letter] = getQuestionKey(item);
      return acc;
    }, {});

    const previousHistory = getRecentQuestionHistory();
    const updatedHistory = [gameRecord, ...previousHistory].slice(0, 10);
    localStorage.setItem(storageKey, JSON.stringify(updatedHistory));
  };

  const loadQuestions = async (mode = "classic") => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setIsAuthenticated(false);
      return null;
    }

    setQuestionsLoading(true);

    try {
      const endpoint = mode === "daily"
        ? "http://localhost:8080/api/game/daily-questions"
        : "http://localhost:8080/api/game/questions";

      const response = await fetch(endpoint, {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      if (!response.ok) {
        throw new Error("Sorular alınamadı");
      }

      const data = await response.json();
      const alphabet = [
        "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", "K", "L",
        "M", "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z",
      ];

      const normalized = data.map((item) => ({
        ...item,
        letter: (item.letter || "").toLocaleUpperCase("tr-TR"),
      }));

      let sorted;

      if (mode === "daily") {
        sorted = [...normalized].sort(
          (a, b) => alphabet.indexOf(a.letter) - alphabet.indexOf(b.letter)
        );
      } else {
        const groupedByLetter = normalized.reduce((acc, item) => {
          if (!acc[item.letter]) {
            acc[item.letter] = [];
          }
          acc[item.letter].push(item);
          return acc;
        }, {});

        const recentHistory = getRecentQuestionHistory();
        const recentKeysByLetter = recentHistory.reduce((acc, gameRecord) => {
          Object.entries(gameRecord).forEach(([letter, key]) => {
            if (!acc[letter]) {
              acc[letter] = new Set();
            }
            acc[letter].add(key);
          });
          return acc;
        }, {});

        const uniqueByLetter = Object.entries(groupedByLetter).map(([letter, items]) => {
          const filteredItems = items.filter(
            (item) => !recentKeysByLetter[letter]?.has(getQuestionKey(item))
          );

          const pool = filteredItems.length > 0 ? filteredItems : items;
          return pool[Math.floor(Math.random() * pool.length)];
        });

        sorted = [...uniqueByLetter].sort(
          (a, b) => alphabet.indexOf(a.letter) - alphabet.indexOf(b.letter)
        );
      }

      setQuestions(sorted);
      setQuestionStatuses(sorted.map(() => "pending"));
      return sorted;
    } catch (err) {
      console.error(err);
      sessionStorage.removeItem("token");
      setIsAuthenticated(false);
      setAuthUserId(null);
      setAuthUserName("");
      setAuthUserEmail("");
      setAuthUserImage("");
      setShowProfileMenu(false);
      setQuestions([]);
      setQuestionStatuses([]);
      setAuthMessage("Oturum geçersiz. Lütfen tekrar giriş yapın.");
      return null;
    } finally {
      setQuestionsLoading(false);
    }
  };

  const startDuelGame = (room) => {
    const alphabet = [
      "A", "B", "C", "Ç", "D", "E", "F", "G", "Ğ", "H", "I", "İ", "J", "K", "L",
      "M", "N", "O", "Ö", "P", "R", "S", "Ş", "T", "U", "Ü", "V", "Y", "Z",
    ];

    const duelQuestions = Array.isArray(room?.questions)
      ? [...room.questions]
          .map((item) => ({
            ...item,
            letter: (item.letter || "").toLocaleUpperCase("tr-TR"),
          }))
          .sort((a, b) => alphabet.indexOf(a.letter) - alphabet.indexOf(b.letter))
      : [];

    resultSavedRef.current = false;
    duelResultSavedRef.current = false;
    lastSavedDuelRoomCodeRef.current = "";
    activeGameModeRef.current = "duel";
    setAnswerHistory([]);
    setShowAnswerKey(false);
    setResultTab("stats");
    setExpandedAnswerIndex(null);
    setHoveredResultTab(null);
    setQuestions(duelQuestions);
    setQuestionStatuses(duelQuestions.map(() => "pending"));
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setCurrentIndex(0);
    setUserAnswer("");
    setResultMessage("");
    setScore(0);
    setAnswered(false);
    setGameFinished(false);
    setIsPaused(false);
    // Reset streaks when starting duel game
    setCurrentCorrectStreak(0);
    setMaxCorrectStreak(0);

    resultSavedRef.current = false;
    duelResultSavedRef.current = false;
    setAnswerHistory([]);
    setShowAnswerKey(false);
    setResultTab("stats");
    setExpandedAnswerIndex(null);
    setHoveredResultTab(null);
    setQuestions(duelQuestions);
    setQuestionStatuses(duelQuestions.map(() => "pending"));
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setCurrentIndex(0);
    setUserAnswer("");
    setResultMessage("");
    setScore(0);
    setAnswered(false);
    setGameFinished(false);
    setIsPaused(false);
    setTimeLeft(selectedDuration);
    setShowHowToPlay(false);
    setShowLeaderboard(false);
    setShowProfileMenu(false);
    setDuelRoomCode(room?.roomCode || "");
    setDuelRoomData(room || null);
    setDuelWaitingForOpponent(false);
    setGameStarted(true);
  };

  useEffect(() => {
    if (!isAuthenticated) return;
    loadQuestions();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authUserEmail) {
      setDailyResult(null);
      return;
    }

    setDailyResult(loadDailyResultFromStorage());
  }, [authUserEmail]);

  useEffect(() => {
    if ((gameMode === "daily" && !gameStarted) || gameFinished) {
      setExpandedAnswerIndex(null);
    }
  }, [gameMode, gameStarted, gameFinished]);

  useEffect(() => {
    if (gameMode !== "daily" || gameStarted || !dailyResult) {
      setDailyCountdownSeconds(0);
      return;
    }

    const tick = () => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setHours(24, 0, 0, 0);
      const remaining = Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 1000));

      setDailyCountdownSeconds(remaining);

      if (remaining <= 0) {
        setDailyResult(null);
        const storageKey = getDailyResultStorageKey();
        if (storageKey) {
          localStorage.removeItem(storageKey);
        }
      }
    };

    tick();
    const intervalId = setInterval(tick, 1000);
    return () => clearInterval(intervalId);
  }, [gameMode, gameStarted, dailyResult, authUserEmail]);

  useEffect(() => {
    sessionStorage.removeItem("token");
    setIsAuthenticated(false);
    setAuthUserId(null);
    setAuthUserName("");
    setAuthUserEmail("");
    setAuthUserImage("");
    setShowProfileMenu(false);
  }, []);

  useEffect(() => {
    if (!answered || !gameStarted || gameFinished || isPaused) return;

    const shouldAutoAdvance =
      resultMessage === "Doğru cevap" ||
      resultMessage === "Yanlış cevap" ||
      resultMessage === "Pas geçildi";

    if (!shouldAutoAdvance) return;

    const timeoutId = setTimeout(() => {
      nextQuestion();
    }, 900);

    return () => clearTimeout(timeoutId);
  }, [answered, resultMessage, gameStarted, gameFinished, isPaused]);

  useEffect(() => {
    if (!gameStarted || gameFinished || isPaused || duelWaitingForOpponent) return;

    if (timeLeft <= 0) {
      finishGame();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => prevTime - 1);
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameStarted, gameFinished, timeLeft, isPaused, duelWaitingForOpponent]);

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

  // Pulse effect for active letter
  useEffect(() => {
    if (!gameStarted) return;

    setActivePulse(true);
    const timeout = setTimeout(() => {
      setActivePulse(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [currentIndex]);

  const checkAnswer = () => {
    if (!gameStarted || gameFinished || isPaused || duelWaitingForOpponent) return;

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const rawUserAnswer = String(userAnswer || "").trim();
    const normalizedUserAnswer = normalizeAnswer(rawUserAnswer);
    const acceptedAnswers = splitAcceptedAnswers(currentQuestion.answer).map((item) => normalizeAnswer(item));

    if (!normalizedUserAnswer) {
      setResultMessage("Lütfen bir cevap yazın");
      return;
    }

    const isCorrect = acceptedAnswers.includes(normalizedUserAnswer);

    setAnswerHistory((prev) => {
      const filtered = prev.filter((item) => item.index !== currentIndex);
      return [
        ...filtered,
        {
          index: currentIndex,
          letter: (currentQuestion.letter || "").toLocaleUpperCase("tr-TR"),
          question: currentQuestion.questionText,
          userAnswer: rawUserAnswer,
          correctAnswer: formatAcceptedAnswers(currentQuestion.answer),
          status: isCorrect ? "correct" : "wrong",
        },
      ].sort((a, b) => a.index - b.index);
    });

    setQuestionStatuses((prevStatuses) => {
      const updatedStatuses = [...prevStatuses];
      updatedStatuses[currentIndex] = isCorrect ? "correct" : "wrong";
      return updatedStatuses;
    });

    setPassedQueue((prevQueue) => prevQueue.filter((index) => index !== currentIndex));
    setResultMessage(isCorrect ? "Doğru cevap" : "Yanlış cevap");
    setScore((prevScore) => prevScore + (isCorrect ? 10 : -5));

    if (isCorrect) {
      setCurrentCorrectStreak((prev) => {
        const next = prev + 1;
        setMaxCorrectStreak((maxPrev) => Math.max(maxPrev, next));
        return next;
      });
    } else {
      setCurrentCorrectStreak(0);
    }

    setAnswered(true);
  };

  const passQuestion = () => {
    if (answered || !gameStarted || gameFinished || isPaused || duelWaitingForOpponent) return;

    const currentQuestion = questions[currentIndex];

    setAnswerHistory((prev) => {
      const filtered = prev.filter((item) => item.index !== currentIndex);
      return [
        ...filtered,
        {
          index: currentIndex,
          letter: (currentQuestion.letter || "").toLocaleUpperCase("tr-TR"),
          question: currentQuestion.questionText,
          userAnswer: "Pas",
          correctAnswer: formatAcceptedAnswers(currentQuestion.answer),
          status: "passed",
        },
      ].sort((a, b) => a.index - b.index);
    });

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

  const startGame = async (modeOverride = null) => {
    const effectiveMode = modeOverride || gameMode;

    if (modeOverride) {
      setGameMode(effectiveMode);
    }
    activeGameModeRef.current = effectiveMode;
    if (effectiveMode === "duel") {
      if (duelRoomData?.status === "STARTED") {
        startDuelGame(duelRoomData);
      }
      return;
    }

    if (effectiveMode === "daily" && dailyResult) {
      return;
    }

    resultSavedRef.current = false;
    duelResultSavedRef.current = false;
    setAnswerHistory([]);
    setShowAnswerKey(false);
    setResultTab("stats");
    setExpandedAnswerIndex(null);
    setHoveredResultTab(null);
    setQuestionsLoading(true);

    const loadedQuestions = await loadQuestions(effectiveMode);
    if (!loadedQuestions) return;

    if (effectiveMode !== "daily") {
      saveCurrentGameQuestionHistory(loadedQuestions);
    }

    setCurrentIndex(0);
    setUserAnswer("");
    setResultMessage("");
    setScore(0);
    // Reset streaks when starting game
    setCurrentCorrectStreak(0);
    setMaxCorrectStreak(0);
    setAnswered(false);
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setGameFinished(false);
    setIsPaused(false);
    setTimeLeft(selectedDuration);
    setQuestionStatuses(loadedQuestions.map(() => "pending"));
    setShowHowToPlay(false);
    setShowLeaderboard(false);
    setShowProfileMenu(false);
    setGameStarted(true);
  };

  const restartGame = () => {
    resultSavedRef.current = false;
    duelResultSavedRef.current = false;
    lastSavedDuelRoomCodeRef.current = "";
    activeGameModeRef.current = "classic";
    setAnswerHistory([]);
    setShowAnswerKey(false);
    setResultTab("stats");
    setExpandedAnswerIndex(null);
    setHoveredResultTab(null);
    setCurrentIndex(0);
    setUserAnswer("");
    setResultMessage("");
    setScore(0);
    // Reset streaks when restarting game
    setCurrentCorrectStreak(0);
    setMaxCorrectStreak(0);
    setAnswered(false);
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setGameFinished(false);
    setIsPaused(false);
    setQuestionStatuses([]);
    setTimeLeft(selectedDuration);
    setShowProfileMenu(false);

    if (gameMode === "duel") {
      setDuelWaitingForOpponent(false);
      setDuelRoomData(null);
      setDuelRoomCode("");
      setGameStarted(false);
      setGameMode("classic");
      return;
    }

    setGameStarted(false);

    if (gameMode === "daily") {
      setGameMode("classic");
    }
  };

  const exitGame = async () => {
    resultSavedRef.current = false;
    duelResultSavedRef.current = false;
    lastSavedDuelRoomCodeRef.current = "";
    activeGameModeRef.current = "classic";
    setAnswerHistory([]);
    setShowAnswerKey(false);
    setResultTab("stats");
    setExpandedAnswerIndex(null);
    setHoveredResultTab(null);
    setCurrentIndex(0);
    setUserAnswer("");
    setResultMessage("");
    setScore(0);
    // Reset streaks when exiting game
    setCurrentCorrectStreak(0);
    setMaxCorrectStreak(0);
    setAnswered(false);
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setGameFinished(false);
    setIsPaused(false);
    setQuestionStatuses(questions.map(() => "pending"));
    setTimeLeft(selectedDuration);
    setShowProfileMenu(false);
    if (gameMode === "duel" && gameStarted && !gameFinished) {
      await submitDuelProgress(true);
    }
    setQuestions([]);
    setDuelRoomCode("");
    setDuelRoomData(null);
    setDuelWaitingForOpponent(false);
    setGameStarted(false);
  };

  const resetAuthForm = () => {
    setAuthName("");
    setAuthEmail("");
    setAuthPassword("");
    setAuthMessage("");
    setShowLeaderboard(false);
    setShowProfileMenu(false);
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

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (response.ok) {
        sessionStorage.setItem("token", data.token);
        setShowLeaderboard(false);
        setShowProfileMenu(false);
        setGameMode("classic");
        setAuthUserId(data.id ?? null);
        setAuthUserName(data.name || "");
        setAuthUserEmail(data.email || authEmail);

        const storedImage = localStorage.getItem(`profileImage_${data.email || authEmail}`);
        setAuthUserImage(storedImage || "");

        setIsAuthenticated(true);
        setAuthPassword("");
        setAuthMessage("");
        return;
      }

      setAuthMessage(typeof data === "string" ? data : data.message || "Giriş başarısız.");
    } catch (error) {
      setAuthMessage("Giriş sırasında bir hata oluştu.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("token");

    setIsAuthenticated(false);
    setAuthUserId(null);
    setAuthUserName("");
    setAuthUserEmail("");
    setAuthUserImage("");
    setShowProfileMenu(false);

    setGameStarted(false);
    setGameFinished(false);
    setGameMode("classic");
    activeGameModeRef.current = "classic";

    setSelectedDuration(180);
    setQuestions([]);
    setQuestionStatuses([]);
    setCurrentIndex(0);
    setUserAnswer("");
    setResultMessage("");
    setScore(0);
    setAnswered(false);
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setCorrectCount(0);
    setWrongCount(0);
    setPassedCount(0);
    setElapsedTime(0);
    setTimeLeft(180);
    setAnswerHistory([]);
    setExpandedAnswerIndex(null);
    setResultTab("stats");
    setHoveredResultTab(null);
    setShowAnswerKey(false);
    setIsPaused(false);
    setQuestionsLoading(false);
    setShowLeaderboard(false);
    setShowStatsModal(false);
    setShowDuelHistoryModal(false);
    setShowHowToPlay(false);
    setDailyResult(null);
    setDailyCountdownSeconds(0);
    setDuelRoomCode("");
    setJoinedRoomCode("");
    setCreatedRoom(null);
    setDuelRoomData(null);
    setDuelWaitingForOpponent(false);
    setStartCountdown(null);
    resultSavedRef.current = false;
    duelResultSavedRef.current = false;
    lastSavedDuelRoomCodeRef.current = "";
    previousScoreRef.current = 0;

    resetAuthForm();
  };

  const handleProfileImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file || !authUserEmail) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const imageData = typeof reader.result === "string" ? reader.result : "";
      setAuthUserImage(imageData);
      localStorage.setItem(`profileImage_${authUserEmail}`, imageData);
    };
    reader.readAsDataURL(file);
  };

  const saveGameResult = async ({ modeOverride = null, wonOverride = undefined } = {}) => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    const resolvedGameMode = modeOverride || activeGameModeRef.current || (gameMode === "daily" ? "daily" : "classic");
    const resolvedWon = wonOverride !== undefined
      ? wonOverride
      : resolvedGameMode === "daily"
        ? true
        : null;

    // Robust perfect game logic
    const currentCorrectCount = questionStatuses.filter((status) => status === "correct").length;
    const currentWrongCount = questionStatuses.filter((status) => status === "wrong").length;
    const currentPassedCount = questionStatuses.filter((status) => status === "passed").length;
    const isPerfectGame =
      questions.length > 0 &&
      currentCorrectCount === questions.length &&
      currentWrongCount === 0 &&
      currentPassedCount === 0;

    try {
      const response = await fetch("http://localhost:8080/api/game/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          score: score,
          correctCount: currentCorrectCount,
          wrongCount: currentWrongCount,
          passedCount: currentPassedCount,
          durationSeconds: elapsedTime,
          maxCorrectStreak: maxCorrectStreak,
          gameMode: resolvedGameMode,
          won: resolvedWon,
          perfectGame: isPerfectGame,
        }),
      });

      if (!response.ok) {
        throw new Error("Oyun sonucu kaydedilemedi");
      }
    } catch (error) {
      console.error("Oyun sonucu kaydedilemedi:", error);
    }
  };

  const saveDuelGameResult = async (roomDataOverride = null) => {
    const token = sessionStorage.getItem("token");
    const roomData = roomDataOverride || duelRoomData;
    const currentRoomCode = roomData?.roomCode || duelRoomCode || "";

    if (!token || !roomData || !authUserId || !currentRoomCode) return;
    if (duelResultSavedRef.current) return;
    if (lastSavedDuelRoomCodeRef.current === currentRoomCode) return;

    const isPlayer1 = String(roomData?.player1Id) === String(authUserId);

    const myScore = Number(
      isPlayer1 ? roomData?.player1Score ?? score : roomData?.player2Score ?? score
    );
    const opponentScore = Number(
      isPlayer1 ? roomData?.player2Score ?? 0 : roomData?.player1Score ?? 0
    );

    const myElapsedTime = Number(
      isPlayer1
        ? roomData?.player1ElapsedTime ?? elapsedTime
        : roomData?.player2ElapsedTime ?? elapsedTime
    );
    const opponentElapsedTime = Number(
      isPlayer1
        ? roomData?.player2ElapsedTime ?? Number.MAX_SAFE_INTEGER
        : roomData?.player1ElapsedTime ?? Number.MAX_SAFE_INTEGER
    );

    const myCorrectCount = Number(
      isPlayer1
        ? roomData?.player1CorrectCount ?? correctCount
        : roomData?.player2CorrectCount ?? correctCount
    );
    const myWrongCount = Number(
      isPlayer1
        ? roomData?.player1WrongCount ?? wrongCount
        : roomData?.player2WrongCount ?? wrongCount
    );
    const myPassedCount = Number(
      isPlayer1
        ? roomData?.player1PassedCount ?? passedCount
        : roomData?.player2PassedCount ?? passedCount
    );

    const didWin =
      myScore > opponentScore ||
      (myScore === opponentScore && myElapsedTime < opponentElapsedTime);

    duelResultSavedRef.current = true;
    lastSavedDuelRoomCodeRef.current = currentRoomCode;

    try {
      const response = await fetch("http://localhost:8080/api/game/duel-result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          score: myScore,
          correctCount: myCorrectCount,
          wrongCount: myWrongCount,
          passedCount: myPassedCount,
          durationSeconds: myElapsedTime,
          maxCorrectStreak: maxCorrectStreak,
          perfectGame:
            questions.length > 0 &&
            myCorrectCount === questions.length &&
            myWrongCount === 0 &&
            myPassedCount === 0,
          gameMode: "duel",
          opponentName: isPlayer1
            ? (roomData?.player2Name || roomData?.player2?.name || "Rakip")
            : (roomData?.player1Name || roomData?.player1?.name || "Rakip"),
          opponentScore: opponentScore,
          durationDifferenceSeconds: Math.abs(myElapsedTime - opponentElapsedTime),
          winnerName: didWin
            ? (authUserName || authUserEmail || "Sen")
            : (isPlayer1
                ? (roomData?.player2Name || roomData?.player2?.name || "Rakip")
                : (roomData?.player1Name || roomData?.player1?.name || "Rakip")),
          duelRoomCode: currentRoomCode,
          won: didWin,
        }),
      });

      if (!response.ok) {
        throw new Error("Düello sonucu kaydedilemedi");
      }
    } catch (error) {
      duelResultSavedRef.current = false;
      lastSavedDuelRoomCodeRef.current = "";
      console.error("Düello sonucu kaydedilemedi:", error);
    }
  };

  const finishGame = async () => {
    if (resultSavedRef.current) return;
    resultSavedRef.current = true;

    const currentSessionMode = activeGameModeRef.current || gameMode;

    if (currentSessionMode === "duel") {
      const data = await submitDuelProgress(false);

      if (data?.player1Finished && data?.player2Finished) {
        setDuelRoomData(data);
        setDuelWaitingForOpponent(false);
        setGameFinished(true);
        saveDuelGameResult(data);
      } else {
        setDuelWaitingForOpponent(true);
      }

      return;
    }

    setGameFinished(true);

    if (currentSessionMode === "daily") {
      saveDailyResultToStorage({
        score,
        correctCount,
        wrongCount,
        passedCount,
        elapsedTime,
        answerHistory,
        completedAt: new Date().toISOString(),
      });

      saveGameResult({ modeOverride: "daily", wonOverride: true });
      return;
    }

    saveGameResult({ modeOverride: "classic", wonOverride: null });
  };

  const togglePause = () => {
    if (!gameStarted || gameFinished) return;
    setShowProfileMenu(false);
    setIsPaused((prev) => !prev);
  };

  const submitDuelProgress = async (abandoned = false) => {
    if (!duelRoomCode || !currentUser?.id) return null;

    const elapsed = selectedDuration - timeLeft;

    try {
      const response = await fetch(`http://localhost:8080/api/duel/rooms/${duelRoomCode}/finish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerId: currentUser.id,
          score,
          elapsedTime: elapsed,
          correctCount,
          wrongCount,
          passedCount,
          abandoned,
        }),
      });

      const raw = await response.text();
      if (!raw) return null;

      const data = JSON.parse(raw);
      setDuelRoomData(data);
      return data;
    } catch (error) {
      console.error("Düello ilerlemesi gönderilemedi:", error);
      return null;
    }
  };

  const fetchLeaderboard = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch("http://localhost:8080/api/game/leaderboard", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const data = await response.json();

      const sortedLeaderboard = Array.isArray(data)
        ? [...data].sort((a, b) => {
            const scoreA = Number(a?.score ?? 0);
            const scoreB = Number(b?.score ?? 0);

            if (scoreB !== scoreA) {
              return scoreB - scoreA;
            }

            const timeA = Number(a?.durationSeconds ?? a?.elapsedTime ?? Number.MAX_SAFE_INTEGER);
            const timeB = Number(b?.durationSeconds ?? b?.elapsedTime ?? Number.MAX_SAFE_INTEGER);

            return timeA - timeB;
          })
        : [];

      setLeaderboard(sortedLeaderboard);
    } catch (error) {
      console.error("Leaderboard alınamadı:", error);
    }
  };

  const fetchProfileStats = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    setProfileStatsLoading(true);

    try {
      const response = await fetch("http://localhost:8080/api/profile/stats", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      const data = response.ok
        ? await response.json()
        : {
            totalGames: 0,
            highestScore: 0,
            averageScore: 0,
            dailyWins: 0,
            duelWins: 0,
            duelLosses: 0,
          };

      setProfileStats(data);
    } catch (error) {
      console.error("Profil istatistikleri alınamadı:", error);
      setProfileStats({
        totalGames: 0,
        highestScore: 0,
        averageScore: 0,
        dailyWins: 0,
        duelWins: 0,
        duelLosses: 0,
      });
    } finally {
      setProfileStatsLoading(false);
    }
  };

  const fetchDuelHistory = async () => {
    const token = sessionStorage.getItem("token");
    if (!token) return;

    setDuelHistoryLoading(true);
    try {
      const response = await fetch("http://localhost:8080/api/game/duel-history", {
        headers: {
          Authorization: "Bearer " + token,
        },
      });

      if (!response.ok) {
        throw new Error("Düello geçmişi alınamadı");
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => {
          const dateA = new Date(a.playedAt || 0).getTime();
          const dateB = new Date(b.playedAt || 0).getTime();
          return dateB - dateA; // newest first
        });
        setDuelHistory(sorted);
      } else {
        setDuelHistory([]);
      }
    } catch (error) {
      console.error("Düello geçmişi alınamadı:", error);
      setDuelHistory([]);
    } finally {
      setDuelHistoryLoading(false);
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
    minWidth: "120px",
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
    padding: "8px 14px",
    fontSize: "13px",
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

  useEffect(() => {
    if (!gameStarted || gameFinished) return;
    setAnswered(false);
    setResultMessage("");
    setUserAnswer("");
  }, [currentIndex, gameStarted, gameFinished]);

  const completeAnswerKey = useMemo(() => {
    const sourceHistory =
      gameMode === "daily" && !gameStarted && Array.isArray(dailyResult?.answerHistory)
        ? dailyResult.answerHistory
        : answerHistory;

    return questions.map((questionItem, index) => {
      const existingEntry = sourceHistory.find((entry) => {
        const entryLetter = (entry.letter || "").toLocaleUpperCase("tr-TR");
        const questionLetter = (questionItem.letter || "").toLocaleUpperCase("tr-TR");
        return entryLetter === questionLetter;
      });

      if (existingEntry) {
        return {
          ...existingEntry,
          status: existingEntry.status || questionStatuses[index] || "unanswered",
        };
      }

      return {
        letter: questionItem.letter,
        question: questionItem.questionText,
        userAnswer: "-",
        correctAnswer: formatAcceptedAnswers(questionItem.answer),
        isCorrect: false,
        status: questionStatuses[index] || "unanswered",
      };
    });
  }, [questions, answerHistory, questionStatuses, gameMode, gameStarted, dailyResult]);

  const currentUser = {
    id: authUserId,
    name: authUserName,
    email: authUserEmail,
  };

  const isDuelPlayer1 = duelRoomData?.player1Id === currentUser?.id;

  const duelOpponentName = isDuelPlayer1
    ? duelRoomData?.player2Name || "Rakip"
    : duelRoomData?.player1Name || "Rakip";

  const duelOpponentScore = isDuelPlayer1
    ? duelRoomData?.player2Score
    : duelRoomData?.player1Score;

  const duelMyRecordedScore = isDuelPlayer1
    ? duelRoomData?.player1Score
    : duelRoomData?.player2Score;

  const duelOpponentElapsedTime = isDuelPlayer1
    ? duelRoomData?.player2ElapsedTime
    : duelRoomData?.player1ElapsedTime;

  const duelOpponentCorrectCount = isDuelPlayer1
    ? duelRoomData?.player2CorrectCount
    : duelRoomData?.player1CorrectCount;

  const duelOpponentWrongCount = isDuelPlayer1
    ? duelRoomData?.player2WrongCount
    : duelRoomData?.player1WrongCount;

  const duelOpponentPassedCount = isDuelPlayer1
    ? duelRoomData?.player2PassedCount
    : duelRoomData?.player1PassedCount;

  const duelWinnerInfo = (() => {
    if (gameMode !== "duel" || !duelRoomData) {
      return {
        winnerName: "",
        message: "",
      };
    }

    const player1Score = Number(duelRoomData?.player1Score ?? 0);
    const player2Score = Number(duelRoomData?.player2Score ?? 0);

    const player1ElapsedTime = Number(
      duelRoomData?.player1ElapsedTime ?? Number.MAX_SAFE_INTEGER
    );
    const player2ElapsedTime = Number(
      duelRoomData?.player2ElapsedTime ?? Number.MAX_SAFE_INTEGER
    );

    const player1Name = duelRoomData?.player1Name || "Oyuncu 1";
    const player2Name = duelRoomData?.player2Name || "Oyuncu 2";

    if (player1Score === player2Score) {
      if (player1ElapsedTime === player2ElapsedTime) {
        return {
          winnerName: "Berabere",
          message: "Puan ve süreler eşit. Maç berabere bitti",
        };
      }

      const winnerName =
        player1ElapsedTime < player2ElapsedTime ? player1Name : player2Name;

      return {
        winnerName,
        message: `Puanlar berabere, Süre farkıyla kazanan ${winnerName}`,
      };
    }

    const winnerName = player1Score > player2Score ? player1Name : player2Name;

    return {
      winnerName,
      message: winnerName,
    };
  })();

  const duelWinnerName = duelWinnerInfo.winnerName;
  const duelWinnerMessage = duelWinnerInfo.message;

  useEffect(() => {
    if (gameMode !== "duel" || !duelRoomCode) return;

    const intervalId = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/duel/rooms/${duelRoomCode}`);
        if (!response.ok) return;

        const raw = await response.text();
        if (!raw) return;

        const data = JSON.parse(raw);
        setDuelRoomData(data);

        if (data?.player1Finished && data?.player2Finished) {
          setDuelWaitingForOpponent(false);
          setGameFinished(true);
          saveDuelGameResult(data);
        }
      } catch (error) {

      }
    }, 1500);

    return () => clearInterval(intervalId);
  }, [gameMode, duelRoomCode]);

  useEffect(() => {
    if (gameMode !== "duel") return;
    if (!gameFinished) return;
    if (!duelRoomData?.player1Finished || !duelRoomData?.player2Finished) return;

    saveDuelGameResult(duelRoomData);
  }, [gameMode, gameFinished, duelRoomData]);


  useEffect(() => {
    if (gameMode !== "duel" || !duelWaitingForOpponent || gameFinished) return;

    if (timeLeft <= 0) {
      setDuelWaitingForOpponent(false);
      setGameFinished(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      setDuelWaitingForOpponent(false);
      setGameFinished(true);
    }, timeLeft * 1000);

    return () => clearTimeout(timeoutId);
  }, [gameMode, duelWaitingForOpponent, gameFinished, timeLeft]);


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
            onClick={handleLogout}
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

  if (!gameStarted && gameMode === "daily") {
    return (
      <div style={pageStyle}>
        <div
          style={{
            ...cardStyle,
            maxWidth: "860px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: "16px",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
              <button
                onClick={() => setGameMode("classic")}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(15, 23, 42, 0.75)",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 22px rgba(2, 6, 23, 0.22)",
                }}
                aria-label="Geri"
                title="Geri"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>


            </div>

            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <img src="/passaquiz.png" alt="PassaQuiz Logo" style={{ width: "280px" }} />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "flex-start",
                gap: "10px",
                position: "relative",
              }}
            >
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  style={{
                    width: "46px",
                    height: "46px",
                    padding: "0",
                    borderRadius: "50%",
                    border: "2px solid rgba(191, 219, 254, 0.72)",
                    background: "rgba(15, 23, 42, 0.68)",
                    boxShadow: "0 12px 26px rgba(2, 6, 23, 0.22)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                  aria-label="Profilim"
                  title="Profilim"
                >
                  {authUserImage ? (
                    <img
                      src={authUserImage}
                      alt="Profil"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.85), rgba(37, 99, 235, 0.95))",
                        color: "#f8fafc",
                        fontSize: "32px",
                        fontWeight: "800",
                      }}
                    >
                      {(authUserName || authUserEmail || "?").trim().charAt(0).toLocaleUpperCase("tr-TR")}
                    </div>
                  )}
                </button>

                {showProfileMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      minWidth: "240px",
                      background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      borderRadius: "18px",
                      boxShadow: "0 20px 44px rgba(2, 6, 23, 0.34)",
                      padding: "14px",
                      zIndex: 50,
                    }}
                  >
                    <button
                      onClick={() => setShowProfileMenu(false)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: "1px solid rgba(148, 163, 184, 0.25)",
                        background: "rgba(15, 23, 42, 0.9)",
                        color: "#cbd5e1",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                    <div style={{ padding: "20px 2px 12px", borderBottom: "1px solid rgba(148, 163, 184, 0.12)", marginBottom: "12px" }}>
                      <div style={{ color: "#f8fafc", fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>
                        {authUserName || "Kullanıcı"}
                      </div>
                      <div style={{ color: "#93c5fd", fontSize: "13px" }}>{authUserEmail}</div>
                    </div>

                    <input
                      ref={profileFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      style={{ display: "none" }}
                    />

                    <button
                      onClick={() => profileFileInputRef.current?.click()}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                      }}
                    >
                      Profil Fotoğrafı Yükle
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowBadgesModal(true);
                        fetchProfileStats();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                        boxShadow: "0 10px 24px rgba(124, 58, 237, 0.30)",
                      }}
                    >
                      Rozetlerim
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowStatsModal(true);
                        fetchProfileStats();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #0f766e, #134e4a)",
                        boxShadow: "0 10px 24px rgba(15, 118, 110, 0.30)",
                      }}
                    >
                      İstatistiklerim
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowDuelHistoryModal(true);
                        fetchDuelHistory();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #334155, #1e293b)",
                        boxShadow: "0 10px 24px rgba(30, 41, 59, 0.30)",
                      }}
                    >
                      Düello Maç Geçmişi
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{
                        ...exitButtonStyle,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                      }}
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>

              <div />
            </div>
          </div>


          {dailyResult && (
            <>
              <div
                style={{
                  marginBottom: "18px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    color: "#4ade80",
                    fontSize: "22px",
                    fontWeight: "800",
                    marginBottom: "10px",
                  }}
                >
                  Günlük oyunu tamamladınız.
                </div>

                <div
                  style={{
                    color: "#cbd5e1",
                    fontSize: "17px",
                    lineHeight: 1.7,
                  }}
                >
                  Yarınki günlük oyun için: <strong style={{ color: "#93c5fd" }}>{formatDailyCountdown(dailyCountdownSeconds)}</strong>
                </div>
              </div>

              <div
                style={{
                  marginBottom: "24px",
                  padding: "26px 24px 20px",
                  borderRadius: "24px",
                  background: "rgba(15, 23, 42, 0.72)",
                  border: "1px solid rgba(148, 163, 184, 0.16)",
                  textAlign: "left",
                }}
              >
                <h2
                  style={{
                    color: "#f8fafc",
                    marginTop: 0,
                    marginBottom: "18px",
                    textAlign: "center",
                    fontSize: "34px",
                    fontWeight: "800",
                  }}
                >
                  Oyun Sonu İstatistiği
                </h2>

                <div
                  style={{
                    display: "flex",
                    width: "100%",
                    borderBottom: "1px solid rgba(228, 228, 231, 0.75)",
                    marginBottom: "18px",
                  }}
                >
                  <button
                    onClick={() => setResultTab("stats")}
                    onMouseDown={(e) => e.currentTarget.blur()}
                    onMouseEnter={() => setHoveredResultTab("stats")}
                    onMouseLeave={() => setHoveredResultTab(null)}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "14px 16px 10px",
                      color: resultTab === "stats" ? "#f8fafc" : "#64748b",
                      fontSize: "20px",
                      fontWeight: "800",
                      position: "relative",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      outline: "none",
                      boxShadow: "none",
                    }}
                  >
                    Skor Dağılımı
                    {(resultTab === "stats" || hoveredResultTab === "stats") && (
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: "-1px",
                          transform: "translateX(-50%)",
                          width: "120px",
                          height: "6px",
                          borderRadius: "999px",
                          background: "#f28b82",
                        }}
                      />
                    )}
                  </button>

                  <button
                    onClick={() => setResultTab("answers")}
                    onMouseDown={(e) => e.currentTarget.blur()}
                    onMouseEnter={() => setHoveredResultTab("answers")}
                    onMouseLeave={() => setHoveredResultTab(null)}
                    style={{
                      flex: 1,
                      textAlign: "center",
                      padding: "14px 16px 10px",
                      color: resultTab === "answers" ? "#f8fafc" : "#64748b",
                      fontSize: "20px",
                      fontWeight: "800",
                      position: "relative",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      outline: "none",
                      boxShadow: "none",
                    }}
                  >
                    Cevap Anahtarı
                    {(resultTab === "answers" || hoveredResultTab === "answers") && (
                      <div
                        style={{
                          position: "absolute",
                          left: "50%",
                          bottom: "-1px",
                          transform: "translateX(-50%)",
                          width: "120px",
                          height: "6px",
                          borderRadius: "999px",
                          background: "#f28b82",
                        }}
                      />
                    )}
                  </button>
                </div>

                {resultTab === "stats" ? (
                  <div style={{ display: "grid", gap: "0" }}>
                    {[
                      { label: "Toplam puan", value: dailyResult.score, color: "#2563eb" },
                      { label: "Oyun süresi", value: formatElapsedTime(dailyResult.elapsedTime || 0), color: "#52525b" },
                      { label: "Doğru sayısı", value: dailyResult.correctCount, color: "#16a34a" },
                      { label: "Yanlış sayısı", value: dailyResult.wrongCount, color: "#dc2626" },
                      { label: "Pas sayısı", value: dailyResult.passedCount, color: "#d97706" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "22px 8px",
                          borderBottom: "1px solid rgba(51, 65, 85, 0.55)",
                        }}
                      >
                        <div
                          style={{
                            color: "#cbd5e1",
                            fontSize: "22px",
                            fontWeight: "700",
                          }}
                        >
                          {item.label}
                        </div>
                        <div
                          style={{
                            color: item.color,
                            fontSize: "24px",
                            fontWeight: "800",
                          }}
                        >
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "left", marginTop: "6px" }}>
                    {completeAnswerKey.length === 0 ? (
                      <div style={{ padding: "24px 0", color: "#71717a", fontSize: "18px", textAlign: "center" }}>
                        Henüz cevap kaydı bulunmuyor.
                      </div>
                    ) : (
                      completeAnswerKey.map((item, index) => {
                        const isOpen = expandedAnswerIndex === index;

                        const icon =
                          item.status === "correct"
                            ? "✓"
                            : item.status === "wrong"
                              ? "✕"
                              : item.status === "passed"
                                ? "•"
                                : "-";

                        const iconColor =
                          item.status === "correct"
                            ? "#fbbf24"
                            : item.status === "wrong"
                              ? "#475569"
                              : item.status === "passed"
                                ? "#f59e0b"
                                : "#94a3b8";

                        return (
                          <div
                            key={`${(item.letter || "").toLocaleUpperCase("tr-TR")}-${index}`}
                            style={{
                              borderBottom: "1px solid #e4e4e7",
                              padding: "0",
                            }}
                          >
                            <button
                              onClick={() => setExpandedAnswerIndex(isOpen ? null : index)}
                              style={{
                                width: "100%",
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "16px",
                                padding: "22px 0",
                                textAlign: "left",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                                <span
                                  style={{
                                    width: "32px",
                                    textAlign: "center",
                                    color: iconColor,
                                    fontSize: "24px",
                                    fontWeight: "800",
                                    flexShrink: 0,
                                  }}
                                >
                                  {icon}
                                </span>
                                <span
                                  style={{
                                    color: item.status === "correct" ? "#f8fafc" : "#cbd5e1",
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {item.correctAnswer}
                                </span>
                              </div>

                              <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                                <span
                                  style={{
                                    color: item.status === "correct" ? "#f8fafc" : "#94a3b8",
                                    fontSize: "18px",
                                    fontWeight: "700",
                                  }}
                                >
                                  {item.letter}
                                </span>
                                <span
                                  style={{
                                    color: "#94a3b8",
                                    fontSize: "20px",
                                    transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                    transition: "transform 180ms ease",
                                  }}
                                >
                                  ⌄
                                </span>
                              </div>
                            </button>

                            {isOpen && (
                              <div
                                style={{
                                  padding: "0 0 20px 48px",
                                  color: "#cbd5e1",
                                  fontSize: "16px",
                                  lineHeight: 1.7,
                                }}
                              >
                                <div style={{ marginBottom: "8px" }}>
                                  <strong>Soru:</strong> {item.question}
                                </div>
                                <div style={{ marginBottom: "8px" }}>
                                  <strong>Senin cevabın:</strong> {item.userAnswer || "-"}
                                </div>
                                <div>
                                  <strong>Doğru cevap:</strong> {item.correctAnswer}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    );
  }

  if (!gameStarted && gameMode === "duel") {
    return (
      <div style={pageStyle}>
        <div
          style={{
            ...cardStyle,
            maxWidth: "860px",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: "16px",
              marginBottom: "18px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
              <button
                onClick={() => setGameMode("classic")}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(15, 23, 42, 0.75)",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 22px rgba(2, 6, 23, 0.22)",
                }}
                aria-label="Geri"
                title="Geri"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <button
                onClick={() => setShowHowToPlay(true)}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(15, 23, 42, 0.75)",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 22px rgba(2, 6, 23, 0.22)",
                  marginTop: "10px"
                }}
                aria-label="Nasıl Oynanır"
                title="Nasıl Oynanır"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10
                  10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8
                  8 3.59 8 8-3.59 8-8 8z"/>
                </svg>
              </button>
              <button
                onClick={() => {
                  if (showLeaderboard) {
                    setShowLeaderboard(false);
                  } else {
                    fetchLeaderboard();
                    setShowLeaderboard(true);
                  }
                }}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(15, 23, 42, 0.75)",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 22px rgba(2, 6, 23, 0.22)",
                }}
                aria-label="Leaderboard"
                title="Leaderboard"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 20V10h3v10H7zm7 0V4h3v16h-3zM2 20v-6h3v6H2z" />
                </svg>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src="/passaquiz.png"
                alt="PassaQuiz Logo"
                style={{ width: "280px" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "flex-start",
                gap: "10px",
                position: "relative",
              }}
            >
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  style={{
                    width: "46px",
                    height: "46px",
                    padding: "0",
                    borderRadius: "50%",
                    border: "2px solid rgba(191, 219, 254, 0.72)",
                    background: "rgba(15, 23, 42, 0.68)",
                    boxShadow: "0 12px 26px rgba(2, 6, 23, 0.22)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                  aria-label="Profilim"
                  title="Profilim"
                >
                  {authUserImage ? (
                    <img
                      src={authUserImage}
                      alt="Profil"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.85), rgba(37, 99, 235, 0.95))",
                        color: "#f8fafc",
                        fontSize: "32px",
                        fontWeight: "800",
                      }}
                    >
                      {(authUserName || authUserEmail || "?").trim().charAt(0).toLocaleUpperCase("tr-TR")}
                    </div>
                  )}
                </button>

                {showProfileMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      minWidth: "240px",
                      background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      borderRadius: "18px",
                      boxShadow: "0 20px 44px rgba(2, 6, 23, 0.34)",
                      padding: "14px",
                      zIndex: 50,
                    }}
                  >
                    <button
                      onClick={() => setShowProfileMenu(false)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: "1px solid rgba(148, 163, 184, 0.25)",
                        background: "rgba(15, 23, 42, 0.9)",
                        color: "#cbd5e1",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                    <div style={{ padding: "20px 2px 12px", borderBottom: "1px solid rgba(148, 163, 184, 0.12)", marginBottom: "12px" }}>
                      <div style={{ color: "#f8fafc", fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>
                        {authUserName || "Kullanıcı"}
                      </div>
                      <div style={{ color: "#93c5fd", fontSize: "13px" }}>
                        {authUserEmail}
                      </div>
                    </div>

                    <input
                      ref={profileFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      style={{ display: "none" }}
                    />

                    <button
                      onClick={() => profileFileInputRef.current?.click()}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                      }}
                    >
                      Profil Fotoğrafı Yükle
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowBadgesModal(true);
                        fetchProfileStats();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                        boxShadow: "0 10px 24px rgba(124, 58, 237, 0.30)",
                      }}
                    >
                      Rozetlerim
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowStatsModal(true);
                        fetchProfileStats();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #0f766e, #134e4a)",
                        boxShadow: "0 10px 24px rgba(15, 118, 110, 0.30)",
                      }}
                    >
                      İstatistiklerim
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowDuelHistoryModal(true);
                        fetchDuelHistory();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #334155, #1e293b)",
                        boxShadow: "0 10px 24px rgba(30, 41, 59, 0.30)",
                      }}
                    >
                      Düello Maç Geçmişi
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{
                        ...exitButtonStyle,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                      }}
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>

              <div />
            </div>
          </div>

          <h2 style={{ color: "#f8fafc", marginBottom: "10px" }}>Düello Modu</h2>
          <p style={{ color: "#cbd5e1", marginTop: 0, marginBottom: "28px", fontSize: "18px" }}>
            Oda oluştur, kod paylaş ya da bir oda koduyla rakibine katıl.
          </p>

          {showLeaderboard && (
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
                  maxHeight: "80vh",
                  overflowY: "auto",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                  Leaderboard
                </h2>

                {leaderboard.length === 0 ? (
                  <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                    Henüz skor bulunmuyor.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "10px", marginBottom: "24px" }}>
                    {leaderboard.map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 16px",
                          borderRadius: "16px",
                          background: "rgba(15, 23, 42, 0.68)",
                          border: "1px solid rgba(148, 163, 184, 0.12)",
                          color: "#e2e8f0",
                        }}
                      >
                        <span style={{ fontSize: "16px", fontWeight: "600" }}>
                          {index + 1}. {item.userName || item.userEmail}
                        </span>
                        <span style={{ color: "#60a5fa", fontWeight: "800", fontSize: "18px" }}>
                          {item.score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}
          {showStatsModal && (
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
                  maxHeight: "80vh",
                  overflowY: "auto",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                  İstatistiklerim
                </h2>

                {profileStatsLoading ? (
                  <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                    İstatistikler yükleniyor...
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                    {[
                      { label: "Toplam oynanan oyun", value: profileStats?.totalGames ?? 0, color: "#60a5fa" },
                      { label: "En yüksek skor", value: profileStats?.highestScore ?? 0, color: "#22c55e" },
                      { label: "Ortalama skor", value: profileStats?.averageScore ?? 0, color: "#f59e0b" },
                      { label: "Günlük oyun galibiyet sayısı", value: profileStats?.dailyWins ?? 0, color: "#a78bfa" },
                      { label: "Düello galibiyet / mağlubiyet", value: `${profileStats?.duelWins ?? 0} / ${profileStats?.duelLosses ?? 0}`, color: "#f87171" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "16px 18px",
                          borderRadius: "16px",
                          background: "rgba(15, 23, 42, 0.68)",
                          border: "1px solid rgba(148, 163, 184, 0.12)",
                        }}
                      >
                        <span style={{ color: "#e2e8f0", fontSize: "16px", fontWeight: "600" }}>
                          {item.label}
                        </span>
                        <span style={{ color: item.color, fontSize: "20px", fontWeight: "800" }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowStatsModal(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}
          {showDuelHistoryModal && (
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
                  maxWidth: "760px",
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                  border: "1px solid rgba(96, 165, 250, 0.18)",
                  borderRadius: "24px",
                  padding: "30px 28px",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                  Düello Maç Geçmişi
                </h2>

                {duelHistoryLoading ? (
                  <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                    Maç geçmişi yükleniyor...
                  </p>
                ) : duelHistory.length === 0 ? (
                  <p style={{ color: "#cbd5e1", margin: "0 0 24px 0", textAlign: "center", fontSize: "17px" }}>
                    Henüz düello geçmişi bulunmuyor.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                    {duelHistory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "18px 20px",
                          borderRadius: "18px",
                          background: "rgba(15, 23, 42, 0.68)",
                          border: "1px solid rgba(148, 163, 184, 0.12)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginBottom: "10px",
                          }}
                        >
                          <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "800" }}>
                            Rakip: <span style={{ color: "#93c5fd" }}>{item.opponentName || "Rakip"}</span>
                          </div>
                          <div
                            style={{
                              color: item.won ? "#22c55e" : "#f87171",
                              fontSize: "15px",
                              fontWeight: "800",
                            }}
                          >
                            {item.won ? "Galibiyet" : "Mağlubiyet"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Skor:</strong> {item.score ?? 0} - {item.opponentScore ?? 0}
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Kazanan:</strong> {item.winnerName || "-"}
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Süre farkı:</strong> {item.durationDifferenceSeconds ?? 0} sn
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Tarih:</strong> {item.playedAt ? new Date(item.playedAt).toLocaleString("tr-TR") : "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowDuelHistoryModal(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}
          {showBadgesModal && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(2, 6, 23, 0.72)",
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "center",
                padding: "24px",
                paddingTop: "80px",
                zIndex: 9999,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: "760px",
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                  border: "1px solid rgba(96, 165, 250, 0.18)",
                  borderRadius: "24px",
                  padding: "30px 28px",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                  Rozetlerim
                </h2>

                <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                  {[
                    {
                      title: "10 oyun oyna",
                      earned: Boolean((profileStats?.totalGames ?? 0) >= 10),
                      progress: `${Math.min(profileStats?.totalGames ?? 0, 10)}/10`,
                    },
                    {
                      title: "50 oyun oyna",
                      earned: Boolean((profileStats?.totalGames ?? 0) >= 50),
                      progress: `${Math.min(profileStats?.totalGames ?? 0, 50)}/50`,
                    },
                    {
                      title: "100 oyun oyna",
                      earned: Boolean((profileStats?.totalGames ?? 0) >= 100),
                      progress: `${Math.min(profileStats?.totalGames ?? 0, 100)}/100`,
                    },
                    {
                      title: "Bir oyunu 60 saniyeden kısa bir sürede tamamla",
                      earned: Boolean((profileStats?.fastGameCount ?? 0) >= 1),
                      progress: `${Math.min(profileStats?.fastGameCount ?? 0, 1)}/1`,
                    },
                    {
                      title: "1 hafta boyunca günlük oyun oyna",
                      earned: Boolean((profileStats?.dailyStreak ?? 0) >= 7),
                      progress: `${Math.min(profileStats?.dailyStreak ?? 0, 7)}/7`,
                    },
                    {
                      title: "1 ay boyunca günlük oyun oyna",
                      earned: Boolean((profileStats?.dailyStreak ?? 0) >= 30),
                      progress: `${Math.min(profileStats?.dailyStreak ?? 0, 30)}/30`,
                    },
                    {
                      title: "Üst üste 5 soruyu doğru cevapla",
                      earned: Boolean((profileStats?.bestCorrectStreak ?? 0) >= 5),
                      progress: `${Math.min(profileStats?.bestCorrectStreak ?? 0, 5)}/5`,
                    },
                    {
                      title: "Üst üste 10 soruyu doğru cevapla",
                      earned: Boolean((profileStats?.bestCorrectStreak ?? 0) >= 10),
                      progress: `${Math.min(profileStats?.bestCorrectStreak ?? 0, 10)}/10`,
                    },
                    {
                      title: "Tüm soruları doğru cevapla",
                      earned: Boolean(profileStats?.perfectGameBadgeEarned || (profileStats?.perfectGameCount ?? 0) >= 1),
                      progress: `${Math.min(profileStats?.perfectGameCount ?? 0, 1)}/1`,
                    },
                    {
                      title: "Pas kullanmadan oyunu bitir",
                      earned: Boolean((profileStats?.noPassGameCount ?? 0) >= 1),
                      progress: `${Math.min(profileStats?.noPassGameCount ?? 0, 1)}/1`,
                    },
                    {
                      title: "Toplam 100 doğru cevap ver",
                      earned: Boolean((profileStats?.totalCorrectAnswers ?? 0) >= 100),
                      progress: `${Math.min(profileStats?.totalCorrectAnswers ?? 0, 100)}/100`,
                    },
                    {
                      title: "Toplam 500 doğru cevap ver",
                      earned: Boolean((profileStats?.totalCorrectAnswers ?? 0) >= 500),
                      progress: `${Math.min(profileStats?.totalCorrectAnswers ?? 0, 500)}/500`,
                    },
                    {
                      title: "Toplam 1000 doğru cevap ver",
                      earned: Boolean((profileStats?.totalCorrectAnswers ?? 0) >= 1000),
                      progress: `${Math.min(profileStats?.totalCorrectAnswers ?? 0, 1000)}/1000`,
                    },
                    {
                      title: "Arkadaşlarınla 5 düello maçı oyna",
                      earned: profileStats?.duel5BadgeEarned,
                      progress: `${Math.min(profileStats?.duelMatchCount ?? 0, 5)}/5`,
                    },
                    {
                      title: "Arkadaşlarınla 10 düello maçı oyna",
                      earned: profileStats?.duel10BadgeEarned,
                      progress: `${Math.min(profileStats?.duelMatchCount ?? 0, 10)}/10`,
                    },
                    {
                      title: "Arkadaşlarınla 25 düello maçı oyna",
                      earned: Boolean((profileStats?.duelMatchCount ?? 0) >= 25),
                      progress: `${Math.min(profileStats?.duelMatchCount ?? 0, 25)}/25`,
                    },
                    {
                                        title: "Üst üste 5 düello kazan",
                                        earned: Boolean((profileStats?.duelWinStreak ?? 0) >= 5),
                                        progress: `${Math.min(profileStats?.duelWinStreak ?? 0, 5)}/5`,
                                      },
                  ].map((badge) => (
                    <div
                      key={badge.title}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "14px",
                        padding: "16px 18px",
                        borderRadius: "16px",
                        background: badge.earned
                          ? "rgba(76, 29, 149, 0.42)"
                          : "rgba(15, 23, 42, 0.68)",
                        border: badge.earned
                          ? "1px solid rgba(196, 181, 253, 0.35)"
                          : "1px solid rgba(148, 163, 184, 0.12)",
                      }}
                    >
                      <div>
                        <div style={{ color: "#f8fafc", fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>
                          {badge.title}
                        </div>
                        <div style={{ color: "#cbd5e1", fontSize: "14px" }}>
                          İlerleme: {badge.progress}
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: "108px",
                          textAlign: "center",
                          padding: "8px 12px",
                          borderRadius: "999px",
                          fontSize: "14px",
                          fontWeight: "800",
                          color: badge.earned ? "#ede9fe" : "#cbd5e1",
                          background: badge.earned
                            ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                            : "rgba(51, 65, 85, 0.9)",
                        }}
                      >
                        {badge.earned ? "Kazandın" : "Devam Ediyor"}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowBadgesModal(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}


          <div style={{ display: "grid", gap: "12px" }}>
            <DuelLobby
              currentUser={currentUser}
              onBack={() => setGameMode("classic")}
              onStartDuel={startDuelGame}
            />
          </div>
          {showDuelHistoryModal && (
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
                  maxWidth: "760px",
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                  border: "1px solid rgba(96, 165, 250, 0.18)",
                  borderRadius: "24px",
                  padding: "30px 28px",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                  Düello Maç Geçmişi
                </h2>

                {duelHistoryLoading ? (
                  <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                    Maç geçmişi yükleniyor...
                  </p>
                ) : duelHistory.length === 0 ? (
                  <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                    Henüz düello geçmişi bulunmuyor.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                    {duelHistory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "18px 20px",
                          borderRadius: "18px",
                          background: "rgba(15, 23, 42, 0.68)",
                          border: "1px solid rgba(148, 163, 184, 0.12)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginBottom: "10px",
                          }}
                        >
                          <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "800" }}>
                            Rakip: <span style={{ color: "#93c5fd" }}>{item.opponentName || "Rakip"}</span>
                          </div>
                          <div
                            style={{
                              color: item.won ? "#22c55e" : "#f87171",
                              fontSize: "15px",
                              fontWeight: "800",
                            }}
                          >
                            {item.won ? "Galibiyet" : "Mağlubiyet"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Skor:</strong> {item.score ?? 0} - {item.opponentScore ?? 0}
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Kazanan:</strong> {item.winnerName || "-"}
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Süre farkı:</strong> {item.durationDifferenceSeconds ?? 0} sn
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Tarih:</strong> {item.playedAt ? new Date(item.playedAt).toLocaleString("tr-TR") : "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowDuelHistoryModal(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
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
                  maxHeight: "80vh",
                  overflowY: "auto",
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
                      Önce oyun süresini seçmelisin. Oyun başladığında her harf için bir soru gelir ve aktif harf ekranda gösterilir.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Cevaplama Kuralları</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Cevabını kutuya yazıp <strong>Enter</strong> tuşuna basabilir veya <strong>Cevabı Kontrol Et</strong> butonunu kullanabilirsin. Boş cevap gönderemezsin.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Pas ve Puanlama</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Doğru cevap <strong>+10 puan</strong>, yanlış cevap <strong>-5 puan</strong> kazandırır. <strong>Pas</strong> dediğinde soru sona bırakılır ve tüm sorular bittikten sonra tekrar karşına gelir.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Oyun Sonu</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Süre bittiğinde ya da tüm sorular tamamlandığında oyun sona erer. Oyun sonu istatistik ekranında puanın, doğru, yanlış, pas sayın ve sorulara dair cevap anahtarı gösterilir. Böylece yanlış yaptığın soruların doğru yanıtlarını göerebilirsin.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Düello Modu</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Düello modunda bir oda oluşturabilir ya da mevcut bir oda koduyla rakibine katılabilirsin. Her iki oyuncu da hazır olduğunda geri sayım başlar ve oyun aynı anda açılır. İki oyuncuya da aynı sorular verilir ve oyuncular soruları çözer. Bir oyuncu oyunu erken bitirirse rakibinin oyunu tamamlamasını bekler. Her iki oyuncu da bitirdiğinde sonuç ekranında iki tarafın istatistikleri ve kazanan bilgisi gösterilir.
                    </div>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Günlük Oyun</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Günlük oyunda herkes aynı gün içinde aynı soru setiyle oynar. Günlük oyunu bir kez tamamladığında aynı gün tekrar oynayamazsın. Yarın yeni soru setiyle tekrar oynayabilirsin. Günlük oyunu bitirdiğinde oyun sistatistik ekranı ve cevap anahtarı görüntülenir.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowHowToPlay(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              gap: "16px",
              marginBottom: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "flex-start" }}>
              {gameMode !== "daily" && (
                <>
                  <button
                    onClick={() => setShowHowToPlay(true)}
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "14px",
                      background: "rgba(15, 23, 42, 0.68)",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      boxShadow: "0 12px 26px rgba(2, 6, 23, 0.22)",
                      color: "#cbd5e1",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label="Nasıl Oynanır"
                    title="Nasıl Oynanır"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10
                      10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8
                      8 3.59 8 8-3.59 8-8 8z"/>
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      if (showLeaderboard) {
                        setShowLeaderboard(false);
                      } else {
                        fetchLeaderboard();
                        setShowLeaderboard(true);
                      }
                    }}
                    style={{
                      width: "46px",
                      height: "46px",
                      borderRadius: "14px",
                      background: "rgba(15, 23, 42, 0.68)",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      boxShadow: "0 12px 26px rgba(2, 6, 23, 0.22)",
                      color: "#cbd5e1",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    aria-label="Leaderboard"
                    title="Leaderboard"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M7 20V10h3v10H7zm7 0V4h3v16h-3zM2 20v-6h3v6H2z" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <img
                src="/passaquiz.png"
                alt="PassaQuiz Logo"
                style={{ width: "280px" }}
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                justifyContent: "flex-start",
                gap: "10px",
                position: "relative",
              }}
            >
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  style={{
                    width: "46px",
                    height: "46px",
                    padding: "0",
                    borderRadius: "50%",
                    border: "2px solid rgba(191, 219, 254, 0.72)",
                    background: "rgba(15, 23, 42, 0.68)",
                    boxShadow: "0 12px 26px rgba(2, 6, 23, 0.22)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                  aria-label="Profilim"
                  title="Profilim"
                >
                  {authUserImage ? (
                    <img
                      src={authUserImage}
                      alt="Profil"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.85), rgba(37, 99, 235, 0.95))",
                        color: "#f8fafc",
                        fontSize: "32px",
                        fontWeight: "800",
                      }}
                    >
                      {(authUserName || authUserEmail || "?").trim().charAt(0).toLocaleUpperCase("tr-TR")}
                    </div>
                  )}
                </button>

                {showProfileMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      minWidth: "240px",
                      background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      borderRadius: "18px",
                      boxShadow: "0 20px 44px rgba(2, 6, 23, 0.34)",
                      padding: "14px",
                      zIndex: 50,
                    }}
                  >
                    <button
                      onClick={() => setShowProfileMenu(false)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: "1px solid rgba(148, 163, 184, 0.25)",
                        background: "rgba(15, 23, 42, 0.9)",
                        color: "#cbd5e1",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                    <div style={{ padding: "20px 2px 12px", borderBottom: "1px solid rgba(148, 163, 184, 0.12)", marginBottom: "12px" }}>
                      <div style={{ color: "#f8fafc", fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>
                        {authUserName || "Kullanıcı"}
                      </div>
                      <div style={{ color: "#93c5fd", fontSize: "13px" }}>
                        {authUserEmail}
                      </div>
                    </div>

                    <input
                      ref={profileFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      style={{ display: "none" }}
                    />

                    <button
                      onClick={() => profileFileInputRef.current?.click()}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                      }}
                    >
                      Profil Fotoğrafı Yükle
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowBadgesModal(true);
                        fetchProfileStats();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                        boxShadow: "0 10px 24px rgba(124, 58, 237, 0.30)",
                      }}
                    >
                      Rozetlerim
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowStatsModal(true);
                        fetchProfileStats();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #0f766e, #134e4a)",
                        boxShadow: "0 10px 24px rgba(15, 118, 110, 0.30)",
                      }}
                    >
                      İstatistiklerim
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowDuelHistoryModal(true);
                        fetchDuelHistory();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #334155, #1e293b)",
                        boxShadow: "0 10px 24px rgba(30, 41, 59, 0.30)",
                      }}
                    >
                      Düello Maç Geçmişi
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{
                        ...exitButtonStyle,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                      }}
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>

              <div />
            </div>
          </div>

          <h2 style={{ color: "#f8fafc", marginBottom: "10px" }}>
            {gameMode === "daily" ? "Günlük Oyun" : "Oyun Süresini Seç"}
          </h2>
          <p style={{ color: "#cbd5e1", marginTop: 0, marginBottom: gameMode === "daily" && dailyResult ? "18px" : "28px", fontSize: "18px" }}>
            {gameMode === "daily"
              ? "Günlük oyunda herkes günün aynı sorularıyla oynar. Soru seti her gün yenilenir."
              : "Oyunu başlatmadan önce süre seç. Süre dolunca oyun otomatik olarak sona erecek."}
          </p>

          {gameMode === "daily" && dailyResult && (
            <div
              style={{
                marginBottom: "24px",
                padding: "22px 24px",
                borderRadius: "20px",
                background: "rgba(15, 23, 42, 0.72)",
                border: "1px solid rgba(148, 163, 184, 0.16)",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  color: "#4ade80",
                  fontSize: "22px",
                  fontWeight: "800",
                  marginBottom: "10px",
                  textAlign: "center",
                }}
              >
                Günlük oyunu tamamladınız.
              </div>

              <div
                style={{
                  color: "#cbd5e1",
                  fontSize: "17px",
                  lineHeight: 1.7,
                  marginBottom: "18px",
                  textAlign: "center",
                }}
              >
                Yarınki günlük oyun için:{" "}
                <strong style={{ color: "#93c5fd" }}>
                  {formatDailyCountdown(
                    Math.max(
                      0,
                      Math.floor(
                        (new Date(new Date().setHours(24, 0, 0, 0)).getTime() - Date.now()) / 1000
                      )
                    )
                  )}
                </strong>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: "14px",
                }}
              >
                {[
                  { label: "Toplam puan", value: dailyResult.score, color: "#2563eb" },
                  { label: "Oyun süresi", value: formatElapsedTime(dailyResult.elapsedTime || 0), color: "#52525b" },
                  { label: "Doğru sayısı", value: dailyResult.correctCount, color: "#16a34a" },
                  { label: "Yanlış sayısı", value: dailyResult.wrongCount, color: "#dc2626" },
                  { label: "Pas sayısı", value: dailyResult.passedCount, color: "#d97706" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      padding: "16px 18px",
                      borderRadius: "16px",
                      background: "rgba(30, 41, 59, 0.82)",
                      border: "1px solid rgba(148, 163, 184, 0.10)",
                    }}
                  >
                    <div style={{ color: "#94a3b8", fontSize: "14px", fontWeight: "700", marginBottom: "8px" }}>
                      {item.label}
                    </div>
                    <div style={{ color: item.color, fontSize: "24px", fontWeight: "800" }}>
                      {item.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "16px",
              flexWrap: "wrap",
              marginBottom: "20px",
            }}
          >
            <button onClick={() => { setSelectedDuration(180); setGameMode("classic"); }} style={durationButtonStyle(180)}>
              3 Dakika
            </button>
            <button onClick={() => { setSelectedDuration(240); setGameMode("classic"); }} style={durationButtonStyle(240)}>
              4 Dakika
            </button>
            <button onClick={() => { setSelectedDuration(300); setGameMode("classic"); }} style={durationButtonStyle(300)}>
              5 Dakika
            </button>
          </div>
          {gameMode === "daily" ? (
            dailyResult ? (
              <button
                onClick={() => setGameMode("classic")}
                style={{
                  padding: "18px 28px",
                  fontSize: "20px",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  color: "white",
                  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  boxShadow: "0 14px 32px rgba(139, 92, 246, 0.35)",
                  minWidth: "220px",
                }}
              >
                Ana Ekrana Dön
              </button>
            ) : (
              <button
                onClick={startGame}
                style={{
                  padding: "18px 28px",
                  fontSize: "20px",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  color: "white",
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  boxShadow: "0 14px 32px rgba(239, 68, 68, 0.35)",
                  minWidth: "220px",
                }}
              >
                Günlük Oyunu Başlat
              </button>
            )
          ) : (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "18px",
                marginTop: "24px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={startGame}
                style={{
                  padding: "18px 28px",
                  fontSize: "20px",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  color: "white",
                  background: "linear-gradient(135deg, #22c55e, #16a34a)",
                  boxShadow: "0 14px 32px rgba(34, 197, 94, 0.35)",
                  minWidth: "220px",
                }}
              >
                Klasik Oyun
              </button>

              <button
                onClick={() => {
                  if (dailyResult) {
                    setGameMode("daily");
                  } else {
                    startGame("daily");
                  }
                }}
                style={{
                  padding: "18px 28px",
                  fontSize: "20px",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  color: "white",
                  background: "linear-gradient(135deg, #f59e0b, #ef4444)",
                  boxShadow: "0 14px 32px rgba(239, 68, 68, 0.35)",
                  minWidth: "220px",
                }}
              >
                Günlük Oyun
              </button>

              <button
                onClick={() => setGameMode("duel")}
                style={{
                  padding: "18px 28px",
                  fontSize: "20px",
                  border: "none",
                  borderRadius: "20px",
                  cursor: "pointer",
                  color: "white",
                  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  boxShadow: "0 14px 32px rgba(139, 92, 246, 0.35)",
                  minWidth: "220px",
                }}
              >
                Düello
              </button>
            </div>
          )}
          {showLeaderboard && (
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
                  maxHeight: "80vh",
                  overflowY: "auto",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                  Leaderboard
                </h2>

                {leaderboard.length === 0 ? (
                  <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                    Henüz skor bulunmuyor.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "10px", marginBottom: "24px" }}>
                    {leaderboard.map((item, index) => (
                      <div
                        key={item.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "14px 16px",
                          borderRadius: "16px",
                          background: "rgba(15, 23, 42, 0.68)",
                          border: "1px solid rgba(148, 163, 184, 0.12)",
                          color: "#e2e8f0",
                        }}
                      >
                        <span style={{ fontSize: "16px", fontWeight: "600" }}>
                          {index + 1}. {item.userName || item.userEmail}
                        </span>
                        <span style={{ color: "#60a5fa", fontWeight: "800", fontSize: "18px" }}>
                          {item.score}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}
          {showStatsModal && (
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
                  maxHeight: "80vh",
                  overflowY: "auto",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                  İstatistiklerim
                </h2>

                {profileStatsLoading ? (
                  <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                    İstatistikler yükleniyor...
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                    {[
                      { label: "Toplam oynanan oyun", value: profileStats?.totalGames ?? 0, color: "#60a5fa" },
                      { label: "En yüksek skor", value: profileStats?.highestScore ?? 0, color: "#22c55e" },
                      { label: "Ortalama skor", value: profileStats?.averageScore ?? 0, color: "#f59e0b" },
                      { label: "Günlük oyun galibiyet sayısı", value: profileStats?.dailyWins ?? 0, color: "#a78bfa" },
                      { label: "Düello galibiyet / mağlubiyet", value: `${profileStats?.duelWins ?? 0} / ${profileStats?.duelLosses ?? 0}`, color: "#f87171" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "16px 18px",
                          borderRadius: "16px",
                          background: "rgba(15, 23, 42, 0.68)",
                          border: "1px solid rgba(148, 163, 184, 0.12)",
                        }}
                      >
                        <span style={{ color: "#e2e8f0", fontSize: "16px", fontWeight: "600" }}>
                          {item.label}
                        </span>
                        <span style={{ color: item.color, fontSize: "20px", fontWeight: "800" }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowStatsModal(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}
          {showDuelHistoryModal && (
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
                  maxWidth: "760px",
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                  border: "1px solid rgba(96, 165, 250, 0.18)",
                  borderRadius: "24px",
                  padding: "30px 28px",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                  Düello Maç Geçmişi
                </h2>

                {duelHistoryLoading ? (
                  <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                    Maç geçmişi yükleniyor...
                  </p>
                ) : duelHistory.length === 0 ? (
                    <p style={{ color: "#cbd5e1", margin: "0 0 18px 0", textAlign: "center", fontSize: "17px" }}>
                    Henüz düello geçmişi bulunmuyor.
                  </p>
                ) : (
                  <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                    {duelHistory.map((item) => (
                      <div
                        key={item.id}
                        style={{
                          padding: "18px 20px",
                          borderRadius: "18px",
                          background: "rgba(15, 23, 42, 0.68)",
                          border: "1px solid rgba(148, 163, 184, 0.12)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "12px",
                            flexWrap: "wrap",
                            marginBottom: "10px",
                          }}
                        >
                          <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "800" }}>
                            Rakip: <span style={{ color: "#93c5fd" }}>{item.opponentName || "Rakip"}</span>
                          </div>
                          <div
                            style={{
                              color: item.won ? "#22c55e" : "#f87171",
                              fontSize: "15px",
                              fontWeight: "800",
                            }}
                          >
                            {item.won ? "Galibiyet" : "Mağlubiyet"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "10px",
                          }}
                        >
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Skor:</strong> {item.score ?? 0} - {item.opponentScore ?? 0}
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Kazanan:</strong> {item.winnerName || "-"}
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Süre farkı:</strong> {item.durationDifferenceSeconds ?? 0} sn
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Tarih:</strong> {item.playedAt ? new Date(item.playedAt).toLocaleString("tr-TR") : "-"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowDuelHistoryModal(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
            </div>
          )}
          {showBadgesModal && (
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
                  maxWidth: "760px",
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                  border: "1px solid rgba(96, 165, 250, 0.18)",
                  borderRadius: "24px",
                  padding: "30px 28px",
                  maxHeight: "80vh",
                  overflowY: "auto",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                  textAlign: "left",
                }}
              >
                <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                  Rozetlerim
                </h2>

                <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                  {[
                      {
                                            title: "10 oyun oyna",
                                            earned: Boolean((profileStats?.totalGames ?? 0) >= 10),
                                            progress: `${Math.min(profileStats?.totalGames ?? 0, 10)}/10`,
                                          },
                                          {
                                            title: "50 oyun oyna",
                                            earned: Boolean((profileStats?.totalGames ?? 0) >= 50),
                                            progress: `${Math.min(profileStats?.totalGames ?? 0, 50)}/50`,
                                          },
                                          {
                                            title: "100 oyun oyna",
                                            earned: Boolean((profileStats?.totalGames ?? 0) >= 100),
                                            progress: `${Math.min(profileStats?.totalGames ?? 0, 100)}/100`,
                                          },
                                      {
                                                            title: "Bir oyunu 60 saniyeden kısa bir sürede tamamla",
                                                            earned: Boolean((profileStats?.fastGameCount ?? 0) >= 1),
                                                            progress: `${Math.min(profileStats?.fastGameCount ?? 0, 1)}/1`,
                                                          },
                    {
                      title: "1 hafta boyunca günlük oyun oyna",
                      earned: Boolean((profileStats?.dailyStreak ?? 0) >= 7),
                      progress: `${Math.min(profileStats?.dailyStreak ?? 0, 7)}/7`,
                    },
                    {
                      title: "1 ay boyunca günlük oyun oyna",
                      earned: Boolean((profileStats?.dailyStreak ?? 0) >= 30),
                      progress: `${Math.min(profileStats?.dailyStreak ?? 0, 30)}/30`,
                    },
                    {
                      title: "Üst üste 5 soruyu doğru cevapla",
                      earned: Boolean((profileStats?.bestCorrectStreak ?? 0) >= 5),
                      progress: `${Math.min(profileStats?.bestCorrectStreak ?? 0, 5)}/5`,
                    },
                    {
                      title: "Üst üste 10 soruyu doğru cevapla",
                      earned: Boolean((profileStats?.bestCorrectStreak ?? 0) >= 10),
                      progress: `${Math.min(profileStats?.bestCorrectStreak ?? 0, 10)}/10`,
                    },
                    {
                      title: "Tüm soruları doğru cevapla",
                      earned: Boolean(profileStats?.perfectGameBadgeEarned || (profileStats?.perfectGameCount ?? 0) >= 1),
                      progress: `${Math.min(profileStats?.perfectGameCount ?? 0, 1)}/1`,
                    },
                    {
                                          title: "Pas kullanmadan oyunu bitir",
                                          earned: Boolean((profileStats?.noPassGameCount ?? 0) >= 1),
                                          progress: `${Math.min(profileStats?.noPassGameCount ?? 0, 1)}/1`,
                                        },
                    {
                      title: "Toplam 100 doğru cevap ver",
                      earned: Boolean((profileStats?.totalCorrectAnswers ?? 0) >= 100),
                      progress: `${Math.min(profileStats?.totalCorrectAnswers ?? 0, 100)}/100`,
                    },
                    {
                      title: "Toplam 500 doğru cevap ver",
                      earned: Boolean((profileStats?.totalCorrectAnswers ?? 0) >= 500),
                      progress: `${Math.min(profileStats?.totalCorrectAnswers ?? 0, 500)}/500`,
                    },
                    {
                      title: "Toplam 1000 doğru cevap ver",
                      earned: Boolean((profileStats?.totalCorrectAnswers ?? 0) >= 1000),
                      progress: `${Math.min(profileStats?.totalCorrectAnswers ?? 0, 1000)}/1000`,
                    },
                    {
                      title: "Arkadaşlarınla 5 düello maçı oyna",
                      earned: profileStats?.duel5BadgeEarned,
                      progress: `${Math.min(profileStats?.duelMatchCount ?? 0, 5)}/5`,
                    },
                    {
                      title: "Arkadaşlarınla 10 düello maçı oyna",
                      earned: profileStats?.duel10BadgeEarned,
                      progress: `${Math.min(profileStats?.duelMatchCount ?? 0, 10)}/10`,
                    },
                    {
                      title: "Arkadaşlarınla 25 düello maçı oyna",
                      earned: Boolean((profileStats?.duelMatchCount ?? 0) >= 25),
                      progress: `${Math.min(profileStats?.duelMatchCount ?? 0, 25)}/25`,
                    },
                    {
                                        title: "Üst üste 5 düello kazan",
                                        earned: Boolean((profileStats?.duelWinStreak ?? 0) >= 5),
                                        progress: `${Math.min(profileStats?.duelWinStreak ?? 0, 5)}/5`,
                                      },

                  ].map((badge) => (
                    <div
                      key={badge.title}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "14px",
                        padding: "16px 18px",
                        borderRadius: "16px",
                        background: badge.earned
                          ? "rgba(76, 29, 149, 0.42)"
                          : "rgba(15, 23, 42, 0.68)",
                        border: badge.earned
                          ? "1px solid rgba(196, 181, 253, 0.35)"
                          : "1px solid rgba(148, 163, 184, 0.12)",
                      }}
                    >
                      <div>
                        <div style={{ color: "#f8fafc", fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>
                          {badge.title}
                        </div>
                        <div style={{ color: "#cbd5e1", fontSize: "14px" }}>
                          İlerleme: {badge.progress}
                        </div>
                      </div>

                      <div
                        style={{
                          minWidth: "108px",
                          textAlign: "center",
                          padding: "8px 12px",
                          borderRadius: "999px",
                          fontSize: "14px",
                          fontWeight: "800",
                          color: badge.earned ? "#ede9fe" : "#cbd5e1",
                          background: badge.earned
                            ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                            : "rgba(51, 65, 85, 0.9)",
                        }}
                      >
                        {badge.earned ? "Kazandın" : "Devam Ediyor"}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowBadgesModal(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                    }}
                  >
                    Kapat
                  </button>
                </div>
              </div>
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
                  maxHeight: "80vh",
                  overflowY: "auto",
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
                      Önce oyun süresini seçmelisin. Oyun başladığında her harf için bir soru gelir ve aktif harf ekranda gösterilir.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Cevaplama Kuralları</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Cevabını kutuya yazıp <strong>Enter</strong> tuşuna basabilir veya <strong>Cevabı Kontrol Et</strong> butonunu kullanabilirsin. Boş cevap gönderemezsin.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Pas ve Puanlama</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Doğru cevap <strong>+10 puan</strong>, yanlış cevap <strong>-5 puan</strong> kazandırır. <strong>Pas</strong> dediğinde soru sona bırakılır ve tüm sorular bittikten sonra tekrar karşına gelir.
                    </div>
                  </div>

                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Oyun Sonu</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Süre bittiğinde ya da tüm sorular tamamlandığında oyun sona erer. Oyun sonu istatistik ekranında puanın, doğru, yanlış, pas sayın ve sorulara dair cevap anahtarı gösterilir. Böylece yanlış yaptığın soruların doğru yanıtlarını göerebilirsin.
                    </div>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Düello Modu</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Düello modunda bir oda oluşturabilir ya da mevcut bir oda koduyla rakibine katılabilirsin. Her iki oyuncu da hazır olduğunda geri sayım başlar ve oyun aynı anda açılır. İki oyuncuya da aynı sorular verilir ve oyuncular soruları çözer. Bir oyuncu oyunu erken bitirirse rakibinin oyunu tamamlamasını bekler. Her iki oyuncu da bitirdiğinde sonuç ekranında iki tarafın istatistikleri ve kazanan bilgisi gösterilir.
                    </div>
                  </div>
                  <div style={{ background: "rgba(15, 23, 42, 0.68)", border: "1px solid rgba(148, 163, 184, 0.12)", borderRadius: "16px", padding: "16px 18px" }}>
                    <div style={{ color: "#93c5fd", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>Günlük Oyun</div>
                    <div style={{ color: "#e2e8f0", lineHeight: 1.7 }}>
                      Günlük oyunda herkes aynı gün içinde aynı soru setiyle oynar. Günlük oyunu bir kez tamamladığında aynı gün tekrar oynayamazsın. Yarın yeni soru setiyle tekrar oynayabilirsin. Günlük oyunu bitirdiğinde oyun sonu istatistik ekranı ve cevap anahtarı görüntülenir.
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "center" }}>
                  <button
                    onClick={() => setShowHowToPlay(false)}
                    style={{
                      marginTop: 0,
                      marginRight: 0,
                      minWidth: "180px",
                      fontSize: "17px",
                      padding: "14px 24px",
                      border: "none",
                      borderRadius: "16px",
                      cursor: "pointer",
                      color: "white",
                      background: "linear-gradient(135deg, #f87171, #ef4444)",
                      boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
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

  const duelIsCurrentUserPlayer1 = duelRoomData?.player1?.id === currentUser?.id;
  const duelOpponentFinished = duelIsCurrentUserPlayer1
    ? duelRoomData?.player2Finished
    : duelRoomData?.player1Finished;
  const duelOpponentAbandoned = gameMode === "duel" && gameFinished && duelOpponentFinished === false;

  const duelOpponentPlayer = duelIsCurrentUserPlayer1
    ? duelRoomData?.player2
    : duelRoomData?.player1;

  const duelOpponentCorrectCountDisplay = duelOpponentAbandoned
    ? (typeof duelOpponentPlayer?.correctCount === "number"
        ? duelOpponentPlayer.correctCount
        : (typeof duelOpponentCorrectCount === "number" ? duelOpponentCorrectCount : "-"))
    : (typeof duelOpponentCorrectCount === "number"
        ? duelOpponentCorrectCount
        : (typeof duelOpponentPlayer?.correctCount === "number" ? duelOpponentPlayer.correctCount : "-"));

  const duelOpponentWrongCountDisplay = duelOpponentAbandoned
    ? (typeof duelOpponentPlayer?.wrongCount === "number"
        ? duelOpponentPlayer.wrongCount
        : (typeof duelOpponentWrongCount === "number" ? duelOpponentWrongCount : "-"))
    : (typeof duelOpponentWrongCount === "number"
        ? duelOpponentWrongCount
        : (typeof duelOpponentPlayer?.wrongCount === "number" ? duelOpponentPlayer.wrongCount : "-"));

  const duelOpponentPassedCountDisplay = duelOpponentAbandoned
    ? (typeof duelOpponentPlayer?.passedCount === "number"
        ? duelOpponentPlayer.passedCount
        : (typeof duelOpponentPassedCount === "number" ? duelOpponentPassedCount : "-"))
    : (typeof duelOpponentPassedCount === "number"
        ? duelOpponentPassedCount
        : (typeof duelOpponentPlayer?.passedCount === "number" ? duelOpponentPlayer.passedCount : "-"));

    const currentGameBestCorrectStreak = (() => {
      if (Array.isArray(completeAnswerKey) && completeAnswerKey.length > 0) {
        let best = 0;
        let current = 0;

        completeAnswerKey.forEach((item) => {
          if (item?.status === "correct") {
            current += 1;
            if (current > best) best = current;
          } else {
            current = 0;
          }
        });

        return best;
      }

      if (Array.isArray(questionStatuses) && questionStatuses.length > 0) {
        let best = 0;
        let current = 0;

        questionStatuses.forEach((status) => {
          if (status === "correct") {
            current += 1;
            if (current > best) best = current;
          } else {
            current = 0;
          }
        });

        return best;
      }

      return 0;
    })();

    const effectiveBestCorrectStreak = Math.max(
      profileStats?.bestCorrectStreak ?? 0,
      currentGameBestCorrectStreak
    );

    const effectiveStreak5BadgeEarned = Boolean(
      profileStats?.streak5BadgeEarned || effectiveBestCorrectStreak >= 5
    );

    const effectiveStreak10BadgeEarned = Boolean(
      profileStats?.streak10BadgeEarned || effectiveBestCorrectStreak >= 10
    );

  const letters = questions.map((q, index) => {
    const angle = (360 / questions.length) * index - 90;
    const radian = (angle * Math.PI) / 180;
    const x = Math.cos(radian) * radius;
    const y = Math.sin(radian) * radius;

    return {
      letter: (q.letter || "").toLocaleUpperCase("tr-TR"),
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
        <div style={{ marginBottom: "28px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              alignItems: "center",
              marginBottom: "18px",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "flex-start" }}>
              <button
                onClick={restartGame}
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "12px",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  background: "rgba(15, 23, 42, 0.75)",
                  color: "#cbd5e1",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 22px rgba(2, 6, 23, 0.22)",
                }}
                aria-label="Geri"
                title="Geri"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
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
                justifyContent: "flex-start",
                gap: "10px",
                position: "relative",
              }}
            >
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setShowProfileMenu((prev) => !prev)}
                  style={{
                    width: "46px",
                    height: "46px",
                    padding: "0",
                    borderRadius: "50%",
                    border: "2px solid rgba(191, 219, 254, 0.72)",
                    background: "rgba(15, 23, 42, 0.68)",
                    boxShadow: "0 12px 26px rgba(2, 6, 23, 0.22)",
                    color: "#f8fafc",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                  }}
                  aria-label="Profilim"
                  title="Profilim"
                >
                  {authUserImage ? (
                    <img
                      src={authUserImage}
                      alt="Profil"
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.85), rgba(37, 99, 235, 0.95))",
                        color: "#f8fafc",
                        fontSize: "32px",
                        fontWeight: "800",
                      }}
                    >
                      {(authUserName || authUserEmail || "?").trim().charAt(0).toLocaleUpperCase("tr-TR")}
                    </div>
                  )}
                </button>

                {showProfileMenu && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 10px)",
                      right: 0,
                      minWidth: "240px",
                      background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                      border: "1px solid rgba(148, 163, 184, 0.18)",
                      borderRadius: "18px",
                      boxShadow: "0 20px 44px rgba(2, 6, 23, 0.34)",
                      padding: "14px",
                      zIndex: 50,
                    }}
                  >
                    <button
                      onClick={() => setShowProfileMenu(false)}
                      style={{
                        position: "absolute",
                        top: "8px",
                        right: "8px",
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        border: "1px solid rgba(148, 163, 184, 0.25)",
                        background: "rgba(15, 23, 42, 0.9)",
                        color: "#cbd5e1",
                        cursor: "pointer",
                        fontSize: "16px",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      ×
                    </button>
                    <div style={{ padding: "20px 2px 12px", borderBottom: "1px solid rgba(148, 163, 184, 0.12)", marginBottom: "12px" }}>
                      <div style={{ color: "#f8fafc", fontSize: "15px", fontWeight: "700", marginBottom: "4px" }}>
                        {authUserName || "Kullanıcı"}
                      </div>
                      <div style={{ color: "#93c5fd", fontSize: "13px" }}>
                        {authUserEmail}
                      </div>
                    </div>

                    <input
                      ref={profileFileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageChange}
                      style={{ display: "none" }}
                    />

                    <button
                      onClick={() => profileFileInputRef.current?.click()}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                      }}
                    >
                      Profil Fotoğrafı Yükle
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowBadgesModal(true);
                        fetchProfileStats();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                        boxShadow: "0 10px 24px rgba(124, 58, 237, 0.30)",
                      }}
                    >
                      Rozetlerim
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowStatsModal(true);
                        fetchProfileStats();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #0f766e, #134e4a)",
                        boxShadow: "0 10px 24px rgba(15, 118, 110, 0.30)",
                      }}
                    >
                      İstatistiklerim
                    </button>
                    <button
                      onClick={() => {
                        setShowProfileMenu(false);
                        setShowDuelHistoryModal(true);
                        fetchDuelHistory();
                      }}
                      style={{
                        ...primaryButtonStyle,
                        marginTop: 0,
                        marginRight: 0,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                        marginBottom: "10px",
                        background: "linear-gradient(135deg, #334155, #1e293b)",
                        boxShadow: "0 10px 24px rgba(30, 41, 59, 0.30)",
                      }}
                    >
                      Düello Maç Geçmişi
                    </button>
                    <button
                      onClick={handleLogout}
                      style={{
                        ...exitButtonStyle,
                        width: "100%",
                        fontSize: "14px",
                        padding: "12px 16px",
                      }}
                    >
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", justifyContent: "flex-start" }}>
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

              <button
                onClick={togglePause}
                style={{
                  padding: "8px 12px",
                  minWidth: "44px",
                  height: "40px",
                  border: "1px solid rgba(147, 197, 253, 0.24)",
                  borderRadius: "12px",
                  cursor: "pointer",
                  color: "#dbeafe",
                  background: "linear-gradient(135deg, rgba(30, 64, 175, 0.82), rgba(30, 41, 59, 0.92))",
                  boxShadow: "0 10px 22px rgba(30, 64, 175, 0.18)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                aria-label={isPaused ? "Devam Et" : "Duraklat"}
                title={isPaused ? "Devam Et" : "Duraklat"}
              >
                {isPaused ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M7 5h4v14H7zM13 5h4v14h-4z" />
                  </svg>
                )}
              </button>
            </div>

            <div style={scoreBoxStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "20px",
                  fontWeight: "700",
                  letterSpacing: "0.4px",
                }}
              >
                <span style={{ color: "#e2e8f0" }}>Skor:</span>
                <span
                  style={{
                    color: "#60a5fa",
                    textShadow: "0 0 10px rgba(96,165,250,0.7), 0 0 20px rgba(96,165,250,0.4)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {score}
                </span>
              </div>
            </div>
          </div>
        </div>

        {showStatsModal && (
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
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                textAlign: "left",
              }}
            >
              <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                İstatistiklerim
              </h2>

              {profileStatsLoading ? (
                <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                  İstatistikler yükleniyor...
                </p>
              ) : (
                <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                  {[
                    { label: "Toplam oynanan oyun", value: profileStats?.totalGames ?? 0, color: "#60a5fa" },
                    { label: "En yüksek skor", value: profileStats?.highestScore ?? 0, color: "#22c55e" },
                    { label: "Ortalama skor", value: profileStats?.averageScore ?? 0, color: "#f59e0b" },
                    { label: "Günlük oyun galibiyet sayısı", value: profileStats?.dailyWins ?? 0, color: "#a78bfa" },
                    { label: "Düello galibiyet / mağlubiyet", value: `${profileStats?.duelWins ?? 0} / ${profileStats?.duelLosses ?? 0}`, color: "#f87171" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "16px 18px",
                        borderRadius: "16px",
                        background: "rgba(15, 23, 42, 0.68)",
                        border: "1px solid rgba(148, 163, 184, 0.12)",
                      }}
                    >
                      <span style={{ color: "#e2e8f0", fontSize: "16px", fontWeight: "600" }}>
                        {item.label}
                      </span>
                      <span style={{ color: item.color, fontSize: "20px", fontWeight: "800" }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setShowStatsModal(false)}
                  style={{
                    marginTop: 0,
                    marginRight: 0,
                    minWidth: "180px",
                    fontSize: "17px",
                    padding: "14px 24px",
                    border: "none",
                    borderRadius: "16px",
                    cursor: "pointer",
                    color: "white",
                    background: "linear-gradient(135deg, #f87171, #ef4444)",
                    boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {showDuelHistoryModal && (
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
                maxWidth: "760px",
                background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                border: "1px solid rgba(96, 165, 250, 0.18)",
                borderRadius: "24px",
                padding: "30px 28px",
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                textAlign: "left",
              }}
            >
              <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                Düello Maç Geçmişi
              </h2>

              {duelHistoryLoading ? (
                <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                  Maç geçmişi yükleniyor...
                </p>
              ) : duelHistory.length === 0 ? (
                <p style={{ color: "#cbd5e1", margin: 0, textAlign: "center", fontSize: "17px" }}>
                  Henüz düello geçmişi bulunmuyor.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                  {duelHistory.map((item) => (
                    <div
                      key={item.id}
                      style={{
                        padding: "18px 20px",
                        borderRadius: "18px",
                        background: "rgba(15, 23, 42, 0.68)",
                        border: "1px solid rgba(148, 163, 184, 0.12)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                          marginBottom: "10px",
                        }}
                      >
                        <div style={{ color: "#f8fafc", fontSize: "18px", fontWeight: "800" }}>
                          Rakip: <span style={{ color: "#93c5fd" }}>{item.opponentName || "Rakip"}</span>
                        </div>
                        <div
                          style={{
                            color: item.won ? "#22c55e" : "#f87171",
                            fontSize: "15px",
                            fontWeight: "800",
                          }}
                        >
                          {item.won ? "Galibiyet" : "Mağlubiyet"}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                          gap: "10px",
                        }}
                      >
                        <div style={{ color: "#e2e8f0" }}>
                          <strong>Skor:</strong> {item.score ?? 0} - {item.opponentScore ?? 0}
                        </div>
                        <div style={{ color: "#e2e8f0" }}>
                          <strong>Kazanan:</strong> {item.winnerName || "-"}
                        </div>
                        <div style={{ color: "#e2e8f0" }}>
                          <strong>Süre farkı:</strong> {item.durationDifferenceSeconds ?? 0} sn
                        </div>
                        <div style={{ color: "#e2e8f0" }}>
                          <strong>Tarih:</strong> {item.playedAt ? new Date(item.playedAt).toLocaleString("tr-TR") : "-"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setShowDuelHistoryModal(false)}
                  style={{
                    marginTop: 0,
                    marginRight: 0,
                    minWidth: "180px",
                    fontSize: "17px",
                    padding: "14px 24px",
                    border: "none",
                    borderRadius: "16px",
                    cursor: "pointer",
                    color: "white",
                    background: "linear-gradient(135deg, #f87171, #ef4444)",
                    boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}
        {showBadgesModal && (
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
                maxWidth: "760px",
                background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.97))",
                border: "1px solid rgba(96, 165, 250, 0.18)",
                borderRadius: "24px",
                padding: "30px 28px",
                maxHeight: "80vh",
                overflowY: "auto",
                boxShadow: "0 24px 60px rgba(2, 6, 23, 0.42)",
                textAlign: "left",
              }}
            >
              <h2 style={{ color: "#f8fafc", marginTop: 0, marginBottom: "18px", textAlign: "center" }}>
                Rozetlerim
              </h2>

              <div style={{ display: "grid", gap: "14px", marginBottom: "24px" }}>
                {[
                    {
                                          title: "10 oyun oyna",
                                          earned: Boolean((profileStats?.totalGames ?? 0) >= 10),
                                          progress: `${Math.min(profileStats?.totalGames ?? 0, 10)}/10`,
                                        },
                                        {
                                          title: "50 oyun oyna",
                                          earned: Boolean((profileStats?.totalGames ?? 0) >= 50),
                                          progress: `${Math.min(profileStats?.totalGames ?? 0, 50)}/50`,
                                        },
                                        {
                                          title: "100 oyun oyna",
                                          earned: Boolean((profileStats?.totalGames ?? 0) >= 100),
                                          progress: `${Math.min(profileStats?.totalGames ?? 0, 100)}/100`,
                                        },
                                    {
                                                          title: "Bir oyunu 60 saniyeden kısa bir sürede tamamla",
                                                          earned: Boolean((profileStats?.fastGameCount ?? 0) >= 1),
                                                          progress: `${Math.min(profileStats?.fastGameCount ?? 0, 1)}/1`,
                                                        },
                  {
                    title: "1 hafta boyunca günlük oyun oyna",
                    earned: profileStats?.weeklyDailyBadgeEarned,
                    progress: `${profileStats?.dailyGameCount ?? 0}/7`,
                  },
                  {
                                        title: "1 ay boyunca günlük oyun oyna",
                                        earned: Boolean((profileStats?.dailyStreak ?? 0) >= 30),
                                        progress: `${Math.min(profileStats?.dailyStreak ?? 0, 30)}/30`,
                                      },
                  {
                    title: "Üst üste 5 soruyu doğru cevapla",
                    earned: Boolean((profileStats?.bestCorrectStreak ?? 0) >= 5),
                    progress: `${Math.min(profileStats?.bestCorrectStreak ?? 0, 5)}/5`,
                  },
                  {
                    title: "Üst üste 10 soruyu doğru cevapla",
                    earned: Boolean((profileStats?.bestCorrectStreak ?? 0) >= 10),
                    progress: `${Math.min(profileStats?.bestCorrectStreak ?? 0, 10)}/10`,
                  },
                  {
                    title: "Tüm soruları doğru cevapla",
                    earned: Boolean(profileStats?.perfectGameBadgeEarned || (profileStats?.perfectGameCount ?? 0) >= 1),
                    progress: `${Math.min(profileStats?.perfectGameCount ?? 0, 1)}/1`,
                  },
                  {
                                        title: "Pas kullanmadan oyunu bitir",
                                        earned: Boolean((profileStats?.noPassGameCount ?? 0) >= 1),
                                        progress: `${Math.min(profileStats?.noPassGameCount ?? 0, 1)}/1`,
                                      },
                                  {
                                                        title: "Toplam 100 doğru cevap ver",
                                                        earned: Boolean((profileStats?.totalCorrectAnswers ?? 0) >= 100),
                                                        progress: `${Math.min(profileStats?.totalCorrectAnswers ?? 0, 100)}/100`,
                                                      },
                                                      {
                                                        title: "Toplam 500 doğru cevap ver",
                                                        earned: Boolean((profileStats?.totalCorrectAnswers ?? 0) >= 500),
                                                        progress: `${Math.min(profileStats?.totalCorrectAnswers ?? 0, 500)}/500`,
                                                      },
                                                      {
                                                        title: "Toplam 1000 doğru cevap ver",
                                                        earned: Boolean((profileStats?.totalCorrectAnswers ?? 0) >= 1000),
                                                        progress: `${Math.min(profileStats?.totalCorrectAnswers ?? 0, 1000)}/1000`,
                                                      },
                  {
                    title: "Arkadaşlarınla 5 düello maçı oyna",
                    earned: profileStats?.duel5BadgeEarned,
                    progress: `${Math.min(profileStats?.duelMatchCount ?? 0, 5)}/5`,
                  },
                  {
                    title: "Arkadaşlarınla 10 düello maçı oyna",
                    earned: profileStats?.duel10BadgeEarned,
                    progress: `${Math.min(profileStats?.duelMatchCount ?? 0, 10)}/10`,
                  },
                  {
                    title: "Arkadaşlarınla 25 düello maçı oyna",
                    earned: Boolean((profileStats?.duelMatchCount ?? 0) >= 25),
                    progress: `${Math.min(profileStats?.duelMatchCount ?? 0, 25)}/25`,
                  },
                  {
                    title: "Üst üste 5 düello kazan",
                    earned: Boolean((profileStats?.duelWinStreak ?? 0) >= 5),
                    progress: `${Math.min(profileStats?.duelWinStreak ?? 0, 5)}/5`,
                  },
                ].map((badge) => (
                  <div
                    key={badge.title}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "14px",
                      padding: "16px 18px",
                      borderRadius: "16px",
                      background: badge.earned
                        ? "rgba(76, 29, 149, 0.42)"
                        : "rgba(15, 23, 42, 0.68)",
                      border: badge.earned
                        ? "1px solid rgba(196, 181, 253, 0.35)"
                        : "1px solid rgba(148, 163, 184, 0.12)",
                    }}
                  >
                    <div>
                      <div style={{ color: "#f8fafc", fontSize: "17px", fontWeight: "700", marginBottom: "6px" }}>
                        {badge.title}
                      </div>
                      <div style={{ color: "#cbd5e1", fontSize: "14px" }}>
                        İlerleme: {badge.progress}
                      </div>
                    </div>

                    <div
                      style={{
                        minWidth: "108px",
                        textAlign: "center",
                        padding: "8px 12px",
                        borderRadius: "999px",
                        fontSize: "14px",
                        fontWeight: "800",
                        color: badge.earned ? "#ede9fe" : "#cbd5e1",
                        background: badge.earned
                          ? "linear-gradient(135deg, #8b5cf6, #6d28d9)"
                          : "rgba(51, 65, 85, 0.9)",
                      }}
                    >
                      {badge.earned ? "Kazandın" : "Devam Ediyor"}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={() => setShowBadgesModal(false)}
                  style={{
                    marginTop: 0,
                    marginRight: 0,
                    minWidth: "180px",
                    fontSize: "17px",
                    padding: "14px 24px",
                    border: "none",
                    borderRadius: "16px",
                    cursor: "pointer",
                    color: "white",
                    background: "linear-gradient(135deg, #f87171, #ef4444)",
                    boxShadow: "0 10px 24px rgba(239, 68, 68, 0.35)",
                  }}
                >
                  Kapat
                </button>
              </div>
            </div>
          </div>
        )}

        {gameMode === "duel" && (
          <div
            style={{
              marginTop: "6px",
              marginBottom: duelWaitingForOpponent && !gameFinished ? "22px" : "10px",
              padding: duelWaitingForOpponent && !gameFinished ? "18px 20px" : "0px",
              borderRadius: duelWaitingForOpponent && !gameFinished ? "18px" : "0",
              background: duelWaitingForOpponent && !gameFinished ? "rgba(30, 41, 59, 0.82)" : "none",
              border: duelWaitingForOpponent && !gameFinished ? "1px solid rgba(148, 163, 184, 0.16)" : "none",
              textAlign: "center",
            }}
          >
            {/* Waiting for opponent message */}
            {duelWaitingForOpponent && !gameFinished && (
              <>
                <div style={{ color: "#4ade80", fontSize: "22px", fontWeight: "800", marginBottom: "8px" }}>
                  Rakibin oyunu bitirmesi bekleniyor.
                </div>
                <div style={{ color: "#cbd5e1", fontSize: "16px", lineHeight: 1.6 }}>
                  Rakip de oyunu bitirdiğinde sonuç ekranı otomatik olarak açılacak.
                </div>
              </>
            )}
          </div>
        )}
        {!duelWaitingForOpponent && (
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
                {gameFinished ? (
                  <div
                    style={{
                      color: "#f8fafc",
                      fontSize: "34px",
                      fontWeight: "800",
                      textAlign: "center",
                      lineHeight: "1.2",
                    }}
                  >
                      Oyun<br/>Bitti!
                  </div>
                ) : (
                  <>
                    <div style={{ fontSize: "18px", color: "#cbd5e1", marginBottom: "16px" }}>Aktif Harf</div>
                    <div style={{ fontSize: "56px", fontWeight: "bold", color: "#f8fafc", textShadow: "0 6px 18px rgba(96, 165, 250, 0.35)" }}>
                      {(question.letter || "").toLocaleUpperCase("tr-TR")}
                    </div>
                  </>
                )}
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
                      ? activePulse
                        ? "0 0 0 5px rgba(96, 165, 250, 0.28), 0 22px 36px rgba(37, 99, 235, 0.40)"
                        : "0 0 0 3px rgba(96, 165, 250, 0.22), 0 18px 32px rgba(37, 99, 235, 0.34), inset 0 1px 1px rgba(255,255,255,0.35)"
                      : l.status === "correct"
                        ? "0 14px 26px rgba(22, 163, 74, 0.24), inset 0 1px 1px rgba(255,255,255,0.28)"
                        : l.status === "wrong"
                          ? "0 14px 26px rgba(220, 38, 38, 0.24), inset 0 1px 1px rgba(255,255,255,0.24)"
                          : l.status === "passed"
                            ? "0 14px 26px rgba(234, 88, 12, 0.22), inset 0 1px 1px rgba(255,255,255,0.24)"
                            : "0 14px 26px rgba(2, 6, 23, 0.32), inset 0 1px 1px rgba(255,255,255,0.18)",
                  transform:
                    l.status === "active"
                      ? activePulse
                        ? "scale(1.18)"
                        : "scale(1.08)"
                      : "scale(1)",
                  transition: "all 180ms ease",
                }}
              >
                {l.letter}
              </div>
            ))}
          </div>
        )}

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
                position: "relative",
                width: "100%",
                maxWidth: "980px",
                background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.96))",
                border: "1px solid rgba(148, 163, 184, 0.18)",
                borderRadius: "28px",
                padding: "26px 28px 30px",
                boxShadow: "0 24px 60px rgba(2, 6, 23, 0.22)",
                textAlign: "center",
              }}
            >
              <h2
                style={{
                  color: "#e2e8f0",
                  marginTop: 0,
                  marginBottom: "28px",
                  fontSize: "32px",
                  fontWeight: "800",
                }}
              >
                Oyun Sonu İstatistiği
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  borderBottom: "1px solid #d4d4d8",
                  marginBottom: "8px",
                }}
              >
                <button
                  onClick={() => setResultTab("stats")}
                  onMouseEnter={() => setHoveredResultTab("stats")}
                  onMouseLeave={() => setHoveredResultTab(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 8px 18px",
                    fontSize: "22px",
                    fontWeight: "700",
                    color:
                      resultTab === "stats" || hoveredResultTab === "stats"
                        ? "#f8fafc"
                        : "#64748b",
                    position: "relative",
                    transition: "color 160ms ease",
                  }}
                >
                  Skor Dağılımı
                  {(resultTab === "stats" || hoveredResultTab === "stats") && (
                    <span
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: 0,
                        transform: "translateX(-50%)",
                        width: "82px",
                        height: "6px",
                        borderRadius: "999px",
                        background: "#f87171",
                      }}
                    />
                  )}
                </button>

                <button
                  onClick={() => setResultTab("answers")}
                  onMouseEnter={() => setHoveredResultTab("answers")}
                  onMouseLeave={() => setHoveredResultTab(null)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 8px 18px",
                    fontSize: "22px",
                    fontWeight: "700",
                    color:
                      resultTab === "answers" || hoveredResultTab === "answers"
                        ? "#f8fafc"
                        : "#64748b",
                    position: "relative",
                    transition: "color 160ms ease",
                  }}
                >
                  Cevap Anahtarı
                  {(resultTab === "answers" || hoveredResultTab === "answers") && (
                    <span
                      style={{
                        position: "absolute",
                        left: "50%",
                        bottom: 0,
                        transform: "translateX(-50%)",
                        width: "82px",
                        height: "6px",
                        borderRadius: "999px",
                        background: "#f87171",
                      }}
                    />
                  )}
                </button>
              </div>

              {resultTab === "stats" ? (
                <div style={{ textAlign: "left", marginTop: "6px" }}>
                  {gameMode === "duel" && (
                    <div
                      style={{
                        marginBottom: "22px",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        gap: "16px",
                      }}
                    >
                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.72)",
                          border: "1px solid rgba(148, 163, 184, 0.16)",
                          borderRadius: "18px",
                          padding: "18px 20px",
                        }}
                      >
                        <div style={{ color: "#93c5fd", fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>
                          SEN
                        </div>
                        <div style={{ color: "#f8fafc", fontSize: "22px", fontWeight: "800", marginBottom: "14px" }}>
                          {authUserName || authUserEmail || "Oyuncu"}
                        </div>

                        <div style={{ display: "grid", gap: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Toplam puan</span>
                            <strong style={{ color: "#2563eb" }}>{duelMyRecordedScore ?? score}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Oyun süresi</span>
                            <strong style={{ color: "#cbd5e1" }}>{formatElapsedTime(elapsedTime)}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Doğru sayısı</span>
                            <strong style={{ color: "#16a34a" }}>{correctCount}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Yanlış sayısı</span>
                            <strong style={{ color: "#dc2626" }}>{wrongCount}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Pas sayısı</span>
                            <strong style={{ color: "#d97706" }}>{passedCount}</strong>
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          background: "rgba(15, 23, 42, 0.72)",
                          border: "1px solid rgba(148, 163, 184, 0.16)",
                          borderRadius: "18px",
                          padding: "18px 20px",
                        }}
                      >
                        <div style={{ color: "#f59e0b", fontSize: "14px", fontWeight: "700", marginBottom: "10px" }}>
                          RAKİP
                        </div>
                        <div style={{ color: "#f8fafc", fontSize: "22px", fontWeight: "800", marginBottom: "14px" }}>
                          {duelOpponentName}
                        </div>

                        <div style={{ display: "grid", gap: "10px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Toplam puan</span>
                            <strong style={{ color: "#2563eb" }}>{duelOpponentAbandoned ? "-" : (duelOpponentScore ?? "-")}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Oyun süresi</span>
                            <strong style={{ color: "#cbd5e1" }}>
                              {duelOpponentAbandoned
                                ? "-"
                                : (typeof duelOpponentElapsedTime === "number" && duelOpponentElapsedTime > 0
                                    ? formatElapsedTime(duelOpponentElapsedTime)
                                    : "-")}
                            </strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Doğru sayısı</span>
                            <strong style={{ color: "#16a34a" }}>{duelOpponentCorrectCountDisplay}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Yanlış sayısı</span>
                            <strong style={{ color: "#dc2626" }}>{duelOpponentWrongCountDisplay}</strong>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#e2e8f0" }}>
                            <span>Pas sayısı</span>
                            <strong style={{ color: "#d97706" }}>{duelOpponentPassedCountDisplay}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {[
                    { label: "Toplam puan", value: score, color: "#2563eb" },
                    { label: "Oyun süresi", value: formatElapsedTime(elapsedTime), color: "#52525b" },
                    { label: "Doğru sayısı", value: correctCount, color: "#16a34a" },
                    { label: "Yanlış sayısı", value: wrongCount, color: "#dc2626" },
                    { label: "Pas sayısı", value: passedCount, color: "#d97706" },
                  ].map((item) => (
                    <div
                      key={item.label}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "20px 0",
                        borderBottom: "1px solid rgba(148, 163, 184, 0.12)"
                      }}
                    >
                      <span style={{ color: "#cbd5e1", fontSize: "20px", fontWeight: "600" }}>
                        {item.label}
                      </span>
                      <span style={{ color: item.color, fontSize: "24px", fontWeight: "800" }}>
                        {item.value}
                      </span>
                    </div>
                  ))}

                  {gameMode === "duel" && duelWinnerName && (
                    <div
                      style={{
                        marginTop: "20px",
                        padding: "18px 20px",
                        borderRadius: "18px",
                        background: "rgba(15, 23, 42, 0.72)",
                        border: "1px solid rgba(148, 163, 184, 0.16)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ color: "#93c5fd", fontSize: "15px", fontWeight: "700", marginBottom: "8px" }}>
                        KAZANAN
                      </div>
                      <div style={{ color: "#f8fafc", fontSize: "24px", fontWeight: "800" }}>
                        {duelWinnerMessage || "Maç berabere bitti"}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "left", marginTop: "6px" }}>
                  {completeAnswerKey.length === 0 ? (
                    <div style={{ padding: "24px 0", color: "#71717a", fontSize: "18px", textAlign: "center" }}>
                      Henüz cevap kaydı bulunmuyor.
                    </div>
                  ) : (
                    completeAnswerKey.map((item, index) => {
                      const isOpen = expandedAnswerIndex === index;
                      const icon =
                        item.status === "correct"
                          ? "✓"
                          : item.status === "wrong"
                            ? "✕"
                            : item.status === "passed"
                              ? "•"
                              : "-";

                      const iconColor =
                        item.status === "correct"
                          ? "#fbbf24"
                          : item.status === "wrong"
                            ? "#475569"
                            : item.status === "passed"
                              ? "#f59e0b"
                              : "#94a3b8";

                      return (
                        <div
                          key={`${(item.letter || "").toLocaleUpperCase("tr-TR")}-${index}`}
                          style={{
                            borderBottom: "1px solid #e4e4e7",
                            padding: "0",
                          }}
                        >
                          <button
                            onClick={() => setExpandedAnswerIndex(isOpen ? null : index)}
                            style={{
                              width: "100%",
                              background: "transparent",
                              border: "none",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "16px",
                              padding: "22px 0",
                              textAlign: "left",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: 0 }}>
                              <span
                                style={{
                                  width: "32px",
                                  textAlign: "center",
                                  color: iconColor,
                                  fontSize: "24px",
                                  fontWeight: "800",
                                  flexShrink: 0,
                                }}
                              >
                                {icon}
                              </span>
                              <span
                                style={{
                                  color:
                                    item.status === "correct"
                                      ? "#f8fafc"
                                      : item.status === "unanswered"
                                        ? "#94a3b8"
                                        : "#cbd5e1",
                                  fontSize: "20px",
                                  fontWeight: "700",
                                  wordBreak: "break-word",
                                }}
                              >
                                {item.correctAnswer}
                              </span>
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexShrink: 0 }}>
                              <span
                                style={{
                                  color: item.status === "correct" ? "#f8fafc" : "#94a3b8",
                                  fontSize: "18px",
                                  fontWeight: "700",
                                }}
                              >
                                {item.letter}
                              </span>
                              <span
                                style={{
                                  color: "#94a3b8",
                                  fontSize: "20px",
                                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                                  transition: "transform 180ms ease",
                                }}
                              >
                                ⌄
                              </span>
                            </div>
                          </button>

                          {isOpen && (
                            <div
                              style={{
                                padding: "0 0 20px 48px",
                                color: "#cbd5e1",
                                fontSize: "16px",
                                lineHeight: 1.7,
                              }}
                            >
                              <div style={{ marginBottom: "8px" }}>
                                <strong>Soru:</strong> {item.question}
                              </div>
                              <div style={{ marginBottom: "8px" }}>
                                <strong>Senin cevabın:</strong> {item.userAnswer || "-"}
                              </div>
                              <div>
                                <strong>Doğru cevap:</strong> {item.correctAnswer}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "14px",
                  flexWrap: "wrap",
                  marginTop: "26px",
                }}
              >

              </div>
            </div>
          </div>
        ) : !duelWaitingForOpponent ? (
          <div
            style={{
              background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.94))",
              borderRadius: "18px",
              padding: "24px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <h2 style={{ marginTop: 0, color: "#93c5fd" }}>Soru</h2>
            <p style={{ fontSize: "22px", marginBottom: "20px", color: "#e2e8f0", lineHeight: 1.45 }}>{question.questionText}</p>

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <input
                type="text"
                disabled={isPaused || duelWaitingForOpponent}
                placeholder="Cevabınızı yazın"
                value={userAnswer}
                onChange={(e) => {
                  setUserAnswer(e.target.value);
                  if (resultMessage === "Lütfen bir cevap yazın") {
                    setResultMessage("");
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
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

              <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => passQuestion()}
                  type="button"
                  style={secondaryButtonStyle}
                  disabled={isPaused || duelWaitingForOpponent}
                >
                  Pas
                </button>

                <button
                  onClick={() => checkAnswer()}
                  type="button"
                  style={primaryButtonStyle}
                  disabled={isPaused || duelWaitingForOpponent}
                >
                  Cevabı Kontrol Et
                </button>
              </div>
            </div>
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
        ) : null}
      </div>
    </div>
  );
}

export default App;