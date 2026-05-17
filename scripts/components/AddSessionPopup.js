import { TagSelect } from "./TagSelect.js";
import { Icon } from "./Icon.js";
import { BENCHMARKERS, osPresetsFor } from "../constants.js";

const { useState } = React;

const DEFAULTS_KEY = "benchmark_capture_defaults";

function loadDefaults() {
    try { return JSON.parse(localStorage.getItem(DEFAULTS_KEY)) || {}; } catch { return {}; }
}

function saveDefaults(form) {
    const { label: _l, ...rest } = form;
    try { localStorage.setItem(DEFAULTS_KEY, JSON.stringify(rest)); } catch { }
}

export function AddSessionPopup({ samples, onConfirm, onCancel, initial, captureDefaults }) {
    const isEdit = !!initial;
    const saved = loadDefaults();

    const [form, setForm] = useState({
        label: initial?.label || "Test " + new Date().toLocaleTimeString(),
        game: initial?.tags?.game || saved.game || "",
        os: initial?.tags?.os || saved.os || "",
        api: initial?.tags?.api || saved.api || "",
        dsp: initial?.tags?.dsp || saved.dsp || "",
        de: initial?.tags?.de || saved.de || "",
        benchmarker: initial?.tags?.benchmarker || saved.benchmarker || "girlglock",
        unit: "ms",
        system: {
            cpu: initial?.tags?.system?.cpu || saved.system?.cpu || "",
            gpu: initial?.tags?.system?.gpu || saved.system?.gpu || "",
            monitor: initial?.tags?.system?.monitor || saved.system?.monitor || "",
            rr: initial?.tags?.system?.rr || saved.system?.rr || "",
        },
        ldat: {
            board_name: initial?.tags?.ldat?.board_name || captureDefaults?.ldat?.board_name || saved.ldat?.board_name || "",
            polling_rate_hz: initial?.tags?.ldat?.polling_rate_hz || captureDefaults?.ldat?.polling_rate_hz || saved.ldat?.polling_rate_hz || "",
            baudrate: initial?.tags?.ldat?.baudrate || captureDefaults?.ldat?.baudrate || saved.ldat?.baudrate || "",
        },
    });

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));
    const setSystem = (k, v) => setForm(prev => ({ ...prev, system: { ...prev.system, [k]: v } }));
    const setLdat = (k, v) => setForm(prev => ({ ...prev, ldat: { ...prev.ldat, [k]: v } }));

    const setOS = (v) => {
        const validDSP = osPresetsFor("dsp", v);
        const validDE = osPresetsFor("de", v);
        const validAPI = osPresetsFor("api", v);
        setForm(prev => ({
            ...prev,
            os: v,
            dsp: validDSP.includes(prev.dsp) ? prev.dsp : "",
            de: validDE.includes(prev.de) ? prev.de : "",
            api: validAPI.includes(prev.api) ? prev.api : ""
        }));
    };

    const L = (text) => React.createElement("span", { className: "form-label" }, text);
    const F = (key, overridePresets) =>
        React.createElement(TagSelect, {
            fieldKey: key,
            value: form[key],
            onChange: v => set(key, v),
            presetOptions: overridePresets
        });

    const SI = (key, opts = {}) => React.createElement("input", {
        type: "text", value: form.system[key],
        onChange: e => setSystem(key, e.target.value),
        style: { margin: 0 }, ...opts
    });

    const divider = React.createElement("div", {
        style: { gridColumn: "1 / -1", borderTop: "1px solid var(--pico-muted-border-color)", margin: "0.2rem 0" }
    });

    const gridStyle = {
        display: "grid",
        gridTemplateColumns: "max-content 1fr",
        gap: "0.45rem 0.7rem",
        alignItems: "center",
        marginBottom: "1rem"
    };

    return React.createElement("div", {
        className: "modal-overlay",
        onClick: e => { if (e.target === e.currentTarget) onCancel(); }
    },
        React.createElement("div", { className: "modal-box session-popup" },
            React.createElement("h4", null,
                React.createElement(Icon, { name: isEdit ? "pencil" : "plus-circle", className: "icon-sm" }),
                isEdit ? " Edit session" : " Add to chart"
            ),
            React.createElement("div", { style: gridStyle },
                L("Label"),
                React.createElement("input", {
                    type: "text", value: form.label,
                    onChange: e => set("label", e.target.value),
                    style: { margin: 0 }
                }),
                L("Game"), F("game"),
                L("OS"),
                React.createElement(TagSelect, { fieldKey: "os", value: form.os, onChange: setOS }),
                L("API"), F("api", osPresetsFor("api", form.os)),
                L("DSP"), F("dsp", osPresetsFor("dsp", form.os)),
                L("DE"), F("de", osPresetsFor("de", form.os)),
                L("Benchmarker"),
                React.createElement("select", {
                    value: form.benchmarker,
                    onChange: e => set("benchmarker", e.target.value),
                    style: { margin: 0 }
                },
                    React.createElement("option", { value: "" }, "none"),
                    Object.values(BENCHMARKERS).map(b =>
                        React.createElement("option", { key: b.id, value: b.id }, b.name)
                    )
                ),

                divider,

                L("CPU"), SI("cpu"),
                L("GPU"), SI("gpu"),
                L("Monitor"), SI("monitor"),
                L("RR"), SI("rr"),

                divider,

                L("Board"),
                React.createElement("input", {
                    type: "text", value: form.ldat.board_name,
                    onChange: e => setLdat("board_name", e.target.value),
                    style: { margin: 0 }
                }),
                L("Poll Hz"),
                React.createElement("input", {
                    type: "number", value: form.ldat.polling_rate_hz,
                    onChange: e => setLdat("polling_rate_hz", e.target.value),
                    style: { margin: 0 }
                }),
                L("Baud"),
                React.createElement("input", {
                    type: "number", value: form.ldat.baudrate,
                    onChange: e => setLdat("baudrate", e.target.value),
                    style: { margin: 0 }
                })
            ),
            React.createElement("small", { style: { color: "var(--pico-muted-color)" } },
                samples.length + " samples"
            ),
            React.createElement("div", { className: "modal-actions" },
                React.createElement("button", { className: "secondary outline", onClick: onCancel }, "Cancel"),
                React.createElement("button", {
                    onClick: () => { saveDefaults(form); onConfirm(form); }
                }, isEdit ? "Save changes" : "Add to chart")
            )
        )
    );
}
