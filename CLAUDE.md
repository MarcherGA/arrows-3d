# Arrow Block 3D - Tech Artist Agent Guide

## Project Overview

**Arrow Block 3D** is a 3D puzzle game built with Babylon.js and TypeScript, designed as an HTML5 playable ad (<5MB single-file bundle).

### Tech Stack
- **Engine:** Babylon.js 8.43.0 (WebGL)
- **Language:** TypeScript
- **Build Tool:** Vite 7.2.4
- **Target:** HTML5 playable ad with Base64-inlined assets

### Playable Ad Constraints
- **Total bundle size:** <5MB (all assets inlined as Base64)
- **Asset budget:** <400KB (33% Base64 overhead = ~532KB in bundle)
- **Format:** Single HTML file (no external resources)

---

## Theme System Architecture

The game uses a **folder-based theme system** where each theme is self-contained with visual assets and a color palette.

### Theme Structure
```
public/assets/
├── wood/
│   ├── block-texture.jpg
│   ├── arrow-icon.png
│   ├── background.jpg
│   ├── lock-overlay.png
│   ├── currency-icon.png
│   ├── logo.png
│   └── palette.json
│
├── cyberpunk/
│   └── (same assets + palette.json)
│
└── common/
    ├── icons/
    │   └── piggy-bank.png
    ├── models/
    │   └── beveled-cube.glb
    └── sounds/
        └── (4 .ogg files)
```

### Switching Themes

Modify a single line in [src/config/GameConfig.ts](src/config/GameConfig.ts:14):
```typescript
CURRENT_THEME: 'cyberpunk',  // Change to any theme folder name
```

The game dynamically loads:
- Visual assets from `public/assets/{themeName}/`
- Color palette from `public/assets/{themeName}/palette.json`

---

## Asset Generation Workflow

**All asset specifications are defined in [.asset-gen-config.json](.asset-gen-config.json).**

### Hero Asset Strategy

Generate assets in this order (defined in `workflow.generationOrder`):

1. **block-texture** (HERO ASSET - defines theme)
   - Text-only generation
   - Used as style reference for other assets
   - Seamless tileable texture applied to all block faces

2. **background** (with style reference)
   - Uses block-texture as `image_prompt` (promptStrength: 0.7)
   - Ensures atmospheric coherence

3. **lock-overlay** (with style reference)
   - Uses block-texture as `image_prompt` (promptStrength: 0.7)
   - Material matches block style

4. **arrow-icon** (text-only)
   - Simple, no style reference needed

5. **currency-icon** (text-only)
   - Simple, no style reference needed

6. **logo** (with reference logo style)
   - Uses existing logo as style guide (promptStrength: 0.6)

### Vision Critique Loop

After each generation:
1. Use Claude vision with `visionCritiquePrompt` from config
2. Respond PASS/FAIL based on requirements
3. Retry with **EXACT same prompt** if FAIL (max 3 iterations)
4. After post-processing, validate EACH operation visually

**Critical:** Do NOT modify prompts between iterations. The AI needs multiple chances, not prompt tweaking.

---

## Color Palette Extraction

### Vision-Based Approach (Recommended)

Use Claude vision with prompts from `palette.extractionStrategy` in config:

1. **Analyze block-texture** → Extract base colors:
   - `blockDefault`, `arrowColor`, `lockedColor`, `background`

2. **Analyze lock-overlay** → Extract key color:
   - Find BRIGHTEST, most SATURATED color for `keyColor`/`keyEmissive`

3. **Generate CSS palette** → Extract UI colors:
   - 11 hex colors for UI elements (`headerBg`, `accent`, buttons, etc.)

**Why vision is better:**
- Semantic understanding ("visually impactful" vs brightness math)
- Context-aware (neon blue pops on dark backgrounds)
- Avoids artifacts (won't pick glitches)

### Fallback: Pixel Sampling

If vision fails, use `.skills/tech-artist-reskin/extract-colors.py` for basic color averaging.

---

## Integration Patterns

### File Replacement Process

1. **Generate assets** → Save to `temp/{themeName}/`
2. **Post-process** → Resize, compress, remove backgrounds
3. **Validate** → Check sizes, dimensions, transparency
4. **Extract palette** → Vision-based or pixel sampling
5. **Integrate** → Copy to `public/assets/{themeName}/`
6. **Update config** → Change `CURRENT_THEME` in GameConfig.ts
7. **Test** → `npm run dev`
8. **Build** → `npm run build` and verify <5MB

### Code Files (No Changes Needed)

The theme system requires **zero code changes**. All paths and colors load dynamically from the theme folder.

### Validation Checklist

After integration:
- [ ] `npm run build` succeeds
- [ ] `dist/` folder <5MB
- [ ] Game renders correctly in browser
- [ ] Key blocks glow appropriately
- [ ] UI icons visible on backgrounds

---

## Common Issues & Solutions

### Texture Seams Visible
**Cause:** Not truly seamless
**Solution:**
- Emphasize "seamless tileable" in prompt
- Add to negative prompt: "borders, frames, edges, seams"
- Use vision critique to detect before integration

### White Halos on Icons
**Cause:** Background removal artifacts
**Solution:**
- Apply alpha erosion (1-2 pixels)
- Re-run background removal
- Verify with checkerboard test

### Key Block Not Prominent
**Cause:** Emissive color not bright enough
**Solution:**
- Use brightest color from lock overlay
- Boost saturation 1.5x for emissive
- Vision-based extraction handles this automatically

### Build Size Exceeds 5MB
**Cause:** Assets too large
**Solution:**
- Reduce JPEG quality: 85% → 70%
- Optimize PNG compression (level 9)
- Check total asset size <400KB before encoding

### Background Too Distracting
**Cause:** Focal points or sharp details
**Solution:**
- Add to prompt: "blurred, atmospheric, gradient"
- Add to negative: "sharp focus, detailed foreground, busy patterns"
- Use vision critique

---

## MCP Server Configuration

### Installation

Replicate MCP server is installed locally:
```bash
npm install --save-dev replicate-mcp
```

Configuration in [.mcp.json](.mcp.json):
```json
{
  "mcpServers": {
    "replicate": {
      "command": "node",
      "args": ["./node_modules/replicate-mcp/index.js"],
      "env": {
        "REPLICATE_API_TOKEN": "r8_your_token"
      }
    }
  }
}
```

### Model Used

**Current:** `google/nano-banana` (fast, cost-effective)
- Preset aspect ratios only (1:1, 9:16, etc.)
- Requires post-processing resize to exact dimensions
- ~10-15 seconds per image, $0.003 per image

See `modelLimitations` in config for details.

---

## Production Deployment

### Build Configuration

```bash
npm run build                 # Production build
# Check dist/index.html size (<5MB)
```

Single-file bundle configuration is in `vite.config.ts` (already configured).

### Size Calculation
- Assets: ~400KB
- Base64 overhead: +33% = ~532KB
- Code + dependencies: ~200KB
- **Total:** ~732KB ✅

---

## Quick Reference

### File Locations
- **Theme assets:** `public/assets/{themeName}/`
- **Theme config:** [src/config/GameConfig.ts](src/config/GameConfig.ts:14)
- **Asset specs:** [.asset-gen-config.json](.asset-gen-config.json)
- **Palette schema:** [public/assets/wood/palette.json](public/assets/wood/palette.json)

### Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
```

### Asset Checklist (Per Theme)
- [ ] block-texture.jpg (512×512, <150KB, seamless)
- [ ] arrow-icon.png (256×256, <20KB, transparent)
- [ ] background.jpg (768×1344, <100KB)
- [ ] lock-overlay.png (512×512, <100KB, transparent)
- [ ] currency-icon.png (128×128, <20KB, transparent)
- [ ] logo.png (128×128, <20KB, transparent)
- [ ] palette.json (color definitions)

**Common Assets (NOT generated per theme):**
- piggy-bank.png → `public/assets/common/icons/`
- beveled-cube.glb → `public/assets/common/models/`
- Sound files → `public/assets/common/sounds/`

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-10
**Config Version:** 1.0.0
