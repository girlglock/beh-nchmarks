import { CheckDropdown }  from "./components/CheckDropdown.js";
import { ChartCard }      from "./components/ChartCard.js";
import { ArduinoModal }   from "./components/ArduinoModal.js";
import { Icon }           from "./components/Icon.js";
import { BenchmarkStore } from "./BenchmarkStore.js";
import { BENCHMARKERS }   from "./constants.js";

const { useState, useMemo, useCallback } = React;

export function App({ data: rawData }) {
    const data = useMemo(() => (rawData || []).map((d, i) => ({ ...d, id: d.id !== undefined ? d.id : i + 1000 })), [rawData]);

    const [arduinoSessions, setArduinoSessions] = useState(() => BenchmarkStore.load());
    const [pinnedIds,       setPinnedIds]        = useState({});
    const [arduinoOpen,     setArduinoOpen]      = useState(false);

    const [filterGame,        setFilterGame]        = useState([]);
    const [filterType,        setFilterType]        = useState([]);
    const [filterOS,          setFilterOS]          = useState([]);
    const [filterAPI,         setFilterAPI]         = useState([]);
    const [filterDE,          setFilterDE]          = useState([]);
    const [filterBenchmarker, setFilterBenchmarker] = useState([]);

    const allData = useMemo(() => [...data, ...arduinoSessions], [data, arduinoSessions]);

    useMemo(() => { BenchmarkStore.save(arduinoSessions); }, [arduinoSessions]);

    const allGames        = useMemo(() => BenchmarkStore.uniqueValues(allData, "game"),        [allData]);
    const allTypes        = useMemo(() => BenchmarkStore.uniqueValues(allData, "type"),        [allData]);
    const allOS           = useMemo(() => BenchmarkStore.uniqueValues(allData, "os"),          [allData]);
    const allAPI          = useMemo(() => BenchmarkStore.uniqueValues(allData, "api"),         [allData]);
    const allDE           = useMemo(() => BenchmarkStore.uniqueValues(allData, "de"),          [allData]);
    const allBenchmarkers = useMemo(() => BenchmarkStore.uniqueValues(allData, "benchmarker"), [allData]);

    const availableGames        = useMemo(() => new Set(BenchmarkStore.uniqueValues(BenchmarkStore.filter(allData, { filterGame: [],        filterType, filterOS, filterAPI, filterDE, filterBenchmarker }), "game")),        [allData, filterType, filterOS, filterAPI, filterDE, filterBenchmarker]);
    const availableTypes        = useMemo(() => new Set(BenchmarkStore.uniqueValues(BenchmarkStore.filter(allData, { filterGame, filterType: [],        filterOS, filterAPI, filterDE, filterBenchmarker }), "type")),        [allData, filterGame, filterOS, filterAPI, filterDE, filterBenchmarker]);
    const availableOS           = useMemo(() => new Set(BenchmarkStore.uniqueValues(BenchmarkStore.filter(allData, { filterGame, filterType, filterOS: [],          filterAPI, filterDE, filterBenchmarker }), "os")),          [allData, filterGame, filterType, filterAPI, filterDE, filterBenchmarker]);
    const availableAPI          = useMemo(() => new Set(BenchmarkStore.uniqueValues(BenchmarkStore.filter(allData, { filterGame, filterType, filterOS, filterAPI: [],         filterDE, filterBenchmarker }), "api")),         [allData, filterGame, filterType, filterOS, filterDE, filterBenchmarker]);
    const availableDE           = useMemo(() => new Set(BenchmarkStore.uniqueValues(BenchmarkStore.filter(allData, { filterGame, filterType, filterOS, filterAPI, filterDE: [],          filterBenchmarker }), "de")),          [allData, filterGame, filterType, filterOS, filterAPI, filterBenchmarker]);
    const availableBenchmarkers = useMemo(() => new Set(BenchmarkStore.uniqueValues(BenchmarkStore.filter(allData, { filterGame, filterType, filterOS, filterAPI, filterDE, filterBenchmarker: [] }), "benchmarker")), [allData, filterGame, filterType, filterOS, filterAPI, filterDE]);

    const pinnedAllIds = useMemo(() => {
        const s = new Set();
        Object.values(pinnedIds).forEach(ids => ids.forEach(id => s.add(id)));
        return s;
    }, [pinnedIds]);

    const pinnedByUnit = useMemo(() => {
        const map = {};
        Object.entries(pinnedIds).forEach(([unit, ids]) => {
            ids.forEach(id => {
                const d = allData.find(x => x.id === id);
                if (!d) return;
                if (!map[unit]) map[unit] = [];
                map[unit].push(d);
            });
        });
        return map;
    }, [pinnedIds, allData]);

    const hasPinned = Object.values(pinnedByUnit).some(items => items.length > 0);

    const filtered = useMemo(() => BenchmarkStore.filter(allData, {
        filterGame, filterType, filterOS, filterAPI, filterDE, filterBenchmarker
    }), [allData, filterGame, filterType, filterOS, filterAPI, filterDE, filterBenchmarker]);

    const filteredUnpinned = useMemo(
        () => filtered.filter(d => !pinnedAllIds.has(d.id)),
        [filtered, pinnedAllIds]
    );

    const byGame   = useMemo(() => BenchmarkStore.groupByGame(filteredUnpinned), [filteredUnpinned]);
    const colorMap = useMemo(() => BenchmarkStore.buildColorMap(allData), [allData]);
    const games    = Object.keys(byGame);

    const togglePin = (unit, id) => {
        setPinnedIds(prev => {
            const cur  = prev[unit] || [];
            const next = cur.includes(id) ? cur.filter(x => x !== id) : [id, ...cur];
            return { ...prev, [unit]: next };
        });
    };

    const reorderPin = useCallback((unit, id, toIndex) => {
        setPinnedIds(prev => {
            const cur  = [...(prev[unit] || [])];
            const from = cur.indexOf(id);
            if (from === -1) return prev;
            cur.splice(from, 1);
            cur.splice(toIndex, 0, id);
            return { ...prev, [unit]: cur };
        });
    }, []);

    const addArduinoSession    = useCallback((entry) => { setArduinoSessions(prev => [...prev, entry]); }, []);
    const removeArduinoSession = (id) => { setArduinoSessions(prev => prev.filter(s => s.id !== id)); };
    const updateArduinoSession = useCallback((id, updates) => {
        setArduinoSessions(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    }, []);

    const exportArduino = () => {
        const blob = new Blob([JSON.stringify(arduinoSessions, null, 2)], { type: "application/json" });
        const a    = document.createElement("a");
        a.href     = URL.createObjectURL(blob);
        a.download = "arduino_sessions_" + Date.now() + ".json";
        a.click();
    };

    const renderBenchmarkerOption = (id) => {
        const bm = BENCHMARKERS[id];
        if (!bm) return id;
        return React.createElement("span", { className: "bm-filter-option" },
            bm.pfp
                ? React.createElement("img", { src: bm.pfp, className: "bm-pfp bm-pfp-xs", alt: bm.name, onError: e => { e.target.style.display = "none"; } })
                : React.createElement("span", { className: "bm-pfp-fallback bm-pfp-fallback-xs" }, bm.name[0].toUpperCase()),
            bm.name
        );
    };

    return React.createElement("main", { className: "container" },

        React.createElement("div", { style: { textAlign: "center", marginBottom: "0.5rem" } },
            React.createElement("h2", { style: { margin: 0, display: "inline-flex" } },
                React.createElement("a", {
                    href: "https://7tv.app/emotes/01H5SZNXBG0009A24KGM1D8PHV",
                    "aria-label": "beh",
                    style: { display: "flex", alignItems: "center", gap: "0.25rem", textDecoration: "none", color: "inherit" }
                },
                    React.createElement("img", { src: "https://cdn.7tv.app/emote/01H5SZNXBG0009A24KGM1D8PHV/1x.gif", width: 64, height: 64, alt: "beh" }),
                    "nchmarks"
                )
            )
        ),

        React.createElement("article", { style: { marginTop: "0.5rem", padding: "0.5rem 0.75rem", zIndex: 50 } },
            React.createElement("div", { className: "filter-row" },
                allGames.length        > 0 && React.createElement(CheckDropdown, { label: "Game",        options: allGames,        available: availableGames,        selected: filterGame,        onChange: setFilterGame }),
                allTypes.length        > 0 && React.createElement(CheckDropdown, { label: "Type",        options: allTypes,        available: availableTypes,        selected: filterType,        onChange: setFilterType }),
                allOS.length           > 0 && React.createElement(CheckDropdown, { label: "OS",          options: allOS,           available: availableOS,           selected: filterOS,          onChange: setFilterOS }),
                allAPI.length          > 0 && React.createElement(CheckDropdown, { label: "API",         options: allAPI,          available: availableAPI,          selected: filterAPI,         onChange: setFilterAPI }),
                allDE.length           > 0 && React.createElement(CheckDropdown, { label: "DE",          options: allDE,           available: availableDE,           selected: filterDE,          onChange: setFilterDE }),
                allBenchmarkers.length > 0 && React.createElement(CheckDropdown, {
                    label: "Benchmarker",
                    options: allBenchmarkers,
                    available: availableBenchmarkers,
                    selected: filterBenchmarker,
                    onChange: setFilterBenchmarker,
                    renderOption: renderBenchmarkerOption
                })
            )
        ),

        hasPinned && React.createElement("div", { className: "charts-section" },
            React.createElement("div", { className: "game-group-header pinned-header" },
                React.createElement(Icon, { name: "pin", className: "icon-sm" }),
                React.createElement("h4", null, "Pinned")
            ),
            React.createElement("div", { className: "charts-row" },
                Object.entries(pinnedByUnit).map(([unit, items]) =>
                    items.length > 0 && React.createElement(ChartCard, {
                        key: unit, unit, items, colorMap,
                        pinnedIds: pinnedIds[unit] || [],
                        onTogglePin:  (id) => togglePin(unit, id),
                        isPinnedSection: true,
                        onReorderPin: (id, toIdx) => reorderPin(unit, id, toIdx)
                    })
                )
            )
        ),

        games.length === 0 && !hasPinned && React.createElement("article", { style: { textAlign: "center", color: "var(--pico-muted-color)" } },
            "No benchmarks match the current filters."
        ),

        games.map(game =>
            React.createElement("div", { key: game, className: "charts-section" },
                React.createElement("div", { className: "game-group-header" },
                    React.createElement(Icon, { name: "monitor", className: "icon-sm" }),
                    React.createElement("h4", null, game)
                ),
                React.createElement("div", { className: "charts-row" },
                    byGame[game].map(({ unit, items }) =>
                        React.createElement(ChartCard, {
                            key: unit, unit, items, colorMap,
                            pinnedIds: pinnedIds[unit] || [],
                            onTogglePin: (id) => togglePin(unit, id)
                        })
                    )
                )
            )
        ),

        React.createElement("div", { style: { textAlign: "center", marginTop: "2rem", paddingBottom: "2.5rem" } },
            React.createElement("button", {
                className: "secondary outline",
                onClick: () => setArduinoOpen(true),
                style: { display: "inline-flex", alignItems: "center", gap: "0.45rem" }
            },
                React.createElement(Icon, { name: "cpu", className: "icon-sm" }),
                "Capture new",
                arduinoSessions.length > 0 && React.createElement("span", {
                    style: { fontSize: "0.72rem", fontWeight: 600, background: "var(--pico-primary)", color: "#fff", borderRadius: "99px", padding: "0.05rem 0.45rem", lineHeight: "1.6" }
                }, arduinoSessions.length)
            )
        ),

        React.createElement(ArduinoModal, {
            visible: arduinoOpen,
            onClose: () => setArduinoOpen(false),
            onAddSession: addArduinoSession,
            arduinoSessions,
            onRemoveSession: removeArduinoSession,
            onUpdateSession: updateArduinoSession,
            onExport: exportArduino,
            colorMap
        })
    );
}
