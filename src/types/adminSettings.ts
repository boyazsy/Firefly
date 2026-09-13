/**
 * 后台「设置面板」相关类型
 *
 * 主题的配置都是「构建期 TS 文件」，浏览器改完不会自动生效。
 * 因此后台的定位是：可视化编辑 → 生成配置文件源码 → 下载/复制/提交 GitHub 触发重建。
 */

/** 表单字段的基础类型（由运行时值推断，供通用表单渲染用） */
export type FieldKind =
	| "string"
	| "number"
	| "boolean"
	| "enum"
	| "stringList"
	| "objectList"
	| "object"
	| "unknown";

/** 专属编辑器标识：有值时用手工打造的中文表单，否则用通用表单 */
export type SettingsEditor =
	| "siteBasic"
	| "siteAdvanced"
	| "displaySettings"
	| "profile"
	| "wallpaper"
	| "navbar"
	| "sidebar"
	| "widgets"
	| "gallery";

/** 设置单元在侧边导航中的分组 */
export type SettingsGroup =
	| "core"
	| "appearance"
	| "layout"
	| "feature"
	| "advanced";

/**
 * 一个「设置单元」= 设置面板左侧导航里的一项
 * 它可能对应整个配置文件，也可能只对应配置文件里的一个子对象（如 siteConfig.themeColor）
 */
export interface SettingsUnitMeta {
	/** 唯一标识 */
	id: string;
	/** 中文名称 */
	label: string;
	/** 简短说明，显示在表单顶部 */
	description: string;
	/** 图标名（对应 AdminIcon） */
	icon: string;
	/** 所属分组 */
	group: SettingsGroup;
	/** 源配置文件路径（相对项目根） */
	file: string;
	/** 该文件中导出的变量名 */
	varName: string;
	/**
	 * 取值路径：空数组表示整个导出对象
	 * 例如 ["themeColor"] 表示 siteConfig.themeColor
	 */
	path?: string[];
	/**
	 * 从父对象中只摘取这些字段（与 path 二选一）
	 * 基础配置只需要 siteConfig 的若干顶层字段时用它
	 */
	fields?: string[];
	/** 表单形态：普通表单 / 列表 */
	kind: "form" | "list";
	/** 专属编辑器，缺省则用通用表单 */
	editor?: SettingsEditor;
}

/** 提供给前端的完整设置单元（元信息 + 当前值） */
export interface SettingsUnit extends SettingsUnitMeta {
	/** 当前生效值（来自源码，构建时快照） */
	value: unknown;
}

/**
 * 配置文件的「源码模板」
 * 把 `export const x: T = <值>;` 这段拆成 head + tail，浏览器端只需把新生成的值拼回去，
 * 就能完整保留 import 语句、其它导出、辅助函数与注释。
 */
export interface SettingsFileTemplate {
	/** 相对项目根的路径 */
	file: string;
	/** 导出变量名 */
	varName: string;
	/** 从文件开头到 `export const x: T = `（含）为止的源码 */
	head: string;
	/** 目标导出语句结束符之后（不含结束符）的源码 */
	tail: string;
	/** 目标导出的原始源码（用于在后台展示「原始配置」对照） */
	original: string;
	/** 是否为数组导出 */
	arrayExport?: boolean;
}

/** 后台设置快照 API 的响应结构 */
export interface AdminSettingsSnapshot {
	generatedAt: string;
	/** 设置单元（用于渲染表单） */
	units: SettingsUnit[];
	/** 源码模板，键为 `${file}#${varName}` */
	templates: Record<string, SettingsFileTemplate>;
	/** 每个文件的完整原始值（用于合并改动后生成源码） */
	baseValues: Record<string, unknown>;
}
