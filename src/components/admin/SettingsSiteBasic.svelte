<script lang="ts">
/**
 * 站点基础配置
 */
	import AdminIcon from "./AdminIcon.svelte";
	import { previewHue } from "@/utils/admin-live-preview";

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
	}

	let { value = $bindable() }: Props = $props();

	const LANGS = [
		{ id: "zh_CN", label: "简体中文" },
		{ id: "zh_TW", label: "繁體中文" },
		{ id: "en", label: "English" },
		{ id: "ja", label: "日本語" },
		{ id: "ko", label: "한국어" },
		{ id: "ru", label: "Русский" },
	];

	const MODES = [
		{ id: "light", label: "亮色" },
		{ id: "dark", label: "暗色" },
		{ id: "system", label: "跟随系统" },
	];

	const themeColor = $derived<Record<string, unknown>>(
		(value?.themeColor && typeof value.themeColor === "object"
			? value.themeColor
			: {}) as Record<string, unknown>,
	);
	const card = $derived<Record<string, unknown>>(
		(value?.card && typeof value.card === "object"
			? value.card
			: {}) as Record<string, unknown>,
	);
	const keywords = $derived<string[]>(
		Array.isArray(value?.keywords) ? (value.keywords as string[]) : [],
	);
	const favicons = $derived<Record<string, unknown>[]>(
		Array.isArray(value?.favicon)
			? (value.favicon as Record<string, unknown>[])
			: [],
	);

	const hue = $derived(Number(themeColor.hue ?? 165));

	function patch(key: string, next: unknown) {
		value = { ...value, [key]: next };
	}

	function patchTheme(key: string, next: unknown) {
		patch("themeColor", { ...themeColor, [key]: next });
	}

	function patchCard(key: string, next: unknown) {
		patch("card", { ...card, [key]: next });
	}

	function addKeyword(text: string) {
		if (!text.trim() || keywords.includes(text.trim())) return;
		patch("keywords", [...keywords, text.trim()]);
	}

	function patchFavicon(index: number, patchData: Record<string, unknown>) {
		patch(
			"favicon",
			favicons.map((item, i) => (i === index ? { ...item, ...patchData } : item)),
		);
	}
</script>

<div class="admin-stack">
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="settings" class="h-4 w-4" />
			站点信息
		</div>

		<div class="admin-grid-2">
			<label class="admin-field__stack">
				<span class="admin-field__label">站点标题</span>
				<input
					class="admin-input"
					type="text"
					value={String(value?.title ?? "")}
					oninput={(event) => patch("title", event.currentTarget.value)}
				/>
			</label>
			<label class="admin-field__stack">
				<span class="admin-field__label">站点副标题</span>
				<input
					class="admin-input"
					type="text"
					value={String(value?.subtitle ?? "")}
					oninput={(event) => patch("subtitle", event.currentTarget.value)}
				/>
			</label>
		</div>

		<label class="admin-field__stack">
			<span class="admin-field__label">站点地址</span>
			<input
				class="admin-input"
				type="text"
				placeholder="https://example.com"
				value={String(value?.site_url ?? "")}
				oninput={(event) => patch("site_url", event.currentTarget.value)}
			/>
			<span class="admin-field__hint">
				带协议的完整地址，用于 RSS、sitemap 与 OG 图片生成
			</span>
		</label>

		<label class="admin-field__stack">
			<span class="admin-field__label">站点描述</span>
			<textarea
				class="admin-textarea"
				rows="3"
				value={String(value?.description ?? "")}
				oninput={(event) => patch("description", event.currentTarget.value)}
			></textarea>
			<span class="admin-field__hint">用于 SEO 与 RSS 摘要</span>
		</label>

		<div class="admin-field__stack">
			<span class="admin-field__label">站点关键词</span>
			<div class="admin-chips">
				{#each keywords as item, index (index)}
					<span class="admin-chip">
						{item}
						<button
							type="button"
							class="admin-chip__remove"
							aria-label="移除 {item}"
							onclick={() =>
								patch(
									"keywords",
									keywords.filter((_, i) => i !== index),
								)}
						>
							<AdminIcon name="close" class="h-3 w-3" />
						</button>
					</span>
				{/each}
			</div>
			<input
				class="admin-input"
				type="text"
				placeholder="输入后回车添加"
				onkeydown={(event) => {
					if (event.key !== "Enter") return;
					event.preventDefault();
					const input = event.currentTarget;
					addKeyword(input.value);
					input.value = "";
				}}
			/>
		</div>
	</div>

	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="palette" class="h-4 w-4" />
			主题色
		</div>

		<div class="admin-field__stack">
			<span class="admin-field__label">色相：{hue}</span>
			<div class="admin-field__row">
				<input
					class="admin-range"
					type="range"
					min="0"
					max="360"
					step="1"
					value={hue}
					oninput={(event) => {
						const next = Number(event.currentTarget.value);
						patchTheme("hue", next);
						previewHue(next);
					}}
				/>
				<span
					class="admin-hue-swatch"
					style="background: hsl({hue} 70% 50%)"
					aria-hidden="true"
				></span>
			</div>
			<span class="admin-field__hint">
				0-360：红色 0、青色 200、蓝绿色 250、粉色 345。拖动可在本页即时预览。
			</span>
		</div>

		<label class="admin-field__stack">
			<span class="admin-field__label">默认明暗模式</span>
			<select
				class="admin-select"
				value={String(themeColor.defaultMode ?? "system")}
				onchange={(event) => patchTheme("defaultMode", event.currentTarget.value)}
			>
				{#each MODES as mode (mode.id)}
					<option value={mode.id}>{mode.label}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="layout" class="h-4 w-4" />
			语言、时区与布局
		</div>

		<div class="admin-grid-3">
			<label class="admin-field__stack">
				<span class="admin-field__label">站点语言</span>
				<select
					class="admin-select"
					value={String(value?.lang ?? "zh_CN")}
					onchange={(event) => patch("lang", event.currentTarget.value)}
				>
					{#each LANGS as lang (lang.id)}
						<option value={lang.id}>{lang.label}</option>
					{/each}
				</select>
			</label>
			<label class="admin-field__stack">
				<span class="admin-field__label">时区</span>
				<input
					class="admin-input"
					type="text"
					placeholder="Asia/Shanghai"
					value={String(value?.timezone ?? "")}
					oninput={(event) => patch("timezone", event.currentTarget.value)}
				/>
			</label>
			<label class="admin-field__stack">
				<span class="admin-field__label">建站日期</span>
				<input
					class="admin-input"
					type="text"
					placeholder="2025-01-01"
					value={String(value?.siteStartDate ?? "")}
					oninput={(event) => patch("siteStartDate", event.currentTarget.value)}
				/>
			</label>
		</div>

		<label class="admin-field__stack">
			<span class="admin-field__label">页面整体宽度（rem）：{value?.pageWidth ?? 100}</span>
			<input
				class="admin-range"
				type="range"
				min="60"
				max="140"
				step="1"
				value={Number(value?.pageWidth ?? 100)}
				oninput={(event) => patch("pageWidth", Number(event.currentTarget.value))}
			/>
			<span class="admin-field__hint">
				数值越大内容区越宽；使用单侧边栏时建议调低一些
			</span>
		</label>
	</div>

	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="grid" class="h-4 w-4" />
			卡片样式
		</div>
		<label class="admin-field__inline">
			<span class="admin-field__label">卡片边框和阴影</span>
			<button
				type="button"
				class="admin-switch"
				role="switch"
				aria-checked={card.border === true}
				aria-label="卡片边框和阴影"
				onclick={() => patchCard("border", card.border !== true)}
			>
				<span class="admin-switch-track" class:is-on={card.border === true}></span>
			</button>
		</label>
		<label class="admin-field__inline">
			<span class="admin-field__label">卡片风格跟随主题色</span>
			<button
				type="button"
				class="admin-switch"
				role="switch"
				aria-checked={card.followTheme === true}
				aria-label="卡片风格跟随主题色"
				onclick={() => patchCard("followTheme", card.followTheme !== true)}
			>
				<span class="admin-switch-track" class:is-on={card.followTheme === true}
				></span>
			</button>
		</label>
	</div>

	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="image" class="h-4 w-4" />
			站点图标
		</div>
		<span class="admin-field__hint">
			第一个图标作为默认，可按明暗模式 / 尺寸提供多个。
			启用 OG 图片功能时，数组中需要包含 png 格式图标。
		</span>

		{#each favicons as item, index (index)}
			<div class="admin-card admin-card--bordered admin-list__item">
				<div class="admin-list__bar">
					<span class="admin-list__index">#{index + 1}</span>
					<div class="admin-list__actions">
						<button
							type="button"
							class="admin-btn admin-btn--danger admin-btn--sm"
							aria-label="删除"
							onclick={() =>
								patch(
									"favicon",
									favicons.filter((_, i) => i !== index),
								)}
						>
							<AdminIcon name="trash" class="h-3.5 w-3.5" />
						</button>
					</div>
				</div>
				<div class="admin-grid-3">
					<label class="admin-field__stack">
						<span class="admin-field__label">图标路径</span>
						<input
							class="admin-input"
							type="text"
							value={String(item.src ?? "")}
							oninput={(event) => patchFavicon(index, { src: event.currentTarget.value })}
						/>
					</label>
					<label class="admin-field__stack">
						<span class="admin-field__label">主题（可选）</span>
						<select
							class="admin-select"
							value={String(item.theme ?? "")}
							onchange={(event) =>
								patchFavicon(index, {
									theme: event.currentTarget.value || undefined,
								})}
						>
							<option value="">不指定</option>
							<option value="light">light</option>
							<option value="dark">dark</option>
						</select>
					</label>
					<label class="admin-field__stack">
						<span class="admin-field__label">尺寸（可选）</span>
						<input
							class="admin-input"
							type="text"
							placeholder="32x32"
							value={String(item.sizes ?? "")}
							oninput={(event) =>
								patchFavicon(index, {
									sizes: event.currentTarget.value || undefined,
								})}
						/>
					</label>
				</div>
			</div>
		{/each}

		<button
			type="button"
			class="admin-btn admin-btn--ghost admin-btn--sm"
			onclick={() =>
				patch("favicon", [...favicons, { src: "/favicon/icon-32.png" }])}
		>
			<AdminIcon name="plus" class="h-3.5 w-3.5" />
			添加图标
		</button>
	</div>
</div>
