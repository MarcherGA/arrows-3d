#!/usr/bin/env python3
"""
Color Extraction Script - Pixel Sampling Fallback

Extracts color palette from generated theme assets using pixel sampling.
This is a fallback when vision-based color extraction doesn't provide clear RGB values.

Usage: python extract-colors.py <blockTexturePath> <lockOverlayPath> <themeName>

Dependencies:
    pip install Pillow numpy
"""

import sys
import json
import random
from PIL import Image
import numpy as np


def sample_image_colors(image_path, sample_count=100):
    """Sample random pixels from an image"""
    image = Image.open(image_path).convert('RGB')
    pixels = list(image.getdata())

    samples = []
    for _ in range(min(sample_count, len(pixels))):
        r, g, b = random.choice(pixels)
        samples.append({'r': r, 'g': g, 'b': b})

    return samples


def average_colors(samples):
    """Calculate average color from samples"""
    r_sum = sum(s['r'] for s in samples)
    g_sum = sum(s['g'] for s in samples)
    b_sum = sum(s['b'] for s in samples)

    count = len(samples)
    return {
        'r': round(r_sum / count),
        'g': round(g_sum / count),
        'b': round(b_sum / count)
    }


def get_saturation(rgb):
    """Calculate color saturation (0-1)"""
    max_val = max(rgb['r'], rgb['g'], rgb['b'])
    min_val = min(rgb['r'], rgb['g'], rgb['b'])
    return 0 if max_val == 0 else (max_val - min_val) / max_val


def get_brightness(rgb):
    """Calculate color brightness (0-255)"""
    return (rgb['r'] + rgb['g'] + rgb['b']) / 3


def find_brightest_color(samples):
    """Find the brightest and most saturated color"""
    brightest = samples[0]

    for color in samples:
        brightness_current = get_brightness(color)
        brightness_best = get_brightness(brightest)

        saturation_current = get_saturation(color)
        saturation_best = get_saturation(brightest)

        # Score = 50% brightness + 50% saturation
        score_current = brightness_current * 0.5 + saturation_current * 255 * 0.5
        score_best = brightness_best * 0.5 + saturation_best * 255 * 0.5

        if score_current > score_best:
            brightest = color

    return brightest


def boost_saturation(rgb, factor=1.5):
    """Boost saturation of a color"""
    max_val = max(rgb['r'], rgb['g'], rgb['b'])
    min_val = min(rgb['r'], rgb['g'], rgb['b'])

    if max_val == min_val:
        return rgb  # Gray, can't boost

    # Simple saturation boost by moving away from gray
    gray = (rgb['r'] + rgb['g'] + rgb['b']) / 3

    return {
        'r': min(255, round(gray + (rgb['r'] - gray) * factor)),
        'g': min(255, round(gray + (rgb['g'] - gray) * factor)),
        'b': min(255, round(gray + (rgb['b'] - gray) * factor))
    }


def adjust_brightness(rgb, factor):
    """Adjust brightness of a color"""
    return {
        'r': min(255, max(0, round(rgb['r'] * factor))),
        'g': min(255, max(0, round(rgb['g'] * factor))),
        'b': min(255, max(0, round(rgb['b'] * factor)))
    }


def desaturate(rgb, amount=0.5):
    """Desaturate a color"""
    gray = (rgb['r'] + rgb['g'] + rgb['b']) / 3
    return {
        'r': round(rgb['r'] + (gray - rgb['r']) * amount),
        'g': round(rgb['g'] + (gray - rgb['g']) * amount),
        'b': round(rgb['b'] + (gray - rgb['b']) * amount)
    }


def normalize(rgb):
    """Convert RGB to normalized array (0-1) for Babylon.js"""
    return [rgb['r'] / 255, rgb['g'] / 255, rgb['b'] / 255]


def rgb_to_hex(rgb):
    """Convert RGB to hex color"""
    return f"#{rgb['r']:02x}{rgb['g']:02x}{rgb['b']:02x}"


def extract_colors_for_palette(block_texture_path, lock_overlay_path, theme_name):
    """Main color extraction function"""
    print(f"\n🎨 Extracting colors for \"{theme_name}\" theme via pixel sampling...")

    # Sample block texture for base colors
    print('📊 Sampling block texture (100 pixels)...')
    block_samples = sample_image_colors(block_texture_path, 100)
    avg_block_color = average_colors(block_samples)
    print(f"   Average block color: rgb({avg_block_color['r']}, {avg_block_color['g']}, {avg_block_color['b']})")

    # Sample lock overlay for accent colors
    print('📊 Sampling lock overlay (50 pixels)...')
    lock_samples = sample_image_colors(lock_overlay_path, 50)

    # Find the brightest, most saturated color for key emissive
    brightest_color = find_brightest_color(lock_samples)
    print(f"   Brightest color: rgb({brightest_color['r']}, {brightest_color['g']}, {brightest_color['b']})")
    print(f"   Brightness: {round(get_brightness(brightest_color))}/255")
    print(f"   Saturation: {round(get_saturation(brightest_color) * 100)}%")

    # Boost for emissive glow
    boosted_emissive = boost_saturation(brightest_color, 1.5)
    print(f"   Boosted emissive: rgb({boosted_emissive['r']}, {boosted_emissive['g']}, {boosted_emissive['b']})")

    # Derive other colors
    arrow_color = adjust_brightness(avg_block_color, 0.8)
    background_color_rgb = adjust_brightness(avg_block_color, 0.3)
    locked_color = desaturate(avg_block_color, 0.5)
    locked_arrow_color = adjust_brightness(locked_color, 0.6)

    # Generate palette
    palette = {
        'name': theme_name.capitalize(),
        'version': '1.0.0',
        'babylon': {
            'blockDefault': normalize({'r': 255, 'g': 255, 'b': 255}),  # Keep white for texture visibility
            'arrowColor': normalize(arrow_color),
            'keyArrowColor': normalize({'r': 13, 'g': 13, 'b': 13}),  # Dark for key blocks
            'lockedArrowColor': normalize(locked_arrow_color),
            'background': normalize(background_color_rgb) + [1.0],
            'keyColor': normalize(brightest_color),
            'keyEmissive': normalize(boosted_emissive),
            'lockedColor': normalize(locked_color)
        },
        'css': {
            'headerBg': rgb_to_hex(avg_block_color),
            'currencyContainer': rgb_to_hex(adjust_brightness(avg_block_color, 0.7)),
            'currencyPill': rgb_to_hex(adjust_brightness(avg_block_color, 0.5)),
            'bgBlue': rgb_to_hex(avg_block_color),
            'darkBlue': rgb_to_hex(adjust_brightness(avg_block_color, 0.6)),
            'accent': rgb_to_hex(brightest_color),
            'accentDark': rgb_to_hex(adjust_brightness(brightest_color, 0.7)),
            'buttonPrimary': rgb_to_hex(adjust_brightness(brightest_color, 0.9)),
            'buttonPrimaryDark': rgb_to_hex(adjust_brightness(brightest_color, 0.7)),
            'buttonSecondary': rgb_to_hex(avg_block_color),
            'buttonSecondaryDark': rgb_to_hex(adjust_brightness(avg_block_color, 0.7))
        }
    }

    print('\n✅ Color palette generated successfully via pixel sampling!')
    print(f"   Key emissive: {rgb_to_hex(brightest_color)} (will POP visually!)")

    return palette


def main():
    """Main execution"""
    if len(sys.argv) != 4:
        print('❌ Usage: python extract-colors.py <blockTexturePath> <lockOverlayPath> <themeName>')
        sys.exit(1)

    block_texture_path = sys.argv[1]
    lock_overlay_path = sys.argv[2]
    theme_name = sys.argv[3]

    try:
        palette = extract_colors_for_palette(block_texture_path, lock_overlay_path, theme_name)
        print('\n📋 Palette JSON:')
        print(json.dumps(palette, indent=2))
    except Exception as error:
        print(f'❌ Error: {error}')
        sys.exit(1)


if __name__ == '__main__':
    main()
