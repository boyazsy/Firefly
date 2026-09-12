/**
 * 后台设置快照
 *
 * 构建期把全站配置序列化成 JSON 供设置面板使用：
 * - units：设置单元（元信息 + 当前值）
 * - templates：每个配置文件的源码模板（head / tail），供浏览器端生成完整配置文件
 * - baseValues：每个配置文件的完整原始值，用于把多个单元的改动合并回同一个文件
 */

import type { APIRoute } from "astro";

import { adminConfig } from "@/config/adminConfig";
import { analyticsConfig } from "@/config/analyticsConfig";
import { announcementConfig } from "@/config/announcementConfig";
import { backgroundWallpaper } from "@/config/backgroundWallpaper";
import { booknavConfig } from "@/config/booknavConfig";
import { commentConfig } from "@/config/commentConfig";
import { coverImageConfig } from "@/config/coverImageConfig";
import { displaySettingsConfig } from "@/config/displaySettingsConfig";
import { dynamicConfig } from "@/config/dynamicConfig";
import { sakuraConfig } from "@/config/effectsConfig";
import { expressiveCodeConfig } from "@/config/expressiveCodeConfig";
import { fontConfig } from "@/config/fontConfig";
import { footerConfig } from "@/config/footerConfig";
import { friendsConfig } from "@/config/friendsConfig";
import { galleryConfig } from "@/config/galleryConfig";
import { licenseConfig } from "@/config/licenseConfig";
import { mermaidConfig } from "@/config/mermaidConfig";
import { musicPlayerConfig } from "@/config/musicConfig";
import { navBarConfig, navBarSearchConfig } from "@/config/navBarConfig";
import { live2dWidgetConfig } from "@/config/pioConfig";
import { plantumlConfig } from "@/config/plantumlConfig";
import { profileConfig } from "@/config/profileConfig";
import { sidebarLayoutConfig } from "@/config/sidebarConfig";
import { siteConfig } from "@/config/siteConfig";
import { sponsorConfig } from "@/config/sponsorConfig";
import { SETTINGS_UNITS } from "@/utils/admin-settings-units";
import { splitConfigExport } from "@/utils/admin-source-split";
import type {
	AdminSettingsSnapshot,
	SettingsFileTemplate,
} from "@/types/adminSettings";

/** 所有可编辑配置的当前值 */
const VALUES: Record<string, unknown> = {
	siteConfig,
	displaySettingsConfig,
	profileConfig,
	backgroundWallpaper,
	navBarConfig,
	navBarSearchConfig,
	sidebarLayoutConfig,
	fontConfig,
	coverImageConfig,
	sakuraConfig,
	commentConfig,
	analyticsConfig,
	musicPlayerConfig,
	live2dWidgetConfig,
	sponsorConfig,
	friendsConfig,
	galleryConfig,
	booknavConfig,
	announcementConfig,
	dynamicConfig,
	footerConfig,
	licenseConfig,
	expressiveCodeConfig,
	mermaidConfig,
	plantumlConfig,
	adminConfig,
};

/**
 * 值被函数包裹时，只替换内层实参以保留包装（如 resolveDisplaySettingsConfig）
 * 这样环境变量覆盖能力不会丢失
 */
const UNWRAP_FUNCTIONS: Record<string, string> = {
	displaySettingsConfig: "resolveDisplaySettingsConfig",
};

/** 安全序列化：剔除无法 JSON 化的字段，避免构建期报错 */
function safeClone<T>(value: T): T {
	try {
		return JSON.parse(JSON.stringify(value)) as T;
	} catch {
		return value;
	}
}

/** 按路径取值 */
function getByPath(base: unknown, path: string[]): unknown {
	let current: unknown = base;
	for (const key of path) {
		if (current === null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[key];
	}
	return current;
}

/** 按单元定义截取所需字段 */
function pickUnitValue(varName: string, unitMeta: (typeof SETTINGS_UNITS)[number]) {
	const base = VALUES[varName];
	if (unitMeta.path && unitMeta.path.length > 0) {
		return safeClone(getByPath(base, unitMeta.path));
	}
	if (unitMeta.fields && unitMeta.fields.length > 0) {
		const source = (base ?? {}) as Record<string, unknown>;
		const picked: Record<string, unknown> = {};
		for (const key of unitMeta.fields) {
			picked[key] = safeClone(source[key]);
		}
		return picked;
	}
	return safeClone(base);
}

/**
 * 以纯文本形式内联所有配置文件源码（构建期生效）
 * 用 Vite 的 ?raw 导入而不读文件系统，避免打包时引入 node:fs 依赖
 */
const CONFIG_SOURCES = import.meta.glob("/src/config/*.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/** 取某个配置文件的源码文本 */
function sourceOf(file: string): string {
	return CONFIG_SOURCES[`/${file.replace(/^\/+/, "")}`] ?? "";
}

export const GET: APIRoute = async () => {
	const units = SETTINGS_UNITS.map((meta) => ({
		...meta,
		value: pickUnitValue(meta.varName, meta),
	}));

	// 每个 (文件, 变量) 只拆一次
	const templates: Record<string, SettingsFileTemplate> = {};
	const seen = new Set<string>();
	for (const meta of SETTINGS_UNITS) {
		const key = `${meta.file}#${meta.varName}`;
		if (seen.has(key)) continue;
		seen.add(key);
		try {
			const split = splitConfigExport(
				sourceOf(meta.file),
				meta.varName,
				UNWRAP_FUNCTIONS[meta.varName],
			);
			templates[key] = {
				file: meta.file,
				varName: meta.varName,
				head: split.head,
				tail: split.tail,
				original: split.original,
				arrayExport: split.original.trimStart().startsWith("["),
			};
		} catch (error) {
			// 拆分失败不应该让整站构建挂掉，退化成「无模板」，该单元仍可编辑但只能复制值
			templates[key] = {
				file: meta.file,
				varName: meta.varName,
				head: "",
				tail: "",
				original: "",
			};
			console.warn(
				`[admin-settings] 无法解析 ${meta.file} 中的 ${meta.varName}：${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		}
	}

	const baseValues: Record<string, unknown> = {};
	for (const meta of SETTINGS_UNITS) {
		const key = `${meta.file}#${meta.varName}`;
		if (!(key in baseValues)) {
			baseValues[key] = safeClone(VALUES[meta.varName]);
		}
	}

	const snapshot: AdminSettingsSnapshot = {
		generatedAt: new Date().toISOString(),
		units,
		templates,
		baseValues,
	};

	return new Response(JSON.stringify(snapshot), {
		headers: {
			"Content-Type": "application/json; charset=utf-8",
			"Cache-Control": "no-store",
		},
	});
};
