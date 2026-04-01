#!/usr/bin/env node

/**
 * Design Preview Tool
 *
 * Renders HTML files to screenshots at multiple viewport sizes.
 * Used by the /spartan:ux prototype workflow so agents can visually verify their work.
 *
 * Usage:
 *   node design-preview.mjs <html-file> [--output-dir <dir>]
 *
 * Examples:
 *   node design-preview.mjs .planning/design/screens/dashboard/prototype.html
 *   node design-preview.mjs /tmp/preview.html --output-dir /tmp/screenshots
 *
 * Output:
 *   Creates 3 screenshots in the output directory:
 *   - preview-mobile.png   (375 x 812)
 *   - preview-tablet.png   (768 x 1024)
 *   - preview-desktop.png  (1440 x 900)
 *
 * Setup (first time only):
 *   npx playwright install chromium
 */

import { chromium } from "playwright";
import { resolve, dirname } from "path";
import { existsSync, mkdirSync } from "fs";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

function parseArgs(args) {
  const result = { htmlFile: null, outputDir: null };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--output-dir" && args[i + 1]) {
      result.outputDir = args[i + 1];
      i++;
    } else if (!result.htmlFile) {
      result.htmlFile = args[i];
    }
  }

  return result;
}

async function takeScreenshots(htmlFile, outputDir) {
  const absolutePath = resolve(htmlFile);

  if (!existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  // Default output dir: same directory as the HTML file
  const outDir = outputDir ? resolve(outputDir) : dirname(absolutePath);
  mkdirSync(outDir, { recursive: true });

  const fileUrl = `file://${absolutePath}`;

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    const screenshots = [];

    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 2,
      });

      const page = await context.newPage();
      await page.goto(fileUrl, { waitUntil: "networkidle" });

      // Wait for CSS animations/transitions to settle
      await page.waitForTimeout(500);

      const screenshotPath = resolve(outDir, `preview-${viewport.name}.png`);
      await page.screenshot({
        path: screenshotPath,
        fullPage: true,
      });

      screenshots.push({
        viewport: viewport.name,
        width: viewport.width,
        height: viewport.height,
        path: screenshotPath,
      });

      await context.close();
    }

    // Print results so agents can read the paths
    console.log("\nScreenshots saved:");
    console.log("---");
    for (const s of screenshots) {
      console.log(`${s.viewport} (${s.width}x${s.height}): ${s.path}`);
    }
    console.log("---");
    console.log(
      "\nUse the Read tool to view each screenshot and verify the design."
    );
  } catch (error) {
    if (error.message.includes("Executable doesn't exist")) {
      console.error("\nPlaywright browsers not installed.");
      console.error("Run this first: npx playwright install chromium");
      process.exit(1);
    }
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main
const args = parseArgs(process.argv.slice(2));

if (!args.htmlFile) {
  console.log(
    "Usage: node design-preview.mjs <html-file> [--output-dir <dir>]"
  );
  console.log("");
  console.log(
    "Takes screenshots of an HTML file at mobile, tablet, and desktop sizes."
  );
  console.log("Agents can then use the Read tool to view the screenshots.");
  process.exit(1);
}

await takeScreenshots(args.htmlFile, args.outputDir);
