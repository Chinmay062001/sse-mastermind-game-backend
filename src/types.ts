export type GuessResult = {
  correctDigits: number;
  correctPositions: number;
};

export type Guess = {
  value: string;
  result: GuessResult;
  round: number;
};

export type PlayerStats = {
  totalPoints: number;
  roundsWon: number;
  attempts: number;
  bestCorrectPositions: number;
  bestCorrectDigits: number;
};

export type Player = {
  id: string;
  name: string;
  guesses: Guess[];
  stats: PlayerStats;
};

export type Lobby = {
  id: string;
  players: Player[];
  codeLength: number;
  turnIndex: number;
  winners: string[];
  started: boolean;
  numGames: number;
  maxWinners: number;
  showAllGuesses: boolean;
};
