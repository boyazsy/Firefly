<script lang="ts">
/**
 * 个人资料设置
 */
	import AdminIcon from "./AdminIcon.svelte";

	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
	}

	let { value = $bindable() }: Props = $props();

	interface SocialLink {
		name: string;
		icon: string;
		url: string;
		showName?: boolean;
	}

	const links = $derived<SocialLink[]>(
		Array.isArray(value?.links) ? (value.links as SocialLink[]) : [],
	);

	function update(patch: Record<string, unknown>) {
		value = { ...value, ...patch };
	}

	function patchLinks(next: SocialLink[]) {
		update({ links: next });
	}

	function addLink() {
		patchLinks([
			...links,
			{ name: "新链接", icon: "material-symbols:link", url: "https://", showName: false },
		]);
	}

	function removeLink(index: number) {
		patchLinks(links.filter((_, i) => i !== index));
	}

	function moveLink(index: number, delta: number) {
		const target = index + delta;
		if (target < 0 || target >= links.length) return;
		const next = [...links];
		[next[index], next[target]] = [next[target], next[index]];
		patchLinks(next);
	}

	function patchLink(index: number, patch: Partial<SocialLink>) {
		patchLinks(links.map((item, i) => (i === index ? { ...item, ...patch } : item)));
	}

</script>

<div class="admin-stack">
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="user" class="h-4 w-4" />
			基本信息
		</div>

		<div class="admin-grid-2">
			<div class="admin-field__stack">
				<span class="admin-field__label">头像</span>
				<div class="admin-field__row">
					{#if value?.avatar}
						<img
							class="admin-avatar-preview"
							src={String(value.avatar)}
							alt="头像预览"
						/>
					{/if}
					<input
						class="admin-input"
						type="text"
						placeholder="assets/images/avatar.avif"
						value={String(value?.avatar ?? "")}
						oninput={(event) => update({ avatar: event.currentTarget.value })}
					/>
				</div>
				<span class="admin-field__hint">
					支持 public 路径（以 / 开头）、src 路径（自动优化）或远程 URL。
					src 路径图片在后台可能无法预览，前台正常显示。
				</span>
			</div>

			<div class="admin-field__stack">
				<span class="admin-field__label">昵称</span>
				<input
					class="admin-input"
					type="text"
					value={String(value?.name ?? "")}
					oninput={(event) => update({ name: event.currentTarget.value })}
				/>
			</div>
		</div>

		<div class="admin-field__stack">
			<span class="admin-field__label">个人签名</span>
			<input
				class="admin-input"
				type="text"
				value={String(value?.bio ?? "")}
				oninput={(event) => update({ bio: event.currentTarget.value })}
			/>
		</div>
	</div>

	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="link" class="h-4 w-4" />
			社交链接
			<span class="admin-field__count">{links.length} 个</span>
		</div>
		<span class="admin-field__hint">
			图标使用 Iconify 格式，如 fa7-brands:github、material-symbols:mail。
			可在 icones.js.org 查询图标代码。
		</span>

		<div class="admin-list">
			{#each links as item, index (index)}
				<div class="admin-card admin-card--bordered admin-list__item">
					<div class="admin-list__bar">
						<span class="admin-list__index">#{index + 1}</span>
						<div class="admin-list__actions">
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								aria-label="上移"
								disabled={index === 0}
								onclick={() => moveLink(index, -1)}
							>
								<AdminIcon name="arrowUp" class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								aria-label="下移"
								disabled={index === links.length - 1}
								onclick={() => moveLink(index, 1)}
							>
								<AdminIcon name="arrowDown" class="h-3.5 w-3.5" />
							</button>
							<button
								type="button"
								class="admin-btn admin-btn--danger admin-btn--sm"
								aria-label="删除"
								onclick={() => removeLink(index)}
							>
								<AdminIcon name="trash" class="h-3.5 w-3.5" />
							</button>
						</div>
					</div>

					<div class="admin-grid-2">
						<label class="admin-field__stack">
							<span class="admin-field__label">名称</span>
							<input
								class="admin-input"
								type="text"
								value={item.name ?? ""}
								oninput={(event) =>
									patchLink(index, { name: event.currentTarget.value })}
							/>
						</label>
						<label class="admin-field__stack">
							<span class="admin-field__label">图标</span>
							<input
								class="admin-input"
								type="text"
								value={item.icon ?? ""}
								oninput={(event) =>
									patchLink(index, { icon: event.currentTarget.value })}
							/>
						</label>
					</div>

					<label class="admin-field__stack">
						<span class="admin-field__label">链接地址</span>
						<input
							class="admin-input"
							type="text"
							value={item.url ?? ""}
							oninput={(event) =>
								patchLink(index, { url: event.currentTarget.value })}
						/>
					</label>

					<label class="admin-field__inline">
						<span class="admin-field__label">显示名称文字</span>
						<button
							type="button"
							class="admin-switch"
							role="switch"
							aria-checked={item.showName === true}
							aria-label="显示名称文字"
							onclick={() => patchLink(index, { showName: !item.showName })}
						>
							<span
								class="admin-switch-track"
								class:is-on={item.showName === true}
							></span>
						</button>
					</label>
				</div>
			{/each}

			<button
				type="button"
				class="admin-btn admin-btn--ghost admin-btn--sm"
				onclick={addLink}
			>
				<AdminIcon name="plus" class="h-3.5 w-3.5" />
				添加链接
			</button>
		</div>
	</div>
</div>
