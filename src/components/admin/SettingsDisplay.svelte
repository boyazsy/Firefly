<script lang="ts">
/**
 * 显示设置面板 - 控制前台「设置」浮层里出现哪些开关
 */
	import AdminIcon from "./AdminIcon.svelte";

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
	}

	let { value = $bindable() }: Props = $props();

	const SECTIONS = [
		{
			title: "总开关",
			icon: "settings",
			hint: "关闭后前台完全不显示设置面板，构建体积更小、性能更好",
			items: [{ key: "enable", label: "启用前台设置面板" }],
		},
		{
			title: "外观",
			icon: "palette",
			hint: "",
			items: [
				{ key: "themeColorSwitchable", label: "主题色选择器" },
				{ key: "layoutSwitchable", label: "文章列表布局切换" },
				{ key: "cardBorderSwitchable", label: "卡片边框和阴影" },
				{ key: "cardFollowThemeSwitchable", label: "卡片风格跟随主题色" },
			],
		},
		{
			title: "壁纸",
			icon: "image",
			hint: "壁纸模式切换是构建体积大头，开启后所有壁纸模式的资源都会打进产物（约 +33KB/页）",
			items: [
				{ key: "wallpaperModeSwitchable", label: "壁纸模式切换" },
				{ key: "fullscreenLayoutSwitchable", label: "全屏壁纸布局切换" },
				{ key: "wavesSwitchable", label: "水波纹动画" },
				{ key: "gradientSwitchable", label: "渐变过渡效果" },
				{ key: "bannerTitleSwitchable", label: "横幅标题显示" },
				{ key: "bannerCarouselSwitchable", label: "壁纸轮播" },
			],
		},
		{
			title: "特效",
			icon: "sparkles",
			hint: "",
			items: [{ key: "sakuraSwitchable", label: "樱花特效" }],
		},
	] as const;

	function patch(key: string, next: unknown) {
		value = { ...value, [key]: next };
	}

	const overlay = $derived<Record<string, unknown>>(
		(value?.overlaySwitchable && typeof value.overlaySwitchable === "object"
			? value.overlaySwitchable
			: {}) as Record<string, unknown>,
	);

	/** 总开关关闭时主题会把所有子开关短路为 false，这里给出提示避免误解 */
	const masterOff = $derived(value?.enable !== true);

	function patchOverlay(key: string, next: boolean) {
		patch("overlaySwitchable", { ...overlay, [key]: next });
	}
</script>

<div class="admin-stack">
	{#if masterOff}
		<div class="admin-alert admin-alert--warn">
			<AdminIcon name="alert" class="mt-0.5 h-4 w-4 flex-none" />
			<span>
				总开关当前是关闭状态，主题会把下面所有开关强制视为「关闭」，
				因此这里显示的全部是 false。要先调整子开关，请把上方「启用前台设置面板」打开。
			</span>
		</div>
	{/if}

	{#each SECTIONS as section (section.title)}
		<div class="admin-card admin-card--bordered p-4">
			<div class="admin-section__title">
				<AdminIcon name={section.icon} class="h-4 w-4" />
				{section.title}
			</div>
			{#if section.hint}
				<div class="admin-alert admin-alert--info">
					<AdminIcon name="alert" class="mt-0.5 h-4 w-4 flex-none" />
					<span>{section.hint}</span>
				</div>
			{/if}
			{#each section.items as item (item.key)}
				<label class="admin-field__inline">
					<span class="admin-field__label">{item.label}</span>
					<button
						type="button"
						class="admin-switch"
						role="switch"
						aria-checked={value?.[item.key] === true}
						aria-label={item.label}
						onclick={() => patch(item.key, value?.[item.key] !== true)}
					>
						<span
							class="admin-switch-track"
							class:is-on={value?.[item.key] === true}
						></span>
					</button>
				</label>
			{/each}
		</div>
	{/each}

	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="layers" class="h-4 w-4" />
			透明覆盖参数调节
		</div>
		<span class="admin-field__hint">
			控制全屏壁纸 / 透明覆盖模式下，前台是否可以拖动滑块调整参数
		</span>
		{#each [{ key: "opacity", label: "壁纸透明度" }, { key: "blur", label: "背景模糊度" }, { key: "cardOpacity", label: "卡片透明度" }] as item (item.key)}
			<label class="admin-field__inline">
				<span class="admin-field__label">{item.label}</span>
				<button
					type="button"
					class="admin-switch"
					role="switch"
					aria-checked={overlay[item.key] === true}
					aria-label={item.label}
					onclick={() => patchOverlay(item.key, overlay[item.key] !== true)}
				>
					<span
						class="admin-switch-track"
						class:is-on={overlay[item.key] === true}
					></span>
				</button>
			</label>
		{/each}
	</div>
</div>
