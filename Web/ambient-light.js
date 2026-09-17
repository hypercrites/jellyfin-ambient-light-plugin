(() => {
    const PLUGIN_ID = "b40b0a76-4ff2-4b39-a35b-5d1193e3f0c7";
    const STORAGE_PREFIX = "jfAmbientLightUserEnabled";
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
        button: null,
        userId: "default"
    };

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function getUserId() {
        try {
            if (window.ApiClient && typeof ApiClient.getCurrentUserId === "function") {
                const id = ApiClient.getCurrentUserId();
                if (id) {
                    return String(id);
                }
            }
        } catch (_) {
        }

        return "default";
    }

    function getStorageKey() {
        return `${STORAGE_PREFIX}:${state.userId}`;
    }

    function getStoredUserEnabled() {
        try {
            const key = getStorageKey();
            const stored = localStorage.getItem(key);

            if (stored !== null) {
                return stored === "true";
            }

            const legacy = localStorage.getItem(STORAGE_PREFIX);
            if (legacy !== null) {
                localStorage.setItem(key, legacy);
                localStorage.removeItem(STORAGE_PREFIX);
                return legacy === "true";
            }
        } catch (_) {
        }

        return state.enabledByDefault;
    }

    function setStoredUserEnabled(enabled) {
        try {
            localStorage.setItem(getStorageKey(), String(enabled));
        } catch (_) {
        }
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
            state.ctx.drawImage(
                state.video,
                0,
                0,
                state.canvas.width,
                state.canvas.height
            );
        } catch (_) {
        }
    }

    function setupPlayer(video, container) {
        cleanupPlayer();

        state.video = video;
        state.container = container;
        state.lastSource = video.currentSrc || video.src || null;
        state.enabled = getStoredUserEnabled();

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

        state.timer = setInterval(() => {
            updateCanvas(false);
        }, Math.round(1000 / state.fps));
    }

    function checkPlayer() {
        if (!getStoredUserEnabled()) {
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

    function isFullscreenButton(element) {
        if (!element) {
            return false;
        }

        const title = element.getAttribute("title") || "";
        const ariaLabel = element.getAttribute("aria-label") || "";
        const text = element.textContent || "";
        const className = typeof element.className === "string" ? element.className : "";

        const label = `${title} ${ariaLabel} ${text} ${className}`.toLowerCase();

        if (/fullscreen|full screen|vollbild/.test(label)) {
            return true;
        }

        const icon = element.querySelector(".material-icons, .material-icons-round, [class*='material-icons']");
        if (icon) {
            const iconText = (icon.textContent || "").trim().toLowerCase();
            if (iconText === "fullscreen" || iconText === "fullscreen_exit") {
                return true;
            }
        }

        return false;
    }

    function findFullscreenButton() {
        const container = document.querySelector(".videoPlayerContainer");
        if (!container) {
            return null;
        }

        const candidates = container.querySelectorAll("button, a, [role='button']");

        for (const element of candidates) {
            if (isFullscreenButton(element)) {
                return element;
            }
        }

        return null;
    }

    function findButtonHost(fullscreenButton) {
        let current = fullscreenButton?.parentElement || null;
        let fallback = current;

        for (let depth = 0; current && depth < 5; depth++, current = current.parentElement) {
            const directControls = [...current.children].filter(element =>
                element.matches?.("button, a, [role='button']")
            );

            if (directControls.length >= 2) {
                return current;
            }

            if (current.matches?.("[class*='buttons'], [class*='Buttons'], .videoOsdBottom")) {
                fallback = current;
            }
        }

        return fallback;
    }

    function getDirectChildContaining(parent, element) {
        if (!parent || !element) {
            return null;
        }

        for (const child of parent.children) {
            if (child === element || child.contains(element)) {
                return child;
            }
        }

        return null;
    }

    function positionButtonBeforeFullscreen(button, fullscreenButton) {
        const host = findButtonHost(fullscreenButton);

        if (!host) {
            return false;
        }

        const target = getDirectChildContaining(host, fullscreenButton);

        if (!target) {
            return false;
        }

        if (button.parentElement !== host || button.nextElementSibling !== target) {
            host.insertBefore(button, target);
        }

        return true;
    }

    function createButton() {
        if (!state.showButton) {
            removeButton();
            return;
        }

        const fullscreenButton = findFullscreenButton();
        if (!fullscreenButton) {
            return;
        }

        let button = document.getElementById(BUTTON_ID);

        if (!button) {
            button = document.createElement("button");
            button.type = "button";
            button.id = BUTTON_ID;
            button.className = "paper-icon-button-light";
            button.title = "Ambient Light";
            button.setAttribute("aria-label", "Ambient Light");
            button.setAttribute("aria-pressed", String(getStoredUserEnabled()));
            button.setAttribute("data-jf-ambient-light-button", "true");
            button.innerHTML = '<span class="material-icons">blur_on</span>';

            button.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                setUserEnabled(!getStoredUserEnabled());
            });
        }

        state.button = button;

        positionButtonBeforeFullscreen(button, fullscreenButton);
        updateButton();
    }

    function updateButton() {
        const button = state.button || document.getElementById(BUTTON_ID);
        if (!button) {
            return;
        }

        const enabled = getStoredUserEnabled();

        button.style.opacity = enabled ? "1" : "0.45";
        button.title = enabled ? "Ambient Light: Ein" : "Ambient Light: Aus";
        button.setAttribute("aria-label", enabled ? "Ambient Light: Ein" : "Ambient Light: Aus");
        button.setAttribute("aria-pressed", String(enabled));
    }

    function removeButton() {
        const button = document.getElementById(BUTTON_ID);

        if (button) {
            button.remove();
        }

        state.button = null;
    }

    function setUserEnabled(enabled) {
        state.enabled = enabled;
        setStoredUserEnabled(enabled);

        if (enabled) {
            checkPlayer();
        } else {
            cleanupPlayer();
        }

        updateButton();
    }

    async function loadConfiguration() {
        state.userId = getUserId();

        try {
            if (!window.ApiClient || typeof ApiClient.getPluginConfiguration !== "function") {
                state.enabled = getStoredUserEnabled();
                return;
            }

            const config = await ApiClient.getPluginConfiguration(PLUGIN_ID);

            state.enabledByDefault = config.EnabledByDefault !== false;
            state.showButton = config.ShowPlayerButton !== false;
            state.blur = clamp(Number(config.Blur) || 100, 0, 200);
            state.fps = clamp(Number(config.Fps) || 12, 1, 30);
            state.opacity = clamp(Number(config.Opacity) || 90, 0, 100);
            state.scale = clamp(Number(config.Scale) || 1.08, 1, 1.5);
            state.enabled = getStoredUserEnabled();
        } catch (_) {
            state.enabled = getStoredUserEnabled();
        }
    }

    function checkButton() {
        if (!state.showButton) {
            removeButton();
            return;
        }

        createButton();
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
        delete window.__jfAmbientLightLoaded;
    };

    (async () => {
        await loadConfiguration();
        checkPlayer();
        checkButton();
        startObservers();
        console.log("Jellyfin Ambient Light aktiviert.");
    })();
})();
