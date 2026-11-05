// 扫描 public/photos/ 下的图片，生成 src/content/photos.generated.ts（槽位名 = 去掉扩展名的文件名）。
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'public', 'photos');
const out = path.join(root, 'src', 'content', 'photos.generated.ts');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).sort() : [];
const map = Object.fromEntries(files.map((f) => [f.replace(/\.[^.]+$/, ''), `photos/${f}`]));
const body = `// 由 scripts/scan-photos.mjs 自动生成：槽位名 -> public 下的路径。不要手改。\nexport const PHOTOS: Record<string, string> = ${JSON.stringify(map, null, 2)};\n`;
if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== body) fs.writeFileSync(out, body);
console.log(`[photos] ${files.length} 张照片已登记${files.length ? '：' + files.join(', ') : '（全部显示占位框）'}`);
