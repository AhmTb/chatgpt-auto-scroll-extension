# Security Policy

## Reporting A Security Issue

Please open a GitHub issue with a concise description of the problem, affected files, and reproduction steps. Do not include private ChatGPT conversations, tokens, cookies, or account data.

## Extension Permissions

The extension intentionally keeps a small permission surface:

- `storage` for the on/off toggle.
- Content script matches only for `https://chatgpt.com/*` and `https://chat.openai.com/*`.

There is no background worker, remote code loading, network request code, cookies permission, tabs permission, `webRequest`, or scripting permission.
