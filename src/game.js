export function generateSecret(length) {
    let s = "";
    while (s.length < length) {
        s += Math.floor(Math.random() * 10);
    }
    return s;
}
export function evaluate(secret, guess) {
    let correctPositions = 0;
    let correctDigits = 0;
    const secretCount = {};
    const guessCount = {};
    for (let i = 0; i < secret.length; i++) {
        if (secret[i] === guess[i]) {
            correctPositions++;
        }
        // Count all digits for "correct digits" check
        secretCount[secret[i]] = (secretCount[secret[i]] || 0) + 1;
        guessCount[guess[i]] = (guessCount[guess[i]] || 0) + 1;
    }
    // Count digits that exist in secret (ignore positions)
    for (const d in guessCount) {
        correctDigits += Math.min(guessCount[d], secretCount[d] || 0);
    }
    return { correctPositions, correctDigits };
}
