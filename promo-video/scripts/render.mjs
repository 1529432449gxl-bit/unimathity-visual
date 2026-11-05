// 用法：node scripts/render.mjs [CompositionId] [输出文件] [--props=xxx.json] [其他 remotion 参数]
// 例：node scripts/render.mjs Section-Pain out/pain.mp4
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';

const args = process.argv.slice(2);
const pos = args.filter((a) => !a.startsWith('--'));
const extra = args.filter((a) => a.startsWith('--'));
const id = pos[0] ?? 'UnimathityPromo';
const out = pos[1] ?? `out/${id}.mp4`;
const candidates = [process.env.REMOTION_BROWSER, '/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell'];
const browser = candidates.find((p) => p && fs.existsSync(p));
const cmd = ['remotion', 'render', id, out, ...(browser ? [`--browser-executable=${browser}`] : []), ...extra];
console.log('> npx ' + cmd.join(' '));
const r = spawnSync('npx', cmd, {stdio: 'inherit'});
process.exit(r.status ?? 1);
