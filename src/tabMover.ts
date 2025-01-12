/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-empty-function */
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

  constructor(
    private loadData?: () => Promise<Data>,
    private saveData: (data: Data) => Promise<void> = async () => {},
    private tabMoveWrapper: (
      tab: Tab,
      moveOperation: () => Promise<number>
    ) => Promise<void> = async (_, moveOperation) => {
      await moveOperation();
    }
  ) {}

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

    const allWindows = (await browser.windows.getAll()).filter(
      (window) => window.id != null && window.type === "normal"
    );
    const currentTabWindowIndex = allWindows.findIndex((window) => window.id === tab.windowId);
    const targetWindowId = allWindows[(currentTabWindowIndex + 1) % allWindows.length]?.id;

    if (allWindows.length <= 1 || targetWindowId == null) {
      await this.tabMoveWrapper(tab, async () => {
        const targetWindow = await browser.windows.create({ tabId: tab.id });
        // forcing as windows are always created with an id.
        return targetWindow.id as number;
      });
      await this.complete();
      return;
    }

    const wasOriginalTabActive = tab.active;
    const targetTabWindowId = this.tabWindowId(tab.id, targetWindowId);
    const targetIndex = this.originalTabInfoByTabWindowId[targetTabWindowId]?.index ?? -1;

    // typescript is losing results of null checks above for no reason, forcing them.
    await this.tabMoveWrapper(tab, async () => {
      await browser.tabs.move(tab.id as number, {
        windowId: targetWindowId,
        index: targetIndex,
      });
      return targetWindowId as number;
    });

    if (wasOriginalTabActive) {
      await browser.tabs.update(tab.id, { active: true });
      await browser.windows.update(targetWindowId, { focused: true });
    }

    await this.complete();
  }

  private async complete() {
    await this.saveData(this.originalTabInfoByTabWindowId);
  }
}
