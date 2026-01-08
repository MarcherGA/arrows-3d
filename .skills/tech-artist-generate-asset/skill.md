# Tech Artist: Generate Asset

Generate a single high-quality game asset using AI image generation with automatic quality validation and iteration.

## Usage

```
/generate-asset <asset_type> <theme_name> <theme_description>
```

**Parameters:**
- `asset_type`: Type of asset to generate (block-texture | arrow-icon | background | lock-overlay | currency-icon | win-icon | logo)
- `theme_name`: Theme identifier (e.g., "cyberpunk", "medieval", "spooky")
- `theme_description`: Detailed description of the theme aesthetic

**Example:**
```
/generate-asset block-texture cyberpunk "metallic tech panels with neon circuit lines, dark blue metallic with glowing cyan grid"
```

## What This Skill Does

1. **Prompt Generation**: Creates optimized prompts based on asset type and theme
2. **AI Generation**: Uses Replicate Flux models to generate high-quality images
3. **Vision Critique**: Claude visually inspects the generated asset for quality issues
4. **Iteration**: Automatically retries if quality is poor (max 2 attempts)
5. **Post-Processing**: Applies background removal, alpha erosion, and compression
6. **Validation**: Checks file size, format, dimensions, and quality
7. **Save**: Outputs the final asset to a temporary location for review

## Asset Type Specifications

### block-texture
- **Dimensions:** 512x512
- **Format:** JPEG
- **Size Target:** <150KB
- **Critical:** Must be seamless tileable (no visible seams on edges)
- **Model:** `black-forest-labs/flux-1.1-pro`

### arrow-icon
- **Dimensions:** 256x256
- **Format:** PNG with alpha
- **Size Target:** <20KB
- **Critical:** Points upward, transparent background, simple design
- **Model:** `black-forest-labs/flux-schnell`
- **Post-Processing:** Background removal + alpha erosion

### background
- **Dimensions:** 1920x1080
- **Format:** JPEG
- **Size Target:** <100KB
- **Critical:** Non-distracting, suitable for UI overlay
- **Model:** `black-forest-labs/flux-dev`
- **Style Reference:** Optional (if hero asset provided)

### lock-overlay
- **Dimensions:** 512x512
- **Format:** PNG with alpha
- **Size Target:** <50KB
- **Critical:** Clear "locked" symbolism, transparent background
- **Model:** `black-forest-labs/flux-1.1-pro`
- **Post-Processing:** Background removal + alpha erosion
- **Style Reference:** Optional (if hero asset provided)

### currency-icon, win-icon, logo
- **Dimensions:** 128x128
- **Format:** PNG with alpha
- **Size Target:** <20KB each
- **Critical:** Simple, iconic, readable at small sizes
- **Model:** `black-forest-labs/flux-schnell`
- **Post-Processing:** Background removal + alpha erosion

## Workflow

### Step 1: Generate Prompt Template

Based on asset type, construct a specialized prompt:

**Block Texture Template:**
```
Create a seamless, tileable texture for a 3D cube surface.

REQUIREMENTS (CRITICAL):
- Perfectly seamless edges (wraps on cube faces without visible seams)
- Suitable for {THEME_NAME} aesthetic
- Visual interest but not overwhelming
- Works well when repeated on multiple cube faces
- Square format (512x512)

STYLE: {THEME_DESCRIPTION}

NEGATIVE PROMPT: borders, frames, text, watermarks, seams, edges,
asymmetric, directional lighting, perspective, organic patterns that don't tile
```

**Arrow Icon Template:**
```
Create a simple, bold arrow icon pointing UPWARD for a puzzle game.

REQUIREMENTS (CRITICAL):
- Arrow points straight UP (↑ direction)
- Completely transparent background
- Simple, geometric design (readable at small sizes)
- Bold and clear (high visibility)
- Square format (256x256)

STYLE: {THEME_DESCRIPTION}

NEGATIVE PROMPT: complex details, thin lines, background, gradient backgrounds,
white edges, multiple arrows, text, watermarks
```

**(See CLAUDE.md for all templates)**

### Step 2: Generate Image with Replicate

Use the appropriate Flux model for the asset type:

```typescript
// For block texture (highest quality)
model: "black-forest-labs/flux-1.1-pro"
input: {
  prompt: generatedPrompt,
  width: 512,
  height: 512,
  num_outputs: 1,
  output_format: "jpg",
  output_quality: 85
}

// For icons (fast generation)
model: "black-forest-labs/flux-schnell"
input: {
  prompt: generatedPrompt,
  width: 256,
  height: 256,
  num_outputs: 1,
  output_format: "png"
}

// For background with style reference (if provided)
model: "black-forest-labs/flux-dev"
input: {
  prompt: generatedPrompt,
  image_prompt: heroAssetUrl,  // Optional
  prompt_strength: 0.7,
  width: 1920,
  height: 1080,
  num_outputs: 1,
  output_format: "jpg",
  output_quality: 85
}
```

### Step 3: Download and Save

Download the generated image URL to a temporary location for processing.

### Step 4: Vision Critique

Use Claude's vision capabilities to validate quality:

```typescript
// Load the generated image
const imageBuffer = await readFile(tempPath);

// Critique based on asset type
const critiquePrompt = getCritiquePrompt(assetType, themeName);

// Call vision API
const critique = await claudeVision({
  image: imageBuffer,
  prompt: critiquePrompt
});

// Parse result
const passed = critique.includes('PASS');
const feedback = extractFeedback(critique);
```

**Vision Critique Prompts:**

For **block-texture**:
```
Analyze this texture that will be used on 3D cube faces:
1. Are the edges seamless? (Check all 4 edges - can it tile without visible seams?)
2. Does it match the "{THEME_NAME}" theme aesthetic?
3. Is there appropriate visual interest without being overwhelming?
4. Are there any obvious artifacts, text, or watermarks?

Respond with PASS or FAIL and specific reasons.
```

For **arrow-icon**:
```
Analyze this arrow icon for a game:
1. Does it clearly point UPWARD?
2. Is the background transparent (no white/gray edges)?
3. Is it simple and readable at small sizes?
4. Does it match the "{THEME_NAME}" theme?

Respond with PASS or FAIL and specific reasons.
```

*(See CLAUDE.md for all critique prompts)*

### Step 5: Iteration (if FAIL)

If vision critique fails:
1. Analyze feedback for specific issues
2. Refine prompt based on feedback (add negative prompts, adjust emphasis)
3. Try different seed or model parameters
4. Maximum 2 attempts total
5. If still failing, flag for manual review

### Step 6: Post-Processing

For transparent assets (PNG):
1. **Background Removal**: Use `cjwbw/rembg` model via Replicate
2. **Alpha Erosion**: Shrink alpha channel by 1px to remove white halos
3. **PNG Compression**: Optimize with level 9 compression

For opaque assets (JPEG):
1. **JPEG Compression**: Quality 85% (or 70% if size budget exceeded)

**Alpha Erosion Implementation:**
```typescript
// Use sharp library for image processing
import sharp from 'sharp';

async function erodeAlphaChannel(imageBuffer: Buffer, pixels: number): Promise<Buffer> {
  const { data, info } = await sharp(imageBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Apply morphological erosion on alpha channel
  const eroded = await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4,
    },
  })
    .erode(pixels)
    .png()
    .toBuffer();

  return eroded;
}
```

### Step 7: Validation

Check final asset:
- [ ] File size within budget
- [ ] Correct format (JPEG/PNG)
- [ ] Correct dimensions
- [ ] Transparency present (for PNG assets)
- [ ] No obvious artifacts

### Step 8: Output

Save final asset to:
```
c:\Projects\arrows-3d\temp\{theme_name}-{asset_type}.{ext}
```

Report results:
- ✅ Success: Asset path, file size, critique feedback
- ❌ Failure: Error details, iteration notes, recommendations

## Dependencies

The skill requires:
- Replicate MCP server (configured in `.mcp.json`)
- Sharp library for post-processing (install: `npm install sharp`)
- Access to Claude's vision API (built-in)

## Example Output

```
✅ Asset Generated: block-texture for cyberpunk theme

Path: c:\Projects\arrows-3d\temp\cyberpunk-block-texture.jpg
Size: 142KB (within 150KB budget)
Dimensions: 512x512
Format: JPEG

Vision Critique: PASS
- Edges are seamless (tileable confirmed)
- Strong cyberpunk aesthetic with neon accents
- Good visual interest without overwhelming detail
- No artifacts or watermarks detected

Ready for integration into theme folder.
```

## Error Handling

### Common Issues

**Issue: "Texture has visible seams"**
- Retry with stronger emphasis on "seamless tileable"
- Add to negative prompt: "borders, edges, seams"

**Issue: "White halos on transparent icons"**
- Apply alpha erosion (1-2px)
- Retry background removal with different settings

**Issue: "File size exceeds budget"**
- Reduce JPEG quality (85% → 70%)
- Reduce dimensions if quality allows
- Increase PNG compression level

**Issue: "Arrow doesn't point upward"**
- Retry with clearer directional emphasis
- Add to negative prompt: "sideways, horizontal, downward"

## Integration with Orchestrator

This skill is designed to be called by the `tech-artist-reskin` orchestrator skill:

```typescript
// Orchestrator calls this skill for each asset
const blockTexture = await generateAsset({
  assetType: 'block-texture',
  themeName: 'cyberpunk',
  themeDescription: 'metallic panels with neon circuits...',
});

const arrowIcon = await generateAsset({
  assetType: 'arrow-icon',
  themeName: 'cyberpunk',
  themeDescription: 'glowing neon arrow, electric blue...',
});

// ... generate all 7 assets
```

## Quality Standards

Every generated asset must meet:

1. **Visual Quality**: Matches theme, good looking, no artifacts
2. **Technical Quality**: Correct format, dimensions, file size
3. **Functional Quality**: Works as intended (tileable, transparent, readable)
4. **Vision Validation**: Passes Claude's visual critique

**Reject and retry if:**
- Vision critique returns FAIL
- File size exceeds budget by >20%
- Dimensions are incorrect
- Format is wrong (PNG vs JPEG)
- Obvious quality issues (seams, halos, artifacts)

---

**Skill Version:** 1.0.0
**Last Updated:** 2026-01-08
**Status:** Ready for Implementation
