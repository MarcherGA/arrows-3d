# Tech Artist: Generate Asset

Generate a single high-quality game asset using AI image generation with automatic quality validation and iteration.

**Global skill:** Works with any project via `.asset-gen-config.json` configuration file.

## Usage

```
/generate-asset <asset_type> <theme_name> <theme_description>
```

**Parameters:**
- `asset_type`: Asset type defined in `.asset-gen-config.json`
- `theme_name`: Theme identifier (e.g., "cyberpunk", "medieval")
- `theme_description`: Detailed theme aesthetic description

## Workflow

1. **Load Configuration** - Read `.asset-gen-config.json` for asset specs
2. **Generate Prompt** - Use template from config with theme variables replaced
3. **AI Generation** - Call Replicate with configured model and parameters
4. **Vision Critique** - Validate quality using critique prompt from config
5. **Iteration** - Retry up to `maxIterations` if critique fails **using the EXACT SAME PROMPT** (do not tweak or modify)
6. **Post-Processing** - Apply steps from config (background removal, erosion, compression)
7. **Post-Processing Validation** - Use vision to verify EACH operation succeeded (NEW)
8. **Final Validation** - Check size, format, dimensions, transparency
9. **Save** - Output to configured temp folder

## Configuration

Requires `.asset-gen-config.json` in project root:

```json
{
  "assetTypes": {
    "asset-name": {
      "filename": "asset.jpg",
      "dimensions": { "width": 512, "height": 512 },
      "format": "JPEG",
      "sizeTarget": "150KB",
      "model": "black-forest-labs/flux-1.1-pro",
      "promptTemplate": "...",
      "critiquePrompt": "...",
      "postProcessing": ["JPEG compression (quality 85%)"],
      "styleReference": null | { "asset": "hero-asset", "promptStrength": 0.7 }
    }
  },
  "output": {
    "themeFolder": "public/assets/{themeName}/",
    "tempFolder": "temp/{themeName}/"
  },
  "workflow": {
    "maxIterations": 3,
    "validation": { "fileSize": true, "dimensions": true, "format": true, "transparency": true, "visionCritique": true, "postProcessingValidation": true }
  }
}
```

## Implementation

### Load & Validate
```typescript
const config = JSON.parse(await readFile('.asset-gen-config.json'));
const assetSpec = config.assetTypes[assetType];
if (!assetSpec) throw new Error(`Unknown asset type: ${assetType}`);
```

### Generate Image
```typescript
const prompt = assetSpec.promptTemplate
  .replace(/{THEME_NAME}/g, themeName)
  .replace(/{THEME_DESCRIPTION}/g, themeDescription);

const input = {
  prompt,
  width: assetSpec.dimensions.width,
  height: assetSpec.dimensions.height,
  num_outputs: 1,
  output_format: assetSpec.format === 'JPEG' ? 'jpg' : 'png',
  ...(assetSpec.format === 'JPEG' && { output_quality: 85 }),
  ...(assetSpec.styleReference && heroAssetUrl && {
    image_prompt: heroAssetUrl,
    prompt_strength: assetSpec.styleReference.promptStrength
  })
};

const prediction = await replicatePredict(assetSpec.model, input);
```

### Vision Critique
```typescript
const critiquePrompt = assetSpec.critiquePrompt.replace(/{THEME_NAME}/g, themeName);
const critique = await claudeVision({ image: imageBuffer, prompt: critiquePrompt });
const passed = critique.includes('PASS');

// CRITICAL: If critique fails, retry with EXACT SAME PROMPT
// Do NOT tweak, modify, or "improve" the prompt based on critique feedback
// The AI needs multiple chances with the same seed, not prompt engineering
if (!passed && currentIteration < maxIterations) {
  currentIteration++;
  // Retry generation with EXACT SAME input parameters
  return await generateAsset(assetType, themeName, themeDescription, currentIteration);
}
```

### Post-Processing

Post-processing uses Python helper scripts from `.skills/tech-artist-generate-asset/`:

**Option 1: Use post-process.py (recommended)**
```bash
python .skills/tech-artist-generate-asset/post-process.py \
  temp/theme/asset-raw.webp \
  output/theme/asset.png \
  arrow-icon
```

**Option 2: Individual steps**
```bash
# 1. Background removal (for transparent assets)
python .skills/tech-artist-generate-asset/remove-bg.py \
  temp/theme/asset-raw.webp \
  temp/theme/asset-nobg.png \
  240

# 2. Image resizing (if needed)
python .skills/tech-artist-generate-asset/image-resize-helper.py \
  temp/theme/asset-nobg.png \
  output/theme/asset.png \
  256 256 contain-centered

# 3. Alpha erosion (remove white halos)
python .skills/tech-artist-generate-asset/image-resize-helper.py \
  --erode output/theme/asset.png output/theme/asset.png 1
```

### Post-Processing Validation (CRITICAL)

**IMPORTANT:** After EACH post-processing operation, use Claude vision to validate that the asset still meets requirements. Do NOT assume the operation succeeded without visual confirmation.

```typescript
// After each post-processing step (background removal, resize, erosion, etc.)
const validationResult = await claudeVision({
  image: processedImageBuffer,
  prompt: `
    Analyze this asset after [OPERATION_NAME] (e.g., "background removal", "alpha erosion", "resize and center"):

    1. Was the operation successful?
    2. Are there any artifacts or quality issues introduced?
    3. Does it still meet ALL requirements from the original critiquePrompt?
    4. Specific checks:
       - For background removal: Is background fully transparent? Any white halos?
       - For centering: Is asset centered with equal padding?
       - For alpha erosion: Are edges clean but not over-eroded?
       - For resize: Are dimensions correct? Any distortion?

    Original requirements: ${assetSpec.critiquePrompt}

    Respond with PASS or FAIL and specific reasons for the decision.
  `
});

if (!validationResult.includes('PASS')) {
  // Iteration logic:
  // - Try different POST-PROCESSING parameters (e.g., less aggressive erosion)
  // - Re-run the POST-PROCESSING operation (NOT regeneration from AI)
  // - Count towards maxIterations limit
  console.log(`Post-processing validation FAILED: ${validationResult}`);
  // Retry with adjusted POST-PROCESSING parameters or flag for manual review
}
```

**Why this is critical:**
- External scripts can fail silently or produce unexpected results
- Background removal may leave artifacts or remove wanted elements
- Resize operations can introduce distortion or misalignment
- Alpha erosion can over-erode and damage the asset
- Vision validation catches these issues before integration

**Asset types for post-process.py:**
- `block-texture` - JPEG compression (150KB target)
- `background` - JPEG compression (100KB target)
- `arrow-icon` - PNG with background removal + alpha erosion (20KB target)
- `lock-overlay` - PNG with background removal + alpha erosion (50KB target)
- `currency-icon` - PNG with background removal + alpha erosion (20KB target)
- `piggy-bank` - PNG with background removal + alpha erosion (20KB target)
- `logo` - PNG with background removal + alpha erosion (20KB target)

**For production quality background removal:**
Use Replicate's `cjwbw/rembg` model via MCP:
```typescript
const prediction = await mcp__replicate__create_predictions({
  version: "cjwbw/rembg",
  input: { image: imageUrl }
});
const noBgImageUrl = prediction.output;
```

## Dependencies

**Required:**
- Replicate MCP server (`.mcp.json` with `REPLICATE_API_TOKEN`)
- Python 3.8+ with Pillow and numpy (`pip install -r requirements.txt`)
- Claude vision API

**Python Helper Scripts:**
- `post-process.py` - Complete post-processing pipeline
- `remove-bg.py` - Background removal utility
- `image-resize-helper.py` - Image resizing with multiple strategies

## Setup for New Project

1. **Copy skill folder** to project (or reference globally)
   ```bash
   cp -r .skills/tech-artist-generate-asset /path/to/new-project/.skills/
   ```

2. **Install Python dependencies**
   ```bash
   cd .skills/tech-artist-generate-asset
   pip install -r requirements.txt
   ```

3. **Copy config template** to project root
   ```bash
   cp .asset-gen-config.json /path/to/new-project/
   ```

4. **Customize config**: asset types, output paths, models, prompts

5. **Configure Replicate MCP** in project's `.mcp.json`

6. **Test generation**
   ```bash
   /generate-asset arrow-icon test "test theme description"
   ```

---

**Version:** 2.0.0 (Project-Agnostic)
**Updated:** 2026-01-08
