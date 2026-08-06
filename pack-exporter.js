import { createZip } from "./zip.js";

const PACK_FORMATS = {
  "1.20.4": { data: 18, assets: 22 },
  "1.21.1": { data: 48, assets: 34 }
};

export function packKindForPath(path) {
  if (path.startsWith("data/")) return "data";
  if (path.startsWith("assets/")) return "assets";
  return "";
}

export function defaultPackFormat(version, kind) {
  return PACK_FORMATS[version]?.[kind] || (kind === "assets" ? 34 : 48);
}

function validateArchivePath(path) {
  if (!packKindForPath(path) || !path.endsWith(".json")) throw new Error("Output path must begin with data/ or assets/ and end with .json");
  const segments = path.replace(/\\/g, "/").split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) throw new Error("Output path contains an invalid archive segment");
}

function safeName(value) {
  return String(value || "minecraft-pack").trim().replace(/[\\/:*?"<>|]/g, "_") || "minecraft-pack";
}

function download(blob, filename) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 500);
}

export function buildPackEntries({ path, data, name, description, version, packFormat }) {
  validateArchivePath(path);
  const kind = packKindForPath(path);
  const format = Number.isInteger(packFormat) && packFormat > 0 ? packFormat : defaultPackFormat(version, kind);
  const packMeta = `${JSON.stringify({ pack: { pack_format: format, description: description || name || "Minecraft pack" } }, null, 2)}\n`;
  const json = `${JSON.stringify(data, null, 2)}\n`;
  return { kind, entries: { "pack.mcmeta": packMeta, [path]: json } };
}

export function exportPack(options) {
  const { kind, entries } = buildPackEntries(options);
  download(createZip(entries), `${safeName(options.name)}-${kind === "data" ? "datapack" : "resourcepack"}.zip`);
  return kind;
}
