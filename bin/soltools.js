#!/usr/bin/env node
"use strict";

// Production: run compiled JS from dist/.
// Falls back to ts-node when dist is absent (local development).
const path = require("path");
const fs = require("fs");

const distEntry = path.join(__dirname, "..", "dist", "cli.js");

if (fs.existsSync(distEntry)) {
  require(distEntry);
} else {
  try {
    require("ts-node/register");
  } catch (err) {
    console.error(
      "soltools: dist/ not built and ts-node is unavailable.\n" +
        "Run `npm install` then `npm run build`, or use `npm run dev -- <args>`."
    );
    process.exit(1);
  }
  require(path.join(__dirname, "..", "src", "cli.ts"));
}
