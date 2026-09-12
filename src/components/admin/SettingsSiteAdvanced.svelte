<script lang="ts">
/**
 * 站点配置 - 页面开关、导航栏、列表样式与其余参数
 */
	import AdminFormFields from "./AdminFormFields.svelte";
	import AdminIcon from "./AdminIcon.svelte";

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
	}

	let { value = $bindable() }: Props = $props();

	const PAGE_TOGGLES = [
		{ key: "friends", label: "友链页" },
		{ key: "guestbook", label: "留言板" },
		{ key: "dynamic", label: "动态页" },
		{ key: "projects", label: "项目页" },
		{ key: "gallery", label: "相册页" },
		{ key: "booknav", label: "书签导航" },
		{ key: "bilibili", label: "哔哩哔哩追番" },
		{ key: "bangumi", label: "番组计划" },
		{ key: "vndb", label: "VNDB" },
		{ key: "mal", label: "MyAnimeList" },
		{ key: "sponsor", label: "打赏页" },
		{ key: "admin", label: "后台管理" },
	] as const;

	const LOGO_TYPES = [
		{ id: "icon", label: "Astro 图标" },
		{ id: "image", label: "本地图片" },
		{ id: "url", label: "网络图片" },
	] as const;

	const pages = $derived<Record<string, unknown>>(
		(value?.pages && typeof value.pages === "object"
			? value.pages
			: {}) as Record<string, unknown>,
	);
	const navbar = $derived<Record<string, unknown>>(
		(value?.navbar && typeof value.navbar === "object"
			? value.navbar
			: {}) as Record<string, unknown>,
	);
	const logo = $derived<Record<string, unknown>>(
		(navbar.logo && typeof navbar.logo === "object"
			? navbar.logo
			: {}) as Record<string, unknown>,
	);

	function patch(key: string, next: unknown) {
		value = { ...value, [key]: next };
	}

	function patchPage(key: string, next: boolean) {
		patch("pages", { ...pages, [key]: next });
	}

	function patchNavbar(key: string, next: unknown) {
		patch("navbar", { ...navbar, [key]: next });
	}

	function patchLogo(key: string, next: unknown) {
		patchNavbar("logo", { ...logo, [key]: next });
	}
</script>

<div class="admin-stack">
	<!-- 页面开关 -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="grid" class="h-4 w-4" />
			页面开关
		</div>
		<span class="admin-field__hint">
			关闭后对应页面返回 404，导航栏里的菜单项也会自动隐藏
		</span>
		<div class="admin-toggle-grid">
			{#each PAGE_TOGGLES as item (item.key)}
				<label class="admin-field__inline">
					<span class="admin-field__label">{item.label}</span>
					<button
						type="button"
						class="admin-switch"
						role="switch"
						aria-checked={pages[item.key] === true}
						aria-label={item.label}
						onclick={() => patchPage(item.key, pages[item.key] !== true)}
					>
						<span
							class="admin-switch-track"
							class:is-on={pages[item.key] === true}
						></span>
					</button>
				</label>
			{/each}
		</div>
	</div>

	<!-- 导航栏 -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="menu" class="h-4 w-4" />
			导航栏
		</div>

		<div class="admin-field__group">
			<span class="admin-field__label">站点 Logo</span>
			<label class="admin-field__stack">
				<span class="admin-field__label">类型</span>
				<select
					class="admin-select"
					value={String(logo.type ?? "icon")}
					onchange={(event) => patchLogo("type", event.currentTarget.value)}
				>
					{#each LOGO_TYPES as type (type.id)}
						<option value={type.id}>{type.label}</option>
					{/each}
				</select>
			</label>
			<div class="admin-grid-2">
				<label class="admin-field__stack">
					<span class="admin-field__label">
						{logo.type === "icon" ? "图标代码" : "图片路径"}
					</span>
					<input
						class="admin-input"
						type="text"
						placeholder={logo.type === "icon"
							? "material-symbols:home-pin-outline"
							: "assets/images/logo.png"}
						value={String(logo.value ?? "")}
						oninput={(event) => patchLogo("value", event.currentTarget.value)}
					/>
				</label>
				{#if logo.type !== "icon"}
					<label class="admin-field__stack">
						<span class="admin-field__label">暗色模式图片（可选）</span>
						<input
							class="admin-input"
							type="text"
							value={String(logo.valueDark ?? "")}
							oninput={(event) =>
								patchLogo("valueDark", event.currentTarget.value || undefined)}
						/>
					</label>
				{/if}
			</div>
			<label class="admin-field__stack">
				<span class="admin-field__label">替代文字 alt</span>
				<input
					class="admin-input"
					type="text"
					value={String(logo.alt ?? "")}
					oninput={(event) => patchLogo("alt", event.currentTarget.value)}
				/>
			</label>
		</div>

		<div class="admin-grid-2">
			<label class="admin-field__stack">
				<span class="admin-field__label">导航栏标题</span>
				<input
					class="admin-input"
					type="text"
					value={String(navbar.title ?? "")}
					oninput={(event) => patchNavbar("title", event.currentTarget.value)}
				/>
			</label>
			<label class="admin-field__stack">
				<span class="admin-field__label">导航模式</span>
				<select
					class="admin-select"
					value={String(navbar.navbarMode ?? "dynamic")}
					onchange={(event) => patchNavbar("navbarMode", event.currentTarget.value)}
				>
					<option value="static">static（随页面滚动消失）</option>
					<option value="fixed">fixed（固定常显）</option>
					<option value="dynamic">dynamic（下滑隐藏、上滑显示）</option>
				</select>
			</label>
		</div>

		<div class="admin-grid-2">
			<label class="admin-field__stack">
				<span class="admin-field__label">菜单对齐</span>
				<select
					class="admin-select"
					value={String(navbar.menuAlign ?? "center")}
					onchange={(event) => patchNavbar("menuAlign", event.currentTarget.value)}
				>
					<option value="left">左对齐</option>
					<option value="center">居中</option>
				</select>
			</label>
			<div class="admin-field__stack">
				<label class="admin-field__inline">
					<span class="admin-field__label">全宽导航栏</span>
					<button
						type="button"
						class="admin-switch"
						role="switch"
						aria-checked={navbar.widthFull === true}
						aria-label="全宽导航栏"
						onclick={() => patchNavbar("widthFull", navbar.widthFull !== true)}
					>
						<span
							class="admin-switch-track"
							class:is-on={navbar.widthFull === true}
						></span>
					</button>
				</label>
				<label class="admin-field__inline">
					<span class="admin-field__label">图标标题跟随主题色</span>
					<button
						type="button"
						class="admin-switch"
						role="switch"
						aria-checked={navbar.followTheme === true}
						aria-label="图标标题跟随主题色"
						onclick={() => patchNavbar("followTheme", navbar.followTheme !== true)}
					>
						<span
							class="admin-switch-track"
							class:is-on={navbar.followTheme === true}
						></span>
					</button>
				</label>
			</div>
		</div>
	</div>

	<!-- 分类与标签样式 -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="tag" class="h-4 w-4" />
			分类与标签
		</div>
		<AdminFormFields
			bind:value={value}
			depth={0}
			only={["categoryBar", "categoryStyle", "tagStyle", "foldArticle"]}
		/>
	</div>

	<!-- 文章列表与内容 -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="post" class="h-4 w-4" />
			文章列表与内容
		</div>
		<AdminFormFields
			bind:value={value}
			depth={0}
			only={["postListLayout", "pagination", "post", "feed"]}
		/>
	</div>

	<!-- 图像与第三方数据 -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="image" class="h-4 w-4" />
			图像优化
		</div>
		<AdminFormFields bind:value={value} depth={0} only={["imageOptimization"]} />
	</div>

	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="chart" class="h-4 w-4" />
			第三方数据（追番 / 游戏 / VNDB / MAL）
		</div>
		<span class="admin-field__hint">
			这些页面的数据需要填写对应的用户 ID 或 API 令牌
		</span>
		<AdminFormFields
			bind:value={value}
			depth={0}
			only={["bilibili", "bangumi", "vndb", "mal"]}
		/>
	</div>
</div>
