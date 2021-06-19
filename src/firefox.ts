import { TabMover } from "./tabMover";

const tabMover = new TabMover();

browser.menus.create({
  contexts: ["tab"],
  onclick: (_, tab) => tabMover.moveTabOrHighlightedTabs(tab),
  title: "Move to the next window",
});
browser.browserAction.onClicked.addListener((tab) => tabMover.moveTabOrHighlightedTabs(tab));
browser.commands.onCommand.addListener(() => tabMover.moveActiveTab());
