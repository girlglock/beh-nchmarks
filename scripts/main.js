import { App } from "./App.js";

const SPINNER = "https://samherbert.net/svg-loaders/svg-loaders/tail-spin.svg";

function Root() {
    const [appData, setAppData] = React.useState(null);

    React.useEffect(() => {
        const t0 = Date.now();
        fetch("data.json")
            .then(r => r.json())
            .then(json => {
                const wait = 2000 - (Date.now() - t0);
                setTimeout(() => setAppData(json), Math.max(0, wait));
            });
    }, []);

    return React.createElement(React.Fragment, null,
        React.createElement(App, { data: appData || [] }),
        appData === null && React.createElement("div", { className: "loading-overlay" },
            React.createElement("img", { src: SPINNER, width: 48, height: 48 })
        )
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Root));
