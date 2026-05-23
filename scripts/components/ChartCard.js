import { BenchTooltip } from "./BenchTooltip.js";
import { TiltIcon } from "./TiltIcon.js";
import { calcStats, resolveOsIcon, resolveApiIcon, resolveGameIcon, resolveDisplaySamples, resolveDisplayUnit } from "../utils.js";
import { COLORS } from "../constants.js";

const { useState, useMemo } = React;

const MIN_ROW_H = 56;
const LINE_H = 14;
const SEPARATOR_H = 28;
const END_SEPARATOR_H = 14;

const _ctx = (() => {
    try { const c = document.createElement("canvas"); c.getContext("2d").font = "11px sans-serif"; return c.getContext("2d"); }
    catch { return null; }
})();
function measureText(str) { return _ctx ? _ctx.measureText(str).width : str.length * 6.5; }

function calcLabelFontSize(name, availW) {
    const words = name.split(/\s+/);
    const maxWordW = Math.max(...words.map(w => measureText(w)));
    if (maxWordW <= availW) return 11;
    return Math.max(8, 11 * availW / maxWordW);
}


function orderItemsGrouped(items, pinnedIds) {
    const byId = Object.fromEntries(items.map(d => [d.id, d]));
    const pinned = pinnedIds.filter(id => byId[id]).map(id => byId[id]);
    const unpinned = items.filter(d => !pinnedIds.includes(d.id));

    const groupMap = {};
    const ungrouped = [];
    unpinned.forEach(d => {
        if (d.group) {
            if (!groupMap[d.group]) groupMap[d.group] = [];
            groupMap[d.group].push(d);
        } else {
            ungrouped.push(d);
        }
    });

    const sortByMean = arr => arr.sort((a, b) => calcStats(a.samples).mean - calcStats(b.samples).mean);
    Object.values(groupMap).forEach(sortByMean);
    sortByMean(ungrouped);

    const result = [...pinned];
    Object.keys(groupMap).sort().forEach(groupName => {
        result.push({ __separator: true, __groupName: groupName, id: "sep__" + groupName });
        result.push(...groupMap[groupName]);
        result.push({ __separator: true, __endSeparator: true, id: "endsep__" + groupName });
    });
    result.push(...ungrouped);
    return result;
}

function PinLabel({ x, y, width, height, id, index, isPinned, onTogglePin, onDragStart }) {
    const [hovered, setHovered] = useState(false);
    const SIZE = 13;
    const PAD = 5;
    const iconX = x + PAD;
    const iconY = y + (height - SIZE) / 2;

    return React.createElement("g", {
        onMouseEnter: () => setHovered(true),
        onMouseLeave: () => setHovered(false)
    },
        React.createElement("rect", {
            x, y, width, height,
            fill: "transparent",
            style: { cursor: onDragStart ? "grab" : "pointer" },
            onClick: onDragStart ? undefined : () => onTogglePin(id),
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

function GroupSeparatorTick({ x, y, groupName, isEndSeparator }) {
    if (isEndSeparator) {
        return React.createElement("g", { transform: "translate(" + x + "," + y + ")" },
            React.createElement("line", {
                x1: -x + 8, y1: 0, x2: -2, y2: 0,
                stroke: "var(--pico-primary)", strokeOpacity: 0.2, strokeWidth: 1,
                strokeDasharray: "3 3"
            })
        );
    }
    return React.createElement("g", { transform: "translate(" + x + "," + y + ")" },
        React.createElement("line", {
            x1: -x + 8, y1: 0, x2: -2, y2: 0,
            stroke: "var(--pico-primary)", strokeOpacity: 0.3, strokeWidth: 1
        }),
        React.createElement("foreignObject", {
            x: -x + 8, y: -10, width: x - 12, height: 20,
            style: { overflow: "visible" }
        },
            React.createElement("div", {
                xmlns: "http://www.w3.org/1999/xhtml",
                style: {
                    fontSize: "9px", fontWeight: 700,
                    textTransform: "uppercase", letterSpacing: "0.09em",
                    color: "var(--pico-primary)", opacity: 0.8,
                    display: "flex", alignItems: "center",
                    height: "100%"
                }
            }, groupName)
        )
    );
}

function YAxisTick({ x, y, payload, index, chartData, dataLookup, rowH = MIN_ROW_H }) {
    const entry = chartData?.[index];
    const name = entry ? entry.name : (payload.value || "");
    const d = entry ? dataLookup[entry.id] : null;
    const osInfo = d ? resolveOsIcon(d.tags.os) : null;
    const apiInfo = d ? resolveApiIcon(d.tags.api) : null;
    const gameInfo = d ? resolveGameIcon(d.tags.game) : null;

    const ICON_SIZE = 20;
    const GAP = 4;
    const slots = [gameInfo, osInfo, apiInfo];
    const count = slots.filter(Boolean).length;
    const iconsW = count > 0 ? count * ICON_SIZE + (count - 1) * GAP + GAP : 0;
    let col = 0;

    const textX = -x + iconsW;
    const availW = x - iconsW - 8;
    const fontSize = calcLabelFontSize(name, availW);
    const lineCount = Math.max(1, Math.ceil(measureText(name) * (fontSize / 11) / availW));
    const tickH = Math.min(rowH - 4, Math.max(LINE_H, lineCount * (LINE_H + 1)));
    const tickY = -tickH / 2;

    return React.createElement("g", { transform: "translate(" + x + "," + y + ")" },
        slots.map((info, i) => {
            if (!info) return React.createElement("g", { key: "e" + i });
            const ix = -x + col++ * (ICON_SIZE + GAP);
            return React.createElement("foreignObject", {
                key: "s" + i, x: ix, y: -ICON_SIZE / 2,
                width: ICON_SIZE, height: ICON_SIZE,
                style: { overflow: "visible" }
            },
                React.createElement(TiltIcon, { info, size: ICON_SIZE })
            );
        }),
        React.createElement("foreignObject", {
            x: textX, y: tickY, width: availW, height: tickH,
            style: { overflow: "visible", pointerEvents: "none" }
        },
            React.createElement("div", {
                style: {
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center",
                }
            },
                React.createElement("span", {
                    style: {
                        fontSize: fontSize + "px", color: "var(--pico-color)",
                        whiteSpace: "normal",
                        lineHeight: 1.3, display: "block",
                    }
                }, name)
            )
        )
    );
}

export function ChartCard({ unit, items, colorMap, pinnedIds, onTogglePin, isPinnedSection = false, onReorderPin, compactLabels = false, yAxisWidth = 160 }) {
    const RC = window.Recharts;

    const [draggingId, setDraggingId] = useState(null);
    const [dropIndex, setDropIndex] = useState(null);

    const ordered = useMemo(
        () => isPinnedSection ? items : orderItemsGrouped(items, pinnedIds),
        [items, pinnedIds, isPinnedSection]
    );
    const dataLookup = useMemo(() => Object.fromEntries(items.map(d => [d.id, d])), [items]);

    const { chartData, statsLookup } = useMemo(() => {
        const statsLookup = {};
        const chartData = ordered.map((d, i) => {
            if (d.__separator) {
                return { yKey: i + "__sep", mean: 0, error: [0, 0], min: 0, max: 0, unit, id: d.id, __separator: true, __groupName: d.__groupName };
            }
            const displayUnit = resolveDisplayUnit(d);
            const s = calcStats(resolveDisplaySamples(d));
            statsLookup[d.id] = { s, displayUnit };
            return {
                name: d.label, yKey: i + "_" + d.id,
                mean: s.mean,
                error: [+(s.mean - s.min).toFixed(3), +(s.max - s.mean).toFixed(3)],
                min: s.min, max: s.max,
                unit, id: d.id
            };
        });
        return { chartData, statsLookup };
    }, [ordered, unit]);

    const rowH = useMemo(() => {
        const regular = ordered.filter(d => !d.__separator);
        if (!regular.length) return MIN_ROW_H;
        const approxAvailW = Math.max(1, yAxisWidth - 8);
        const maxLines = Math.max(...regular.map(d => {
            const fs = calcLabelFontSize(d.label, approxAvailW);
            return Math.ceil(measureText(d.label) * (fs / 11) / approxAvailW);
        }));
        return Math.max(MIN_ROW_H, maxLines * (LINE_H + 1) + 28 + 16);
    }, [ordered, yAxisWidth]);

    const endSepCount = ordered.filter(d => d.__endSeparator).length;
    const startSepCount = ordered.filter(d => d.__separator && !d.__endSeparator).length;
    const regularCount = ordered.length - endSepCount - startSepCount;
    const chartHeight = Math.max(160, regularCount * rowH + startSepCount * SEPARATOR_H + endSepCount * END_SEPARATOR_H + 50);

    function startDrag(id, fromIndex, clientY) {
        setDraggingId(id);
        setDropIndex(fromIndex);
        document.body.style.cursor = "grabbing";
        let curr = fromIndex;
        let hasMoved = false;

        const onMove = (e) => {
            const dy = e.clientY - clientY;
            if (Math.abs(dy) > 4) hasMoved = true;
            curr = Math.max(0, Math.min(ordered.length - 1, Math.round(fromIndex + dy / rowH)));
            setDropIndex(curr);
        };

        const onUp = () => {
            document.body.style.cursor = "";
            if (hasMoved && onReorderPin) onReorderPin(id, curr);
            setDraggingId(null);
            setDropIndex(null);
            document.removeEventListener("mousemove", onMove);
            document.removeEventListener("mouseup", onUp);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
    }

    if (!RC) return React.createElement("article", null,
        React.createElement("p", { style: { color: "var(--pico-del-color)" } }, "Recharts failed to load.")
    );

    const renderLabel = (props) => {
        const { index, x, y, width, height } = props;
        const entry = chartData[index];
        if (!entry || entry.__separator) return null;
        const isPinned = pinnedIds.includes(entry.id);
        const onDragSt = isPinnedSection && onReorderPin
            ? (id, idx, cy) => startDrag(id, idx, cy)
            : null;

        let labelText = null;
        if (compactLabels) {
            if (width >= 40) {
                labelText = React.createElement("text", {
                    x: x + 6, y: y - 2,
                    dominantBaseline: "auto", textAnchor: "start",
                    fontSize: 10, fontFamily: "monospace", fill: "rgba(255,255,255,0.82)", pointerEvents: "none"
                }, width >= 130
                    ? entry.mean + " " + entry.unit + " (1%: " + entry.min + ", 99%: " + entry.max + ")"
                    : entry.mean + " " + entry.unit
                );
            }
        } else {
            const ty = y + height / 2;
            if (width >= 160) {
                labelText = React.createElement("text", {
                    x: x + 24, y: ty, dominantBaseline: "middle", textAnchor: "start",
                    fontSize: 10, fontFamily: "monospace", fill: "rgba(255,255,255,0.82)", pointerEvents: "none"
                }, entry.mean + " " + entry.unit + " (1%: " + entry.min + ", 99%: " + entry.max + ")");
            } else if (width >= 60) {
                labelText = React.createElement("text", {
                    x: x + 24, y: ty, dominantBaseline: "middle", textAnchor: "start",
                    fontSize: 10, fontFamily: "monospace", fill: "rgba(255,255,255,0.82)", pointerEvents: "none"
                }, entry.mean + " " + entry.unit);
            }
        }

        return React.createElement("g", null,
            labelText,
            React.createElement(PinLabel, { x, y, width, height, id: entry.id, index, isPinned, onTogglePin, onDragStart: onDragSt })
        );
    };

    const renderYTick = (props) => {
        const entry = chartData[props.index];
        if (entry?.__separator) return React.createElement(GroupSeparatorTick, { ...props, groupName: entry.__groupName, isEndSeparator: !!entry.__endSeparator });
        return React.createElement(YAxisTick, { ...props, chartData, dataLookup, rowH });
    };

    return React.createElement("article", null,
        React.createElement("span", { className: "chart-unit-label" }, items[0]?.tags?.type || unit),
        React.createElement(RC.ResponsiveContainer, { width: "100%", height: chartHeight },
            React.createElement(RC.BarChart, { data: chartData, layout: "vertical", margin: { top: 4, right: 40, bottom: 4, left: 0 } },
                React.createElement(RC.CartesianGrid, { strokeDasharray: "3 3", stroke: "var(--pico-muted-border-color)", horizontal: false }),
                React.createElement(RC.XAxis, { type: "number", tick: { fontSize: 11 }, unit: " " + unit }),
                React.createElement(RC.YAxis, { type: "category", dataKey: "yKey", width: yAxisWidth, tick: renderYTick }),
                React.createElement(RC.Tooltip, {
                    content: React.createElement(BenchTooltip, { dataLookup, statsLookup, colorMap }),
                    cursor: false
                }),
                React.createElement(RC.Bar, { dataKey: "mean", name: "mean", radius: [0, 4, 4, 0], barSize: 28, label: renderLabel, isAnimationActive: false },
                    chartData.map((entry, i) => {
                        if (entry.__separator) return React.createElement(RC.Cell, { key: i, fill: "transparent", fillOpacity: 0, stroke: "none", strokeWidth: 0 });
                        const isDragging = entry.id === draggingId;
                        const isDropTarget = isPinnedSection && draggingId !== null && i === dropIndex && !isDragging;
                        return React.createElement(RC.Cell, {
                            key: i,
                            fill: colorMap[entry.id] || COLORS[i % COLORS.length],
                            fillOpacity: isDragging ? 0.3 : 1,
                            stroke: isDropTarget ? "var(--pico-primary)" : "none",
                            strokeWidth: isDropTarget ? 2 : 0
                        });
                    }),
                    React.createElement(RC.ErrorBar, { dataKey: "error", width: 4, strokeWidth: 2, stroke: "var(--pico-muted-color)", direction: "x" })
                )
            )
        )
    );
}
