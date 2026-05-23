export const COLORS = [
    "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#a855f7",
    "#14b8a6", "#f97316", "#ec4899", "#84cc16", "#06b6d4",
    "#8b5cf6", "#10b981", "#f43f5e", "#0ea5e9", "#d97706"
];

export const STORAGE_KEY = "benchmark_arduino_sessions";
export const LAST_BAUD_KEY = "arduino_last_baud";

export const PRESET_OPTIONS = {
    os: ["cachyos", "ubuntu", "debian", "arch", "fedora", "w10", "w11"],
    api: ["vulkan", "opengl", "dx11", "dx12", "metal"],
    dsp: ["wayland", "x11", "dwm"],
    de: ["kde", "gnome", "hyprland", "sway", "w11shell", "w10shell"],
    game: ["cs2", "overwatch", "valorant", "apex legends", "reflex arena", "qc", "minecraft"],
    unit: ["ms", "fps"]
};

const LINUX_OS = new Set(["cachyos", "ubuntu", "debian", "arch", "fedora"]);
const WINDOWS_OS = new Set(["w10", "w11"]);

export function osPresetsFor(fieldKey, selectedOS) {
    const isLinux = LINUX_OS.has(selectedOS);
    const isWindows = WINDOWS_OS.has(selectedOS);

    if (fieldKey === "dsp") {
        if (isLinux) return ["wayland", "x11"];
        if (isWindows) return ["dwm"];
    }
    if (fieldKey === "de") {
        if (isLinux) return ["kde", "gnome", "hyprland", "sway"];
        if (isWindows) return ["w11shell", "w10shell"];
    }
    if (fieldKey === "api") {
        if (isLinux) return ["vulkan", "opengl", "dx11", "dx12"];
        if (isWindows) return ["vulkan", "opengl", "dx11", "dx12"];
    }
    return PRESET_OPTIONS[fieldKey] || [];
}

export const OS_ICON_MAP = {
    cachyos: { url: "https://cdn.simpleicons.org/cachyos/20a4f3" },
    ubuntu: { url: "https://cdn.simpleicons.org/ubuntu/e95420" },
    debian: { url: "https://cdn.simpleicons.org/debian/a81d33" },
    arch: { url: "https://cdn.simpleicons.org/archlinux/1793d1" },
    fedora: { url: "https://cdn.simpleicons.org/fedora/51a2da" },
    w10: { url: "https://upload.wikimedia.org/wikipedia/commons/5/5f/Windows_logo_-_2012.svg" },
    w11: { url: "https://www.icosix.com/uploads/icons/2025/12/windows-11.png" },
};

export const API_ICON_MAP = {
    vulkan: { url: "https://cdn.simpleicons.org/vulkan/ac1a25" },
    opengl: { url: "https://cdn.simpleicons.org/opengl/5586a4" },
    dx11: { url: "https://directx11.org/wp-content/uploads/2025/06/directx11.webp" },
    dx12: { url: "https://devblogs.microsoft.com/directx/wp-content/uploads/sites/42/2017/01/XII_BLACK_1kx1k.jpg" },
    metal: { url: "https://cdn.simpleicons.org/apple/888888" },
};

const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com/steam/apps";

export const STEAM_APP_IDS = {
    cs2: 730,
    overwatch: 2357570,
    "apex legends": 1172470,
    qc: 611500,
    "reflex arena": 328070,
    subnautica2: 1962700,
    "forza horizon 6": 2483190
};

export function steamIconUrl(appId) {
    return { url: STEAM_CDN + "/" + appId + "/hero_capsule.jpg", cover: true };
}

export const GAME_ICON_MAP = {
    valorant: { url: "https://cdn.simpleicons.org/valorant/ff4655", cover: false },
    minecraft: { url: "https://static.wikia.nocookie.net/logopedia/images/7/7a/Minecraft_2013_launcher.svg/revision/latest/scale-to-width-down/250?cb=20240606114031", cover: false },
};

export const BENCHMARKERS = {
    girlglock: {
        id: "girlglock",
        name: "girlglock",
        pfp: "https://femboy.beauty/I1uWCZ.jpg",
        link: "https://x.com/girlglock_",
    },
    cs2kitchen: {
        id: "cs2kitchen",
        name: "cs2kitchen",
        pfp: "https://pbs.twimg.com/profile_images/1862572274148159488/BSKE46mA_400x400.jpg",
        link: "https://x.com/iamcs2kitchen",
    }
};
