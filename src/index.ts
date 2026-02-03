import express from "express";
import cors from "cors";
import { Lobby, Player } from "./types";
import { lobbies, lobbySecrets } from "./store";
import { randomId } from "./utils";
import { generateSecret, evaluate } from "./game";

const app = express();
app.use(express.json());
app.use(cors({ origin: "*" }));

/* =====================
   SSE CLIENTS
===================== */
type Client = { res: express.Response; playerId: string };
const clients = new Map<string, Set<Client>>();

function broadcastLobby(lobby: Lobby) {
  const lobbyClients = clients.get(lobby.id);
  if (!lobbyClients) return;

  lobbyClients.forEach(({ res, playerId }) => {
    const filtered = {
      ...lobby,
      players: lobby.players.map(p =>
        lobby.showAllGuesses || p.id === playerId
          ? p
          : { ...p, guesses: [] }
      )
    };

    res.write(`data: ${JSON.stringify({ lobby: filtered })}\n\n`);
  });
}

/* =====================
   CREATE LOBBY
===================== */
app.post("/lobby/create", (req, res) => {
  const { numGames = 5, maxWinners = 1, showAllGuesses = true } = req.body;

  const lobby: Lobby = {
    id: randomId(),
    players: [],
    codeLength: 4,
    turnIndex: 0,
    winners: [],
    started: false,
    numGames,
    maxWinners,
    showAllGuesses
  };

  lobbies.set(lobby.id, lobby);
  res.json(lobby);
});

/* =====================
   JOIN LOBBY
===================== */
app.post("/lobby/:id/join", (req, res) => {
  const lobby = lobbies.get(req.params.id);
  if (!lobby) return res.sendStatus(404);

  const player: Player = {
    id: randomId(),
    name: req.body.name,
    guesses: [],
    stats: {
      totalPoints: 0,
      roundsWon: 0,
      attempts: 0,
      bestCorrectDigits: 0,
      bestCorrectPositions: 0
    }
  };

  lobby.players.push(player);
  broadcastLobby(lobby);
  res.json({ player, lobby });
});

/* =====================
   START GAME
===================== */
app.post("/lobby/:id/start", (req, res) => {
  const lobby = lobbies.get(req.params.id);
  if (!lobby) return res.sendStatus(404);

  lobby.started = true;
  lobby.turnIndex = 0;
  lobby.winners = [];
  lobby.players.forEach(p => {
    p.guesses = [];
    p.stats.attempts = 0;
    p.stats.bestCorrectDigits = 0;
    p.stats.bestCorrectPositions = 0;
  });
  lobbySecrets.set(lobby.id, generateSecret(lobby.codeLength));
  console.log("key",lobbySecrets )
  broadcastLobby(lobby);
  res.sendStatus(200);
});

/* =====================
   SUBMIT GUESS
===================== */
app.post("/lobby/:id/guess", (req, res) => {
  const lobby = lobbies.get(req.params.id);
  if (!lobby || !lobby.started) return res.sendStatus(400);

  const { playerId, guess } = req.body;
  const player = lobby.players[lobby.turnIndex];
  if (player.id !== playerId) return res.sendStatus(403);

  const secret = lobbySecrets.get(lobby.id)!;
  const result = evaluate(secret, guess);

  player.guesses.push({
    value: guess,
    result,
    round: player.guesses.length + 1
  });

  player.stats.attempts++;
  player.stats.bestCorrectPositions = Math.max(
    player.stats.bestCorrectPositions,
    result.correctPositions
  );
  player.stats.bestCorrectDigits = Math.max(
    player.stats.bestCorrectDigits,
    result.correctDigits
  );

  /* WIN */
  if (result.correctPositions === lobby.codeLength) {
    lobby.winners.push(playerId);
    player.stats.roundsWon++;

    const bonus = [100, 70, 40][lobby.winners.length - 1] ?? 20;
    player.stats.totalPoints += bonus;

    if (lobby.winners.length >= lobby.maxWinners) {
      endRound(lobby);
      return res.json({ isWin: true });
    }
  }

  /* NEXT TURN */
  let next = lobby.turnIndex;
  do {
    next = (next + 1) % lobby.players.length;
  } while (lobby.winners.includes(lobby.players[next].id));
  lobby.turnIndex = next;

  broadcastLobby(lobby);
  res.json({ isWin: false });
});

/* =====================
   END ROUND (SCORING)
===================== */
function endRound(lobby: Lobby) {
  const WINNER_BONUS = 10;
  const MAX_EFFICIENCY_BONUS = 5;
  const POS_POINTS = 4;
  const DIGIT_POINTS = 2;

  lobby.started = false;

  lobby.players.forEach(p => {
    const isWinner = lobby.winners.includes(p.id);

    // 🎯 performance score (everyone)
    const performanceScore =
      p.stats.bestCorrectPositions * POS_POINTS +
      p.stats.bestCorrectDigits * DIGIT_POINTS;

    let roundPoints = Math.max(0, performanceScore);

    if (isWinner) {
      // ⚡ efficiency bonus (winner only)
      const efficiencyBonus = Math.max(
        0,
        MAX_EFFICIENCY_BONUS - p.stats.attempts
      );

      roundPoints += WINNER_BONUS + efficiencyBonus;
    }

    // 🧮 apply points
    p.stats.totalPoints += roundPoints;

    // 🔄 reset round stats
    p.stats.attempts = 0;
    p.stats.bestCorrectDigits = 0;
    p.stats.bestCorrectPositions = 0;
    p.guesses = [];
  });

  broadcastLobby(lobby);

  setTimeout(() => {
    lobby.started = true;
    lobby.turnIndex = 0;
    lobby.winners = [];
    lobbySecrets.set(lobby.id, generateSecret(lobby.codeLength));
    broadcastLobby(lobby);
  }, 2000);

  console.log("key", lobbySecrets);
}


/* =====================
   SSE STREAM
===================== */
app.get("/lobby/:id/stream", (req, res) => {
  const { id } = req.params;
  const playerId = req.query.playerId as string;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  if (!clients.has(id)) clients.set(id, new Set());
  clients.get(id)!.add({ res, playerId });

  req.on("close", () => {
    clients.get(id)?.forEach(c => {
      if (c.res === res) clients.get(id)!.delete(c);
    });
  });
});

/* =====================
   START SERVER
===================== */
app.listen(4000, () =>
  console.log("✅ Server running on http://localhost:4000")
);
