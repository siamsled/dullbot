#!/usr/bin/env node

/**
 * DullBot Media Compression Utility Script
 * 
 * Compresses images (WebP) and videos (H.264 MP4) to preserve premium HD quality 
 * while minimizing storage footprint for Supabase and customer bandwidth.
 * 
 * Dependencies:
 *   - sharp (Node.js package, already installed in this project)
 *   - ffmpeg (System command-line tool, required for video compression)
 * 
 * Usage:
 *   node scripts/compress-media.js <input-path> [output-directory]
 * 
 * Example:
 *   node scripts/compress-media.js ./raw-assets ./compressed-assets
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const sharp = require('sharp');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log(`
Usage:
  node scripts/compress-media.js <input-path> [output-directory]

Arguments:
  <input-path>       Path to a single image/video file or a directory containing media.
  [output-directory] (Optional) Directory to save compressed assets. Defaults to 'compressed-media' in the current working directory.
  `);
  process.exit(1);
}

const inputPath = path.resolve(args[0]);
const outputDir = path.resolve(args[1] || './compressed-media');

if (!fs.existsSync(inputPath)) {
  console.error(`❌ Input path does not exist: ${inputPath}`);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Check if system ffmpeg is installed
function checkFFmpeg() {
  return new Promise((resolve) => {
    exec('ffmpeg -version', (err) => {
      resolve(!err);
    });
  });
}

async function compressImage(filePath, targetDir) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const outPath = path.join(targetDir, `${baseName}.webp`);

  console.log(`⏳ [Image] Compressing ${path.basename(filePath)}...`);
  try {
    const pipeline = sharp(filePath);
    const metadata = await pipeline.metadata();

    // Resize to max 1920px width to keep it HD but avoid unnecessarily huge file sizes
    if (metadata.width && metadata.width > 1920) {
      pipeline.resize({ width: 1920, fit: 'inside', withoutEnlargement: true });
    }

    await pipeline
      .webp({ quality: 82 }) // 82% quality is indistinguishable from 100% but 10x smaller
      .toFile(outPath);

    const oldSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    const newSize = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
    console.log(`✅ [Image] Done: ${baseName}.webp (${oldSize}MB -> ${newSize}MB)`);
  } catch (err) {
    console.error(`❌ [Image] Failed to compress ${path.basename(filePath)}:`, err.message);
  }
}

function compressVideo(filePath, targetDir, hasFFmpeg) {
  return new Promise((resolve) => {
    const ext = path.extname(filePath).toLowerCase();
    const baseName = path.basename(filePath, ext);
    const outPath = path.join(targetDir, `${baseName}-compressed.mp4`);

    if (!hasFFmpeg) {
      console.warn(`⚠️ [Video] Skipped ${path.basename(filePath)} because ffmpeg is not installed on this machine.`);
      console.warn(`   Install it via: 'brew install ffmpeg' (macOS) or download from https://ffmpeg.org`);
      resolve();
      return;
    }

    console.log(`⏳ [Video] Compressing ${path.basename(filePath)} using H.264 (HD quality, CRF 23)...`);
    // -vf "scale='min(1920,iw)':-2" rescales to max 1080p width while preserving aspect ratio
    // -crf 23 delivers high definition visuals with a highly optimized file size
    const cmd = `ffmpeg -y -i "${filePath}" -vcodec libx264 -crf 23 -preset medium -vf "scale='min(1920,iw)':-2" -acodec aac -b:a 128k "${outPath}"`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) {
        console.error(`❌ [Video] Failed to compress ${path.basename(filePath)}:`, err.message);
      } else {
        const oldSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
        const newSize = (fs.statSync(outPath).size / 1024 / 1024).toFixed(2);
        console.log(`✅ [Video] Done: ${baseName}-compressed.mp4 (${oldSize}MB -> ${newSize}MB)`);
      }
      resolve();
    });
  });
}

async function processFile(filePath, targetDir, hasFFmpeg) {
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.tiff', '.avif', '.gif'];
  const videoExts = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.ogg', '.mpeg'];

  if (imageExts.includes(ext)) {
    await compressImage(filePath, targetDir);
  } else if (videoExts.includes(ext)) {
    await compressVideo(filePath, targetDir, hasFFmpeg);
  }
}

async function start() {
  const hasFFmpeg = await checkFFmpeg();
  const isDirectory = fs.statSync(inputPath).isDirectory();

  console.log(`🚀 Starting media compression...`);
  console.log(`📂 Output folder: ${outputDir}`);
  if (!hasFFmpeg) {
    console.warn(`⚠️ System 'ffmpeg' not detected. Video compression will be skipped.`);
  }

  if (isDirectory) {
    const files = fs.readdirSync(inputPath);
    for (const file of files) {
      const fullPath = path.join(inputPath, file);
      if (fs.statSync(fullPath).isFile()) {
        await processFile(fullPath, outputDir, hasFFmpeg);
      }
    }
  } else {
    await processFile(inputPath, outputDir, hasFFmpeg);
  }
  console.log(`✨ Compression process completed.`);
}

start();
