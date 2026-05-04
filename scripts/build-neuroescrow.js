#!/usr/bin/env node

/**
 * Build script for NeuroEscrow subdomain deployment
 * Copies neuroescrow files to build output directory
 */

const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'neuroescrow');
const outputDir = path.join(__dirname, '..', 'dist-neuroescrow');

console.log('🔨 Building NeuroEscrow for subdomain deployment...\n');

// Clean output directory
if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
    console.log('✅ Cleaned output directory');
}

// Create output directory
fs.mkdirSync(outputDir, { recursive: true });

// Copy files recursively
function copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    
    if (stats.isDirectory()) {
        fs.mkdirSync(dest, { recursive: true });
        const files = fs.readdirSync(src);
        
        files.forEach(file => {
            copyRecursive(
                path.join(src, file),
                path.join(dest, file)
            );
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

copyRecursive(sourceDir, outputDir);

console.log('✅ Copied neuroescrow files to dist-neuroescrow/');
console.log('\n📦 Build complete!');
console.log(`📁 Output: ${outputDir}`);
