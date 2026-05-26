const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const versionFilePath = path.join(ROOT, 'version.txt');
const publicVersionPath = path.join(ROOT, 'public/version.json');
const manifestPath = path.join(ROOT, 'public/manifest.json');
const indexPath = path.join(ROOT, 'index.html');

let version = 'unknown';
if (fs.existsSync(versionFilePath)) {
    version = fs.readFileSync(versionFilePath, 'utf8').trim();
}

const versionData = {
    version: version,
    timestamp: new Date().toISOString(),
    env: process.env.VITE_ENVIRONMENT || 'production',
    build: Date.now()
};

if (!fs.existsSync(path.dirname(publicVersionPath))) {
    fs.mkdirSync(path.dirname(publicVersionPath), { recursive: true });
}

// 1. version.json
fs.writeFileSync(publicVersionPath, JSON.stringify(versionData, null, 2));
console.log(`Version file generated: ${publicVersionPath} (Version: ${version})`);

// 2. manifest.json — inject version if missing
if (fs.existsSync(manifestPath)) {
    try {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        manifest.version = version;
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
        console.log(`✅ manifest.json updated (version: ${version})`);
    } catch (e) {
        console.warn(`⚠️  manifest.json update failed: ${e.message}`);
    }
}

// 3. index.html — inject BUILD timestamp + meta[name=app-version]
if (fs.existsSync(indexPath)) {
    let html = fs.readFileSync(indexPath, 'utf8');

    // BUILD timestamp comment
    const buildCommentRegex = /<!-- BUILD: \d+ -->/;
    const buildComment = `<!-- BUILD: ${Date.now()} -->`;
    if (buildCommentRegex.test(html)) {
        html = html.replace(buildCommentRegex, buildComment);
    } else {
        html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n  ${buildComment}`);
    }

    // meta[name=app-version]
    const metaVersionRegex = /<meta name="app-version" content="[^"]*">/;
    const metaVersionTag = `<meta name="app-version" content="${version}">`;
    if (metaVersionRegex.test(html)) {
        html = html.replace(metaVersionRegex, metaVersionTag);
    } else {
        html = html.replace('<meta charset="UTF-8">', `<meta charset="UTF-8">\n  ${metaVersionTag}`);
    }

    fs.writeFileSync(indexPath, html);
    console.log(`✅ index.html updated (version: ${version}, build: ${versionData.build})`);
}
