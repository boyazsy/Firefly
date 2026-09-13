<script lang="ts">
/**
 * 相册管理编辑器
 *
 * - 相册元信息（albums / columnWidth）：沿用通用表单，改动走「生成配置代码」提交
 * - 相册图片：直连 GitHub Contents API，对 public/gallery/<相册id>/ 目录
 *   上传、删除、预览，操作立即提交仓库并触发重新构建
 */
	import AdminFormFields from "./AdminFormFields.svelte";
	import AdminIcon from "./AdminIcon.svelte";
	import {
		commitRepoBinaryFile,
		deleteRepoFile,
		listRepoDir,
		type GitHubTarget,
		type RepoDirEntry,
	} from "@/utils/admin-github";
	import type { GitHubSettings } from "@/utils/admin-drafts";

	interface Props {
		// 相册配置结构固定，这里放宽为 any 以便递归绑定
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		value: Record<string, any>;
		settings: GitHubSettings;
	}

	let { value = $bindable(), settings }: Props = $props();

	let selectedAlbumId = $state("");
	let images = $state<RepoDirEntry[]>([]);
	let loading = $state(false);
	let listMessage = $state("");
	let uploading = $state(false);
	let uploadProgress = $state("");
	let deletingName = $state("");
	let fileInput: HTMLInputElement | null = $state(null);

	const albums = $derived(
		Array.isArray(value?.albums)
			? (value.albums as Record<string, unknown>[])
			: [],
	);
	const selectedAlbum = $derived(
		albums.find((album) => String(album.id ?? "") === selectedAlbumId) ?? null,
	);
	const githubReady = $derived(
		Boolean(settings?.owner && settings?.repo && settings?.token),
	);

	function albumTitle(album: Record<string, unknown>, index: number): string {
		const name = String(album.name ?? "").trim();
		const id = String(album.id ?? "").trim();
		if (name && id) return `${name}（${id}）`;
		return name || id || `相册 ${index + 1}`;
	}

	function target(): GitHubTarget {
		return {
			owner: settings.owner,
			repo: settings.repo,
			branch: settings.branch || "main",
			postsPath: settings.postsPath || "src/content/posts",
			token: settings.token,
		};
	}

	function formatSize(size: number): string {
		if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
		return `${Math.max(1, Math.round(size / 1024))} KB`;
	}

	async function loadImages() {
		if (!selectedAlbum || !githubReady) return;
		const albumId = String(selectedAlbum.id ?? "").trim();
		if (!albumId) {
			listMessage = "该相册没有设置 id，无法定位图片目录";
			return;
		}
		loading = true;
		listMessage = "";
		images = [];
		const result = await listRepoDir(
			target(),
			`public/gallery/${albumId}`,
		);
		loading = false;
		if (!result.ok || !result.data) {
			listMessage = `${result.message}（目录不存在时，上传第一张图片会自动创建）`;
			return;
		}
		images = result.data.filter((entry) => entry.type === "file");
		if (images.length === 0) {
			listMessage = "目录为空，上传第一张图片吧";
		}
	}

	function selectAlbum(albumId: string) {
		selectedAlbumId = albumId;
		images = [];
		listMessage = "";
		loadImages();
	}

	async function onPickFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = "";
		if (files.length === 0 || !selectedAlbum) return;
		const albumId = String(selectedAlbum.id ?? "").trim();
		if (!albumId) {
			listMessage = "该相册没有设置 id，请先在下方元信息里填写 id";
			return;
		}
		uploading = true;
		const failed: string[] = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			uploadProgress = `正在上传（${i + 1}/${files.length}）：${file.name}`;
			const bytes = new Uint8Array(await file.arrayBuffer());
			const result = await commitRepoBinaryFile(
				target(),
				`public/gallery/${albumId}/${file.name}`,
				bytes,
				`chore(gallery): 上传相册图片 ${file.name}`,
			);
			if (!result.ok) failed.push(`${file.name}：${result.message}`);
		}
		uploading = false;
		uploadProgress = "";
		listMessage =
			failed.length === 0
				? `已上传 ${files.length} 张图片，等待构建后生效`
				: `部分上传失败：${failed.join("；")}`;
		await loadImages();
	}

	async function removeImage(image: RepoDirEntry) {
		if (deletingName) return;
		if (!confirm(`确定删除图片「${image.name}」吗？会直接提交到 GitHub。`)) {
			return;
		}
		deletingName = image.name;
		const result = await deleteRepoFile(
			target(),
			image.path,
			image.sha,
			`chore(gallery): 删除相册图片 ${image.name}`,
		);
		deletingName = "";
		listMessage = result.ok
			? `已删除 ${image.name}，等待构建后生效`
			: `删除失败：${result.message}`;
		await loadImages();
	}
</script>

<div class="admin-stack">
	<!-- ═══ 图片管理 ═══ -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="image" class="h-4 w-4" />
			<span>相册图片管理</span>
		</div>

		{#if !githubReady}
			<span class="admin-field__hint">
				未配置 GitHub 仓库或访问令牌，请先在「GitHub 发布」里完成配置，图片管理才能使用。
			</span>
		{:else if albums.length === 0}
			<span class="admin-field__hint">
				还没有相册，先在下方「相册列表」里添加一个并设置 id。
			</span>
		{:else}
			<label class="admin-field__stack">
				<span class="admin-field__label">选择相册</span>
				<select
					class="admin-select"
					value={selectedAlbumId}
					onchange={(event) => selectAlbum(event.currentTarget.value)}
				>
					<option value="" disabled>请选择相册</option>
					{#each albums as album, index (index)}
						<option value={String(album.id ?? "")}>
							{albumTitle(album, index)}
						</option>
					{/each}
				</select>
				<span class="admin-field__hint">
					图片存放在仓库 public/gallery/相册id/ 目录，上传或删除会立即提交并触发重新构建（约 3-5 分钟后生效）。
				</span>
			</label>

			{#if selectedAlbum}
				<div class="admin-field__row">
					<button
						type="button"
						class="admin-btn admin-btn--regular admin-btn--sm"
						disabled={uploading || loading}
						onclick={() => fileInput?.click()}
					>
						<AdminIcon name="plus" class="h-3.5 w-3.5" />
						{uploading ? "上传中…" : "上传图片（可多选）"}
					</button>
					<button
						type="button"
						class="admin-btn admin-btn--ghost admin-btn--sm"
						disabled={loading || uploading}
						onclick={loadImages}
					>
						<AdminIcon name="refresh" class="h-3.5 w-3.5" />
						刷新列表
					</button>
					<input
						bind:this={fileInput}
						class="hidden"
						type="file"
						accept="image/*"
						multiple
						onchange={onPickFiles}
					/>
				</div>

				{#if uploadProgress}
					<span class="admin-field__hint">{uploadProgress}</span>
				{/if}
				{#if listMessage}
					<span class="admin-field__hint">{listMessage}</span>
				{/if}
				{#if loading}
					<span class="admin-field__hint">正在读取图片列表…</span>
				{/if}

				{#if images.length > 0}
					<div class="admin-gallery-grid">
						{#each images as image (image.sha)}
							<figure class="admin-gallery-item">
								{#if image.downloadUrl}
									<img
										class="admin-gallery-item__img"
										src={image.downloadUrl}
										alt={image.name}
										loading="lazy"
									/>
								{:else}
									<div class="admin-gallery-item__img admin-gallery-item__img--empty">
										<AdminIcon name="image" class="h-6 w-6" />
									</div>
								{/if}
								<figcaption class="admin-gallery-item__meta">
									<span class="admin-gallery-item__name" title={image.name}>
										{image.name}
									</span>
									<span class="admin-gallery-item__size">
										{formatSize(image.size)}
									</span>
									<button
										type="button"
										class="admin-btn admin-btn--danger admin-btn--sm"
										disabled={deletingName === image.name}
										aria-label="删除 {image.name}"
										onclick={() => removeImage(image)}
									>
										<AdminIcon name="trash" class="h-3.5 w-3.5" />
										{deletingName === image.name ? "删除中…" : "删除"}
									</button>
								</figcaption>
							</figure>
						{/each}
					</div>
				{/if}
			{/if}
		{/if}
	</div>

	<!-- ═══ 相册元信息 ═══ -->
	<div class="admin-card admin-card--bordered p-4">
		<div class="admin-section__title">
			<AdminIcon name="settings" class="h-4 w-4" />
			<span>相册列表与展示设置</span>
		</div>
		<span class="admin-field__hint">
			修改相册名称、描述、日期、标签、访问密码等元信息。改完需点右上角「生成配置代码」提交后才会生效。
		</span>
		<AdminFormFields bind:value only={["albums", "columnWidth"]} />
	</div>
</div>
