const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const source = fs.readFileSync(
    path.join(__dirname, "../../scripts/presenter-cursor.js"),
    "utf8",
);

function createPresentation(channels, href, view, session = "session-a") {
    const handlers = new Map();
    const dots = [];
    const slide = {
        getBoundingClientRect: () => ({
            left: 10,
            top: 20,
            width: 800,
            height: 600,
        }),
    };
    const context = {
        URL,
        window: {
            location: { href },
            history: { state: { marpBespokeSyncKey: session } },
            addEventListener(name, callback) {
                if (name === "DOMContentLoaded")
                    handlers.set("ready", callback);
            },
        },
        document: {
            querySelector: () => slide,
            createElement: () => ({ style: {} }),
            body: {
                appendChild: (dot) => dots.push(dot),
                getAttribute: () => view,
            },
            addEventListener: (name, callback) => handlers.set(name, callback),
        },
        getComputedStyle: () => ({
            getPropertyValue: (name) => (name.endsWith("-size") ? "12px" : ""),
        }),
        setTimeout: () => 1,
        clearTimeout() {},
        BroadcastChannel: class {
            constructor(name) {
                this.name = name;
                channels.push(this);
            }
            addEventListener(name, callback) {
                if (name === "message") this.receive = callback;
            }
            postMessage(data) {
                for (const channel of channels) {
                    if (channel !== this && channel.name === this.name) {
                        channel.receive?.({ data });
                    }
                }
            }
        },
    };
    vm.runInNewContext(source, context);
    handlers.get("ready")();
    return { handlers, dots };
}

test("presenter cursor reaches its audience without leaking to another deck or session", () => {
    const channels = [];
    const presenter = createPresentation(
        channels,
        "file:///slides/one.html?view=presenter&sync=session-a&f=1#2",
        "presenter",
    );
    const audience = createPresentation(
        channels,
        "file:///slides/one.html#1",
        "",
    );
    const otherDeck = createPresentation(
        channels,
        "file:///slides/two.html#1",
        "",
    );
    const otherSession = createPresentation(
        channels,
        "file:///slides/one.html#1",
        "",
        "session-b",
    );

    presenter.handlers.get("mousemove")({ clientX: 410, clientY: 320 });
    assert.equal(audience.dots[0].style.left, "410px");
    assert.equal(audience.dots[0].style.top, "320px");
    assert.equal(audience.dots[0].style.opacity, "1");
    assert.equal(otherDeck.dots[0].style.left, undefined);
    assert.equal(otherSession.dots[0].style.left, undefined);

    presenter.handlers.get("mouseleave")();
    assert.equal(audience.dots[0].style.opacity, "0");
});
