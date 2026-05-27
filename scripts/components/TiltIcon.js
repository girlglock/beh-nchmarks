const { useRef, useEffect } = React;

const SCALE = 4;
const MAX_TILT = 35;

let _active = null;

function getSVGAncestors(el) {
    let fo = null;
    let tick = null;
    let node = el.parentNode;
    while (node) {
        const tag = node.tagName?.toLowerCase();
        if (tag === "foreignobject") fo = node;
        if (node.classList?.contains("recharts-cartesian-axis-tick")) tick = node;
        if (tag === "svg") break;
        node = node.parentNode;
    }
    return { fo, tick };
}

function liftToTop(node) {
    if (!node?.parentNode) return;
    node._origNext = node.nextSibling;
    node.parentNode.appendChild(node);
}

function restorePosition(node) {
    if (!node?.parentNode || !("_origNext" in node)) return;
    node.parentNode.insertBefore(node, node._origNext);
    delete node._origNext;
}

function deactivate(el) {
    if (!el) return;
    el.style.transition = "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1)";
    el.style.transform = "";
    el.style.zIndex = "";

    const { fo, tick } = getSVGAncestors(el);
    restorePosition(fo);
    restorePosition(tick);

    if (_active === el) _active = null;
}

export function TiltIcon({ info, size = 20 }) {
    const ref = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        const onMove = (e) => {
            const r = el.getBoundingClientRect();
            const inside = e.clientX >= r.left && e.clientX <= r.right
                && e.clientY >= r.top && e.clientY <= r.bottom;
            const x = (e.clientX - r.left) / r.width - 0.5;
            const y = (e.clientY - r.top) / r.height - 0.5;

            if (inside) {
                if (_active !== el) {
                    if (_active) deactivate(_active);
                    _active = el;
                    el.style.zIndex = "200";

                    const { fo, tick } = getSVGAncestors(el);
                    liftToTop(fo);
                    liftToTop(tick);

                    el.style.transition = "transform 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)";
                } else {
                    el.style.transition = "transform 0.05s linear";
                }

                el.style.transform = `scale(${SCALE}) perspective(300px) rotateX(${-y * MAX_TILT}deg) rotateY(${x * MAX_TILT}deg)`;
            } else if (_active === el) {
                deactivate(el);
            }
        };

        document.addEventListener("mousemove", onMove);
        return () => {
            document.removeEventListener("mousemove", onMove);
            if (_active === el) deactivate(el);
        };
    }, []);

    return React.createElement("img", {
        ref,
        src: info.url,
        width: size,
        height: size,
        loading: "lazy",
        className: "bench-icon-tilt",
        style: { display: "block", objectFit: info.cover ? "cover" : "contain", borderRadius: 3 },
        onError: e => { e.target.style.display = "none"; },
    });
}
