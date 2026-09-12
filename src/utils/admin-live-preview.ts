/**
 * 后台即时预览
 *
 * 外观类配置（壁纸、主题色、明暗模式）改完立刻在当前页面生效，
 * 让站长在导出配置前就能看到效果。所有改动都打在 <html> 的行内样式或 CSS 变量上，
 * 刷新页面即恢复，不写进任何配置文件。
 */

const PREVIEW_FLAG = "data-admin-preview";

function ensureStyle(): HTMLStyleElement {
	const existing = document.getElementById("admin-live-preview");
	if (existing) return existing as HTMLStyleElement;
	const style = document.createElement("style");
	style.id = "admin-live-preview";
	document.head.appendChild(style);
	return style;
}

function markActive(active: boolean) {
	if (active) document.documentElement.setAttribute(PREVIEW_FLAG, "1");
	else document.documentElement.removeAttribute(PREVIEW_FLAG);
}

/** 是否已经处于预览状态 */
export function isPreviewActive(): boolean {
	return document.documentElement.hasAttribute(PREVIEW_FLAG);
}

export interface WallpaperPreviewInput {
	mode: "banner" | "fullscreen" | "overlay" | "none" | string;
	/** 壁纸地址，多个时取第一张 */
	urls: string[];
	/** 遮罩暗度 0-1 */
	dimOpacity?: number;
}

/** 取壁纸的可访问地址：src 路径在后台无法直接访问，退化为不预览 */
function resolveWallpaperUrl(raw: string): string {
	if (!raw) return "";
	if (/^https?:\/\//.test(raw)) return raw;
	if (raw.startsWith("/")) return raw;
	// src 目录下的资源经过构建会改名，后台无法还原，直接返回空
	return "";
}

/** 预览壁纸模式 */
export function previewWallpaper(input: WallpaperPreviewInput) {
	const style = ensureStyle();
	const url = input.urls.map(resolveWallpaperUrl).find((item) => Boolean(item));
	const dim = input.dimOpacity ?? 0;

	if (!url || input.mode === "none") {
		style.textContent = "";
		markActive(false);
		return;
	}

	const dimLayer = dim > 0 ? `rgba(0,0,0,${dim})` : "transparent";
	const common = `
		#admin-live-preview-host::before {
			content: "";
			position: fixed;
			inset: 0;
			background-image: url("${url}");
			background-size: cover;
			background-position: center;
			z-index: -2;
		}
		#admin-live-preview-host::after {
			content: "";
			position: fixed;
			inset: 0;
			background: ${dimLayer};
			z-index: -1;
			pointer-events: none;
		}
	`;

	if (input.mode === "fullscreen" || input.mode === "overlay") {
		style.textContent = `${common}
			#admin-live-preview-host .admin-card,
			#admin-live-preview-host .admin-preview {
				backdrop-filter: blur(8px);
			}
		`;
	} else {
		// banner：只在顶部铺一条横幅
		style.textContent = `
			#admin-live-preview-host::before {
				content: "";
				position: fixed;
				top: 0; left: 0; right: 0;
				height: 30vh;
				background-image: url("${url}");
				background-size: cover;
				background-position: center;
				opacity: .55;
				z-index: -2;
			}
		`;
	}
	markActive(true);
}

/** 预览主题色色相 */
export function previewHue(hue: number) {
	document.documentElement.style.setProperty("--hue", String(hue));
	document.documentElement.style.setProperty("--primary", `var(--hue)`);
	markActive(true);
}

/** 清除所有预览效果 */
export function clearPreview() {
	const style = document.getElementById("admin-live-preview");
	if (style) style.textContent = "";
	document.documentElement.style.removeProperty("--hue");
	document.documentElement.style.removeProperty("--primary");
	markActive(false);
}
