"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => DreamcatcherPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  captureFolder: "Dreams/Dreamcatcher",
  deviceName: "obsidian-pointer"
};
var DreamcatcherPlugin = class extends import_obsidian.Plugin {
  constructor() {
    super(...arguments);
    this.settings = { ...DEFAULT_SETTINGS };
    this.captures = [];
  }
  async onload() {
    await this.loadState();
    this.addRibbonIcon("orbit", "Open Dreamcatcher", () => {
      new DreamcatcherModal(this.app, this).open();
    });
    this.addCommand({
      id: "open-dreamcatcher",
      name: "Open Dreamcatcher",
      callback: () => new DreamcatcherModal(this.app, this).open()
    });
    this.addSettingTab(new DreamcatcherSettingTab(this.app, this));
  }
  async persistCapture(capture) {
    this.captures = [capture, ...this.captures].slice(0, 200);
    await this.createCaptureNote(capture);
    await this.saveState();
  }
  async loadState() {
    const stored = await this.loadData();
    if (!stored) {
      return;
    }
    this.captures = Array.isArray(stored.captures) ? stored.captures : [];
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...stored.settings ?? {}
    };
  }
  async saveState() {
    await this.saveData({
      captures: this.captures,
      settings: this.settings
    });
  }
  async createCaptureNote(capture) {
    const folder = (0, import_obsidian.normalizePath)(this.settings.captureFolder.trim() || DEFAULT_SETTINGS.captureFolder);
    await ensureFolder(this.app, folder);
    const titleAnchor = sanitizeSegment(capture.signal.anchor_word || "untitled");
    const iso = new Date(capture.timestamp * 1e3).toISOString();
    const fileName = `${iso.slice(0, 10)}-${titleAnchor}-${capture.id.slice(0, 8)}.md`;
    const path = (0, import_obsidian.normalizePath)(`${folder}/${fileName}`);
    const note = renderCaptureMarkdown(capture);
    await this.app.vault.create(path, note);
    new import_obsidian.Notice(`Dream saved: ${fileName}`);
  }
};
var DreamcatcherModal = class extends import_obsidian.Modal {
  constructor(app, plugin) {
    super(app);
    this.startedAt = 0;
    this.intensitySeries = [];
    this.tone = "#7bd6ff";
    this.intensity = 0.2;
    this.pointerId = null;
    this.lastCapture = null;
    this.plugin = plugin;
  }
  onOpen() {
    this.modalEl.addClass("dreamcatcher-modal");
    this.contentEl.empty();
    const shell = this.contentEl.createDiv({ cls: "dreamcatcher-shell" });
    const header = shell.createDiv({ cls: "dreamcatcher-header" });
    header.createEl("h2", { cls: "dreamcatcher-title", text: "Dreamcatcher" });
    this.statusEl = header.createDiv({ cls: "dreamcatcher-status", text: "Press, drag, release." });
    this.fieldEl = shell.createDiv({ cls: "dreamcatcher-field" });
    this.fieldEl.createDiv({ cls: "dreamcatcher-core" });
    const hud = this.fieldEl.createDiv({ cls: "dreamcatcher-hud" });
    this.intensityEl = hud.createSpan({ text: "intensity 20" });
    this.hueEl = hud.createSpan({ text: "hue 200" });
    this.durationEl = hud.createSpan({ text: "duration 0.00s" });
    const anchorWrap = shell.createDiv({ cls: "dreamcatcher-anchor" });
    this.anchorInputEl = anchorWrap.createEl("input", {
      type: "text",
      attr: {
        placeholder: "anchor"
      }
    });
    this.suggestionWrapEl = anchorWrap.createDiv({ cls: "dreamcatcher-suggestions" });
    const actions = shell.createDiv({ cls: "dreamcatcher-actions" });
    this.saveButtonEl = actions.createEl("button", { text: "Save dream to vault" });
    this.saveButtonEl.disabled = true;
    this.historyEl = shell.createDiv({ cls: "dreamcatcher-history" });
    this.bindFieldEvents();
    this.bindActions();
    this.refreshHistory();
    this.renderHud();
  }
  onClose() {
    this.contentEl.empty();
  }
  bindFieldEvents() {
    this.fieldEl.onpointerdown = (event) => {
      event.preventDefault();
      this.pointerId = event.pointerId;
      this.fieldEl.setPointerCapture(event.pointerId);
      this.startedAt = Date.now();
      this.intensitySeries = [];
      this.lastCapture = null;
      this.saveButtonEl.disabled = true;
      this.statusEl.setText("Capturing...");
      this.updateFromPointer(event.clientX, event.clientY);
    };
    this.fieldEl.onpointermove = (event) => {
      if (this.pointerId !== event.pointerId) {
        return;
      }
      this.updateFromPointer(event.clientX, event.clientY);
    };
    this.fieldEl.onpointerup = (event) => {
      if (this.pointerId !== event.pointerId) {
        return;
      }
      this.updateFromPointer(event.clientX, event.clientY);
      this.fieldEl.releasePointerCapture(event.pointerId);
      this.pointerId = null;
      this.finalizeCapture();
    };
    this.fieldEl.onpointercancel = () => {
      this.pointerId = null;
      this.statusEl.setText("Capture canceled.");
    };
  }
  bindActions() {
    this.saveButtonEl.onclick = async () => {
      if (!this.lastCapture) {
        return;
      }
      const anchor = this.anchorInputEl.value.trim().toLowerCase();
      if (anchor) {
        this.lastCapture.signal.anchor_word = anchor;
      }
      await this.plugin.persistCapture(this.lastCapture);
      this.statusEl.setText("Dream saved.");
      this.refreshHistory();
      this.saveButtonEl.disabled = true;
    };
  }
  updateFromPointer(clientX, clientY) {
    const rect = this.fieldEl.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    const intensity = 1 - y;
    const tone = hslToHex(x * 360, 82, 56);
    this.fieldEl.style.setProperty("--pointer-x", `${(x * 100).toFixed(2)}%`);
    this.fieldEl.style.setProperty("--pointer-y", `${(y * 100).toFixed(2)}%`);
    this.fieldEl.style.setProperty("--tone", tone);
    this.fieldEl.style.setProperty("--core-scale", `${1 + intensity * 0.42}`);
    this.intensitySeries.push(intensity);
    this.intensity = intensity;
    this.tone = tone;
    this.renderHud();
  }
  finalizeCapture() {
    if (this.startedAt === 0) {
      return;
    }
    const now = Date.now();
    const durationMs = Math.max(1, Math.floor(now - this.startedAt));
    const series = this.intensitySeries.length > 0 ? this.intensitySeries : [this.intensity];
    const capture = {
      id: crypto.randomUUID(),
      timestamp: Math.floor(now / 1e3),
      signal: {
        intensity_series: series,
        emotion_hex: this.tone,
        anchor_word: "",
        duration_ms: durationMs
      },
      context: {
        device: this.plugin.settings.deviceName,
        version: this.plugin.manifest.version
      }
    };
    const suggestions = suggestAnchors(capture);
    capture.signal.anchor_word = suggestions[0] ?? "untitled";
    this.lastCapture = capture;
    this.anchorInputEl.value = capture.signal.anchor_word;
    this.renderSuggestions(suggestions);
    this.saveButtonEl.disabled = false;
    this.statusEl.setText("Release captured. Pick anchor then save.");
    this.renderHud();
  }
  renderHud() {
    this.intensityEl.setText(`intensity ${Math.round(this.intensity * 100)}`);
    this.hueEl.setText(`hue ${Math.round(hexToHueDegrees(this.tone))}`);
    const durationMs = this.startedAt > 0 ? Date.now() - this.startedAt : this.lastCapture?.signal.duration_ms ?? 0;
    this.durationEl.setText(`duration ${(durationMs / 1e3).toFixed(2)}s`);
  }
  renderSuggestions(values) {
    this.suggestionWrapEl.empty();
    values.forEach((value) => {
      const button = this.suggestionWrapEl.createEl("button", {
        text: value.split("-").join(" ")
      });
      button.onclick = () => {
        this.anchorInputEl.value = value;
      };
    });
  }
  refreshHistory() {
    this.historyEl.empty();
    this.historyEl.createEl("strong", { text: "Recent dreams" });
    if (this.plugin.captures.length === 0) {
      this.historyEl.createDiv({ text: "No dreams saved yet." });
      return;
    }
    this.plugin.captures.slice(0, 6).forEach((entry) => {
      const row = this.historyEl.createDiv({ cls: "dreamcatcher-history-item" });
      row.createDiv({ cls: "dreamcatcher-swatch", attr: { style: `background:${entry.signal.emotion_hex}` } });
      row.createSpan({
        text: `${entry.signal.anchor_word} - ${Math.round(Math.max(...entry.signal.intensity_series, 0) * 100)} peak`
      });
    });
  }
};
var DreamcatcherSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    new import_obsidian.Setting(this.containerEl).setName("Capture folder").setDesc("Folder where Dreamcatcher notes are created.").addText(
      (text) => text.setPlaceholder(DEFAULT_SETTINGS.captureFolder).setValue(this.plugin.settings.captureFolder).onChange(async (value) => {
        this.plugin.settings.captureFolder = value.trim() || DEFAULT_SETTINGS.captureFolder;
        await this.plugin.saveState();
      })
    );
    new import_obsidian.Setting(this.containerEl).setName("Device name").setDesc("Stored in capture context metadata.").addText(
      (text) => text.setPlaceholder(DEFAULT_SETTINGS.deviceName).setValue(this.plugin.settings.deviceName).onChange(async (value) => {
        this.plugin.settings.deviceName = value.trim() || DEFAULT_SETTINGS.deviceName;
        await this.plugin.saveState();
      })
    );
  }
};
async function ensureFolder(app, folderPath) {
  const normalized = (0, import_obsidian.normalizePath)(folderPath);
  if (normalized === "/" || normalized === ".") {
    return;
  }
  const parts = normalized.split("/").filter(Boolean);
  let cursor = "";
  for (const segment of parts) {
    cursor = cursor ? `${cursor}/${segment}` : segment;
    const existing = app.vault.getAbstractFileByPath(cursor);
    if (existing instanceof import_obsidian.TFolder) {
      continue;
    }
    if (existing) {
      throw new Error(`Path exists and is not a folder: ${cursor}`);
    }
    await app.vault.createFolder(cursor);
  }
}
function renderCaptureMarkdown(capture) {
  const intensityPeak = Math.max(...capture.signal.intensity_series, 0);
  const hue = Math.round(hexToHueDegrees(capture.signal.emotion_hex));
  const emotion = emotionFromHue(hue);
  const title = capture.signal.anchor_word.replace(/-/g, " ") || "untitled";
  const anchorTags = capture.signal.anchor_word.split("-").filter((w) => w.length > 0).map((w) => `  - ${w}`);
  return [
    "---",
    "type: dream-entry",
    `captured_at: ${new Date(capture.timestamp * 1e3).toISOString()}`,
    `anchor: ${capture.signal.anchor_word}`,
    `anchor_color: "${capture.signal.emotion_hex}"`,
    `intensity_peak: ${intensityPeak.toFixed(3)}`,
    `duration_ms: ${capture.signal.duration_ms}`,
    `emotion: ${emotion}`,
    "tags:",
    "  - dream",
    "  - dreamcatcher",
    ...anchorTags,
    "---",
    "",
    `# Dream: ${title}`,
    "",
    `Hue signature: ${hue} degrees`,
    "",
    "## Signal",
    `- Intensity peak: ${(intensityPeak * 100).toFixed(1)}%`,
    `- Duration: ${(capture.signal.duration_ms / 1e3).toFixed(2)}s`,
    `- Color: ${capture.signal.emotion_hex}`,
    "",
    "## Reflection",
    "",
    "What did this dream color feel like?",
    "",
    "### Setting",
    "",
    "Where did this dream take place? Describe the environment, light, and atmosphere.",
    "",
    "### Characters",
    "",
    "Who or what appeared? Were they familiar or unknown?",
    "",
    "### Narrative",
    "",
    "What happened? Describe the sequence of events as you remember them.",
    "",
    "### Emotions",
    "",
    "What emotions were present during the dream? Did they shift?",
    "",
    "### Symbols",
    "",
    "Were there any recurring or striking images, objects, or symbols?",
    "",
    "### Waking feeling",
    "",
    "How did you feel when you woke? What lingered?",
    ""
  ].join("\n");
}
function sanitizeSegment(value) {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  const cleaned = normalized.replace(/[^a-z0-9-_]/g, "");
  return cleaned || "untitled";
}
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function hslToHex(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = hue / 60;
  const second = chroma * (1 - Math.abs(segment % 2 - 1));
  const match = l - chroma / 2;
  let red = 0;
  let green = 0;
  let blue = 0;
  if (segment >= 0 && segment < 1) {
    red = chroma;
    green = second;
  } else if (segment < 2) {
    red = second;
    green = chroma;
  } else if (segment < 3) {
    green = chroma;
    blue = second;
  } else if (segment < 4) {
    green = second;
    blue = chroma;
  } else if (segment < 5) {
    red = second;
    blue = chroma;
  } else {
    red = chroma;
    blue = second;
  }
  const toHex = (value) => Math.round((value + match) * 255).toString(16).padStart(2, "0");
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}
function hexToHueDegrees(hex) {
  const normalized = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    return 200;
  }
  const red = Number.parseInt(normalized.slice(0, 2), 16) / 255;
  const green = Number.parseInt(normalized.slice(2, 4), 16) / 255;
  const blue = Number.parseInt(normalized.slice(4, 6), 16) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  if (delta === 0) {
    return 0;
  }
  let hue = 0;
  if (max === red) {
    hue = (green - blue) / delta % 6;
  } else if (max === green) {
    hue = (blue - red) / delta + 2;
  } else {
    hue = (red - green) / delta + 4;
  }
  const degrees = hue * 60;
  return degrees < 0 ? degrees + 360 : degrees;
}
function suggestAnchors(raw) {
  const peak = Math.max(...raw.signal.intensity_series, 0);
  const duration = raw.signal.duration_ms;
  const hue = hexToHueDegrees(raw.signal.emotion_hex);
  const emotion = emotionFromHue(hue);
  const intensityWord = intensityFromPeak(peak);
  const durationWord = durationFromMs(duration);
  return [
    `${intensityWord}-${emotion}-${durationWord}`,
    `${emotion}-${durationWord}`,
    `${intensityWord}-${emotion}`
  ];
}
function emotionFromHue(hue) {
  if (hue < 25 || hue >= 335) {
    return "fierce";
  }
  if (hue < 70) {
    return "vital";
  }
  if (hue < 120) {
    return "bright";
  }
  if (hue < 170) {
    return "grounded";
  }
  if (hue < 220) {
    return "lucid";
  }
  if (hue < 275) {
    return "calm";
  }
  return "mystic";
}
function intensityFromPeak(peak) {
  if (peak < 0.28) {
    return "quiet";
  }
  if (peak < 0.55) {
    return "steady";
  }
  if (peak < 0.78) {
    return "charged";
  }
  return "intense";
}
function durationFromMs(durationMs) {
  if (durationMs < 1200) {
    return "flash";
  }
  if (durationMs < 3200) {
    return "wave";
  }
  return "drift";
}
