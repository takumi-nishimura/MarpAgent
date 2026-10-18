const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { once } = require("node:events");
const { spawn } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "../..");
const lanAddress = Object.values(os.networkInterfaces())
  .flat()
  .find((entry) => entry.family === "IPv4" && !entry.internal)?.address;

function request(host, port, route) {
  return new Promise((resolve, reject) => {
    const req = http.get(
      { host, port, path: route, timeout: 3000 },
      (response) => {
        response.resume();
        response.on("end", () => resolve(response.statusCode));
      },
    );
    req.on("timeout", () => req.destroy(new Error("request timeout")));
    req.on("error", reject);
  });
}

async function preview(t, mode, bindAddress) {
  const reservation = net.createServer();
  reservation.listen(0, "127.0.0.1");
  await once(reservation, "listening");
  const port = reservation.address().port;
  await new Promise((resolve) => reservation.close(resolve));
  const child = spawn(
    process.execPath,
    ["bin/marpx.js", "fixtures/clean-slide.md", ...mode],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        MARP_AGENT_BIND_ADDRESS: bindAddress,
        MARP_AGENT_NO_OPEN: "1",
        PORT: String(port),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) {
      const closed = once(child, "close");
      child.kill("SIGTERM");
      await closed;
    }
  });
  let output = "";
  const url = await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Preview did not start: ${output}`)),
      15000,
    );
    const read = (chunk) => {
      output += chunk;
      const found = output.match(
        /\[preview(?::overview)?\] Opened (http:\/\/\S+)/,
      );
      if (found) {
        clearTimeout(timer);
        resolve(new URL(found[1]));
      }
    };
    child.stdout.on("data", read);
    child.stderr.on("data", read);
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", () => {
      clearTimeout(timer);
      reject(new Error(output));
    });
  });
  return { url, output: () => output };
}

for (const mode of [[], ["--overview"]]) {
  test(
    `${mode.length ? "overview" : "serve"} defaults to loopback and permits explicit LAN binding`,
    { skip: !lanAddress, timeout: 30000 },
    async (t) => {
      const local = await preview(t, mode, "");
      assert.equal(
        await request("127.0.0.1", local.url.port, local.url.pathname),
        200,
      );
      await assert.rejects(
        request(lanAddress, local.url.port, local.url.pathname),
        /ECONNREFUSED/,
      );
      const lan = await preview(t, mode, "0.0.0.0");
      assert.equal(lan.url.hostname, lanAddress);
      assert.equal(
        await request(lanAddress, lan.url.port, lan.url.pathname),
        200,
      );
      assert.equal(
        (lan.output().match(/exposes local deck files/g) || []).length,
        1,
      );
    },
  );
}
