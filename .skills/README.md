# Tech Artist Agent Skills

Custom Claude Code skills for automated game asset generation and theme re-skinning.

## Available Skills

### 1. `/generate-asset` - Single Asset Generator

**Purpose:** Generate a single high-quality game asset with AI

**Usage:**
```bash
/generate-asset block-texture cyberpunk "metallic tech panels with neon circuit lines"
```

**Features:**
- Asset-specific prompt templates
- Replicate Flux model integration
- Vision critique loop for quality validation
- Automatic iteration (max 2 attempts)
- Post-processing (background removal, alpha erosion, compression)
- Size budget validation

**Supported Assets:**
- `block-texture` - 512x512 JPEG, seamless tileable
- `arrow-icon` - 256x256 PNG, transparent, upward-pointing
- `background` - 1920x1080 JPEG, non-distracting
- `lock-overlay` - 512x512 PNG, transparent, lock symbolism
- `currency-icon` - 128x128 PNG, transparent coin
- `win-icon` - 128x128 PNG, transparent piggy bank
- `logo` - 128x128 PNG, transparent logo

**Documentation:** [tech-artist-generate-asset/skill.md](tech-artist-generate-asset/skill.md)

---

### 2. `/reskin` - Full Theme Orchestrator

**Purpose:** Fully automated end-to-end game re-skinning

**Usage:**
```bash
/reskin cyberpunk "Futuristic cyberpunk aesthetic with neon accents, dark metallic surfaces, electric blue and hot pink colors, holographic elements"
```

**Workflow:**
1. ✅ Initialization - Create theme folder structure
2. 🎨 Asset Generation - Generate all 7 assets with quality validation
3. 🎨 Color Extraction - Automatic palette.json creation
4. 📦 Integration - Copy to theme folder
5. 🔄 Theme Switch - Update GameConfig.ts
6. 🏗️ Build Validation - Verify build succeeds <5MB
7. 📊 Success Report - Comprehensive summary

**Time:** ~10-15 minutes for complete theme

**Features:**
- Hero asset strategy (block texture first, used as style reference)
- Vision critique on all assets
- Brightest emissive color selection for key blocks
- Automatic palette.json generation
- Build validation with size checks
- Rollback on failures
- Detailed iteration notes

**Documentation:** [tech-artist-reskin/skill.md](tech-artist-reskin/skill.md)

---

## Architecture

### Hero Asset Strategy

Assets are generated in specific order for style coherence:

1. **Block Texture** (FIRST - Hero Asset)
   - Text-only generation
   - Defines theme's material and atmosphere
   - Model: `flux-1.1-pro`

2. **Background** (WITH style reference from hero)
   - Uses block texture as style reference (70% prompt / 30% image)
   - Ensures atmospheric coherence
   - Model: `flux-dev`

3. **Lock Overlay** (WITH style reference from hero)
   - Material style matches block texture
   - Model: `flux-1.1-pro`

4. **Arrow Icon** (Text-only, no style reference)
   - Simple design requires no style influence
   - Model: `flux-schnell`

5. **UI Icons** (Text-only, no style reference)
   - Generated in parallel for speed
   - Model: `flux-schnell`

### Vision Critique Loop

Every asset is validated using Claude's vision capabilities:

```typescript
// 1. Generate asset
const imageUrl = await replicateModel.run(...);

// 2. Download and load image
const imageBuffer = await downloadImage(imageUrl);

// 3. Claude visually inspects
const critique = await claudeVision({
  image: imageBuffer,
  prompt: getCritiquePrompt(assetType, themeName)
});

// 4. Parse result
if (critique.includes('FAIL')) {
  // Retry with refined prompt
  // Max 2 attempts total
}
```

**Critique Criteria:**
- Block texture: Seamless tiling, theme match, visual interest
- Icons: Transparency, clarity, symbolism
- Background: Non-distracting, UI compatibility
- Overall: No artifacts, watermarks, or quality issues

### Color Extraction

Automatic palette.json generation:

1. Sample 100 pixels from block texture → base colors
2. Sample 50 pixels from lock overlay → accent colors
3. Find **brightest + most saturated** → key block emissive
4. Generate derived colors (CSS variants)
5. Save palette.json

**Why brightest emissive:** Key block is the goal - must POP visually!

### Post-Processing Pipeline

For transparent assets (PNG):
1. Background removal (`cjwbw/rembg` model)
2. Alpha erosion (1px) to fix white halos
3. PNG compression (level 9)

For opaque assets (JPEG):
1. JPEG compression (85% quality, or 70% if size budget exceeded)

### Error Handling

- **Asset generation fails:** Retry with refined prompt (max 2 attempts)
- **Vision critique fails:** Analyze feedback, adjust prompt, retry
- **Build fails:** Rollback theme switch, preserve assets in temp/
- **Size budget exceeded:** Auto-compress, reduce dimensions if needed

---

## Dependencies

### Required

- **Replicate MCP Server:** `replicate-mcp@0.9.0` (configured in `.mcp.json`)
- **Sharp:** `npm install sharp` (image processing)
- **Node.js:** v18+ (for MCP server)

### Models Used

- `black-forest-labs/flux-1.1-pro` - Highest quality (block texture, lock overlay)
- `black-forest-labs/flux-dev` - Style reference support (background)
- `black-forest-labs/flux-schnell` - Fast iteration (icons)
- `cjwbw/rembg` - Background removal (post-processing)

---

## Quick Start

### Generate Single Asset

```bash
# 1. Generate a cyberpunk block texture
/generate-asset block-texture cyberpunk "metallic tech panels with neon circuit lines, dark blue with glowing cyan grid"

# 2. Review output in temp/ directory

# 3. Manually integrate if satisfied
```

### Generate Complete Theme

```bash
# 1. Run orchestrator
/reskin cyberpunk "Futuristic cyberpunk aesthetic with neon accents, dark metallic surfaces, electric blue and hot pink colors, holographic elements, tech panels with circuit patterns, atmospheric city vibes"

# 2. Wait ~10-15 minutes

# 3. Review success report

# 4. Test the game
npm run dev

# 5. Build for deployment
npm run build
```

---

## File Structure

```
.skills/
├── README.md (this file)
│
├── tech-artist-generate-asset/
│   └── skill.md (single asset generator docs)
│
└── tech-artist-reskin/
    └── skill.md (orchestrator docs)

public/assets/
├── wood/ (original theme)
│   ├── block-texture.jpg
│   ├── background.jpg
│   ├── lock-overlay.png
│   ├── arrow-icon.png
│   ├── currency-icon.png
│   ├── win-icon.png
│   ├── logo.png
│   └── palette.json
│
└── cyberpunk/ (generated theme)
    └── (same structure)

temp/ (generation workspace)
└── cyberpunk/
    └── (assets during generation)
```

---

## Theme System Integration

These skills integrate with the theme system documented in [CLAUDE.md](../CLAUDE.md).

**Switching themes:**
```typescript
// src/config/GameConfig.ts
export const THEME_CONFIG = {
  CURRENT_THEME: 'cyberpunk',  // Change this line
  FALLBACK_THEME: 'wood',
  ASSET_BASE_PATH: '/assets/',
  VERSION: '1.0.0',
};
```

**Palette schema:**
```json
{
  "name": "Theme Name",
  "version": "1.0.0",
  "babylon": {
    "blockDefault": [1.0, 1.0, 1.0],
    "arrowColor": [0.459, 0.176, 0.016],
    "background": [0.2, 0.3, 0.4, 1.0],
    "keyColor": [1.0, 0.843, 0.0],
    "keyEmissive": [0.3, 0.25, 0.0],
    "lockedColor": [0.2, 0.2, 0.2]
  },
  "css": {
    "headerBg": "#2358a6",
    "currencyContainer": "#1a4484",
    "bgBlue": "#3266d5",
    "darkBlue": "#1b47a1",
    "gold": "#f4d34d",
    "green": "#7dc001",
    "greenDark": "#5e9101"
  }
}
```

---

## Quality Standards

Every generated theme must meet:

### Visual Quality
- ✅ Theme immediately recognizable
- ✅ All assets share consistent style and palette
- ✅ Textures seamless (no visible seams)
- ✅ Icons clear and readable
- ✅ Professional, polished aesthetic

### Technical Quality
- ✅ Build succeeds without errors
- ✅ Bundle size <5MB
- ✅ All assets <400KB combined
- ✅ Game plays identically to original
- ✅ No console errors or warnings

### Functional Quality
- ✅ Block texture tiles seamlessly
- ✅ Arrow clearly indicates direction
- ✅ Background non-distracting
- ✅ Lock overlay visible on blocks
- ✅ UI icons readable at small sizes
- ✅ Key blocks POP with emissive glow

---

## Troubleshooting

### Common Issues

**Issue:** "Replicate MCP not connected"
**Solution:** Check `.mcp.json` configuration, verify API token, run `claude mcp list`

**Issue:** "Vision critique keeps failing"
**Solution:** Check prompt clarity, try different model, review CLAUDE.md for prompt templates

**Issue:** "File size exceeds budget"
**Solution:** Reduce JPEG quality (85% → 70%), optimize PNG compression, check dimensions

**Issue:** "Build fails after theme switch"
**Solution:** Verify all 8 files present (7 assets + palette.json), check GameConfig.ts syntax

**Issue:** "Assets don't match theme"
**Solution:** Provide more detailed theme description, use style reference for coherence

---

## Example Themes

### Cyberpunk (Neon/Tech)
```bash
/reskin cyberpunk "Futuristic cyberpunk aesthetic with neon accents, dark metallic surfaces, electric blue and hot pink colors, holographic elements, tech panels with circuit patterns, atmospheric city vibes"
```

### Medieval Fantasy
```bash
/reskin medieval "Medieval fantasy castle theme with stone textures, gold accents, royal purple and crimson red, ornate decorative patterns, torch-lit atmosphere, Gothic architecture vibes"
```

### Spooky Halloween
```bash
/reskin spooky "Spooky Halloween theme with dark purple and orange, carved pumpkins, ghostly elements, cobwebs, eerie glow effects, haunted mansion atmosphere"
```

### Cute/Kawaii
```bash
/reskin kawaii "Cute kawaii aesthetic with pastel pink and mint green, fluffy clouds, sparkles, hearts, soft gradients, cheerful and playful vibes"
```

---

**Skills Version:** 1.0.0
**Last Updated:** 2026-01-08
**Status:** Ready for Testing
