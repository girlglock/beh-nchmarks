import { App } from "./App.js";
import { resolveGameIcon, resolveOsIcon, resolveApiIcon } from "./utils.js";

const SPINNER = "https://samherbert.net/svg-loaders/svg-loaders/tail-spin.svg";

const GH_OWNER = "girlglock";
const GH_REPO = "beh-nchmarks";
const GH_BRANCH = "main";
const RAW_BASE = "https://raw.githubusercontent.com/" + GH_OWNER + "/" + GH_REPO + "/" + GH_BRANCH + "/";

const DATA_PATH = /^data\/.+\.json$/;

function isValidEntry(d) {
    return (
        d !== null &&
        typeof d === "object" &&
        typeof d.id === "number" &&
        typeof d.label === "string" &&
        Array.isArray(d.samples) &&
        d.samples.length > 0 &&
        d.samples.every(s => typeof s === "number") &&
        d.tags !== null &&
        typeof d.tags === "object" &&
        typeof d.tags.type === "string" &&
        typeof d.tags.unit === "string"
    );
}

function friendlyPath(url) {
    const idx = url.indexOf("/data/");
    return idx !== -1 ? url.slice(idx + 1) : url.split("/").pop();
}

function formatReset(resetHeader) {
    if (!resetHeader) return null;
    const d = new Date(Number(resetHeader) * 1000);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function resolveDataUrls() {
    const r = await fetch(
        "https://api.github.com/repos/" + GH_OWNER + "/" + GH_REPO + "/git/trees/" + GH_BRANCH + "?recursive=1"
    );

    if (r.status === 403 || r.status === 429) {
        const body = await r.json().catch(() => ({}));
        const resetAt = formatReset(r.headers.get("X-RateLimit-Reset"));
        const err = new Error(body.message || "GitHub API rate limit exceeded");
        err.rateLimit = true;
        err.resetAt = resetAt;
        throw err;
    }

    if (!r.ok) throw new Error("GitHub API " + r.status);

    const { tree } = await r.json();
    return tree
        .filter(e => e.type === "blob" && DATA_PATH.test(e.path))
        .map(e => RAW_BASE + e.path);
}

function collectIconUrls(entries) {
    const seen = new Set();
    const urls = [];
    for (const e of entries) {
        for (const icon of [
            resolveGameIcon(e.tags?.game),
            resolveOsIcon(e.tags?.os),
            resolveApiIcon(e.tags?.api),
        ]) {
            if (icon?.url && !seen.has(icon.url)) {
                seen.add(icon.url);
                urls.push(icon.url);
            }
        }
    }
    return urls;
}

async function preloadIcons(urls, onProgress) {
    for (let i = 0; i < urls.length; i++) {
        await new Promise(resolve => {
            const img = new Image();
            img.onload = img.onerror = resolve;
            img.src = urls[i];
        });
        onProgress(i + 1, urls.length);
        if (i < urls.length - 1) await new Promise(r => setTimeout(r, 100));
    }
}

function Root() {
    const [appData, setAppData] = React.useState(null);
    const [loadMsg, setLoadMsg] = React.useState("resolving file list...");
    const [loadCounter, setLoadCounter] = React.useState(null);
    const [rateError, setRateError] = React.useState(null);

    React.useEffect(() => {
        const t0 = Date.now();

        const localData = fetch("./data/data.json")
            .then(r => r.ok ? r.json() : [])
            .catch(() => []);

        resolveDataUrls()
            .then(urls => {
                if (urls.length === 0) {
                    setLoadMsg("no data files found");
                    setTimeout(() => setAppData([]), Math.max(0, 2000 - (Date.now() - t0)));
                    return null;
                }

                let done = 0;
                const total = urls.length;

                return Promise.all(
                    urls.map(url =>
                        fetch(url)
                            .then(r => r.json())
                            .then(data => {
                                done++;
                                setLoadMsg(friendlyPath(url));
                                setLoadCounter("(" + done + " / " + total + ")");
                                return data;
                            })
                            .catch(() => { done++; return []; })
                    )
                );
            })
            .then(async arrays => {
                if (!arrays) return;
                const local = await localData;
                const merged = [...local, ...arrays.flat()].filter(isValidEntry);

                const iconUrls = collectIconUrls(merged);
                if (iconUrls.length > 0) {
                    setLoadMsg("loading icons...");
                    setLoadCounter(null);
                    await preloadIcons(iconUrls, (done, total) => {
                        setLoadCounter("(" + done + " / " + total + ")");
                    });
                    setLoadCounter(null);
                }

                const wait = 2000 - (Date.now() - t0);
                setTimeout(() => setAppData(merged), Math.max(0, wait));
            })
            .catch(err => {
                if (err.rateLimit) {
                    setRateError(err);
                } else {
                    setAppData([]);
                }
            });
    }, []);

    return React.createElement(React.Fragment, null,
        React.createElement(App, { data: appData || [] }),
        (appData === null || rateError) && React.createElement("div", { className: "loading-overlay" },
            rateError
                ? React.createElement(React.Fragment, null,
                    React.createElement("span", { className: "loading-error" },
                        "GitHub API rate limit exceeded.",
                        rateError.resetAt && React.createElement("span", null, " Resets at " + rateError.resetAt + ".")
                    ),
                    React.createElement("small", { style: { color: "rgba(255,255,255,0.35)", fontSize: "0.68rem" } },
                        "60 unauthenticated requests per hour. Try again later."
                    )
                )
                : React.createElement(React.Fragment, null,
                    React.createElement("img", { src: SPINNER, width: 48, height: 48 }),
                    React.createElement("div", { className: "loading-status-group" },
                        React.createElement("span", { className: "loading-status" }, loadMsg),
                        loadCounter !== null && React.createElement("span", { className: "loading-counter" }, loadCounter)
                    )
                )
        )
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Root));
