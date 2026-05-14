import { BenchTooltip } from "./BenchTooltip.js";
import { calcStats, resolveOsIcon, resolveApiIcon } from "../utils.js";
import { COLORS } from "../constants.js";

const { useState, useMemo, useRef, useEffect } = React;

const ROW_H = 56;

function orderItems(items, pinnedIds) {
    const byId     = Object.fromEntries(items.map(d => [d.id, d]));
    const pinned   = pinnedIds.filter(id => byId[id]).map(id => byId[id]);
    const unpinned = items
        .filter(d => !pinnedIds.includes(d.id))
        .sort((a, b) => calcStats(a.samples).mean - calcStats(b.samples).mean);
    return [...pinned, ...unpinned];
}

function PinLabel({ x, y, width, height, id, index, isPinned, onTogglePin, onDragStart }) {
    const [hovered, setHovered] = useState(false);
    const SIZE  = 13;
    const PAD   = 5;
    const iconX = x + PAD;
    const iconY = y + (height - SIZE) / 2;

    return React.createElement("g", {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false)
    },
        React.createElement("rect", {
            x, y, width, height,
            fill:  "transparent",
            style: { cursor: onDragStart ? "grab" : "pointer" },
            onClick:     onDragStart ? undefined : () => onTogglePin(id),
            onMouseDown: onDragStart
                ? (e) => { e.preventDefault(); onDragStart(id, index, e.clientY); }
                : undefined
        }),
        hovered && React.createElement("foreignObject", {
            x: iconX, y: iconY, width: SIZE, height: SIZE,
            style: { overflow: "visible", pointerEvents: "none" }
        },
            React.createElement("i", {
                xmlns: "http://www.w3.org/1999/xhtml",
                className: "icon-" + (isPinned ? "pin-off" : "pin"),
                style: {
                    fontSize: SIZE + "px",
                    lineHeight: 1,
                    display: "block",
                    color: isPinned ? "var(--pico-primary)" : "rgba(255,255,255,0.75)"
                }
            })
        ),
        hovered && React.createElement("rect", {
            x: iconX, y: iconY, width: SIZE, height: SIZE,
            fill: "transparent", style: { cursor: "pointer" },
            onClick: e => { e.stopPropagation(); onTogglePin(id); }
        })
    );
}

function YAxisTick({ x, y, payload, index, chartData, dataLookup }) {
    const entry   = chartData?.[index];
    const name    = entry ? entry.name : (payload.value || "");
    const d       = entry ? dataLookup[entry.id] : null;
    const osInfo  = d ? resolveOsIcon(d.tags.os)  : null;
    const apiInfo = d ? resolveApiIcon(d.tags.api) : null;

    const ICON_SIZE = 20;
    const GAP       = 4;
    const slots     = [osInfo, apiInfo];
    const count     = slots.filter(Boolean).length;
    const iconsW    = count > 0 ? count * ICON_SIZE + (count - 1) * GAP + GAP : 0;
    let col = 0;

    return React.createElement("g", { transform: "translate(" + x + "," + y + ")" },
        slots.map((info, i) => {
            if (!info) return React.createElement("g", { key: "e" + i });
            const ix = -x + col++ * (ICON_SIZE + GAP);
            return React.createElement("foreignObject", {
                key: "s" + i, x: ix, y: -ICON_SIZE / 2,
                width: ICON_SIZE, height: ICON_SIZE,
                style: { overflow: "visible" }
            },
                React.createElement("img", {
                    xmlns: "http://www.w3.org/1999/xhtml",
                    src: info.url, width: ICON_SIZE, height: ICON_SIZE,
                    style: { display: "block" },
                    onError: e => { e.target.style.display = "none"; }
                })
            );
        }),
        React.createElement("text", {
            x: -x + iconsW, y: 0, dy: "0.355em",
            textAnchor: "start", fontSize: 11, fill: "var(--pico-color)"
        }, name)
    );
}

export function ChartCard({ unit, items, colorMap, pinnedIds, onTogglePin, isPinnedSection = false, onReorderPin }) {
    const RC = window.Recharts;

    const [draggingId, setDraggingId] = useState(null);
    const [dropIndex,  setDropIndex]  = useState(null);

    const ordered    = useMemo(
        () => isPinnedSection ? items : orderItems(items, pinnedIds),
        [items, pinnedIds, isPinnedSection]
    );
    const dataLookup = useMemo(() => Object.fromEntries(items.map(d => [d.id, d])), [items]);

    const chartData = ordered.map((d, i) => {
        const s = calcStats(d.samples);
        return {
            name: d.label, yKey: i + "_" + d.id,
            mean: s.mean,
            error: [+(s.mean - s.min).toFixed(3), +(s.max - s.mean).toFixed(3)],
            min: s.min, max: s.max,
            unit, id: d.id
        };
    });

    const chartHeight  = Math.max(160, ordered.length * ROW_H + 50);
    const containerRef = useRef(null);
    const [yAxisWidth, setYAxisWidth] = useState(200);

    useEffect(() => {
        if (!containerRef.current) return;
        const canvas = document.createElement("canvas");
        const ctx    = canvas.getContext("2d");
        ctx.font     = "11px sans-serif";
        const maxTW      = Math.max(...chartData.map(d => ctx.measureText(d.name).width));
        const hasIcons   = items.some(d => resolveOsIcon(d.tags.os) || resolveApiIcon(d.tags.api));
        const containerW = containerRef.current.offsetWidth;
        const capped     = Math.min(Math.ceil(maxTW) + (hasIcons ? 48 : 0) + 8, containerW * 0.55);
        setYAxisWidth(Math.max(90, capped));
    }, [chartData, containerRef.current]);

    function startDrag(id, fromIndex, clientY) {
        setDraggingId(id);
        setDropIndex(fromIndex);
        document.body.style.cursor = "grabbing";
        let curr     = fromIndex;
        let hasMoved = false;

        const onMove = (e) => {
            const dy = e.clientY - clientY;
            if (Math.abs(dy) > 4) hasMoved = true;
            curr = Math.max(0, Math.min(ordered.length - 1, Math.round(fromIndex + dy / ROW_H)));
            setDropIndex(curr);
        };

        const onUp = () => {
            document.body.style.cursor = "";
            if (hasMoved && onReorderPin) onReorderPin(id, curr);
            setDraggingId(null);
            setDropIndex(null);
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup",   onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup",   onUp);
    }

    if (!RC) return React.createElement("article", null,
        React.createElement("p", { style: { color: "var(--pico-del-color)" } }, "Recharts failed to load.")
    );

    const renderLabel = (props) => {
        const { index, x, y, width, height } = props;
        const entry = chartData[index];
        if (!entry) return null;
        const isPinned  = pinnedIds.includes(entry.id);
        const onDragSt  = isPinnedSection && onReorderPin
            ? (id, idx, cy) => startDrag(id, idx, cy)
            : null;
        const ty = y + height / 2;
        return React.createElement("g", null,
            width >= 160 && React.createElement("text", {
                x: x + 24, y: ty, dominantBaseline: "middle", textAnchor: "start",
                fontSize: 10, fontFamily: "monospace", fill: "rgba(255,255,255,0.82)", pointerEvents: "none"
            }, entry.mean + " " + entry.unit + " (1%: " + entry.min + ", 99%: " + entry.max + ")"),
            width >= 60 && width < 160 && React.createElement("text", {
                x: x + 24, y: ty, dominantBaseline: "middle", textAnchor: "start",
                fontSize: 10, fontFamily: "monospace", fill: "rgba(255,255,255,0.82)", pointerEvents: "none"
            }, entry.mean + " " + entry.unit),
            React.createElement(PinLabel, { x, y, width, height, id: entry.id, index, isPinned, onTogglePin, onDragStart: onDragSt })
        );
    };

    const renderYTick = (props) => React.createElement(YAxisTick, { ...props, chartData, dataLookup });

    return React.createElement("article", { ref: containerRef },
        React.createElement(RC.ResponsiveContainer, { width: "100%", height: chartHeight },
            React.createElement(RC.BarChart, { data: chartData, layout: "vertical", margin: { top: 4, right: 40, bottom: 4, left: 0 } },
                React.createElement(RC.CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--pico-muted-border-color)", horizontal: false }),
                React.createElement(RC.XAxis, { type: "number", tick: { fontSize: 11 }, unit: " " + unit }),
                React.createElement(RC.YAxis, { type: "category", dataKey: "yKey", width: yAxisWidth, tick: renderYTick }),
                React.createElement(RC.Tooltip, {
                    content: React.createElement(BenchTooltip, { dataLookup, colorMap }),
                    cursor: false
                }),
                React.createElement(RC.Bar, { dataKey: "mean", name: "mean", radius: [0, 4, 4, 0], barSize: 28, label: renderLabel, isAnimationActive: false },
                    chartData.map((entry, i) => {
                        const isDragging   = entry.id === draggingId;
                        const isDropTarget = isPinnedSection && draggingId !== null && i === dropIndex && !isDragging;
                        return React.createElement(RC.Cell, {
                            key: i,
                            fill:        colorMap[entry.id] || COLORS[i % COLORS.length],
                            fillOpacity: isDragging ? 0.3 : 1,
                            stroke:      isDropTarget ? "var(--pico-primary)" : "none",
                            strokeWidth: isDropTarget ? 2 : 0
                        });
                    }),
                    React.createElement(RC.ErrorBar, { dataKey: "error", width: 4, strokeWidth: 2, stroke: "var(--pico-muted-color)", direction: "x" })
                )
            )
        )
    );
}
