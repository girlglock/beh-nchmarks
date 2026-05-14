import { Icon }           from "./Icon.js";
import { AddSessionPopup } from "./AddSessionPopup.js";
import { SerialManager }  from "../SerialManager.js";
import { calcStats }      from "../utils.js";
import { LAST_BAUD_KEY }  from "../constants.js";

const { useState, useRef, useEffect } = React;

export function ArduinoModal({ visible, onClose, onAddSession, arduinoSessions, onRemoveSession, onUpdateSession, onExport, colorMap }) {
    const managerRef = useRef(new SerialManager());
    const samplesRef = useRef([]);
    const runningRef = useRef(false);
    const limitRef   = useRef(100);

    const [connected,      setConnected]      = useState(false);
    const [connLabel,      setConnLabel]      = useState("disconnected");
    const [running,        setRunning]        = useState(false);
    const [progress,       setProgress]       = useState({ n: 0, limit: 100 });
    const [liveAvg,        setLiveAvg]        = useState(null);
    const [liveImm,        setLiveImm]        = useState(null);
    const [pendingSamples, setPendingSamples] = useState(null);
    const [editingSession, setEditingSession] = useState(null);
    const [numSamples,     setNumSamples]     = useState(100);
    const [waitSecs,       setWaitSecs]       = useState(3);
    const [baud,           setBaud]           = useState(() => {
        const stored = localStorage.getItem(LAST_BAUD_KEY);
        return stored ? Number(stored) : 115200;
    });

    const manager   = managerRef.current;
    const hasSerial = manager.hasSerial;

    useEffect(() => {
        if (!hasSerial) return;
        manager.autoConnect(baud).then(result => {
            if (!result.ok) return;
            setConnected(true);
            setConnLabel(manager.formatLabel(baud, result.alreadyOpen ? "(resumed)" : "(auto)"));
            manager.startReading(handleLine);
        });
    }, []);

    function handleLine(line) {
        const immIdx = line.indexOf("imm:");
        if (immIdx === -1 || !runningRef.current) return;
        const afterImm = line.slice(immIdx + 4);
        for (const part of afterImm.split(/[,\t]/)) {
            const t = part.trim();
            if (!t) continue;
            const v = parseFloat(t);
            if (!isNaN(v) && v > 0 && v < 2000) { samplesRef.current.push(v); } else { break; }
        }
        const n   = samplesRef.current.length;
        const avg = samplesRef.current.reduce((a, v) => a + v, 0) / n;
        setLiveAvg(avg.toFixed(3));
        setLiveImm(samplesRef.current[n - 1].toFixed(3));
        setProgress({ n, limit: limitRef.current });
        if (n >= limitRef.current) {
            runningRef.current = false;
            setRunning(false);
            manager.sendLine("0");
            const captured = [...samplesRef.current];
            samplesRef.current = [];
            setProgress({ n: 0, limit: limitRef.current });
            setPendingSamples(captured);
        }
    }

    async function connect() {
        if (!hasSerial) return;
        const result = await manager.requestAndOpen(baud);
        if (result.cancelled) return;
        if (!result.ok) { setConnLabel("error: " + (result.error || "unknown")); return; }
        localStorage.setItem(LAST_BAUD_KEY, String(baud));
        setConnLabel(manager.formatLabel(baud, result.alreadyOpen ? "(resumed)" : ""));
        setConnected(true);
        if (!result.alreadyOpen) manager.startReading(handleLine);
    }

    async function disconnect() {
        runningRef.current = false;
        setRunning(false);
        await manager.close();
        setConnected(false);
        setConnLabel("disconnected");
    }

    async function startTest() {
        if (!manager.isConnected) return;
        limitRef.current   = numSamples;
        samplesRef.current = [];
        runningRef.current = true;
        setRunning(true);
        setLiveAvg(null);
        setLiveImm(null);
        setProgress({ n: 0, limit: numSamples });
        await manager.sendLine(String(waitSecs));
    }

    async function stopTest() {
        runningRef.current = false;
        setRunning(false);
        samplesRef.current = [];
        setProgress(prev => ({ ...prev, n: 0 }));
        await manager.sendLine("0");
    }

    function handlePopupConfirm(form) {
        const tags = {
            game: form.game, type: "latency", unit: "ms",
            os: form.os, api: form.api, dsp: form.dsp, de: form.de,
            benchmarker: form.benchmarker || "girlglock"
        };
        if (editingSession) {
            onUpdateSession(editingSession.id, { label: form.label, tags });
            setEditingSession(null);
            setPendingSamples(null);
        } else {
            const id = Date.now();
            onAddSession({ id, label: form.label || "Session " + id, samples: pendingSamples, tags });
            setPendingSamples(null);
        }
    }

    function handlePopupCancel() {
        setEditingSession(null);
        setPendingSamples(null);
    }

    const pct = progress.limit > 0 ? Math.min(100, (progress.n / progress.limit) * 100) : 0;

    const labelStyle = { color: "var(--pico-muted-color)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 };
    const fieldStyle = { margin: 0, fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "0.3rem" };

    return React.createElement(React.Fragment, null,
        React.createElement("div", {
            className: "modal-overlay",
            style: { display: visible ? "flex" : "none" },
            onClick: e => { if (e.target === e.currentTarget) onClose(); }
        },
            React.createElement("div", { className: "modal-box arduino-modal" },

                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" } },
                    React.createElement("h4", { style: { margin: 0, display: "flex", alignItems: "center", gap: "0.45rem" } },
                        React.createElement(Icon, { name: "cpu", className: "icon-sm" }),
                        " Arduino Capture"
                    ),
                    React.createElement("button", {
                        className: "secondary outline",
                        style: { padding: "0.2rem 0.5rem", fontSize: "0.82rem", display: "flex", alignItems: "center", gap: "0.3rem" },
                        onClick: onClose
                    },
                        React.createElement(Icon, { name: "x", className: "icon-xs" }), " Close"
                    )
                ),

                !hasSerial && React.createElement("p", { className: "no-serial-warn" },
                    React.createElement(Icon, { name: "alert-triangle", className: "icon-sm" }),
                    " Web Serial not supported. Use Chrome or Edge on desktop."
                ),

                React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.6rem", marginBottom: "0.75rem" } },
                    React.createElement("label", { style: fieldStyle },
                        React.createElement("span", { style: labelStyle }, "Baud rate"),
                        React.createElement("select", { value: baud, onChange: e => setBaud(Number(e.target.value)), style: { margin: 0 } },
                            React.createElement("option", { value: 115200 }, "115200"),
                            React.createElement("option", { value: 57600  }, "57600"),
                            React.createElement("option", { value: 9600   }, "9600")
                        )
                    ),
                    React.createElement("label", { style: fieldStyle },
                        React.createElement("span", { style: labelStyle }, "Samples"),
                        React.createElement("input", { type: "number", value: numSamples, min: 16, step: 16, onChange: e => setNumSamples(Number(e.target.value)), style: { margin: 0 } })
                    ),
                    React.createElement("label", { style: fieldStyle },
                        React.createElement("span", { style: labelStyle }, "Wait (s)"),
                        React.createElement("input", { type: "number", value: waitSecs, min: 1, max: 30, onChange: e => setWaitSecs(Number(e.target.value)), style: { margin: 0 } })
                    )
                ),

                React.createElement("div", { style: { display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap" } },
                    React.createElement("button", {
                        onClick: connected ? disconnect : connect,
                        disabled: !hasSerial,
                        style: { display: "flex", alignItems: "center", gap: "0.35rem" }
                    },
                        React.createElement(Icon, { name: connected ? "unplug" : "plug", className: "icon-xs" }),
                        connected ? "Disconnect" : "Connect"
                    ),
                    React.createElement("button", {
                        onClick: startTest, disabled: !connected || running,
                        style: { display: "flex", alignItems: "center", gap: "0.3rem" }
                    },
                        React.createElement(Icon, { name: "play", className: "icon-xs" }), " Start"
                    ),
                    React.createElement("button", {
                        className: "secondary outline", onClick: stopTest, disabled: !running,
                        style: { display: "flex", alignItems: "center", gap: "0.3rem" }
                    },
                        React.createElement(Icon, { name: "square", className: "icon-xs" }), " Stop"
                    ),
                    React.createElement("span", { style: { color: "var(--pico-muted-color)", fontSize: "0.8rem" } }, connLabel)
                ),

                React.createElement("div", { className: "prog-row" },
                    React.createElement("div", { className: "prog-bar" },
                        React.createElement("div", { className: "prog-fill", style: { width: pct + "%" } })
                    ),
                    React.createElement("span", { style: { fontSize: "0.78rem", color: "var(--pico-muted-color)", whiteSpace: "nowrap" } },
                        running ? progress.n + " / " + progress.limit : ""
                    )
                ),

                React.createElement("div", { className: "live-stats" },
                    React.createElement("div", { className: "stat-card" },
                        React.createElement("small", null, "avg"),
                        React.createElement("strong", null, liveAvg !== null ? liveAvg : "--", React.createElement("span", { style: { fontSize: "0.7rem", fontWeight: "normal" } }, " ms"))
                    ),
                    React.createElement("div", { className: "stat-card" },
                        React.createElement("small", null, "last"),
                        React.createElement("strong", null, liveImm !== null ? liveImm : "--", React.createElement("span", { style: { fontSize: "0.7rem", fontWeight: "normal" } }, " ms"))
                    ),
                    React.createElement("div", { className: "stat-card" },
                        React.createElement("small", null, "samples"),
                        React.createElement("strong", null, progress.n > 0 ? progress.n : "--")
                    )
                ),

                arduinoSessions.length > 0 && React.createElement("div", { style: { marginTop: "0.75rem" } },
                    React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" } },
                        React.createElement("span", { style: { fontSize: "0.82rem", fontWeight: 600 } },
                            "Captured sessions (" + arduinoSessions.length + ")"
                        ),
                        React.createElement("button", {
                            className: "secondary outline", onClick: onExport,
                            style: { fontSize: "0.78rem", padding: "0.2rem 0.6rem", display: "flex", alignItems: "center", gap: "0.3rem" }
                        },
                            React.createElement(Icon, { name: "download", className: "icon-xs" }), " Export JSON"
                        )
                    ),
                    arduinoSessions.map(s => {
                        const st = calcStats(s.samples);
                        return React.createElement("div", { className: "serial-session", key: s.id },
                            React.createElement("div", { className: "legend-dot", style: { background: colorMap[s.id] } }),
                            React.createElement("div", { style: { flex: 1, minWidth: 0 } },
                                React.createElement("div", { style: { fontSize: "0.85rem" } }, s.label),
                                React.createElement("div", { className: "serial-session-meta" },
                                    s.samples.length + " samples / mean " + st.mean + " ms" +
                                    (s.tags.game        ? " / " + s.tags.game        : "") +
                                    (s.tags.os          ? " / " + s.tags.os          : "") +
                                    (s.tags.api         ? " / " + s.tags.api         : "") +
                                    (s.tags.benchmarker ? " / " + s.tags.benchmarker : "")
                                )
                            ),
                            React.createElement("button", {
                                className: "serial-session-del",
                                onClick: () => { setEditingSession(s); setPendingSamples(s.samples); },
                                title: "Edit"
                            }, React.createElement(Icon, { name: "pencil", className: "icon-xs" })),
                            React.createElement("button", {
                                className: "serial-session-del",
                                onClick: () => onRemoveSession(s.id),
                                title: "Remove"
                            }, React.createElement(Icon, { name: "trash-2", className: "icon-xs" }))
                        );
                    })
                )
            )
        ),

        pendingSamples && React.createElement(AddSessionPopup, {
            samples: pendingSamples,
            onConfirm: handlePopupConfirm,
            onCancel: handlePopupCancel,
            initial: editingSession || undefined
        })
    );
}
