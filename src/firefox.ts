import { TabMover } from "./tabMover";

const tabMover = new TabMover();

browser.menus.create({
  contexts: ["tab"],
  onclick: (_, tab) => tabMover.moveTabOrHighlightedTabs(tab),
  title: "Move to the next window",
});
browser.browserAction.onClicked.addListener((tab) => tabMover.moveTabOrHighlightedTabs(tab));
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
browser.commands.onCommand.addListener((_, tab) => tabMover.moveTabOrHighlightedTabs(tab));
