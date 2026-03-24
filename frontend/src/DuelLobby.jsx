import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:8080/api/duel";

export default function DuelLobby({ currentUser, onBack, onStartDuel }) {
  const [roomCode, setRoomCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [room, setRoom] = useState(null);
  const [error, setError] = useState("");

  const createRoom = async () => {
    try {
      setError("");
      const res = await axios.post(`${API}/rooms`, {
        playerId: currentUser.id,
        playerName: currentUser.username,
      });
      setRoom(res.data);
      setRoomCode(res.data.roomCode);
    } catch (err) {
      setError(err.response?.data?.message || "Oda oluşturulamadı.");
    }
  };

  const joinRoom = async () => {
    try {
      setError("");
      const res = await axios.post(`${API}/rooms/join`, {
        playerId: currentUser.id,
        playerName: currentUser.username,
        roomCode: joinCode.trim().toUpperCase(),
      });
      setRoom(res.data);
      setRoomCode(res.data.roomCode);
    } catch (err) {
      setError(err.response?.data?.message || "Odaya katılınamadı.");
    }
  };

  const setReady = async (ready) => {
    if (!roomCode) return;

    try {
      const res = await axios.post(`${API}/rooms/${roomCode}/ready`, {
        playerId: currentUser.id,
        ready,
      });
      setRoom(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Hazır durumu güncellenemedi.");
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API}/rooms/${roomCode}`);
        setRoom(res.data);
      } catch (_) {}
    }, 1500);

    return () => clearInterval(interval);
  }, [roomCode]);

  useEffect(() => {
    if (room?.status === "STARTED" && typeof onStartDuel === "function") {
      onStartDuel(room);
    }
  }, [room, onStartDuel]);

  return (
    <div className="duel-lobby">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Düello Modu</h2>
        {typeof onBack === "function" && (
          <button onClick={onBack}>Geri</button>
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
        <div style={{ marginTop: 20 }}>
          <p><strong>Oda Kodu:</strong> {room.roomCode}</p>
          <p><strong>Durum:</strong> {room.status}</p>

          <div>
            <p>
              Oyuncu 1: {room.player1Name} {room.player1Ready ? "✅" : "⏳"}
            </p>
            <p>
              Oyuncu 2: {room.player2Name || "Bekleniyor..."} {room.player2Ready ? "✅" : ""}
            </p>
          </div>

          <button onClick={() => setReady(true)}>Hazırım</button>
          <button onClick={() => setReady(false)} style={{ marginLeft: 8 }}>
            Hazır Değilim
          </button>

          {room.status === "STARTED" && (
            <p style={{ marginTop: 16 }}>
              Düello başlatılıyor...
            </p>
          )}
        </div>
      )}
    </div>
  );
}