/**
 * 后台设置面板 - 状态与草稿管理
 *
 * 只放纯函数与 localStorage 读写，响应式状态交给组件里的 Svelte runes 管理。
 */

import type {
	AdminSettingsSnapshot,
	SettingsUnit,
	SettingsUnitMeta,
} from "@/types/adminSettings";
import { generateConfigFile } from "./admin-config-codegen";

const DRAFT_KEY = "firefly:admin:settings-draft";

export interface EditableUnit {
	meta: SettingsUnitMeta;
	/**
	 * 当前编辑值。配置结构差异很大（对象 / 数组 / 基本类型），
	 * 这里放宽为 any 以便在组件里双向绑定
	 */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	value: any;
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	original: any;
}

export interface SettingsDraft {
	savedAt: number;
	/** unitId -> 值 */
	values: Record<string, unknown>;
}

/** 深拷贝（JSON 安全范围内） */
export function deepClone<T>(value: T): T {
	if (value === null || typeof value !== "object") return value;
	return JSON.parse(JSON.stringify(value)) as T;
}

/** 按路径写入 */
function setIn(target: unknown, path: string[], value: unknown): unknown {
	if (path.length === 0) return value;
	let current = target as Record<string, unknown>;
	for (let i = 0; i < path.length - 1; i++) {
		const key = path[i];
		if (typeof current[key] !== "object" || current[key] === null) {
			current[key] = {};
		}
		current = current[key] as Record<string, unknown>;
	}
	current[path[path.length - 1]] = value;
	return target;
}

/**
 * 把同一文件下多个设置单元的改动合并回该文件的完整值
 * 例如 siteConfig 被拆成「基础配置」和「站点配置」两块，生成源码前需要合并
 */
export function mergeUnitsToFile(
	baseValue: unknown,
	units: EditableUnit[],
): unknown {
	for (const unit of units) {
		// 没有 fields / path 的单元代表整体替换
		if (!unit.meta.fields?.length && !unit.meta.path?.length) {
			return deepClone(unit.value);
		}
	}

	const result = deepClone(baseValue);
	for (const unit of units) {
		if (unit.meta.path?.length) {
			setIn(result, unit.meta.path, deepClone(unit.value));
		} else if (unit.meta.fields?.length) {
			const source = (unit.value ?? {}) as Record<string, unknown>;
			for (const key of Object.keys(source)) {
				setIn(result, [key], deepClone(source[key]));
			}
		}
	}
	return result;
}

/** 判断两个值是否不同（用序列化比对，够用且避免深比较开销） */
export function isDirty(value: unknown, original: unknown): boolean {
	return JSON.stringify(value ?? null) !== JSON.stringify(original ?? null);
}

/** 读取草稿 */
export function loadDraft(): SettingsDraft | null {
	if (typeof localStorage === "undefined") return null;
	try {
		const raw = localStorage.getItem(DRAFT_KEY);
		return raw ? (JSON.parse(raw) as SettingsDraft) : null;
	} catch {
		return null;
	}
}

/** 保存草稿 */
export function saveDraft(values: Record<string, unknown>) {
	if (typeof localStorage === "undefined") return;
	try {
		const draft: SettingsDraft = { savedAt: Date.now(), values };
		localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
	} catch {
		// 隐私模式可能不可写，忽略
	}
}

/** 清除草稿 */
export function clearDraft() {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.removeItem(DRAFT_KEY);
	} catch {
		// 忽略
	}
}

export async function fetchSnapshot(
	url: string,
): Promise<AdminSettingsSnapshot> {
	const response = await fetch(url);
	if (!response.ok) throw new Error(`HTTP ${response.status}`);
	return (await response.json()) as AdminSettingsSnapshot;
}

/** 单元在模板表中的键 */
export function templateKeyOf(unit: SettingsUnitMeta): string {
	return `${unit.file}#${unit.varName}`;
}

/**
 * 生成某个配置文件的完整源码
 * @param snapshot 配置快照（提供模板与原始值）
 * @param units 属于该文件的所有设置单元（已含编辑值）
 */
export function buildFileSource(
	snapshot: AdminSettingsSnapshot,
	varName: string,
	file: string,
	units: EditableUnit[],
): { code: string; fileName: string } {
	const key = `${file}#${varName}`;
	const template = snapshot.templates[key];
	const base = snapshot.baseValues[key];
	const merged = mergeUnitsToFile(base, units);

	const code = generateConfigFile({
		head: template?.head ?? "",
		tail: template?.tail ?? "",
		original: template?.original ?? "",
		value: merged,
		varName,
	});

	return { code, fileName: file.split("/").pop() ?? `${varName}.ts` };
}

/** 列出快照中涉及的所有配置文件（去重，保持出现顺序） */
export function listConfigFiles(units: SettingsUnit[]): {
	file: string;
	varName: string;
}[] {
	const seen = new Set<string>();
	const result: { file: string; varName: string }[] = [];
	for (const unit of units) {
		const key = templateKeyOf(unit);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push({ file: unit.file, varName: unit.varName });
	}
	return result;
}
