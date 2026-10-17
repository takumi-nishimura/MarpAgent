function isBrowserEnvironmentFailure(error) {
  const message = String(error?.message || error || "");
  // Match launch prerequisites, never a generic browser name or validator failure.
  return [
    /Executable doesn't exist at [^\n]+/i,
    /Host system is missing dependencies to run browsers/i,
    /error while loading shared libraries: \S+: cannot open shared object file/i,
    /Running as root without --no-sandbox is not supported/i,
    /No usable sandbox!/i,
    /Failed to move to new namespace:[^\n]*Operation not permitted/i,
  ].some((pattern) => pattern.test(message));
}

module.exports = { isBrowserEnvironmentFailure };
