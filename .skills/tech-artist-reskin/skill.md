# Tech Artist: Reskin Game

Fully automated game re-skinning orchestrator. Generates all visual assets for a new theme, extracts colors, integrates into the game, and validates the build.

## Usage

```
/reskin <theme_name> <theme_description>
```

**Parameters:**
- `theme_name`: Theme identifier (e.g., "cyberpunk", "medieval", "spooky")
- `theme_description`: Comprehensive description of the theme aesthetic and style

**Example:**
```
/reskin cyberpunk "Futuristic cyberpunk aesthetic with neon accents, dark metallic surfaces, electric blue and hot pink colors, holographic elements, tech panels with circuit patterns, atmospheric city vibes"
```

## What This Skill Does

**End-to-end automated workflow:**

1. ✅ **Initialization** - Validate inputs, create theme folder
2. 🎨 **Asset Generation** - Generate all 7 assets with quality validation
3. 🎨 **Color Extraction** - Sample images and create palette.json
4. 📦 **Integration** - Save assets to theme folder
5. 🔄 **Theme Switch** - Update GameConfig.ts to use new theme
6. 🏗️ **Build Validation** - Run build, check size, verify success
7. 📊 **Success Report** - Summary with file sizes and next steps

**Total Time:** ~10-15 minutes for complete theme generation

## Workflow Phases

### Phase 1: Initialization (30 seconds)

**Tasks:**
1. Parse and validate theme name and description
2. Create theme folder: `public/assets/{themeName}/`
3. Create temp directory for generation: `temp/{themeName}/`
4. Validate Replicate MCP is available
5. Check Sharp library is installed

**Validation:**
- Theme name is alphanumeric (lowercase, hyphens ok)
- Theme description is comprehensive (>50 characters)
- Theme folder doesn't already exist (or confirm overwrite)
- Required dependencies available

**Output:**
```
✅ Initialization Complete
Theme: cyberpunk
Folder: public/assets/cyberpunk/
Description: Futuristic cyberpunk aesthetic...
Ready to generate 7 assets.
```

---

### Phase 2: Asset Generation (8-12 minutes)

**Critical:** Generate assets in specific order for style coherence

#### Step 2.1: Generate Hero Asset (Block Texture) - FIRST

**Why first:** This defines the theme's material and atmosphere

```
Asset: block-texture
Model: black-forest-labs/flux-1.1-pro
Dimensions: 512x512
Format: JPEG
Style Reference: NONE (text-only generation)
```

**Prompt:**
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

**Vision Critique:** Validate seamless tiling, theme match, quality

**Output:** `temp/cyberpunk/block-texture.jpg`

---

#### Step 2.2: Generate Background (WITH Style Reference)

**Why style reference:** Ensures atmospheric coherence with block texture

```
Asset: background
Model: black-forest-labs/flux-dev
Dimensions: 1920x1080
Format: JPEG
Style Reference: block-texture.jpg (prompt_strength: 0.7)
```

**Prompt:**
```
Create an atmospheric background for a puzzle game interface.

REQUIREMENTS (CRITICAL):
- Non-distracting (suitable for UI overlay)
- Blurred, gradient, or atmospheric (NOT detailed foreground)
- Appropriate for {THEME_NAME} aesthetic
- 16:9 aspect ratio (1920x1080)
- Dark to medium tones

STYLE: {THEME_DESCRIPTION}

NEGATIVE PROMPT: sharp focus, detailed foreground, busy patterns, text,
watermarks, UI elements, characters, centered objects
```

**Vision Critique:** Validate non-distracting, theme match, UI compatibility

**Output:** `temp/cyberpunk/background.jpg`

---

#### Step 2.3: Generate Lock Overlay (WITH Style Reference)

**Why style reference:** Material style should match block texture

```
Asset: lock-overlay
Model: black-forest-labs/flux-1.1-pro
Dimensions: 512x512
Format: PNG
Style Reference: block-texture.jpg (prompt_strength: 0.7)
```

**Prompt:**
```
Create a lock/chain overlay icon for a puzzle game.

REQUIREMENTS (CRITICAL):
- Clear "locked" symbolism (padlock, chain, barrier, etc.)
- Completely transparent background
- Visible when overlaid on textured surfaces
- Square format (512x512)
- Bold design with good contrast

STYLE: {THEME_DESCRIPTION}

NEGATIVE PROMPT: background, solid fill, subtle details, text, watermarks,
white edges, multiple locks, realistic photography
```

**Post-Processing:**
1. Background removal (`cjwbw/rembg`)
2. Alpha erosion (1px)
3. PNG compression

**Vision Critique:** Validate lock symbolism, transparency, visibility

**Output:** `temp/cyberpunk/lock-overlay.png`

---

#### Step 2.4: Generate Arrow Icon (Text-Only)

**Why no style reference:** Icons need simplicity and clarity

```
Asset: arrow-icon
Model: black-forest-labs/flux-schnell
Dimensions: 256x256
Format: PNG
Style Reference: NONE (text-only for simplicity)
```

**Prompt:**
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

**Post-Processing:**
1. Background removal
2. Alpha erosion (1px)
3. PNG compression

**Vision Critique:** Validate direction, transparency, readability

**Output:** `temp/cyberpunk/arrow-icon.png`

---

#### Step 2.5-2.7: Generate UI Icons (Text-Only)

Generate in parallel for speed:
- `currency-icon.png` (128x128)
- `win-icon.png` (128x128)
- `logo.png` (128x128)

**Model:** `black-forest-labs/flux-schnell`
**Style Reference:** NONE (text-only)

**Prompts:** *(Customized per icon type, see CLAUDE.md)*

**Post-Processing:** Same as arrow icon

**Output:** `temp/cyberpunk/{icon}.png`

---

**Phase 2 Summary:**
```
✅ Asset Generation Complete (7/7 assets)

Generated:
- block-texture.jpg (142KB) ✓
- background.jpg (98KB) ✓
- lock-overlay.png (48KB) ✓
- arrow-icon.png (18KB) ✓
- currency-icon.png (15KB) ✓
- win-icon.png (12KB) ✓
- logo.png (14KB) ✓

Total Size: 347KB (within 400KB budget)
All assets passed vision critique.
```

---

### Phase 3: Color Extraction (1 minute)

**Algorithm:**

```typescript
async function extractColorsForPalette(
  blockTextureBuffer: Buffer,
  lockOverlayBuffer: Buffer,
  themeName: string
): Promise<ThemePalette> {

  // 1. Sample block texture (100 random pixels)
  const blockSamples = await sampleImageColors(blockTextureBuffer, 100);
  const avgBlockColor = averageColors(blockSamples);

  // 2. Sample lock overlay for accent colors (50 pixels)
  const lockSamples = await sampleImageColors(lockOverlayBuffer, 50);

  // 3. Find BRIGHTEST and most SATURATED color (for key block glow)
  const brightestColor = lockSamples.reduce((brightest, color) => {
    const brightnessCurrent = (color.r + color.g + color.b) / 3;
    const brightnessBest = (brightest.r + brightest.g + brightest.b) / 3;

    const saturationCurrent = getSaturation(color);
    const saturationBest = getSaturation(brightest);

    // Score = 50% brightness + 50% saturation
    const scoreCurrent = brightnessCurrent * 0.5 + saturationCurrent * 255 * 0.5;
    const scoreBest = brightnessBest * 0.5 + saturationBest * 255 * 0.5;

    return scoreCurrent > scoreBest ? color : brightest;
  });

  // 4. Generate palette.json
  return {
    name: themeName,
    version: "1.0.0",
    babylon: {
      blockDefault: rgbToArray(avgBlockColor),
      arrowColor: rgbToArray(adjustBrightness(avgBlockColor, 0.8)),
      background: rgbToArray4(extractBackgroundColor(blockSamples)),
      keyColor: rgbToArray(brightestColor),  // Brightest for visibility
      keyEmissive: rgbToArray(boostSaturation(brightestColor, 1.5)),  // Extra glow!
      lockedColor: rgbToArray(desaturate(avgBlockColor, 0.5)),
    },
    css: {
      headerBg: rgbToHex(avgBlockColor),
      currencyContainer: rgbToHex(adjustBrightness(avgBlockColor, 0.7)),
      bgBlue: rgbToHex(avgBlockColor),
      darkBlue: rgbToHex(adjustBrightness(avgBlockColor, 0.6)),
      gold: rgbToHex(brightestColor),  // Use brightest as accent
      green: rgbToHex(adjustHue(brightestColor, 120)),
      greenDark: rgbToHex(adjustBrightness(adjustHue(brightestColor, 120), 0.7)),
    },
  };
}
```

**Output:**
```
✅ Color Palette Extracted

Sampled 100 pixels from block texture
Sampled 50 pixels from lock overlay
Brightest emissive: rgb(0, 217, 255) - Electric blue

Palette saved: temp/cyberpunk/palette.json
```

---

### Phase 4: Integration (1 minute)

**Tasks:**

1. **Copy all assets to theme folder**
   ```bash
   cp temp/cyberpunk/* public/assets/cyberpunk/
   ```

2. **Verify all 8 files present**
   - block-texture.jpg ✓
   - background.jpg ✓
   - lock-overlay.png ✓
   - arrow-icon.png ✓
   - currency-icon.png ✓
   - win-icon.png ✓
   - logo.png ✓
   - palette.json ✓

3. **Update GameConfig.ts**
   ```typescript
   // Change line ~3
   CURRENT_THEME: 'cyberpunk',  // Was: 'wood'
   ```

**Output:**
```
✅ Integration Complete

Assets copied to: public/assets/cyberpunk/
Theme switched to: cyberpunk
GameConfig.ts updated: src/config/GameConfig.ts:3
```

---

### Phase 5: Build Validation (2 minutes)

**Tasks:**

1. **Run development server test**
   ```bash
   npm run dev &
   # Wait 5s for server start
   # Check no errors in console
   # Kill server
   ```

2. **Run production build**
   ```bash
   npm run build
   ```

3. **Check bundle size**
   ```bash
   du -sh dist/
   # Must be <5MB
   ```

4. **Validate dist/ contents**
   - index.html exists ✓
   - Assets inlined (for single-file deployment) ✓
   - No errors in build output ✓

**If build fails:**
- Rollback GameConfig.ts to previous theme
- Keep generated assets in temp/ for debugging
- Report error and recommendations

**If bundle size >5MB:**
- Compress assets (reduce JPEG quality to 70%)
- Retry build
- If still over, recommend dimension reduction

**Output:**
```
✅ Build Validation Complete

Build status: SUCCESS
Bundle size: 732KB (well under 5MB limit)
Dev server: No errors
Assets inlined: Yes (single-file ready)

Build output: dist/index.html
```

---

### Phase 6: Success Report (10 seconds)

**Generate comprehensive report:**

```markdown
# Cyberpunk Theme Generation - SUCCESS ✅

## Summary
Theme: **cyberpunk**
Description: Futuristic cyberpunk aesthetic with neon accents...
Total Time: 12 minutes 34 seconds

## Assets Generated (7/7)

| Asset | Size | Format | Status |
|-------|------|--------|--------|
| block-texture.jpg | 142KB | JPEG 512x512 | ✅ PASS |
| background.jpg | 98KB | JPEG 1920x1080 | ✅ PASS |
| lock-overlay.png | 48KB | PNG 512x512 | ✅ PASS |
| arrow-icon.png | 18KB | PNG 256x256 | ✅ PASS |
| currency-icon.png | 15KB | PNG 128x128 | ✅ PASS |
| win-icon.png | 12KB | PNG 128x128 | ✅ PASS |
| logo.png | 14KB | PNG 128x128 | ✅ PASS |
| **Total** | **347KB** | | **< 400KB ✓** |

## Color Palette

**Key Colors:**
- Brightest Emissive: rgb(0, 217, 255) - Electric Blue
- Block Base: rgb(28, 35, 58) - Dark Metallic
- Background: rgb(10, 14, 39) - Deep Blue-Black

**Palette:** `public/assets/cyberpunk/palette.json`

## Vision Critique Summary

All assets passed visual quality validation:
- Block texture: Seamless tiling confirmed ✓
- Arrow icon: Clear upward direction, transparent ✓
- Background: Non-distracting, suitable for UI ✓
- Lock overlay: Clear symbolism, good contrast ✓
- UI icons: Simple, readable, theme-consistent ✓

## Build Validation

- ✅ Build: SUCCESS
- ✅ Bundle size: 732KB (< 5MB target)
- ✅ Dev server: No errors
- ✅ Single-file ready: Yes

## Integration Status

- ✅ Assets copied to: `public/assets/cyberpunk/`
- ✅ Theme switched: `CURRENT_THEME = 'cyberpunk'`
- ✅ GameConfig updated: `src/config/GameConfig.ts:3`

## Next Steps

1. **Test the game:**
   ```bash
   npm run dev
   # Open http://localhost:5173
   ```

2. **Preview build:**
   ```bash
   npm run preview
   ```

3. **Deploy single-file playable:**
   - Install: `npm install --save-dev vite-plugin-singlefile`
   - Configure vite.config.ts (see CLAUDE.md)
   - Build: `npm run build`
   - Output: `dist/index.html` (<5MB)

4. **Switch themes anytime:**
   ```typescript
   // src/config/GameConfig.ts
   CURRENT_THEME: 'wood',     // Back to original
   CURRENT_THEME: 'cyberpunk', // New theme
   ```

## Iteration Notes

**What Worked Well:**
- Hero asset strategy ensured perfect style coherence
- Vision critique caught 0 quality issues (all passed first try)
- Brightest emissive selection created stunning key block glow
- All assets within size budget

**Challenges Encountered:**
*(None - generation succeeded on all assets)*

**Future Improvements:**
- Consider adding music/SFX generation
- Explore 3D model variations
- Add theme preview thumbnails

---

**Theme Ready for Production** ✅
