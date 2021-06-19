/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { browser } from "webextension-polyfill-ts";

export interface Tab {
  id?: number;
  windowId?: number;
  groupId?: number;
  index: number;
  active: boolean;
}

export interface Data {
  [key: string]: Tab;
}
export class TabMover {
  private originalTabInfoByTabWindowId: Data = {};

  private tabWindowId(tabId: number, windowId: number): string {
    return `${tabId}:${windowId}`;
  }

  newTabCompletion?: (tab: Tab, targetWindowId: number, originalTab?: Tab) => Promise<void>;
  loadData?: () => Promise<Data>;
  saveData?: (data: Data) => Promise<void>;

  async moveTabOrHighlightedTabs(tab: Tab) {
    const highlightedTabs = await browser.tabs.query({
      highlighted: true,
      currentWindow: true,
    });
    if (highlightedTabs.length > 1) {
      for (const tab of highlightedTabs) {
        await this.moveTab(tab);
      }
    } else {
      await this.moveTab(tab);
    }
  }

  async moveActiveTab() {
    const tabs = await browser.tabs.query({
      active: true,
      currentWindow: true,
    });
    if (tabs[0] != null) {
      await this.moveTab(tabs[0]);
    }
  }

  private async moveTab(tab: Tab) {
    if (tab.id == null || tab.windowId == null) {
      return;
    }

    if (this.loadData != null) {
      this.originalTabInfoByTabWindowId = await this.loadData();
    }

    const originalTabWindowId = this.tabWindowId(tab.id, tab.windowId);
    this.originalTabInfoByTabWindowId[originalTabWindowId] = { ...tab };

    const allWindows = (await browser.windows.getAll()).filter((window) => window.id != null);
    const currentTabWindowIndex = allWindows.findIndex((window) => window.id === tab.windowId);
    const targetWindowId = allWindows[(currentTabWindowIndex + 1) % allWindows.length]?.id;

    if (allWindows.length <= 1 || targetWindowId == null) {
      const targetWindow = await browser.windows.create({ tabId: tab.id });
      await this.complete(tab, targetWindow.id);
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

    await this.complete(tab, targetWindowId);
  }

  private async complete(tab: Tab, targetWindowId?: number) {
    if (targetWindowId == null || tab.id == null) {
      return;
    }
    const tabWindowId = this.tabWindowId(tab.id, targetWindowId);
    await this.newTabCompletion?.(
      tab,
      targetWindowId,
      this.originalTabInfoByTabWindowId[tabWindowId]
    );

    await this.saveData?.(this.originalTabInfoByTabWindowId);
  }
}
