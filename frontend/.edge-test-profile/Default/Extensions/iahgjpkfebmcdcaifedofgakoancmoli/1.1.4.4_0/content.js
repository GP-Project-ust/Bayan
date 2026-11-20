// Copyright (c) Sound Research Corp. 2020

ctx = {};

ctx.CCObserverBase = class {
  constructor(type) {
    this.type = type;
    this.id = this.generateUniqueId();
    this.prefix = { type: this.type, id: this.id };
    this.mutationObservers = [];
  }

  init() {
    this.initialized = true;
  }

  dispose() {
    if (this.__sendState !== undefined) {
      clearTimeout(this.__sendState);
      this.__sendState = undefined;
    }
    for (let mutationObserver of this.mutationObservers)
      mutationObserver.disconnect();
  }

  observeMutations(node, options, onMutations) {
    if (options.attributes && options.attributeFilter) {
      for (let attributeName of options.attributeFilter)
        this[attributeName] = node[attributeName];
    }
    let mutationObserver = new MutationObserver(onMutations);
    mutationObserver.observe(node, options);
    this.mutationObservers.push(mutationObserver);
  }

  _sendState() {
    if (this.stateChange !== undefined) {
      let msg = {};
      Object.assign(msg, this.prefix, this.stateChange);
      if (chrome.runtime?.id)
        chrome.runtime.sendMessage(msg, null);
      this.stateChange = undefined;
    }
  }

  sendState(change) {
    if (this.stateChange !== undefined)
      Object.assign(this.stateChange, change);
    else
      this.stateChange = change;
    if (this.__sendState !== undefined)
      clearTimeout(this.__sendState);
    this.__sendState = setTimeout(this._sendState.bind(this), 20);
  }

  toEventHandler(func) {
    let boundFunc = func.bind(this)
    this['_' + func.name] = boundFunc;
    boundFunc(null);
    return boundFunc;
  }

  generateUniqueId() {
    return 'xxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx'.replace(/[x]/g, function (c) {
      return (Math.random() * 16 | 0).toString(16);
    });
  }
}

ctx.CCNodeObserver = class extends ctx.CCObserverBase {
  constructor(type, node) {
    super(type);
    this.node = node;
  }

  init() {
    super.init();
  }

  dispose() {
    super.dispose();
  }
}

ctx.CCMediaElementObserver = class extends ctx.CCNodeObserver {
  get playing() { return this._playing; } set playing(value) { if (this._playing !== value) { this._playing = value; this.sendState({ playing: value }); } };
  get src() { return this._src; } set src(value) { if (this._src !== value) { this._src = value; this.sendState({ src: value }); } };
  get currentSrc() { return this._currentSrc; } set currentSrc(value) { if (this._currentSrc !== value) { this._currentSrc = value; this.sendState({ currentSrc: value }); } };
  get duration() { return this._duration; } set duration(value) { if (this._duration !== value) { this._duration = value; this.sendState({ duration: value }); } };
  get volume() { return this._volume; } set volume(value) { if (this._volume !== value) { this._volume = value; this.sendState({ volume: value }); } };
  get muted() { return this._muted; } set muted(value) { if (this._muted !== value) { this._muted = value; this.sendState({ muted: value }); } };

  constructor(type, page, node) {
    super(type, node);
    this.page = page;
    Object.assign(this.prefix, { pageId: this.page.id });
  }

  init() {
    super.init();
    this.node.addEventListener('loadedmetadata', this.toEventHandler(this.on_loadedmetadata));
    this.node.addEventListener('duration', this.toEventHandler(this.on_duration));
    this.node.addEventListener('volume', this.toEventHandler(this.on_volume));
    this.node.addEventListener('muted', this.toEventHandler(this.on_muted));
    this.node.addEventListener('loadeddata', this.toEventHandler(this.on_loadeddata));
    this.node.addEventListener('canplay', this.toEventHandler(this.on_canplay));
    this.node.addEventListener('play', this.toEventHandler(this.on_play));
    this.node.addEventListener('pause', this.toEventHandler(this.on_pause));
    this.node.addEventListener('ended', this.toEventHandler(this.on_ended));
    this.updatePlaybackState();
  }

  dispose() {
    this.node.removeEventListener('loadedmetadata', this._on_loadedmetadata);
    this.node.removeEventListener('duration', this._on_duration);
    this.node.removeEventListener('volume', this._on_volume);
    this.node.removeEventListener('muted', this._on_muted);
    this.node.removeEventListener('loadeddata', this._on_loadeddata);
    this.node.removeEventListener('canplay', this._on_canplay);
    this.node.removeEventListener('play', this._on_play);
    this.node.removeEventListener('pause', this._on_pause);
    this.node.removeEventListener('ended', this._on_ended);
    super.dispose();
  }

  onAttributesMutated(mutations) {
    for (let mutation of mutations)
      this[mutation.attributeName] = this.node[mutation.attributeName];
  }

  on_loadedmetadata(event) {
    this.src = this.node.src;
    this.currentSrc = this.node.currentSrc;
    this.duration = this.node.duration;
  }

  on_duration(event) {
    this.duration = this.node.duration;
  }

  on_volume(event) {
  }

  on_muted(event) {
    this.onPlaybackStateChanged(event);
  }

  on_loadeddata(event) {
    this.onPlaybackStateChanged(event);
  }

  on_canplay(event) {
    this.onPlaybackStateChanged(event);
  }

  on_play(event) {
    this.onPlaybackStateChanged(event);
  }

  on_pause(event) {
    this.onPlaybackStateChanged(event);
  }

  on_ended(event) {
    this.onPlaybackStateChanged(event);
  }


  onPlaybackStateChanged(event) {
    this.on_loadedmetadata(event);
    this.updatePlaybackState();
  }

  updatePlaybackState() {
    this.playing = !this.node.paused && !this.node.ended;
    if (this.playing)
      this.page.audible = true;
  }
}

ctx.CCVideoElementObserver = class extends ctx.CCMediaElementObserver {
  get videoWidth() { return this._videoWidth; } set videoWidth(value) { if (this._videoWidth !== value) { this._videoWidth = value; this.sendState({ videoWidth: value }); } };
  get videoHeight() { return this._videoHeight; } set videoHeight(value) { if (this._videoHeight !== value) { this._videoHeight = value; this.sendState({ videoHeight: value }); } };

  constructor(page, node) {
    super('web-video-element', page, node);
  }

  init() {
    super.init();
    this.node.addEventListener('resize', this.toEventHandler(this.on_resize));
  }

  dispose() {
    this.node.removeEventListener('resize', this._on_resize);
    super.dispose();
  }

  on_resize(event) {
    this.videoWidth = this.node.videoWidth;
    this.videoHeight = this.node.videoHeight;
  }

  on_loadedmetadata(event) {
    super.on_loadedmetadata(event);
    this.on_resize(event);
  }
}

ctx.CCAudioElementObserver = class extends ctx.CCMediaElementObserver {
  constructor(page, node) {
    super('web-audio-element', page, node);
  }

  init() {
    super.init();
  }

  dispose() {
    super.dispose();
  }
}

ctx.CCScriptNodeObserver = class extends ctx.CCNodeObserver {
  get text() { return this._text; } set text(value) { if (this._text !== value) { this._text = value; this.sendState({ text: value }); } };

  constructor(page, node) {
    super('web-script-node');
    this.page = page;
    this.node = node;
    Object.assign(this.prefix, { pageId: this.page.id });
  }

  init() {
    super.init();
    this.text = this.node.text;
    this.textObserver = new MutationObserver(function (mutations) {
      this.text = this.node.text;
    }.bind(this));
    this.textObserver.observe(this.node, { childList: true });
  }

  dispose() {
    if (this.textObserver != undefined)
      this.textObserver.disconnect();
    super.dispose();
  }
}

ctx.CCPageObserver = class extends ctx.CCObserverBase {
  get browser() { return this._browser; } set browser(value) { if (this._browser !== value) { this._browser = value; this.sendState({ browser: value }); } };
  get extensionId() { return this._extensionId; } set extensionId(value) { if (this._extensionId !== value) { this._extensionId = value; this.sendState({ extensionId: value }); } };
  get extensionVersion() { return this._extensionVersion; } set extensionVersion(value) { if (this._extensionVersion !== value) { this._extensionVersion = value; this.sendState({ extensionVersion: value }); } };
  get tabId() { return this._tabId; } set tabId(value) { if (this._tabId !== value) { this._tabId = value; this.sendState({ tabId: value }); } };
  get url() { return this._url; } set url(value) { if (this._url !== value) { this._url = value; this.sendState({ url: value }); } };
  get title() { return this._title; } set title(value) { if (this._title !== value) { this._title = value; this.sendState({ title: value }); } };
  get audible() { return this._audible; } set audible(value) { if (this._audible !== value) { this._audible = value; this.sendState({ audible: value }); } };
  get muted() { return this._muted; } set muted(value) { if (this._muted !== value) { this._muted = value; this.sendState({ muted: value }); } };
  get active() { return this._active; } set active(value) { if (this._active !== value) { this._active = value; this.sendState({ active: value }); } };
  get disposed() { return this._disposed; } set disposed(value) { if (this._disposed !== value) { this._disposed = value; this.sendState({ disposed: value }); } };
  get youtubeRecordingDetails() { return this._youtubeRecordingDetails; } set youtubeRecordingDetails(value) { if (this._youtubeRecordingDetails !== value) { this._youtubeRecordingDetails = value; this.sendState({ youtubeRecordingDetails: value }); } };
  get timeStamp() { return this._timeStamp; } set timeStamp(value) { if (this._timeStamp !== value) { this._timeStamp = value; this.sendState({ timeStamp: value }); } };

  constructor(context) {
    super('web-page');
    this.videoElements = new Map();
    this.audioElements = new Map();
    this.scriptNodes = new Map();
    this.context = context;
    this.disposed = false;
    this.browser = 'chrome';
    this.initialized = false;
  }

  init(window) {
    this.window = window;
    if (!this.initialized) {
      super.init();
      this.extensionId = chrome.runtime.id;
      var manifestData = chrome.runtime.getManifest();
      this.extensionVersion = manifestData.version;
      window.document.querySelectorAll('*').forEach(function (node) { this.onNodeAdded(node); }.bind(this));
      this._onBackgroundMessage = this.onBackgroundMessage.bind(this);
      chrome.extension.onMessage.addListener(this._onBackgroundMessage);
      this.observeMutations(window.document, { childList: true, subtree: true }, this.onTreeMutations.bind(this));
      this.timeStamp = this.getCurrentTime();
      this.initialized = true;
      this.disposed = false;
    }
  }

  dispose() {
    if (!this.disposed) {
      chrome.extension.onMessage.removeListener(this._onBackgroundMessage);
      this.videoElements.forEach(function (videoElement) {
        videoElement.dispose();
      }.bind(this));
      this.audioElements.forEach(function (audioElement) {
        audioElement.dispose();
      }.bind(this));
      this.scriptNodes.forEach(function (scriptNode) {
        scriptNode.dispose();
      }.bind(this));
      super.dispose();
      this.disposed = true;
      this.initialized = false;
    }
  }

  setTabInfo(tabInfo) {
    for (var p in tabInfo)
      this[p] = tabInfo[p];
  }

  getCurrentTime() {
    this.scriptNodes.forEach(function (scriptNode) {
      if (scriptNode.text !== scriptNode.node.text)
        scriptNode.text = scriptNode.node.text;
    }.bind(this));
    return Math.floor(Date.now() / 1000);
  }

  observeNodeAdded(node) {
    node.querySelectorAll('*').forEach(function (node) { this.onNodeAdded(node); }.bind(this));
    this.observeMutations(node, { childList: true, subtree: true }, this.onTreeMutations.bind(this));
  }

  onTreeMutations(mutations) {
    if (this.url != document.location.href) {
      this.url = document.location.href;
    }
    for (let mutation of mutations) {
      for (let removedNode of mutation.removedNodes)
        this.onNodeRemoved(removedNode);
      for (let addedNode of mutation.addedNodes)
        this.onNodeAdded(addedNode);
    }
  }

  querySelectorAll(fromElement, selector) {
    if (fromElement.matches !== undefined && fromElement.matches(selector))
      return [fromElement, ...fromElement.querySelectorAll(selector)]
    return fromElement.querySelectorAll(selector);
  }

  onNodeAdded(node) {
    if (typeof node.matches === "function") {
      if (node.matches('iframe')) {
        if (node.contentDocument)
          this.observeNodeAdded(node.contentDocument);
        else {
          node.addEventListener('load', function (event) {
            if (node.contentDocument)
              this.observeNodeAdded(node.contentDocument);
          }.bind(this));
        }
      } else if (node.matches('video')) {
        var videoElementObserver = new ctx.CCVideoElementObserver(this, node)
        videoElementObserver.init()
        this.videoElements.set(node, videoElementObserver);
      } else if (node.matches('audio')) {
        var audioElementObserver = new ctx.CCAudioElementObserver(this, node)
        audioElementObserver.init();
        this.audioElements.set(node, audioElementObserver);
      } else if (node.matches('script')) {
        var scriptNodeObserver = new ctx.CCScriptNodeObserver(this, node)
        scriptNodeObserver.init();
        this.scriptNodes.set(node, scriptNodeObserver);
      }
    }
  }

  onNodeRemoved(node) {
    if (typeof node.matches === "function") {
      if (node.matches('audio')) {
        let ccElemAudio = this.audioElements.get(node);
        if (ccElemAudio) {
          ccElemAudio.dispose();
          this.audioElements.delete(node);
        }
      } else if (node.matches('video')) {
        let ccElemVideo = this.videoElements.get(node);
        if (ccElemVideo) {
          ccElemVideo.dispose();
          this.videoElements.delete(node);
        }
      } else if (node.matches('script')) {
        let ccNodeScript = this.scriptNodes.get(node);
        if (ccNodeScript) {
          ccNodeScript.dispose();
          this.scriptNodes.delete(node);
        }
      }
    }
  }

  onBackgroundMessage(msg, sender, sendResponse) {
    switch (msg.event) {
      case 'tabs.onUpdated':
        this.setTabInfo(msg.change);
        break;
      case 'tabs.onActivated':
        this.active = true;
        break;
      case 'tabs.onDeactivated':
        this.active = false;
        break;
      case 'tabs.newHostId':
        this.context.reset();
        break;
      case 'tabs.dispose':
        this.context.dispose();
        break;
      case 'tabs.setProperty':
        this[msg.propName] = msg.value;
        break;
      case 'tabs.setTimeStamp':
        this.timeStamp = this.getCurrentTime();
        break;
    }
  }
}

ctx.dispose = function() {
  if (this.pageObserver !== undefined) {
    this.pageObserver.dispose();
    this.pageObserver = undefined;
  }
}

ctx.init = function() {
  if (this.pageObserver === undefined) {
    this.pageObserver = new ctx.CCPageObserver(this);
    this.pageObserver.init(window);
    if (chrome.runtime?.id) {
      chrome.runtime.sendMessage({ command: "getTabInfo" }, function (tabInfo) {
        this.pageObserver.setTabInfo(tabInfo);
      }.bind(this));
    }
  }
}

ctx.reset = function() {
  this.dispose();
  this.init();
}

ctx.init();
