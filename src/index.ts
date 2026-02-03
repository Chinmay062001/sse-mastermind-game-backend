// server.ts
import express from "express";
import cors from "cors";
import { Lobby, Player } from "./types";
import { lobbies, randomId } from "./store";
import { generateSecret, evaluate } from "./game";

const app = express();
app.use(express.json());


const allowedOrigins = [
  "http://localhost:5173",
  "https://your-frontend-domain.vercel.app",  // <-- replace with your real frontend
];


const corsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders:"*",
  exposedHeaders: "*",
  credentials: true
};

app.use(cors(corsOptions));
app.options(/.*/, cors(corsOptions));

// =========================
// SERVER-ONLY SECRET STORAGE
// =========================
const lobbySecrets = new Map<string, string>(); // lobbyId -> secret

// =========================
// SSE CLIENTS
// =========================
type Client = {
  res: express.Response;
  playerId: string;
};

const clients = new Map<string, Set<Client>>(); // lobbyId -> clients

function broadcastLobby(lobby: Lobby) {
  const lobbyClients = clients.get(lobby.id);
  if (!lobbyClients) return;

  lobbyClients.forEach(({ res, playerId }) => {
    const serialized = {
      ...lobby,
      players: lobby.players.map(p => {
        if (lobby.showAllGuesses || p.id === playerId) return p;
        return { ...p, guesses: [] }; // hide others' guesses
      })
    };

    res.write(
      `data: ${JSON.stringify({ type: "state", lobby: serialized })}\n\n`
    );
  });
}

app.get("/health" , (req, res)=>{
    res.json({status: "OK"});
});
// =========================
// CREATE LOBBY
// =========================
app.post("/lobby/create", (req, res) => {
  const { numGames = 5, maxWinners = 1, showAllGuesses = true } = req.body;
  const id = randomId();

  const lobby: Lobby = {
    id,
    players: [],
    codeLength: 4,
    turnIndex: 0,
    winners: [],
    started: false,
    numGames,
    maxWinners,
    showAllGuesses
  };

  lobbies.set(id, lobby);
  res.json(lobby);
});

// =========================
// JOIN LOBBY
// =========================
app.post("/lobby/:id/join", (req, res) => {
  const lobby = lobbies.get(req.params.id);
  if (!lobby) return res.sendStatus(404);

  const player: Player = {
    id: randomId(),
    name: req.body.name,
    guesses: []
  };

  lobby.players.push(player);
  broadcastLobby(lobby);

  res.json({ player, lobby });
});

// =========================
// START GAME
// =========================
app.post("/lobby/:id/start", (req, res) => {
  const lobby = lobbies.get(req.params.id);
  if (!lobby) return res.sendStatus(404);

  lobby.started = true;
  lobby.turnIndex = 0;
  lobby.winners = [];
  lobby.players.forEach(p => (p.guesses = []));

  const secret = generateSecret(lobby.codeLength);
  lobbySecrets.set(lobby.id, secret);

  console.log(`🔑 Lobby ${lobby.id} secret: ${secret}`);

  broadcastLobby(lobby);
  res.sendStatus(200);
});

// =========================
// SUBMIT GUESS
// =========================
app.post("/lobby/:id/guess", (req, res) => {
  const lobby = lobbies.get(req.params.id);
  if (!lobby || !lobby.started) return res.sendStatus(400);

  const { playerId, guess } = req.body;
  const currentPlayer = lobby.players[lobby.turnIndex];

  // Turn validation
  if (currentPlayer.id !== playerId) {
    return res.status(403).json({ error: "Not your turn" });
  }

  // Winner cannot guess again
  if (lobby.winners.includes(playerId)) {
    return res.status(403).json({ error: "Winner cannot guess again" });
  }

  const secret = lobbySecrets.get(lobby.id);
  if (!secret) {
    return res.status(500).json({ error: "Secret missing" });
  }

  const result = evaluate(secret, guess);

  // Store guess
  currentPlayer.guesses.push({
    value: guess,
    result: {
      correctPositions: result.correctPositions,
      correctDigits: result.correctDigits
    },
    round: currentPlayer.guesses.length + 1
  });

  let isWin = false;

  // Check win
  if (result.correctPositions === lobby.codeLength) {
    lobby.winners.push(playerId);
    isWin = true;

    // Stop game ONLY when required winners reached
    if (lobby.winners.length >= lobby.maxWinners) {
      lobby.started = false;
      broadcastLobby(lobby);

      // Restart new round
      setTimeout(() => {
        lobby.started = true;
        lobby.turnIndex = 0;
        lobby.winners = [];
        lobby.players.forEach(p => (p.guesses = []));

        const newSecret = generateSecret(lobby.codeLength);
        lobbySecrets.set(lobby.id, newSecret);

        console.log(`🔑 Lobby ${lobby.id} new secret: ${newSecret}`);
        broadcastLobby(lobby);
      }, 2000);

      return res.json({ ...result, isWin: true });
    }
  }

  // Advance turn (skip winners)
  let nextIndex = lobby.turnIndex;
  do {
    nextIndex = (nextIndex + 1) % lobby.players.length;
  } while (lobby.winners.includes(lobby.players[nextIndex].id));

  lobby.turnIndex = nextIndex;

  broadcastLobby(lobby);
  res.json({ ...result, isWin });
});

// =========================
// SSE STREAM
// =========================
app.get("/lobby/:id/stream", (req, res) => {
  const lobbyId = req.params.id;
  const playerId = req.query.playerId as string;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!clients.has(lobbyId)) {
    clients.set(lobbyId, new Set());
  }

  clients.get(lobbyId)!.add({ res, playerId });

  req.on("close", () => {
    clients.get(lobbyId)?.forEach(c => {
      if (c.res === res) clients.get(lobbyId)!.delete(c);
    });
  });
});

// =========================
// LEAVE LOBBY
// =========================
app.post("/lobby/:id/leave", (req, res) => {
  const lobby = lobbies.get(req.params.id);
  if (!lobby) return res.sendStatus(404);

  lobby.players = lobby.players.filter(p => p.id !== req.body.playerId);
  broadcastLobby(lobby);

  res.sendStatus(200);
});

// =========================
// START SERVER
// =========================
app.listen(4000, () => {
  console.log("✅ Server running at http://localhost:4000");
});
