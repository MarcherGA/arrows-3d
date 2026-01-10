# Tech Artist Skills - Setup Guide

## Prerequisites

The tech artist skills are now **project-agnostic** and use Python instead of Node.js to avoid dependency conflicts with target projects.

### Required Software

1. **Python 3.8+**
   - Download from [python.org](https://www.python.org/downloads/)
   - Verify installation: `python --version` or `python3 --version`

2. **pip** (Python package manager)
   - Usually comes with Python
   - Verify: `pip --version` or `pip3 --version`

## Installation

### 1. Install Python Dependencies

From the `.claude/skills` directory, run:

```bash
pip install -r requirements.txt
```

Or if using `pip3`:

```bash
pip3 install -r requirements.txt
```

This installs:
- **Pillow**: Image processing library (replaces Sharp from Node.js)
- **numpy**: Numerical computing for color manipulation

### 2. Verify Installation

Test each script:

```bash
# Test image resize helper
python .claude/skills/tech-artist-generate-asset/image-resize-helper.py

# Test post-processing
python .claude/skills/tech-artist-generate-asset/post-process.py

# Test color extraction
python .claude/skills/tech-artist-reskin/extract-colors.py
```

You should see usage instructions for each script.

## Why Python?

### Before (Node.js):
- ❌ Required `npm install` in target project
- ❌ Added `node_modules` to project
- ❌ Potential version conflicts with project dependencies
- ❌ Not truly project-agnostic

### After (Python):
- ✅ Standalone scripts with system-wide Python installation
- ✅ No impact on target project's dependencies
- ✅ Works with ANY project (JavaScript, Python, Go, Rust, etc.)
- ✅ Single `requirements.txt` for all skills
- ✅ Cross-platform (Windows, macOS, Linux)

## Usage Examples

### Image Resize Helper

```bash
# Resize with contain-centered strategy (for icons)
python image-resize-helper.py input.png output.png 256 256 contain-centered

# Resize with cover-crop strategy (for textures)
python image-resize-helper.py texture.jpg texture.jpg 512 512 cover-crop

# Batch resize all assets from config
python image-resize-helper.py --batch .asset-gen-config.json temp/theme/ output/theme/

# Remove white colors (make transparent)
python image-resize-helper.py --remove-white input.png output.png 240

# Center icon with padding
python image-resize-helper.py --center input.png output.png 128 0.1

# Erode alpha channel (remove halos)
python image-resize-helper.py --erode input.png output.png 1
```

### Post-Processing

```bash
# Post-process an asset
python post-process.py input.webp output.png arrow-icon

# Asset types: block-texture, arrow-icon, background, lock-overlay,
#              currency-icon, piggy-bank, win-icon, logo
```

### Color Extraction

```bash
# Extract color palette from theme assets
python extract-colors.py path/to/block-texture.jpg path/to/lock-overlay.png themeName
```

## Troubleshooting

### "python: command not found"

Try `python3` instead of `python`:

```bash
python3 --version
python3 image-resize-helper.py ...
```

### "No module named 'PIL'"

Install Pillow:

```bash
pip install Pillow
# or
pip3 install Pillow
```

### Permission Denied (Unix/Linux/macOS)

Make scripts executable:

```bash
chmod +x .claude/skills/tech-artist-generate-asset/*.py
chmod +x .claude/skills/tech-artist-reskin/*.py
```

Then run with `./script.py` instead of `python script.py`.

## Integration with Asset Generation Workflow

The [.asset-gen-config.json](../.asset-gen-config.json) now references Python scripts:

```json
{
  "postProcessing": {
    "resizeHelper": ".claude/skills/tech-artist-generate-asset/image-resize-helper.py"
  },
  "dependencies": {
    "postProcessingScript": {
      "scriptPath": ".claude/skills/tech-artist-generate-asset/post-process.py"
    },
    "resizeHelper": {
      "scriptPath": ".claude/skills/tech-artist-generate-asset/image-resize-helper.py"
    },
    "colorExtractionScript": {
      "scriptPath": ".claude/skills/tech-artist-reskin/extract-colors.py"
    }
  }
}
```

AI agents will automatically use Python scripts when processing assets.

## Migrating to New Projects

To use these skills in a new project:

1. Copy the `.claude/skills` folder to the new project
2. Copy `.asset-gen-config.json` and customize it
3. Install Python dependencies: `pip install -r .claude/skills/requirements.txt`
4. Update paths in `.asset-gen-config.json` to match new project structure

That's it! No Node.js dependencies needed in the target project.
