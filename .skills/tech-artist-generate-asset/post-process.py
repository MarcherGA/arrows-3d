#!/usr/bin/env python3
"""
Post-Processing Script for Generated Assets

Handles background removal, alpha erosion, and compression for generated images.

Usage: python post-process.py <inputPath> <outputPath> <assetType>

Dependencies:
    pip install Pillow numpy
"""

import sys
import os
from pathlib import Path
from PIL import Image, ImageFilter
import numpy as np


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


def remove_background_simple(image):
    """
    Ensure alpha channel exists
    For production, use Replicate's rembg model instead
    """
    print('   ⚠️  Note: Using simple alpha channel preservation.')
    print('   💡 For production, use Replicate rembg model via MCP')

    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    return image


def post_process_asset(input_path, output_path, asset_type):
    """Main post-processing pipeline"""
    print(f"\n🔧 Post-processing {asset_type}...")

    # Read input image
    image = Image.open(input_path)
    input_size = os.path.getsize(input_path)
    print(f"   📥 Input size: {round(input_size / 1024)}KB")

    # Determine processing steps based on asset type
    needs_transparency = asset_type in [
        'arrow-icon',
        'lock-overlay',
        'currency-icon',
        'piggy-bank',
        'win-icon',
        'logo'
    ]

    if needs_transparency:
        # Step 1: Remove background (use Replicate rembg in production)
        print('   🎭 Processing transparency...')
        image = remove_background_simple(image)

        # Step 2: Erode alpha to remove white halos
        image = erode_alpha_channel(image, 1)

        # Step 3: Optimize PNG
        image, compression = optimize_png(image, 9)

        # Save as PNG
        image.save(output_path, 'PNG', optimize=True, compress_level=compression)

    else:
        # JPEG assets (block-texture, background)
        size_targets = {
            'block-texture': 150 * 1024,
            'background': 100 * 1024
        }
        target_size = size_targets.get(asset_type, 100 * 1024)

        if input_size > target_size:
            print(f"   ⚠️  Input exceeds target size ({round(target_size / 1024)}KB), using aggressive compression")
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
    size_targets = {
        'block-texture': 150 * 1024,
        'background': 100 * 1024,
        'lock-overlay': 50 * 1024,
        'arrow-icon': 20 * 1024,
        'currency-icon': 20 * 1024,
        'piggy-bank': 20 * 1024,
        'win-icon': 20 * 1024,
        'logo': 20 * 1024
    }

    target_size = size_targets.get(asset_type, 50 * 1024)
    if output_size > target_size:
        print(f"   ⚠️  WARNING: Output size exceeds target ({round(target_size / 1024)}KB)")
    else:
        print("   ✅ Size within budget!")

    return output_path


def main():
    """Main execution"""
    if len(sys.argv) != 4:
        print('❌ Usage: python post-process.py <inputPath> <outputPath> <assetType>')
        print('   Asset types: block-texture, arrow-icon, background, lock-overlay, currency-icon, piggy-bank, win-icon, logo')
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    asset_type = sys.argv[3]

    try:
        post_process_asset(input_path, output_path, asset_type)
        print('\n✅ Post-processing complete!')
    except Exception as error:
        print(f'\n❌ Post-processing failed: {error}')
        sys.exit(1)


if __name__ == '__main__':
    main()
