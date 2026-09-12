/**
 * 后台文章处理工具：frontmatter 序列化 / 解析、文件名生成、字数统计、文件下载
 * 全部在浏览器端运行，不依赖任何 Node API
 */

/** frontmatter 输出顺序，与 src/content.config.ts 的 posts schema 保持一致 */
const FRONTMATTER_ORDER = [
	"title",
	"published",
	"updated",
	"draft",
	"description",
	"image",
	"tags",
	"category",
	"lang",
	"pinned",
	"author",
	"sourceLink",
	"licenseName",
	"licenseUrl",
	"comment",
	"password",
	"passwordHint",
	"series",
	"seriesOrder",
	"slug",
] as const;

/** 需要省略的默认值，避免每篇文章都写一长串空字段 */
const DEFAULT_VALUES: Record<string, unknown> = {
	draft: false,
	description: "",
	image: "",
	tags: [],
	category: "",
	lang: "",
	pinned: false,
	author: "",
	sourceLink: "",
	licenseName: "",
	licenseUrl: "",
	comment: true,
	password: "",
	passwordHint: "",
	series: "",
	updated: "",
	slug: "",
};

function isEmptyValue(value: unknown): boolean {
	if (value === undefined || value === null) return true;
	if (typeof value === "string") return value.trim() === "";
	if (Array.isArray(value)) return value.length === 0;
	return false;
}

/** 单个标量的 YAML 表示 */
function yamlScalar(value: unknown): string {
	if (typeof value === "boolean") return value ? "true" : "false";
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : '""';
	const raw = String(value ?? "");
	if (raw === "") return '""';
	// ISO 日期必须原样输出：一旦加引号 YAML 会解析成字符串，
	// 而 posts schema 要求 published/updated 为 date 类型，会导致构建失败
	if (/^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}(:\d{2})?(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/.test(raw)) {
		return raw;
	}
	const needsQuote =
		/[:#\-?{}[\]&*!|>'"%@`]/.test(raw) ||
		/^\s|\s$/.test(raw) ||
		/^(true|false|null|yes|no|on|off|~)$/i.test(raw) ||
		/^[\d.]+$/.test(raw);
	if (needsQuote) {
		return `"${raw.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
	}
	return raw;
}

/** 数组的 YAML 表示，空数组输出 [] */
function yamlArray(items: unknown[]): string {
	if (items.length === 0) return "[]";
	return `[${items.map(yamlScalar).join(", ")}]`;
}

/** 把 frontmatter 对象序列化成 YAML 片段（不含首尾 ---） */
export function serializeFrontmatter(
	frontmatter: Record<string, unknown>,
): string {
	const lines: string[] = [];
	const keys = new Set(Object.keys(frontmatter));

	for (const key of FRONTMATTER_ORDER) {
		if (!keys.has(key)) continue;
		keys.delete(key);
		const value = frontmatter[key];
		if (isEmptyValue(value)) continue;
		if (key in DEFAULT_VALUES) {
			const fallback = DEFAULT_VALUES[key];
			if (Array.isArray(fallback) && Array.isArray(value)) {
				if (value.length === 0) continue;
			} else if (value === fallback) {
				continue;
			}
		}
		lines.push(
			Array.isArray(value) ? `${key}: ${yamlArray(value)}` : `${key}: ${yamlScalar(value)}`,
		);
	}
	// 其余自定义字段追加在后面
	for (const key of keys) {
		const value = frontmatter[key];
		if (isEmptyValue(value)) continue;
		lines.push(
			Array.isArray(value) ? `${key}: ${yamlArray(value)}` : `${key}: ${yamlScalar(value)}`,
		);
	}
	return lines.join("\n");
}

/** 拼装完整的 Markdown 文件内容 */
export function serializePost(
	frontmatter: Record<string, unknown>,
	body: string,
): string {
	const yaml = serializeFrontmatter(frontmatter);
	const content = body.replace(/\s+$/, "");
	return yaml ? `---\n${yaml}\n---\n\n${content}\n` : `${content}\n`;
}

/** 去掉 frontmatter 包裹的引号 */
function unquote(raw: string): string {
	const trimmed = raw.trim();
	if (trimmed.length >= 2) {
		const first = trimmed[0];
		const last = trimmed[trimmed.length - 1];
		if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
			return trimmed.slice(1, -1).replace(/\\"/g, '"');
		}
	}
	return trimmed;
}

/** 简易 YAML 标量解析，够覆盖博客 frontmatter 的常见写法 */
function parseScalar(raw: string): unknown {
	const value = unquote(raw);
	if (/^(true|false)$/i.test(value)) return value.toLowerCase() === "true";
	if (/^(null|~)$/i.test(value) || value === "") return "";
	if (/^-?\d+(\.\d+)?$/.test(value)) return Number(value);
	return value;
}

/**
 * 解析 Markdown 文件：拆出 frontmatter 与正文
 * 只处理单层键值与 [a, b] 数组，复杂嵌套结构会原样保留为字符串
 */
export function parsePostMarkdown(text: string): {
	frontmatter: Record<string, unknown>;
	body: string;
} {
	const normalized = text.replace(/\r\n/g, "\n");
	const match = normalized.match(/^---\n([\s\S]*?)\n---\n?/);
	if (!match) return { frontmatter: {}, body: normalized };

	const frontmatter: Record<string, unknown> = {};
	for (const line of match[1].split("\n")) {
		if (!line.trim() || line.trim().startsWith("#")) continue;
		const index = line.indexOf(":");
		if (index === -1) continue;
		const key = line.slice(0, index).trim();
		const raw = line.slice(index + 1).trim();
		if (raw.startsWith("[") && raw.endsWith("]")) {
			const inner = raw.slice(1, -1).trim();
			frontmatter[key] = inner
				? inner
						.split(",")
						.map((item) => String(parseScalar(item)))
						.filter((item) => item !== "")
				: [];
			continue;
		}
		frontmatter[key] = parseScalar(raw);
	}
	return { frontmatter, body: normalized.slice(match[0].length) };
}

/** 由标题生成文件名友好的 slug（保留中文与常见字符） */
export function slugify(input: string): string {
	return (
		input
			.trim()
			.toLowerCase()
			.replace(/\s+/g, "-")
			.replace(/[\\/:*?"<>|.#]+/g, "-")
			.replace(/-{2,}/g, "-")
			.replace(/^-|-$/g, "") || `post-${Date.now()}`
	);
}

/** 按 YYYY-MM-DD 格式化日期，非法输入回退到今天 */
export function formatDate(date: Date | string): string {
	const d = typeof date === "string" ? new Date(date) : date;
	if (Number.isNaN(d.getTime())) return formatDate(new Date());
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 统计字数：中文按字计，英文按单词计，忽略代码块与内联代码 */
export function countWords(markdown: string): number {
	const text = markdown
		.replace(/```[\s\S]*?```/g, "")
		.replace(/`[^`]*`/g, "")
		.replace(/\s+/g, " ")
		.trim();
	if (!text) return 0;
	const chinese = text.match(/[\u4e00-\u9fa5]/g)?.length ?? 0;
	const english = text.match(/[a-zA-Z]+/g)?.length ?? 0;
	return chinese + english;
}

/** 触发浏览器下载 */
export function downloadTextFile(filename: string, content: string): void {
	const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 复制文本到剪贴板，返回是否成功 */
export async function copyText(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// 继续走兜底方案
	}
	try {
		const textarea = document.createElement("textarea");
		textarea.value = text;
		textarea.style.position = "fixed";
		textarea.style.opacity = "0";
		document.body.appendChild(textarea);
		textarea.select();
		// execCommand 已废弃，只在 clipboard API 不可用时兜底，单独声明类型避免告警
		const legacyCopy = (
			document as Document & { execCommand?: (command: string) => boolean }
		).execCommand;
		const ok = legacyCopy ? legacyCopy.call(document, "copy") : false;
		document.body.removeChild(textarea);
		return ok;
	} catch {
		return false;
	}
}

/** UTF-8 安全的 base64 编码（GitHub API 要求 base64） */
export function toBase64(text: string): string {
	const bytes = new TextEncoder().encode(text);
	let binary = "";
	const chunkSize = 0x8000;
	for (let i = 0; i < bytes.length; i += chunkSize) {
		binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
	}
	return btoa(binary);
}

/** base64 解码为 UTF-8 字符串 */
export function fromBase64(base64: string): string {
	const binary = atob(base64.replace(/\n/g, ""));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return new TextDecoder().decode(bytes);
}
