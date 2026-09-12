<script lang="ts">
/**
 * 后台专用图标 - 内联 SVG，不依赖图标集的构建产物
 * 统一 24x24 线性风格，颜色继承 currentColor
 */

type AdminIconName =
	| "dashboard"
	| "post"
	| "edit"
	| "settings"
	| "lock"
	| "logout"
	| "download"
	| "copy"
	| "save"
	| "github"
	| "search"
	| "plus"
	| "trash"
	| "eye"
	| "upload"
	| "close"
	| "check"
	| "refresh"
	| "clock"
	| "folder"
	| "tag"
	| "alert"
	| "calendar"
	| "image"
	| "bold"
	| "italic"
	| "heading"
	| "quote"
	| "code"
	| "list"
	| "link"
	| "external"
	| "key"
	| "spinner"
	| "user"
	| "text"
	| "sparkles"
	| "menu"
	| "layout"
	| "grid"
	| "chat"
	| "music"
	| "gift"
	| "bookmark"
	| "shield"
	| "chart"
	| "arrowUp"
	| "arrowDown"
	| "layers"
	| "sliders"
	| "palette"
	| "strike"
	| "orderedList"
	| "task"
	| "table"
	| "divider"
	| "math"
	| "callout"
	| "footnote"
	| "details";

interface Props {
	name: AdminIconName;
	class?: string;
}

const { name, class: className = "w-4 h-4" }: Props = $props();

const ICONS: Record<AdminIconName, string> = {
	dashboard:
		'<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
	post: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h4"/>',
	edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
	settings:
		'<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
	lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
	logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
	download:
		'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
	copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
	save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
	github:
		'<path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.95 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.6 9.6 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.85-2.34 4.7-4.57 4.95.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/>',
	search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
	plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
	trash:
		'<path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
	eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
	upload:
		'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 8 5-5 5 5"/><path d="M12 3v12"/>',
	close: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
	check: '<path d="m5 13 4 4L19 7"/>',
	refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>',
	clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
	folder:
		'<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
	tag: '<path d="M20.6 13.4 12 22l-9-9V4a1 1 0 0 1 1-1h8.6a1 1 0 0 1 .7.3l8 8a1 1 0 0 1 .3.7z"/><circle cx="7.5" cy="7.5" r="1.2"/>',
	alert:
		'<path d="M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
	calendar:
		'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>',
	image:
		'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.5"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
	bold: '<path d="M7 5h6a3.5 3.5 0 0 1 0 7H7z"/><path d="M7 12h7a3.5 3.5 0 0 1 0 7H7z"/>',
	italic: '<path d="M15 5h-5M10 19H5M14 5l-4 14"/>',
	heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
	quote: '<path d="M7 7h4v5a4 4 0 0 1-4 4"/><path d="M15 7h4v5a4 4 0 0 1-4 4"/>',
	code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4"/>',
	list: '<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>',
	link: '<path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1"/><path d="M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1"/>',
	external:
		'<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>',
	key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.2-8.2 2 2-8.2 8.2"/><path d="m14 5 3 3"/>',
	spinner: '<path d="M12 3a9 9 0 1 0 9 9"/>',
	user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
	text: '<path d="M4 7V5h16v2"/><path d="M12 5v14"/><path d="M9 19h6"/>',
	sparkles:
		'<path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6Z"/><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8Z"/>',
	menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
	layout:
		'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/>',
	grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
	chat: '<path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-6a8 8 0 0 1 8-8h2a8 8 0 0 1 8 3Z"/>',
	music: '<circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/><path d="M9 18V6l12-2v12"/>',
	gift: '<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M3 12h18"/><path d="M12 8v13"/><path d="M12 8S9.5 3 7.5 4.5 9 8 12 8Z"/><path d="M12 8s2.5-5 4.5-3.5S15 8 12 8Z"/>',
	bookmark: '<path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z"/>',
	shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6Z"/>',
	chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
	arrowUp: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
	arrowDown: '<path d="M12 5v14"/><path d="m5 12 7 7 7-7"/>',
	layers: '<path d="m12 2 9 5-9 5-9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
	sliders: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
	palette:
		'<path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2A4 4 0 0 0 21 13c0-5-4-10-9-10Z"/><circle cx="7.5" cy="10.5" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="8" r="1"/>',
	strike:
		'<path d="M4 12h16"/><path d="M16.5 7.5A3.5 3.5 0 0 0 13 5h-2.2A3.3 3.3 0 0 0 7.6 8.4"/><path d="M7.5 16.5A3.5 3.5 0 0 0 11 19h2.2a3.3 3.3 0 0 0 3.2-3.4"/>',
	orderedList:
		'<path d="M9 6h12"/><path d="M9 12h12"/><path d="M9 18h12"/><path d="M3.5 5h1.2v3.2"/><path d="M3 12.5h2.2L3 16h2.4"/><path d="M3.4 17.6h1.6"/>',
	task: '<rect x="2.5" y="3" width="5.5" height="5.5" rx="1.4"/><path d="m4.2 5.8 1.3 1.3L7.2 5.4"/><rect x="2.5" y="15" width="5.5" height="5.5" rx="1.4"/><path d="M10 5.8h11"/><path d="M10 17.8h11"/>',
	table:
		'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/><path d="M9 10v10"/><path d="M15 10v10"/>',
	divider: '<path d="M3 12h18"/><path d="M6 7h12"/><path d="M6 17h12"/>',
	math: '<path d="M4 8h8"/><path d="M8 4v8"/><path d="M4 18h8"/><path d="M14 8h7"/><path d="M14 15h7"/>',
	callout:
		'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 8.5v4"/><path d="M12 16h.01"/>',
	footnote:
		'<path d="M4 20h11"/><path d="M8.5 20V5.5L5 8"/><path d="M15 11h6"/><path d="M18 11v9"/>',
	details:
		'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m8 10 4 4 4-4"/>',
};

const filled = new Set<AdminIconName>(["github"]);

const svg = $derived(ICONS[name] ?? ICONS.post);
const isFilled = $derived(filled.has(name));
</script>

{#if name === "spinner"}
	<svg
		class={`admin-spin ${className}`}
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		aria-hidden="true"
	>
		{@html svg}
	</svg>
{:else}
	<svg
		class={className}
		viewBox="0 0 24 24"
		fill={isFilled ? "currentColor" : "none"}
		stroke="currentColor"
		stroke-width="1.8"
		stroke-linecap="round"
		stroke-linejoin="round"
		aria-hidden="true"
	>
		{@html svg}
	</svg>
{/if}

<style>
	.admin-spin {
		animation: admin-spin 0.8s linear infinite;
		transform-origin: center;
	}
	@keyframes admin-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
