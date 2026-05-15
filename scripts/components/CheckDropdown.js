import { Icon } from "./Icon.js";

const { useState, useRef, useEffect } = React;

export function CheckDropdown({ label, options, available, selected, onChange, renderOption }) {
    const [open, setOpen] = useState(false);
    const [customVal, setCustomVal] = useState("");
    const ref = useRef(null);

    useEffect(() => {
        const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", h);
        return () => document.removeEventListener("mousedown", h);
    }, []);

    const toggle = (val) =>
        onChange(selected.includes(val) ? selected.filter(x => x !== val) : [...selected, val]);

    const addCustom = () => {
        const v = customVal.trim();
        if (v && !selected.includes(v)) onChange([...selected, v]);
        setCustomVal("");
    };

    const btnLabel = selected.length === 0
        ? label
        : label + ": " + selected.map(s => s || "(none)").join(", ");

    return React.createElement("div", { className: "filter-dropdown", ref },
        React.createElement("div", {
            className: "filter-btn" + (selected.length > 0 ? " has-selection" : ""),
            onClick: () => setOpen(o => !o)
        },
            React.createElement(Icon, { name: "filter", className: "icon-xs" }),
            btnLabel,
            React.createElement(Icon, { name: "chevron-down", className: "icon-xs", style: { opacity: 0.6 } })
        ),
        open && React.createElement("div", { className: "filter-panel" },
            options.map(o => {
                const isAvailable = !available || available.has(o);
                const isChecked = selected.includes(o);
                return React.createElement("label", {
                    key: String(o),
                    style: isAvailable ? undefined : { opacity: 0.38, cursor: "default" }
                },
                    React.createElement("input", { type: "checkbox", checked: isChecked, onChange: () => toggle(o) }),
                    renderOption ? renderOption(o) : (o || "(none)")
                );
            }),
            !renderOption && React.createElement("div", { className: "custom-input-row" },
                React.createElement("input", {
                    type: "text",
                    placeholder: "custom...",
                    value: customVal,
                    onChange: e => setCustomVal(e.target.value),
                    onKeyDown: e => { if (e.key === "Enter") addCustom(); }
                }),
                React.createElement("button", {
                    onClick: addCustom,
                    style: { padding: "0.2rem 0.5rem", fontSize: "0.72rem" }
                }, "Add")
            ),
            selected.length > 0 && React.createElement("button", { className: "clear-btn", onClick: () => onChange([]) }, "Clear filter")
        )
    );
}
