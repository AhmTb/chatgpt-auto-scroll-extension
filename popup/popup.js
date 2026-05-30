(() => {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true
  });

  const extensionApi =
    typeof browser !== "undefined"
      ? browser
      : typeof chrome !== "undefined"
        ? chrome
        : null;

  const enabledToggle = document.querySelector("#enabledToggle");
  const statusText = document.querySelector("#statusText");

  function getStorage(keys) {
    if (!extensionApi?.storage?.local) {
      return Promise.resolve({});
    }

    try {
      const value = extensionApi.storage.local.get(keys);
      if (value && typeof value.then === "function") {
        return value;
      }

      return new Promise((resolve) => {
        extensionApi.storage.local.get(keys, resolve);
      });
    } catch {
      return Promise.resolve({});
    }
  }

  function setStorage(value) {
    if (!extensionApi?.storage?.local) {
      return Promise.resolve();
    }

    const result = extensionApi.storage.local.set(value);
    if (result && typeof result.then === "function") {
      return result;
    }

    return new Promise((resolve) => {
      extensionApi.storage.local.set(value, resolve);
    });
  }

  function setStatus(enabled) {
    statusText.textContent = enabled ? "On for ChatGPT tabs" : "Paused";
  }

  async function saveEnabled(nextEnabled) {
    const previousEnabled = !nextEnabled;

    enabledToggle.disabled = true;
    try {
      await setStorage({ enabled: nextEnabled });
      setStatus(nextEnabled);
    } catch {
      enabledToggle.checked = previousEnabled;
      setStatus(previousEnabled);
    } finally {
      enabledToggle.disabled = false;
    }
  }

  function watchStorageChanges() {
    const changed = extensionApi?.storage?.onChanged;

    if (!changed?.addListener) {
      return;
    }

    changed.addListener((changes, areaName) => {
      if (areaName !== "local" || !Object.prototype.hasOwnProperty.call(changes, "enabled")) {
        return;
      }

      const enabled = changes.enabled.newValue !== false;
      enabledToggle.checked = enabled;
      setStatus(enabled);
    });
  }

  async function init() {
    const stored = await getStorage(DEFAULT_SETTINGS).catch(() => ({}));
    const enabled = stored.enabled !== false;

    enabledToggle.checked = enabled;
    setStatus(enabled);
    watchStorageChanges();

    enabledToggle.addEventListener("change", async () => {
      const nextEnabled = enabledToggle.checked;
      await saveEnabled(nextEnabled);
    });
  }

  void init();
})();
