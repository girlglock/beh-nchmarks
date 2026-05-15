import { STORAGE_KEY, COLORS } from "./constants.js";

export class BenchmarkStore {
    static load() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch { return []; }
    }

    static save(sessions) {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions)); } catch { }
    }

    static filter(data, { filterGame = [], filterType = [], filterOS = [], filterAPI = [], filterDE = [], filterBenchmarker = [] } = {}) {
        return data.filter(d => {
            if (filterGame.length && !filterGame.includes(d.tags.game)) return false;
            if (filterType.length && !filterType.includes(d.tags.type)) return false;
            if (filterOS.length && !filterOS.includes(d.tags.os)) return false;
            if (filterAPI.length && !filterAPI.includes(d.tags.api)) return false;
            if (filterDE.length && !filterDE.includes(d.tags.de)) return false;
            if (filterBenchmarker.length && !filterBenchmarker.includes(d.tags.benchmarker)) return false;
            return true;
        });
    }

    static groupByGame(filtered) {
        const unitMap = {};
        filtered.forEach(d => {
            const game = d.tags.game || "(no game)";
            const unit = d.tags.unit || "?";
            const key = game + "|||" + unit;
            if (!unitMap[key]) unitMap[key] = { game, unit, items: [] };
            unitMap[key].items.push(d);
        });
        const byGame = {};
        Object.values(unitMap).forEach(g => {
            if (!byGame[g.game]) byGame[g.game] = [];
            byGame[g.game].push(g);
        });
        return byGame;
    }

    static buildColorMap(allData) {
        const map = {};
        allData.forEach((d, i) => { map[d.id] = COLORS[i % COLORS.length]; });
        return map;
    }

    static uniqueValues(data, tagKey) {
        return [...new Set(data.map(d => d.tags[tagKey]).filter(Boolean))];
    }
}
