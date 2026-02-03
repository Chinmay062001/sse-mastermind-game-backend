export type Player = {
  guesses: Guess[];
  id: string;
  name: string;
};

export type GuessResult = {
  correctDigits: number;
  correctPositions: number;
};

export type Guess = {
  value: string;           // the guessed value
  result: GuessResult;     // result of that guess
  round: number;           // round number
};



export type Lobby = {
  id: string;
  players: Player[];
  codeLength: number;
  turnIndex: number;
  numGames:number;
  winners: string[];
  started: boolean;
  maxWinners: number;
  showAllGuesses: boolean
};
