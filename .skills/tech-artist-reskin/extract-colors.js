/**
 * Color Extraction Script - Pixel Sampling Fallback
 *
 * Extracts color palette from generated theme assets using pixel sampling.
 * This is a fallback when vision-based color extraction doesn't provide clear RGB values.
 *
 * Usage: node .skills/tech-artist-reskin/extract-colors.js <blockTexturePath> <lockOverlayPath> <themeName>
 */

const sharp = require('sharp');
const fs = require('fs').promises;

/**
 * Sample random pixels from an image
 */
async function sampleImageColors(imagePath, sampleCount = 100) {
  const image = sharp(imagePath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  const samples = [];
  const pixelCount = (data.length / info.channels);

  for (let i = 0; i < sampleCount; i++) {
    const pixelIndex = Math.floor(Math.random() * pixelCount) * info.channels;
    samples.push({
      r: data[pixelIndex],
      g: data[pixelIndex + 1],
      b: data[pixelIndex + 2],
      a: info.channels === 4 ? data[pixelIndex + 3] : 255
    });
  }

  return samples;
}

/**
 * Calculate average color from samples
 */
function averageColors(samples) {
  const sum = samples.reduce((acc, color) => ({
    r: acc.r + color.r,
    g: acc.g + color.g,
    b: acc.b + color.b
  }), { r: 0, g: 0, b: 0 });

  return {
    r: Math.round(sum.r / samples.length),
    g: Math.round(sum.g / samples.length),
    b: Math.round(sum.b / samples.length)
  };
}

/**
 * Calculate color saturation (0-1)
 */
function getSaturation(rgb) {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  return max === 0 ? 0 : (max - min) / max;
}

/**
 * Calculate color brightness (0-255)
 */
function getBrightness(rgb) {
  return (rgb.r + rgb.g + rgb.b) / 3;
}

/**
 * Find the brightest and most saturated color
 */
function findBrightestColor(samples) {
  return samples.reduce((brightest, color) => {
    const brightnessCurrent = getBrightness(color);
    const brightnessBest = getBrightness(brightest);

    const saturationCurrent = getSaturation(color);
    const saturationBest = getSaturation(brightest);

    // Score = 50% brightness + 50% saturation
    const scoreCurrent = brightnessCurrent * 0.5 + saturationCurrent * 255 * 0.5;
    const scoreBest = brightnessBest * 0.5 + saturationBest * 255 * 0.5;

    return scoreCurrent > scoreBest ? color : brightest;
  });
}

/**
 * Boost saturation of a color
 */
function boostSaturation(rgb, factor = 1.5) {
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);

  if (max === min) return rgb; // Gray, can't boost

  // Simple saturation boost by moving away from gray
  const gray = (rgb.r + rgb.g + rgb.b) / 3;

  return {
    r: Math.min(255, Math.round(gray + (rgb.r - gray) * factor)),
    g: Math.min(255, Math.round(gray + (rgb.g - gray) * factor)),
    b: Math.min(255, Math.round(gray + (rgb.b - gray) * factor))
  };
}

/**
 * Adjust brightness of a color
 */
function adjustBrightness(rgb, factor) {
  return {
    r: Math.min(255, Math.max(0, Math.round(rgb.r * factor))),
    g: Math.min(255, Math.max(0, Math.round(rgb.g * factor))),
    b: Math.min(255, Math.max(0, Math.round(rgb.b * factor)))
  };
}

/**
 * Desaturate a color
 */
function desaturate(rgb, amount = 0.5) {
  const gray = (rgb.r + rgb.g + rgb.b) / 3;
  return {
    r: Math.round(rgb.r + (gray - rgb.r) * amount),
    g: Math.round(rgb.g + (gray - rgb.g) * amount),
    b: Math.round(rgb.b + (gray - rgb.b) * amount)
  };
}

/**
 * Convert RGB to normalized array (0-1) for Babylon.js
 */
function normalize(rgb) {
  return [rgb.r / 255, rgb.g / 255, rgb.b / 255];
}

/**
 * Convert RGB to hex color
 */
function rgbToHex(rgb) {
  const toHex = (n) => {
    const hex = Math.round(n).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

/**
 * Main color extraction function
 */
async function extractColorsForPalette(blockTexturePath, lockOverlayPath, themeName) {
  console.log(`\n🎨 Extracting colors for "${themeName}" theme via pixel sampling...`);

  // Sample block texture for base colors
  console.log('📊 Sampling block texture (100 pixels)...');
  const blockSamples = await sampleImageColors(blockTexturePath, 100);
  const avgBlockColor = averageColors(blockSamples);
  console.log(`   Average block color: rgb(${avgBlockColor.r}, ${avgBlockColor.g}, ${avgBlockColor.b})`);

  // Sample lock overlay for accent colors
  console.log('📊 Sampling lock overlay (50 pixels)...');
  const lockSamples = await sampleImageColors(lockOverlayPath, 50);

  // Find the brightest, most saturated color for key emissive
  const brightestColor = findBrightestColor(lockSamples);
  console.log(`   Brightest color: rgb(${brightestColor.r}, ${brightestColor.g}, ${brightestColor.b})`);
  console.log(`   Brightness: ${Math.round(getBrightness(brightestColor))}/255`);
  console.log(`   Saturation: ${Math.round(getSaturation(brightestColor) * 100)}%`);

  // Boost for emissive glow
  const boostedEmissive = boostSaturation(brightestColor, 1.5);
  console.log(`   Boosted emissive: rgb(${boostedEmissive.r}, ${boostedEmissive.g}, ${boostedEmissive.b})`);

  // Derive other colors
  const arrowColor = adjustBrightness(avgBlockColor, 0.8);
  const backgroundColorRgb = adjustBrightness(avgBlockColor, 0.3);
  const lockedColor = desaturate(avgBlockColor, 0.5);

  // Generate palette
  const palette = {
    name: themeName.charAt(0).toUpperCase() + themeName.slice(1),
    version: "1.0.0",
    babylon: {
      blockDefault: normalize({ r: 255, g: 255, b: 255 }), // Keep white for texture visibility
      arrowColor: normalize(arrowColor),
      background: [...normalize(backgroundColorRgb), 1.0],
      keyColor: normalize(brightestColor),
      keyEmissive: normalize(boostedEmissive),
      lockedColor: normalize(lockedColor)
    },
    css: {
      headerBg: rgbToHex(avgBlockColor),
      currencyContainer: rgbToHex(adjustBrightness(avgBlockColor, 0.7)),
      bgBlue: rgbToHex(avgBlockColor),
      darkBlue: rgbToHex(adjustBrightness(avgBlockColor, 0.6)),
      gold: rgbToHex(brightestColor),
      green: rgbToHex(adjustBrightness(brightestColor, 0.9)),
      greenDark: rgbToHex(adjustBrightness(brightestColor, 0.7))
    }
  };

  console.log('\n✅ Color palette generated successfully via pixel sampling!');
  console.log(`   Key emissive: ${rgbToHex(brightestColor)} (will POP visually!)`);

  return palette;
}

/**
 * Main execution (if called directly)
 */
async function main() {
  const blockTexturePath = process.argv[2];
  const lockOverlayPath = process.argv[3];
  const themeName = process.argv[4];

  if (!blockTexturePath || !lockOverlayPath || !themeName) {
    console.error('❌ Usage: node extract-colors.js <blockTexturePath> <lockOverlayPath> <themeName>');
    process.exit(1);
  }

  try {
    const palette = await extractColorsForPalette(blockTexturePath, lockOverlayPath, themeName);
    console.log('\n📋 Palette JSON:');
    console.log(JSON.stringify(palette, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { extractColorsForPalette };
