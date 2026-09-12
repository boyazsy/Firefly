/**
 * 后台登录校验（浏览器端）
 *
 * Firefly 默认是纯静态站点，没有服务端，登录只能在浏览器里完成：
 * 配置文件里存的是「加盐后的 SHA-256 哈希」，输入密码后在本地算哈希再比对，
 * 整个过程不发往任何服务器。这足以挡住误触与随手乱点，
 * 但挡不住铁了心要翻源码的人 —— 需要强鉴权请再加一层 Cloudflare Access 之类的服务端认证。
 *
 * 修改密码：pnpm admin:passwd 新密码
 */

import { adminConfig } from "@/config/adminConfig";

const SESSION_KEY = "firefly:admin:session";
const ATTEMPT_KEY = "firefly:admin:attempts";

interface SessionPayload {
	/** 过期时间（毫秒时间戳） */
	exp: number;
	/** 校验通过的哈希，仅用于本地识别登录状态 */
	token: string;
}

interface AttemptPayload {
	/** 已连续失败次数 */
	count: number;
	/** 锁定解除时间（毫秒时间戳） */
	until: number;
}

function readJSON<T>(key: string): T | null {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(key);
		return raw ? (JSON.parse(raw) as T) : null;
	} catch {
		return null;
	}
}

function writeJSON(key: string, value: unknown): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// 隐私模式下 localStorage 可能不可写，忽略即可
	}
}

/** 计算字符串的 SHA-256（小写 hex） */
export async function sha256Hex(text: string): Promise<string> {
	const data = new TextEncoder().encode(text);
	if (typeof crypto === "undefined" || !crypto.subtle) {
		throw new Error("当前环境不支持 Web Crypto，请改用 https 访问本站后台");
	}
	const buffer = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(buffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}

/** 校验密码是否正确 */
export async function verifyPassword(password: string): Promise<boolean> {
	const input = await sha256Hex(`${adminConfig.auth.salt}:${password}`);
	return input === adminConfig.auth.passwordHash.trim().toLowerCase();
}

/** 读取当前锁定状态 */
export function getLockState(): { locked: boolean; remainMs: number } {
	const attempt = readJSON<AttemptPayload>(ATTEMPT_KEY);
	if (!attempt || !attempt.until) return { locked: false, remainMs: 0 };
	const remainMs = attempt.until - Date.now();
	if (remainMs <= 0) return { locked: false, remainMs: 0 };
	return { locked: true, remainMs };
}

/** 记录一次失败登录，返回锁定状态 */
export function registerFailedAttempt(): {
	locked: boolean;
	remainMs: number;
	remainAttempts: number;
} {
	const { maxAttempts, lockMinutes } = adminConfig.auth;
	const attempt = readJSON<AttemptPayload>(ATTEMPT_KEY) ?? { count: 0, until: 0 };
	attempt.count += 1;
	if (attempt.count >= maxAttempts) {
		attempt.count = 0;
		attempt.until = Date.now() + lockMinutes * 60 * 1000;
	}
	writeJSON(ATTEMPT_KEY, attempt);
	const remainMs = Math.max(0, attempt.until - Date.now());
	return {
		locked: remainMs > 0,
		remainMs,
		remainAttempts: Math.max(0, maxAttempts - attempt.count),
	};
}

/** 登录成功后清空失败计数 */
export function resetAttempts(): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.removeItem(ATTEMPT_KEY);
	} catch {
		// ignore
	}
}

/** 是否已登录且会话未过期 */
export function isUnlocked(): boolean {
	const session = readJSON<SessionPayload>(SESSION_KEY);
	if (!session) return false;
	return session.exp > Date.now();
}

/** 写入登录会话 */
export async function createSession(password: string): Promise<void> {
	const { sessionHours } = adminConfig.auth;
	const token = await sha256Hex(`${adminConfig.auth.salt}:${password}`);
	const hours = sessionHours > 0 ? sessionHours : 12;
	writeJSON(SESSION_KEY, { exp: Date.now() + hours * 3600 * 1000, token });
}

/** 退出登录 */
export function destroySession(): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.removeItem(SESSION_KEY);
	} catch {
		// ignore
	}
}

/** 剩余有效时长（毫秒） */
export function getSessionRemainMs(): number {
	const session = readJSON<SessionPayload>(SESSION_KEY);
	if (!session) return 0;
	return Math.max(0, session.exp - Date.now());
}

/** 把毫秒格式化成「x 分 / x 小时 x 分」 */
export function formatDuration(ms: number): string {
	const totalMinutes = Math.ceil(ms / 60000);
	if (totalMinutes < 60) return `${totalMinutes} 分钟`;
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return minutes ? `${hours} 小时 ${minutes} 分钟` : `${hours} 小时`;
}
