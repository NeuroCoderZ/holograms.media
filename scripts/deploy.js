const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const versionFilePath = path.join(__dirname, '../version.txt');
const packageJsonPath = path.join(__dirname, '../package.json');
const indexHtmlPath = path.join(__dirname, '../index.html');

// 1. Get Commit Message from args
const args = process.argv.slice(2);
const commitMessage = args[0] || 'Auto-deployment';

// 2. Read and Increment Version
let version = '0.0.0';
if (fs.existsSync(versionFilePath)) {
    version = fs.readFileSync(versionFilePath, 'utf8').trim();
}

const versionParts = version.split('.').map(Number);
versionParts[2] += 1; // Increment patch
const newVersion = versionParts.join('.');

console.log(`🚀 Starting Deployment: ${version} -> ${newVersion}`);
console.log(`📝 Message: ${commitMessage}`);

// 3. Update version.txt
fs.writeFileSync(versionFilePath, newVersion);

// 4. Update package.json
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

// 5. Update index.html
let indexHtml = fs.readFileSync(indexHtmlPath, 'utf8');
// Regex to find: <script>console.log("DEPLOY VERSION: ... - ...");</script>
// We replace the content inside the console.log
const deployLogRegex = /console\.log\("DEPLOY VERSION: .*?"\);/;
const newLogLine = `console.log("DEPLOY VERSION: ${newVersion} - ${commitMessage}");`;

if (deployLogRegex.test(indexHtml)) {
    indexHtml = indexHtml.replace(deployLogRegex, newLogLine);
    fs.writeFileSync(indexHtmlPath, indexHtml);
    console.log('✅ Updated index.html version log');
} else {
    console.warn('⚠️ Could not find DEPLOY VERSION log in index.html to update.');
}

// 6. Run generate_version.js (updates public/version.json)
try {
    execSync('node scripts/generate_version.js', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
} catch (e) {
    console.error('❌ Failed to generate version.json', e);
    process.exit(1);
}

// 7. Git Operations
try {
    console.log('📦 Staging files...');
    execSync('git add .', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    console.log('💾 Committing...');
    execSync(`git commit -m "DEPLOY: v${newVersion} - ${commitMessage}"`, { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    console.log('☁️ Pushing to origin dev...');
    execSync('git push origin dev', { stdio: 'inherit', cwd: path.join(__dirname, '..') });

    console.log(`🎉 Deployment Complete! v${newVersion}`);
} catch (e) {
    console.error('❌ Git operations failed', e);
    process.exit(1);
}
