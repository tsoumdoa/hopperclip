# Parser sandbox

Optional Bun scripts for inspecting the shared parser against sample definitions.
Run these commands from `parser/sand`:

```bash
bun install
bun run parse xmls/brep-area-Wire.xml /tmp/brep-area.json
bun run parse --visuals xmls/brep-area-Wire.xml /tmp/brep-area-visuals.json
bun run batch
bun run batch-visuals
```

Without an output path, the single-file command writes `<name>_optimized.json`
next to its input. Batch commands do the same for every matching XML file and
may overwrite generated output. The XML samples are the inputs; generated JSON
is for inspection, not a separate schema specification.

For current fields and integration guidance, see [the parser notes](../README.md).
