import { Icon } from "./Icon.js";
import { AddSessionPopup } from "./AddSessionPopup.js";
import { SerialManager } from "../SerialManager.js";
import { LAST_BAUD_KEY } from "../constants.js";

const { useState, useRef, useEffect } = React;

export function TeensyModal({ visible, onClose, onAddSession, colorMap }) {
    const managerRef = useRef(new SerialManager());
    const samplesRef = useRef([]);
    const csvActiveRef = useRef(false);
    const trialRef = useRef(0);
    const validRef = useRef(0);

    const [connected, setConnected] = useState(false);
    const [connLabel, setConnLabel] = useState("disconnected");
    const [phase, setPhase] = useState("idle");
    const [progress, setProgress] = useState({ n: 0, valid: 0 });
    const [liveAvg, setLiveAvg] = useState(null);
    const [liveMs, setLiveMs] = useState(null);
    const [countdown, setCountdown] = useState(null);
    const [pendingSamples, setPendingSamples] = useState(null);
    const [numSamples, setNumSamples] = useState(1000);
    const [waitSecs, setWaitSecs] = useState(3);
    const [baud, setBaud] = useState(() => {
        const s = localStorage.getItem(LAST_BAUD_KEY);
        return s ? Number(s) : 115200;
    });

    const manager = managerRef.current;
    const hasSerial = manager.hasSerial;

    useEffect(() => {
        const vantaBg = document.getElementById("vanta-bg");
        let snapStyle = null;
        let origRender = null;

        if (phase === "running") {
            if (vantaBg) vantaBg.style.setProperty("display", "none", "important");
            if (window.vantaEffect?.renderer?.render) {
                origRender = window.vantaEffect.renderer.render.bind(window.vantaEffect.renderer);
                window.vantaEffect.renderer.render = () => { };
            }
            snapStyle = document.createElement("style");
            snapStyle.textContent = "* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }";
            document.head.appendChild(snapStyle);
        }

        return () => {
            if (vantaBg) vantaBg.style.removeProperty("display");
            if (window.vantaEffect?.renderer && origRender) window.vantaEffect.renderer.render = origRender;
            if (snapStyle) snapStyle.remove();
        };
    }, [phase]);

    function handleLine(line) {
        if (line === "Aborted.") {
            setPhase("idle");
            setCountdown(null);
            return;
        }

        const cdMatch = line.match(/TEST STARTING IN (\d+)/);
        if (cdMatch) {
            setPhase("countdown");
            setCountdown(parseInt(cdMatch[1]));
            return;
        }

        if (line.includes("CSV_START")) {
            csvActiveRef.current = true;
            samplesRef.current = [];
            trialRef.current = 0;
            validRef.current = 0;
            setCountdown(null);
            setPhase("running");
            return;
        }

        if (line.includes("CSV_END")) {
            csvActiveRef.current = false;
            setPhase("done");
            if (samplesRef.current.length > 0) {
                setPendingSamples([...samplesRef.current]);
            }
            return;
        }

        if (!csvActiveRef.current) return;

        const parts = line.split(",");
        if (parts.length < 7) return;
        const trial = parseInt(parts[0]);
        if (isNaN(trial)) return;

        trialRef.current = trial;
        const valid = parts[1].trim() === "1";

        if (valid) {
            const ms = parseFloat(parts[6]);
            if (!isNaN(ms) && ms > 0) {
                samplesRef.current.push(ms);
                validRef.current++;
                const n = samplesRef.current.length;
                const avg = samplesRef.current.reduce((a, v) => a + v, 0) / n;
                setLiveAvg(avg.toFixed(3));
                setLiveMs(ms.toFixed(3));
            }
        }

        setProgress({ n: trial, valid: validRef.current });
    }

    async function connect() {
        if (!hasSerial) return;
        const result = await manager.requestAndOpen(baud);
        if (result.cancelled) return;
        if (!result.ok) { setConnLabel("error: " + (result.error || "unknown")); return; }
        localStorage.setItem(LAST_BAUD_KEY, String(baud));
        setConnLabel(manager.formatLabel(baud, result.alreadyOpen ? "(resumed)" : ""));
        setConnected(true);
        manager.startReading(handleLine);
    }

    async function disconnect() {
        await manager.close();
        setConnected(false);
        setConnLabel("disconnected");
        setPhase("idle");
        setCountdown(null);
        csvActiveRef.current = false;
    }

    async function startTest() {
        if (!manager.isConnected) return;
        setLiveAvg(null);
        setLiveMs(null);
        setProgress({ n: 0, valid: 0 });
        await manager.sendLine("SAMPLES:" + numSamples);
        await manager.sendLine(String(waitSecs));
        setPhase("countdown");
        setCountdown(waitSecs);
    }

    async function stopTest() {
        await manager.sendLine("0");
    }

    function handlePopupConfirm(form) {
        const tags = {
            game: form.game, type: "latency", unit: "ms",
            os: form.os, api: form.api, dsp: form.dsp, de: form.de,
            benchmarker: form.benchmarker || "girlglock",
            system: form.system,
            ldat: form.ldat,
        };
        const id = Date.now();
        onAddSession({ id, label: form.label || "Teensy " + id, samples: pendingSamples, tags });
        setPendingSamples(null);
        setPhase("idle");
    }

    const pct = progress.n > 0 ? Math.min(100, (progress.n / numSamples) * 100) : 0;

    const isActive = phase === "countdown" || phase === "running";

    const statusMsg = phase === "countdown" ? "starting in " + countdown + "s..."
        : phase === "running" ? "capturing..."
            : phase === "done" ? "done"
                : connected ? "ready"
                    : connLabel;

    const fieldStyle = { margin: 0, fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "0.3rem" };
    const labelStyle = { color: "var(--pico-muted-color)", fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 };

    return React.createElement(React.Fragment, null,
        React.createElement("div", {
            className: "modal-overlay",
            style: { display: visible ? "flex" : "none" },
            onClick: e => { if (e.target === e.currentTarget) onClose(); }
        },
            React.createElement("div", { className: "modal-box arduino-modal" },
                React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" } },
                    React.createElement("h4", { style: { margin: 0, display: "flex", alignItems: "center", gap: "0.45rem" } },
                        React.createElement(Icon, { name: "zap", className: "icon-sm" }),
                        " Teensy Capture"
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
                            React.createElement("option", { value: 57600 }, "57600"),
                            React.createElement("option", { value: 9600 }, "9600")
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
                        onClick: startTest,
                        disabled: !connected || isActive,
                        style: { display: "flex", alignItems: "center", gap: "0.3rem" }
                    },
                        React.createElement(Icon, { name: "play", className: "icon-xs" }), " Start"
                    ),
                    React.createElement("button", {
                        className: "secondary outline",
                        onClick: stopTest,
                        disabled: !isActive,
                        style: { display: "flex", alignItems: "center", gap: "0.3rem" }
                    },
                        React.createElement(Icon, { name: "square", className: "icon-xs" }), " Stop"
                    ),
                    React.createElement("span", { style: { color: "var(--pico-muted-color)", fontSize: "0.8rem" } }, statusMsg)
                ),

                React.createElement("div", { className: "prog-row" },
                    React.createElement("div", { className: "prog-bar" },
                        React.createElement("div", { className: "prog-fill", style: { width: pct + "%" } })
                    ),
                    React.createElement("span", { style: { fontSize: "0.78rem", color: "var(--pico-muted-color)", whiteSpace: "nowrap" } },
                        phase === "running" ? progress.n + " / " + numSamples + "  (" + progress.valid + " valid)" : ""
                    )
                ),

                React.createElement("div", { className: "live-stats" },
                    React.createElement("div", { className: "stat-card" },
                        React.createElement("small", null, "avg"),
                        React.createElement("strong", null,
                            liveAvg !== null ? liveAvg : "--",
                            React.createElement("span", { style: { fontSize: "0.7rem", fontWeight: "normal" } }, " ms")
                        )
                    ),
                    React.createElement("div", { className: "stat-card" },
                        React.createElement("small", null, "last"),
                        React.createElement("strong", null,
                            liveMs !== null ? liveMs : "--",
                            React.createElement("span", { style: { fontSize: "0.7rem", fontWeight: "normal" } }, " ms")
                        )
                    ),
                    React.createElement("div", { className: "stat-card" },
                        React.createElement("small", null, "valid"),
                        React.createElement("strong", null, progress.valid > 0 ? progress.valid : "--")
                    )
                )
            )
        ),

        pendingSamples && React.createElement(AddSessionPopup, {
            samples: pendingSamples,
            onConfirm: handlePopupConfirm,
            onCancel: () => { setPendingSamples(null); setPhase("idle"); },
            captureDefaults: { ldat: { board_name: "Teensy 4.1", polling_rate_hz: 8000, baudrate: baud } },
        })
    );
}
