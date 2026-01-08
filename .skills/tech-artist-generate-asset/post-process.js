/**
 * Post-Processing Script for Generated Assets
 *
 * Handles background removal, alpha erosion, and compression for generated images.
 *
 * Usage: node .skills/tech-artist-generate-asset/post-process.js <inputPath> <outputPath> <assetType>
 */

const sharp = require('sharp');
const fs = require('fs').promises;
const https = require('https');

/**
 * Download file from URL
 */
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
  });
}

/**
 * Remove background using sharp (simple threshold method)
 * For production, use Replicate's rembg model instead
 */
async function removeBackgroundSimple(imageBuffer) {
  try {
    // This is a simplified version - in production, use Replicate's rembg model
    // For now, we'll just ensure alpha channel exists
    const processed = await sharp(imageBuffer)
      .ensureAlpha()
      .png()
      .toBuffer();

    console.log('   ⚠️  Note: Using simple alpha channel preservation.');
    console.log('   💡 For production, use Replicate rembg model via MCP');

    return processed;
  } catch (error) {
    console.error('   ❌ Background removal failed:', error.message);
    throw error;
  }
}

/**
 * Erode alpha channel to remove white halos
 *
 * This shrinks the alpha channel by N pixels to eliminate anti-aliasing artifacts
 * that appear as white/gray edges around transparent images.
 */
async function erodeAlphaChannel(imageBuffer, pixels = 1) {
  try {
    console.log(`   🔧 Eroding alpha channel by ${pixels}px to remove halos...`);

    // Extract image with alpha
    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Process each pixel
    const width = info.width;
    const height = info.height;
    const channels = info.channels;

    // Create a new buffer for the eroded alpha
    const erodedData = Buffer.from(data);

    // Simple erosion: for each pixel, if any neighbor is transparent, make this pixel more transparent
    for (let y = pixels; y < height - pixels; y++) {
      for (let x = pixels; x < width - pixels; x++) {
        const idx = (y * width + x) * channels;

        // Check if we're near a transparent edge
        let minAlpha = 255;
        for (let dy = -pixels; dy <= pixels; dy++) {
          for (let dx = -pixels; dx <= pixels; dx++) {
            const neighborIdx = ((y + dy) * width + (x + dx)) * channels;
            const neighborAlpha = data[neighborIdx + 3];
            minAlpha = Math.min(minAlpha, neighborAlpha);
          }
        }

        // Apply erosion: reduce alpha if near transparent pixels
        if (minAlpha < 255) {
          erodedData[idx + 3] = Math.max(0, minAlpha - 20); // Erode by making more transparent
        }
      }
    }

    // Convert back to PNG
    const eroded = await sharp(erodedData, {
      raw: {
        width: width,
        height: height,
        channels: channels
      }
    })
      .png()
      .toBuffer();

    console.log('   ✅ Alpha erosion complete');
    return eroded;

  } catch (error) {
    console.error('   ⚠️  Alpha erosion failed, using original:', error.message);
    return imageBuffer; // Return original if erosion fails
  }
}

/**
 * Compress JPEG image
 */
async function compressJPEG(imageBuffer, quality = 85) {
  console.log(`   🗜️  Compressing JPEG (quality: ${quality}%)...`);

  const compressed = await sharp(imageBuffer)
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();

  console.log(`   ✅ JPEG compressed: ${Math.round(compressed.length / 1024)}KB`);
  return compressed;
}

/**
 * Optimize PNG image
 */
async function optimizePNG(imageBuffer, compressionLevel = 9) {
  console.log(`   🗜️  Optimizing PNG (level: ${compressionLevel})...`);

  const optimized = await sharp(imageBuffer)
    .png({ compressionLevel, adaptiveFiltering: true, palette: true })
    .toBuffer();

  console.log(`   ✅ PNG optimized: ${Math.round(optimized.length / 1024)}KB`);
  return optimized;
}

/**
 * Main post-processing pipeline
 */
async function postProcessAsset(inputPath, outputPath, assetType) {
  console.log(`\n🔧 Post-processing ${assetType}...`);

  // Read input image
  let imageBuffer = await fs.readFile(inputPath);
  const inputSize = imageBuffer.length;
  console.log(`   📥 Input size: ${Math.round(inputSize / 1024)}KB`);

  // Determine processing steps based on asset type
  const needsTransparency = [
    'arrow-icon',
    'lock-overlay',
    'currency-icon',
    'win-icon',
    'logo'
  ].includes(assetType);

  if (needsTransparency) {
    // Step 1: Remove background (use Replicate rembg in production)
    console.log('   🎭 Processing transparency...');
    imageBuffer = await removeBackgroundSimple(imageBuffer);

    // Step 2: Erode alpha to remove white halos
    imageBuffer = await erodeAlphaChannel(imageBuffer, 1);

    // Step 3: Optimize PNG
    imageBuffer = await optimizePNG(imageBuffer, 9);

  } else {
    // JPEG assets (block-texture, background)
    // Check if we need aggressive compression
    const targetSize = assetType === 'block-texture' ? 150 * 1024 : 100 * 1024;

    if (inputSize > targetSize) {
      console.log(`   ⚠️  Input exceeds target size (${Math.round(targetSize / 1024)}KB), using aggressive compression`);
      imageBuffer = await compressJPEG(imageBuffer, 70); // Lower quality
    } else {
      imageBuffer = await compressJPEG(imageBuffer, 85); // High quality
    }
  }

  // Save output
  await fs.writeFile(outputPath, imageBuffer);
  const outputSize = imageBuffer.length;
  console.log(`   💾 Output size: ${Math.round(outputSize / 1024)}KB`);
  console.log(`   📊 Size reduction: ${Math.round((1 - outputSize / inputSize) * 100)}%`);

  // Validate file size
  const sizeTargets = {
    'block-texture': 150 * 1024,
    'background': 100 * 1024,
    'lock-overlay': 50 * 1024,
    'arrow-icon': 20 * 1024,
    'currency-icon': 20 * 1024,
    'win-icon': 20 * 1024,
    'logo': 20 * 1024
  };

  const targetSize = sizeTargets[assetType] || 50 * 1024;
  if (outputSize > targetSize) {
    console.log(`   ⚠️  WARNING: Output size exceeds target (${Math.round(targetSize / 1024)}KB)`);
  } else {
    console.log(`   ✅ Size within budget!`);
  }

  return outputPath;
}

/**
 * Main execution (if called directly)
 */
async function main() {
  const inputPath = process.argv[2];
  const outputPath = process.argv[3];
  const assetType = process.argv[4];

  if (!inputPath || !outputPath || !assetType) {
    console.error('❌ Usage: node post-process.js <inputPath> <outputPath> <assetType>');
    console.error('   Asset types: block-texture, arrow-icon, background, lock-overlay, currency-icon, win-icon, logo');
    process.exit(1);
  }

  try {
    await postProcessAsset(inputPath, outputPath, assetType);
    console.log('\n✅ Post-processing complete!');
  } catch (error) {
    console.error('\n❌ Post-processing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { postProcessAsset, erodeAlphaChannel, compressJPEG, optimizePNG };
