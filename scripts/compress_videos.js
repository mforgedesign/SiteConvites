// compress_videos.js - Download videos from Supabase, compress to 480p 30fps, re-upload
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://xchphsltccopelblbsyb.supabase.co';
const SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhjaHBoc2x0Y2NvcGVsYmxic3liIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzY1MjUyNCwiZXhwIjoyMDg5MjI4NTI0fQ.30EWtw6i64ca-yz-D-7Hq154OVjtZ_gKNneOA5PV1B0';
const BUCKET = 'modelos';
const FFMPEG = path.join(process.env.HOME, '.local', 'bin', 'ffmpeg');

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const TEMP_DIR = path.join(__dirname, '..', 'temp_compress');

// Recursively list all mp4 files
async function listMp4Files(prefix = '') {
  const files = [];
  const { data: items, error } = await supabase.storage.from(BUCKET).list(prefix, { limit: 200 });
  if (error || !items) return files;

  for (const item of items) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id === null) {
      // It's a folder, recurse
      const subFiles = await listMp4Files(fullPath);
      files.push(...subFiles);
    } else if (item.name.endsWith('.mp4')) {
      // It's an MP4 file
      files.push({ path: fullPath, size: item.metadata?.size || 0 });
    }
  }
  return files;
}

// Compress a video to 480p 30fps
function compressVideo(inputPath, outputPath) {
  const cmd = `"${FFMPEG}" -y -i "${inputPath}" -vf "scale='min(854,iw)':'min(480,ih)':force_original_aspect_ratio=decrease,pad=ceil(iw/2)*2:ceil(ih/2)*2" -r 30 -c:v libx264 -preset fast -crf 28 -c:a aac -b:a 128k -movflags +faststart "${outputPath}" 2>&1`;
  execSync(cmd, { maxBuffer: 100 * 1024 * 1024 });
}

async function main() {
  console.log('=== Video Compression Script ===\n');

  fs.mkdirSync(TEMP_DIR, { recursive: true });

  console.log('Listing MP4 files in Supabase Storage...');
  const files = await listMp4Files();
  console.log(`Found ${files.length} MP4 files\n`);

  const totalOriginalSize = files.reduce((sum, f) => sum + f.size, 0);
  console.log(`Total original size: ${(totalOriginalSize / 1048576).toFixed(1)} MB\n`);

  let processed = 0;
  let totalSaved = 0;
  let errors = [];

  for (const file of files) {
    processed++;
    const pct = ((processed / files.length) * 100).toFixed(0);
    console.log(`[${processed}/${files.length} ${pct}%] ${file.path}`);

    const localOriginal = path.join(TEMP_DIR, 'original.mp4');
    const localCompressed = path.join(TEMP_DIR, 'compressed.mp4');

    try {
      // Download original
      const { data, error: dlError } = await supabase.storage.from(BUCKET).download(file.path);
      if (dlError) throw new Error(`Download failed: ${dlError.message}`);
      const buffer = Buffer.from(await data.arrayBuffer());
      fs.writeFileSync(localOriginal, buffer);
      const originalSize = buffer.length;

      // Compress
      compressVideo(localOriginal, localCompressed);
      const compressedSize = fs.statSync(localCompressed).size;

      const saved = originalSize - compressedSize;
      const savedPct = ((saved / originalSize) * 100).toFixed(0);
      console.log(`  ${(originalSize/1048576).toFixed(1)}MB → ${(compressedSize/1048576).toFixed(1)}MB (${savedPct}% reduction)`);

      // Delete original from Supabase
      const { error: delError } = await supabase.storage.from(BUCKET).remove([file.path]);
      if (delError) console.warn(`  Warning: delete failed: ${delError.message}`);

      // Upload compressed version
      const compressedBuffer = fs.readFileSync(localCompressed);
      const { error: upError } = await supabase.storage.from(BUCKET).upload(file.path, compressedBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });
      if (upError) throw new Error(`Upload failed: ${upError.message}`);

      totalSaved += saved;
      console.log(`  ✓ Uploaded\n`);

      fs.unlinkSync(localOriginal);
      fs.unlinkSync(localCompressed);

    } catch (err) {
      console.error(`  ✗ Error: ${err.message}\n`);
      errors.push({ file: file.path, error: err.message });
      try { fs.unlinkSync(localOriginal); } catch {}
      try { fs.unlinkSync(localCompressed); } catch {}
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Processed: ${processed}/${files.length} files`);
  console.log(`Total saved: ${(totalSaved / 1048576).toFixed(1)} MB`);
  console.log(`Errors: ${errors.length}`);
  if (errors.length > 0) {
    console.log('\nFailed files:');
    errors.forEach(e => console.log(`  - ${e.file}: ${e.error}`));
  }

  fs.rmSync(TEMP_DIR, { recursive: true, force: true });
}

main().catch(console.error);
