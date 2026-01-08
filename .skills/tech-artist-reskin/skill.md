# Tech Artist: Reskin Game

Fully automated game re-skinning orchestrator. Generates all visual assets for a new theme, extracts colors, integrates into the game, and validates the build.

**Global skill:** Works with any project via `.asset-gen-config.json` configuration file.

## Usage

```
/reskin <theme_name> <theme_description>
```

**Parameters:**
- `theme_name`: Theme identifier (e.g., "cyberpunk", "medieval")
- `theme_description`: Comprehensive theme aesthetic and style description

## Workflow

1. **Load Configuration** - Read `.asset-gen-config.json` for project settings
2. **Initialization** - Validate inputs, create theme and temp folders
3. **Asset Generation** - Generate all assets in configured order (hero asset first)
4. **Color Extraction** - Vision-based intelligent palette extraction
5. **Integration** - Save assets and palette to theme folder
6. **Theme Switch** - Update project config file to use new theme
7. **Build Validation** - Run build, check size, verify success
8. **Success Report** - Summary with file sizes and next steps

## Configuration

Uses `.asset-gen-config.json` from project root:

```json
{
  "output": {
    "themeFolder": "public/assets/{themeName}/",
    "tempFolder": "temp/{themeName}/",
    "configFile": "src/config/GameConfig.ts",
    "configUpdatePattern": "CURRENT_THEME: '{themeName}'"
  },
  "workflow": {
    "generationOrder": ["block-texture", "background", "lock-overlay", "arrow-icon", "currency-icon", "win-icon", "logo"],
    "heroAsset": "block-texture"
  },
  "palette": {
    "filename": "palette.json",
    "visionBased": true,
    "extractionStrategy": { /* vision prompts */ }
  }
}
```

## Implementation

### Phase 1: Initialization

```typescript
const config = JSON.parse(await readFile('.asset-gen-config.json'));

// Validate theme name/description
// Create folders: config.output.themeFolder, config.output.tempFolder
// Check dependencies: Replicate MCP, Sharp library
```

### Phase 2: Asset Generation

```typescript
const assetTypes = config.workflow.generationOrder;
const heroAsset = config.workflow.heroAsset;

// Generate hero asset first (defines theme material/atmosphere)
await generateAsset(heroAsset, themeName, themeDescription);

// Generate remaining assets (some with style reference to hero asset)
for (const assetType of assetTypes.filter(a => a !== heroAsset)) {
  await generateAsset(assetType, themeName, themeDescription);
}
```

**Style Reference Strategy:**
- Hero asset (e.g., block-texture): Text-only generation, no style reference
- Background & overlays: Use hero asset as style reference (prompt_strength: 0.7)
- Icons: Text-only generation (simplicity required)

### Phase 3: Color Extraction (Vision-Based)

```typescript
// Analyze hero asset for base palette
const blockAnalysis = await claudeVision({
  image: blockTextureBuffer,
  prompt: config.palette.extractionStrategy.blockTexture.prompt
    .replace(/{themeName}/g, themeName)
    .replace(/{themeDescription}/g, themeDescription)
});
// Returns: { blockDefault, background, arrowColor, lockedColor }

// Analyze accent asset for emissive color
const accentAnalysis = await claudeVision({
  image: lockOverlayBuffer,
  prompt: config.palette.extractionStrategy.lockOverlay.prompt
    .replace(/{themeName}/g, themeName)
});
// Returns: { keyColor, reasoning }

// Generate CSS palette
const cssColors = await claudeVision({
  images: [blockTextureBuffer, lockOverlayBuffer],
  prompt: config.palette.extractionStrategy.cssColors.prompt
    .replace(/{themeName}/g, themeName)
});
// Returns: { headerBg, currencyContainer, bgBlue, darkBlue, gold, green, greenDark }

// Combine into palette.json
const palette = {
  name: themeName,
  version: "1.0.0",
  babylon: {
    blockDefault: normalize(blockAnalysis.blockDefault),
    arrowColor: normalize(blockAnalysis.arrowColor),
    background: normalize(blockAnalysis.background),
    keyColor: normalize(accentAnalysis.keyColor),
    keyEmissive: normalize(boostSaturation(accentAnalysis.keyColor, 1.5)),
    lockedColor: normalize(blockAnalysis.lockedColor)
  },
  css: cssColors
};

await writeFile(`${tempFolder}/palette.json`, JSON.stringify(palette, null, 2));
```

**Why vision-based extraction:**
- ✅ Semantic understanding of aesthetically important colors
- ✅ Context-aware decisions (neon blue pops on dark backgrounds)
- ✅ Avoids artifacts and edge cases
- ✅ Simpler implementation than pixel sampling algorithms

### Phase 4: Integration

```typescript
// Copy all assets from temp to theme folder
const themeFolder = config.output.themeFolder.replace('{themeName}', themeName);
await copyDirectory(tempFolder, themeFolder);

// Update project config file
const configFile = config.output.configFile;
const pattern = config.output.configUpdatePattern.replace('{themeName}', themeName);
await updateConfigFile(configFile, pattern);
```

### Phase 5: Build Validation

```typescript
// Run build command (project-specific)
await runBuildCommand();

// Validate
const bundleSize = await getBundleSize('dist/');
const maxSize = config.constraints.totalBundleSize;

if (bundleSize > maxSize) {
  // Compress assets more aggressively or reduce dimensions
  // Retry build
}

// Check for errors
```

### Phase 6: Success Report

```typescript
// Generate report with:
// - Asset list with sizes
// - Color palette summary
// - Vision critique results
// - Build validation status
// - Next steps for testing/deployment
```

## Color Palette Schema

```json
{
  "name": "theme-name",
  "version": "1.0.0",
  "babylon": {
    "blockDefault": [r, g, b],        // RGB normalized 0-1
    "arrowColor": [r, g, b],
    "background": [r, g, b, a],       // RGBA normalized 0-1
    "keyColor": [r, g, b],
    "keyEmissive": [r, g, b],
    "lockedColor": [r, g, b]
  },
  "css": {
    "headerBg": "#hex",
    "currencyContainer": "#hex",
    "bgBlue": "#hex",
    "darkBlue": "#hex",
    "gold": "#hex",
    "green": "#hex",
    "greenDark": "#hex"
  }
}
```

## Dependencies

- Replicate MCP server (`.mcp.json`)
- Sharp library for image processing
- Claude vision API
- Project-specific build tools

## Error Handling

### Build Fails
- Rollback theme switch in config file
- Keep generated assets in temp/ for debugging
- Report error details

### Bundle Size Exceeds Limit
- Compress assets (reduce JPEG quality 85% → 70%)
- Retry build
- If still over, recommend dimension reduction

### Asset Generation Fails
- Continue with remaining assets
- Flag failed assets for manual generation
- Complete partial theme integration

## Setup for New Project

1. Copy `.asset-gen-config.json` template to project root
2. Customize configuration:
   - Define all asset types needed
   - Set output paths for your project structure
   - Configure theme config file update pattern
   - Define palette structure for your engine/framework
   - Set build constraints and validation rules
3. Ensure dependencies installed
4. Test: `/reskin test "test theme for validation"`

---

**Version:** 2.0.0 (Project-Agnostic)
**Updated:** 2026-01-08
