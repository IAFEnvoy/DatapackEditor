# Datapack Schema Studio

无框架、纯前端的 Minecraft 数据包 JSON 编辑器。表单由服务端发布的 JSON Schema 动态生成；Schema 不在浏览器中编辑或保存。

## 服务端 Schema 配置

所有 Schema 位于 `schemas/`，由 `schemas/index.txt` 索引。索引文件每个非空且不以 `#` 开头的行，均表示相对于索引文件的一个 Schema JSON 路径。

```text
# schemas/index.txt
loot-table-1.21.1.json
loot-table-1.20.4.json
recipe-1.21.1.json
```

发布或更新 Schema 的流程：

1. 在 `schemas/` 创建或更新 JSON Schema 文件。
2. 将其相对路径添加到 `schemas/index.txt`。
3. 确保每个 `id` + `$version` 组合唯一，并包含合法 `$path`。
4. 部署这些静态文件；用户刷新页面后会加载最新配置。

Schema 定义不会写入 localStorage。语言、主题、注册表索引、命名空间、内容路径及当前 JSON 编辑状态仍在浏览器本地保存。

## 导出 ZIP

点击顶部“导出 ZIP”会根据当前 Schema 的 `$path` 自动选择包类型，并生成一个包含当前 JSON 与 `pack.mcmeta` 的 ZIP：

- `data/<namespace>/.../<path>.json`：生成数据包 ZIP。
- `assets/<namespace>/.../<path>.json`：生成资源包 ZIP。

导出对话框可设置包名称、描述和 `pack_format`。内置 Schema 的默认值适配 1.20.4 与 1.21.1；其他版本应在导出时按目标 Minecraft 版本填写正确的格式号。

渲染器注册表位于 `app.js` 的 `builders`：每个 Schema 节点先计算 builder id，再调用对应 DOM builder 生成字段。新增控件时使用 `registerBuilder(id, builder)`，无需修改编辑器主循环。

- Schema 格式与扩展：[SCHEMA_FORMAT.md](SCHEMA_FORMAT.md)
- 从代码生成 Schema 的 AI Skill：[skills/generate-datapack-schema/SKILL.md](skills/generate-datapack-schema/SKILL.md)
