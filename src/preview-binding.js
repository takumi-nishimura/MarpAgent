const net = require("node:net");
const os = require("node:os");

function getBindAddress(env = process.env) {
  const address = env.MARP_AGENT_BIND_ADDRESS || "127.0.0.1";
  if (address !== "localhost" && !net.isIP(address)) {
    throw new Error(
      "MARP_AGENT_BIND_ADDRESS must be an IP address or localhost (default: 127.0.0.1).",
    );
  }
  return address;
}

function isLoopback(address) {
  return (
    address === "localhost" || address === "::1" || address.startsWith("127.")
  );
}

function previewBaseUrls(address, port, interfaces = os.networkInterfaces()) {
  let hosts = [address];
  if (address === "0.0.0.0" || address === "::") {
    hosts = Object.values(interfaces)
      .flat()
      .filter(
        (entry) =>
          !entry.internal && (address === "::" || entry.family === "IPv4"),
      )
      .map((entry) => entry.address);
    if (hosts.length === 0) hosts = [address === "::" ? "::1" : "127.0.0.1"];
  }
  return [...new Set(hosts)].map(
    (host) => `http://${net.isIP(host) === 6 ? `[${host}]` : host}:${port}`,
  );
}

function warnIfPublic(address) {
  if (!isLoopback(address)) {
    console.warn(
      `[preview] Binding to ${address} exposes local deck files and linked shared assets to the network without authentication. Use only on a trusted network.`,
    );
  }
}

module.exports = { getBindAddress, isLoopback, previewBaseUrls, warnIfPublic };
