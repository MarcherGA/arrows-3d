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
5. **Iteration** - Retry up to `maxIterations` if critique fails
6. **Post-Processing** - Apply steps from config (background removal, erosion, compression)
7. **Validation** - Check size, format, dimensions, transparency
8. **Save** - Output to configured temp folder

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
    "maxIterations": 2,
    "validation": { "fileSize": true, "dimensions": true, "format": true, "transparency": true, "visionCritique": true }
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
```

### Post-Processing
```typescript
for (const step of assetSpec.postProcessing) {
  if (step.includes('Background removal')) {
    imageBuffer = await replicatePredict('cjwbw/rembg', { image: imageUrl });
  }
  if (step.includes('Alpha erosion')) {
    imageBuffer = await erodeAlpha(imageBuffer, 1);
  }
  if (step.includes('PNG compression')) {
    imageBuffer = await sharp(imageBuffer).png({ compressionLevel: 9 }).toBuffer();
  }
  if (step.includes('JPEG compression')) {
    const quality = parseInt(step.match(/\d+/)?.[0]) || 85;
    imageBuffer = await sharp(imageBuffer).jpeg({ quality }).toBuffer();
  }
}
```

## Dependencies

- Replicate MCP server (`.mcp.json`)
- Sharp library for image processing
- Claude vision API

## Setup for New Project

1. Copy `.asset-gen-config.json` template to project root
2. Customize: asset types, output paths, models, prompts
3. Ensure dependencies installed
4. Test: `/generate-asset <type> test "test description"`

---

**Version:** 2.0.0 (Project-Agnostic)
**Updated:** 2026-01-08
