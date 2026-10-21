#!/usr/bin/env node
const { enforceSupportedNodeRuntime } = require("../src/runtime-version");
enforceSupportedNodeRuntime();
require("../src/assets-cli").runAssetsCli();
