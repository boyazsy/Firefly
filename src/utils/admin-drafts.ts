/**
 * 后台本地存储：草稿箱与 GitHub 发布设置
 * 数据只保存在当前浏览器，换设备/换浏览器不会同步
 */

import type { AdminDraft } from "@/types/adminConfig";

const DRAFTS_KEY = "firefly:admin:drafts";
const GITHUB_KEY = "firefly:admin:github";

export interface GitHubSettings {
	owner: string;
	repo: string;
	branch: string;
	postsPath: string;
	token: string;
}

function safeParse<T>(raw: string | null, fallback: T): T {
	if (!raw) return fallback;
	try {
		return JSON.parse(raw) as T;
	} catch {
		return fallback;
	}
}

function storage(): Storage | null {
	if (typeof localStorage === "undefined") return null;
	return localStorage;
}

/** 读取全部草稿，按保存时间倒序 */
export function listDrafts(): AdminDraft[] {
	const store = storage();
	if (!store) return [];
	const drafts = safeParse<AdminDraft[]>(store.getItem(DRAFTS_KEY), []);
	if (!Array.isArray(drafts)) return [];
	return drafts.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
}

/** 保存草稿：同 id 覆盖，超出上限丢弃最旧的 */
export function saveDraft(draft: AdminDraft, max = 30): AdminDraft[] {
	const store = storage();
	if (!store) return [];
	const drafts = listDrafts().filter((item) => item.id !== draft.id);
	drafts.unshift({ ...draft, savedAt: Date.now() });
	const trimmed = drafts.slice(0, Math.max(1, max));
	store.setItem(DRAFTS_KEY, JSON.stringify(trimmed));
	return trimmed;
}

export function getDraft(id: string): AdminDraft | undefined {
	return listDrafts().find((item) => item.id === id);
}

export function deleteDraft(id: string): AdminDraft[] {
	const store = storage();
	if (!store) return [];
	const drafts = listDrafts().filter((item) => item.id !== id);
	store.setItem(DRAFTS_KEY, JSON.stringify(drafts));
	return drafts;
}

/** 读取 GitHub 发布设置 */
export function getGitHubSettings(): GitHubSettings {
	const store = storage();
	if (!store) {
		return { owner: "", repo: "", branch: "main", postsPath: "", token: "" };
	}
	return safeParse<GitHubSettings>(store.getItem(GITHUB_KEY), {
		owner: "",
		repo: "",
		branch: "main",
		postsPath: "",
		token: "",
	});
}

export function saveGitHubSettings(settings: GitHubSettings): void {
	storage()?.setItem(GITHUB_KEY, JSON.stringify(settings));
}

/** 把毫秒时间戳格式化为「YYYY-MM-DD HH:mm」 */
export function formatTimestamp(ms: number): string {
	const date = new Date(ms);
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
