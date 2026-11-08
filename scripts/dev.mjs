import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
process.chdir(root);
const config = resolve(root, '.env.demo');
try { process.loadEnvFile(config); }
catch (error) { if (error.code !== 'ENOENT') throw error; }
if (!process.env.DEMO_ACCESS_PIN) {
  if (process.env.NODE_ENV === 'production') throw new Error('Configure DEMO_ACCESS_PIN before starting.');
  const pin = String(randomInt(0, 10000)).padStart(4, '0');
  await writeFile(config, `DEMO_ACCESS_PIN=${pin}\n`, { flag: 'wx', mode: 0o600 });
  process.env.DEMO_ACCESS_PIN = pin;
  console.log('Local demo PIN generated in .env.demo (ignored by Git).');
}
const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build', '--workspace', '@proofly/web'], { cwd: root, stdio: 'inherit', shell: false });
if (build.status !== 0) process.exit(build.status || 1);
const { createDemoServer } = await import('../server.mjs');
const { createPrivateApp } = await import('./private-app.mjs');
const app = await createPrivateApp();
const server = createDemoServer({ appHandler: app.handle.bind(app) });
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => console.log(`Proofly: http://127.0.0.1:${server.address().port}`));
