import { calcStats, resolveOsIcon, resolveApiIcon, resolveGameIcon } from "../utils.js";
import { BENCHMARKERS } from "../constants.js";
import { TiltIcon } from "./TiltIcon.js";

export function BenchTooltip({ active, payload, dataLookup, colorMap }) {
    if (!active || !payload?.length) return null;
    const id = payload[0]?.payload?.id;
    const d = id !== undefined ? dataLookup[id] : null;
    if (!d) return null;

    const s = calcStats(d.samples);
    const osInfo = resolveOsIcon(d.tags.os);
    const apiInfo = resolveApiIcon(d.tags.api);
    const gameInfo = resolveGameIcon(d.tags.game);
    const bm = d.tags.benchmarker ? BENCHMARKERS[d.tags.benchmarker] : null;

    const tagStr = Object.entries(d.tags)
        .filter(([k, v]) => v && v !== d.tags.unit && v !== "n/a" && k !== "benchmarker")
        .map(([k, v]) => k + "=" + v)
        .join("  /  ");

    const specsStr = bm?.specs
        ? Object.values(bm.specs).filter(Boolean).join("  ·  ")
        : null;

    return React.createElement("div", { className: "bench-tooltip" },
        React.createElement("div", { className: "bench-tooltip-title" },
            gameInfo && React.createElement(TiltIcon, { info: gameInfo }),
            osInfo && React.createElement(TiltIcon, { info: osInfo }),
            apiInfo && React.createElement(TiltIcon, { info: apiInfo }),
            React.createElement("span", { className: "legend-dot", style: { background: colorMap[id] } }),
            d.label
        ),
        React.createElement("div", { className: "bench-tooltip-grid" },
            React.createElement("span", { className: "bench-tooltip-key" }, "mean"),
            React.createElement("span", { className: "bench-tooltip-val" }, s.mean + " " + d.tags.unit),
            React.createElement("span", { className: "bench-tooltip-key" }, "1% low"),
            React.createElement("span", { className: "bench-tooltip-val" }, s.min + " " + d.tags.unit),
            React.createElement("span", { className: "bench-tooltip-key" }, "99% high"),
            React.createElement("span", { className: "bench-tooltip-val" }, s.max + " " + d.tags.unit),
            React.createElement("span", { className: "bench-tooltip-key" }, "+/- sd"),
            React.createElement("span", { className: "bench-tooltip-val" }, s.sd + " " + d.tags.unit),
            React.createElement("span", { className: "bench-tooltip-key" }, "p50"),
            React.createElement("span", { className: "bench-tooltip-val" }, s.p50 + " " + d.tags.unit),
            React.createElement("span", { className: "bench-tooltip-key" }, "p95"),
            React.createElement("span", { className: "bench-tooltip-val" }, s.p95 + " " + d.tags.unit),
            React.createElement("span", { className: "bench-tooltip-key" }, "n"),
            React.createElement("span", { className: "bench-tooltip-val" }, d.samples.length)
        ),
        bm && React.createElement("div", { className: "bench-tooltip-benchmarker" },
            bm.pfp
                ? React.createElement("img", { src: bm.pfp, className: "bm-pfp", alt: bm.name, onError: e => { e.target.style.display = "none"; } })
                : React.createElement("span", { className: "bm-pfp-fallback" }, bm.name[0].toUpperCase()),
            React.createElement("span", { className: "bm-info" },
                bm.link
                    ? React.createElement("a", { href: bm.link, target: "_blank", rel: "noopener noreferrer", className: "bm-link" }, bm.name)
                    : React.createElement("span", { className: "bm-link" }, bm.name),
                specsStr && React.createElement("span", { className: "bm-specs" }, specsStr)
            )
        ),
        tagStr && React.createElement("div", { className: "bench-tooltip-tags" }, tagStr)
    );
}
