/**
 * 后台编辑器专用的 Markdown 预览渲染
 *
 * 后台页面不走 Astro 的 Markdown 管线，纯用 marked 渲染与线上差异很大：
 * GitHub Alert、Python 风格 admonition、容器指令（:::note 等）、数学公式、
 * 代码高亮、脚注、Wiki 链接在预览里会变形或消失。
 * 这里在 marked 之前做一层预处理、之后做一次占位还原，
 * 尽量贴近 astro.config.mjs 中 remark/rehype 的最终效果。
 *
 * 仅供后台预览使用，不参与站点构建。
 */

import { Marked } from "marked";

/** 与站点保持一致：GFM 开启、单换行不转 <br> */
const marked = new Marked({ gfm: true, breaks: false });

type Slot =
	| { kind: "html"; html: string; block: boolean }
	| { kind: "math"; tex: string; display: boolean; block: boolean };

const ADMONITION_KIND: Record<string, string> = {
	note: "note",
	info: "note",
	abstract: "note",
	summary: "note",
	tldr: "note",
	todo: "note",
	question: "note",
	help: "note",
	faq: "note",
	example: "note",
	quote: "note",
	cite: "note",
	tip: "tip",
	hint: "tip",
	success: "tip",
	check: "tip",
	done: "tip",
	important: "important",
	warning: "warning",
	attention: "warning",
	caution: "warning",
	danger: "caution",
	error: "caution",
	bug: "caution",
	failure: "caution",
	fail: "caution",
	missing: "caution",
};

const CALL_OUT_LABEL: Record<string, string> = {
	note: "NOTE",
	tip: "TIP",
	important: "IMPORTANT",
	warning: "WARNING",
	caution: "CAUTION",
};

/** 这些语言的图表在构建期由主题渲染，预览里只提示 + 展示源码 */
const CHART_LANGS = new Set(["mermaid", "plantuml", "puml", "uml"]);

/** 不参与语法着色，避免把标签/选择器染乱 */
const PLAIN_LANGS = new Set([
	"",
	"text",
	"txt",
	"plain",
	"markdown",
	"md",
	"html",
	"xml",
	"svg",
	"css",
	"scss",
	"less",
	"diff",
]);

const HASH_COMMENT_LANGS = new Set([
	"bash",
	"sh",
	"shell",
	"zsh",
	"console",
	"shellsession",
	"python",
	"py",
	"ruby",
	"rb",
	"r",
	"perl",
	"yaml",
	"yml",
	"toml",
	"ini",
	"conf",
	"nginx",
	"makefile",
	"dockerfile",
]);

const KEYWORDS = new Set([
	"abstract", "and", "as", "async", "await", "break", "case", "catch", "class",
	"const", "continue", "debugger", "declare", "default", "def", "del", "delete",
	"do", "elif", "else", "enum", "except", "export", "extends", "false",
	"finally", "fn", "for", "from", "function", "global", "if", "impl",
	"implements", "import", "in", "instanceof", "interface", "is", "lambda",
	"let", "match", "mod", "mut", "new", "none", "not", "null", "or", "pass",
	"print", "private", "protected", "pub", "public", "raise", "return", "self",
	"static", "struct", "super", "switch", "this", "throw", "trait", "true",
	"try", "type", "typeof", "undefined", "use", "var", "void", "while", "with",
	"yield",
]);

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function addSlot(slots: Slot[], html: string, block: boolean): string {
	const index = slots.length;
	slots.push({ kind: "html", html, block });
	return block ? `zzmdblock${index}zz` : `zzmdinline${index}zz`;
}

function addMathSlot(
	slots: Slot[],
	tex: string,
	display: boolean,
): string {
	const index = slots.length;
	slots.push({ kind: "math", tex, display, block: display });
	return display ? `zzmdblock${index}zz` : `zzmdinline${index}zz`;
}

// ---------------------------------------------------------------- 代码高亮

const TOKEN_PATTERN = new RegExp(
	[
		"(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/|#[^\\n]*)", // 1 注释
		"(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`)", // 2 字符串
		"(\\b\\d+(?:\\.\\d+)?\\b)", // 3 数字
		"([A-Za-z_$][\\w$]*)(?=\\s*\\()", // 4 函数调用
		"([A-Za-z_$][\\w$]*)", // 5 普通标识符
	].join("|"),
	"g",
);

const TOKEN_PATTERN_NO_HASH = new RegExp(
	[
		"(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)",
		"(\"(?:\\\\.|[^\"\\\\\\n])*\"|'(?:\\\\.|[^'\\\\\\n])*'|`(?:\\\\.|[^`\\\\])*`)",
		"(\\b\\d+(?:\\.\\d+)?\\b)",
		"([A-Za-z_$][\\w$]*)(?=\\s*\\()",
		"([A-Za-z_$][\\w$]*)",
	].join("|"),
	"g",
);

/** 极简着色器：不引入额外依赖，够预览看结构用 */
function highlight(code: string, lang: string): string {
	if (PLAIN_LANGS.has(lang)) return escapeHtml(code);

	const pattern = HASH_COMMENT_LANGS.has(lang)
		? TOKEN_PATTERN
		: TOKEN_PATTERN_NO_HASH;

	let out = "";
	let last = 0;
	for (const match of code.matchAll(pattern)) {
		const index = match.index ?? 0;
		out += escapeHtml(code.slice(last, index));
		const [raw, comment, str, num, fn, word] = match;
		if (comment) out += `<span class="md-tok md-tok--comment">${escapeHtml(raw)}</span>`;
		else if (str) out += `<span class="md-tok md-tok--string">${escapeHtml(raw)}</span>`;
		else if (num) out += `<span class="md-tok md-tok--number">${escapeHtml(raw)}</span>`;
		else if (fn) out += `<span class="md-tok md-tok--fn">${escapeHtml(raw)}</span>`;
		else if (word)
			out += KEYWORDS.has(word.toLowerCase())
				? `<span class="md-tok md-tok--kw">${escapeHtml(raw)}</span>`
				: escapeHtml(raw);
		else out += escapeHtml(raw);
		last = index + raw.length;
	}
	out += escapeHtml(code.slice(last));
	return out;
}

function renderCodeBlock(code: string, lang: string, meta: string): string {
	const isChart = CHART_LANGS.has(lang);
	const title = (meta.match(/title="([^"]*)"/) ?? [])[1] ?? "";
	const badge = lang ? `<span class="md-code__lang">${escapeHtml(lang)}</span>` : "";
	const titleHtml = title
		? `<span class="md-code__title">${escapeHtml(title)}</span>`
		: "";
	const bar =
		badge || titleHtml ? `<div class="md-code__bar">${badge}${titleHtml}</div>` : "";
	const notice = isChart
		? `<div class="md-placeholder">${escapeHtml(
				lang === "mermaid" ? "Mermaid 图表" : "PlantUML 图表",
			)}：构建后由主题渲染，预览仅显示源码</div>`
		: "";
	return `<div class="md-code">${bar}${notice}<pre><code class="language-${escapeHtml(
		lang,
	)}">${highlight(code, lang)}</code></pre></div>`;
}

// ---------------------------------------------------------------- 预处理

/** 抽出围栏代码块，避免后续转换误伤其中的内容 */
function extractFencedCode(text: string, slots: Slot[]): string {
	const lines = text.split("\n");
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const open = lines[i].match(/^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)(.*)$/);
		if (!open) {
			out.push(lines[i]);
			i += 1;
			continue;
		}
		const lang = (open[2] ?? "").toLowerCase();
		const meta = (open[3] ?? "").trim();
		const body: string[] = [];
		i += 1;
		while (i < lines.length && !/^\s{0,3}(?:`{3,}|~{3,})\s*$/.test(lines[i])) {
			body.push(lines[i]);
			i += 1;
		}
		i += 1; // 跳过闭合围栏
		out.push(addSlot(slots, renderCodeBlock(body.join("\n"), lang, meta), true));
	}
	return out.join("\n");
}

/** 抽出数学公式，交给 KaTeX 渲染 */
function extractMath(text: string, slots: Slot[]): string {
	return text
		.replace(/\$\$([\s\S]+?)\$\$/g, (_match, tex: string) =>
			addMathSlot(slots, tex.trim(), true),
		)
		.replace(
			/(^|[^\\$\w])\$([^$\n]+?)\$(?!\$)/g,
			(_match, prefix: string, tex: string) =>
				`${prefix}${addMathSlot(slots, tex, false)}`,
		);
}

function renderCallout(kind: string, title: string, bodyHtml: string): string {
	const normalized = ADMONITION_KIND[kind.toLowerCase()] ?? "note";
	const label = title || CALL_OUT_LABEL[normalized] || "NOTE";
	return `<div class="md-callout md-callout--${normalized}"><div class="md-callout__title">${escapeHtml(
		label,
	)}</div><div class="md-callout__body">${bodyHtml}</div></div>`;
}

function parseInline(text: string): string {
	return marked.parse(text) as string;
}

/** Python-Markdown 风格：!!! note "标题" */
function transformAdmonitions(text: string, slots: Slot[]): string {
	const lines = text.split("\n");
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const match = lines[i].match(/^!!!\s+([\w-]+)\s*(?:"([^"]*)")?\s*$/);
		if (!match) {
			out.push(lines[i]);
			i += 1;
			continue;
		}
		const kind = match[1];
		const title = match[2] ?? "";
		const body: string[] = [];
		i += 1;
		while (i < lines.length && (/^\s{2,}\S/.test(lines[i]) || lines[i] === "")) {
			body.push(lines[i].replace(/^\s{2,}/, ""));
			i += 1;
		}
		out.push(
			addSlot(slots, renderCallout(kind, title, parseInline(body.join("\n"))), true),
		);
	}
	return out.join("\n");
}

/** 容器指令：:::note[标题] … ::: */
function transformDirectives(text: string, slots: Slot[]): string {
	const lines = text.split("\n");
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const match = lines[i].match(
			/^\s*:{3,}\s*([a-zA-Z][\w-]*)\s*(\[[^\]]*\])?\s*(\{[^}]*\})?\s*$/,
		);
		if (!match) {
			out.push(lines[i]);
			i += 1;
			continue;
		}
		const name = match[1].toLowerCase();
		const label = match[2] ? match[2].slice(1, -1) : "";
		const attrs = match[3] ? match[3].slice(1, -1) : "";
		const body: string[] = [];
		i += 1;
		while (i < lines.length && !/^\s*:{3,}\s*$/.test(lines[i])) {
			body.push(lines[i]);
			i += 1;
		}
		i += 1; // 跳过 :::
		const bodyText = body.join("\n");
		let html: string;
		if (ADMONITION_KIND[name]) {
			html = renderCallout(name, label, parseInline(bodyText));
		} else if (name === "details") {
			html = `<details class="md-details"><summary>${escapeHtml(
				label || "展开查看",
			)}</summary><div class="md-details__body">${parseInline(bodyText)}</div></details>`;
		} else if (name === "code-group") {
			html = `<div class="md-code-group"><div class="md-code-group__tag">代码组（构建后为 Tab 切换）</div>${parseInline(
				bodyText,
			)}</div>`;
		} else if (name === "github") {
			const repo = (attrs.match(/repo\s*=\s*"([^"]*)"/) ?? [])[1] ?? "";
			html = `<div class="md-placeholder">GitHub 卡片${repo ? `：${escapeHtml(repo)}` : ""}，构建后由主题渲染</div>`;
		} else {
			html = `<div class="md-placeholder">容器指令 <code>${escapeHtml(
				name,
			)}</code>，构建后由主题渲染</div>`;
		}
		out.push(addSlot(slots, html, true));
	}
	return out.join("\n");
}

/** GitHub Alert：> [!NOTE] */
function transformAlerts(text: string, slots: Slot[]): string {
	const alertTypes = Object.keys(ADMONITION_KIND).join("|");
	const pattern = new RegExp(`^\\s*>\\s*\\[!(${alertTypes})\\]\\s*(.*)$`, "i");
	const lines = text.split("\n");
	const out: string[] = [];
	let i = 0;
	while (i < lines.length) {
		const match = lines[i].match(pattern);
		if (!match) {
			out.push(lines[i]);
			i += 1;
			continue;
		}
		const kind = match[1];
		const title = (match[2] ?? "").trim();
		const body: string[] = [];
		i += 1;
		while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
			body.push(lines[i].replace(/^\s*>\s?/, ""));
			i += 1;
		}
		out.push(
			addSlot(
				slots,
				renderCallout(kind, title, parseInline(body.join("\n"))),
				true,
			),
		);
	}
	return out.join("\n");
}

/** Obsidian 风格 Wiki 链接：[[slug|别名]] → 站内文章链接 */
function transformWikiLinks(text: string): string {
	return text.replace(/\[\[([^[\]\n]+)\]\]/g, (_match, raw: string) => {
		const [target, alias] = raw.split("|").map((part) => part.trim());
		if (!target) return raw;
		const [slugPart, heading] = target.split("#");
		const url = `/posts/${slugPart
			.split("/")
			.filter(Boolean)
			.map((segment) => encodeURIComponent(segment))
			.join("/")}/`;
		const label = alias || heading || slugPart;
		return `[${label}](${url}${heading ? `#${heading}` : ""})`;
	});
}

/** 脚注：[^1] 与文末定义，marked 默认不支持但站点支持 */
function transformFootnotes(text: string, slots: Slot[]): string {
	const defs: { label: string; body: string[] }[] = [];
	const lines = text.split("\n");
	const out: string[] = [];
	let current: { label: string; body: string[] } | null = null;

	for (const line of lines) {
		const match = line.match(/^\[\^([^\]]+)\]:\s?(.*)$/);
		if (match) {
			if (current) defs.push(current);
			current = { label: match[1], body: [match[2]] };
			continue;
		}
		if (current && /^\s{2,}\S/.test(line)) {
			current.body.push(line.trim());
			continue;
		}
		if (current) {
			defs.push(current);
			current = null;
		}
		out.push(line);
	}
	if (current) defs.push(current);
	if (defs.length === 0) return text;

	let result = out.join("\n");
	defs.forEach((def, index) => {
		const n = index + 1;
		result = result.replace(
			new RegExp(`\\[\\^${escapeRegExp(def.label)}\\](?!:)`, "g"),
			`<sup class="md-fnref"><a href="#md-fn-${n}" id="md-fnref-${n}">${n}</a></sup>`,
		);
	});
	const list = `<div class="md-footnotes"><hr /><ol>${defs
		.map(
			(def, index) =>
				`<li id="md-fn-${index + 1}">${parseInline(
					def.body.join("\n"),
				)} <a class="md-fnback" href="#md-fnref-${index + 1}">↩</a></li>`,
		)
		.join("")}</ol></div>`;
	return `${result}\n\n${addSlot(slots, list, true)}`;
}

// ---------------------------------------------------------------- KaTeX

type KatexLike = {
	renderToString: (tex: string, options: Record<string, unknown>) => string;
};

let katexState: KatexLike | null | undefined;

async function ensureKatex(): Promise<KatexLike | null> {
	if (katexState !== undefined) return katexState;
	try {
		const mod = await import("katex");
		await import("katex/dist/katex.min.css");
		const instance = (mod as unknown as { default?: KatexLike }).default ??
			(mod as unknown as KatexLike);
		katexState = instance ?? null;
	} catch {
		katexState = null;
	}
	return katexState;
}

function resolveSlot(slot: Slot | undefined, katex: KatexLike | null): string {
	if (!slot) return "";
	if (slot.kind === "html") return slot.html;
	if (!katex) {
		return `<code class="md-math-fallback">${escapeHtml(
			slot.display ? `$$${slot.tex}$$` : `$${slot.tex}$`,
		)}</code>`;
	}
	try {
		return katex.renderToString(slot.tex, {
			displayMode: slot.display,
			throwOnError: false,
			output: "html",
		});
	} catch {
		return `<code class="md-math-fallback">${escapeHtml(slot.tex)}</code>`;
	}
}

function restoreSlots(html: string, slots: Slot[], katex: KatexLike | null): string {
	let out = html;
	for (let pass = 0; pass < 4; pass += 1) {
		if (!/zzmd(?:block|inline)\d+zz/.test(out)) break;
		out = out.replace(/<p>zzmdblock(\d+)zz<\/p>/g, (_m, index: string) =>
			resolveSlot(slots[Number(index)], katex),
		);
		out = out.replace(/zzmdblock(\d+)zz/g, (_m, index: string) =>
			resolveSlot(slots[Number(index)], katex),
		);
		out = out.replace(/zzmdinline(\d+)zz/g, (_m, index: string) =>
			resolveSlot(slots[Number(index)], katex),
		);
	}
	return out;
}

/** 预览内容来自用户输入，做一层基础清理 */
function sanitize(html: string): string {
	return html
		.replace(/<script[\s\S]*?<\/script>/gi, "")
		.replace(/<iframe[\s\S]*?<\/iframe>/gi, "")
		.replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
		.replace(/\son\w+\s*=\s*'[^']*'/gi, "")
		.replace(/href\s*=\s*"\s*javascript:[^"]*"/gi, 'href="#"');
}

/**
 * 渲染预览 HTML
 * 与站点渲染保持一致：GFM、GitHub Alert、容器指令、数学公式、脚注、Wiki 链接
 */
export async function renderMarkdownPreview(source: string): Promise<string> {
	const slots: Slot[] = [];
	let text = source ?? "";

	text = extractFencedCode(text, slots);
	text = extractMath(text, slots);
	text = transformAdmonitions(text, slots);
	text = transformDirectives(text, slots);
	text = transformAlerts(text, slots);
	text = transformWikiLinks(text);
	text = transformFootnotes(text, slots);

	const katex = slots.some((slot) => slot.kind === "math")
		? await ensureKatex()
		: null;

	const parsed = String(await marked.parse(text));
	return sanitize(restoreSlots(parsed, slots, katex));
}
