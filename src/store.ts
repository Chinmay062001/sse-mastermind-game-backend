import { Lobby } from "./types";

export const lobbies = new Map<string, Lobby>();

export function randomId(length = 6) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}