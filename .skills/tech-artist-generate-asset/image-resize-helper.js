/**
 * Image Resize Helper - Project Agnostic Utility
 *
 * Standalone utility for resizing and processing images during asset generation.
 * Can read configuration from .asset-gen-config.json or work independently.
 *
 * Usage:
 *   node image-resize-helper.js <input-path> <output-path> <width> <height> [strategy]
 *
 * Strategies:
 *   - contain-centered: Resize to fit within dimensions, center with padding (for icons)
 *   - cover-crop: Resize to cover dimensions, crop excess (for textures/backgrounds)
 *   - stretch: Resize to exact dimensions (may distort)
 *
 * Dependencies:
 *   - sharp (npm install sharp)
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// Strategy constants
const STRATEGIES = {
  CONTAIN_CENTERED: 'contain-centered',
  COVER_CROP: 'cover-crop',
  STRETCH: 'stretch'
};

/**
 * Resize an image using the specified strategy
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save output image
 * @param {number} targetWidth - Target width in pixels
 * @param {number} targetHeight - Target height in pixels
 * @param {string} strategy - Resize strategy (contain-centered, cover-crop, stretch)
 * @returns {Promise<object>} - Result object with metadata
 */
async function resizeImage(inputPath, outputPath, targetWidth, targetHeight, strategy = STRATEGIES.CONTAIN_CENTERED) {
  const input = sharp(inputPath);
  const metadata = await input.metadata();

  let pipeline;

  switch (strategy) {
    case STRATEGIES.CONTAIN_CENTERED:
      // Resize to fit within bounds, center with transparent padding
      pipeline = input
        .resize(targetWidth, targetHeight, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        });
      break;

    case STRATEGIES.COVER_CROP:
      // Resize to cover bounds, crop excess from center
      pipeline = input
        .resize(targetWidth, targetHeight, {
          fit: 'cover',
          position: 'center'
        });
      break;

    case STRATEGIES.STRETCH:
      // Resize to exact dimensions (may distort aspect ratio)
      pipeline = input
        .resize(targetWidth, targetHeight, {
          fit: 'fill'
        });
      break;

    default:
      throw new Error(`Unknown resize strategy: ${strategy}`);
  }

  // Determine output format from file extension
  const ext = path.extname(outputPath).toLowerCase();

  if (ext === '.jpg' || ext === '.jpeg') {
    pipeline = pipeline.jpeg({ quality: 85 });
  } else if (ext === '.png') {
    pipeline = pipeline.png({ compressionLevel: 9 });
  } else if (ext === '.webp') {
    pipeline = pipeline.webp({ quality: 85 });
  }

  await pipeline.toFile(outputPath);

  const outputMetadata = await sharp(outputPath).metadata();

  return {
    success: true,
    input: {
      path: inputPath,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    },
    output: {
      path: outputPath,
      width: outputMetadata.width,
      height: outputMetadata.height,
      format: outputMetadata.format,
      size: fs.statSync(outputPath).size
    },
    strategy
  };
}

/**
 * Center an icon within a canvas
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save output image
 * @param {number} canvasSize - Size of the square canvas
 * @param {number} padding - Padding percentage (0-1)
 * @returns {Promise<object>} - Result object with metadata
 */
async function centerIcon(inputPath, outputPath, canvasSize, padding = 0.1) {
  const input = sharp(inputPath);
  const metadata = await input.metadata();

  // Calculate the size to fit the icon with padding
  const maxIconSize = Math.floor(canvasSize * (1 - padding * 2));

  // Resize the icon to fit within max size while maintaining aspect ratio
  const resizedBuffer = await input
    .resize(maxIconSize, maxIconSize, {
      fit: 'inside',
      withoutEnlargement: false
    })
    .toBuffer();

  // Get the resized dimensions
  const resizedMeta = await sharp(resizedBuffer).metadata();

  // Calculate padding to center
  const left = Math.floor((canvasSize - resizedMeta.width) / 2);
  const top = Math.floor((canvasSize - resizedMeta.height) / 2);

  // Create transparent canvas and composite the icon
  await sharp({
    create: {
      width: canvasSize,
      height: canvasSize,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    }
  })
    .composite([{
      input: resizedBuffer,
      left,
      top
    }])
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  return {
    success: true,
    input: {
      path: inputPath,
      width: metadata.width,
      height: metadata.height
    },
    output: {
      path: outputPath,
      width: canvasSize,
      height: canvasSize,
      size: fs.statSync(outputPath).size
    },
    strategy: 'center-icon',
    padding
  };
}

/**
 * Remove white/near-white colors from an image (make them transparent)
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save output image
 * @param {number} threshold - White threshold (0-255), pixels above this become transparent
 * @returns {Promise<object>} - Result object with metadata
 */
async function removeWhite(inputPath, outputPath, threshold = 240) {
  const input = sharp(inputPath);
  const metadata = await input.metadata();

  // Get raw pixel data
  const { data, info } = await input
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  // Process pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // If pixel is near-white, make it transparent
    if (r >= threshold && g >= threshold && b >= threshold) {
      data[i + 3] = 0; // Set alpha to 0
    }
  }

  await sharp(data, {
    raw: {
      width: info.width,
      height: info.height,
      channels: 4
    }
  })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  return {
    success: true,
    input: { path: inputPath },
    output: {
      path: outputPath,
      size: fs.statSync(outputPath).size
    },
    threshold
  };
}

/**
 * Erode alpha channel to remove white halos
 * @param {string} inputPath - Path to input image
 * @param {string} outputPath - Path to save output image
 * @param {number} pixels - Number of pixels to erode
 * @returns {Promise<object>} - Result object with metadata
 */
async function erodeAlpha(inputPath, outputPath, pixels = 1) {
  const input = sharp(inputPath);

  // Use a simple approach: resize down then up to erode edges
  const metadata = await input.metadata();

  const erosionFactor = 1 - (pixels * 2 / Math.min(metadata.width, metadata.height));
  const shrunkWidth = Math.floor(metadata.width * erosionFactor);
  const shrunkHeight = Math.floor(metadata.height * erosionFactor);

  await input
    .resize(shrunkWidth, shrunkHeight, { fit: 'inside' })
    .resize(metadata.width, metadata.height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  return {
    success: true,
    input: { path: inputPath },
    output: {
      path: outputPath,
      size: fs.statSync(outputPath).size
    },
    erosionPixels: pixels
  };
}

/**
 * Batch resize all assets in a folder according to config
 * @param {string} configPath - Path to .asset-gen-config.json
 * @param {string} inputFolder - Folder containing assets to resize
 * @param {string} outputFolder - Folder to save resized assets (can be same as input)
 * @returns {Promise<object>} - Results for each asset
 */
async function batchResize(configPath, inputFolder, outputFolder) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const results = {};

  for (const [assetType, assetConfig] of Object.entries(config.assetTypes)) {
    if (assetType.startsWith('_')) continue; // Skip comments

    const inputPath = path.join(inputFolder, assetConfig.filename);
    const outputPath = path.join(outputFolder, assetConfig.filename);

    if (!fs.existsSync(inputPath)) {
      results[assetType] = { success: false, error: 'File not found', path: inputPath };
      continue;
    }

    // Determine strategy based on asset type
    let strategy = STRATEGIES.CONTAIN_CENTERED;
    if (assetConfig.filename.includes('texture') || assetConfig.filename.includes('background')) {
      strategy = STRATEGIES.COVER_CROP;
    }

    // Check postProcessing for explicit strategy
    if (assetConfig.postProcessing) {
      for (const step of assetConfig.postProcessing) {
        if (step.includes('contain-centered')) {
          strategy = STRATEGIES.CONTAIN_CENTERED;
        } else if (step.includes('cover-crop')) {
          strategy = STRATEGIES.COVER_CROP;
        }
      }
    }

    try {
      const result = await resizeImage(
        inputPath,
        outputPath,
        assetConfig.dimensions.width,
        assetConfig.dimensions.height,
        strategy
      );
      results[assetType] = result;
    } catch (error) {
      results[assetType] = { success: false, error: error.message, path: inputPath };
    }
  }

  return results;
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 4 && args[0] !== '--batch' && args[0] !== '--remove-white' && args[0] !== '--center' && args[0] !== '--erode') {
    console.log(`
Image Resize Helper - Project Agnostic Utility

Usage: node image-resize-helper.js <input-path> <output-path> <width> <height> [strategy]

Strategies:
  contain-centered  - Resize to fit, center with padding (default for icons)
  cover-crop        - Resize to cover, crop excess (default for textures)
  stretch           - Resize to exact dimensions

Examples:
  node image-resize-helper.js input.png output.png 256 256 contain-centered
  node image-resize-helper.js texture.jpg texture.jpg 512 512 cover-crop

Special Commands:
  node image-resize-helper.js --batch <config-path> <input-folder> <output-folder>
  node image-resize-helper.js --remove-white <input> <output> [threshold=240]
  node image-resize-helper.js --center <input> <output> <size> [padding=0.1]
  node image-resize-helper.js --erode <input> <output> [pixels=1]
`);
    process.exit(1);
  }

  (async () => {
    try {
      if (args[0] === '--batch') {
        const results = await batchResize(args[1], args[2], args[3]);
        console.log(JSON.stringify(results, null, 2));
      } else if (args[0] === '--remove-white') {
        const result = await removeWhite(args[1], args[2], parseInt(args[3]) || 240);
        console.log(JSON.stringify(result, null, 2));
      } else if (args[0] === '--center') {
        const result = await centerIcon(args[1], args[2], parseInt(args[3]), parseFloat(args[4]) || 0.1);
        console.log(JSON.stringify(result, null, 2));
      } else if (args[0] === '--erode') {
        const result = await erodeAlpha(args[1], args[2], parseInt(args[3]) || 1);
        console.log(JSON.stringify(result, null, 2));
      } else {
        const [inputPath, outputPath, width, height, strategy] = args;
        const result = await resizeImage(inputPath, outputPath, parseInt(width), parseInt(height), strategy || STRATEGIES.CONTAIN_CENTERED);
        console.log(JSON.stringify(result, null, 2));
      }
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = {
  resizeImage,
  centerIcon,
  removeWhite,
  erodeAlpha,
  batchResize,
  STRATEGIES
};
