(() => {
    const PLUGIN_ID = "b40b0a76-4ff2-4b39-a35b-5d1193e3f0c7";
    const STORAGE_KEY = "jfAmbientLightUserEnabled";
    const BUTTON_ID = "jf-ambient-light-player-button";
    const CANVAS_ID = "jf-ambient-light-canvas";

    if (window.__jfAmbientLightLoaded) {
        return;
    }

    window.__jfAmbientLightLoaded = true;

    const state = {
        enabledByDefault: true,
        enabled: true,
        showButton: true,
        blur: 100,
        fps: 12,
        opacity: 90,
        scale: 1.08,
        video: null,
        container: null,
        canvas: null,
        ctx: null,
        timer: null,
        observer: null,
        playerTimer: null,
        buttonTimer: null,
        videoEvents: [],
        originalStyles: {},
        lastSource: null,
        button: null
    };

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function removeVideoEvents() {
        for (const [element, type, handler] of state.videoEvents) {
            element.removeEventListener(type, handler);
        }
        state.videoEvents = [];
    }

    function restoreVideo() {
        if (!state.video) {
            return;
        }

        for (const [property, value] of Object.entries(state.originalStyles)) {
            if (value) {
                state.video.style.setProperty(property, value);
            } else {
                state.video.style.removeProperty(property);
            }
        }
        state.originalStyles = {};
    }

    function cleanupPlayer() {
        if (state.timer) {
            clearInterval(state.timer);
            state.timer = null;
        }

        removeVideoEvents();

        if (state.canvas) {
            state.canvas.remove();
        }

        restoreVideo();

        state.video = null;
        state.container = null;
        state.canvas = null;
        state.ctx = null;
        state.lastSource = null;
    }

    function getUserEnabled() {
        const stored = localStorage.getItem(STORAGE_KEY);

        if (stored === null) {
            return state.enabledByDefault;
        }

        return stored === "true";
    }

    function setUserEnabled(enabled) {
        localStorage.setItem(STORAGE_KEY, String(enabled));
        state.enabled = enabled;

        if (enabled) {
            checkPlayer();
        } else {
            cleanupPlayer();
        }

        updateButton();
    }

    async function loadConfiguration() {
        try {
            if (!window.ApiClient || typeof ApiClient.getPluginConfiguration !== "function") {
                return;
            }

            const config = await ApiClient.getPluginConfiguration(PLUGIN_ID);

            state.enabledByDefault = config.EnabledByDefault !== false;
            state.enabled = getUserEnabled();
            state.showButton = config.ShowPlayerButton !== false;
            state.blur = clamp(Number(config.Blur) || 100, 0, 200);
            state.fps = clamp(Number(config.Fps) || 12, 1, 30);
            state.opacity = clamp(Number(config.Opacity) || 90, 0, 100);
            state.scale = clamp(Number(config.Scale) || 1.08, 1, 1.5);
        } catch (_) {
        }
    }

    function findPlayer() {
        const video = document.querySelector("video.htmlvideoplayer");

        if (!video) {
            return null;
        }

        const container = video.closest(".videoPlayerContainer");

        if (!container) {
            return null;
        }

        return { video, container };
    }

    function updateCanvas(force = false) {
        if (!state.video || !state.canvas || !state.ctx) {
            return;
        }

        if (state.video.readyState < 2) {
            return;
        }

        if (!force && (state.video.paused || state.video.ended)) {
            return;
        }

        try {
            state.ctx.drawImage(state.video, 0, 0, state.canvas.width, state.canvas.height);
        } catch (_) {
        }
    }

    function setupPlayer(video, container) {
        cleanupPlayer();

        state.video = video;
        state.container = container;
        state.lastSource = video.currentSrc || video.src || null;
        state.enabled = getUserEnabled();

        if (!state.enabled) {
            return;
        }

        state.originalStyles = {
            position: video.style.getPropertyValue("position"),
            zIndex: video.style.getPropertyValue("z-index"),
            filter: video.style.getPropertyValue("filter"),
            opacity: video.style.getPropertyValue("opacity")
        };

        const canvas = document.createElement("canvas");
        canvas.id = CANVAS_ID;
        canvas.width = 320;
        canvas.height = 180;

        Object.assign(canvas.style, {
            position: "absolute",
            left: "0",
            top: "0",
            width: "100%",
            height: "100%",
            filter: `blur(${state.blur}px)`,
            transform: `scale(${state.scale})`,
            transformOrigin: "center",
            opacity: String(state.opacity / 100),
            pointerEvents: "none",
            zIndex: "0"
        });

        state.canvas = canvas;
        state.ctx = canvas.getContext("2d", { alpha: false });

        container.style.position = "relative";

        Object.assign(video.style, {
            position: "absolute",
            zIndex: "10",
            filter: "none",
            opacity: "1"
        });

        container.insertBefore(canvas, video);

        const onPlay = () => updateCanvas(true);
        const onLoadedData = () => updateCanvas(true);
        const onLoadedMetadata = () => updateCanvas(true);
        const onSeeked = () => updateCanvas(true);

        video.addEventListener("play", onPlay);
        video.addEventListener("loadeddata", onLoadedData);
        video.addEventListener("loadedmetadata", onLoadedMetadata);
        video.addEventListener("seeked", onSeeked);

        state.videoEvents.push(
            [video, "play", onPlay],
            [video, "loadeddata", onLoadedData],
            [video, "loadedmetadata", onLoadedMetadata],
            [video, "seeked", onSeeked]
        );

        updateCanvas(true);
        state.timer = setInterval(() => updateCanvas(false), Math.round(1000 / state.fps));
    }

    function checkPlayer() {
        if (!getUserEnabled()) {
            if (state.video || state.canvas) {
                cleanupPlayer();
            }
            return;
        }

        const player = findPlayer();

        if (!player) {
            cleanupPlayer();
            return;
        }

        const currentSource = player.video.currentSrc || player.video.src || null;

        if (
            player.video !== state.video ||
            player.container !== state.container ||
            !state.canvas ||
            !state.canvas.isConnected ||
            currentSource !== state.lastSource
        ) {
            setupPlayer(player.video, player.container);
        }
    }

    function findButtonHost() {
        const bottom = document.querySelector(".videoOsdBottom");
        if (!bottom) {
            return null;
        }

        const selectors = [
            ".buttons",
            ".videoOsdButtons",
            "[class*='buttons']"
        ];

        for (const selector of selectors) {
            const candidate = bottom.querySelector(selector);
            if (candidate) {
                return candidate;
            }
        }

        const button = bottom.querySelector("button, a");
        return button ? button.parentElement : null;
    }

    function createButton() {
        if (!state.showButton) {
            removeButton();
            return;
        }

        const existing = document.getElementById(BUTTON_ID);
        if (existing) {
            state.button = existing;
            updateButton();
            return;
        }

        const host = findButtonHost();
        if (!host) {
            return;
        }

        const button = document.createElement("button");
        button.type = "button";
        button.id = BUTTON_ID;
        button.className = "paper-icon-button-light";
        button.title = "Ambient Light";
        button.setAttribute("aria-label", "Ambient Light");
        button.setAttribute("data-jf-ambient-light-button", "true");
        button.innerHTML = '<span class="material-icons">auto_awesome</span>';

        button.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();
            setUserEnabled(!getUserEnabled());
        });

        host.appendChild(button);
        state.button = button;
        updateButton();
    }

    function updateButton() {
        const button = state.button || document.getElementById(BUTTON_ID);
        if (!button) {
            return;
        }

        const enabled = getUserEnabled();
        button.style.opacity = enabled ? "1" : "0.45";
        button.title = enabled ? "Ambient Light: Ein" : "Ambient Light: Aus";
        button.setAttribute("aria-pressed", String(enabled));
    }

    function removeButton() {
        const button = document.getElementById(BUTTON_ID);
        if (button) {
            button.remove();
        }
        state.button = null;
    }

    function checkButton() {
        if (!state.showButton) {
            removeButton();
            return;
        }

        createButton();
        updateButton();
    }

    function startObservers() {
        state.observer = new MutationObserver(() => {
            checkPlayer();
            checkButton();
        });

        state.observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        state.playerTimer = setInterval(checkPlayer, 1500);
        state.buttonTimer = setInterval(checkButton, 1000);
    }

    window.jfAmbientLightStop = () => {
        if (state.playerTimer) {
            clearInterval(state.playerTimer);
            state.playerTimer = null;
        }

        if (state.buttonTimer) {
            clearInterval(state.buttonTimer);
            state.buttonTimer = null;
        }

        if (state.observer) {
            state.observer.disconnect();
            state.observer = null;
        }

        cleanupPlayer();
        removeButton();

        delete window.jfAmbientLightStop;
    };

    (async () => {
        await loadConfiguration();
        checkPlayer();
        checkButton();
        startObservers();
    })();
})();
