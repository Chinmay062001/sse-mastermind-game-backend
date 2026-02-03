export function generateSecret(length: number) {
  let s = "";
  while (s.length < length) {
    s += Math.floor(Math.random() * 10);
  }
  console.log("key ++",s);
  return s;
}

export function evaluate(secret: string, guess: string) {
  let correctPositions = 0;
  let correctDigits = 0;

  const sc: Record<string, number> = {};
  const gc: Record<string, number> = {};

  for (let i = 0; i < secret.length; i++) {
    if (secret[i] === guess[i]) correctPositions++;
    sc[secret[i]] = (sc[secret[i]] || 0) + 1;
    gc[guess[i]] = (gc[guess[i]] || 0) + 1;
  }

  for (const d in gc) {
    correctDigits += Math.min(gc[d], sc[d] || 0);
  }

  return { correctPositions, correctDigits };
}
