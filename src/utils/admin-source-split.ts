/**
 * 配置源码拆分（仅构建期使用）
 *
 * 目的：让浏览器端的设置面板能够「只替换值、不动其它内容」地生成配置文件。
 * 构建时把 `export const x: T = <值>;` 拆成 head + tail，浏览器端把新值拼回中间即可，
 * 这样 import 语句、其它导出、辅助函数与注释都能原样保留。
 *
 * 源码内容由调用方通过 Vite 的 `?raw` 导入传入，本模块不依赖 node:fs，
 * 避免打包时被当成需要 polyfill 的 Node 内置模块。
 */

export interface SplitResult {
	/** 到 `= `（或 unwrap 函数的左括号）为止的源码 */
	head: string;
	/** 值表达式结束之后的源码 */
	tail: string;
	/** 值表达式原文 */
	original: string;
}

/**
 * 从 openIndex（指向 `(`/`{`/`[`）开始，找到与之匹配的闭括号下标。
 * 会正确跳过字符串字面量与注释。
 */
function findMatchingClose(
	src: string,
	openIndex: number,
): number {
	const pairs: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
	const open = src[openIndex];
	const close = pairs[open];
	if (!close) return -1;

	let depth = 0;
	let i = openIndex;
	while (i < src.length) {
		const ch = src[i];
		const next = src[i + 1];

		// 行注释
		if (ch === "/" && next === "/") {
			const lineEnd = src.indexOf("\n", i);
			i = lineEnd === -1 ? src.length : lineEnd;
			continue;
		}
		// 块注释
		if (ch === "/" && next === "*") {
			const end = src.indexOf("*/", i + 2);
			i = end === -1 ? src.length : end + 2;
			continue;
		}
		// 字符串
		if (ch === '"' || ch === "'" || ch === "`") {
			const quote = ch;
			i++;
			while (i < src.length) {
				if (src[i] === "\\") {
					i += 2;
					continue;
				}
				if (src[i] === quote) {
					i++;
					break;
				}
				i++;
			}
			continue;
		}

		if (ch === open) depth++;
		else if (ch === close) {
			depth--;
			if (depth === 0) return i;
		}
		i++;
	}
	return -1;
}

/** 跳过空白与注释，返回第一个有效字符的下标 */
function skipTrivia(src: string, from: number): number {
	let i = from;
	while (i < src.length) {
		const ch = src[i];
		const next = src[i + 1];
		if (/\s/.test(ch)) {
			i++;
			continue;
		}
		if (ch === "/" && next === "/") {
			const lineEnd = src.indexOf("\n", i);
			i = lineEnd === -1 ? src.length : lineEnd;
			continue;
		}
		if (ch === "/" && next === "*") {
			const end = src.indexOf("*/", i + 2);
			i = end === -1 ? src.length : end + 2;
			continue;
		}
		break;
	}
	return i;
}

/**
 * 拆分配置文件中某个导出的值表达式
 * @param src 配置文件源码
 * @param varName 导出变量名
 * @param unwrapFn 可选：值被该函数包裹时（如 resolveDisplaySettingsConfig），只替换内层实参
 */
export function splitConfigExport(
	src: string,
	varName: string,
	unwrapFn?: string,
): SplitResult {

	// 定位 `export const <varName>`
	const declRe = new RegExp(
		`export\\s+const\\s+${varName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
	);
	const declMatch = declRe.exec(src);
	if (!declMatch) {
		throw new Error(`在配置源码中找不到 export const ${varName}`);
	}

	// 找到第一个赋值 `=`（排除 ==、=>、>= 等）
	let eq = declMatch.index + declMatch[0].length;
	while (eq < src.length) {
		const ch = src[eq];
		if (ch === "=" && src[eq + 1] !== "=" && src[eq - 1] !== "!" && src[eq - 1] !== "=" && src[eq - 1] !== "<" && src[eq - 1] !== ">") {
			break;
		}
		eq++;
	}
	if (eq >= src.length) {
		throw new Error(`在配置源码中找不到 ${varName} 的赋值`);
	}

	let valueStart = skipTrivia(src, eq + 1);

	// 如果需要解开外层函数调用，进入它的左括号
	if (unwrapFn) {
		const fnIndex = src.indexOf(`${unwrapFn}(`, valueStart);
		// 只允许紧接着出现，避免误匹配到别处
		if (fnIndex !== -1 && skipTrivia(src, valueStart) === fnIndex) {
			valueStart = skipTrivia(src, src.indexOf("(", fnIndex + unwrapFn.length) + 1);
		}
	}

	const openCh = src[valueStart];

	// 值是一个函数调用（如 `getDynamicNavBarConfig()`）：整段调用都替换掉
	if (/[A-Za-z_$]/.test(openCh)) {
		const paren = src.indexOf("(", valueStart);
		if (paren === -1) {
			throw new Error(`${varName} 的值不是可解析的表达式`);
		}
		const closeParen = findMatchingClose(src, paren);
		if (closeParen === -1) {
			throw new Error(`${varName} 的调用没有闭合`);
		}
		let afterCall = skipTrivia(src, closeParen + 1);
		if (src[afterCall] === ";") afterCall++;
		return {
			head: src.slice(0, valueStart),
			tail: src.slice(afterCall),
			original: src.slice(valueStart, closeParen + 1),
		};
	}

	if (openCh !== "{" && openCh !== "[" && openCh !== "(") {
		throw new Error(
			`${varName} 的值不是对象/数组/调用：${src.slice(valueStart, valueStart + 40)}`,
		);
	}

	const closeIndex = findMatchingClose(src, valueStart);
	if (closeIndex === -1) {
		throw new Error(`${varName} 的值没有闭合`);
	}

	// 值表达式之后：吃掉可选的 `)`（unwrap 场景）与 `;`
	let after = skipTrivia(src, closeIndex + 1);
	if (unwrapFn && src[after] === ")") {
		after = skipTrivia(src, after + 1);
	}
	if (src[after] === ";") {
		after++;
	}

	return {
		head: src.slice(0, valueStart),
		tail: src.slice(after),
		original: src.slice(valueStart, closeIndex + 1),
	};
}
