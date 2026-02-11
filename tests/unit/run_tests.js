const fs = require('fs');
const path = require('path');
const url = require('url');

(async function(){
  const dir = __dirname;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.test.js') || f.endsWith('.test.mjs'));
  if (!files.length) { console.log('No tests found'); process.exit(0); }
  let failures = 0;
  for (const f of files){
    const p = path.join(dir, f);
    console.log('\n=== running', f);
    try {
      // Prefer dynamic import for ESM; handle both .mjs and .js tests
      if (f.endsWith('.mjs')) {
        await import(url.pathToFileURL(p).href);
      } else {
        try {
          require(p);
        } catch (e) {
          // If require failed because file is ESM, fallback to dynamic import
          if (e && (e.code === 'ERR_REQUIRE_ESM' || /Unexpected token 'export'/.test(e.message) || /Unexpected token 'import'/.test(e.message))) {
            await import(url.pathToFileURL(p).href);
          } else { throw e; }
        }
      }
      console.log('PASS:', f);
    } catch (e){
      console.error('FAIL:', f, e.stack || e);
      failures++;
    }
  }
  if (failures) process.exit(1);
  console.log('\nALL UNIT TESTS PASSED');
})();
