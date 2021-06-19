import { TabMover, Tab, Data } from "./tabMover";

// register
const tabMover = new TabMover();
chrome.runtime.onStartup.addListener(() => chrome.storage.local.clear());
chrome.action.onClicked.addListener((tab) => tabMover.moveTabOrHighlightedTabs(tab));
chrome.commands.onCommand.addListener((_, tab) => tabMover.moveTabOrHighlightedTabs(tab));

// chrome-specific hooks
tabMover.loadData = async () => {
  return new Promise((resolve) => chrome.storage.local.get((items) => resolve(items)));
};
tabMover.saveData = async (data: Data) => {
  return new Promise((resolve) => chrome.storage.local.set(data, () => resolve()));
};
tabMover.newTabCompletion = async (tab: Tab, targetWindowId: number, originalTab?: Tab) => {
  const group = await (async () => {
    if (tab.groupId != null && tab.groupId !== -1) {
      const group = await tabGroupsGet(tab.groupId);
      if (group != null) {
        return group;
      }
    }
    if (originalTab?.groupId != null && originalTab.groupId !== -1) {
      const group = await tabGroupsGet(originalTab.groupId);
      if (group != null) {
        return group;
      }
    }
    return null;
  })();

  if (group == null) {
    return;
  }

  const { color, title } = group;
  const existingTargetGroup = (
    await tabGroupsQuery({
      color: color,
      title: title,
      windowId: targetWindowId,
    })
  )[0];

  if (existingTargetGroup != null) {
    await tabsGroup({
      groupId: existingTargetGroup.id,
      tabIds: tab.id,
    });
  } else {
    const newGroupId = await tabsGroup({
      createProperties: { windowId: targetWindowId },
      tabIds: tab.id,
    });
    await tabGroupsUpdate(newGroupId, {
      color: color,
      title: title,
    });
  }
};

// promisify
const tabGroupsGet = (groupId: number): Promise<chrome.tabGroups.TabGroup> => {
  return new Promise((resolve) => chrome.tabGroups.get(groupId, (group) => resolve(group)));
};
const tabGroupsQuery = (
  queryInfo: chrome.tabGroups.QueryInfo
): Promise<chrome.tabGroups.TabGroup[]> => {
  return new Promise((resolve) =>
    chrome.tabGroups.query(queryInfo, (tabGroups) => resolve(tabGroups))
  );
};
const tabGroupsUpdate = (
  groupId: number,
  updateProperties: chrome.tabGroups.UpdateProperties
): Promise<chrome.tabGroups.TabGroup> => {
  return new Promise((resolve) =>
    chrome.tabGroups.update(groupId, updateProperties, (tabGroup) => resolve(tabGroup))
  );
};
const tabsGroup = (options: chrome.tabs.GroupOptions): Promise<number> => {
  return new Promise((resolve) => chrome.tabs.group(options, (groupId) => resolve(groupId)));
};
