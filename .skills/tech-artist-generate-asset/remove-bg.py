#!/usr/bin/env python3
"""
Background Removal Helper Script

Removes backgrounds from images, making them transparent.
For production use, this should call Replicate's rembg model via MCP.
This script provides a simple fallback using color-based removal.

Usage: python remove-bg.py <inputPath> <outputPath> [threshold]

Examples:
    python remove-bg.py input.png output.png
    python remove-bg.py input.png output.png 240

Dependencies:
    pip install Pillow numpy
"""

import sys
import os
from PIL import Image
import numpy as np


def remove_white_background(image, threshold=240):
    """
    Remove white/light backgrounds by making them transparent

    Args:
        image: PIL Image object
        threshold: Brightness threshold (0-255). Pixels brighter than this become transparent.

    Returns:
        PIL Image with transparent background
    """
    print(f"   🎭 Removing background (threshold: {threshold})...")

    # Convert to RGBA if not already
    if image.mode != 'RGBA':
        image = image.convert('RGBA')

    # Convert to numpy array
    data = np.array(image)

    # Get RGB channels
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]

    # Calculate brightness (average of RGB)
    brightness = (r.astype(float) + g.astype(float) + b.astype(float)) / 3.0

    # Make bright pixels transparent
    mask = brightness > threshold
    a[mask] = 0

    # Update alpha channel
    data[:, :, 3] = a

    # Convert back to PIL Image
    result = Image.fromarray(data, 'RGBA')

    # Count transparent pixels
    transparent_pixels = np.sum(mask)
    total_pixels = image.width * image.height
    percent_transparent = (transparent_pixels / total_pixels) * 100

    print(f"   ✅ Background removed ({percent_transparent:.1f}% transparent)")

    return result


def remove_background_replicate(image_path):
    """
    Remove background using Replicate's rembg model (recommended for production)

    NOTE: This requires MCP server access and API token.
    This is a placeholder - actual implementation should use Replicate MCP.

    Args:
        image_path: Path to input image

    Returns:
        PIL Image with transparent background
    """
    print("   ⚠️  Replicate rembg not implemented in this script")
    print("   💡 Use MCP server: mcp__replicate__create_predictions with model 'cjwbw/rembg'")
    print("   ℹ️  Falling back to simple color-based removal...")

    # Fallback to simple removal
    image = Image.open(image_path)
    return remove_white_background(image)


def remove_background(input_path, output_path, threshold=240, use_replicate=False):
    """
    Main background removal function

    Args:
        input_path: Path to input image
        output_path: Path to save output image
        threshold: Brightness threshold for color-based removal
        use_replicate: Whether to use Replicate rembg (requires MCP)
    """
    print(f"\n🎭 Removing background from {os.path.basename(input_path)}...")

    # Read input
    input_size = os.path.getsize(input_path)
    print(f"   📥 Input size: {round(input_size / 1024)}KB")

    # Remove background
    if use_replicate:
        image = remove_background_replicate(input_path)
    else:
        image = Image.open(input_path)
        image = remove_white_background(image, threshold)

    # Save output
    image.save(output_path, 'PNG', optimize=True, compress_level=9)

    output_size = os.path.getsize(output_path)
    print(f"   💾 Output size: {round(output_size / 1024)}KB")
    print(f"   ✅ Saved to {output_path}")


def main():
    """Main execution"""
    # Set UTF-8 encoding for Windows console
    if sys.platform == 'win32':
        try:
            sys.stdout.reconfigure(encoding='utf-8')
        except:
            pass

    if len(sys.argv) < 3:
        print('Usage: python remove-bg.py <inputPath> <outputPath> [threshold]')
        print('')
        print('Arguments:')
        print('  inputPath   - Path to input image')
        print('  outputPath  - Path to save transparent PNG')
        print('  threshold   - Optional brightness threshold (0-255, default: 240)')
        print('')
        print('Examples:')
        print('  python remove-bg.py input.png output.png')
        print('  python remove-bg.py input.png output.png 240')
        print('  python remove-bg.py icon.webp icon-transparent.png 230')
        sys.exit(1)

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    threshold = int(sys.argv[3]) if len(sys.argv) > 3 else 240

    # Validate input file exists
    if not os.path.exists(input_path):
        print(f'Error: Input file not found: {input_path}')
        sys.exit(1)

    try:
        remove_background(input_path, output_path, threshold)
        print('\nBackground removal complete!')
    except Exception as error:
        print(f'\nBackground removal failed: {error}')
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
