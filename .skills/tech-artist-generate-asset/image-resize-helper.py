#!/usr/bin/env python3
"""
Image Resize Helper - Project Agnostic Utility

Standalone utility for resizing and processing images during asset generation.
Can read configuration from .asset-gen-config.json or work independently.

Usage:
    python image-resize-helper.py <input-path> <output-path> <width> <height> [strategy]

Strategies:
    - contain-centered: Resize to fit within dimensions, center with padding (for icons)
    - cover-crop: Resize to cover dimensions, crop excess (for textures/backgrounds)
    - stretch: Resize to exact dimensions (may distort)

Dependencies:
    pip install Pillow
"""

import sys
import os
import json
from pathlib import Path
from PIL import Image, ImageOps


# Strategy constants
STRATEGIES = {
    'CONTAIN_CENTERED': 'contain-centered',
    'COVER_CROP': 'cover-crop',
    'STRETCH': 'stretch'
}


def resize_image(input_path, output_path, target_width, target_height, strategy='contain-centered'):
    """
    Resize an image using the specified strategy

    Args:
        input_path: Path to input image
        output_path: Path to save output image
        target_width: Target width in pixels
        target_height: Target height in pixels
        strategy: Resize strategy (contain-centered, cover-crop, stretch)

    Returns:
        dict: Result object with metadata
    """
    image = Image.open(input_path)
    original_size = image.size
    original_format = image.format

    if strategy == STRATEGIES['CONTAIN_CENTERED']:
        # Resize to fit within bounds, center with transparent padding
        image.thumbnail((target_width, target_height), Image.Resampling.LANCZOS)

        # Create transparent canvas
        if image.mode == 'RGBA':
            canvas = Image.new('RGBA', (target_width, target_height), (0, 0, 0, 0))
        else:
            canvas = Image.new('RGB', (target_width, target_height), (255, 255, 255))

        # Center image on canvas
        offset = ((target_width - image.width) // 2, (target_height - image.height) // 2)
        canvas.paste(image, offset)
        image = canvas

    elif strategy == STRATEGIES['COVER_CROP']:
        # Resize to cover bounds, crop excess from center
        image = ImageOps.fit(image, (target_width, target_height), Image.Resampling.LANCZOS, centering=(0.5, 0.5))

    elif strategy == STRATEGIES['STRETCH']:
        # Resize to exact dimensions (may distort aspect ratio)
        image = image.resize((target_width, target_height), Image.Resampling.LANCZOS)

    else:
        raise ValueError(f"Unknown resize strategy: {strategy}")

    # Determine output format from file extension
    ext = Path(output_path).suffix.lower()

    if ext in ['.jpg', '.jpeg']:
        if image.mode == 'RGBA':
            # Convert RGBA to RGB for JPEG
            rgb_image = Image.new('RGB', image.size, (255, 255, 255))
            rgb_image.paste(image, mask=image.split()[3] if image.mode == 'RGBA' else None)
            image = rgb_image
        image.save(output_path, 'JPEG', quality=85, optimize=True)
    elif ext == '.png':
        image.save(output_path, 'PNG', optimize=True)
    elif ext == '.webp':
        image.save(output_path, 'WEBP', quality=85)
    else:
        image.save(output_path)

    output_size = os.path.getsize(output_path)

    return {
        'success': True,
        'input': {
            'path': input_path,
            'width': original_size[0],
            'height': original_size[1],
            'format': original_format
        },
        'output': {
            'path': output_path,
            'width': image.width,
            'height': image.height,
            'size': output_size
        },
        'strategy': strategy
    }


def center_icon(input_path, output_path, canvas_size, padding=0.1):
    """
    Center an icon within a canvas

    Args:
        input_path: Path to input image
        output_path: Path to save output image
        canvas_size: Size of the square canvas
        padding: Padding percentage (0-1)

    Returns:
        dict: Result object with metadata
    """
    image = Image.open(input_path)
    original_size = image.size

    # Calculate the size to fit the icon with padding
    max_icon_size = int(canvas_size * (1 - padding * 2))

    # Resize the icon to fit within max size while maintaining aspect ratio
    image.thumbnail((max_icon_size, max_icon_size), Image.Resampling.LANCZOS)

    # Create transparent canvas
    canvas = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))

    # Calculate padding to center
    left = (canvas_size - image.width) // 2
    top = (canvas_size - image.height) // 2

    # Paste icon on canvas
    canvas.paste(image, (left, top), image if image.mode == 'RGBA' else None)

    # Save as PNG
    canvas.save(output_path, 'PNG', optimize=True)

    output_size = os.path.getsize(output_path)

    return {
        'success': True,
        'input': {
            'path': input_path,
            'width': original_size[0],
            'height': original_size[1]
        },
        'output': {
            'path': output_path,
            'width': canvas_size,
            'height': canvas_size,
            'size': output_size
        },
        'strategy': 'center-icon',
        'padding': padding
    }


def remove_white(input_path, output_path, threshold=240):
    """
    Remove white/near-white colors from an image (make them transparent)

    Args:
        input_path: Path to input image
        output_path: Path to save output image
        threshold: White threshold (0-255), pixels above this become transparent

    Returns:
        dict: Result object with metadata
    """
    image = Image.open(input_path).convert('RGBA')
    pixels = image.load()

    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]
            if r >= threshold and g >= threshold and b >= threshold:
                pixels[x, y] = (r, g, b, 0)

    image.save(output_path, 'PNG', optimize=True)

    output_size = os.path.getsize(output_path)

    return {
        'success': True,
        'input': {'path': input_path},
        'output': {
            'path': output_path,
            'size': output_size
        },
        'threshold': threshold
    }


def erode_alpha(input_path, output_path, pixels=1):
    """
    Erode alpha channel to remove white halos

    Args:
        input_path: Path to input image
        output_path: Path to save output image
        pixels: Number of pixels to erode

    Returns:
        dict: Result object with metadata
    """
    image = Image.open(input_path).convert('RGBA')
    original_size = image.size

    # Simple erosion: resize down then up
    erosion_factor = 1 - (pixels * 2 / min(image.width, image.height))
    shrunk_width = int(image.width * erosion_factor)
    shrunk_height = int(image.height * erosion_factor)

    # Resize down
    shrunk = image.resize((shrunk_width, shrunk_height), Image.Resampling.LANCZOS)

    # Create transparent canvas of original size
    canvas = Image.new('RGBA', original_size, (0, 0, 0, 0))

    # Center the shrunk image
    offset = ((original_size[0] - shrunk_width) // 2, (original_size[1] - shrunk_height) // 2)
    canvas.paste(shrunk, offset, shrunk)

    canvas.save(output_path, 'PNG', optimize=True)

    output_size = os.path.getsize(output_path)

    return {
        'success': True,
        'input': {'path': input_path},
        'output': {
            'path': output_path,
            'size': output_size
        },
        'erosionPixels': pixels
    }


def threshold_to_black(input_path, output_path, alpha_threshold=10):
    """
    Convert all non-transparent pixels to pure black (#000000) for clean engine tinting.
    This is the "Sticker & Contrast" strategy for icon generation.

    Use this after background removal to create perfect black masks that game engines
    can tint with any color without artifacts from "almost black" or colored pixels.

    Args:
        input_path: Path to input image (must have alpha channel)
        output_path: Path to save output image
        alpha_threshold: Alpha value below which pixels are considered transparent (0-255)

    Returns:
        dict: Result object with metadata
    """
    image = Image.open(input_path).convert('RGBA')
    pixels = image.load()

    pixels_converted = 0

    for y in range(image.height):
        for x in range(image.width):
            r, g, b, a = pixels[x, y]

            # If pixel is not transparent (alpha above threshold)
            if a > alpha_threshold:
                # Convert to pure black, preserve alpha
                pixels[x, y] = (0, 0, 0, a)
                pixels_converted += 1

    image.save(output_path, 'PNG', optimize=True)

    output_size = os.path.getsize(output_path)

    return {
        'success': True,
        'input': {'path': input_path},
        'output': {
            'path': output_path,
            'size': output_size
        },
        'alphaThreshold': alpha_threshold,
        'pixelsConverted': pixels_converted,
        'rationale': 'Pure black mask for clean game engine tinting'
    }


def batch_resize(config_path, input_folder, output_folder):
    """
    Batch resize all assets in a folder according to config

    Args:
        config_path: Path to .asset-gen-config.json
        input_folder: Folder containing assets to resize
        output_folder: Folder to save resized assets (can be same as input)

    Returns:
        dict: Results for each asset
    """
    with open(config_path, 'r') as f:
        config = json.load(f)

    results = {}

    for asset_type, asset_config in config['assetTypes'].items():
        if asset_type.startswith('_'):
            continue

        input_path = os.path.join(input_folder, asset_config['filename'])
        output_path = os.path.join(output_folder, asset_config['filename'])

        if not os.path.exists(input_path):
            results[asset_type] = {'success': False, 'error': 'File not found', 'path': input_path}
            continue

        # Determine strategy based on asset type
        strategy = STRATEGIES['CONTAIN_CENTERED']
        if 'texture' in asset_config['filename'] or 'background' in asset_config['filename']:
            strategy = STRATEGIES['COVER_CROP']

        # Check postProcessing for explicit strategy
        if 'postProcessing' in asset_config:
            for step in asset_config['postProcessing']:
                if 'contain-centered' in step:
                    strategy = STRATEGIES['CONTAIN_CENTERED']
                elif 'cover-crop' in step:
                    strategy = STRATEGIES['COVER_CROP']

        try:
            result = resize_image(
                input_path,
                output_path,
                asset_config['dimensions']['width'],
                asset_config['dimensions']['height'],
                strategy
            )
            results[asset_type] = result
        except Exception as error:
            results[asset_type] = {'success': False, 'error': str(error), 'path': input_path}

    return results


def main():
    """Main CLI interface"""
    args = sys.argv[1:]

    if len(args) < 4 and args[0] not in ['--batch', '--remove-white', '--center', '--erode', '--threshold-black']:
        print("""
Image Resize Helper - Project Agnostic Utility

Usage: python image-resize-helper.py <input-path> <output-path> <width> <height> [strategy]

Strategies:
  contain-centered  - Resize to fit, center with padding (default for icons)
  cover-crop        - Resize to cover, crop excess (default for textures)
  stretch           - Resize to exact dimensions

Examples:
  python image-resize-helper.py input.png output.png 256 256 contain-centered
  python image-resize-helper.py texture.jpg texture.jpg 512 512 cover-crop

Special Commands:
  python image-resize-helper.py --batch <config-path> <input-folder> <output-folder>
  python image-resize-helper.py --remove-white <input> <output> [threshold=240]
  python image-resize-helper.py --center <input> <output> <size> [padding=0.1]
  python image-resize-helper.py --erode <input> <output> [pixels=1]
  python image-resize-helper.py --threshold-black <input> <output> [alpha-threshold=10]
""")
        sys.exit(1)

    try:
        if args[0] == '--batch':
            results = batch_resize(args[1], args[2], args[3])
            print(json.dumps(results, indent=2))
        elif args[0] == '--remove-white':
            result = remove_white(args[1], args[2], int(args[3]) if len(args) > 3 else 240)
            print(json.dumps(result, indent=2))
        elif args[0] == '--center':
            result = center_icon(args[1], args[2], int(args[3]), float(args[4]) if len(args) > 4 else 0.1)
            print(json.dumps(result, indent=2))
        elif args[0] == '--erode':
            result = erode_alpha(args[1], args[2], int(args[3]) if len(args) > 3 else 1)
            print(json.dumps(result, indent=2))
        elif args[0] == '--threshold-black':
            result = threshold_to_black(args[1], args[2], int(args[3]) if len(args) > 3 else 10)
            print(json.dumps(result, indent=2))
        else:
            input_path, output_path, width, height = args[:4]
            strategy = args[4] if len(args) > 4 else 'contain-centered'
            result = resize_image(input_path, output_path, int(width), int(height), strategy)
            print(json.dumps(result, indent=2))
    except Exception as error:
        print(f'Error: {error}')
        sys.exit(1)


if __name__ == '__main__':
    main()
