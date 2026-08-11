const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const sourceDir = path.join(projectRoot, 'gfg-main', 'dist');
const targetDir = path.join(projectRoot, 'dist');

if (!fs.existsSync(sourceDir)) {
  console.error(`Build output not found at ${sourceDir}. Run the frontend build first.`);
  process.exit(1);
}

fs.rmSync(targetDir, { recursive: true, force: true });
fs.cpSync(sourceDir, targetDir, { recursive: true });
console.log(`Copied frontend build from ${sourceDir} to ${targetDir}`);
