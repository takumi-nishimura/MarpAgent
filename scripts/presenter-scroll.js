// Body scrolling is independent of Bespoke's native page/fragment sync.
(function () {
    function initialize() {
        const bodies = Array.from(
            document.querySelectorAll(
                'section[data-marpagent-scroll="true"] > .marpagent-scroll-body',
            ),
        );
        if (!bodies.length) return;
        const byId = new Map(
            bodies.map((body) => [body.parentElement.id, body]),
        );
        const positions = new Map();
        const expected = new WeakMap();
        let channel;
        let pending;
        let printing = false;
        let printPositions;
        let restoreFrame;

        function view() {
            return document.body.getAttribute("data-bespoke-view");
        }

        function activeBody() {
            if (view() === "next" || view() === "overview") return null;
            if (view() === null) {
                const focused = document.activeElement?.closest(
                    ".marpagent-scroll-body",
                );
                return bodies.includes(focused) ? focused : bodies[0];
            }
            return document.querySelector(
                '.bespoke-marp-active section[data-marpagent-scroll="true"] > .marpagent-scroll-body',
            );
        }

        function range(body) {
            return Math.max(0, body.scrollHeight - body.clientHeight);
        }

        function fraction(body) {
            const max = range(body);
            return max ? Math.max(0, Math.min(1, body.scrollTop / max)) : 0;
        }

        function valid(value) {
            return typeof value === "number" && Number.isFinite(value);
        }

        function apply(body, value) {
            if (!body.clientHeight) return;
            const top = value * range(body);
            expected.set(body, top);
            body.scrollTop = top;
        }

        function restore() {
            restoreFrame = undefined;
            if (printing) return;
            const body = activeBody();
            if (body && positions.has(body.parentElement.id)) {
                apply(body, positions.get(body.parentElement.id));
            }
        }

        function scheduleRestore() {
            if (!restoreFrame) restoreFrame = requestAnimationFrame(restore);
        }

        function receivePosition(id, value, initial = false) {
            if (
                !byId.has(id) ||
                !valid(value) ||
                (initial && positions.has(id))
            )
                return;
            value = Math.max(0, Math.min(1, value));
            positions.set(id, value);
            const body = byId.get(id);
            if (!printing && body === activeBody()) apply(body, value);
        }

        function connect() {
            if (channel || !["", "presenter"].includes(view())) return;
            const session = window.history.state?.marpBespokeSyncKey;
            if (
                typeof session !== "string" ||
                !session ||
                !window.BroadcastChannel
            )
                return;
            const deck = new URL(window.location.href);
            deck.hash = "";
            for (const name of ["view", "sync", "f"])
                deck.searchParams.delete(name);
            deck.searchParams.sort();
            try {
                channel = new BroadcastChannel(
                    "marpagent-scroll:" + JSON.stringify([deck.href, session]),
                );
            } catch {
                return;
            }
            channel.addEventListener("message", ({ data }) => {
                if (!data || typeof data !== "object") return;
                if (data.type === "request") {
                    channel.postMessage({
                        type: "state",
                        positions: Object.fromEntries(positions),
                    });
                } else if (
                    data.type === "state" &&
                    data.positions &&
                    typeof data.positions === "object" &&
                    !Array.isArray(data.positions)
                ) {
                    for (const [id, value] of Object.entries(data.positions)) {
                        receivePosition(id, value, true);
                    }
                } else if (data.type === "scroll") {
                    receivePosition(data.slide, data.fraction);
                }
            });
            // A new presenter requests remembered positions instead of publishing
            // its initial zero and overwriting an already scrolled presentation.
            channel.postMessage({ type: "request" });
        }

        for (const body of bodies) {
            body.addEventListener("scroll", () => {
                if (printing || body !== activeBody() || !body.clientHeight)
                    return;
                const target = expected.get(body);
                if (
                    target !== undefined &&
                    Math.abs(body.scrollTop - target) < 1.5
                )
                    return;
                expected.delete(body);
                const id = body.parentElement.id;
                const value = fraction(body);
                const prior = positions.get(id);
                if (
                    prior !== undefined &&
                    Math.abs(prior - value) * range(body) < 1
                )
                    return;
                positions.set(id, value);
                if (pending) cancelAnimationFrame(pending);
                pending = requestAnimationFrame(() => {
                    pending = undefined;
                    if (!printing && channel && body === activeBody()) {
                        channel.postMessage({
                            type: "scroll",
                            slide: id,
                            fraction: positions.get(id),
                        });
                    }
                });
            });
            // Do not cancel the browser's default scroll. Only prevent Bespoke's
            // ancestor listeners from treating a body gesture as page navigation.
            for (const name of [
                "wheel",
                "touchstart",
                "touchmove",
                "touchend",
                "touchcancel",
            ]) {
                body.addEventListener(
                    name,
                    (event) => {
                        if (range(body) > 0) event.stopPropagation();
                    },
                    { passive: true },
                );
            }
        }

        const controls = [
            "input",
            "textarea",
            "select",
            "button",
            "a[href]",
            "audio",
            "video",
            "[contenteditable]:not([contenteditable='false'])",
            "[role='button']",
            "[role='slider']",
            "[role='textbox']",
            "[tabindex]",
        ].join(",");
        function isControl(element) {
            if (!(element instanceof Element)) return false;
            const control = element.closest(controls);
            return (
                control && !control.classList.contains("marpagent-scroll-body")
            );
        }
        document.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.altKey ||
                    event.ctrlKey ||
                    event.metaKey ||
                    event.shiftKey ||
                    isControl(event.target) ||
                    isControl(document.activeElement)
                )
                    return;
                const body = activeBody();
                if (!body) return;
                const max = range(body);
                if (max === 0) return;
                let top;
                switch (event.key) {
                    case "ArrowUp":
                        top = body.scrollTop - 40;
                        break;
                    case "ArrowDown":
                        top = body.scrollTop + 40;
                        break;
                    case "PageUp":
                        top = body.scrollTop - body.clientHeight * 0.9;
                        break;
                    case "PageDown":
                        top = body.scrollTop + body.clientHeight * 0.9;
                        break;
                    case "Home":
                        top = 0;
                        break;
                    case "End":
                        top = max;
                        break;
                    default:
                        return;
                }
                event.preventDefault();
                event.stopImmediatePropagation();
                expected.delete(body);
                body.scrollTop = Math.max(0, Math.min(max, top));
            },
            true,
        );

        const observer = new MutationObserver(scheduleRestore);
        for (const slide of document.querySelectorAll("svg[data-marpit-svg]")) {
            observer.observe(slide, {
                attributes: true,
                attributeFilter: ["class"],
            });
        }
        if (window.ResizeObserver) {
            const resize = new ResizeObserver(scheduleRestore);
            for (const body of bodies) resize.observe(body);
        }
        window.addEventListener("beforeprint", () => {
            if (printing) return;
            printing = true;
            if (pending) cancelAnimationFrame(pending);
            pending = undefined;
            printPositions = new Map(
                bodies.map((body) => [body, body.scrollTop]),
            );
            for (const body of bodies) apply(body, 0);
        });
        window.addEventListener("afterprint", () => {
            if (!printing) return;
            for (const [body, top] of printPositions) {
                expected.set(body, top);
                body.scrollTop = top;
            }
            // Print layout and its scroll events settle asynchronously.
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    printing = false;
                    scheduleRestore();
                }),
            );
        });
        window.addEventListener("pagehide", () => {
            if (channel) channel.close();
            channel = undefined;
        });
        window.addEventListener("pageshow", connect);
        connect();
    }

    if (document.readyState === "loading") {
        window.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
