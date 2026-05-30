# ChatGPT Auto Scroll
ChatGPT web was annoying me so i came up with this.
A small Chrome extension that keeps ChatGPT pinned to the latest answer.

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

For a permanent Chrome install outside developer mode, package it through Chrome's extension workflow.

## Privacy And Security

- The extension has no background script.
- It does not collect data, call external servers, or inject remote code.
- It requests only the `storage` permission.
- Its content script is limited to ChatGPT domains in `manifest.json`.

See [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md) for more detail.

## License

MIT. See [LICENSE](LICENSE).
