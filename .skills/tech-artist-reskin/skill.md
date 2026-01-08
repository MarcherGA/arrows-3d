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
4. **Post-Processing** - Resize, center, and process all assets using image-resize-helper.js
5. **Color Extraction** - Vision-based intelligent palette extraction
6. **Integration** - Save assets and palette to theme folder
7. **Theme Switch** - Update project config file to use new theme
8. **Cleanup** - Remove temp folder after successful integration
9. **Build Validation** - Run build, check size, verify success
10. **Success Report** - Summary with file sizes and next steps

## Configuration

Uses `.asset-gen-config.json` from project root:

```json
{
  "output": {
    "themeFolder": "public/assets/{themeName}/",
    "tempFolder": "temp/{themeName}/",
    "configFile": "src/config/GameConfig.ts",
    "configUpdatePattern": "CURRENT_THEME: '{themeName}'",
    "cleanupTempFolder": true
  },
  "postProcessing": {
    "resizeHelper": ".skills/tech-artist-generate-asset/image-resize-helper.js",
    "resizeStrategy": {
      "icons": "contain-centered",
      "textures": "cover-crop",
      "backgrounds": "cover-crop"
    }
  },
  "workflow": {
    "generationOrder": ["block-texture", "background", "lock-overlay", "arrow-icon", "currency-icon", "piggy-bank", "logo"],
    "heroAsset": "block-texture",
    "postGeneration": {
      "resizeAllAssets": true,
      "cleanupTempFolder": true
    }
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
// Check dependencies: Replicate MCP, Sharp library, resize helper
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

### Phase 3: Post-Processing

**CRITICAL:** All assets must be resized to exact dimensions specified in config.

```typescript
// Use image-resize-helper.js from tech-artist-generate-asset for all post-processing
const resizeHelper = config.postProcessing.resizeHelper;

for (const [assetType, assetConfig] of Object.entries(config.assetTypes)) {
  const inputPath = `${tempFolder}/${assetConfig.filename}`;
  const { width, height } = assetConfig.dimensions;

  // Determine strategy based on asset type
  let strategy = 'contain-centered'; // Default for icons
  if (assetConfig.filename.includes('texture') || assetConfig.filename.includes('background')) {
    strategy = 'cover-crop'; // For textures and backgrounds - NO stretching
  }

  // Check postProcessing for explicit strategy
  if (assetConfig.postProcessing) {
    for (const step of assetConfig.postProcessing) {
      if (step.includes('contain-centered')) strategy = 'contain-centered';
      if (step.includes('cover-crop')) strategy = 'cover-crop';
      if (step.includes('Center in frame')) {
        // Center the icon first
        await exec(`node ${resizeHelper} --center ${inputPath} ${inputPath} ${width}`);
      }
      if (step.includes('White color removal')) {
        await exec(`node ${resizeHelper} --remove-white ${inputPath} ${inputPath} 240`);
      }
    }
  }

  // Final resize to exact dimensions
  await exec(`node ${resizeHelper} ${inputPath} ${inputPath} ${width} ${height} ${strategy}`);
}
```

**Resize Strategies:**
- `contain-centered`: Resize to fit, center with transparent padding (icons)
- `cover-crop`: Resize to cover, crop excess from center (textures/backgrounds)
- `stretch`: Resize to exact dimensions (not recommended, may distort)

### Phase 4: Color Extraction (Vision-Based)

```typescript
// Analyze hero asset for base palette
const blockAnalysis = await claudeVision({
  image: blockTextureBuffer,
  prompt: config.palette.extractionStrategy.blockTexture.prompt
    .replace(/{themeName}/g, themeName)
    .replace(/{themeDescription}/g, themeDescription)
});
// Returns: { blockDefault, background, arrowColor, lockedColor, lockedArrowColor }

// Analyze accent asset for emissive color
const accentAnalysis = await claudeVision({
  image: lockOverlayBuffer,
  prompt: config.palette.extractionStrategy.lockOverlay.prompt
    .replace(/{themeName}/g, themeName)
});
// Returns: { keyColor, reasoning }

// Generate CSS palette with theme-appropriate accent colors
const cssColors = await claudeVision({
  images: [blockTextureBuffer, lockOverlayBuffer],
  prompt: config.palette.extractionStrategy.cssColors.prompt
    .replace(/{themeName}/g, themeName)
});
// Returns: { headerBg, currencyContainer, currencyPill, bgBlue, darkBlue,
//            accent, accentDark, buttonPrimary, buttonPrimaryDark,
//            buttonSecondary, buttonSecondaryDark }

// Combine into palette.json
const palette = {
  name: themeName,
  version: "1.1.0",
  babylon: {
    blockDefault: normalize(blockAnalysis.blockDefault),
    arrowColor: normalize(blockAnalysis.arrowColor),
    keyArrowColor: [0.05, 0.05, 0.1], // Dark for visibility on key blocks
    lockedArrowColor: normalize(blockAnalysis.lockedArrowColor),
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
- Semantic understanding of aesthetically important colors
- Context-aware decisions (neon blue pops on dark backgrounds)
- Avoids artifacts and edge cases
- Simpler implementation than pixel sampling algorithms

### Phase 5: Integration

```typescript
// Copy all assets from temp to theme folder
const themeFolder = config.output.themeFolder.replace('{themeName}', themeName);
await copyDirectory(tempFolder, themeFolder);

// Update project config file
const configFile = config.output.configFile;
const pattern = config.output.configUpdatePattern.replace('{themeName}', themeName);
await updateConfigFile(configFile, pattern);
```

### Phase 6: Cleanup

```typescript
// Remove temp folder after successful integration
if (config.output.cleanupTempFolder || config.workflow.postGeneration?.cleanupTempFolder) {
  await removeDirectory(tempFolder);
  console.log(`Cleaned up temp folder: ${tempFolder}`);
}
```

**Important:** If the workflow is interrupted or fails, the temp folder is preserved for debugging.

### Phase 7: Build Validation

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

### Phase 8: Success Report

```typescript
// Generate report with:
// - Asset list with sizes
// - Color palette summary
// - Vision critique results
// - Build validation status
// - Next steps for testing/deployment
```

## Color Palette Schema (v1.1.0)

```json
{
  "name": "theme-name",
  "version": "1.1.0",
  "babylon": {
    "blockDefault": [r, g, b],        // RGB normalized 0-1
    "arrowColor": [r, g, b],          // MUST contrast with block texture
    "keyArrowColor": [r, g, b],       // Dark, visible on key blocks
    "lockedArrowColor": [r, g, b],    // Visible on locked blocks
    "background": [r, g, b, a],       // RGBA normalized 0-1
    "keyColor": [r, g, b],
    "keyEmissive": [r, g, b],
    "lockedColor": [r, g, b]
  },
  "css": {
    "headerBg": "#hex",
    "currencyContainer": "#hex",
    "currencyPill": "#hex",           // Pill background in overlay
    "bgBlue": "#hex",
    "darkBlue": "#hex",
    "accent": "#hex",                 // Theme accent (NOT always gold!)
    "accentDark": "#hex",
    "buttonPrimary": "#hex",          // Primary button color
    "buttonPrimaryDark": "#hex",
    "buttonSecondary": "#hex",        // Secondary button color
    "buttonSecondaryDark": "#hex"
  }
}
```

**Theme-Specific Accent Colors:**
- Cyberpunk: Neon pink/magenta (#ff00ff) or cyan (#00d9ff)
- Medieval: Gold (#f4d34d)
- Nature: Green (#7dc001)
- Ocean: Blue (#3266d5)

## Asset Quality Requirements

### Icons (arrow, currency, piggy-bank, logo)
- MUST be CENTERED in frame with equal padding
- Transparent background (no halos)
- Simple, readable at small sizes

### Block Texture
- SEAMLESS TILEABLE (wraps on all edges)
- UNIFORM pattern (looks good when stretched non-uniformly)
- Avoid strong directional patterns

### Lock Overlay
- NO WHITE or near-white colors inside
- CENTERED in frame
- Fully transparent background

### Background
- Non-distracting
- Cover-crop resize (no stretching)
- Matches theme atmosphere

## Dependencies

- Replicate MCP server (`.mcp.json`)
- Sharp library for image processing
- Claude vision API
- Project-specific build tools
- image-resize-helper.js utility (from tech-artist-generate-asset)

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

### Interrupted Workflow
- Temp folder is preserved for inspection
- Manual cleanup required: `rm -rf temp/{themeName}`

## Setup for New Project

1. Copy `.asset-gen-config.json` template to project root
2. Ensure `image-resize-helper.js` is in `.skills/tech-artist-generate-asset/` folder
3. Customize configuration:
   - Define all asset types needed
   - Set output paths for your project structure
   - Configure theme config file update pattern
   - Define palette structure for your engine/framework
   - Set build constraints and validation rules
4. Ensure dependencies installed (`npm install sharp`)
5. Test: `/reskin test "test theme for validation"`

---

**Version:** 2.1.0 (Enhanced Post-Processing)
**Updated:** 2026-01-08
