import { Icon } from "./Icon.js";

const { useState } = React;

export function ScreenshotPopup({ onConfirm, onCancel }) {
    const [title, setTitle] = useState("");
    const [footer, setFooter] = useState("beh-nchmarks");
    const [width, setWidth] = useState("");
    const [height, setHeight] = useState("");

    return React.createElement("div", {
        className: "modal-overlay",
        onClick: e => { if (e.target === e.currentTarget) onCancel(); }
    },
        React.createElement("div", { className: "modal-box session-popup" },
            React.createElement("h4", null,
                React.createElement(Icon, { name: "camera", className: "icon-sm" }),
                " Screenshot"
            ),
            React.createElement("div", { className: "modal-form" },
                React.createElement("span", { className: "form-label" }, "Title"),
                React.createElement("input", {
                    type: "text", value: title,
                    placeholder: "optional title...",
                    onChange: e => setTitle(e.target.value),
                    style: { margin: 0, gridColumn: "span 3" }
                }),
                React.createElement("span", { className: "form-label" }, "Footer"),
                React.createElement("input", {
                    type: "text", value: footer,
                    onChange: e => setFooter(e.target.value),
                    style: { margin: 0, gridColumn: "span 3" }
                }),
                React.createElement("span", { className: "form-label" }, "Width"),
                React.createElement("input", {
                    type: "number", value: width,
                    placeholder: "auto", min: 400, step: 100,
                    onChange: e => setWidth(e.target.value),
                    style: { margin: 0 }
                }),
                React.createElement("span", { className: "form-label" }, "Height"),
                React.createElement("input", {
                    type: "number", value: height,
                    placeholder: "auto", min: 300, step: 100,
                    onChange: e => setHeight(e.target.value),
                    style: { margin: 0 }
                })
            ),
            React.createElement("div", { className: "modal-actions" },
                React.createElement("button", { className: "secondary outline", onClick: onCancel }, "Cancel"),
                React.createElement("button", {
                    onClick: () => onConfirm({
                        title: title.trim(),
                        footer: footer.trim(),
                        outW: parseInt(width) || 0,
                        outH: parseInt(height) || 0,
                    })
                },
                    React.createElement(Icon, { name: "download", className: "icon-sm" }),
                    " Download"
                )
            )
        )
    );
}
