# Arrow Block 3D - Tech Artist Agent Submission

## Overview

An automated game re-skinning agent built on Claude Code CLI that generates high-quality visual assets, extracts color palettes, and integrates them into a working HTML5 playable ad.

**Delivered:** Cyberpunk-themed reskin of the original wood-themed puzzle game (6 assets + palette, ~5 minutes generation time).

## Setup Instructions

### Prerequisites

```bash
# 1. Install Node.js dependencies
npm install

# 2. Install Python dependencies
cd .claude/skills/tech-artist-generate-asset
pip install -r requirements.txt
cd ../tech-artist-reskin
pip install -r requirements.txt
cd ../..

# 3. Configure Replicate MCP in .mcp.json
# Add your REPLICATE_API_TOKEN to .mcp.json
```

### Key Files

- [.asset-gen-config.json](.asset-gen-config.json) - Asset specs, prompts, validation rules
- [.mcp.json](.mcp.json) - Replicate MCP server config (add your API token here)
- [CLAUDE.md](CLAUDE.md) - Project context for Claude Code
- [.claude/skills/](.claude/skills/) - Custom skills for asset generation workflows

## Example Prompts

### Cyberpunk Theme (Delivered)

```bash
/reskin cyberpunk "High-tech dystopian future with neon lights, holographic displays, dark brushed metal surfaces, circuit board patterns, and vibrant electric blue and hot pink accents. Sleek geometric designs with digital glitch aesthetics."
```

### Other Theme Examples

```bash
# Medieval fantasy
/reskin medieval "Ancient stone castles, weathered wood, hammered iron, warm candlelight, rich royal purples and golds, ornate decorative patterns, aged parchment textures, and heraldic symbols."

# Nature/organic
/reskin nature "Organic forest environment with moss-covered wood, smooth river stones, vibrant green leaves, earthy browns, soft natural lighting, botanical patterns, and living plant elements."

# Generate single asset
/generate-asset block-texture cyberpunk "Seamless cyberpunk texture with circuit patterns..."
```

## Iteration Notes

### Architecture Evolution

**Initial Structure Problem**
- Started with flat asset structure (all files in one folder)
- Realized multiple themes needed isolation
- **Solution:** Refactored to theme-based folder system (`public/assets/{theme}/`)
- This became the foundation for the whole config-driven approach

**Skill Design Decision**
- Initially planned `/reskin` to delegate to `/generate-asset` for each asset
- Discovered `/reskin` was doing all the work directly without calling the sub-skill
- **Decision:** Keep it monolithic to avoid reloading the same prompts 6 times (token efficiency)
- Kept `/generate-asset` as standalone utility for one-off asset fixes

### Model Selection Process

Tested multiple models via Replicate MCP:
- Tried various Flux variants (schnell, dev, pro)
- Tried `google/nano-banana`
- **Winner:** `google/nano-banana`
- **Why:** Best prompt adherence + fast generation (~10-15s) + cost-effective ($0.003/image)
- Quality was noticeably better at following detailed constraints

### Prompt Fine-Tuning Issues

**1. Lock Overlay Sizing (3 iterations)**
- Problem: AI kept generating tiny padlocks with huge empty borders
- **Solution:** Added explicit prompt text: "EXTREMELY LARGE filling 85-90% edge-to-edge"
- Learning: Object size within frame needs explicit prompt guidance, not just output dimensions

**2. Currency Icon Undersizing (2 iterations)**
- Problem: Coin icons were too small in frame (looked lost)
- Similar to lock overlay issue
- **Solution:** Added "filling 90-95% of canvas" to prompt + vision validation checks
- Fixed padding inconsistency in config (was 3%, changed to 0)

**3. Over-Constrained Icon Prompts (multiple iterations)**
- Problem: Initial prompts had extensive negative rules ("no shadows, no 3D, no backgrounds, no gradients, no...")
- Result: AI produced overly safe, bland, or opposite-effect outputs
- **Solution:** Simplified prompts dramatically, kept only essential positive descriptions
- Learning: Too many restrictions confuse the model; clear positive direction works better

**4. Background Removal Artifacts**
- Problem: White halos around transparent icon edges
- Replicate's `cjwbw/rembg` model left artifacts
- **Solution:** Added 1-2 pixel alpha erosion in post-processing pipeline
- Now standard step for all transparent assets

### What Worked Flawlessly

- **MCP Integration:** Replicate MCP server was rock solid (image generation + background removal)
- **Vision Critique Loop:** Caught every issue before integration (seamless check, halos, sizing)
- **Python Post-Processing:** Scripts ran reliably (resize, compress, alpha erosion, centering)
- **Color Extraction:** Vision-based palette extraction worked first try
- **Config Structure:** `.asset-gen-config.json` made iteration fast (change prompt, regenerate)
- **Post-Processing Validation:** Vision checks after each Python operation caught silent failures

### Final Results

| Asset | Size | Status |
|-------|------|--------|
| block-texture.jpg | 49KB | ✅ |
| background.jpg | 48KB | ✅ |
| arrow-icon.png | 2.5KB | ✅ |
| lock-overlay.png | 102KB | ✅ |
| currency-icon.png | 8.1KB | ✅ |
| logo.png | 5.5KB | ✅ |
| **Total** | **215KB** | ✅ (target: <400KB) |

**Build size:** 732KB (target: <5MB) ✅

## Design Reasoning

### Why These Skills?

**Two-Skill Architecture:**
1. `/reskin` - Full theme generation workflow
2. `/generate-asset` - Single asset regeneration utility

**Why Not One Combined Skill?**
- `/reskin` handles the complete workflow (6 assets + palette)
- `/generate-asset` provides surgical fixes without regenerating everything
- Separation keeps each skill focused and maintainable

**Why Not More Granular Skills?**
- Initially considered separate skills for generation, post-processing, and validation
- Realized this would fragment the workflow and require complex state management
- Monolithic `/reskin` is more token-efficient (loads config/prompts once, not 6 times)

### Why This Structure?

**Config-Driven Over Code-Driven:**
- [.asset-gen-config.json](.asset-gen-config.json) defines all asset specs, prompts, and validation rules
- Changing themes requires editing JSON, not code
- Skills remain project-agnostic and reusable

**Vision-Based Validation:**
- Claude's vision model provides semantic validation (not just pixel checks)
- Catches issues like "non-seamless texture" or "white halos" that scripts miss
- Post-processing validation ensures Python operations succeeded

**Hero Asset Strategy:**
- Generate `block-texture` first, use it as style reference for other assets
- Ensures visual coherence across all generated assets
- Config's `workflow.generationOrder` array enforces this sequence

**MCP Over Custom API Calls:**
- Replicate MCP server handles both image generation and background removal
- No need to write custom API integration code
- Claude Code orchestrates everything through MCP tools

## Testing the Game

```bash
npm run dev      # Development server at http://localhost:5173
npm run build    # Production build to dist/
npm run preview  # Preview production build
```
