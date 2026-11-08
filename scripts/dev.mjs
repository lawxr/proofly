import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
process.chdir(root);
try { process.loadEnvFile(resolve(root, '.env.local')); }
catch (error) { if (error.code !== 'ENOENT') throw error; }

const build = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'build', '--workspace', '@proofly/web'], { cwd: root, stdio: 'inherit', shell: false });
if (build.status !== 0) process.exit(build.status || 1);

const { createDependenciesFromEnv } = await import('../apps/api/src/app.ts');
const { RegisterUserUseCase, LoginUseCase, UpdateProfileUseCase, ChangePasswordUseCase } = await import('../packages/domain/src/index.ts');
const { createAppService } = await import('./app-service.mjs');
const { createProoflyServer } = await import('../server.mjs');

const deps = createDependenciesFromEnv(process.env);
const register = new RegisterUserUseCase(deps.userRepo, deps.kycVerifier);
const login = new LoginUseCase(deps.userRepo);
const updateProfile = new UpdateProfileUseCase(deps.userRepo);
const changePassword = new ChangePasswordUseCase(deps.userRepo);
const app = await createAppService(deps);

const server = createProoflyServer({
  appHandler: app.handle.bind(app),
  auth: { register: dto => register.execute(dto), login: dto => login.execute(dto) },
  account: { updateProfile: dto => updateProfile.execute(dto), changePassword: dto => changePassword.execute(dto) }
});
server.listen(Number(process.env.PORT || 3000), '127.0.0.1', () => {
  console.log(`Proofly: http://127.0.0.1:${server.address().port}`);
  console.log(`Persistencia: ${process.env.PERSISTENCE === 'postgres' ? 'Postgres' : 'memoria'}`);
});
