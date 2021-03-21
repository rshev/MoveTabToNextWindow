/* eslint-disable @typescript-eslint/ban-ts-comment */
import { browser, Tabs } from "webextension-polyfill-ts";

class Extension {
  private originalTabInfoByTabWindowId: {
    [key: string]: Tabs.Tab;
  } = {};

  private tabWindowId(tabId: number, windowId: number): string {
    return `${tabId}:${windowId}`;
  }

  setup() {
    try {
      browser.menus.create({
        contexts: ["tab"],
        onclick: (_, tab) => this.moveTabOrHighlightedTabs(tab),
        title: "Move to the next window",
      });
    } catch {
      console.log("oops, Chrome doesn't support extensions in tab menus (yet)");
    }
    browser.browserAction.onClicked.addListener((tab) => this.moveTabOrHighlightedTabs(tab));
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
    if (tab.id === undefined || tab.windowId === undefined) {
      return;
    }

    const originalTabWindowId = this.tabWindowId(tab.id, tab.windowId);
    this.originalTabInfoByTabWindowId[originalTabWindowId] = { ...tab };

    const allWindows = (await browser.windows.getAll()).filter((window) => window.id !== undefined);
    const currentTabWindowIndex = allWindows.findIndex((window) => window.id === tab.windowId);
    const targetWindowId = allWindows[(currentTabWindowIndex + 1) % allWindows.length]?.id;

    if (allWindows.length <= 1 || targetWindowId === undefined) {
      await browser.windows.create({ tabId: tab.id });
      return;
    }

    const wasOriginalTabActive = tab.active;
    const targetTabWindowId = this.tabWindowId(tab.id, targetWindowId);
    const targetIndex = this.originalTabInfoByTabWindowId[targetTabWindowId]?.index ?? -1;

    await browser.tabs.move(tab.id, {
      windowId: targetWindowId,
      index: targetIndex,
    });

    if (wasOriginalTabActive) {
      await browser.tabs.update(tab.id, { active: true });
      await browser.windows.update(targetWindowId, { focused: true });
    }

    // Unfortunately webextension-polyfill-ts doesn't know anything about Chrome groups yet

    // @ts-ignore
    if (chrome.tabs.group != null) {
      // @ts-ignore
      const targetGroupId = this.originalTabInfoByTabWindowId[targetTabWindowId]?.groupId;
      if (targetGroupId != null && targetGroupId !== -1) {
        // @ts-ignore
        chrome.tabs.group({
          groupId: targetGroupId,
          tabIds: tab.id,
        });
      }
    }
  }
}

const extension = new Extension();
extension.setup();
