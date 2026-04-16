import { useEffect, useRef, useState } from "react";
import axios from "axios";

const API = "http://localhost:8080/api/duel";

export default function DuelLobby({ currentUser, onBack, onStartDuel }) {
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  const skipLeaveOnUnmountRef = useRef(false);
  const duelStartedRef = useRef(false);
  const pollingIntervalRef = useRef(null);

  const getAuthHeaders = () => {
    const rawToken = sessionStorage.getItem("token");
    if (!rawToken) return {};

    return {
      Authorization: rawToken.startsWith("Bearer ")
        ? rawToken
        : `Bearer ${rawToken}`,
    };
  };

  const createRoom = async () => {
    try {
      setError("");
      const res = await axios.post(
        `${API}/rooms`,
        {
          playerId: currentUser.id,
          playerName: currentUser.username,
        },
        {
          headers: getAuthHeaders(),
        }
      );
      setRoom(res.data);
      setRoomCode(res.data.roomCode);
      duelStartedRef.current = false;
    } catch (err) {
      setError(err.response?.data?.message || "Oda oluşturulamadı.");
    }
  };

  const joinRoom = async () => {
    try {
      setError("");
      const res = await axios.post(
        `${API}/rooms/join`,
        {
          playerId: currentUser.id,
          playerName: currentUser.username,
          roomCode: joinCode.trim().toUpperCase(),
        },
        {
          headers: getAuthHeaders(),
        }
      );
      setRoom(res.data);
      setRoomCode(res.data.roomCode);
      duelStartedRef.current = false;
    } catch (err) {
      setError(err.response?.data?.message || "Odaya katılınamadı.");
    }
  };

  const setReady = async (ready) => {
    if (!roomCode) return;

    try {
      const res = await axios.post(
        `${API}/rooms/${roomCode}/ready`,
        {
          playerId: currentUser.id,
          ready,
        },
        {
          headers: getAuthHeaders(),
        }
      );
      setRoom(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Hazır durumu güncellenemedi.");
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    let cancelled = false;

    const stopPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    const fetchRoom = async () => {
      try {
        const res = await axios.get(`${API}/rooms/${roomCode}`, {
          headers: getAuthHeaders(),
        });

        if (cancelled) return;

        setRoom(res.data);

        if (res.data?.status === "STARTED") {
          stopPolling();
        }
      } catch (err) {
        if (cancelled) return;

        if (err.response?.status === 403) {
          console.log("Polling durduruldu (403)");
          stopPolling();
          return;
        }
      }
    };

    stopPolling();
    fetchRoom();
    pollingIntervalRef.current = setInterval(fetchRoom, 1500);

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [roomCode]);

  const leaveRoom = async () => {
    if (!roomCode || !currentUser?.id) return;

    try {
      await axios.post(
        `${API}/rooms/${roomCode}/leave`,
        {
          playerId: currentUser.id,
        },
        {
          headers: getAuthHeaders(),
        }
      );
    } catch (_) {
      // lobby çıkışında sessiz geç
    }
  };

  useEffect(() => {
    if (room?.status === "STARTED" && typeof onStartDuel === "function" && !duelStartedRef.current) {
      duelStartedRef.current = true;
      skipLeaveOnUnmountRef.current = true;

      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      onStartDuel(room);
    }
  }, [room, onStartDuel]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      if (skipLeaveOnUnmountRef.current) {
        skipLeaveOnUnmountRef.current = false;
      }
    };
  }, []);

  return (
    <div className="duel-lobby">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Düello Modu</h2>
        {typeof onBack === "function" && (
          <button
            onClick={async () => {
              duelStartedRef.current = false;
              skipLeaveOnUnmountRef.current = false;

              if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }

              await leaveRoom();
              onBack();
            }}
          >
            Geri
          </button>
        )}
      </div>

      {!room && (
        <>
          <button onClick={createRoom}>Oda Oluştur</button>

          <div style={{ marginTop: 16 }}>
            <input
              type="text"
              placeholder="Oda kodu gir..."
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
            />
            <button onClick={joinRoom}>Odaya Katıl</button>
          </div>
        </>
      )}

      {error && <p>{error}</p>}

      {room && (
        <div
          style={{
            marginTop: 20,
            padding: "28px",
            borderRadius: "28px",
            border: "1px solid rgba(148, 163, 184, 0.18)",
            background: "rgba(9, 18, 53, 0.72)",
            boxShadow: "0 18px 48px rgba(2, 6, 23, 0.28)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              flexWrap: "wrap",
              marginBottom: 22,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 800,
                color: "#f8fafc",
                display: "flex",
                alignItems: "center",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <span>
                Oda Kodu: <span style={{ color: "#93c5fd" }}>{room.roomCode}</span>
              </span>

              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(room?.roomCode || "");
                    setError("");
                  } catch (err) {
                    setError("Oda kodu kopyalanamadı.");
                  }
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: "12px",
                  border: "1px solid rgba(147, 197, 253, 0.35)",
                  background: "linear-gradient(135deg, rgba(37, 99, 235, 0.95), rgba(59, 130, 246, 0.95))",
                  color: "#ffffff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 800,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 12px 24px rgba(37, 99, 235, 0.28)",
                }}
                title="Oda kodunu kopyala"
                aria-label="Oda kodunu kopyala"
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16 1H4c-1.1 0-2 .9-2 2v12h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
                </svg>
                Kopyala
              </button>
            </h2>
          </div>
          <p style={{ margin: "0 0 24px 0", fontSize: "18px", color: "#cbd5e1" }}>
            <strong style={{ color: "#f8fafc" }}>Durum:</strong> {" "}
            <span style={{ color: "#f8fafc", fontWeight: 800 }}>{room.status}</span>
          </p>

          <div style={{ display: "grid", gap: 16, marginBottom: 28 }}>
            <div
              style={{
                padding: "18px 20px",
                borderRadius: "24px",
                background: "rgba(30, 41, 59, 0.82)",
                color: "#e5e7eb",
                fontSize: "26px",
                lineHeight: 1.3,
              }}
            >
              Oyuncu 1: {room.player1Name} {room.player1Ready ? "✅" : "⏳"}
            </div>

            <div
              style={{
                padding: "18px 20px",
                borderRadius: "24px",
                background: "rgba(30, 41, 59, 0.82)",
                color: "#e5e7eb",
                fontSize: "26px",
                lineHeight: 1.3,
              }}
            >
              Oyuncu 2: {room.player2Name || "Bekleniyor..."} {room.player2Ready ? "✅" : ""}
            </div>
          </div>

          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <button
              onClick={() => setReady(true)}
              style={{
                padding: "16px 34px",
                border: "none",
                borderRadius: "22px",
                cursor: "pointer",
                color: "white",
                fontSize: "20px",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                boxShadow: "0 16px 34px rgba(34, 197, 94, 0.28)",
              }}
            >
              Hazırım
            </button>

            <button
              onClick={() => setReady(false)}
              style={{
                padding: "16px 34px",
                border: "none",
                borderRadius: "22px",
                cursor: "pointer",
                color: "white",
                fontSize: "20px",
                background: "linear-gradient(135deg, #f59e0b, #f97316)",
                boxShadow: "0 16px 34px rgba(249, 115, 22, 0.28)",
              }}
            >
              Hazır Değilim
            </button>
          </div>

          {room.status === "STARTED" && (
            <p style={{ marginTop: 18, color: "#cbd5e1", fontSize: "16px" }}>
              Düello başlatılıyor...
            </p>
          )}
        </div>
      )}
    </div>
  );
}