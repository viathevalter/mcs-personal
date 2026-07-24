const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectJsonPath = path.join(__dirname, '.vercel', 'project.json');
const backupPath = path.join(__dirname, '.vercel', 'project.json.bak');

const prodConfig = {
  projectId: "prj_H0b9PaioSAnCy4DT3dBd9V227mgA",
  orgId: "team_5exNd3izEqxByicxACEkiAoo",
  projectName: "mcs-personal"
};

try {
  // 1. Backup original project.json
  if (fs.existsSync(projectJsonPath)) {
    console.log('Backing up project.json...');
    fs.copyFileSync(projectJsonPath, backupPath);
  }

  // 2. Write production config
  console.log('Writing production scope project.json...');
  fs.writeFileSync(projectJsonPath, JSON.stringify(prodConfig, null, 2));

  // 3. Run vercel production deployment
  console.log('Running Vercel deployment for PRODUCTION scope...');
  execSync('vercel --yes', { stdio: 'inherit' });
  console.log('Vercel production deployment completed successfully!');

} catch (error) {
  console.error('Error during production deployment:', error.message);
} finally {
  // 4. Restore original project.json
  if (fs.existsSync(backupPath)) {
    console.log('Restoring project.json from backup...');
    fs.copyFileSync(backupPath, projectJsonPath);
    fs.unlinkSync(backupPath);
  }
}
