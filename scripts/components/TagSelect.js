import { PRESET_OPTIONS } from "../constants.js";
import { Icon } from "./Icon.js";

const { useState, useRef, useEffect } = React;

export function TagSelect({ fieldKey, value, onChange, presetOptions }) {
    const [open, setOpen] = useState(false);
    const [customVal, setCustomVal] = useState("");
    const [panelStyle, setPanelStyle] = useState({});
    const triggerRef = useRef(null);

    const presets = presetOptions ?? (PRESET_OPTIONS[fieldKey] || []);
    const isCustom = value && !presets.includes(value);

    useEffect(() => {
        const h = (e) => {
            if (!e.target.closest(".tag-select-panel") && !e.target.closest(".tag-select-trigger")) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const openPanel = () => {
        if (triggerRef.current) {
            const r = triggerRef.current.getBoundingClientRect();
            setPanelStyle({ top: r.bottom + 2, left: r.left, width: r.width });
        }
        setOpen(o => !o);
    };

    const select = (v) => { onChange(v); setOpen(false); setCustomVal(""); };

    const addCustom = () => {
        const v = customVal.trim();
        if (v) select(v);
    };

    return React.createElement("div", { className: "tag-select" },
        React.createElement("div", {
            ref: triggerRef,
            className: "tag-select-trigger" + (value ? " has-value" : "") + (open ? " open" : ""),
            onClick: openPanel
        },
            React.createElement("span", null, value || "select..."),
            React.createElement(Icon, { name: "chevron-down", className: "icon-xs", style: { opacity: 0.5, flexShrink: 0 } })
        ),
        open && React.createElement("div", { className: "tag-select-panel", style: panelStyle },
            value && React.createElement("div", {
                className: "tag-select-option tag-select-clear",
                onClick: () => select("")
            }, "clear"),
            presets.map(p => React.createElement("div", {
                key: p,
                className: "tag-select-option" + (value === p ? " active" : ""),
                onClick: () => select(p)
            }, p)),
            isCustom && React.createElement("div", {
                className: "tag-select-option active",
                onClick: () => select(value)
            }, value + " (custom)"),
            React.createElement("div", { className: "tag-select-custom-row" },
                React.createElement("input", {
                    type: "text",
                    placeholder: "custom...",
                    value: customVal,
                    onChange: e => setCustomVal(e.target.value),
                    onKeyDown: e => { if (e.key === "Enter") addCustom(); },
                    onClick: e => e.stopPropagation()
                }),
                React.createElement("button", {
                    onClick: addCustom,
                    disabled: !customVal.trim(),
                    style: { padding: "0.2rem 0.5rem", fontSize: "0.72rem" }
                }, "add")
            )
        )
    );
}
