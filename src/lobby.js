import { generateSecret } from "./game.js";
import { randomId } from "./utils.js";
export const lobbies = new Map();
export function createLobby(codeLength = 4, maxWinners = 2) {
    const lobby = {
        id: randomId(),
        players: [],
        secret: generateSecret(codeLength),
        codeLength,
        turnIndex: 0,
        winners: [],
        guesses: [],
        started: false,
        maxWinners,
        numGames: 0,
        showAllGuesses: false
    };
    lobbies.set(lobby.id, lobby);
    return lobby;
}
export function resetGame(lobby) {
    lobby.secret = generateSecret(lobby.codeLength);
    console.log(`🔑 Lobby ${lobby.id} secret: ${lobby.secret}`);
    lobby.guesses = [];
    lobby.winners = [];
    lobby.turnIndex = 0;
    lobby.started = true;
}
