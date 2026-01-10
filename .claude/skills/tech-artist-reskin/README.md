# Tech Artist: Reskin Skill

Extract color palettes and generate themed asset variations from existing game assets.

## Description

This skill analyzes generated theme assets and extracts optimal color palettes for use in game engines and CSS, using intelligent pixel sampling and color theory.

## Self-Contained Structure

```
tech-artist-reskin/
├── README.md                    # This file
├── skill.md                     # Skill documentation for AI agents
├── requirements.txt             # Python dependencies
├── extract-colors.py            # Color palette extraction
└── (other utilities)
```

## Setup

### 1. Install Dependencies

```bash
# From this directory
pip install -r requirements.txt
```

Or use a virtual environment:

```bash
# Create virtual environment
python -m venv venv

# Activate it
source venv/bin/activate  # macOS/Linux
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt
```

### 2. Verify Installation

```bash
# Test script
python extract-colors.py
```

## Usage

### Color Extraction

Extract color palette from theme assets:

```bash
python extract-colors.py <blockTexturePath> <lockOverlayPath> <themeName>

# Example
python extract-colors.py \
  ../temp/cyberpunk/block-texture.jpg \
  ../temp/cyberpunk/lock-overlay.png \
  cyberpunk
```

**Output:** JSON palette with:
- **Babylon.js colors** (RGB normalized 0-1)
  - Block colors, arrow colors, key colors, locked colors
  - Background scene color
  - Emissive glow colors
- **CSS colors** (hex format)
  - Header, UI, button colors
  - Theme accent colors

**Example output:**
```json
{
  "name": "Cyberpunk",
  "version": "1.0.0",
  "babylon": {
    "blockDefault": [1.0, 1.0, 1.0],
    "arrowColor": [0.0, 0.85, 1.0],
    "keyColor": [1.0, 0.0, 0.5],
    "keyEmissive": [1.5, 0.0, 0.75],
    "background": [0.04, 0.06, 0.15, 1.0]
  },
  "css": {
    "headerBg": "#1a2a4e",
    "accent": "#ff0080",
    "buttonPrimary": "#00d9ff"
  }
}
```

### How It Works

1. **Samples pixels** from block texture and lock overlay
2. **Analyzes brightness and saturation** to find key colors
3. **Applies color theory** (boost saturation, adjust brightness, desaturate)
4. **Generates harmonious palette** for both 3D engine and UI

### Color Selection Strategy

- **Block texture** → Base colors, background tones, arrow colors
- **Lock overlay** → Accent colors, key block glow (picks brightest/most saturated)
- **Derived colors** → Button colors, locked states, UI variants

## Dependencies

- **Pillow** - Image loading and pixel sampling
- **numpy** - Color calculations and transformations

## Integration

This skill is referenced in `.asset-gen-config.json`:

```json
{
  "dependencies": {
    "colorExtractionScript": {
      "scriptPath": ".claude/skills/tech-artist-reskin/extract-colors.py",
      "fallback": "Use vision-based extraction"
    }
  }
}
```

## Moving to Global Skills

To use this skill globally across projects:

1. Copy this entire folder to a global location:
   ```bash
   # Example global location
   mkdir -p ~/.claude/skills
   cp -r tech-artist-reskin ~/.claude/skills/
   ```

2. Install dependencies in the global location:
   ```bash
   cd ~/.claude/skills/tech-artist-reskin
   pip install -r requirements.txt
   ```

3. Update project configs to reference the global path:
   ```json
   {
     "dependencies": {
       "colorExtractionScript": {
         "scriptPath": "~/.claude/skills/tech-artist-reskin/extract-colors.py"
       }
     }
   }
   ```

## Version

- **Version:** 2.0.0
- **Language:** Python 3.8+
- **Updated:** 2026-01-09
