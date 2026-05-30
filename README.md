# ChatGPT Auto Scroll

A small Chrome/Firefox extension that keeps ChatGPT pinned to the newest answer while a response is appearing. It is built for study sessions where ChatGPT keeps answering but the visible conversation stops following the new content.

This project is not affiliated with OpenAI.

## What It Does

- Adds an extension popup with an on/off toggle.
- Runs only on `chatgpt.com` and `chat.openai.com`.
- Stores the toggle locally with browser extension storage.
- Scrolls the active ChatGPT conversation to the bottom after you send a message and while new answer content appears.
- Pauses if you manually scroll away from the bottom, so you can reread older content.

## Install In Chrome

Chrome can load the source folder directly:

1. Open Chrome.
2. Go to `chrome://extensions`.
3. Turn on `Developer mode`.
4. Click `Load unpacked`.
5. Select the project folder that contains `manifest.json`.
6. Open or refresh ChatGPT, then use the toolbar extension popup to turn auto-scroll on or off.

## Install In Firefox

Firefox can load the same source folder as a temporary extension:

1. Open Firefox.
2. Go to `about:debugging#/runtime/this-firefox`.
3. Click `Load Temporary Add-on...`.
4. Select the project's `manifest.json`.
5. Open or refresh ChatGPT, then use the toolbar extension popup to turn auto-scroll on or off.

Temporary add-ons are removed when Firefox restarts. For a permanent Firefox install, package and sign it through Mozilla's add-on workflow. For a permanent Chrome install outside developer mode, package it through Chrome's extension workflow.

## Development

Run the static checks:

```powershell
npm run check
```

The check validates the manifest, JavaScript syntax, extension permission scope, local script references, and the absence of network/eval usage in the extension scripts.

## Privacy And Security

- The extension has no background script.
- It does not collect data, call external servers, or inject remote code.
- It requests only the `storage` permission.
- Its content script is limited to ChatGPT domains in `manifest.json`.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for more detail.

## License

MIT. See [LICENSE](LICENSE).
