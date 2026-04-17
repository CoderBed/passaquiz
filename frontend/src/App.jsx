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
    return () => {
      if (!roomCode || !currentUser?.id) return;

      const payload = JSON.stringify({ playerId: currentUser.id });
      navigator.sendBeacon(
        `http://localhost:8080/api/duel/rooms/${roomCode}/leave`,
        new Blob([payload], { type: "application/json" })
      );
    };
  }, [roomCode, currentUser?.id]);

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
  const [duelSharedStartTime, setDuelSharedStartTime] = useState(null);
  const [dailyResult, setDailyResult] = useState(null);
  const [dailyCountdownSeconds, setDailyCountdownSeconds] = useState(0);
  const [authUserId, setAuthUserId] = useState(null);
  const [scorePop, setScorePop] = useState(false);
  const [isGuestUser, setIsGuestUser] = useState(false);
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
  const previousGameModeRef = useRef("classic");
  const latestDuelSessionRef = useRef({ roomCode: null, playerId: null });
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
  const [questionFeedbackSummary, setQuestionFeedbackSummary] = useState(null);
  const [questionFeedbackLoading, setQuestionFeedbackLoading] = useState(false);
  const [duelReaction, setDuelReaction] = useState(null);
  const [lastSeenReactionId, setLastSeenReactionId] = useState(null);
  const [showDuelReaction, setShowDuelReaction] = useState(false);
  const [showDuelEmojiPicker, setShowDuelEmojiPicker] = useState(false);
  const [duelEmojiCooldownUntil, setDuelEmojiCooldownUntil] = useState(0);
  const duelEmojiPickerRef = useRef(null);
  const duelOpponentPresentRef = useRef(false);
  const finishedDuelSnapshotRef = useRef(null);

  const currentUser = {
    id: authUserId,
    name: authUserName,
    email: authUserEmail,
  };

  const activeDuelRoomCode =
    duelRoomData?.roomCode ?? duelRoomData?.code ?? duelRoomCode ?? null;

  const duelSharedStartStorageKey = activeDuelRoomCode ? `duelStart_${activeDuelRoomCode}` : null;
  const duelEmojiCooldownRemaining = Math.max(0, duelEmojiCooldownUntil - Date.now());
  const duelEmojiCooldownSeconds = Math.ceil(duelEmojiCooldownRemaining / 1000);
  const isDuelEmojiOnCooldown = duelEmojiCooldownRemaining > 0;

  const isDuelPlayer1 = duelRoomData?.player1Id === currentUser?.id;

  const duelOpponentName = isDuelPlayer1
    ? duelRoomData?.player2Name || "Rakip"
    : duelRoomData?.player1Name || "Rakip";

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

    const roomCodeValue = room?.roomCode || room?.code || "";
    const storageKey = roomCodeValue ? `duelStart_${roomCodeValue}` : null;
    const backendSharedStartAt = room?.gameStartAt || room?.startAt || room?.matchStartAt || null;
    const storedSharedStartAt = storageKey ? localStorage.getItem(storageKey) : null;
    const sharedDuelStartAt = backendSharedStartAt || storedSharedStartAt || new Date().toISOString();

    if (storageKey) {
      localStorage.setItem(storageKey, sharedDuelStartAt);
    }

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
    setGameMode("duel");
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
    setDuelRoomCode(roomCodeValue);
    setDuelRoomData(room || null);
    setDuelSharedStartTime(sharedDuelStartAt);
    setDuelWaitingForOpponent(false);
    setCurrentCorrectStreak(0);
    setMaxCorrectStreak(0);
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

    if (gameMode === "duel" && duelSharedStartTime) {
      const startTimestamp = new Date(duelSharedStartTime).getTime();

      if (Number.isNaN(startTimestamp)) {
        return;
      }

      const updateSharedDuelTimer = () => {
        const elapsedSeconds = Math.floor((Date.now() - startTimestamp) / 1000);
        const remainingSeconds = Math.max(selectedDuration - elapsedSeconds, 0);

        setTimeLeft(remainingSeconds);

        if (remainingSeconds <= 0) {
          finishGame();
        }
      };

      updateSharedDuelTimer();
      const intervalId = setInterval(updateSharedDuelTimer, 250);

      return () => clearInterval(intervalId);
    }

    if (timeLeft <= 0) {
      finishGame();
      return;
    }

    const intervalId = setInterval(() => {
      setTimeLeft((prevTime) => {
        const nextTime = prevTime - 1;

        if (nextTime <= 0) {
          clearInterval(intervalId);
          setTimeout(() => finishGame(), 0);
          return 0;
        }

        return nextTime;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [gameStarted, gameFinished, isPaused, duelWaitingForOpponent, gameMode, duelSharedStartTime, selectedDuration, timeLeft]);

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

  useEffect(() => {
    if (gameMode !== "duel") return;

    const backendSharedStartAt =
      duelRoomData?.gameStartAt || duelRoomData?.startAt || duelRoomData?.matchStartAt || null;
    const storedSharedStartAt = duelSharedStartStorageKey
      ? localStorage.getItem(duelSharedStartStorageKey)
      : null;
    const resolvedSharedStartAt = backendSharedStartAt || storedSharedStartAt || null;

    if (resolvedSharedStartAt) {
      setDuelSharedStartTime(resolvedSharedStartAt);

      if (duelSharedStartStorageKey && resolvedSharedStartAt !== storedSharedStartAt) {
        localStorage.setItem(duelSharedStartStorageKey, resolvedSharedStartAt);
      }
    }
  }, [gameMode, duelRoomData, duelSharedStartStorageKey]);

  useEffect(() => {
    if (!duelSharedStartStorageKey) return;

    const handleStorageChange = (event) => {
      if (event.key === duelSharedStartStorageKey && event.newValue) {
        setDuelSharedStartTime(event.newValue);
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [duelSharedStartStorageKey]);

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

  const activePlayerId = authUserId ?? currentUser?.id ?? null;

  useEffect(() => {
    const resolvedRoomCode = activeDuelRoomCode || duelRoomCode || duelRoomData?.roomCode || duelRoomData?.code || null;

    if (gameMode === "duel" && resolvedRoomCode && activePlayerId) {
      latestDuelSessionRef.current = {
        roomCode: resolvedRoomCode,
        playerId: activePlayerId,
      };
    }
  }, [gameMode, activeDuelRoomCode, duelRoomCode, duelRoomData, activePlayerId]);

  const restartGame = async () => {
    if (gameMode === "duel" && duelRoomCode && activePlayerId) {
      await leaveDuelRoom();
    }
    resultSavedRef.current = false;
    duelResultSavedRef.current = false;
    finishedDuelSnapshotRef.current = null;
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
      if (duelSharedStartStorageKey) {
        localStorage.removeItem(duelSharedStartStorageKey);
      }
      setDuelWaitingForOpponent(false);
      setDuelRoomData(null);
      setDuelRoomCode("");
      setDuelSharedStartTime(null);
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
    if (gameMode === "duel" && duelRoomCode && activePlayerId) {
      await leaveDuelRoom();
    }
    resultSavedRef.current = false;
    duelResultSavedRef.current = false;
    finishedDuelSnapshotRef.current = null;
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
    if (duelSharedStartStorageKey) {
      localStorage.removeItem(duelSharedStartStorageKey);
    }
    setQuestions([]);
    setDuelRoomCode("");
    setDuelRoomData(null);
    setDuelSharedStartTime(null);
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

  const handleGuestLogin = async () => {
    try {
      const response = await fetch("http://localhost:8080/api/auth/guest-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await response.json();

      if (!response.ok) {
        alert("Misafir girişi başarısız.");
        return;
      }

      sessionStorage.setItem("token", data.token);

      setIsAuthenticated(true);
      setIsGuestUser(true);

      setAuthUserId(data.id ?? `guest_${Date.now()}`);

      setAuthUserName(data.name || "Misafir");
      setAuthUserEmail(data.email || "");
      setAuthUserImage("");
    } catch (error) {
      console.error("Guest login error:", error);
      alert("Misafir girişi sırasında bir hata oluştu.");
    }
  };

  const handleLogout = async () => {
    if (gameMode === "duel" && duelRoomCode && activePlayerId) {
      try {
        await leaveDuelRoom();
      } catch (error) {
        console.error("Çıkış öncesi düello odası bildirilemedi:", error);
      }
    }
    sessionStorage.removeItem("token");

    setIsAuthenticated(false);
    setIsGuestUser(false);
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
    if (duelSharedStartStorageKey) {
      localStorage.removeItem(duelSharedStartStorageKey);
    }
    setDuelRoomCode("");
    setDuelRoomData(null);
    setDuelSharedStartTime(null);
    setDuelWaitingForOpponent(false);
    resultSavedRef.current = false;
    duelResultSavedRef.current = false;
    finishedDuelSnapshotRef.current = null;
    lastSavedDuelRoomCodeRef.current = "";
    previousScoreRef.current = 0;

    resetAuthForm();
  };

  const handleProfileImageChange = (event) => {
    if (effectiveIsGuestUser) return;

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
    if (!token || effectiveIsGuestUser) return;

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

    const isDraw =
      myScore === opponentScore &&
      myElapsedTime === opponentElapsedTime;

    const didWin =
      !isDraw &&
      (myScore > opponentScore ||
        (myScore === opponentScore && myElapsedTime < opponentElapsedTime));

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
          durationDifferenceSeconds:
            myElapsedTime === opponentElapsedTime
              ? 0
              : myElapsedTime < opponentElapsedTime
                ? Math.abs(opponentElapsedTime - myElapsedTime)
                : -Math.abs(myElapsedTime - opponentElapsedTime),
          winnerName: isDraw
            ? "-"
            : didWin
              ? (authUserName || authUserEmail || "Sen")
              : (isPlayer1
                  ? (roomData?.player2Name || roomData?.player2?.name || "Rakip")
                  : (roomData?.player1Name || roomData?.player1?.name || "Rakip")),
          duelRoomCode: currentRoomCode,
          won: didWin,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Düello sonucu kaydedilemedi: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      duelResultSavedRef.current = false;
      lastSavedDuelRoomCodeRef.current = "";
      console.error("Düello sonucu kaydedilemedi:", error);
      console.error("Düello sonucu kayıt debug:", {
        roomData,
        currentRoomCode,
        authUserId,
        authUserName,
        authUserEmail,
        tokenExists: Boolean(token),
      });
    }
  };

  const leaveDuelRoom = async () => {
    const roomCodeToLeave =
      activeDuelRoomCode ||
      duelRoomCode ||
      duelRoomData?.roomCode ||
      duelRoomData?.code ||
      latestDuelSessionRef.current.roomCode;
    const playerIdToLeave = activePlayerId || latestDuelSessionRef.current.playerId;
    const rawToken = sessionStorage.getItem("token");
    const authHeader = rawToken
      ? (rawToken.startsWith("Bearer ") ? rawToken : `Bearer ${rawToken}`)
      : null;

    console.log("leaveDuelRoom çağrıldı", {
      gameMode,
      duelRoomCode,
      activeDuelRoomCode,
      duelRoomData,
      activePlayerId,
      roomCodeToLeave,
      playerIdToLeave,
      latest: latestDuelSessionRef.current,
    });

    if (!roomCodeToLeave || !playerIdToLeave) {
      console.log("leaveDuelRoom erken çıktı");
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/api/duel/rooms/${roomCodeToLeave}/leave`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        keepalive: true,
        body: JSON.stringify({
          playerId: playerIdToLeave,
        }),
      });

      console.log("leave response status:", response.status);
    } catch (error) {
      console.error("Düello odasından çıkış bildirilemedi:", error);
    }
  };

  const returnToMainMenu = async () => {
    console.log("returnToMainMenu çalıştı", {
      gameMode,
      duelRoomCode,
      activePlayerId,
      latest: latestDuelSessionRef.current,
    });

    await leaveDuelRoom();

    if (duelSharedStartStorageKey) {
      localStorage.removeItem(duelSharedStartStorageKey);
    }

    finishedDuelSnapshotRef.current = null;
    previousGameModeRef.current = "classic";

    setGameMode("classic");
    setDuelRoomCode("");
    setDuelRoomData(null);
    setDuelWaitingForOpponent(false);
    setDuelSharedStartTime(null);
    setGameStarted(false);
  };

  const finishGame = async () => {
    if (resultSavedRef.current) return;
    resultSavedRef.current = true;

    const currentSessionMode = activeGameModeRef.current || gameMode;

    if (currentSessionMode === "duel") {
      const data = await submitDuelProgress(false);

      if (data?.player1Finished && data?.player2Finished) {
        finishedDuelSnapshotRef.current = data;
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

  const replayClassicGame = async () => {
    if (gameMode !== "classic") return;

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
    setAnswered(false);
    setPassedQueue([]);
    setIsReviewingPassed(false);
    setGameFinished(false);
    setGameStarted(false);
    setIsPaused(false);
    setQuestionStatuses([]);
    setQuestions([]);
    setTimeLeft(selectedDuration);
    setCurrentCorrectStreak(0);
    setMaxCorrectStreak(0);

    await startGame("classic");
  };

  const togglePause = () => {
    if (!gameStarted || gameFinished) return;
    setShowProfileMenu(false);
    setIsPaused((prev) => !prev);
  };

  const submitDuelProgress = async (abandoned = false) => {
    const roomCodeToSubmit =
      activeDuelRoomCode ||
      duelRoomCode ||
      duelRoomData?.roomCode ||
      duelRoomData?.code ||
      latestDuelSessionRef.current.roomCode;

    const playerIdToSubmit =
      activePlayerId || latestDuelSessionRef.current.playerId;

    if (!roomCodeToSubmit || !playerIdToSubmit) return null;
    const rawToken = sessionStorage.getItem("token");
    const authHeader = rawToken
      ? (rawToken.startsWith("Bearer ") ? rawToken : `Bearer ${rawToken}`)
      : null;

    const elapsed = selectedDuration - timeLeft;

    try {
      const response = await fetch(`http://localhost:8080/api/duel/rooms/${roomCodeToSubmit}/finish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: JSON.stringify({
          playerId: playerIdToSubmit,
          score,
          elapsedTime: elapsed,
          correctCount,
          wrongCount,
          passedCount,
          abandoned,
        }),
      });

      const raw = await response.text();

      if (!response.ok) {
        console.error("Düello finish isteği başarısız oldu:", response.status, raw);
        return {
          authError: response.status === 401 || response.status === 403,
          statusCode: response.status,
          raw,
        };
      }

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
    if (!token || effectiveIsGuestUser) return;

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
    if (!token || effectiveIsGuestUser) return;

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
        const normalized = data.map((item) => {
          const scoreText = String(item?.score ?? "0").trim();
          const opponentScoreText = String(item?.opponentScore ?? "0").trim();
          const durationDifferenceText = String(item?.durationDifferenceSeconds ?? "0").trim();
          const winnerNameText = String(item?.winnerName ?? "").trim();

          const isDraw =
            (scoreText === opponentScoreText &&
              (durationDifferenceText === "0" ||
               durationDifferenceText === "0.0" ||
               durationDifferenceText === "0.00")) ||
            winnerNameText === "-";

          const resultLabel = isDraw
            ? "Beraberlik"
            : item?.won
              ? "Galibiyet"
              : "Mağlubiyet";

          const resultColor = isDraw
            ? "#facc15"
            : item?.won
              ? "#22c55e"
              : "#f87171";

          return {
            ...item,
            isDraw,
            resultLabel,
            resultColor,
          };
        });

        const sorted = [...normalized].sort((a, b) => {
          const dateA = new Date(a.playedAt || 0).getTime();
          const dateB = new Date(b.playedAt || 0).getTime();
          return dateB - dateA;
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

  const effectiveIsGuestUser =
    isGuestUser ||
    (typeof authUserEmail === "string" && authUserEmail.endsWith("@guest.local")) ||
    (typeof currentUser?.email === "string" && currentUser.email.endsWith("@guest.local"));

  const guestAvatarPalettes = [
    ["#60a5fa", "#2563eb"],
    ["#a78bfa", "#7c3aed"],
    ["#34d399", "#059669"],
    ["#f59e0b", "#ea580c"],
    ["#f472b6", "#db2777"],
    ["#22d3ee", "#0891b2"],
    ["#f87171", "#dc2626"],
    ["#4ade80", "#16a34a"],
  ];

  const getGuestAvatarStyle = (seedValue) => {
    const seed = String(seedValue || "guest");
    let hash = 0;

    for (let i = 0; i < seed.length; i += 1) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }

    const palette = guestAvatarPalettes[Math.abs(hash) % guestAvatarPalettes.length];

    return {
      background: `radial-gradient(circle at top, ${palette[0]}, ${palette[1]})`,
      boxShadow: `inset 0 0 18px rgba(255,255,255,0.12), 0 10px 24px ${palette[1]}55`,
    };
  };

  const guestAvatarSeed = authUserEmail || authUserName || currentUser?.email || "guest";

  const getGuestVoteStorageKey = () => {
    const guestId = authUserId ?? currentUser?.id ?? authUserEmail ?? "guest";
    return `guestQuestionVotes_${guestId}`;
  };

  const readGuestVotesFromSession = () => {
    try {
      const raw = sessionStorage.getItem(getGuestVoteStorageKey());
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  const writeGuestVoteToSession = (questionId, reactionType) => {
    try {
      const existing = readGuestVotesFromSession();
      const updated = {
        ...existing,
        [questionId]: reactionType,
      };
      sessionStorage.setItem(getGuestVoteStorageKey(), JSON.stringify(updated));
      return updated;
    } catch {
      return readGuestVotesFromSession();
    }
  };

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

  const effectiveDuelRoomData =
    gameMode === "duel" && gameFinished && finishedDuelSnapshotRef.current
      ? finishedDuelSnapshotRef.current
      : duelRoomData;

  const duelOpponentScore = isDuelPlayer1
    ? effectiveDuelRoomData?.player2Score
    : effectiveDuelRoomData?.player1Score;

  const duelMyRecordedScore = isDuelPlayer1
    ? effectiveDuelRoomData?.player1Score
    : effectiveDuelRoomData?.player2Score;

  const duelOpponentElapsedTime = isDuelPlayer1
    ? effectiveDuelRoomData?.player2ElapsedTime
    : effectiveDuelRoomData?.player1ElapsedTime;

  const duelOpponentCorrectCount = isDuelPlayer1
    ? effectiveDuelRoomData?.player2CorrectCount
    : effectiveDuelRoomData?.player1CorrectCount;

  const duelOpponentWrongCount = isDuelPlayer1
    ? effectiveDuelRoomData?.player2WrongCount
    : effectiveDuelRoomData?.player1WrongCount;

  const duelOpponentPassedCount = isDuelPlayer1
    ? effectiveDuelRoomData?.player2PassedCount
    : effectiveDuelRoomData?.player1PassedCount;

  const duelWinnerInfo = (() => {
    if (gameMode !== "duel" || !effectiveDuelRoomData) {
      return {
        winnerName: "",
        message: "",
      };
    }
    if (!effectiveDuelRoomData?.player1Finished || !effectiveDuelRoomData?.player2Finished) {
      return {
        winnerName: "",
        message: "",
      };
    }

    const player1Score = Number(effectiveDuelRoomData?.player1Score ?? 0);
    const player2Score = Number(effectiveDuelRoomData?.player2Score ?? 0);

    const player1ElapsedTime = Number(
      effectiveDuelRoomData?.player1ElapsedTime ?? Number.MAX_SAFE_INTEGER
    );
    const player2ElapsedTime = Number(
      effectiveDuelRoomData?.player2ElapsedTime ?? Number.MAX_SAFE_INTEGER
    );

    const player1Name = effectiveDuelRoomData?.player1Name || "Oyuncu 1";
    const player2Name = effectiveDuelRoomData?.player2Name || "Oyuncu 2";

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
    const hasCompleteFinishedSnapshot =
      Boolean(finishedDuelSnapshotRef.current?.player1Finished) &&
      Boolean(finishedDuelSnapshotRef.current?.player2Finished);

    if (gameMode !== "duel" || !duelRoomCode || hasCompleteFinishedSnapshot) return;

    let stopped = false;
    let intervalId = null;

    const fetchDuelRoom = async () => {
      try {
        const rawToken = sessionStorage.getItem("token");
        if (!rawToken || stopped) return;

        const authHeader = rawToken.startsWith("Bearer ") ? rawToken : `Bearer ${rawToken}`;

        const response = await fetch(`http://localhost:8080/api/duel/rooms/${duelRoomCode}`, {
          headers: {
            Authorization: authHeader,
          },
          cache: "no-store",
        });

        if (response.status === 401 || response.status === 403) {
          stopped = true;
          if (intervalId) clearInterval(intervalId);
          return;
        }

        if (!response.ok) return;

        const raw = await response.text();
        if (!raw || stopped) return;

        const data = JSON.parse(raw);
        if (stopped) return;

        const preserveFinishedSnapshot =
          Boolean(finishedDuelSnapshotRef.current?.player1Finished) &&
          Boolean(finishedDuelSnapshotRef.current?.player2Finished);

        const mergedRoomData = preserveFinishedSnapshot
          ? {
              ...finishedDuelSnapshotRef.current,
              ...data,
              player1Id: data?.player1Id ?? finishedDuelSnapshotRef.current?.player1Id,
              player1Name: data?.player1Name ?? finishedDuelSnapshotRef.current?.player1Name,
              player1Score: data?.player1Score ?? finishedDuelSnapshotRef.current?.player1Score,
              player1ElapsedTime: data?.player1ElapsedTime ?? finishedDuelSnapshotRef.current?.player1ElapsedTime,
              player1CorrectCount: data?.player1CorrectCount ?? finishedDuelSnapshotRef.current?.player1CorrectCount,
              player1WrongCount: data?.player1WrongCount ?? finishedDuelSnapshotRef.current?.player1WrongCount,
              player1PassedCount: data?.player1PassedCount ?? finishedDuelSnapshotRef.current?.player1PassedCount,
              player1Finished: data?.player1Finished ?? finishedDuelSnapshotRef.current?.player1Finished,
              player2Id: data?.player2Id ?? finishedDuelSnapshotRef.current?.player2Id,
              player2Name: data?.player2Name ?? finishedDuelSnapshotRef.current?.player2Name,
              player2Score: data?.player2Score ?? finishedDuelSnapshotRef.current?.player2Score,
              player2ElapsedTime: data?.player2ElapsedTime ?? finishedDuelSnapshotRef.current?.player2ElapsedTime,
              player2CorrectCount: data?.player2CorrectCount ?? finishedDuelSnapshotRef.current?.player2CorrectCount,
              player2WrongCount: data?.player2WrongCount ?? finishedDuelSnapshotRef.current?.player2WrongCount,
              player2PassedCount: data?.player2PassedCount ?? finishedDuelSnapshotRef.current?.player2PassedCount,
              player2Finished: data?.player2Finished ?? finishedDuelSnapshotRef.current?.player2Finished,
            }
          : data;

        setDuelRoomData(mergedRoomData);

        const currentPlayerId = String(activePlayerId ?? "");
        const hasOpponentNow = [mergedRoomData?.player1Id, mergedRoomData?.player2Id]
          .filter((id) => id != null)
          .some((id) => String(id) !== currentPlayerId);

        const duelCompleted =
          mergedRoomData?.status === "FINISHED" ||
          (mergedRoomData?.player1Finished && mergedRoomData?.player2Finished);

        const hadOpponent = duelOpponentPresentRef.current;
        duelOpponentPresentRef.current = hasOpponentNow;

        if (hadOpponent && !hasOpponentNow && !duelCompleted && !gameFinished) {
          setDuelWaitingForOpponent(false);
          setGameStarted(false);
          alert("Rakibin odadan ayrıldı.");
        }

        if (duelCompleted) {
          finishedDuelSnapshotRef.current = mergedRoomData;
          setDuelWaitingForOpponent(false);
          setGameFinished(true);
          setDuelRoomData(mergedRoomData);
          saveDuelGameResult(mergedRoomData);
        }
      } catch (error) {
        if (!stopped) {
          console.error("Düello oda polling hatası:", error);
        }
      }
    };

    fetchDuelRoom();
    intervalId = setInterval(fetchDuelRoom, 1500);

    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [gameMode, duelRoomCode, activePlayerId, gameFinished, duelRoomData]);

  useEffect(() => {
    if (gameMode !== "duel") {
      duelOpponentPresentRef.current = false;
      return;
    }

    const currentPlayerId = String(activePlayerId ?? "");
    const hasOpponent = [duelRoomData?.player1Id, duelRoomData?.player2Id]
      .filter((id) => id != null)
      .some((id) => String(id) !== currentPlayerId);

    duelOpponentPresentRef.current = hasOpponent;
  }, [gameMode, duelRoomData, activePlayerId]);

  useEffect(() => {
    const handlePageHide = () => {
      if (gameMode !== "duel") return;

      const roomCodeToLeave =
        activeDuelRoomCode ||
        duelRoomCode ||
        duelRoomData?.roomCode ||
        duelRoomData?.code ||
        latestDuelSessionRef.current.roomCode;

      const playerIdToLeave =
        activePlayerId || latestDuelSessionRef.current.playerId;

      if (!roomCodeToLeave || !playerIdToLeave) return;

      const payload = JSON.stringify({ playerId: playerIdToLeave });

      navigator.sendBeacon(
        `http://localhost:8080/api/duel/rooms/${roomCodeToLeave}/leave`,
        new Blob([payload], { type: "application/json" })
      );
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [gameMode, activeDuelRoomCode, duelRoomCode, duelRoomData, activePlayerId]);

  useEffect(() => {
    if (gameMode !== "duel") return;
    if (!gameFinished) return;

    const finalRoomData = finishedDuelSnapshotRef.current || duelRoomData;
    if (!finalRoomData?.player1Finished || !finalRoomData?.player2Finished) return;

    saveDuelGameResult(finalRoomData);
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

  async function sendDuelReaction(emoji) {
    if (gameMode !== "duel" || !activeDuelRoomCode || gameFinished || isDuelEmojiOnCooldown) return;

    const rawToken = sessionStorage.getItem("token");
    if (!rawToken) return;

    const authHeader = rawToken.startsWith("Bearer ") ? rawToken : `Bearer ${rawToken}`;

    try {
      const response = await fetch("http://localhost:8080/api/duel-reactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify({
          roomCode: activeDuelRoomCode,
          emoji,
        }),
      });

      if (!response.ok) {
        throw new Error("Duel reaction request failed");
      }
      setDuelEmojiCooldownUntil(Date.now() + 10000);
    } catch (error) {
      console.error("Düello emojisi gönderilemedi:", error);
    }
  }

  useEffect(() => {
    if (gameMode !== "duel" || !activeDuelRoomCode || gameFinished || !isAuthenticated) {
      setDuelReaction(null);
      setShowDuelReaction(false);
      return;
    }

    let isStopped = false;

    const intervalId = setInterval(async () => {
      try {
        const rawToken = sessionStorage.getItem("token");
        if (!rawToken || isStopped) return;

        const authHeader = rawToken.startsWith("Bearer ") ? rawToken : `Bearer ${rawToken}`;

        const response = await fetch(
          `http://localhost:8080/api/duel-reactions/latest?roomCode=${activeDuelRoomCode}`,
          {
            headers: {
              Authorization: authHeader,
            },
            cache: "no-store",
          }
        );

        if (response.status === 401 || response.status === 403) {
          isStopped = true;
          clearInterval(intervalId);
          console.error("Düello emojisi isteği yetki nedeniyle durduruldu:", response.status);
          return;
        }

        if (!response.ok) {
          return;
        }

        const rawText = await response.text();
        if (!rawText || rawText === "null") return;

        const data = JSON.parse(rawText);
        if (!data || !data.id) return;
        if (data.roomCode && activeDuelRoomCode && data.roomCode !== activeDuelRoomCode) return;

        const currentReactionOwner = authUserName || currentUser?.name || authUserEmail || null;
        const isOwnReaction =
          (typeof data.senderId !== "undefined" &&
            data.senderId !== null &&
            currentUser?.id != null &&
            data.senderId === currentUser.id) ||
          (currentReactionOwner && data.senderName && data.senderName === currentReactionOwner);

        if (data.id !== lastSeenReactionId && !isOwnReaction) {
          setDuelReaction(data);
          setLastSeenReactionId(data.id);
          setShowDuelReaction(true);
        }
      } catch (error) {
        if (!isStopped) {
          console.error("Düello emojisi alınamadı:", error);
        }
      }
    }, 1500);

    return () => {
      isStopped = true;
      clearInterval(intervalId);
    };
  }, [gameMode, activeDuelRoomCode, gameFinished, isAuthenticated, lastSeenReactionId, currentUser?.id, authUserName, authUserEmail]);

  useEffect(() => {
    if (!showDuelReaction) return;

    const timeoutId = setTimeout(() => {
      setShowDuelReaction(false);
    }, 2500);

    return () => clearTimeout(timeoutId);
  }, [showDuelReaction]);

  useEffect(() => {
    if (!duelEmojiCooldownUntil) return;

    const intervalId = setInterval(() => {
      if (Date.now() >= duelEmojiCooldownUntil) {
        setDuelEmojiCooldownUntil(0);
      }
    }, 250);

    return () => clearInterval(intervalId);
  }, [duelEmojiCooldownUntil]);

  useEffect(() => {
    if (!showDuelEmojiPicker) return;

    function handleClickOutside(event) {
      if (duelEmojiPickerRef.current && !duelEmojiPickerRef.current.contains(event.target)) {
        setShowDuelEmojiPicker(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDuelEmojiPicker]);

  const duelEmojiOptions = [
    "👍",
    "😅",
    "🔥",
    "😂",
    "😡",
    "😉",
    "👎",
    "🤫",
    "😩",
  ];

    // Question feedback helpers and effect
    function buildQuestionFeedbackKey(q, mode) {
      if (!q || !q.id) return null;
      return `${q.id}:${mode}`;
    }


    async function fetchQuestionFeedbackSummary(questionObj, mode = gameMode) {
      if (!questionObj?.id) {
        setQuestionFeedbackSummary(null);
        return;
      }

      const token = sessionStorage.getItem("token");
      if (!token) {
        setQuestionFeedbackSummary(null);
        return;
      }

      const safeGameMode = ["classic", "daily", "duel"].includes(mode) ? mode : "classic";

      setQuestionFeedbackLoading(true);

      try {
        const response = await fetch(
          `http://localhost:8080/api/question-feedback/summary/${questionObj.id}?gameMode=${safeGameMode}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error("Question feedback summary request failed");
        }

        const data = await response.json();
        const guestVotes = effectiveIsGuestUser ? readGuestVotesFromSession() : {};
        const guestReaction = effectiveIsGuestUser ? guestVotes[questionObj.id] ?? null : null;
        setQuestionFeedbackSummary((prev) => ({
          questionId: questionObj.id,
          likeCount: typeof data?.likeCount === "number" ? data.likeCount : prev?.likeCount ?? 0,
          dislikeCount: typeof data?.dislikeCount === "number" ? data.dislikeCount : prev?.dislikeCount ?? 0,
          hasVoted: effectiveIsGuestUser
            ? Boolean(guestReaction)
            : (typeof data?.hasVoted === "boolean" ? data.hasVoted : prev?.hasVoted ?? false),
          userReaction: effectiveIsGuestUser
            ? guestReaction
            : (data?.userReaction ?? prev?.userReaction ?? null),
        }));
      } catch (error) {
        console.error("Question feedback özeti alınamadı:", error);
      } finally {
        setQuestionFeedbackLoading(false);
      }
    }

    async function sendQuestionFeedback(questionObj, reaction) {
      if (!questionObj?.id) return;
      if (typeof reaction !== "string") return;
      if (questionFeedbackSummary?.hasVoted) return;

      const token = sessionStorage.getItem("token");
      if (!token) return;

      const safeGameMode = ["classic", "daily", "duel"].includes(gameMode) ? gameMode : "classic";

      if (effectiveIsGuestUser) {
        const guestVotes = readGuestVotesFromSession();
        if (guestVotes[questionObj.id]) return;
      }

      try {
        const response = await fetch("http://localhost:8080/api/question-feedback", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            questionId: questionObj.id,
            reaction,
            gameMode: safeGameMode,
          }),
        });

        if (!response.ok) {
          throw new Error("Question feedback request failed");
        }

        if (effectiveIsGuestUser) {
          writeGuestVoteToSession(questionObj.id, reaction);
        }
        setQuestionFeedbackSummary((prev) => {
          const previousLikeCount = prev?.likeCount ?? 0;
          const previousDislikeCount = prev?.dislikeCount ?? 0;

          return {
            questionId: questionObj.id,
            likeCount: reaction === "LIKE" ? previousLikeCount + 1 : previousLikeCount,
            dislikeCount: reaction === "DISLIKE" ? previousDislikeCount + 1 : previousDislikeCount,
            hasVoted: true,
            userReaction: reaction,
          };
        });

        fetchQuestionFeedbackSummary(questionObj, safeGameMode).catch(() => {});
      } catch (error) {
        console.error("Question feedback kaydedilemedi:", error);
      }
    }

    useEffect(() => {
      if (!gameStarted) {
        setQuestionFeedbackSummary(null);
        return;
      }

      const activeQuestion = questions[currentIndex];

      if (!activeQuestion?.id) {
        setQuestionFeedbackSummary(null);
        return;
      }

      setQuestionFeedbackSummary(null);
      fetchQuestionFeedbackSummary(activeQuestion, gameMode);
    }, [gameStarted, currentIndex, gameMode, questions]);


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
                placeholder="Kullanıcı Adı"
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

          <p
            onClick={handleGuestLogin}
            style={{
              marginTop: "6px",
              marginBottom: "4px",
              color: "#94a3b8",
              fontSize: "14px",
              cursor: "pointer",
              opacity: authLoading ? 0.6 : 1,
            }}
          >
            Misafir olarak devam et
          </p>
          <button
            onClick={authMode === "login" ? handleLogin : handleRegister}
            disabled={authLoading}
            style={{
              ...(authMode === "login" ? primaryButtonStyle : successButtonStyle),
              marginTop: "14px",
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
                onClick={returnToMainMenu}
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
                        ...(effectiveIsGuestUser ? getGuestAvatarStyle(guestAvatarSeed) : {
                          background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.85), rgba(37, 99, 235, 0.95))",
                        }),
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

                    {!effectiveIsGuestUser && (
                      <>
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
                      </>
                    )}
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
                onClick={returnToMainMenu}
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
                        ...(effectiveIsGuestUser ? getGuestAvatarStyle(guestAvatarSeed) : {
                          background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.85), rgba(37, 99, 235, 0.95))",
                        }),
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

                   {!effectiveIsGuestUser && (
                      <>
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
                      </>
                    )}
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
                      { label: "Günlük oyun sayısı", value: profileStats?.dailyWins ?? 0, color: "#a78bfa" },
                      {
                        label: "Düello galibiyet / beraberlik / mağlubiyet",
                        value: `${profileStats?.duelWins ?? 0} / ${profileStats?.duelDraws ?? 0} / ${profileStats?.duelLosses ?? 0}`,
                        color: "#f87171"
                      },
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
                    {duelHistory.map((item) => {
                      const scoreText = String(item.score ?? "0").trim();
                      const opponentScoreText = String(item.opponentScore ?? "0").trim();
                      const durationDifferenceText = String(item.durationDifferenceSeconds ?? "0").trim();
                      const winnerNameText = String(item.winnerName ?? "").trim();

                      const durationValue = parseFloat(durationDifferenceText);

                      const isDraw =
                        (scoreText === opponentScoreText && durationValue === 0) ||
                        winnerNameText === "-";

                      const resultLabel = isDraw
                        ? "Beraberlik"
                        : item.won
                          ? "Galibiyet"
                          : "Mağlubiyet";

                      const resultColor = isDraw
                        ? "#facc15"
                        : item.won
                          ? "#22c55e"
                          : "#f87171";

                      return (
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
                                color: resultColor,
                                fontSize: "15px",
                                fontWeight: "800",
                              }}
                            >
                              {resultLabel}
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
                              <strong>Süre farkı:</strong> {Number(item.durationDifferenceSeconds ?? 0) > 0
                                ? `+${item.durationDifferenceSeconds}`
                                : item.durationDifferenceSeconds ?? 0} sn
                            </div>
                            <div style={{ color: "#e2e8f0" }}>
                              <strong>Tarih:</strong> {item.playedAt ? new Date(item.playedAt).toLocaleString("tr-TR") : "-"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                      title: "Üst üste 5 oyunda en az 200 puan topla",
                      earned: Boolean((profileStats?.best200ScoreStreak ?? 0) >= 5),
                      progress: `${Math.min(profileStats?.best200ScoreStreak ?? 0, 5)}/5`,
                    },
                    {
                      title: "7 gün üst üste giriş yap",
                      earned: Boolean((profileStats?.loginStreak ?? 0) >= 7),
                      progress: `${Math.min(profileStats?.loginStreak ?? 0, 7)}/7`,
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
                                        title: "Aynı rakibi 3 kez mağlup et",
                                        earned: Boolean((profileStats?.sameOpponentWinCount ?? 0) >= 3),
                                        progress: `${Math.min(profileStats?.sameOpponentWinCount ?? 0, 3)}/3`,
                                      },
                                      {
                                        title: "Üst üste 5 düello kazan",
                                        earned: Boolean((profileStats?.duelWinStreak ?? 0) >= 5),
                                        progress: `${Math.min(profileStats?.duelWinStreak ?? 0, 5)}/5`,
                                      },
                                      {
                                        title: "10 farklı rakibi mağlup et",
                                        earned: Boolean((profileStats?.uniqueOpponentWinCount ?? 0) >= 10),
                                        progress: `${Math.min(profileStats?.uniqueOpponentWinCount ?? 0, 10)}/10`,
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
                    {duelHistory.map((item) => {
                      const scoreText = String(item.score ?? "0").trim();
                      const opponentScoreText = String(item.opponentScore ?? "0").trim();
                      const durationDifferenceText = String(item.durationDifferenceSeconds ?? "0").trim();
                      const winnerNameText = String(item.winnerName ?? "").trim();

                      const durationValue = parseFloat(durationDifferenceText);

                      const isDraw =
                        (scoreText === opponentScoreText && (durationValue === 0)) ||
                        winnerNameText === "-";

                      const resultLabel = isDraw
                        ? "Beraberlik"
                        : item.won
                          ? "Galibiyet"
                          : "Mağlubiyet";

                      const resultColor = isDraw
                        ? "#facc15"
                        : item.won
                          ? "#22c55e"
                          : "#f87171";

                      return (
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
                                color: resultColor,
                                fontSize: "15px",
                                fontWeight: "800",
                              }}
                            >
                              {resultLabel}
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
                              <strong>Süre farkı:</strong> {Number(item.durationDifferenceSeconds ?? 0) > 0
                                ? `+${item.durationDifferenceSeconds}`
                                : item.durationDifferenceSeconds ?? 0} sn
                            </div>
                            <div style={{ color: "#e2e8f0" }}>
                              <strong>Tarih:</strong> {item.playedAt ? new Date(item.playedAt).toLocaleString("tr-TR") : "-"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
  const durationOptions = [180, 210, 240, 270, 300, 330, 360];

  const formatDurationLabel = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (remainingSeconds === 0) {
      return `${minutes} dakika`;
    }

    return `${minutes} dakika ${remainingSeconds} saniye`;
  };

  const question = questions[currentIndex];

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
                        ...(effectiveIsGuestUser ? getGuestAvatarStyle(guestAvatarSeed) : {
                                                  background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.85), rgba(37, 99, 235, 0.95))",
                                                }),
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

                    {!effectiveIsGuestUser && (
                      <>
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
                      </>
                    )}
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
              width: "100%",
              maxWidth: "760px",
              margin: "0 auto 20px auto",
              padding: "16px 20px 18px 20px",
              boxSizing: "border-box",
              borderRadius: "24px",
              background: "linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(30, 41, 59, 0.94))",
              border: "1px solid rgba(148, 163, 184, 0.14)",
              boxShadow: "0 18px 40px rgba(2, 6, 23, 0.24)",
            }}
          >
            <div
              style={{
                textAlign: "center",
                color: "#f8fafc",
                fontSize: "20px",
                fontWeight: "800",
                marginBottom: "4px",
                letterSpacing: "0.2px",
              }}
            >
              {formatDurationLabel(selectedDuration)}
            </div>

            <input
              type="range"
              min="0"
              max={durationOptions.length - 1}
              step="1"
              value={Math.max(0, durationOptions.indexOf(selectedDuration))}
              onChange={(e) => {
                const selectedIndex = Number(e.target.value);
                setSelectedDuration(durationOptions[selectedIndex]);
                setGameMode("classic");
              }}
              style={{
                width: "calc(100% - 24px)",
                margin: "0 12px",
                appearance: "none",
                WebkitAppearance: "none",
                height: "10px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.82)",
                outline: "none",
                cursor: "pointer",
                transition: "all 0.25s ease",
                boxSizing: "border-box",
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0 12px",
                marginTop: "10px",
                gap: "8px",
                flexWrap: "wrap",
                color: "#cbd5e1",
                fontSize: "13px",
                fontWeight: "700",
              }}
            >
              {durationOptions.map((option) => (
                <span
                  key={option}
                  style={{
                    color: selectedDuration === option ? "#60a5fa" : "#94a3b8",
                    transition: "all 0.25s ease",
                    minWidth: "60px",
                    textAlign: "center",
                    transform: selectedDuration === option ? "scale(1.15)" : "scale(1)",
                    textShadow: selectedDuration === option
                      ? "0 0 8px rgba(96,165,250,0.9), 0 0 16px rgba(96,165,250,0.6)"
                      : "none",
                    fontWeight: selectedDuration === option ? "900" : "700",
                  }}
                >
                  <div>
                    {option % 60 === 0
                      ? `${option / 60} dk`
                      : `${Math.floor(option / 60)} dk 30 sn`}
                  </div>
                </span>
              ))}
            </div>
          </div>
          {gameMode === "daily" ? (
            dailyResult ? (
              <button
                onClick={returnToMainMenu}
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
                      { label: "Günlük oyun sayısı", value: profileStats?.dailyWins ?? 0, color: "#a78bfa" },
                      {
                          label: "Düello galibiyet / beraberlik / mağlubiyet",
                          value: `${profileStats?.duelWins ?? 0} / ${profileStats?.duelDraws ?? 0} / ${profileStats?.duelLosses ?? 0}`,
                          color: "#f87171"
                      },
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
                    {duelHistory.map((item) => {
                      const scoreText = String(item.score ?? "0").trim();
                      const opponentScoreText = String(item.opponentScore ?? "0").trim();
                      const durationDifferenceText = String(item.durationDifferenceSeconds ?? "0").trim();
                      const winnerNameText = String(item.winnerName ?? "").trim();

                      const durationValue = parseFloat(durationDifferenceText);

                      const isDraw =
                        (scoreText === opponentScoreText && durationValue === 0) ||
                        winnerNameText === "-";

                      const resultLabel = isDraw
                        ? "Beraberlik"
                        : item.won
                          ? "Galibiyet"
                          : "Mağlubiyet";

                      const resultColor = isDraw
                        ? "#facc15"
                        : item.won
                          ? "#22c55e"
                          : "#f87171";

                      return (
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
                                color: resultColor,
                                fontSize: "15px",
                                fontWeight: "800",
                              }}
                            >
                              {resultLabel}
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
                              <strong>Süre farkı:</strong> {Number(item.durationDifferenceSeconds ?? 0) > 0
                                ? `+${item.durationDifferenceSeconds}`
                                : item.durationDifferenceSeconds ?? 0} sn
                            </div>
                            <div style={{ color: "#e2e8f0" }}>
                              <strong>Tarih:</strong> {item.playedAt ? new Date(item.playedAt).toLocaleString("tr-TR") : "-"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
                                                                            title: "Üst üste 5 oyunda en az 200 puan topla",
                                                                            earned: Boolean((profileStats?.best200ScoreStreak ?? 0) >= 5),
                                                                            progress: `${Math.min(profileStats?.best200ScoreStreak ?? 0, 5)}/5`,
                                                                          },
                                                      {
                                                                            title: "7 gün üst üste giriş yap",
                                                                            earned: Boolean((profileStats?.loginStreak ?? 0) >= 7),
                                                                            progress: `${Math.min(profileStats?.loginStreak ?? 0, 7)}/7`,
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
                                        title: "Aynı rakibi 3 kez mağlup et",
                                        earned: Boolean((profileStats?.sameOpponentWinCount ?? 0) >= 3),
                                        progress: `${Math.min(profileStats?.sameOpponentWinCount ?? 0, 3)}/3`,
                                      },
                    {
                                        title: "Üst üste 5 düello kazan",
                                        earned: Boolean((profileStats?.duelWinStreak ?? 0) >= 5),
                                        progress: `${Math.min(profileStats?.duelWinStreak ?? 0, 5)}/5`,
                                      },
                    {
                                                            title: "10 farklı rakibi mağlup et",
                                                            earned: Boolean((profileStats?.uniqueOpponentWinCount ?? 0) >= 10),
                                                            progress: `${Math.min(profileStats?.uniqueOpponentWinCount ?? 0, 10)}/10`,
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
                        ...(effectiveIsGuestUser ? getGuestAvatarStyle(guestAvatarSeed) : {
                                                  background: "radial-gradient(circle at top, rgba(96, 165, 250, 0.85), rgba(37, 99, 235, 0.95))",
                                                }),
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

                    {!effectiveIsGuestUser && (
                      <>
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
                      </>
                    )}
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

        {gameMode === "duel" && !gameFinished && !duelWaitingForOpponent && (
          <div
            ref={duelEmojiPickerRef}
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginTop: "2px",
              marginBottom: "14px",
              position: "relative",
              zIndex: 20,
              paddingRight: "6px"
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShowDuelEmojiPicker((prev) => !prev);
              }}
              style={{
                height: "46px",
                padding: "0 18px",
                borderRadius: "16px",
                border: showDuelEmojiPicker
                  ? "1px solid rgba(96, 165, 250, 0.55)"
                  : "1px solid rgba(148, 163, 184, 0.22)",
                background: showDuelEmojiPicker
                  ? "linear-gradient(135deg, rgba(30, 64, 175, 0.78), rgba(15, 23, 42, 0.96))"
                  : "linear-gradient(135deg, rgba(15, 23, 42, 0.90), rgba(30, 41, 59, 0.94))",
                color: "#f8fafc",
                cursor: "pointer",
                fontSize: "15px",
                fontWeight: "800",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                boxShadow: showDuelEmojiPicker
                  ? "0 14px 30px rgba(30, 64, 175, 0.28)"
                  : "0 10px 22px rgba(2, 6, 23, 0.22)",
                transition: "all 0.18s ease",
                minWidth: "170px",
                alignSelf: "flex-end",
              }}
              aria-label="Emoji gönder"
              title="Emoji gönder"
            >
              <span>Emoji gönder</span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{
                  transform: showDuelEmojiPicker ? "rotate(180deg)" : "rotate(0deg)",
                  transition: "transform 0.18s ease",
                }}
              >
                <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {showDuelEmojiPicker && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 12px)",
                  right: "6px",
                  width: "332px",
                  padding: "16px",
                  borderRadius: "24px",
                  background: "linear-gradient(180deg, rgba(15, 23, 42, 0.98), rgba(30, 41, 59, 0.98))",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                  boxShadow: "0 24px 60px rgba(2, 6, 23, 0.34)",
                  backdropFilter: "blur(14px)",
                  zIndex: 15,
                }}
              >
                <div
                  style={{
                    color: "#cbd5e1",
                    fontSize: "13px",
                    fontWeight: "700",
                    letterSpacing: "0.3px",
                    marginBottom: "12px",
                    textAlign: "center",
                  }}
                >
                  Rakibine emoji gönder
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "12px",
                  }}
                >
                  {duelEmojiOptions.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      disabled={isDuelEmojiOnCooldown}
                      onClick={() => {
                        if (isDuelEmojiOnCooldown) return;
                        sendDuelReaction(emoji);
                        setShowDuelEmojiPicker(false);
                      }}
                      style={{
                        width: "100%",
                        height: "62px",
                        borderRadius: "18px",
                        border: "1px solid rgba(148, 163, 184, 0.16)",
                        background: "linear-gradient(180deg, rgba(15, 23, 42, 0.90), rgba(30, 41, 59, 0.88))",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 10px 22px rgba(2, 6, 23, 0.16)",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease",
                        opacity: isDuelEmojiOnCooldown ? 0.38 : 1,
                        cursor: isDuelEmojiOnCooldown ? "not-allowed" : "pointer",
                        filter: isDuelEmojiOnCooldown ? "grayscale(0.35) saturate(0.65)" : "none",
                        transform: isDuelEmojiOnCooldown ? "scale(0.98)" : "scale(1)",
                      }}
                      onMouseEnter={(e) => {
                        if (isDuelEmojiOnCooldown) return;
                        e.currentTarget.style.transform = "translateY(-2px) scale(1.03)";
                        e.currentTarget.style.boxShadow = "0 16px 30px rgba(2, 6, 23, 0.24)";
                        e.currentTarget.style.borderColor = "rgba(96, 165, 250, 0.42)";
                        e.currentTarget.style.background = "linear-gradient(180deg, rgba(30, 64, 175, 0.22), rgba(15, 23, 42, 0.96))";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = isDuelEmojiOnCooldown ? "scale(0.98)" : "translateY(0) scale(1)";
                        e.currentTarget.style.boxShadow = "0 10px 22px rgba(2, 6, 23, 0.16)";
                        e.currentTarget.style.borderColor = "rgba(148, 163, 184, 0.16)";
                        e.currentTarget.style.background = "linear-gradient(180deg, rgba(15, 23, 42, 0.90), rgba(30, 41, 59, 0.88))";
                      }}
                      aria-label={`Düello emojisi ${emoji}`}
                      title={emoji}
                    >
                      <svg width="34" height="34" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
                        <text x="18" y="25" textAnchor="middle" fontSize="26">{emoji}</text>
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            )}
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
                    { label: "Günlük oyun sayısı", value: profileStats?.dailyWins ?? 0, color: "#a78bfa" },
                    {
                                            label: "Düello galibiyet / beraberlik / mağlubiyet",
                                            value: `${profileStats?.duelWins ?? 0} / ${profileStats?.duelDraws ?? 0} / ${profileStats?.duelLosses ?? 0}`,
                                            color: "#f87171"
                                          },
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
                  {duelHistory.map((item) => {
                    const scoreText = String(item.score ?? "0").trim();
                    const opponentScoreText = String(item.opponentScore ?? "0").trim();
                    const durationDifferenceText = String(item.durationDifferenceSeconds ?? "0").trim();
                    const winnerNameText = String(item.winnerName ?? "").trim();

                    const durationValue = parseFloat(durationDifferenceText);

                    const isDraw =
                      (scoreText === opponentScoreText && durationValue === 0) ||
                      winnerNameText === "-";

                    const resultLabel = isDraw
                      ? "Beraberlik"
                      : item.won
                        ? "Galibiyet"
                        : "Mağlubiyet";

                    const resultColor = isDraw
                      ? "#facc15"
                      : item.won
                        ? "#22c55e"
                        : "#f87171";

                    return (
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
                              color: resultColor,
                              fontSize: "15px",
                              fontWeight: "800",
                            }}
                          >
                            {resultLabel}
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
                            <strong>Süre farkı:</strong> {Number(item.durationDifferenceSeconds ?? 0) > 0
                              ? `+${item.durationDifferenceSeconds}`
                              : item.durationDifferenceSeconds ?? 0} sn
                          </div>
                          <div style={{ color: "#e2e8f0" }}>
                            <strong>Tarih:</strong> {item.playedAt ? new Date(item.playedAt).toLocaleString("tr-TR") : "-"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
                                                                          title: "Üst üste 5 oyunda en az 200 puan topla",
                                                                          earned: Boolean((profileStats?.best200ScoreStreak ?? 0) >= 5),
                                                                          progress: `${Math.min(profileStats?.best200ScoreStreak ?? 0, 5)}/5`,
                                                                        },
                                                    {
                                                                          title: "7 gün üst üste giriş yap",
                                                                          earned: Boolean((profileStats?.loginStreak ?? 0) >= 7),
                                                                          progress: `${Math.min(profileStats?.loginStreak ?? 0, 7)}/7`,
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
                                      title: "Aynı rakibi 3 kez mağlup et",
                                      earned: Boolean((profileStats?.sameOpponentWinCount ?? 0) >= 3),
                                      progress: `${Math.min(profileStats?.sameOpponentWinCount ?? 0, 3)}/3`,
                                    },
                  {
                    title: "Üst üste 5 düello kazan",
                    earned: Boolean((profileStats?.duelWinStreak ?? 0) >= 5),
                    progress: `${Math.min(profileStats?.duelWinStreak ?? 0, 5)}/5`,
                  },
                  {
                                                          title: "10 farklı rakibi mağlup et",
                                                          earned: Boolean((profileStats?.uniqueOpponentWinCount ?? 0) >= 10),
                                                          progress: `${Math.min(profileStats?.uniqueOpponentWinCount ?? 0, 10)}/10`,
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
            {gameMode === "duel" && showDuelReaction && duelReaction && (
              <div
                style={{
                  position: "absolute",
                  top: "-14px",
                  right: "20px",
                  padding: "10px 14px",
                  borderRadius: "16px",
                  background: "rgba(15, 23, 42, 0.92)",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  color: "#f8fafc",
                  fontSize: "18px",
                  fontWeight: "700",
                  boxShadow: "0 18px 36px rgba(2, 6, 23, 0.28)",
                  zIndex: 5,
                }}
              >
                <span style={{ marginRight: "8px" }}>{duelReaction.emoji}</span>
                <span>{duelReaction.senderName}</span>
              </div>
            )}
            <h2 style={{ marginTop: 0, color: "#93c5fd" }}>Soru</h2>
            <p style={{ fontSize: "22px", marginBottom: "20px", color: "#e2e8f0", lineHeight: 1.45 }}>{question.questionText}</p>

            {(() => {
              const activeQuestion = questions[currentIndex];
              const isSummaryForActiveQuestion = questionFeedbackSummary?.questionId === activeQuestion?.id;
              const activeLikeCount = isSummaryForActiveQuestion ? (questionFeedbackSummary?.likeCount ?? 0) : 0;
              const activeDislikeCount = isSummaryForActiveQuestion ? (questionFeedbackSummary?.dislikeCount ?? 0) : 0;
              const totalVotes = activeLikeCount + activeDislikeCount;
              const likePercent = totalVotes > 0 ? Math.round((activeLikeCount / totalVotes) * 100) : 0;
              const dislikePercent = totalVotes > 0 ? 100 - likePercent : 0;
              const hasVoted = isSummaryForActiveQuestion && Boolean(questionFeedbackSummary?.hasVoted);
              const userReaction = isSummaryForActiveQuestion ? (questionFeedbackSummary?.userReaction ?? null) : null;

              if (questionFeedbackLoading && !hasVoted) {
                return (
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "760px",
                      margin: "18px auto 14px",
                      padding: "16px 18px",
                      borderRadius: "20px",
                      background: "rgba(15, 23, 42, 0.52)",
                      border: "1px solid rgba(148, 163, 184, 0.14)",
                      color: "#cbd5e1",
                      fontSize: "15px",
                    }}
                  >
                    Oylama bilgisi yükleniyor...
                  </div>
                );
              }

              if (!hasVoted) {
                const feedbackChoiceButtonStyle = {
                  width: "64px",
                  height: "60px",
                  borderRadius: "18px",
                  border: "2px solid rgba(255, 255, 255, 0.92)",
                  background: "transparent",
                  color: "#ffffff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxSizing: "border-box",
                  boxShadow: "0 10px 24px rgba(2, 6, 23, 0.24)",
                  transition: "transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease",
                  outline: "none",
                };

                return (
                  <div
                    style={{
                      width: "100%",
                      maxWidth: "760px",
                      margin: "18px auto 16px",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "28px",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => sendQuestionFeedback(activeQuestion, "LIKE")}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 18px 34px rgba(2, 6, 23, 0.30)";
                        e.currentTarget.style.borderColor = "rgba(134, 239, 172, 0.98)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 10px 24px rgba(2, 6, 23, 0.24)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.92)";
                      }}
                      style={feedbackChoiceButtonStyle}
                      aria-label="Like"
                      title="Like"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M14 10V5.8C14 4.806 13.194 4 12.2 4H12L8.3 10.2C8.105 10.526 8 10.899 8 11.28V19C8 20.105 8.895 21 10 21H17.2C18.017 21 18.743 20.474 18.998 19.698L20.798 14.198C20.864 13.998 20.897 13.789 20.897 13.578V12C20.897 10.895 20.002 10 18.897 10H14ZM6 21H4C2.895 21 2 20.105 2 19V12C2 10.895 2.895 10 4 10H6V21Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>

                    <button
                      type="button"
                      onClick={() => sendQuestionFeedback(activeQuestion, "DISLIKE")}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = "0 18px 34px rgba(2, 6, 23, 0.30)";
                        e.currentTarget.style.borderColor = "rgba(252, 165, 165, 0.98)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = "0 10px 24px rgba(2, 6, 23, 0.24)";
                        e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.92)";
                      }}
                      style={feedbackChoiceButtonStyle}
                      aria-label="Dislike"
                      title="Dislike"
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                          d="M10 14V18.2C10 19.194 10.806 20 11.8 20H12L15.7 13.8C15.895 13.474 16 13.101 16 12.72V5C16 3.895 15.105 3 14 3H6.8C5.983 3 5.257 3.526 5.002 4.302L3.202 9.802C3.136 10.002 3.103 10.211 3.103 10.422V12C3.103 13.105 3.998 14 5.103 14H10ZM18 3H20C21.105 3 22 3.895 22 5V12C22 13.105 21.105 14 20 14H18V3Z"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                );
              }

              return (
                <div
                  style={{
                    width: "100%",
                    maxWidth: "760px",
                    margin: "18px auto 16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      width: "100%",
                      borderRadius: "999px",
                      overflow: "hidden",
                      boxShadow: "0 12px 0 rgba(15, 23, 42, 0.55)",
                    }}
                  >
                    <div
                      style={{
                        width: `${dislikePercent}%`,
                        minWidth: dislikePercent > 0 ? "120px" : "0px",
                        background: userReaction === "DISLIKE" ? "#f43f5e" : "#f43f5e",
                        color: "#ffffff",
                        padding: dislikePercent >= 18 ? "14px 20px" : "0px",
                        fontSize: "20px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        gap: "12px",
                        boxSizing: "border-box",
                        overflow: "hidden",
                      }}
                    >
                      {dislikePercent >= 18 && (
                        <>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 14V18.2C10 19.194 10.806 20 11.8 20H12L15.7 13.8C15.895 13.474 16 13.101 16 12.72V5C16 3.895 15.105 3 14 3H6.8C5.983 3 5.257 3.526 5.002 4.302L3.202 9.802C3.136 10.002 3.103 10.211 3.103 10.422V12C3.103 13.105 3.998 14 5.103 14H10ZM18 3H20C21.105 3 22 3.895 22 5V12C22 13.105 21.105 14 20 14H18V3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                          </svg>
                          <span>Dislike</span>
                        </>
                      )}
                    </div>

                    <div
                      style={{
                        width: `${likePercent}%`,
                        minWidth: likePercent > 0 ? "120px" : "0px",
                        background: userReaction === "LIKE" ? "#10b981" : "#10b981",
                        color: "#ffffff",
                        padding: likePercent >= 18 ? "14px 20px" : "0px",
                        fontSize: "20px",
                        fontWeight: "800",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        gap: "12px",
                        boxSizing: "border-box",
                        overflow: "hidden",
                      }}
                    >
                      {likePercent >= 18 && (
                        <>
                          <span>Like</span>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 10V5.8C14 4.806 13.194 4 12.2 4H12L8.3 10.2C8.105 10.526 8 10.899 8 11.28V19C8 20.105 8.895 21 10 21H17.2C18.017 21 18.743 20.474 18.998 19.698L20.798 14.198C20.864 13.998 20.897 13.789 20.897 13.578V12C20.897 10.895 20.002 10 18.897 10H14ZM6 21H4C2.895 21 2 20.105 2 19V12C2 10.895 2.895 10 4 10H6V21Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
                          </svg>
                        </>
                      )}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: "14px",
                      gap: "20px",
                    }}
                  >
                    <div style={{ textAlign: "left" }}>
                      <div style={{ color: "#f43f5e", fontSize: "16px", fontWeight: "800", marginBottom: "2px" }}>
                        %{dislikePercent}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "15px", fontWeight: "700" }}>
                        ({activeDislikeCount} oy)
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ color: "#10b981", fontSize: "16px", fontWeight: "800", marginBottom: "2px" }}>
                        %{likePercent}
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "15px", fontWeight: "700" }}>
                        ({activeLikeCount} oy)
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                          : "#f8fafc",
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
