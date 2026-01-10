# Tech Artist: Generate Asset Skill

Generate high-quality game assets using AI image generation with automatic quality validation and iteration.

## Description

This skill generates individual themed assets (textures, icons, backgrounds) using AI models via Replicate, with built-in quality checks and post-processing.

## Self-Contained Structure

```
tech-artist-generate-asset/
├── README.md                    # This file
├── skill.md                     # Skill documentation for AI agents
├── requirements.txt             # Python dependencies
├── post-process.py              # Post-processing pipeline
├── remove-bg.py                 # Background removal utility
├── image-resize-helper.py       # Image resizing utilities
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
# Test scripts
python post-process.py
python image-resize-helper.py
```

## Usage

### Post-Processing

Process generated assets with background removal, compression, and optimization:

```bash
python post-process.py <inputPath> <outputPath> <assetType>

# Example
python post-process.py temp/arrow-raw.webp output/arrow-icon.png arrow-icon
```

**Asset types:**
- `block-texture` - JPEG texture (150KB target)
- `background` - JPEG background (100KB target)
- `arrow-icon` - PNG icon (20KB target)
- `lock-overlay` - PNG overlay (50KB target)
- `currency-icon` - PNG icon (20KB target)
- `piggy-bank` - PNG icon (20KB target)
- `logo` - PNG icon (20KB target)

### Background Removal

Remove backgrounds from images to make them transparent:

```bash
python remove-bg.py <inputPath> <outputPath> [threshold]

# Examples
python remove-bg.py input.png output.png
python remove-bg.py icon.webp icon-transparent.png 240
python remove-bg.py arrow.png arrow-nobg.png 230
```

**Parameters:**
- `threshold` - Brightness threshold (0-255, default: 240). Pixels brighter than this become transparent.

**Note:** For production use with AI-generated assets, use Replicate's `cjwbw/rembg` model via MCP server for better results. This script provides a simple color-based fallback.

### Image Resizing

Resize images with various strategies:

```bash
# Basic resize
python image-resize-helper.py <input> <output> <width> <height> [strategy]

# Strategies:
# - contain-centered: Fit within bounds, center with padding (for icons)
# - cover-crop: Cover bounds, crop excess (for textures/backgrounds)
# - stretch: Exact dimensions (may distort)

# Examples
python image-resize-helper.py input.png output.png 256 256 contain-centered
python image-resize-helper.py texture.jpg texture.jpg 512 512 cover-crop
```

**Advanced operations:**

```bash
# Batch resize from config
python image-resize-helper.py --batch ../../.asset-gen-config.json temp/ output/

# Remove white colors (make transparent)
python image-resize-helper.py --remove-white input.png output.png 240

# Center icon with padding
python image-resize-helper.py --center input.png output.png 128 0.1

# Erode alpha channel (remove halos)
python image-resize-helper.py --erode input.png output.png 1
```

## Dependencies

- **Pillow** - Image processing (replaces Node.js Sharp)
- **numpy** - Numerical operations for image manipulation

## Integration

This skill is referenced in `.asset-gen-config.json`:

```json
{
  "postProcessing": {
    "resizeHelper": ".skills/tech-artist-generate-asset/image-resize-helper.py"
  },
  "dependencies": {
    "postProcessingScript": {
      "scriptPath": ".skills/tech-artist-generate-asset/post-process.py"
    },
    "resizeHelper": {
      "scriptPath": ".skills/tech-artist-generate-asset/image-resize-helper.py"
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
   cp -r tech-artist-generate-asset ~/.claude/skills/
   ```

2. Install dependencies in the global location:
   ```bash
   cd ~/.claude/skills/tech-artist-generate-asset
   pip install -r requirements.txt
   ```

3. Update project configs to reference the global path:
   ```json
   {
     "postProcessing": {
       "resizeHelper": "~/.claude/skills/tech-artist-generate-asset/image-resize-helper.py"
     }
   }
   ```

## Version

- **Version:** 2.0.0
- **Language:** Python 3.8+
- **Updated:** 2026-01-09
