/**
 * GitHub 发布（浏览器端直连 GitHub Contents API）
 *
 * 填写仓库信息与 Personal Access Token 后，后台可以直接把文章提交到仓库，
 * 再由 Cloudflare Pages / GitHub Pages 的自动构建完成发布。
 * Token 只保存在你自己的浏览器 localStorage 里，不会写进仓库，也不会发往除 GitHub 之外的任何地方。
 * 需要的权限：Contents: Read and write（经典 token 勾选 repo，或细粒度 token 勾选 Contents 读写）。
 */

import { fromBase64, toBase64 } from "./admin-markdown";

export interface GitHubTarget {
	owner: string;
	repo: string;
	branch: string;
	postsPath: string;
	token: string;
}

export interface GitHubResult<T = undefined> {
	ok: boolean;
	message: string;
	data?: T;
}

export function isGitHubReady(target: Partial<GitHubTarget>): boolean {
	return Boolean(target?.owner && target?.repo && target?.token);
}

/** 拼接仓库内路径，去掉多余斜杠 */
export function joinRepoPath(...parts: string[]): string {
	return parts
		.filter((part) => part && part.trim() !== "")
		.map((part) => part.replace(/^\/+|\/+$/g, ""))
		.join("/");
}

/** 文章在仓库中的完整路径，例如 src/content/posts/hello.md */
export function buildPostPath(postsPath: string, filename: string): string {
	const cleanName = filename.replace(/^\/+/, "");
	return joinRepoPath(postsPath || "src/content/posts", cleanName);
}

function apiUrl(owner: string, repo: string, path = ""): string {
	const encoded = path
		.split("/")
		.map((segment) => encodeURIComponent(segment))
		.join("/");
	return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents${encoded ? `/${encoded}` : ""}`;
}

function buildHeaders(token: string): HeadersInit {
	return {
		Accept: "application/vnd.github+json",
		Authorization: `Bearer ${token}`,
		"X-GitHub-Api-Version": "2022-11-28",
		"Content-Type": "application/json",
	};
}

async function readError(response: Response): Promise<string> {
	try {
		const data = (await response.json()) as { message?: string };
		if (data?.message) {
			if (response.status === 401) return `Token 无效或已过期：${data.message}`;
			if (response.status === 404)
				return `仓库或路径不存在（404）：${data.message}`;
			if (response.status === 403)
				return `没有权限或触发了接口限流（403）：${data.message}`;
			return data.message;
		}
	} catch {
		// ignore
	}
	return `请求失败（HTTP ${response.status}）`;
}

/** 检查仓库与 Token 是否可用 */
export async function checkRepoAccess(
	target: GitHubTarget,
): Promise<GitHubResult<{ fullName: string; defaultBranch: string }>> {
	if (!isGitHubReady(target)) {
		return { ok: false, message: "请先填写仓库所有者、仓库名与 Token" };
	}
	try {
		const response = await fetch(
			`https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.repo)}`,
			{ headers: buildHeaders(target.token) },
		);
		if (!response.ok) {
			return { ok: false, message: await readError(response) };
		}
		const data = (await response.json()) as {
			full_name: string;
			default_branch: string;
			permissions?: Record<string, boolean>;
		};
		return {
			ok: true,
			message: `连接成功：${data.full_name}`,
			data: { fullName: data.full_name, defaultBranch: data.default_branch },
		};
	} catch (error) {
		return { ok: false, message: `网络请求失败：${String(error)}` };
	}
}

/** 读取仓库中某个文件的原始内容与 sha（不存在时返回 ok=false） */
export async function fetchRepoFile(
	target: GitHubTarget,
	path: string,
): Promise<GitHubResult<{ content: string; sha: string }>> {
	if (!isGitHubReady(target)) {
		return { ok: false, message: "仓库信息或 Token 不完整" };
	}
	try {
		const response = await fetch(
			`${apiUrl(target.owner, target.repo, path)}?ref=${encodeURIComponent(target.branch || "main")}`,
			{ headers: buildHeaders(target.token) },
		);
		if (!response.ok) {
			return { ok: false, message: await readError(response) };
		}
		const data = (await response.json()) as {
			content?: string;
			sha?: string;
			encoding?: string;
		};
		if (!data.content) return { ok: false, message: "文件内容为空" };
		return {
			ok: true,
			message: "读取成功",
			data: { content: fromBase64(data.content), sha: data.sha ?? "" },
		};
	} catch (error) {
		return { ok: false, message: `网络请求失败：${String(error)}` };
	}
}

/** 新建或更新仓库中的文件，sha 存在时为更新 */
export async function commitRepoFile(
	target: GitHubTarget,
	path: string,
	content: string,
	message: string,
	sha?: string,
): Promise<GitHubResult<{ htmlUrl: string }>> {
	if (!isGitHubReady(target)) {
		return { ok: false, message: "仓库信息或 Token 不完整" };
	}
	try {
		const response = await fetch(apiUrl(target.owner, target.repo, path), {
			method: "PUT",
			headers: buildHeaders(target.token),
			body: JSON.stringify({
				message,
				content: toBase64(content),
				branch: target.branch || "main",
				...(sha ? { sha } : {}),
			}),
		});
		if (!response.ok) {
			return { ok: false, message: await readError(response) };
		}
		const data = (await response.json()) as {
			content?: { html_url?: string };
		};
		return {
			ok: true,
			message: sha ? "文章已更新" : "文章已提交",
			data: { htmlUrl: data.content?.html_url ?? "" },
		};
	} catch (error) {
		return { ok: false, message: `网络请求失败：${String(error)}` };
	}
}
