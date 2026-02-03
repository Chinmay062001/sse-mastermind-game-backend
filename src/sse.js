const clients = new Map();
export function addClient(lobbyId, playerId, res) {
    if (!clients.has(lobbyId)) {
        clients.set(lobbyId, new Set());
    }
    clients.get(lobbyId).add({ res, playerId });
}
export function removeClient(lobbyId, res) {
    clients.get(lobbyId)?.forEach(c => {
        if (c.res === res)
            clients.get(lobbyId).delete(c);
    });
}
export function broadcastLobby(lobby) {
    const lobbyClients = clients.get(lobby.id);
    if (!lobbyClients)
        return;
    lobbyClients.forEach(({ res, playerId }) => {
        const filteredLobby = {
            ...lobby,
            players: lobby.players.map(player => ({
                ...player,
                guesses: lobby.showAllGuesses || player.id === playerId
                    ? player.guesses
                    : [] // hide other players' guesses
            }))
        };
        res.write(`data: ${JSON.stringify({ type: "state", lobby: filteredLobby })}\n\n`);
    });
}
