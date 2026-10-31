// Keep absolute footnotes in place while fitting an opted-in body above them.
(function () {
    function initialize() {
        window.__marpagentBodyFootnotes?.dispose();
        const selector = 'section:not(.title):not([data-marpagent-scroll="true"]):not(:has(> .paper-header))';
        const sections = [...document.querySelectorAll("section:has(> .body)")];
        if (!sections.length) return;
        const property = "--marpagent-body-bottom-reserve";
        const observed = new WeakSet();
        let frame;
        let disposed = false;
        const number = (value) => Number.parseFloat(value) || 0;

        function update() {
            frame = undefined;
            if (disposed) return;
            for (const section of sections) {
                const body = section.querySelector(":scope > .body");
                if (!body || !section.isConnected) continue;
                const notes = section.matches(selector)
                    ? [...section.querySelectorAll(":scope > .footnote")]
                    : [];
                const slide = section.getBoundingClientRect();
                // Rectangles include presentation/overview scaling; margins use
                // the unscaled section coordinates. Hidden slides retry on resize.
                const scale = slide.height / section.offsetHeight;
                if (!Number.isFinite(scale) || scale <= 0) continue;
                const tops = [];
                for (const note of notes) {
                    if (!observed.has(note)) {
                        resize?.observe(note);
                        mutation.observe(note, { attributes: true, childList: true, characterData: true, subtree: true });
                        observed.add(note);
                    }
                    const rect = note.getBoundingClientRect();
                    if (rect.height > 0 && rect.width > 0) tops.push((rect.top - slide.top) / scale);
                }
                let value = "";
                if (tops.length) {
                    const style = getComputedStyle(section);
                    const bottom = section.offsetHeight - number(style.borderBottomWidth) - number(style.paddingBottom);
                    const gap = number(getComputedStyle(body).rowGap);
                    const reserve = Math.ceil(Math.max(0, bottom - Math.min(...tops) + gap) * 64) / 64;
                    // Retain section- or body-local author overrides as a floor.
                    value = `max(var(--body-bottom-safe), ${reserve}px)`;
                }
                if (body.style.getPropertyValue(property) !== value) {
                    if (value) body.style.setProperty(property, value);
                    else body.style.removeProperty(property);
                }
            }
        }
        function schedule() {
            if (!disposed && frame === undefined) frame = requestAnimationFrame(update);
        }
        const resize = window.ResizeObserver ? new ResizeObserver(schedule) : null;
        const mutation = new MutationObserver(schedule);
        for (const section of sections) {
            resize?.observe(section);
            mutation.observe(section, { attributes: true, attributeFilter: ["class", "style", "data-marpagent-scroll"], childList: true });
            mutation.observe(section.querySelector(":scope > .body"), { attributes: true, attributeFilter: ["class", "style"] });
        }
        window.addEventListener("resize", schedule);
        window.addEventListener("beforeprint", update);
        window.addEventListener("afterprint", schedule);
        document.fonts?.ready.then(update);
        update();
        window.__marpagentBodyFootnotes = {
            dispose() {
                disposed = true;
                if (frame !== undefined) cancelAnimationFrame(frame);
                resize?.disconnect();
                mutation.disconnect();
                window.removeEventListener("resize", schedule);
                window.removeEventListener("beforeprint", update);
                window.removeEventListener("afterprint", schedule);
            },
        };
    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize, { once: true });
    } else {
        initialize();
    }
})();
