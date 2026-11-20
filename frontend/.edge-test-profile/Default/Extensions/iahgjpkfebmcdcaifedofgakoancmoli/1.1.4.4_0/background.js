// Copyright (c) Sound Research Corp. 2020
'use strict';

chrome.manifest = chrome.app.getDetails();
chrome.rxSupportedUrls = [];
var rxSplitUrl = /((?:http|ftp)s?):\/\/([^\/]+)(\/.*)?/; 

for (var i = 0; i < chrome.manifest.content_scripts[0].matches.length; i++) {
  var rxUrl = null;
  var mSplitUrl = chrome.manifest.content_scripts[0].matches[i].match(rxSplitUrl);
  if (mSplitUrl !== null) {
    rxUrl = "^" + mSplitUrl[1] + "://" + mSplitUrl[2].replace(/[?()[\]\\.+^$|]/g, "\\$&").replace(/\*\\./g, '(?:[^/]*\\.)*').replace(/\*$/, '[^/]*');
    if (mSplitUrl[3])
      rxUrl += mSplitUrl[3].replace(/[?()[\]\\.+^$|]/g, "\\$&").replace(/\/\*(?=$|\/)/g, '(?:/[^]*)?');
    rxUrl += "$";
  }
  if (rxUrl !== null)
    chrome.rxSupportedUrls[i] = rxUrl;
}

class CCTabInfo {
  constructor(info) {
    if (info.url !== undefined)
      this.url = info.url;
    if (info.id !== undefined)
      this.tabId = info.id;
    if (info.url !== undefined)
      this.url = info.url;
    if (info.id !== undefined)
      this.tabId = info.id;
    if (info.title !== undefined)
      this.title = info.title;
    if (info.audible !== undefined)
      this.audible = info.audible;
    if (info.mutedInfo?.muted !== undefined)
      this.muted = info.mutedInfo?.muted;
  }

  isEmpty() {
    return Object.keys(this).length == 0;
  }
}

function generateUniqueId() {
  return 'xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx'.replace(/[x]/g, function (c) {
    return (Math.random() * 16 | 0).toString(16);
  });
}

function _sendNativeMessage() {
  if (this.nativeMessages !== undefined) {
    for (let host of this.hosts) {
      chrome.runtime.sendNativeMessage(host.name, { instanceId: this.instanceId, changes: this.nativeMessages }, function (response) {
        if (response !== undefined) {
          if (response.hostId !== undefined) {
            if (host.nativeHostId !== response.hostId) {
              host.nativeHostId = response.hostId;
              chrome.tabs.query({}, function (tabs) {
                for (let tab of tabs)
                  chrome.tabs.sendMessage(tab.id, { event: "tabs.newHostId" });
              });
            }
          }
        }
      }.bind(this));
    }
    this.nativeMessages = undefined;
  }
}

function sendNativeMessage(msg, tabId = undefined) {
  if (tabId && msg.type === 'web-page') {
    if (this.tabPageId[tabId] !== msg.id) {
      if (this.tabPageId[tabId])
        this.notifyPageDisposed(this.tabPageId[tabId]);
      this.tabPageId[tabId] = msg.id;
    }
  }
  if (this.nativeMessages !== undefined)
    this.nativeMessages.push(msg);
  else
    this.nativeMessages = [msg];
  if (this.__sendNativeMessage !== undefined)
    clearTimeout(this.__sendNativeMessage);
  this.__sendNativeMessage = setTimeout(this._sendNativeMessage.bind(this), 20);
}

function notifyPageDisposed(pageId) {
  this.sendNativeMessage({ type: 'web-page', id: pageId, disposed: true });
}

var hosts = [
  { name: "com.soundresearch.contentclassifier", nativeHostId: "" },
  { name: "com.soundresearch.contentclassifier.usb", nativeHostId: "" }
];
var tabPageId = [];
var instanceId = this.generateUniqueId();

this.chrome.tabs.onRemoved.addListener(function (tabId) {
  if (this.tabPageId[tabId]) {
    this.notifyPageDisposed(this.tabPageId[tabId]);
    this.tabPageId[tabId] = undefined;
  }
}.bind(this));

this.chrome.tabs.onUpdated.addListener((tabId, change, tab) => {
  var tabInfo = new CCTabInfo(change);
  if (!tabInfo.isEmpty())
    chrome.tabs.sendMessage(tabId, { event: "tabs.onUpdated", change: tabInfo });
});

this.chrome.tabs.onActivated.addListener((activeInfo) => {
  let tabId = activeInfo.tabId;
  if (tabId !== undefined) {
    chrome.tabs.query({}, function (tabs) {
      for (let tab of tabs)
        if (tab.id != tabId)
          chrome.tabs.sendMessage(tab.id, { event: "tabs.onDeactivated" });
    });
    chrome.tabs.sendMessage(tabId, { event: "tabs.onActivated" });
  }
});

this.chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  var tab = sender.tab;
  switch (request.command) {
    case "getTabInfo":
      var tabInfo = new CCTabInfo(tab);
      if (!tabInfo.isEmpty())
        sendResponse(tabInfo);
      break;
    default:
      this.sendNativeMessage(request, tab.id);
      break;
  }
}.bind(this));

function injectContentScript() {
  chrome.tabs.query({}, function (tabs) {
    for (let tab of tabs) {
      for (let rxSupportedUrl of chrome.rxSupportedUrls) {
        if (tab.url === undefined)
          continue;
        var mSupportedUrl = tab.url.match(rxSupportedUrl);
        if (mSupportedUrl !== null) {
          for (let content_script of chrome.manifest.content_scripts) {
            for (let js of content_script.js)
              chrome.tabs.executeScript(tab.id, { file: js });
          }
        }
      }
    }
  });
}

this.sendNativeMessage({ title: "Sound Research (c) Audio Content Classification Extension" });

this.injectContentScript();
