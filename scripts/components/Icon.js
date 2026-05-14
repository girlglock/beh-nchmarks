export function Icon({ name, className = "", style = {} }) {
    return React.createElement("i", {
        className: "icon-" + name + (className ? " " + className : ""),
        style,
        "aria-hidden": "true"
    });
}
