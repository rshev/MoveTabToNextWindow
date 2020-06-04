import { browser, Tabs } from "webextension-polyfill-ts";

class Extension {
  private originalTabIndexByTabIdByWindowId: {
    [key: number]: {
      [key: number]: number;
    };
  } = {};

  setup() {
    try {
      browser.contextMenus.create({
        contexts: ["tab"],
        onclick: (_, tab) => this.moveTabOrHighlightedTabs(tab),
        title: "Move to the next window",
      });
    } catch {
      console.log("oops, Chrome doesn't support extensions in tab menus (yet)");
    }
    browser.browserAction.onClicked.addListener((tab) =>
      this.moveTabOrHighlightedTabs(tab)
    );
  }

  private async moveTabOrHighlightedTabs(tab: Tabs.Tab) {
    const highlightedTabs = await browser.tabs.query({
      highlighted: true,
      currentWindow: true,
    });
    if (highlightedTabs.length > 1) {
      for (const tab of highlightedTabs) {
        await this.moveTab(tab);
      }
    } else {
      this.moveTab(tab);
    }
  }

  private async moveTab(tab: Tabs.Tab) {
    if (tab.id === undefined || tab.windowId === undefined) return;

    if (this.originalTabIndexByTabIdByWindowId[tab.id] === undefined)
      this.originalTabIndexByTabIdByWindowId[tab.id] = {};

    this.originalTabIndexByTabIdByWindowId[tab.id][tab.windowId] = tab.index;

    const allWindows = (await browser.windows.getAll()).filter(
      (window) => window.id !== undefined
    );

    const currentTabWindowIndex = allWindows.findIndex(
      (window) => window.id === tab.windowId
    );

    const targetWindowId =
      allWindows[(currentTabWindowIndex + 1) % allWindows.length].id;

    if (allWindows.length <= 1 || targetWindowId === undefined) {
      await browser.windows.create({ tabId: tab.id });
      return;
    }

    const wasTabActive = tab.active;

    const targetIndex =
      this.originalTabIndexByTabIdByWindowId[tab.id][targetWindowId] ?? -1;

    await browser.tabs.move(tab.id, {
      windowId: targetWindowId,
      index: targetIndex,
    });

    if (wasTabActive) {
      await browser.tabs.update(tab.id, { active: true });
      await browser.windows.update(targetWindowId, { focused: true });
    }
  }
}

const extension = new Extension();
extension.setup();
