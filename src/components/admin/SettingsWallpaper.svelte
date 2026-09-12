<script lang="ts">
/**
 * 背景壁纸设置
 */
	import AdminFormFields from "./AdminFormFields.svelte";
	import AdminIcon from "./AdminIcon.svelte";
	import { previewWallpaper } from "@/utils/admin-live-preview";

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
	}

	let { value = $bindable() }: Props = $props();

	const MODES = [
		{
			id: "banner",
			label: "横幅壁纸",
			desc: "只在页面顶部显示一条横幅",
			icon: "image",
		},
		{
			id: "fullscreen",
			label: "全屏壁纸",
			desc: "整页铺满背景图",
			icon: "layout",
		},
		{
			id: "overlay",
			label: "透明覆盖",
			desc: "卡片半透明浮在壁纸上",
			icon: "layers",
		},
		{ id: "none", label: "纯色背景", desc: "不使用任何壁纸", icon: "close" },
	] as const;

	const src = $derived<Record<string, unknown>>(
		(value?.src && typeof value.src === "object" ? value.src : {}) as Record<
			string,
			unknown
		>,
	);
	const common = $derived<Record<string, unknown>>(
		(value?.common && typeof value.common === "object"
			? value.common
			: {}) as Record<string, unknown>,
	);
	const homeText = $derived<Record<string, unknown>>(
		(common.homeText && typeof common.homeText === "object"
			? common.homeText
			: {}) as Record<string, unknown>,
	);

	function patch(path: (string | number)[], next: unknown) {
		const clone = JSON.parse(JSON.stringify(value ?? {}));
		let cursor = clone;
		for (let i = 0; i < path.length - 1; i++) {
			const key = path[i];
			if (typeof cursor[key] !== "object" || cursor[key] === null) {
				cursor[key] = typeof path[i + 1] === "number" ? [] : {};
			}
			cursor = cursor[key];
		}
		cursor[path[path.length - 1]] = next;
		value = clone;
	}

	function patchSrc(key: string, next: unknown) {
		patch(["src", key], next);
	}

	function patchCommon(key: string, next: unknown) {
		patch(["common", key], next);
	}

	function patchHomeText(key: string, next: unknown) {
		patch(["common", "homeText", key], next);
	}

	/** 壁纸列表：兼容「单张字符串」与「多张数组」两种写法 */
	function listOf(raw: unknown): string[] {
		if (Array.isArray(raw)) return raw.filter((v) => typeof v === "string");
		if (typeof raw === "string" && raw) return [raw];
		return [];
	}

	function isMulti(raw: unknown): boolean {
		return Array.isArray(raw);
	}

	function commitWallpaper(key: string, list: string[], multi: boolean) {
		patchSrc(key, multi ? list : (list[0] ?? ""));
	}

	const desktopList = $derived(listOf(src.desktop));
	const mobileList = $derived(listOf(src.mobile));
	const subtitleList = $derived(listOf(homeText.subtitle));

	function runPreview() {
		const mode = String(value?.mode ?? "banner");
		const urls = [...desktopList, ...mobileList];
		previewWallpaper({
			mode,
			urls,
			dimOpacity: Number(common.dimOpacity ?? 0),
		});
	}
</script>

<div class="admin-stack">
	<!-- 壁纸模式 -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="image" class="h-4 w-4" />
			壁纸模式
		</div>
		<div class="admin-mode-grid">
			{#each MODES as mode (mode.id)}
				<button
					type="button"
					class="admin-mode-card"
					class:is-active={value?.mode === mode.id}
					onclick={() => {
						patch(["mode"], mode.id);
						runPreview();
					}}
				>
					<AdminIcon name={mode.icon} class="h-5 w-5" />
					<span class="admin-mode-card__label">{mode.label}</span>
					<span class="admin-mode-card__desc">{mode.desc}</span>
				</button>
			{/each}
		</div>
		<div class="admin-field__row">
			<button
				type="button"
				class="admin-btn admin-btn--ghost admin-btn--sm"
				onclick={runPreview}
			>
				<AdminIcon name="eye" class="h-3.5 w-3.5" />
				在当前页预览
			</button>
		</div>
	</div>

	<!-- 壁纸图片 -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="image" class="h-4 w-4" />
			壁纸图片
		</div>
		<span class="admin-field__hint">
			单张模式下保存为字符串，多张模式下保存为数组（每次刷新随机一张）。
			src 目录下的图片在后台无法预览，前台正常显示。
		</span>

		{#each [{ key: "desktop", label: "桌面端壁纸", list: desktopList }, { key: "mobile", label: "移动端壁纸", list: mobileList }] as group (group.key)}
			{@const raw = src[group.key]}
			<div class="admin-field__group">
				<div class="admin-list__bar">
					<span class="admin-field__label">{group.label}</span>
					<div class="admin-list__actions">
						<span class="admin-field__count">
							{isMulti(raw) ? "多张随机" : "单张"}
						</span>
						<button
							type="button"
							class="admin-btn admin-btn--ghost admin-btn--sm"
							onclick={() => commitWallpaper(group.key, group.list, !isMulti(raw))}
						>
							{isMulti(raw) ? "切换为单张" : "切换为多张"}
						</button>
					</div>
				</div>

				{#each group.list as item, index (index)}
					<div class="admin-field__row">
						<input
							class="admin-input"
							type="text"
							value={item}
							oninput={(event) => {
								const next = [...group.list];
								next[index] = event.currentTarget.value;
								commitWallpaper(group.key, next, isMulti(raw));
							}}
						/>
						<button
							type="button"
							class="admin-btn admin-btn--danger admin-btn--sm"
							aria-label="删除"
							onclick={() =>
								commitWallpaper(
									group.key,
									group.list.filter((_, i) => i !== index),
									isMulti(raw),
								)}
						>
							<AdminIcon name="trash" class="h-3.5 w-3.5" />
						</button>
					</div>
				{/each}
				<button
					type="button"
					class="admin-btn admin-btn--ghost admin-btn--sm"
					onclick={() =>
						commitWallpaper(
							group.key,
							[...group.list, "assets/images/DesktopWallpaper/d1.avif"],
							true,
						)}
				>
					<AdminIcon name="plus" class="h-3.5 w-3.5" />
					添加一张
				</button>
			</div>
		{/each}

		<label class="admin-field__inline">
			<span class="admin-field__label">启用背景视频</span>
			<button
				type="button"
				class="admin-switch"
				role="switch"
				aria-checked={value?.playerEnable === true}
				aria-label="启用背景视频"
				onclick={() => patch(["playerEnable"], !value?.playerEnable)}
			>
				<span
					class="admin-switch-track"
					class:is-on={value?.playerEnable === true}
				></span>
			</button>
		</label>
		<label class="admin-field__stack">
			<span class="admin-field__label">视频地址</span>
			<input
				class="admin-input"
				type="text"
				value={typeof src.playerUrl === "string" ? src.playerUrl : ""}
				oninput={(event) => patchSrc("playerUrl", event.currentTarget.value)}
			/>
		</label>
	</div>

	<!-- 横幅文字 -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="text" class="h-4 w-4" />
			主页横幅文字
		</div>

		<label class="admin-field__inline">
			<span class="admin-field__label">启用横幅文字</span>
			<button
				type="button"
				class="admin-switch"
				role="switch"
				aria-checked={homeText.enable === true}
				aria-label="启用横幅文字"
				onclick={() => patchHomeText("enable", !homeText.enable)}
			>
				<span class="admin-switch-track" class:is-on={homeText.enable === true}
				></span>
			</button>
		</label>

		<div class="admin-grid-2">
			<label class="admin-field__stack">
				<span class="admin-field__label">主标题</span>
				<input
					class="admin-input"
					type="text"
					value={String(homeText.title ?? "")}
					oninput={(event) => patchHomeText("title", event.currentTarget.value)}
				/>
			</label>
			<label class="admin-field__stack">
				<span class="admin-field__label">主标题字号</span>
				<input
					class="admin-input"
					type="text"
					value={String(homeText.titleSize ?? "")}
					oninput={(event) => patchHomeText("titleSize", event.currentTarget.value)}
				/>
			</label>
		</div>

		<div class="admin-field__stack">
			<span class="admin-field__label">副标题（多条时按打字机轮播）</span>
			{#each subtitleList as item, index (index)}
				<div class="admin-field__row">
					<input
						class="admin-input"
						type="text"
						value={item}
						oninput={(event) => {
							const next = [...subtitleList];
							next[index] = event.currentTarget.value;
							patchHomeText("subtitle", next);
						}}
					/>
					<button
						type="button"
						class="admin-btn admin-btn--danger admin-btn--sm"
						aria-label="删除"
						onclick={() =>
							patchHomeText(
								"subtitle",
								subtitleList.filter((_, i) => i !== index),
							)}
					>
						<AdminIcon name="trash" class="h-3.5 w-3.5" />
					</button>
				</div>
			{/each}
			<button
				type="button"
				class="admin-btn admin-btn--ghost admin-btn--sm"
				onclick={() => patchHomeText("subtitle", [...subtitleList, ""])}
			>
				<AdminIcon name="plus" class="h-3.5 w-3.5" />
				添加副标题
			</button>
		</div>
	</div>

	<!-- 其余参数交给通用表单，保证不漏项 -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="sliders" class="h-4 w-4" />
			遮罩、轮播、水波纹与渐变
		</div>
		<AdminFormFields bind:value={value.common} depth={0} />
	</div>

	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="layout" class="h-4 w-4" />
			各模式专属参数
		</div>
		<span class="admin-field__hint">
			下列三组分别对应不同的壁纸模式，只有当前生效模式的配置会被使用。
		</span>
		{#each [{ key: "banner", label: "横幅模式" }, { key: "overlay", label: "透明覆盖模式" }, { key: "fullscreen", label: "全屏模式" }] as group (group.key)}
			<div class="admin-field__group">
				<div class="admin-field__label">{group.label}</div>
				<AdminFormFields bind:value={value[group.key]} depth={1} />
			</div>
		{/each}
	</div>
</div>
