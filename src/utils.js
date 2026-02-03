export function randomId(len = 6) {
    return Math.random().toString(36).slice(2, 2 + len);
}
