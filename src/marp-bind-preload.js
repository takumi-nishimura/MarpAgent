// Marp CLI 4.5.1 has no bind-host option and leaves both its HTTP and watch
// notifier sockets on Node's wildcard default. This preload is scoped to the
// Marp child and supplies a host only for TCP listeners without one.
const net = require("node:net");
const { getBindAddress } = require("./preview-binding");
const { createSharedAssetsHandler } = require("./shared-assets-http");
const host = getBindAddress();
const listen = net.Server.prototype.listen;

net.Server.prototype.listen = function (...args) {
  const options = args[0];
  if (
    options &&
    typeof options === "object" &&
    options.port !== undefined &&
    options.host === undefined
  ) {
    args[0] = { ...options, host };
  } else if (
    (typeof options === "number" ||
      (typeof options === "string" && /^\d+$/.test(options))) &&
    typeof args[1] !== "string"
  ) {
    args.splice(1, 0, host);
  }
  return listen.apply(this, args);
};

if (process.env.MARP_AGENT_SHARED_DECK_DIR) {
  const http = require("node:http");
  const serveShared = createSharedAssetsHandler(
    process.env.MARP_AGENT_SHARED_DECK_DIR,
  );
  const emit = http.Server.prototype.emit;
  http.Server.prototype.emit = function (event, ...args) {
    if (event === "request" && serveShared(...args)) return true;
    return emit.call(this, event, ...args);
  };
}
