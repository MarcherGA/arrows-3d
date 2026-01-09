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
4. **Post-Processing** - Resize, center, and process all assets using Python helper scripts
5. **Post-Processing Validation** - Visually verify EACH operation succeeded (NEW)
6. **Color Extraction** - Use extract-colors.py for intelligent palette extraction
7. **Integration** - Save assets and palette to theme folder
8. **Theme Switch** - Update project config file to use new theme
9. **Cleanup** - Remove temp folder after successful integration
10. **Build Validation** - Run build, check size, verify success
11. **Success Report** - Summary with file sizes and next steps

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
    "resizeHelper": ".skills/tech-artist-generate-asset/image-resize-helper.py",
    "resizeStrategy": {
      "icons": "contain-centered",
      "textures": "cover-crop",
      "backgrounds": "cover-crop"
    }
  },
  "dependencies": {
    "colorExtractionScript": {
      "scriptPath": ".skills/tech-artist-reskin/extract-colors.py",
      "fallback": "Use vision-based extraction"
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

```bash
# Use Python helper scripts from tech-artist-generate-asset for all post-processing
resizeHelper="python .skills/tech-artist-generate-asset/image-resize-helper.py"
postProcess="python .skills/tech-artist-generate-asset/post-process.py"

# Option 1: Use post-process.py for complete pipeline (recommended)
for assetType in "${assetTypes[@]}"; do
  inputPath="${tempFolder}/${assetType}-raw.webp"
  outputPath="${tempFolder}/${assetType}.${format}"

  # Automated post-processing (background removal, alpha erosion, compression)
  $postProcess "$inputPath" "$outputPath" "$assetType"

  # CRITICAL: Vision validation after post-processing (NEW)
  # Do NOT assume the operation succeeded - visually verify!
done

# Option 2: Manual steps for more control
for assetType in "${assetTypes[@]}"; do
  inputPath="${tempFolder}/${assetType}-raw.webp"

  # Determine strategy based on asset type
  strategy="contain-centered"  # Default for icons
  if [[ "$assetType" == *"texture"* || "$assetType" == *"background"* ]]; then
    strategy="cover-crop"  # For textures and backgrounds - NO stretching
  fi

  # Apply post-processing steps from config
  if [[ "$assetType" == *"icon"* || "$assetType" == *"overlay"* || "$assetType" == "logo" ]]; then
    # 1. Background removal
    $resizeHelper --remove-white "$inputPath" "${inputPath%.webp}-nobg.png" 240

    # 2. Center in frame
    $resizeHelper --center "${inputPath%.webp}-nobg.png" "${inputPath%.webp}-centered.png" "$width" 0.1

    # 3. Alpha erosion (remove halos)
    $resizeHelper --erode "${inputPath%.webp}-centered.png" "${inputPath%.webp}-clean.png" 1

    inputPath="${inputPath%.webp}-clean.png"
  fi

  # Final resize to exact dimensions
  $resizeHelper "$inputPath" "${tempFolder}/${assetType}.${format}" "$width" "$height" "$strategy"
done
```

**Resize Strategies:**
- `contain-centered`: Resize to fit, center with transparent padding (icons)
- `cover-crop`: Resize to cover, crop excess from center (textures/backgrounds)
- `stretch`: Resize to exact dimensions (not recommended, may distort)

### Phase 3.5: Post-Processing Validation (CRITICAL - NEW)

**IMPORTANT:** After EACH post-processing operation, use Claude vision to validate that the asset still meets all requirements. Do NOT assume external scripts succeeded without visual confirmation.

```typescript
// After each post-processing step (background removal, resize, erosion, etc.)
for (const assetType of assetTypes) {
  const processedImageBuffer = await readFile(`${tempFolder}/${assetType}.${format}`);
  const assetSpec = config.assetTypes[assetType];

  const validationResult = await claudeVision({
    image: processedImageBuffer,
    prompt: `
      Analyze this ${assetType} asset after post-processing operations:

      1. Was the post-processing successful?
      2. Are there any artifacts or quality issues introduced by external tools?
      3. Does it still meet ALL requirements from the original critiquePrompt?
      4. Specific post-processing checks:
         - For background removal: Is background fully transparent? Any white halos or artifacts?
         - For centering: Is asset centered with equal padding on all sides?
         - For alpha erosion: Are edges clean but not over-eroded?
         - For resize: Are dimensions correct? Any distortion or stretching?
         - For compression: Is quality acceptable? No excessive artifacts?

      Original asset requirements:
      ${assetSpec.critiquePrompt}

      Respond with PASS or FAIL and specific reasons for the decision.
    `
  });

  if (!validationResult.includes('PASS')) {
    console.log(`Post-processing validation FAILED for ${assetType}: ${validationResult}`);

    // Iteration logic (counts towards maxIterations):
    // - Try different post-processing parameters
    // - Re-run the operation with adjusted settings
    // - If all iterations exhausted, flag for manual review

    // Example: Retry with less aggressive alpha erosion
    if (currentIteration < config.workflow.maxIterations) {
      currentIteration++;
      // Retry post-processing with adjusted parameters
    } else {
      console.error(`Max iterations (${config.workflow.maxIterations}) reached for ${assetType}`);
      // Flag for manual review
    }
  }
}
```

**Why this is critical:**
- External Python scripts can fail silently or produce unexpected results
- Background removal may leave white halos, artifacts, or remove wanted elements
- Resize operations can introduce distortion, misalignment, or incorrect dimensions
- Alpha erosion can over-erode edges and damage the asset quality
- Centering operations may not achieve equal padding as required
- Compression may introduce visible artifacts
- Vision validation catches these issues BEFORE integration into the game

**Iteration Strategy:**
- Post-processing validation failures count towards the `maxIterations` limit (now 3)
- Each iteration can try different post-processing parameters
- After max iterations, flag asset for manual review rather than proceeding with broken asset

### Phase 4: Color Extraction

**Option 1: Use extract-colors.py (automated pixel sampling)**

```bash
# Extract colors from generated assets using Python script
python .skills/tech-artist-reskin/extract-colors.py \
  "${tempFolder}/block-texture.jpg" \
  "${tempFolder}/lock-overlay.png" \
  "${themeName}"

# This generates palette.json with:
# - Babylon.js colors (RGB normalized 0-1) from pixel sampling
# - CSS colors (hex format) derived from sampled colors
# - Automatic saturation boost for emissive glow
```

**Option 2: Vision-based extraction (recommended for better results)**

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

**Why vision-based extraction is recommended:**
- Semantic understanding of aesthetically important colors
- Context-aware decisions (neon blue pops on dark backgrounds)
- Avoids artifacts and edge cases
- Better results than blind pixel sampling

**Fallback to extract-colors.py if:**
- Vision API unavailable or rate limited
- Quick iteration needed without AI analysis
- Simple themes with straightforward color palettes

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

**Required:**
- Replicate MCP server (`.mcp.json` with `REPLICATE_API_TOKEN`)
- Python 3.8+ with Pillow and numpy
- Claude vision API (optional, for better palette extraction)
- Project-specific build tools

**Python Helper Scripts:**
- `image-resize-helper.py` (from tech-artist-generate-asset) - Image operations
- `post-process.py` (from tech-artist-generate-asset) - Complete post-processing pipeline
- `remove-bg.py` (from tech-artist-generate-asset) - Background removal
- `extract-colors.py` (from tech-artist-reskin) - Color palette extraction

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

1. **Copy skill folders** to project (or reference globally)
   ```bash
   cp -r .skills/tech-artist-generate-asset /path/to/new-project/.skills/
   cp -r .skills/tech-artist-reskin /path/to/new-project/.skills/
   ```

2. **Install Python dependencies**
   ```bash
   cd .skills/tech-artist-generate-asset
   pip install -r requirements.txt
   cd ../tech-artist-reskin
   pip install -r requirements.txt
   ```

3. **Copy config template** to project root
   ```bash
   cp .asset-gen-config.json /path/to/new-project/
   ```

4. **Customize configuration**:
   - Define all asset types needed
   - Set output paths for your project structure
   - Configure theme config file update pattern
   - Define palette structure for your engine/framework
   - Set build constraints and validation rules
   - Update script paths to reference Python helpers

5. **Configure Replicate MCP** in project's `.mcp.json`

6. **Test reskin workflow**
   ```bash
   /reskin test "test theme for validation"
   ```

---

**Version:** 2.1.0 (Enhanced Post-Processing)
**Updated:** 2026-01-08
