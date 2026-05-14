export class SerialManager {
    constructor() {
        this._port       = null;
        this._reader     = null;
        this._lineBuffer = "";
    }

    get hasSerial()   { return "serial" in navigator; }
    get isConnected() { return this._port !== null; }

    async getPorts() {
        if (!this.hasSerial) return [];
        try { return await navigator.serial.getPorts(); } catch { return []; }
    }

    async _tryOpen(port, baudRate) {
        this._port = port;
        try {
            await this._port.open({ baudRate });
            return { ok: true };
        } catch (e) {
            const msg = e.message || "";
            if (msg.toLowerCase().includes("already open") || msg.toLowerCase().includes("in use")) {
                return { ok: true, alreadyOpen: true };
            }
            this._port = null;
            return { ok: false, error: msg };
        }
    }

    getInfo() {
        if (!this._port) return null;
        try { return this._port.getInfo(); } catch { return null; }
    }

    formatLabel(baudRate, suffix = "") {
        const info = this.getInfo();
        const vid  = info ? "VID:0x" + (info.usbVendorId || 0).toString(16).padStart(4, "0") : "device";
        return vid + " @ " + baudRate + (suffix ? " " + suffix : "");
    }

    async requestAndOpen(baudRate) {
        try {
            const port = await navigator.serial.requestPort();
            return await this._tryOpen(port, baudRate);
        } catch (e) {
            if (e.name === "NotFoundError") return { ok: false, cancelled: true };
            return { ok: false, error: e.message };
        }
    }

    async autoConnect(baudRate) {
        const ports = await this.getPorts();
        if (ports.length === 0) return { ok: false, noPorts: true };
        return await this._tryOpen(ports[0], baudRate);
    }

    async sendLine(str) {
        if (!this._port?.writable) return;
        try {
            const writer = this._port.writable.getWriter();
            await writer.write(new TextEncoder().encode(str + "\n"));
            writer.releaseLock();
        } catch { }
    }

    async startReading(onLine) {
        const dec = new TextDecoder();
        this._lineBuffer = "";
        try {
            while (this._port?.readable) {
                try {
                    this._reader = this._port.readable.getReader();
                } catch {
                    this._reader = null;
                    break;
                }
                try {
                    while (true) {
                        const { value, done } = await this._reader.read();
                        if (done) break;
                        this._lineBuffer += dec.decode(value);
                        let nl;
                        while ((nl = this._lineBuffer.indexOf("\n")) !== -1) {
                            const line = this._lineBuffer.slice(0, nl).trim();
                            this._lineBuffer = this._lineBuffer.slice(nl + 1);
                            if (line) onLine(line);
                        }
                    }
                } finally {
                    try { this._reader.releaseLock(); } catch { }
                    this._reader = null;
                }
            }
        } catch { }
    }

    async cancelRead() {
        try {
            if (this._reader) {
                await this._reader.cancel();
                this._reader = null;
            }
        } catch { }
    }

    async close() {
        await this.cancelRead();
        try {
            if (this._port) await this._port.close();
        } catch { }
        this._port = null;
    }
}
