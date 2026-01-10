# Tech Artist: Generate Asset

Generate a single high-quality game asset using AI image generation with automatic quality validation and iteration.

**Global skill:** Works with any project via `.asset-gen-config.json` configuration file.

## ⚠️ CRITICAL REQUIREMENT: Validate After Every Step

**YOU MUST validate the asset after EVERY operation:**

1. ✅ After AI generation → Vision critique with config's `visionCritiquePrompt`
2. ✅ After background removal → Vision check (transparent? artifacts?)
3. ✅ After alpha erosion → Vision check (edges clean? over-eroded?)
4. ✅ After resize/center → Vision check (dimensions? centered?)
5. ✅ After compression → File size check (under target?)
6. ✅ Before final save → Technical validation (size, format, dimensions)

**DO NOT skip validation. DO NOT assume success. READ the file and CHECK with vision after each step.**

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
7. **⚠️ VALIDATE AFTER EVERY STEP** - Use vision critique after EACH post-processing operation
8. **Technical Validation** - Check file size, format, dimensions, transparency
9. **Save** - Output to configured temp folder

**CRITICAL: VALIDATION IS MANDATORY AFTER EVERY CHANGE**
- After generation → vision critique
- After background removal → vision check (transparency, no artifacts)
- After alpha erosion → vision check (clean edges, not over-eroded)
- After resize/center → vision check (correct dimensions, centered)
- After compression → file size check
- Before saving → final technical validation (size, format, dimensions)

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
    image_input: heroAssetUrl,
    image_strength: assetSpec.styleReference.imageStrength
  })
};

// Create prediction via Replicate MCP
const prediction = await replicateMCP.create_predictions({
  model: assetSpec.generation.model,
  version: assetSpec.generation.parameters.version, // if specified in config
  input: input
});

// Wait for completion and get output URL
const outputUrl = prediction.output[0]; // URL to generated image
```

### Download Generated Asset

**CRITICAL: Use curl to download the asset, do NOT use Replicate MCP tools for downloading.**

```bash
# Download the generated asset using curl
curl -o "temp/themeName/asset-type-raw.webp" "<output_url_from_prediction>"
```

**Why curl:**
- Replicate output URLs are public HTTPS URLs
- curl is the standard tool for downloading files
- Faster and more reliable than other methods
- No authentication needed for output URLs

**Example:**
```bash
# After getting prediction.output[0] = "https://replicate.delivery/yhqm/abc123/output.webp"
curl -o "temp/cyberpunk/block-texture-raw.webp" "https://replicate.delivery/yhqm/abc123/output.webp"
```

### Vision Critique

**IMPORTANT: Keep critique responses SHORT and STRUCTURED**

Use this format (numbered checklist with PASS/FAIL for each point):
```
Vision Critique:

1. [Question from config] - PASS/FAIL - [1 sentence reason]
2. [Question from config] - PASS/FAIL - [1 sentence reason]
3. [Question from config] - PASS/FAIL - [1 sentence reason]
...

Result: PASS/FAIL - [Brief conclusion]
```

**Example (good):**
```
Vision Critique:

1. Does it clearly point UPWARD? PASS - Clear upward direction
2. Is the arrow CENTERED? PASS - Well centered
3. Is background solid white? PASS - Clean white background
4. Is it SOLID BLACK? PASS - Solid black silhouette
5. Is it MINIMAL? PASS - Clean, geometric design
6. Are there NO shadows? PASS - No shadows

Result: PASS - Excellent arrow icon!
```

**Example (bad - too verbose):**
```
Let me analyze this arrow icon in detail. Looking at the first requirement about direction, I can see that the arrow is indeed pointing upward with a clear indication of the direction. The design shows excellent clarity in this regard, with the triangular head oriented in the correct vertical position...
[400 more words]
```

**Implementation:**
```typescript
const critiquePrompt = assetSpec.critiquePrompt.replace(/{THEME_NAME}/g, themeName);

// Add instruction for structured format
const structuredPrompt = `${critiquePrompt}

**RESPONSE FORMAT (required):**
Vision Critique:

1. [First question] - PASS/FAIL - [Brief reason]
2. [Second question] - PASS/FAIL - [Brief reason]
...

Result: PASS/FAIL - [Brief conclusion]

Keep each line to ONE sentence maximum. Be concise.`;

const critique = await claudeVision({ image: imageBuffer, prompt: structuredPrompt });
const passed = critique.includes('Result: PASS');

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

#### Background Removal (For Transparent Assets)

**CRITICAL: Use Replicate MCP with cjwbw/rembg model for background removal.**

```typescript
// Step 1: Upload the generated asset to get a public URL (if not already public)
// The asset downloaded from Nano Banana is already at a public URL, use that directly

// Step 2: Call rembg model via Replicate MCP
const bgRemovalPrediction = await replicateMCP.create_predictions({
  model: "cjwbw/rembg",
  input: {
    image: rawAssetUrl // URL from Nano Banana output
  }
});

// Step 3: Wait for completion
const transparentAssetUrl = bgRemovalPrediction.output; // URL to image with transparent background

// Step 4: Download the transparent asset
// Use curl to download
```

**Example:**
```bash
# After getting background-removed URL from rembg
curl -o "temp/cyberpunk/arrow-icon-nobg.png" "<transparent_asset_url>"
```

**Why use cjwbw/rembg via MCP:**
- Professional-grade background removal
- Handles complex edges and fine details
- Better than simple color thresholding
- Integrates seamlessly with Replicate workflow

**Model documentation:** https://replicate.com/cjwbw/rembg

#### Other Post-Processing Steps

Use Python helper scripts from `.skills/tech-artist-generate-asset/`:

```bash
# 1. Alpha erosion (remove white halos after background removal)
python .skills/tech-artist-generate-asset/image-resize-helper.py \
  --erode temp/theme/asset-nobg.png temp/theme/asset-eroded.png 1

# 2. Center and resize
python .skills/tech-artist-generate-asset/image-resize-helper.py \
  temp/theme/asset-eroded.png \
  temp/theme/asset-centered.png \
  256 256 contain-centered

# 3. Compress PNG
python .skills/tech-artist-generate-asset/image-resize-helper.py \
  temp/theme/asset-centered.png \
  output/theme/asset.png \
  256 256 contain-centered
```

**Alternative: Use post-process.py wrapper (after manual background removal)**
```bash
python .skills/tech-artist-generate-asset/post-process.py \
  temp/theme/asset-nobg.png \
  output/theme/asset.png \
  arrow-icon
```

**Note:** The `post-process.py` script expects the asset to already have background removed (via Replicate MCP rembg). It handles resize, erosion, and compression only.

### Post-Processing Validation (CRITICAL - REQUIRED AFTER EVERY STEP)

**⚠️ MANDATORY: After EACH post-processing operation, Claude Code MUST use vision to validate that the asset still meets requirements.**

**DO NOT:**
- ❌ Assume the operation succeeded without visual confirmation
- ❌ Skip validation to "save time"
- ❌ Trust exit codes or script output alone
- ❌ Move to next step without explicit PASS/FAIL verdict

**DO:**
- ✅ Read the file after EVERY operation
- ✅ Use vision critique to verify quality
- ✅ Check file size after compression/resize
- ✅ Verify dimensions with image metadata
- ✅ Explicitly state PASS or FAIL before continuing

```typescript
// TEMPLATE: Use this after EVERY post-processing step
// Step 1: Read the processed file
const processedImageBuffer = await readFile(processedImagePath);
const imageMetadata = await getImageInfo(processedImagePath); // width, height, format, size

// Step 2: Vision validation (SHORT structured format)
const validationResult = await claudeVision({
  image: processedImageBuffer,
  prompt: `
    Analyze this ${assetType} after ${operationName}:

    Check:
    1. Operation successful? ${operationSpecificCheck1}
    2. Any artifacts introduced?
    3. Still meets original requirements?

    **RESPONSE FORMAT (required):**
    Post-Processing Check (${operationName}):

    1. Operation successful? PASS/FAIL - [Brief reason]
    2. Artifacts? PASS/FAIL - [Brief reason]
    3. Original requirements met? PASS/FAIL - [Brief reason]

    Result: PASS/FAIL

    Keep responses to ONE sentence per check. Be concise.
  `
});

// Step 3: Technical validation (file size, dimensions)
const sizeTarget = parseSize(assetSpec.output.sizeTarget); // e.g., "100KB" → 102400 bytes
const sizeCheck = imageMetadata.size <= sizeTarget ? 'PASS' : 'FAIL';
const dimensionCheck =
  imageMetadata.width === assetSpec.output.dimensions.width &&
  imageMetadata.height === assetSpec.output.dimensions.height ? 'PASS' : 'FAIL';

// Step 4: Report results
console.log(`
  Post-Processing Validation: ${operationName}
  Vision Check: ${validationResult.includes('PASS') ? 'PASS ✅' : 'FAIL ❌'}
  File Size: ${imageMetadata.size}B / ${sizeTarget}B - ${sizeCheck} ${sizeCheck === 'PASS' ? '✅' : '⚠️'}
  Dimensions: ${imageMetadata.width}x${imageMetadata.height} - ${dimensionCheck} ${dimensionCheck === 'PASS' ? '✅' : '❌'}
`);

// Step 5: Decision logic
if (!validationResult.includes('PASS')) {
  // CRITICAL DECISION POINT: What failed?

  // If post-processing introduced artifacts → adjust parameters and retry
  // Examples:
  // - Background removal removed too much → lower threshold
  // - Alpha erosion too aggressive → reduce pixels (2 → 1)
  // - Resize distorted image → try different strategy (cover-crop vs contain-centered)

  console.error(`❌ Post-processing validation FAILED: ${validationResult}`);
  console.error(`   Cannot proceed to next step - must fix current operation first`);

  // Retry with adjusted parameters (do NOT count towards AI generation maxIterations)
  // This is post-processing iteration, separate from generation iteration
}

if (sizeCheck === 'FAIL') {
  console.warn(`⚠️ File size exceeds target: ${imageMetadata.size}B > ${sizeTarget}B`);
  // Apply more aggressive compression or flag for manual review
}

if (dimensionCheck === 'FAIL') {
  console.error(`❌ Dimensions incorrect: expected ${assetSpec.output.dimensions.width}x${assetSpec.output.dimensions.height}, got ${imageMetadata.width}x${imageMetadata.height}`);
  // Must re-run resize operation - this is a hard failure
}
```

**Why validation after every step is critical:**
- 🔍 **Background removal** may leave white artifacts, remove wanted elements, or fail silently
- 🔍 **Alpha erosion** can over-erode and damage edges, or do nothing if parameters wrong
- 🔍 **Resize** can introduce distortion, misalignment, or crop wanted content
- 🔍 **Centering** may fail leaving asset off-center with unequal padding
- 🔍 **Compression** can exceed size targets or introduce visible artifacts
- 🔍 **File operations** can fail silently with zero-byte files or corrupted output

**Real example from lock-overlay generation:**
```
❌ Problem: lock-overlay.png was 180KB (exceeded 100KB target)
❌ Root cause: Skipped file size check after compression
✅ Solution: Read file, check size, apply more aggressive compression, validate again
```

**Asset types for post-process.py:**
- `block-texture` - JPEG compression (150KB target)
- `background` - JPEG compression (100KB target)
- `arrow-icon` - PNG with background removal + alpha erosion (20KB target)
- `lock-overlay` - PNG with background removal + alpha erosion (50KB target)
- `currency-icon` - PNG with background removal + alpha erosion (20KB target)
- `piggy-bank` - PNG with background removal + alpha erosion (20KB target)
- `logo` - PNG with background removal + alpha erosion (20KB target)

**For production quality background removal:**
Claude Code will handle background removal by calling Replicate's `cjwbw/rembg` model via MCP tools during the conversation workflow.

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

**Version:** 1.0.0
**Updated:** 2026-01-10
