const originalTabPositions: {
  [key: number]: { windowId: number; index: number };
} = {};

const main = () => {
  browser.contextMenus.create({
    contexts: ["tab"],
    onclick: (_, tab) => {
      tabClicked(tab);
    },
    title: "Move to the next window",
  });
};

main();

const tabClicked = async (tab: browser.tabs.Tab) => {
  if (tab.id === undefined || tab.windowId === undefined) return;

  if (originalTabPositions[tab.id] === undefined) {
    originalTabPositions[tab.id] = { windowId: tab.windowId, index: tab.index };
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
    if (originalTabPositions[tab.id].windowId !== targetWindow.id) {
      return -1;
    }
    return originalTabPositions[tab.id].index;
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
};
