const path = require("node:path");

const menuBarView = "menu-bar";
const popoverGap = 0;
const screenMargin = 8;

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function menuBarWindowPosition({ trayBounds, windowBounds, workArea }) {
  const minimumX = workArea.x + screenMargin;
  const maximumX = workArea.x + workArea.width - windowBounds.width - screenMargin;
  const centeredX = trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2;
  const belowTrayY = trayBounds.y + trayBounds.height + popoverGap;
  const maximumY = workArea.y + workArea.height - windowBounds.height - screenMargin;
  const aboveTrayY = trayBounds.y - windowBounds.height - popoverGap;

  return {
    x: Math.round(clamp(centeredX, minimumX, Math.max(minimumX, maximumX))),
    y: Math.round(
      belowTrayY <= maximumY
        ? Math.max(workArea.y, belowTrayY)
        : Math.max(workArea.y, aboveTrayY)
    )
  };
}

function menuBarRendererUrl(devServerUrl) {
  const url = new URL(devServerUrl);
  url.searchParams.set("view", menuBarView);
  return url.toString();
}

function createMenuBarController({
  BrowserWindow,
  Tray,
  nativeImage,
  screen,
  isDev,
  devServerUrl,
  preloadPath,
  rendererPath,
  iconPath
}) {
  let popoverWindow = null;
  let tray = null;
  let popoverWasVisibleOnTrayMouseDown = false;
  let suppressAppActivationUntil = 0;

  function suppressAppActivation() {
    suppressAppActivationUntil = Date.now() + 500;
  }

  function shouldSuppressAppActivation() {
    return Date.now() <= suppressAppActivationUntil;
  }

  function hide() {
    if (popoverWindow && !popoverWindow.isDestroyed()) {
      popoverWindow.hide();
    }
  }

  function notifyOpened(window) {
    const deliver = () => {
      if (!window.isDestroyed() && window.isVisible()) {
        window.webContents.send("menu-bar:open");
      }
    };

    if (window.webContents.isLoading()) {
      window.webContents.once("did-finish-load", deliver);
      return;
    }

    deliver();
  }

  function position(window) {
    const trayBounds = tray.getBounds();
    const windowBounds = window.getBounds();
    const display = screen.getDisplayNearestPoint({
      x: Math.round(trayBounds.x + trayBounds.width / 2),
      y: Math.round(trayBounds.y + trayBounds.height / 2)
    });
    const nextPosition = menuBarWindowPosition({
      trayBounds,
      windowBounds,
      workArea: display.workArea
    });

    window.setPosition(nextPosition.x, nextPosition.y, false);
  }

  function createPopoverWindow() {
    const window = new BrowserWindow({
      width: 430,
      height: 560,
      show: false,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      hasShadow: false,
      title: "oolong",
      backgroundColor: "#00000000",
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    window.setAlwaysOnTop(true, "pop-up-menu");
    window.webContents.on("will-navigate", (event) => {
      event.preventDefault();
    });
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("before-input-event", (event, input) => {
      if (input.key === "Escape") {
        event.preventDefault();
        hide();
      }
    });
    window.on("blur", () => {
      if (!window.webContents.isDevToolsOpened()) {
        hide();
      }
    });
    window.on("closed", () => {
      popoverWindow = null;
    });

    if (isDev) {
      void window.loadURL(menuBarRendererUrl(devServerUrl));
    } else {
      void window.loadFile(rendererPath, { query: { view: menuBarView } });
    }

    return window;
  }

  function getPopoverWindow() {
    if (!popoverWindow || popoverWindow.isDestroyed()) {
      popoverWindow = createPopoverWindow();
    }

    return popoverWindow;
  }

  function show() {
    if (!tray || tray.isDestroyed()) {
      return;
    }

    const window = getPopoverWindow();
    position(window);
    suppressAppActivation();
    window.show();
    window.focus();
    notifyOpened(window);
  }

  function toggle() {
    const window = getPopoverWindow();
    if (window.isVisible()) {
      hide();
      return;
    }

    show();
  }

  function handleTrayMouseDown() {
    suppressAppActivation();
    popoverWasVisibleOnTrayMouseDown = Boolean(
      popoverWindow && !popoverWindow.isDestroyed() && popoverWindow.isVisible()
    );
  }

  function handleTrayClick() {
    if (popoverWasVisibleOnTrayMouseDown) {
      popoverWasVisibleOnTrayMouseDown = false;
      hide();
      return;
    }

    popoverWasVisibleOnTrayMouseDown = false;
    toggle();
  }

  function initialize() {
    if (tray && !tray.isDestroyed()) {
      return;
    }

    const trayImage = nativeImage.createFromPath(iconPath).resize({ width: 18, height: 18 });
    trayImage.setTemplateImage(true);
    tray = new Tray(trayImage);
    tray.setToolTip("oolong");
    tray.setIgnoreDoubleClickEvents(true);
    tray.on("mouse-down", handleTrayMouseDown);
    tray.on("click", handleTrayClick);
    getPopoverWindow();
  }

  function destroy() {
    if (popoverWindow && !popoverWindow.isDestroyed()) {
      popoverWindow.destroy();
    }
    if (tray && !tray.isDestroyed()) {
      tray.destroy();
    }
    popoverWindow = null;
    tray = null;
    popoverWasVisibleOnTrayMouseDown = false;
    suppressAppActivationUntil = 0;
  }

  return {
    destroy,
    hide,
    initialize,
    shouldSuppressAppActivation,
    show,
    toggle
  };
}

module.exports = {
  createMenuBarController,
  menuBarRendererUrl,
  menuBarWindowPosition
};
