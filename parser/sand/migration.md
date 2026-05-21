# Migration: `guid` → `instanceGuid` + `typeGuid`

## Summary

The parser previously used a single `guid` field that actually held the **InstanceGuid** value. This migration splits it into two semantically distinct fields:
- **`typeGuid`** — the GUID from the Object chunk (identifies the component *type* definition)
- **`instanceGuid`** — the GUID from the Container chunk (identifies this specific *instance*)

## Type Changes (`src/types.ts`)

### Component interface (before)
```ts
guid: string; // Original InstanceGuid
```

### Component interface (after)
```ts
typeGuid: string;      // Type GUID (from Object chunk)
instanceGuid: string;   // Instance GUID (from Container chunk)
```

### InputPort / OutputPort interfaces (before)
```ts
guid: string;
```

### InputPort / OutputPort interfaces (after)
```ts
instanceGuid: string;
```

## Parser Changes (`src/parser.ts`)

| Location | Before | After |
|----------|--------|-------|
| `parseParamChunk()` port object | `guid` | `instanceGuid` |
| `ParsedComponent` interface | `guid: string` | `instanceGuid: string` |
| `parseComponent()` variable | `const guid = items.GUID` | `const typeGuid = items.GUID` |
| `parseComponent()` fallback | `\|\| guid` | `\|\| typeGuid` |
| `parseComponent()` component object | `guid: instanceGuid` | `typeGuid, instanceGuid: instanceGuid` |
| Synthetic input port | `guid: instanceGuid` | `instanceGuid: instanceGuid` |
| Synthetic output port | `guid: instanceGuid` | `instanceGuid: instanceGuid` |
| Return statement | `guid: instanceGuid` | `instanceGuid: instanceGuid` |
| Wire resolution maps | `parsed.guid`, `outputPort.guid`, `input.guid` | `parsed.instanceGuid`, `outputPort.instanceGuid`, `input.instanceGuid` |

## Consumer Changes

Any code accessing `.guid` on `Component`, `InputPort`, or `OutputPort` must be updated:

```ts
// Before
comp.guid
port.guid

// After
comp.typeGuid        // type definition GUID
comp.instanceGuid    // instance-specific GUID
port.instanceGuid    // port instance GUID
```

Example from `src/app/hooks/use-script-metrics.ts`:
```ts
// Before
guidSet.add(comp.guid);

// After
guidSet.add(comp.instanceGuid);
```

## JSON Output Diff

```json
// Before
{
  "id": "Area",
  "type": "Area",
  "guid": "bfd08430-973c-49e8-adab-04487445d763",
  "inputs": {
    "g": { "nick": "G", "guid": "3a6e01b6-..." }
  },
  "outputs": {
    "a": { "nick": "A", "guid": "90103901-..." }
  }
}

// After
{
  "id": "Area",
  "type": "Area",
  "typeGuid": "abc12345-...",       // NEW: from Object chunk
  "instanceGuid": "bfd08430-...",    // RENAMED: was "guid"
  "inputs": {
    "g": { "nick": "G", "instanceGuid": "3a6e01b6-..." }  // RENAMED
  },
  "outputs": {
    "a": { "nick": "A", "instanceGuid": "90103901-..." }  // RENAMED
  }
}
```

## Migration Checklist for Other Codebases

1. **Update type/interface definitions** — rename `guid` to `instanceGuid`, add `typeGuid` to component types
2. **Update parser extraction** — split `items.GUID` into `typeGuid` and keep `items.InstanceGuid` as `instanceGuid`
3. **Update all field assignments** — search/replace `guid:` → `instanceGuid:` in object literals
4. **Update lookup/map usage** — any code reading `.guid` for map keys or wire resolution
5. **Update consumer code** — any external code accessing `.guid` on parsed objects
6. **Regenerate test fixtures** — `_optimized.json` files will have new field names
7. **Run typecheck** — catch any remaining references
