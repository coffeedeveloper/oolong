const test = require("node:test");
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const {
  createMenuBarController,
  menuBarRendererUrl,
  menuBarWindowPosition
} = require("../electron/menu-bar.cjs");

test("builds the menu bar renderer URL without discarding existing parameters", () => {
  const url = new URL(menuBarRendererUrl("http://127.0.0.1:5173/?source=dev"));

  assert.equal(url.searchParams.get("source"), "dev");
  assert.equal(url.searchParams.get("view"), "menu-bar");
});

test("centers the popover under the tray icon and keeps it on screen", () => {
  assert.deepEqual(
    menuBarWindowPosition({
      trayBounds: { x: 900, y: 0, width: 24, height: 24 },
      windowBounds: { width: 430, height: 560 },
      workArea: { x: 0, y: 24, width: 1024, height: 744 }
    }),
    { x: 586, y: 24 }
  );
});

test("places the popover above a bottom-aligned tray", () => {
  assert.deepEqual(
    menuBarWindowPosition({
      trayBounds: { x: 400, y: 760, width: 24, height: 24 },
      windowBounds: { width: 430, height: 560 },
      workArea: { x: 0, y: 0, width: 1024, height: 760 }
    }),
    { x: 197, y: 200 }
  );
});

test("toggles and focuses the menu bar popover from the tray icon", () => {
  class MockWebContents extends EventEmitter {
    constructor() {
      super();
      this.messages = [];
    }

    isLoading() {
      return false;
    }

    isDevToolsOpened() {
      return false;
    }

    send(channel) {
      this.messages.push(channel);
    }

    setWindowOpenHandler() {}
  }

  class MockWindow extends EventEmitter {
    constructor(options) {
      super();
      this.options = options;
      this.webContents = new MockWebContents();
      this.visible = false;
      this.destroyed = false;
      this.bounds = { width: options.width, height: options.height };
    }

    destroy() {
      this.destroyed = true;
    }

    focus() {
      this.focused = true;
    }

    getBounds() {
      return this.bounds;
    }

    hide() {
      this.visible = false;
    }

    isDestroyed() {
      return this.destroyed;
    }

    isVisible() {
      return this.visible;
    }

    loadURL(url) {
      this.url = url;
      return Promise.resolve();
    }

    setAlwaysOnTop() {}

    setPosition(x, y) {
      this.position = { x, y };
    }

    show() {
      this.visible = true;
    }
  }

  class MockTray extends EventEmitter {
    constructor(image) {
      super();
      this.image = image;
      this.destroyed = false;
    }

    destroy() {
      this.destroyed = true;
    }

    getBounds() {
      return { x: 900, y: 0, width: 24, height: 24 };
    }

    isDestroyed() {
      return this.destroyed;
    }

    setIgnoreDoubleClickEvents(value) {
      this.ignoresDoubleClicks = value;
    }

    setToolTip(value) {
      this.tooltip = value;
    }
  }

  let window;
  let tray;
  const trayImage = {
    setTemplateImage(value) {
      this.isTemplate = value;
    }
  };
  const controller = createMenuBarController({
    BrowserWindow: class extends MockWindow {
      constructor(options) {
        super(options);
        window = this;
      }
    },
    Tray: class extends MockTray {
      constructor(image) {
        super(image);
        tray = this;
      }
    },
    nativeImage: {
      createFromPath: () => ({ resize: () => trayImage })
    },
    screen: {
      getDisplayNearestPoint: () => ({
        workArea: { x: 0, y: 24, width: 1024, height: 744 }
      })
    },
    isDev: true,
    devServerUrl: "http://127.0.0.1:5173/",
    preloadPath: "/app/electron/preload.cjs",
    rendererPath: "/app/dist/index.html",
    iconPath: "/app/assets/icon.png"
  });

  controller.initialize();
  assert.equal(tray.tooltip, "oolong");
  assert.equal(tray.ignoresDoubleClicks, true);
  assert.equal(tray.image.isTemplate, true);
  assert.equal(window.options.hasShadow, false);
  assert.equal(new URL(window.url).searchParams.get("view"), "menu-bar");

  tray.emit("click");
  assert.equal(window.visible, true);
  assert.equal(window.focused, true);
  assert.equal(controller.shouldSuppressAppActivation(), true);
  assert.deepEqual(window.position, { x: 586, y: 24 });
  assert.deepEqual(window.webContents.messages, ["menu-bar:open"]);

  tray.emit("mouse-down");
  window.emit("blur");
  tray.emit("click");
  assert.equal(window.visible, false);
});
