# Arrow Block 3D - Tech Artist Agent Guide

## Project Overview

**Arrow Block 3D** is a 3D puzzle game built with Babylon.js 8.43.0 and TypeScript. This document provides comprehensive guidance for AI-powered re-skinning and asset generation.

### Tech Stack
- **Engine:** Babylon.js 8.43.0 (WebGL)
- **Language:** TypeScript
- **Build Tool:** Vite 7.2.4
- **Target Format:** HTML5 playable ad (<5MB single-file bundle)
- **Gameplay:** Block-pulling puzzle with directional arrows

### Playable Ad Constraints
- **Total bundle size:** <5MB (including all assets inlined as Base64)
- **Format:** Single HTML file (no external resources)
- **Asset overhead:** Base64 encoding adds ~33% size increase
- **Networks:** Google UAC, ironSource, Unity Ads, Facebook Audience Network

---

## Theme System Architecture

### Overview
The game uses a **folder-based theme system** where each theme is self-contained in its own directory with visual assets and a color palette definition.

### Theme Structure
```
public/assets/
├── wood/                    # Original casual wood theme
│   ├── block-texture.jpg    # 512x512, seamless tileable texture
│   ├── arrow-icon.png       # 256x256, transparent direction indicator
│   ├── background.jpg       # 1920x1080, game background
│   ├── lock-overlay.png     # 512x512, transparent lock icon
│   ├── currency-icon.png    # 128x128, transparent coin icon
│   ├── win-icon.png         # 128x128, transparent piggy bank
│   ├── logo.png             # 128x128, transparent game logo
│   └── palette.json         # Color definitions (Babylon.js + CSS)
│
├── cyberpunk/               # Example: Neon cyberpunk theme
│   ├── (same 7 assets + palette.json)
│   └── ...
```

### Switching Themes
To switch themes, modify a single line in [src/config/GameConfig.ts](src/config/GameConfig.ts):
```typescript
export const THEME_CONFIG = {
  CURRENT_THEME: 'cyberpunk', // Change this to any theme folder name
  FALLBACK_THEME: 'wood',      // Always-available fallback
  ASSET_BASE_PATH: '/assets/',
  VERSION: '1.0.0',
};
```

### Theme Palette System
Each theme includes a `palette.json` file that defines **all colors** used in the game, both for Babylon.js materials and CSS styles.

**Schema:**
```json
{
  "name": "Theme Display Name",
  "version": "1.0.0",
  "babylon": {
    "blockDefault": [1.0, 1.0, 1.0],           // RGB normalized (0-1)
    "arrowColor": [0.459, 0.176, 0.016],       // Arrow icon color
    "background": [0.2, 0.3, 0.4, 1.0],        // Scene background (RGBA)
    "keyColor": [1.0, 0.843, 0.0],             // Key block color
    "keyEmissive": [0.3, 0.25, 0.0],           // Key glow effect
    "lockedColor": [0.2, 0.2, 0.2]             // Locked block color
  },
  "css": {
    "headerBg": "#2358a6",                      // Header background
    "currencyContainer": "#1a4484",             // Currency display
    "bgBlue": "#3266d5",                        // UI accent blue
    "darkBlue": "#1b47a1",                      // Dark UI elements
    "gold": "#f4d34d",                          // Gold accents
    "green": "#7dc001",                         // Success/win color
    "greenDark": "#5e9101"                      // Dark success variant
  }
}
```

---

## Asset Specifications

### Critical Requirements for All Assets

#### File Size Budget
- **Total assets per theme:** <400KB (to stay under 5MB after Base64 encoding)
- **Block texture:** <150KB
- **Background:** <100KB
- **Lock overlay:** <50KB
- **Each icon:** <20KB

#### Format Requirements
- **Opaque assets:** JPEG format (block-texture.jpg, background.jpg)
- **Transparent assets:** PNG format with alpha channel (all icons, overlay)
- **Compression:** JPEG quality 85%, PNG compression level 9

---

### Asset Type 1: Block Texture

**File:** `block-texture.jpg`
**Dimensions:** 512x512 pixels (square, power of 2)
**Format:** JPEG
**Size Target:** <150KB
**Critical Requirement:** **SEAMLESS TILEABLE** (wraps on all 4 edges without visible seams)

#### What It's Used For
Applied as material to all block faces in the 3D scene. Repeated on multiple cube faces, so seams are immediately visible if not tileable.

#### Quality Checklist
- [ ] All 4 edges are seamless (test by tiling 2x2)
- [ ] Visual interest without overwhelming detail
- [ ] Works when viewed from multiple angles
- [ ] Appropriate contrast for arrow visibility
- [ ] Matches theme aesthetic

#### Prompt Template
```
Create a seamless, tileable texture for a 3D cube surface.

REQUIREMENTS (CRITICAL):
- Perfectly seamless edges (wraps on cube faces without visible seams)
- Suitable for {THEME_NAME} aesthetic
- Visual interest but not overwhelming
- Works well when repeated on multiple cube faces
- Square format (512x512)

STYLE: {THEME_DESCRIPTION}
Example for Cyberpunk: metallic panels, circuit patterns, neon grid lines,
tech panels, dark background with glowing accents, blue and purple neon

NEGATIVE PROMPT: borders, frames, text, watermarks, seams, edges,
asymmetric, directional lighting, perspective, organic patterns that don't tile
```

#### Validation Steps
1. Generate texture
2. **Vision check:** Load image, visually inspect all 4 edges for seams
3. Tile 2x2 in image editor and check center junction
4. Verify file size <150KB
5. Check dimensions are exactly 512x512

---

### Asset Type 2: Arrow Icon

**File:** `arrow-icon.png`
**Dimensions:** 256x256 pixels
**Format:** PNG with alpha transparency
**Size Target:** <20KB
**Critical Requirement:** Clear upward direction, transparent background

#### What It's Used For
Displayed on block faces to indicate pull direction. Must be readable at small sizes and contrast with various block textures.

#### Quality Checklist
- [ ] Clearly points UPWARD (will be rotated for other directions)
- [ ] Transparent background (no white/gray edges or halos)
- [ ] Simple, bold design (readable at 64x64 pixels)
- [ ] Matches theme aesthetic
- [ ] High contrast outline or solid fill

#### Prompt Template
```
Create a simple, bold arrow icon pointing UPWARD for a puzzle game.

REQUIREMENTS (CRITICAL):
- Arrow points straight UP (↑ direction)
- Completely transparent background
- Simple, geometric design (readable at small sizes)
- Bold and clear (high visibility)
- Square format (256x256)

STYLE: {THEME_DESCRIPTION}
Example for Cyberpunk: glowing neon arrow, electric blue with pink outline,
holographic appearance, tech aesthetic

NEGATIVE PROMPT: complex details, thin lines, background, gradient backgrounds,
white edges, multiple arrows, text, watermarks
```

#### Post-Processing Pipeline
1. Generate arrow with "transparent background" in prompt
2. **Apply background removal:** Use `cjwbw/rembg` model
3. **Alpha erosion:** Shrink alpha channel by 1px to remove white halos
4. Verify transparency with checkerboard test
5. Compress PNG (level 9)
6. Verify file size <20KB

---

### Asset Type 3: Background

**File:** `background.jpg`
**Dimensions:** 1920x1080 pixels (16:9 aspect ratio)
**Format:** JPEG
**Size Target:** <100KB
**Critical Requirement:** Non-distracting, provides atmosphere without competing for attention

#### What It's Used For
Full-screen background behind the 3D scene and UI. Must not distract from gameplay or make UI elements unreadable.

#### Quality Checklist
- [ ] Non-distracting (blurred, gradient, or atmospheric)
- [ ] Appropriate color palette matches theme
- [ ] No focal points that compete with game elements
- [ ] UI text and icons remain readable when overlaid
- [ ] Matches theme aesthetic

#### Prompt Template
```
Create an atmospheric background for a puzzle game interface.

REQUIREMENTS (CRITICAL):
- Non-distracting (suitable for UI overlay)
- Blurred, gradient, or atmospheric (NOT detailed foreground)
- Appropriate for {THEME_NAME} aesthetic
- 16:9 aspect ratio (1920x1080)
- Dark to medium tones (not pure black, not too bright)

STYLE: {THEME_DESCRIPTION}
Example for Cyberpunk: dark cityscape at night, blurred neon lights,
atmospheric fog, deep blue-purple gradient, distant buildings

NEGATIVE PROMPT: sharp focus, detailed foreground, busy patterns, text,
watermarks, UI elements, characters, centered objects
```

#### Style Reference Strategy
- **Use block texture as style reference** (prompt_strength: 0.7)
- Ensures background atmosphere matches material style
- 70% text prompt / 30% image style blend

---

### Asset Type 4: Lock Overlay

**File:** `lock-overlay.png`
**Dimensions:** 512x512 pixels
**Format:** PNG with alpha transparency
**Size Target:** <50KB
**Critical Requirement:** Clear "locked" symbolism, transparent background

#### What It's Used For
Overlaid on locked blocks to indicate they cannot be removed until conditions are met. Must be immediately recognizable as "locked."

#### Quality Checklist
- [ ] Immediately recognizable as lock/chain/barrier
- [ ] Transparent background (no white halos)
- [ ] Visible when overlaid on various block textures
- [ ] Matches theme aesthetic
- [ ] Sufficient contrast with block materials

#### Prompt Template
```
Create a lock/chain overlay icon for a puzzle game.

REQUIREMENTS (CRITICAL):
- Clear "locked" symbolism (padlock, chain, barrier, etc.)
- Completely transparent background
- Visible when overlaid on textured surfaces
- Square format (512x512)
- Bold design with good contrast

STYLE: {THEME_DESCRIPTION}
Example for Cyberpunk: digital padlock with glowing neon chains,
electric blue and pink, holographic lock icon, tech aesthetic

NEGATIVE PROMPT: background, solid fill, subtle details, text, watermarks,
white edges, multiple locks, realistic photography
```

#### Post-Processing Pipeline
1. Generate with "transparent background" in prompt
2. **Apply background removal:** Use `cjwbw/rembg` model
3. **Alpha erosion:** Shrink alpha channel by 1px
4. Verify transparency and contrast
5. Compress PNG (level 9)

#### Style Reference Strategy
- **Use block texture as style reference** (prompt_strength: 0.7)
- Ensures overlay material matches block material style

---

### Asset Types 5-7: UI Icons

**Files:** `currency-icon.png`, `win-icon.png`, `logo.png`
**Dimensions:** 128x128 pixels
**Format:** PNG with alpha transparency
**Size Target:** <20KB each
**Critical Requirement:** Simple, readable, transparent background

#### What They're Used For
- **currency-icon.png:** Coin/currency indicator in header
- **win-icon.png:** Victory screen icon (piggy bank in wood theme)
- **logo.png:** Game logo/branding

#### Quality Checklist
- [ ] Simple, iconic design (readable at small sizes)
- [ ] Transparent background (no halos)
- [ ] Matches theme aesthetic
- [ ] Appropriate symbolism for function

#### Prompt Template
```
Create a simple {ICON_TYPE} icon for a mobile puzzle game.

REQUIREMENTS (CRITICAL):
- Simple, iconic design (readable at 64x64 pixels)
- Completely transparent background
- Square format (128x128)
- Bold colors and clear shapes

STYLE: {THEME_DESCRIPTION}
Example for Cyberpunk currency icon: neon coin with circuit patterns,
holographic appearance, electric blue and pink

NEGATIVE PROMPT: complex details, realistic, background, text, watermarks,
white edges, photo-realistic, 3D render
```

#### Post-Processing Pipeline
(Same as arrow icon - background removal + alpha erosion + compression)

#### Style Reference Strategy
- **Do NOT use style reference for icons** (text-only generation)
- Icons should be simple and readable, style reference adds unwanted complexity

---

## Generation Workflow

### Hero Asset First Strategy

**CRITICAL:** Generate assets in this specific order to maximize style coherence:

1. **Block Texture (HERO ASSET)** - Text-only generation, no style reference
2. **Background** - Use block texture as style reference (prompt_strength: 0.7)
3. **Lock Overlay** - Use block texture as style reference (prompt_strength: 0.7)
4. **Arrow Icon** - Text-only generation (simplicity required)
5. **UI Icons** - Text-only generation (simplicity required)

**Rationale:** The block texture defines the theme's material and atmosphere. Using it as a style reference for background and lock overlay ensures perfect visual coherence, while keeping icons simple and readable.

---

### Vision Critique Loop

After generating each asset, use Claude's vision capabilities to validate quality:

#### Block Texture Critique Prompt
```
Analyze this texture that will be used on 3D cube faces:
1. Are the edges seamless? (Check all 4 edges - can it tile without visible seams?)
2. Does it match the "{THEME_NAME}" theme aesthetic?
3. Is there appropriate visual interest without being overwhelming?
4. Are there any obvious artifacts, text, or watermarks?

Respond with PASS or FAIL and specific reasons.
```

#### Arrow Icon Critique Prompt
```
Analyze this arrow icon for a game:
1. Does it clearly point UPWARD?
2. Is the background transparent (no white/gray edges)?
3. Is it simple and readable at small sizes?
4. Does it match the "{THEME_NAME}" theme?

Respond with PASS or FAIL and specific reasons.
```

#### Background Critique Prompt
```
Analyze this background image for a puzzle game:
1. Is it non-distracting (could you comfortably place UI and game elements on top)?
2. Does it match the "{THEME_NAME}" theme?
3. Are there any focal points that would compete for attention?
4. Is the color palette appropriate?

Respond with PASS or FAIL and specific reasons.
```

#### Lock Overlay Critique Prompt
```
Analyze this lock/chain overlay icon:
1. Is the "locked" symbolism immediately clear?
2. Is the background transparent?
3. Does it match the "{THEME_NAME}" theme?
4. Will it be visible when overlaid on various block textures?

Respond with PASS or FAIL and specific reasons.
```

**Iteration Strategy:** Max 2 attempts per asset. If FAIL on second attempt, flag for manual review.

---

## Color Palette Extraction

### Extraction Algorithm

After generating visual assets, extract colors to create `palette.json`:

1. **Sample block texture:** Extract 100 random pixel colors
2. **Sample lock overlay:** Extract 50 pixel colors for accents
3. **Calculate base colors:** Average block texture samples for base palette
4. **Find brightest emissive:** Select brightest + most saturated color for key block glow

### Brightest Emissive Selection (CRITICAL)

The key block is the visual goal - it MUST pop. Use this algorithm:

```typescript
// Find the BRIGHTEST and most SATURATED color for maximum visual impact
function findBrightestEmissive(samples: RGB[]): RGB {
  return samples.reduce((brightest, color) => {
    const brightnessCurrent = (color.r + color.g + color.b) / 3;
    const brightnessBest = (brightest.r + brightest.g + brightest.b) / 3;

    const saturationCurrent = getSaturation(color);
    const saturationBest = getSaturation(brightest);

    // Score = 50% brightness + 50% saturation
    const scoreCurrent = brightnessCurrent * 0.5 + saturationCurrent * 255 * 0.5;
    const scoreBest = brightnessBest * 0.5 + saturationBest * 255 * 0.5;

    return scoreCurrent > scoreBest ? color : brightest;
  });
}

function getSaturation(rgb: RGB): number {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max === 0 ? 0 : (max - min) / max;
}
```

### Palette Generation

Generate `palette.json` with these mappings:

```typescript
{
  "babylon": {
    "blockDefault": averageColor(blockTextureSamples),
    "arrowColor": adjustBrightness(blockDefault, 0.8),
    "background": extractDarkestTone(blockTextureSamples),
    "keyColor": brightestColor,              // Maximum visibility
    "keyEmissive": boostSaturation(brightestColor, 1.5),  // Extra glow!
    "lockedColor": desaturate(blockDefault, 0.5)
  },
  "css": {
    "headerBg": blockDefault,
    "currencyContainer": darken(blockDefault, 0.7),
    "bgBlue": blockDefault,
    "darkBlue": darken(blockDefault, 0.6),
    "gold": brightestColor,                  // Use as accent
    "green": adjustHue(brightestColor, 120), // Shift hue for variety
    "greenDark": darken(adjustHue(brightestColor, 120), 0.7)
  }
}
```

---

## Integration Patterns

### File Replacement Process

1. **Create theme folder:** `public/assets/{themeName}/`
2. **Save generated assets** to theme folder
3. **Generate palette.json** and save to theme folder
4. **Update GameConfig.ts:** Change `CURRENT_THEME` to new theme name
5. **Test with dev server:** `npm run dev`
6. **Build and validate:** `npm run build` → check dist/ size

### Code Files (No Changes Needed)

The theme system is designed to require **zero code changes** when adding new themes. All asset paths and colors are loaded dynamically from the theme folder.

### Validation Checklist

After integration:
- [ ] Run `npm run build` - must succeed
- [ ] Check `dist/` folder size <5MB
- [ ] Visually inspect game in browser
- [ ] Test block removal interaction
- [ ] Verify key blocks glow appropriately
- [ ] Check UI icons are visible
- [ ] Confirm background is non-distracting

---

## Replicate MCP Server Configuration

### Installation

The Replicate MCP server is already installed locally in this project:

```bash
npm install --save-dev replicate-mcp
```

Configuration is in [.mcp.json](.mcp.json):

```json
{
  "mcpServers": {
    "replicate": {
      "command": "node",
      "args": ["./node_modules/replicate-mcp/index.js"],
      "env": {
        "REPLICATE_API_TOKEN": "r8_your_api_token_here"
      }
    }
  }
}
```

**Note:** The API token is already configured in the project's `.mcp.json` file.

### Recommended Models

#### Image Generation
- **Primary:** `black-forest-labs/flux-1.1-pro` (highest quality, best for hero assets)
- **Style Reference:** `black-forest-labs/flux-dev` (supports image_prompt for style transfer)
- **Fast Iteration:** `black-forest-labs/flux-schnell` (quick generation for icons)

#### Post-Processing
- **Background Removal:** `cjwbw/rembg` (automatic transparent background)

### Model Parameters

**For Block Texture (Hero Asset):**
```json
{
  "model": "black-forest-labs/flux-1.1-pro",
  "input": {
    "prompt": "...",
    "width": 512,
    "height": 512,
    "num_outputs": 1,
    "output_format": "jpg",
    "output_quality": 85
  }
}
```

**For Background (with Style Reference):**
```json
{
  "model": "black-forest-labs/flux-dev",
  "input": {
    "prompt": "...",
    "image_prompt": "<hero_asset_url>",
    "prompt_strength": 0.7,
    "width": 1920,
    "height": 1080,
    "num_outputs": 1,
    "output_format": "jpg",
    "output_quality": 85
  }
}
```

**For Icons (Text-Only):**
```json
{
  "model": "black-forest-labs/flux-schnell",
  "input": {
    "prompt": "...",
    "width": 256,
    "height": 256,
    "num_outputs": 1,
    "output_format": "png"
  }
}
```

**For Background Removal:**
```json
{
  "model": "cjwbw/rembg",
  "input": {
    "image": "<generated_icon_url>"
  }
}
```

---

## Example Theme: Cyberpunk Neon

### Theme Description
A futuristic cyberpunk aesthetic with neon accents, dark metallic surfaces, and holographic elements.

### Color Palette
- **Primary:** Electric blue (#00d9ff)
- **Secondary:** Hot pink/magenta (#ff0080)
- **Accent:** Purple (#8b00ff)
- **Background:** Dark blue-black (#0a0e27)

### Asset Descriptions

**Block Texture:**
```
Metallic tech panels with neon circuit lines, seamless tileable pattern,
dark blue metallic surface with glowing cyan grid, cyberpunk aesthetic,
detailed circuit board patterns, holographic accents
```

**Arrow Icon:**
```
Glowing neon arrow pointing upward, electric blue with hot pink outline,
simple geometric shape, holographic appearance, transparent background,
bold and clear design
```

**Background:**
```
Dark cyberpunk cityscape at night, blurred neon lights in distance,
atmospheric blue-purple gradient, foggy atmosphere, distant skyscrapers,
non-distracting background for UI overlay
```

**Lock Overlay:**
```
Digital padlock with glowing neon chains, electric blue and pink colors,
holographic lock icon, circuit pattern details, transparent background,
futuristic security aesthetic
```

**Currency Icon:**
```
Neon coin with circuit patterns, holographic appearance, electric blue
and pink accents, transparent background, simple iconic design
```

**Win Icon:**
```
Futuristic piggy bank with neon glow, holographic appearance, electric blue
and pink, transparent background, cyberpunk aesthetic
```

**Logo:**
```
Arrow Block 3D logo with neon glow effect, futuristic font style,
electric blue and pink, holographic appearance, transparent background
```

---

## Common Issues & Solutions

### Issue: Texture Seams Visible

**Symptom:** Visible lines where texture edges meet on cube faces
**Cause:** Texture not truly seamless, AI generated with borders
**Solution:**
1. Strengthen "seamless tileable" emphasis in prompt
2. Add to negative prompt: "borders, frames, edges, seams"
3. Use vision critique to detect seams before integration
4. If persistent, try different model or manual tile-fixing in post-processing

### Issue: White Halos on Transparent Icons

**Symptom:** White or gray edges around icons on transparent background
**Cause:** Background removal not perfect, anti-aliasing artifacts
**Solution:**
1. **Apply alpha erosion** - shrink alpha channel by 1-2 pixels
2. Use sharp library: `.erode(1)` on alpha channel
3. Re-run background removal with different settings
4. Add to prompt: "clean edges, no white borders"

### Issue: Key Block Not Visually Prominent

**Symptom:** Key blocks blend in, not clear they're the goal
**Cause:** Emissive color not bright/saturated enough
**Solution:**
1. Use **brightest color selection algorithm** from palette extraction
2. Boost saturation 1.5x for emissive glow
3. Ensure keyEmissive is visually distinct from blockDefault
4. Test in Babylon.js with lighting to verify glow effect

### Issue: Build Size Exceeds 5MB

**Symptom:** `npm run build` produces dist/ folder >5MB
**Cause:** Assets too large, Base64 encoding adds 33% overhead
**Solution:**
1. Reduce JPEG quality: 85% → 70%
2. Optimize PNG compression (level 9)
3. Reduce dimensions if quality allows
4. Check total asset size should be <400KB before encoding

### Issue: Background Too Distracting

**Symptom:** UI elements hard to read, attention drawn away from game
**Cause:** Background has focal points or sharp details
**Solution:**
1. Add to prompt: "blurred, atmospheric, non-distracting, gradient"
2. Add to negative prompt: "sharp focus, detailed foreground, busy patterns"
3. Use vision critique to validate before integration
4. Consider applying blur in post-processing

### Issue: Theme Colors Don't Match

**Symptom:** Colors across assets feel inconsistent
**Cause:** Style reference not used, or palette extraction poor
**Solution:**
1. **Use hero asset strategy** - generate block texture first
2. Apply style reference for background and lock overlay
3. Ensure palette extraction samples from correct assets
4. Manually adjust palette.json if automatic extraction fails

---

## Production Deployment

### Single-File Bundle Configuration

For playable ad deployment, configure single-file HTML output:

**Install Plugin:**
```bash
npm install --save-dev vite-plugin-singlefile
```

**Update vite.config.ts:**
```typescript
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [viteSingleFile()],
  build: {
    target: 'esnext',
    assetsInlineLimit: 100000000, // Inline all assets
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
```

**Build and Validate:**
```bash
npm run build
# Check dist/index.html size (should be <5MB)
# Open directly in browser to test (no server needed)
```

**Size Calculation:**
- Assets: ~400KB
- Base64 overhead: +33% = ~532KB
- Code + dependencies: ~200KB
- **Total:** ~732KB ✅ (well under 5MB)

---

## Success Criteria

### Visual Quality (Subjective)
- [ ] Theme is immediately recognizable
- [ ] All assets share consistent style and color palette
- [ ] Textures have no visible artifacts or seams
- [ ] Icons are clear and readable at game size
- [ ] Overall aesthetic is professional and polished

### Technical Quality (Objective)
- [ ] Build succeeds without errors (`npm run build`)
- [ ] Bundle size <5MB
- [ ] All asset files <400KB combined
- [ ] Game plays identically to original
- [ ] No console errors or warnings
- [ ] Works offline (single-file HTML)

### Integration Quality
- [ ] Theme switching works by changing one config line
- [ ] Palette loading has fallback to wood theme
- [ ] Dev server shows changes immediately
- [ ] No hardcoded colors or asset paths in code
- [ ] All 7 assets + palette.json present

---

## Quick Reference

### File Locations
- **Theme assets:** `public/assets/{themeName}/`
- **Theme config:** [src/config/GameConfig.ts](src/config/GameConfig.ts)
- **Palette schema:** [public/assets/wood/palette.json](public/assets/wood/palette.json)
- **Build output:** `dist/`

### Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
```

### Theme Configuration
```typescript
// src/config/GameConfig.ts
export const THEME_CONFIG = {
  CURRENT_THEME: 'wood',        // Change to switch themes
  FALLBACK_THEME: 'wood',        // Always-available fallback
  ASSET_BASE_PATH: '/assets/',
  VERSION: '1.0.0',
};
```

### Asset Checklist (Per Theme)
- [ ] block-texture.jpg (512x512, <150KB, seamless)
- [ ] arrow-icon.png (256x256, <20KB, transparent)
- [ ] background.jpg (1920x1080, <100KB)
- [ ] lock-overlay.png (512x512, <50KB, transparent)
- [ ] currency-icon.png (128x128, <20KB, transparent)
- [ ] win-icon.png (128x128, <20KB, transparent)
- [ ] logo.png (128x128, <20KB, transparent)
- [ ] palette.json (color definitions)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-07
**Status:** Production Ready
