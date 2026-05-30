import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));

assert.equal(manifest.manifest_version, 3);
assert.equal(manifest.permissions.length, 1);
assert.equal(manifest.permissions[0], "storage");
assert.ok(!manifest.browser_specific_settings, "manifest should not include Firefox-only settings");
assert.deepEqual(manifest.content_scripts[0].matches, [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*"
]);
assert.equal(manifest.action.default_icon["16"], "icons/icon-16.png");
assert.equal(manifest.action.default_icon["32"], "icons/icon-32.png");
assert.equal(manifest.action.default_icon["48"], "icons/icon-48.png");
assert.equal(manifest.action.default_icon["128"], "icons/icon-128.png");

for (const script of manifest.content_scripts[0].js) {
  assert.ok(!script.startsWith("http"), "content scripts must be local");
}

assert.ok(!manifest.background, "extension should not use a background worker");
assert.ok(!manifest.host_permissions, "extension should not request broad host permissions");
assert.ok(!manifest.optional_permissions, "extension should not request optional permissions");
assert.ok(!manifest.optional_host_permissions, "extension should not request optional host permissions");

const content = await readFile(new URL("../src/content.js", import.meta.url), "utf8");
assert.match(content, /MutationObserver/);
assert.match(content, /storage\.local/);
assert.doesNotMatch(content, /fetch\s*\(/);
assert.doesNotMatch(content, /XMLHttpRequest/);
assert.doesNotMatch(content, /eval\s*\(/);

const popup = await readFile(new URL("../popup/popup.js", import.meta.url), "utf8");
assert.match(popup, /storage\.local/);
assert.doesNotMatch(popup, /fetch\s*\(/);
assert.doesNotMatch(popup, /XMLHttpRequest/);
assert.doesNotMatch(popup, /eval\s*\(/);
