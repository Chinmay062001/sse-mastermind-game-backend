import { Lobby, Player } from "./types.js";
import { generateSecret } from "./game.js";
import { randomId } from "./utils.js";

export const lobbies = new Map<string, Lobby>();

export function createLobby(codeLength = 4, maxWinners = 2): Lobby {
  const lobby: Lobby = {
    id: randomId(),
    players: [],
    codeLength,
    turnIndex: 0,
    winners: [],
    started: false,
    maxWinners,
    numGames: 0,
    showAllGuesses: false
  };

  lobbies.set(lobby.id, lobby);

  return lobby;
}

export function resetGame(lobby: Lobby) {
  lobby.winners = [];
  lobby.turnIndex = 0;
  lobby.started = true;
}

