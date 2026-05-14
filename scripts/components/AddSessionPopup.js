import { TagSelect }    from "./TagSelect.js";
import { Icon }         from "./Icon.js";
import { BENCHMARKERS, osPresetsFor } from "../constants.js";

const { useState } = React;

export function AddSessionPopup({ samples, onConfirm, onCancel, initial }) {
    const isEdit = !!initial;

    const [form, setForm] = useState({
        label:       initial?.label           || "Test " + new Date().toLocaleTimeString(),
        game:        initial?.tags?.game       || "",
        os:          initial?.tags?.os         || "",
        api:         initial?.tags?.api        || "",
        dsp:         initial?.tags?.dsp        || "",
        de:          initial?.tags?.de         || "",
        benchmarker: initial?.tags?.benchmarker || "girlglock",
        unit: "ms"
    });

    const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

    const setOS = (v) => {
        const validDSP = osPresetsFor("dsp", v);
        const validDE  = osPresetsFor("de",  v);
        const validAPI = osPresetsFor("api", v);
        setForm(prev => ({
            ...prev,
            os:  v,
            dsp: validDSP.includes(prev.dsp) ? prev.dsp : "",
            de:  validDE.includes(prev.de)   ? prev.de  : "",
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

    return React.createElement("div", {
        className: "modal-overlay",
        onClick: e => { if (e.target === e.currentTarget) onCancel(); }
    },
        React.createElement("div", { className: "modal-box session-popup" },
            React.createElement("h4", null,
                React.createElement(Icon, { name: isEdit ? "pencil" : "plus-circle", className: "icon-sm" }),
                isEdit ? " Edit session" : " Add to chart"
            ),
            React.createElement("div", { className: "modal-form" },
                L("Label"),
                React.createElement("input", {
                    type: "text", value: form.label,
                    onChange: e => set("label", e.target.value),
                    style: { margin: 0, gridColumn: "2 / -1" }
                }),
                L("Game"),  F("game"),
                L("OS"),
                React.createElement(TagSelect, {
                    fieldKey: "os",
                    value: form.os,
                    onChange: setOS
                }),
                L("API"),   F("api", osPresetsFor("api", form.os)),
                L("DSP"),   F("dsp", osPresetsFor("dsp", form.os)),
                L("DE"),    F("de",  osPresetsFor("de",  form.os)),
                L("Benchmarker"),
                React.createElement("select", {
                    value: form.benchmarker,
                    onChange: e => set("benchmarker", e.target.value),
                    style: { margin: 0, gridColumn: "span 3" }
                },
                    React.createElement("option", { value: "" }, "none"),
                    Object.values(BENCHMARKERS).map(b =>
                        React.createElement("option", { key: b.id, value: b.id }, b.name)
                    )
                )
            ),
            React.createElement("small", { style: { color: "var(--pico-muted-color)" } },
                samples.length + " samples"
            ),
            React.createElement("div", { className: "modal-actions" },
                React.createElement("button", { className: "secondary outline", onClick: onCancel }, "Cancel"),
                React.createElement("button", { onClick: () => onConfirm(form) }, isEdit ? "Save changes" : "Add to chart")
            )
        )
    );
}
