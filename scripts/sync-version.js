const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
  const hash = execSync('git rev-parse --short HEAD').toString().trim();
  const pkg = require(path.join(process.cwd(), 'package.json'));
  const content = `export const APP_VERSION = "${pkg.version}";\nexport const COMMIT_HASH = "${hash}";\n`;
  const versionPath = path.join(process.cwd(), 'src/app/dashboard/version.ts');
  
  fs.writeFileSync(versionPath, content);
  console.log(`✅ Version synced: v${pkg.version} [${hash}]`);
} catch (error) {
  console.error("❌ Failed to sync version:", error.message);
}
