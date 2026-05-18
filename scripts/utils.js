import { OS_ICON_MAP, API_ICON_MAP, GAME_ICON_MAP, STEAM_APP_IDS, steamIconUrl } from "./constants.js";

export function resolveOsIcon(os) {
    if (!os) return null;
    return OS_ICON_MAP[os.toLowerCase()] || null;
}

export function resolveApiIcon(api) {
    if (!api) return null;
    return API_ICON_MAP[api.toLowerCase()] || null;
}

export function resolveGameIcon(game) {
    if (!game) return null;
    const key = game.toLowerCase();
    if (GAME_ICON_MAP[key]) return GAME_ICON_MAP[key];
    const appId = STEAM_APP_IDS[key];
    if (appId) return steamIconUrl(appId);
    return null;
}

export function calcStats(arr) {
    const sorted = [...arr].sort((a, b) => a - b);
    const n = arr.length;
    const mean = arr.reduce((s, v) => s + v, 0) / n;
    const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);
    const pct = (p) => {
        const idx = p * (sorted.length - 1);
        const lo = Math.floor(idx);
        const hi = Math.ceil(idx);
        return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
    };
    return {
        mean: +mean.toFixed(3),
        min: +(pct(0.01)).toFixed(3),
        max: +(pct(0.99)).toFixed(3),
        sd: +sd.toFixed(3),
        p50: +(pct(0.50)).toFixed(3),
        p95: +(pct(0.95)).toFixed(3)
    };
}
