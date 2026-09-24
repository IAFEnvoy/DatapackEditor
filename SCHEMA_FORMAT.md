# Datapack Schema Studio Schema Format

Schema documents use JSON Schema draft-style keywords (`type`, `title`, `description`, `default`, `required`, `properties`, `items`, `enum`, `minimum`, `maximum`, `pattern`, `oneOf`) plus the extensions below. The editor intentionally accepts only the structural subset it needs, so a schema remains portable JSON.

## Server catalog

Schema configuration is server-owned. The browser loads `schemas/index.txt` and then fetches every JSON file listed in it. Each non-empty, non-comment line is a path relative to `schemas/index.txt`.

```text
# schemas/index.txt
vanilla/loot-table-1.21.1.json
vanilla/loot-table-1.20.4.json
mods/origins/power-1.21.1.json
```

Deploy a new schema or version by adding its JSON file under `schemas/` and adding its path to this index. Subdirectories are supported, and their relative path is retained as a front-end folder filter. The editor does not offer a Schema source editor and never saves Schema definitions in browser storage. Every indexed Schema must have a unique `id` + `$version` set.

### Origins NeoForge regeneration

`tools/generate-origins-neoforge-schema.mjs` is a build-time helper for the bundled Origins NeoForge 0.3.1 Power and Badge Schemas. It reads the Java registration classes and serialized Codec references, then rewrites `schemas/origins/origins-neoforge-power-1.21.1.json` and `schemas/origins/origins-neoforge-badge-1.21.1.json`. It is not loaded by the browser.

```powershell
node tools/generate-origins-neoforge-schema.mjs <origins-source-root>
```

The generated Schema contains all registered Power IDs, the seven Condition registries, the four Action registries, and the Badge types. Concrete Codec fields live in `$variants`, with `fieldOf(...)` fields marked required. Type-specific complex values not represented by a supported Codec remain available through `additionalProperties` and the JSON panel.

### MiXianTu regeneration

`tools/generate-mxt-schema.mjs` generates every `schemas/mxt/mxt-*.json` from the MiXianTu mod sources and rewrites the `mxt/` block of `schemas/index.txt`. It reads the Java the mod actually serializes, so the mod stays the only source of truth:

- registry paths come from `MxtResourceKeys`, documents from the registrations in `MxtDatapackRegistries`;
- a polymorphic family (a registry whose codecs dispatch on `type`) becomes one shared type whose `type` enum lists the registry's ids and whose `$variants` hold each concrete type's fields;
- every field is read from the `RecordCodecBuilder` component that serializes it, including the ones built through `MiscCodecs.pair`, codec factories such as `DescribedEntry.codec(...)`, `CombinedCodecs`, `Codec.either`, and the codec fields a type reuses from another one.

```powershell
node tools/generate-mxt-schema.mjs [path-to-MiXianTu]
node tools/check-mxt-schemas.mjs
```

Generated text uses `oneOf` for the unions the mod accepts (one value or a list, an entry id or a `#tag`, a typed object or its shorthand) and never emits `$ref`; a value read through a Java codec we cannot describe stays an open node, which the editor shows as free JSON. Run `check-mxt-schemas.mjs` afterwards: it verifies ids, output paths, `$type` resolution against the indexed libraries, variant dispatch enums, and the localized labels.

## Root shape

```json
{
  "id": "loot-table",
  "$title": { "en_us": "Loot table", "zh_cn": "战利品表" },
  "$description": { "en_us": "Vanilla loot table.", "zh_cn": "原版战利品表。" },
  "title": "Loot table",
  "$version": "1.21.1",
  "$registry": "minecraft:loot_table",
  "$path": "data/<namespace>/loot_tables/<path>.json",
  "type": "object",
  "required": ["type", "pools"],
  "properties": {},
  "$types": {}
}
```

`id` identifies a schema family. `$version` identifies the target Minecraft/mod/data format version within that family. It can be a version string or an array of version strings when one Schema structure applies to multiple versions. Multiple schemas may have the same `id` if their `$version` values differ; the editor exposes a version selector and loads the matching structure for the selected version. `$registry` on the root says that a document using this schema belongs to that registry. `$path` tells a datapack generator where to write the document. These are metadata fields, not fields written into the exported JSON.

## Extensions

| Keyword | Location | Meaning |
| --- | --- | --- |
| `$title` | Schema root and every nested schema node | Localized display names as a language-key-to-text object, for example `{ "en_us": "Loot table", "zh_cn": "战利品表" }`. The editor checks the active language first, then falls back to `title`. |
| `$description` | Schema root and every nested schema node | Localized help text as a language-key-to-text object. The editor checks the active language first, then falls back to `description`. |
| `$registry` | Schema root | The registry ID of documents described by this schema. |
| `$version` | Schema root | Version string or array of version strings for this schema variant, for example `"1.21.1"` or `["1.21.1", "26.1.2"]`. Schemas with the same `id` and different version sets are selectable variants. |
| `$path` | Schema root | Pack-relative output path template. It must be a JSON path rooted at `data/` or `assets/`, and contain exactly the `<namespace>` and `<path>` placeholders. |
| `$registry` | Identifier field | The registry whose indexed IDs are offered by the control. The field remains a string and can contain values not yet indexed. |
| `$type` | Schema root | ID of a generic type schema to use as the root shape. The matching schema lives in `$types`. |
| `$type` | Nested schema node | References a schema in the active schema's `$types` map. It can be used for `items`, a property, or `additionalProperties`. |
| `$library` | Schema root | Marks a versioned shared `$types` library. It is loaded for qualified type references but is not shown as a document template. |
| `$suggstion` | `enum` schema | When `true`, enum values are suggestions rendered with a datalist; custom text is allowed. The spelling is intentionally `suggstion` to match the requested extension. |
| `$variants` | Object schema | Maps the current `type` value to an object schema fragment. Its `properties` and `required` fields are merged into the base object while that type is selected. |
| `oneOf` | Any schema node | Lists alternative shapes. The editor selects an alternative from the current JSON value (`number`, `string`, `object`, or `array`); the first alternative is used when creating a new value. |

## Types and references

`$types` holds reusable local schemas. A node with `$type` merges the referenced schema with any keys on the node itself, so a reference can add a local title or default. Every field node, reusable type, array item, additional property, and variant must provide `$title` and `$description`; localized metadata takes precedence when its current language key exists. Run `node tools/localize-schemas.mjs` after a schema generation pass to fill any missing maps.

For types shared by multiple schemas, add a catalog entry with `$library: true`, a `$version`, and a `$types` object. Type libraries are loaded but are not shown as document templates. Reference one with a qualified `$type`, for example `"mxt-common#number_provider"`. The editor resolves the library whose version matches the active document schema.

```json
{
  "type": "array",
  "items": { "$type": "condition" },
  "$types": {
    "condition": {
      "type": "object",
      "required": ["condition"],
      "properties": { "condition": { "type": "string" } }
    }
  }
}
```

Supported field controls: `object`, `array`, `string`, `number`, `integer`, `boolean`, strict `enum`, suggestion `enum`, registry-backed strings, and a JSON fallback for unknown nodes. Object `additionalProperties` dynamically adds key/value entries.

## Type variants

Polymorphic Origins codecs use a `type` field to select the serialized shape. Put shared fields in the base object and type-specific fields in `$variants`; the editor updates the visible field list as the `type` value changes.

```json
{
  "type": "object",
  "properties": {
    "type": { "type": "string", "enum": ["demo:message", "demo:counter"], "$suggstion": true }
  },
  "$variants": {
    "demo:message": { "properties": { "message": { "type": "string" } } },
    "demo:counter": { "properties": { "amount": { "type": "integer", "default": 0 } } }
  }
}
```

## Registry index

The UI's registry index is browser-local data. Add entries manually with a registry ID and identifier. A field such as `{ "type": "string", "$registry": "minecraft:item" }` then offers the entries as completions. This keeps indexing separate from the JSON emitted for a datapack.

## Output paths

`$path` declares a generator destination relative to a Minecraft pack root. It must contain both literal placeholders exactly once:

- `<namespace>` is replaced with the namespace selected in the editor.
- `<path>` is replaced with the resource path selected in the editor. It can contain directories, such as `weapons/diamond`.

For example, with `$path` set to `data/<namespace>/loot_tables/<path>.json`, namespace `demo`, and path `weapons/diamond`, the resolved output destination is `data/demo/loot_tables/weapons/diamond.json`. A `data/` destination exports a datapack ZIP; an `assets/` destination exports a resource pack ZIP. The ZIP contains the current JSON at the resolved `$path` plus a generated `pack.mcmeta`. `$path` is Schema metadata only; it never appears in the edited or exported datapack JSON.

Resource pack schemas use the same placeholders, for example:

```json
"$path": "assets/<namespace>/lang/<path>.json"
```

## Example

```json
{
  "id": "custom-recipe",
  "$title": { "en_us": "Custom recipe", "zh_cn": "自定义配方" },
  "$description": { "en_us": "A custom crafting recipe.", "zh_cn": "一个自定义合成配方。" },
  "title": "Custom recipe",
  "$version": "1.21.1",
  "$registry": "minecraft:recipe",
  "$path": "data/<namespace>/recipe/<path>.json",
  "type": "object",
  "required": ["result"],
  "properties": {
    "result": { "type": "string", "$registry": "minecraft:item" },
    "category": { "type": "string", "enum": ["misc", "building"], "$suggstion": true }
  }
}
```
