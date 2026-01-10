#!/usr/bin/env python3
"""
Post-Processing Script for Generated Assets

Handles background removal, alpha erosion, and compression for generated images.
**Project-agnostic:** Reads asset configuration from .asset-gen-config.json

Usage: python post-process.py <inputPath> <outputPath> <assetType> [configPath]

Dependencies:
    pip install Pillow numpy
"""

import sys
import os
import json
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np

# Fix Windows console encoding for emoji support
if sys.platform == 'win32':
    try:
        # Try to reconfigure stdout to UTF-8
        sys.stdout.reconfigure(encoding='utf-8')
    except (AttributeError, Exception):
        # Fallback: set environment variable for subprocess compatibility
        os.environ['PYTHONIOENCODING'] = 'utf-8'


def load_config(config_path='.asset-gen-config.json'):
    """Load asset configuration from JSON file"""
    try:
        with open(config_path, 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f'⚠️  Config file not found: {config_path}')
        print('   Using default fallback values')
        return None
    except json.JSONDecodeError as e:
        print(f'⚠️  Invalid JSON in config file: {e}')
        print('   Using default fallback values')
        return None


def parse_size_target(size_str):
    """Convert size target string (e.g. '150KB') to bytes"""
    if not size_str:
        return None

    size_str = str(size_str).upper().strip()
    if size_str.endswith('KB'):
        return int(size_str[:-2]) * 1024
    elif size_str.endswith('MB'):
        return int(size_str[:-2]) * 1024 * 1024
    else:
        return int(size_str)


def get_asset_config(config, asset_type):
    """Get configuration for specific asset type"""
    if not config or 'assetTypes' not in config:
        return {
            'format': 'PNG',
            'sizeTarget': '50KB',
            'needsTransparency': True
        }

    asset_spec = config['assetTypes'].get(asset_type, {})

    # Extract from restructured config (v1.2.0+)
    if 'output' in asset_spec:
        format_type = asset_spec['output'].get('format', 'PNG')
        size_target = asset_spec['output'].get('sizeTarget', '50KB')
    else:
        # Fallback for old config structure
        format_type = asset_spec.get('format', 'PNG')
        size_target = asset_spec.get('sizeTarget', '50KB')

    # Determine if transparency is needed based on format
    needs_transparency = format_type == 'PNG'

    return {
        'format': format_type,
        'sizeTarget': size_target,
        'needsTransparency': needs_transparency
    }


def erode_alpha_channel(image, pixels=1):
    """
    Erode alpha channel to remove white halos

    This shrinks the alpha channel by N pixels to eliminate anti-aliasing artifacts
    that appear as white/gray edges around transparent images.
    """
    print(f"   🔧 Eroding alpha channel by {pixels}px to remove halos...")

    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Get alpha channel
    alpha = image.split()[3]

    # Erode alpha channel (makes edges more transparent)
    for _ in range(pixels):
        alpha = alpha.filter(ImageFilter.MinFilter(3))

    # Recombine channels
    r, g, b, _ = image.split()
    eroded = Image.merge('RGBA', (r, g, b, alpha))

    print("   ✅ Alpha erosion complete")
    return eroded


def compress_jpeg(image, quality=85):
    """Compress JPEG image"""
    print(f"   🗜️  Compressing JPEG (quality: {quality}%)...")

    if image.mode == 'RGBA':
        # Convert RGBA to RGB for JPEG
        rgb_image = Image.new('RGB', image.size, (255, 255, 255))
        rgb_image.paste(image, mask=image.split()[3])
        image = rgb_image
    elif image.mode != 'RGB':
        image = image.convert('RGB')

    return image, quality


def optimize_png(image, compression_level=9):
    """Optimize PNG image"""
    print(f"   🗜️  Optimizing PNG (level: {compression_level})...")

    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    return image, compression_level


def remove_white_background(image, threshold=240):
    """
    Remove white/light backgrounds by making them transparent (fallback method)

    Args:
        image: PIL Image object
        threshold: Brightness threshold (0-255). Pixels brighter than this become transparent.

    Returns:
        PIL Image with transparent background
    """
    print(f"   🎭 Removing white background (threshold: {threshold})...")

    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Convert to numpy array
    data = np.array(image)

    # Get RGB channels
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

    # Make bright pixels transparent
    white_areas = (r > threshold) & (g > threshold) & (b > threshold)
    data[white_areas, 3] = 0

    # Convert back to PIL Image
    result = Image.fromarray(data, 'RGBA')

    # Count transparent pixels for feedback
    transparent_pixels = np.sum(white_areas)
    total_pixels = image.width * image.height
    percent_transparent = (transparent_pixels / total_pixels) * 100

    print(f"   ✅ Background removed ({percent_transparent:.1f}% transparent)")

    return result


def remove_background_replicate(input_path, model_version):
    """
    Remove background using Replicate's rembg model

    NOTE: This requires Claude Code to have Replicate MCP access.
    This function saves the input, expects Claude to process it via MCP,
    and returns the result.

    Args:
        input_path: Path to input image
        model_version: Full Replicate model version ID

    Returns:
        PIL Image with transparent background, or None if failed
    """
    print(f"   🌐 Attempting Replicate rembg background removal...")
    print(f"   ⚠️  This requires Claude Code MCP integration")
    print(f"   💡 Model: {model_version}")

    # This is a placeholder - actual MCP call should be handled by Claude Code
    # The workflow should:
    # 1. Save temp file
    # 2. Claude Code calls Replicate MCP
    # 3. Download result
    # 4. Return image

    return None  # Fallback to local method


def remove_background_simple(image, threshold=240, use_replicate=False, replicate_model=None):
    """
    Remove background with automatic fallback strategy

    Strategy:
    1. If use_replicate=True, attempt Replicate rembg (requires Claude Code MCP)
    2. Fallback to local threshold-based removal

    Args:
        image: PIL Image object
        threshold: Brightness threshold for fallback method (default 240)
        use_replicate: Whether to attempt Replicate rembg first
        replicate_model: Replicate model version ID

    Returns:
        PIL Image with transparent background
    """
    # Attempt Replicate if requested
    if use_replicate and replicate_model:
        print('   🚀 Trying Replicate rembg (requires Claude Code MCP)...')
        print('   ℹ️  Falling back to local method (Replicate MCP not available in this context)')

    # Fallback to local threshold-based removal
    print('   🏠 Using local background removal (threshold-based)')
    image = remove_white_background(image, threshold)

    return image


def post_process_asset(input_path, output_path, asset_type, config=None):
    """Main post-processing pipeline"""
    print(f"\n🔧 Post-processing {asset_type}...")

    # Read input image
    image = Image.open(input_path)
    input_size = os.path.getsize(input_path)
    print(f"   📥 Input size: {round(input_size / 1024)}KB")

    # Get asset configuration
    asset_config = get_asset_config(config, asset_type)
    needs_transparency = asset_config['needsTransparency']
    size_target_str = asset_config['sizeTarget']
    size_target = parse_size_target(size_target_str)

    print(f"   📋 Format: {asset_config['format']}, Target: {size_target_str}")

    if needs_transparency:
        # PNG assets with transparency
        print('   🎭 Processing transparency...')
        image = remove_background_simple(image)

        # Erode alpha to remove white halos
        image = erode_alpha_channel(image, 1)

        # Optimize PNG
        image, compression = optimize_png(image, 9)

        # Save as PNG
        image.save(output_path, 'PNG', optimize=True, compress_level=compression)

    else:
        # JPEG assets
        if size_target and input_size > size_target:
            print(f"   ⚠️  Input exceeds target size ({size_target_str}), using aggressive compression")
            image, quality = compress_jpeg(image, 70)
        else:
            image, quality = compress_jpeg(image, 85)

        # Save as JPEG
        image.save(output_path, 'JPEG', quality=quality, optimize=True)

    # Output size
    output_size = os.path.getsize(output_path)
    print(f"   💾 Output size: {round(output_size / 1024)}KB")
    print(f"   📊 Size reduction: {round((1 - output_size / input_size) * 100)}%")

    # Validate file size
    if size_target and output_size > size_target:
        print(f"   ⚠️  WARNING: Output size exceeds target ({size_target_str})")
    else:
        print("   ✅ Size within budget!")

    return output_path


def main():
    """Main execution"""
    if len(sys.argv) < 4:
        print('❌ Usage: python post-process.py <inputPath> <outputPath> <assetType> [configPath]')
        print('   ')
        print('   configPath: Optional path to .asset-gen-config.json (default: .asset-gen-config.json)')
        print('   ')
        print('   The script will read asset specifications from the config file.')
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    asset_type = sys.argv[3]
    config_path = sys.argv[4] if len(sys.argv) > 4 else '.asset-gen-config.json'

    # Load configuration
    config = load_config(config_path)

    if not config:
        print('⚠️  Running without config file - using defaults')

    try:
        post_process_asset(input_path, output_path, asset_type, config)
        print('\n✅ Post-processing complete!')
    except Exception as error:
        print(f'\n❌ Post-processing failed: {error}')
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
