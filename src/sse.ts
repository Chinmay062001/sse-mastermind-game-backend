// sse.ts
import { Response } from "express";
import { Lobby } from "./types";

type Client = {
  res: Response;
  playerId: string;
};

const clients = new Map<string, Set<Client>>();

export function addClient(lobbyId: string, playerId: string, res: Response) {
  if (!clients.has(lobbyId)) {
    clients.set(lobbyId, new Set());
  }
  clients.get(lobbyId)!.add({ res, playerId });
}

export function removeClient(lobbyId: string, res: Response) {
  clients.get(lobbyId)?.forEach(c => {
    if (c.res === res) clients.get(lobbyId)!.delete(c);
  });
}

export function broadcastLobby(lobby: Lobby) {
  const lobbyClients = clients.get(lobby.id);
  if (!lobbyClients) return;

  lobbyClients.forEach(({ res, playerId }) => {
    const filteredLobby: Lobby = {
      ...lobby,
      players: lobby.players.map(player => ({
        ...player,
        guesses: lobby.showAllGuesses || player.id === playerId
          ? player.guesses
          : [] // hide other players' guesses
      }))
    };

    res.write(
      `data: ${JSON.stringify({ type: "state", lobby: filteredLobby })}\n\n`
    );
  });
}

