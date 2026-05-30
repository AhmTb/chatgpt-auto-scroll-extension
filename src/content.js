(() => {
  "use strict";

  const DEFAULT_SETTINGS = Object.freeze({
    enabled: true
  });

  const FOLLOW_AFTER_SEND_MS = 120000;
  const FOLLOW_AFTER_MUTATION_MS = 1200;
  const NEAR_BOTTOM_PX = 96;
  const PROGRAMMATIC_SCROLL_GRACE_MS = 350;
  const SCROLLER_CACHE_MS = 2500;
  const MIN_SCROLLER_HEIGHT_PX = 280;
  const SCROLLABLE_SELECTOR = [
    "main",
    "[role='main']",
    "[data-testid*='conversation']",
    "[data-testid*='thread']",
    ".overflow-y-auto",
    ".overflow-auto"
  ].join(",");
  const COMPOSER_SELECTOR = [
    "#prompt-textarea",
    "textarea[data-testid='prompt-textarea']",
    "textarea[placeholder*='Message']",
    "[contenteditable='true'][aria-label*='Message']",
    "[contenteditable='true'][id*='prompt']"
  ].join(",");

  const extensionApi =
    typeof browser !== "undefined"
      ? browser
      : typeof chrome !== "undefined"
        ? chrome
        : null;

  let settings = { ...DEFAULT_SETTINGS };
  let followUntil = 0;
  let scheduled = false;
  let lastProgrammaticScroll = 0;
  let userPausedFollow = false;
  let mutationObserver = null;
  let cachedScroller = null;
  let cachedScrollerAt = 0;

  function now() {
    return Date.now();
  }

  function readStorage(keys) {
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

  function isElementVisible(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function canScrollElement(element) {
    if (!(element instanceof HTMLElement)) {
      return false;
    }

    const style = window.getComputedStyle(element);
    const canScrollY = /(auto|scroll|overlay)/.test(style.overflowY);
    return canScrollY && element.scrollHeight - element.clientHeight > 4;
  }

  function canScrollDocument() {
    const scroller = getDocumentScroller();
    return getScrollHeight(scroller) - getClientHeight(scroller) > 4;
  }

  function getDocumentScroller() {
    return document.scrollingElement || document.documentElement;
  }

  function getScrollTop(scroller) {
    if (scroller === getDocumentScroller()) {
      return window.scrollY || scroller.scrollTop || 0;
    }

    return scroller.scrollTop;
  }

  function getClientHeight(scroller) {
    if (scroller === getDocumentScroller()) {
      return window.innerHeight;
    }

    return scroller.clientHeight;
  }

  function getScrollHeight(scroller) {
    if (scroller === getDocumentScroller()) {
      return Math.max(
        document.documentElement.scrollHeight,
        document.body?.scrollHeight || 0
      );
    }

    return scroller.scrollHeight;
  }

  function isNearBottom(scroller) {
    const distance =
      getScrollHeight(scroller) - getScrollTop(scroller) - getClientHeight(scroller);
    return distance <= NEAR_BOTTOM_PX;
  }

  function isLargePageScroller(element) {
    if (!canScrollElement(element) || !isElementVisible(element)) {
      return false;
    }

    const rect = element.getBoundingClientRect();
    const minHeight = Math.min(MIN_SCROLLER_HEIGHT_PX, window.innerHeight * 0.4);
    const crossesViewportMiddle = rect.top < window.innerHeight * 0.65 && rect.bottom > window.innerHeight * 0.35;

    return element.clientHeight >= minHeight && crossesViewportMiddle;
  }

  function findConversationRoot() {
    return (
      document.querySelector("main") ||
      document.querySelector("[role='main']") ||
      document.querySelector("[data-testid*='conversation']") ||
      document.querySelector("[data-testid*='thread']")
    );
  }

  function hasChatSurface() {
    return Boolean(findConversationRoot() && document.querySelector(COMPOSER_SELECTOR));
  }

  function addAncestorScrollers(root, candidates) {
    let element = root instanceof HTMLElement ? root : null;

    while (element && element !== document.body) {
      if (isLargePageScroller(element)) {
        candidates.add(element);
      }

      element = element.parentElement;
    }
  }

  function scoreScroller(scroller) {
    if (scroller === getDocumentScroller()) {
      return canScrollDocument() ? 100 : 0;
    }

    const rect = scroller.getBoundingClientRect();
    const heightScore = Math.min(scroller.clientHeight, window.innerHeight) * 2;
    const scrollScore = Math.min(getScrollHeight(scroller) - getClientHeight(scroller), 3000) / 3;
    const viewportScore = rect.top <= 80 ? 160 : 0;

    return heightScore + scrollScore + viewportScore;
  }

  function discoverActiveScroller() {
    const candidates = new Set();
    const conversationRoot = findConversationRoot();

    if (!conversationRoot) {
      return getDocumentScroller();
    }

    if (canScrollDocument()) {
      candidates.add(getDocumentScroller());
    }

    const scopedElements = new Set([
      conversationRoot,
      ...conversationRoot.querySelectorAll(SCROLLABLE_SELECTOR)
    ]);

    for (const element of scopedElements) {
      if (!(element instanceof HTMLElement)) {
        continue;
      }

      if (isLargePageScroller(element)) {
        candidates.add(element);
      }

      addAncestorScrollers(element, candidates);
    }

    addAncestorScrollers(conversationRoot, candidates);

    return (
      [...candidates].sort((left, right) => scoreScroller(right) - scoreScroller(left))[0] ||
      getDocumentScroller()
    );
  }

  function findBestScroller({ forceRefresh = false } = {}) {
    const time = now();
    const hasFreshCache = cachedScroller && time - cachedScrollerAt < SCROLLER_CACHE_MS;

    if (!forceRefresh && hasFreshCache) {
      return cachedScroller;
    }

    cachedScroller = discoverActiveScroller();
    cachedScrollerAt = time;
    return cachedScroller;
  }

  function scrollElementToBottom(scroller) {
    const top = getScrollHeight(scroller);

    if (scroller === getDocumentScroller()) {
      window.scrollTo({ top, behavior: "auto" });
      scroller.scrollTop = top;
      return;
    }

    scroller.scrollTop = top;
  }

  function scrollAllToBottom() {
    lastProgrammaticScroll = now();
    scrollElementToBottom(findBestScroller());
  }

  function hasActiveResponseControls() {
    if (document.querySelector("[data-testid='stop-button'], .result-streaming")) {
      return true;
    }

    const root = findConversationRoot();
    if (!root) {
      return false;
    }

    const controls = root.querySelectorAll("button, [role='button']");

    for (const control of controls) {
      const label = `${control.getAttribute("aria-label") || ""} ${control.textContent || ""}`;
      if (/\bstop\b|generating|continue generating/i.test(label) && isElementVisible(control)) {
        return true;
      }
    }

    return false;
  }

  function shouldFollow() {
    if (!settings.enabled) {
      return false;
    }

    if (!hasChatSurface()) {
      return false;
    }

    const time = now();
    const scroller = findBestScroller();
    const isAtBottom = isNearBottom(scroller);

    if (userPausedFollow && !isAtBottom) {
      return false;
    }

    if (isAtBottom) {
      userPausedFollow = false;
    }

    return time < followUntil || isAtBottom || hasActiveResponseControls();
  }

  function scheduleScroll(delay = 0) {
    if (scheduled || !settings.enabled) {
      return;
    }

    scheduled = true;
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        scheduled = false;

        if (shouldFollow()) {
          scrollAllToBottom();
        }
      });
    }, delay);
  }

  function armFollow(duration = FOLLOW_AFTER_SEND_MS) {
    userPausedFollow = false;
    followUntil = Math.max(followUntil, now() + duration);
    scheduleScroll();
  }

  function onMutation() {
    if (!settings.enabled) {
      return;
    }

    if (shouldFollow()) {
      followUntil = Math.max(followUntil, now() + FOLLOW_AFTER_MUTATION_MS);
      scheduleScroll();
    }
  }

  function isSendAction(target) {
    const element = target instanceof Element ? target.closest("button, [role='button']") : null;

    if (!element) {
      return false;
    }

    const label = `${element.getAttribute("aria-label") || ""} ${element.textContent || ""} ${
      element.getAttribute("data-testid") || ""
    }`;

    if (!/\bsend\b|composer-submit-button|send-button/i.test(label)) {
      return false;
    }

    const form = element.closest("form");
    return !form || Boolean(findComposerInput(form));
  }

  function onClick(event) {
    if (isSendAction(event.target)) {
      armFollow();
    }
  }

  function onKeyDown(event) {
    if (event.key !== "Enter" || event.shiftKey || event.ctrlKey || event.altKey || event.metaKey) {
      return;
    }

    if (findComposerInput(event.target)) {
      armFollow();
    }
  }

  function findComposerInput(scope) {
    const element = scope instanceof Element ? scope : null;

    if (!element) {
      return null;
    }

    const composer = element.closest(COMPOSER_SELECTOR);

    if (composer) {
      return composer;
    }

    const form = element instanceof HTMLFormElement ? element : element.closest("form");
    return form?.querySelector(COMPOSER_SELECTOR);
  }

  function onScroll(event) {
    if (now() - lastProgrammaticScroll < PROGRAMMATIC_SCROLL_GRACE_MS) {
      return;
    }

    const target =
      event.target === document ? getDocumentScroller() : event.target instanceof HTMLElement ? event.target : null;

    if (target && !isNearBottom(target)) {
      userPausedFollow = true;
      return;
    }

    if (target && isNearBottom(target)) {
      userPausedFollow = false;
    }
  }

  function applySettings(nextSettings) {
    const wasEnabled = settings.enabled;
    settings = {
      ...DEFAULT_SETTINGS,
      ...nextSettings
    };

    if (settings.enabled && !wasEnabled) {
      armFollow(3000);
    }
  }

  async function loadSettings() {
    const stored = await readStorage(DEFAULT_SETTINGS);
    applySettings(stored);
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

      applySettings({ enabled: changes.enabled.newValue !== false });
    });
  }

  function startObserver() {
    if (mutationObserver) {
      return;
    }

    mutationObserver = new MutationObserver(onMutation);
    mutationObserver.observe(findConversationRoot() || document.body || document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  async function boot() {
    await loadSettings();
    watchStorageChanges();
    startObserver();

    document.addEventListener("click", onClick, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("scroll", onScroll, true);

    if (settings.enabled && hasChatSurface()) {
      armFollow(3000);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => void boot(), { once: true });
  } else {
    void boot();
  }
})();
