import { TabMover, Tab, Data } from "./tabMover";

// chrome-specific hooks
const loadData = (): Promise<Data> => {
  return new Promise((resolve) => chrome.storage.local.get((items) => resolve(items)));
};
const saveData = (data: Data): Promise<void> => {
  return new Promise((resolve) => chrome.storage.local.set(data, () => resolve()));
};
const tabMoveWrapper = async (tab: Tab, moveOperation: () => Promise<number>) => {
  if (tab.groupId == null || tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
    await moveOperation();
    return;
  }

  const group = await chrome.tabGroups.get(tab.groupId);
  const { color, title } = group;

  const targetWindowId = await moveOperation();

  const existingTargetGroup = (
    await chrome.tabGroups.query({
      color: color,
      title: title,
      windowId: targetWindowId,
    })
  )[0];

  if (existingTargetGroup != null) {
    await chrome.tabs.group({
      groupId: existingTargetGroup.id,
      tabIds: tab.id,
    });
  } else {
    const newGroupId = await chrome.tabs.group({
      createProperties: { windowId: targetWindowId },
      tabIds: tab.id,
    });
    await chrome.tabGroups.update(newGroupId, {
      color: color,
      title: title,
    });
  }
};

// register
const tabMover = new TabMover(loadData, saveData, tabMoveWrapper);
chrome.runtime.onStartup.addListener(() => chrome.storage.local.clear());
chrome.action.onClicked.addListener((tab) => tabMover.moveTabOrHighlightedTabs(tab));
chrome.commands.onCommand.addListener((_, tab) => tabMover.moveTabOrHighlightedTabs(tab));
