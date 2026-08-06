---
name: generate-datapack-schema
description: Generate server-owned JSON Schema files for Datapack Schema Studio from Minecraft, mod, or datapack source code. Use when converting serialized code or documentation into a Schema under schemas/ and an entry in schemas/index.txt.
---

# Generate Datapack Schema

Create one Schema JSON object for Datapack Schema Studio. Analyze the supplied Minecraft, mod, or datapack code and model the JSON that is actually serialized.

## Output Contract

Return one valid JSON object only unless the caller explicitly requests a file edit. Do not include Markdown or frontend code.

Use supported JSON Schema keywords only where needed:

`id`, `title`, `description`, `type`, `default`, `required`, `properties`, `additionalProperties`, `items`, `enum`, `minimum`, `maximum`, and `pattern`.

Use these editor extensions only:

- `$version` on the root: target Minecraft/mod/data format version, as one version string or an array of version strings when the same structure applies to multiple versions.
- `$title` on the root or a nested schema node: localized display-name map, such as `{ "en_us": "Loot table", "zh_cn": "战利品表" }`.
- `$description` on the root or a nested schema node: localized description map using the same language keys.
- `$registry` on the root: registry ID for documents described by the Schema.
- `$registry` on an identifier/string field: registry used for editor completion.
- `$path` on the root: output template with exactly one `<namespace>` and one `<path>`.
- `$type` on the root: generic root type ID in `$types`.
- `$type` in a field or `items`: reference to a reusable type in root `$types`.
- `$suggstion: true` next to `enum`: values are suggestions and custom input is permitted. Preserve this spelling.
- `$variants` on an object schema: map discriminator `type` values to per-type object schema fragments.

## Construction Rules

1. Set a stable lowercase kebab-case `id`, concise root `title`, exact `$version`, and `$title` / `$description` maps on every schema node that represents a field, reusable type, array item, additional property, or variant. Use a version array only when the same structure applies to every listed version. Provide at least `en_us` and `zh_cn` in every localized map. Keep `title` / `description` as plain-text fallbacks for older editor versions or missing languages. The `id` + `$version` set must be unique in the catalog.
2. Set `$path` to a valid pack-relative JSON destination. Use `data/<namespace>/.../<path>.json` for datapack content and `assets/<namespace>/.../<path>.json` for resource pack content.
3. Require `$path` to end in `.json` and contain the literal `<namespace>` and `<path>` placeholders exactly once each.
4. Model only serialized JSON fields. Do not expose Java implementation details, codecs, or runtime-only fields.
5. Put every required serialized property in `required`; provide a useful `default` whenever one is known.
6. Put reused or polymorphic object shapes in root `$types` and reference them with `$type`.
7. For discriminator-dispatched codecs, keep shared fields on the base object and put fields belonging to a concrete `type` in `$variants["namespace:type"].properties`.
8. Add field `$registry` only when the referenced Minecraft registry is known.
9. Use strict `enum` for closed constants. Add `$suggstion: true` for extensible IDs or mod-provided variants.
10. Avoid unsupported keywords including `$ref`, `allOf`, `oneOf`, and `if`/`then`.
11. Keep descriptions concise and useful to datapack authors.

## Catalog Placement

Save the result as a JSON file under `schemas/`; subfolders such as `schemas/mods/example/` are supported. Add its relative path as a non-comment line in `schemas/index.txt`. The browser preserves that folder path and exposes it as a home-page filter. The browser loads this server-owned catalog; do not add Schema definitions to frontend JavaScript or localStorage.

Validate the result against [SCHEMA_FORMAT.md](../../SCHEMA_FORMAT.md) before publishing.

After creating or regenerating files, run `node tools/localize-schemas.mjs` to fill in missing localized node metadata. Review generated Chinese wording for mod-specific terms before publishing.
