#!/usr/bin/env node
/**
 * 设置后台管理密码
 *
 * 用法：
 *   node scripts/set-admin-password.mjs 你的新密码
 *   pnpm admin:passwd 你的新密码
 *
 * 脚本会生成随机盐值，把 sha256(盐:密码) 写回 src/config/adminConfig.ts。
 * 明文密码不会保存在任何地方。
 */

import { createHash, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const configPath = join(projectRoot, "src", "config", "adminConfig.ts");

const password = process.argv.slice(2).join(" ").trim();

if (!password) {
	console.error("\n用法：node scripts/set-admin-password.mjs 你的新密码\n");
	process.exit(1);
}

if (password.length < 6) {
	console.warn("\n⚠️  密码少于 6 位，安全性较低，建议使用 12 位以上的强密码。\n");
}

const salt = `firefly-${randomBytes(6).toString("hex")}`;
const hash = createHash("sha256").update(`${salt}:${password}`).digest("hex");

let source = readFileSync(configPath, "utf8");

const before = source;
source = source.replace(
	/(passwordHash:\s*\n?\s*")[^"]*(")/,
	`$1${hash}$2`,
);
source = source.replace(/(salt:\s*")[^"]*(")/, `$1${salt}$2`);

if (source === before) {
	console.error(
		"\n❌ 没能定位到 passwordHash / salt 字段，请检查 src/config/adminConfig.ts 是否被改动过。\n",
	);
	process.exit(1);
}

writeFileSync(configPath, source, "utf8");

console.log("\n✅ 后台密码已更新");
console.log(`   盐值：${salt}`);
console.log(`   哈希：${hash}`);
console.log(
	"\n提示：密码校验在浏览器本地完成，适合隐藏入口；需要强鉴权请再套一层服务端认证。\n",
);
