import { browser, Tabs } from "webextension-polyfill-ts";

class Extension {
  private originalTabPositions: {
    [key: number]: { windowId: number; index: number };
  } = {};

  setup() {
    try {
      browser.contextMenus.create({
        contexts: ["tab"],
        onclick: (_, tab) => this.moveTab(tab),
        title: "Move to the next window",
      });
    } catch {
      console.log("oops, Chrome doesn't support extensions in tab menus (yet)");
    }
    browser.browserAction.onClicked.addListener((tab) => this.moveTab(tab));
  }

  private async moveTab(tab: Tabs.Tab) {
    if (tab.id === undefined || tab.windowId === undefined) return;

    if (this.originalTabPositions[tab.id] === undefined) {
      this.originalTabPositions[tab.id] = {
        windowId: tab.windowId,
        index: tab.index,
      };
    }

    const allWindows = await browser.windows.getAll();

    if (allWindows.length <= 1) {
      await browser.windows.create({ tabId: tab.id });
      return;
    }

    const currentTabWindowIndex = allWindows.findIndex(
      (window) => window.id === tab.windowId
    );
    const wasTabActive = tab.active;

    const targetWindow = (() => {
      if (currentTabWindowIndex === allWindows.length - 1) return allWindows[0];
      return allWindows[currentTabWindowIndex + 1];
    })();

    const targetIndex = (() => {
      if (this.originalTabPositions[tab.id].windowId !== targetWindow.id) {
        return -1;
      }
      return this.originalTabPositions[tab.id].index;
    })();

    await browser.tabs.move(tab.id, {
      windowId: targetWindow.id,
      index: targetIndex,
    });

    if (wasTabActive) {
      await browser.tabs.update(tab.id, { active: true });
      if (targetWindow.id !== undefined) {
        await browser.windows.update(targetWindow.id, { focused: true });
      }
    }
  }
}

const extension = new Extension();
extension.setup();
