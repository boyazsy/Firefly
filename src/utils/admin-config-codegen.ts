/**
 * 配置文件源码生成（浏览器端）
 *
 * 把设置面板里编辑好的值还原成 TypeScript 源码。
 * 借助构建期拆好的 head / tail 模板，生成结果能保留 import、其它导出与文件级注释；
 * 对象内部的字段注释则从原始源码中抽取后重新插入。
 */

/** 需要输出成「代码表达式」而非字面量的字段（保留环境变量覆盖能力） */
interface RawFieldRule {
	/** 该字段所在的导出变量名 */
	varName: string;
	/** 字段在根对象中的名字 */
	field: string;
	/** 由值生成代码表达式 */
	render: (value: unknown, serialize: (v: unknown, depth: number) => string) => string;
}

const RAW_FIELD_RULES: RawFieldRule[] = [
	{
		varName: "siteConfig",
		field: "lang",
		render: (value) => `resolveSiteLang("${String(value ?? "zh_CN")}")`,
	},
	{
		varName: "siteConfig",
		field: "pages",
		render: (value, serialize) => `resolvePageToggles(${serialize(value, 1)})`,
	},
];

const INDENT = "\t";

/** 转义并包裹字符串 */
function quoteString(value: string): string {
	const escaped = value
		.replace(/\\/g, "\\\\")
		.replace(/"/g, '\\"')
		.replace(/\n/g, "\\n")
		.replace(/\r/g, "\\r")
		.replace(/\t/g, "\\t");
	return `"${escaped}"`;
}

/** 判断值是否为「可以直接写在一行里」的简单值 */
function isSimple(value: unknown): boolean {
	if (value === null || value === undefined) return true;
	if (typeof value === "string") return value.length <= 40;
	if (typeof value === "number" || typeof value === "boolean") return true;
	return false;
}

/**
 * 把值序列化为 TypeScript 字面量
 * @param comments 字段注释表，键为点分路径（相对当前对象的路径）
 * @param path 当前对象在根对象中的路径
 */
export function serializeValue(
	value: unknown,
	depth = 0,
	comments: Map<string, string[]> = new Map(),
	path = "",
): string {
	const pad = INDENT.repeat(depth);
	const padInner = INDENT.repeat(depth + 1);

	if (value === undefined) return "undefined";
	if (value === null) return "null";
	if (typeof value === "string") return quoteString(value);
	if (typeof value === "number") return Number.isFinite(value) ? String(value) : "null";
	if (typeof value === "boolean") return value ? "true" : "false";

	if (Array.isArray(value)) {
		if (value.length === 0) return "[]";
		// 全是简单值且总长不大 → 写在一行
		if (value.every(isSimple)) {
			const inline = `[${value.map((item) => serializeValue(item, 0)).join(", ")}]`;
			if (inline.length <= 88) return inline;
		}
		const items = value.map((item, index) => {
			const itemPath = path ? `${path}.${index}` : String(index);
			const note = comments.get(itemPath);
			const prefix = note?.length
				? `${note.map((n) => `${padInner}${n}`).join("\n")}\n`
				: "";
			return `${prefix}${padInner}${serializeValue(item, depth + 1, comments, itemPath)},`;
		});
		return `[\n${items.join("\n")}\n${pad}]`;
	}

	if (typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>);
		if (entries.length === 0) return "{}";
		const parts = entries.map(([key, item]) => {
			const childPath = path ? `${path}.${key}` : key;
			const note = comments.get(childPath);
			const prefix = note?.length
				? `${note.map((n) => `${padInner}${n}`).join("\n")}\n`
				: "";
			const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quoteString(key);
			return `${prefix}${padInner}${safeKey}: ${serializeValue(
				item,
				depth + 1,
				comments,
				childPath,
			)},`;
		});
		return `{\n${parts.join("\n")}\n${pad}}`;
	}

	return "undefined";
}

/**
 * 从原始对象字面量源码中抽取字段注释
 * 返回 点分路径 -> 注释行数组
 */
export function extractFieldComments(source: string): Map<string, string[]> {
	const comments = new Map<string, string[]>();
	if (!source) return comments;

	const lines = source.split("\n");
	const stack: string[] = [];
	let pending: string[] = [];
	let blockComment: string[] | null = null;

	const flush = (keyPath: string) => {
		if (pending.length) {
			comments.set(keyPath, pending);
			pending = [];
		}
	};

	for (const raw of lines) {
		const line = raw.trim();

		// 块注释内部
		if (blockComment !== null) {
			blockComment.push(raw.trimEnd());
			if (line.includes("*/")) {
				const text = blockComment.join("\n");
				pending.push(...text.split("\n"));
				blockComment = null;
			}
			continue;
		}
		if (line.startsWith("/*")) {
			if (line.includes("*/")) {
				pending.push(line);
			} else {
				blockComment = [raw.trimEnd()];
			}
			continue;
		}
		if (line.startsWith("//")) {
			pending.push(line);
			continue;
		}

		// 闭合：出栈（一行里可能有多个闭合）
		const closings = line.match(/[}\]]/g);
		if (closings && !line.includes("{") && !line.includes("[")) {
			for (let i = 0; i < closings.length; i++) stack.pop();
			continue;
		}

		// 匹配 `key:` 或 `"key":`
		const keyMatch = /^["']?([A-Za-z_$][A-Za-z0-9_$-]*)["']?\s*:/.exec(line);
		if (keyMatch) {
			const key = keyMatch[1];
			const keyPath = [...stack, key].join(".");
			flush(keyPath);
			if (/[{[]\s*$/.test(line)) stack.push(key);
			continue;
		}

		// 数组元素（对象数组）用下标路径，这里不追踪，交给递归时的下标命名
		if (pending.length && /^[{[]/.test(line)) {
			pending = [];
		}
	}

	return comments;
}

/**
 * 生成完整的配置文件源码
 * @param head 构建期拆好的前缀（含 `export const x: T = ` 或 unwrap 函数的左括号）
 * @param tail 构建期拆好的后缀
 * @param original 原始值源码（用于抽取注释）
 * @param value 新的配置值
 * @param varName 导出变量名（决定是否套用 raw 字段规则）
 */
export function generateConfigFile(options: {
	head: string;
	tail: string;
	original: string;
	value: unknown;
	varName: string;
}): string {
	const { head, tail, original, value, varName } = options;

	if (!head && !tail) {
		// 没有模板时降级：只输出值本身
		return `// ⚠️ 未能读取到原始文件结构，以下仅为配置值，请手动替换到源文件中\n\nexport const ${varName} = ${serializeValue(value, 0)};\n`;
	}

	const comments = extractFieldComments(original);
	const rules = RAW_FIELD_RULES.filter((rule) => rule.varName === varName);

	let body: string;
	if (rules.length > 0 && value && typeof value === "object" && !Array.isArray(value)) {
		// 存在需要输出成表达式的字段，逐字段拼装
		const entries = Object.entries(value as Record<string, unknown>);
		const parts = entries.map(([key, item]) => {
			const rule = rules.find((r) => r.field === key);
			const note = comments.get(key);
			const prefix = note?.length
				? `${note.map((n) => `${INDENT}${n}`).join("\n")}\n`
				: "";
			const safeKey = /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key) ? key : quoteString(key);
			const rendered = rule
				? rule.render(item, (v, depth) => serializeValue(v, depth, comments, key))
				: serializeValue(item, 1, comments, key);
			return `${prefix}${INDENT}${safeKey}: ${rendered},`;
		});
		body = `{\n${parts.join("\n")}\n}`;
	} else {
		body = serializeValue(value, 0, comments);
	}

	const closing = head.includes("(") && /\(\s*$/.test(head) ? ")" : "";
	return `${head}${body}${closing};${tail}`;
}

/** 触发浏览器下载 */
export function downloadText(filename: string, content: string) {
	const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.appendChild(anchor);
	anchor.click();
	document.body.removeChild(anchor);
	URL.revokeObjectURL(url);
}
