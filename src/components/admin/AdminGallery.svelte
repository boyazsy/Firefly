<script lang="ts">
/**
 * 后台「相册」分区
 *
 * - 相册的新增 / 修改 / 删除：编辑 galleryConfig 的 albums，生成配置源码后直接提交仓库触发构建
 * - 相册图片管理：通过 GitHub Contents API 对 public/gallery/<相册id>/ 上传、删除、预览
 */
	import AdminIcon from "./AdminIcon.svelte";
	import type { GitHubTarget } from "@/utils/admin-github";
	import {
		commitRepoBinaryFile,
		commitRepoFile,
		deleteRepoFile,
		fetchRepoFile,
		listRepoDir,
		type RepoDirEntry,
	} from "@/utils/admin-github";
	import {
		buildFileSource,
		deepClone,
		fetchSnapshot,
	} from "@/utils/admin-settings-store";
	import type {
		AdminSettingsSnapshot,
		SettingsUnitMeta,
	} from "@/types/adminSettings";

	interface Props {
		/** 配置快照地址，读取 galleryConfig 当前值用 */
		settingsUrl: string;
		/** GitHub 提交目标，未配置时功能受限 */
		github: GitHubTarget | null;
		onNotify: (message: string, type?: "success" | "error") => void;
	}

	let { settingsUrl, github, onNotify }: Props = $props();

	interface AlbumForm {
		id: string;
		name: string;
		description: string;
		location: string;
		date: string;
		tags: string;
		password: string;
		passwordHint: string;
	}

	const EMPTY_FORM: AlbumForm = {
		id: "",
		name: "",
		description: "",
		location: "",
		date: "",
		tags: "",
		password: "",
		passwordHint: "",
	};

	let snapshot = $state<AdminSettingsSnapshot | null>(null);
	let galleryMeta = $state<SettingsUnitMeta | null>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let galleryValue = $state<any>(null);
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	let galleryOriginal = $state<any>(null);
	let loading = $state(false);
	let saving = $state(false);

	let showForm = $state(false);
	let editingIndex = $state(-1);
	let form = $state<AlbumForm>({ ...EMPTY_FORM });

	let manageAlbumId = $state("");
	let images = $state<RepoDirEntry[]>([]);
	let loadingImages = $state(false);
	let uploading = $state(false);
	let uploadProgress = $state("");
	let deletingName = $state("");
	let imageMessage = $state("");
	let imageInput: HTMLInputElement | null = $state(null);

	const albums = $derived(
		galleryValue && Array.isArray(galleryValue.albums)
			? // eslint-disable-next-line @typescript-eslint/no-explicit-any
				(galleryValue.albums as Record<string, any>[])
			: [],
	);
	const githubReady = $derived(Boolean(github?.owner && github?.repo && github?.token));

	async function load() {
		loading = true;
		try {
			const data = await fetchSnapshot(settingsUrl);
			snapshot = data;
			const unit = data.units.find(
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				(item) => (item as any).varName === "galleryConfig",
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
			) as (SettingsUnitMeta & { value: any }) | undefined;
			if (!unit) throw new Error("快照中没有相册配置");
			galleryMeta = unit;
			galleryValue = deepClone(unit.value);
			galleryOriginal = deepClone(unit.value);
		} catch (error) {
			onNotify(
				`相册配置加载失败：${error instanceof Error ? error.message : String(error)}`,
				"error",
			);
		} finally {
			loading = false;
		}
	}

	/** 把 albums 变更生成源码并提交仓库 */
	async function commitConfig(message: string) {
		if (!github) {
			onNotify("请先在「设置 → GitHub 发布」里配置仓库与 Token", "error");
			return false;
		}
		if (!snapshot || !galleryMeta) {
			onNotify("配置快照尚未加载", "error");
			return false;
		}
		saving = true;
		try {
			const { code } = buildFileSource(snapshot, "galleryConfig", galleryMeta.file, [
				{ meta: galleryMeta, value: galleryValue, original: galleryOriginal },
			]);
			const existing = await fetchRepoFile(github, galleryMeta.file);
			const sha = existing.ok ? existing.data?.sha : undefined;
			const result = await commitRepoFile(github, galleryMeta.file, code, message, sha);
			if (!result.ok) {
				onNotify(`提交失败：${result.message}`, "error");
				return false;
			}
			galleryOriginal = deepClone(galleryValue);
			onNotify("已提交到 GitHub，等待构建生效（约 3-5 分钟）");
			return true;
		} catch (error) {
			onNotify(
				`提交失败：${error instanceof Error ? error.message : String(error)}`,
				"error",
			);
			return false;
		} finally {
			saving = false;
		}
	}

	function openCreate() {
		editingIndex = -1;
		form = { ...EMPTY_FORM };
		showForm = true;
	}

	function openEdit(index: number) {
		const album = albums[index];
		if (!album) return;
		editingIndex = index;
		form = {
			id: String(album.id ?? ""),
			name: String(album.name ?? ""),
			description: String(album.description ?? ""),
			location: String(album.location ?? ""),
			date: String(album.date ?? ""),
			tags: Array.isArray(album.tags) ? album.tags.join(", ") : "",
			password: String(album.password ?? ""),
			passwordHint: String(album.passwordHint ?? ""),
		};
		showForm = true;
	}

	async function saveAlbum() {
		const id = form.id.trim();
		if (!id) {
			onNotify("相册 id 不能为空（用作目录名和 URL 路径）", "error");
			return;
		}
		if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
			onNotify("相册 id 只能包含字母、数字、横杠和下划线", "error");
			return;
		}
		const duplicated = albums.some(
			(album, index) => String(album.id ?? "") === id && index !== editingIndex,
		);
		if (duplicated) {
			onNotify(`相册 id「${id}」已存在`, "error");
			return;
		}
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const album: Record<string, any> = {
			id,
			name: form.name.trim() || id,
			description: form.description.trim(),
			location: form.location.trim(),
			date: form.date.trim(),
			tags: form.tags
				.split(/[,，]/)
				.map((tag) => tag.trim())
				.filter(Boolean),
		};
		if (form.password.trim()) {
			album.password = form.password.trim();
			if (form.passwordHint.trim()) album.passwordHint = form.passwordHint.trim();
		}
		const next = [...albums];
		const isNew = editingIndex < 0;
		if (isNew) next.push(album);
		else next[editingIndex] = album;
		galleryValue = { ...galleryValue, albums: next };
		showForm = false;
		await commitConfig(
			isNew ? `feat(gallery): 新增相册 ${id}` : `chore(gallery): 更新相册 ${id}`,
		);
	}

	async function removeAlbum(index: number) {
		const album = albums[index];
		if (!album) return;
		const id = String(album.id ?? "");
		if (
			!confirm(
				`确定删除相册「${album.name ?? id}」吗？\n只删除相册配置，public/gallery/${id}/ 里的图片文件不会被删除。`,
			)
		) {
			return;
		}
		const next = albums.filter((_, i) => i !== index);
		galleryValue = { ...galleryValue, albums: next };
		if (manageAlbumId === id) {
			manageAlbumId = "";
			images = [];
		}
		await commitConfig(`chore(gallery): 删除相册 ${id}`);
	}

	// ── 图片管理 ──
	async function loadImages(albumId: string) {
		if (!github) {
			onNotify("请先在「设置 → GitHub 发布」里配置仓库与 Token", "error");
			return;
		}
		manageAlbumId = albumId;
		loadingImages = true;
		imageMessage = "";
		images = [];
		const result = await listRepoDir(github, `public/gallery/${albumId}`);
		loadingImages = false;
		if (!result.ok || !result.data) {
			imageMessage = `${result.message}（目录不存在时，上传第一张图片会自动创建）`;
			return;
		}
		images = result.data.filter((entry) => entry.type === "file");
		if (images.length === 0) imageMessage = "目录为空，上传第一张图片吧";
	}

	async function onPickFiles(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		const files = Array.from(input.files ?? []);
		input.value = "";
		if (files.length === 0 || !github) return;
		uploading = true;
		const failed: string[] = [];
		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			uploadProgress = `正在上传（${i + 1}/${files.length}）：${file.name}`;
			const bytes = new Uint8Array(await file.arrayBuffer());
			const result = await commitRepoBinaryFile(
				github,
				`public/gallery/${manageAlbumId}/${file.name}`,
				bytes,
				`chore(gallery): 上传相册图片 ${file.name}`,
			);
			if (!result.ok) failed.push(`${file.name}：${result.message}`);
		}
		uploading = false;
		uploadProgress = "";
		imageMessage =
			failed.length === 0
				? `已上传 ${files.length} 张图片，等待构建后生效`
				: `部分上传失败：${failed.join("；")}`;
		await loadImages(manageAlbumId);
	}

	async function removeImage(image: RepoDirEntry) {
		if (deletingName || !github) return;
		if (!confirm(`确定删除图片「${image.name}」吗？会直接提交到 GitHub。`)) return;
		deletingName = image.name;
		const result = await deleteRepoFile(
			github,
			image.path,
			image.sha,
			`chore(gallery): 删除相册图片 ${image.name}`,
		);
		deletingName = "";
		imageMessage = result.ok
			? `已删除 ${image.name}，等待构建后生效`
			: `删除失败：${result.message}`;
		await loadImages(manageAlbumId);
	}

	function formatSize(size: number): string {
		if (size >= 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
		return `${Math.max(1, Math.round(size / 1024))} KB`;
	}

	$effect(() => {
		load();
	});
</script>

<div class="admin-stack">
	<!-- 工具条 -->
	<div class="flex flex-wrap items-center justify-between gap-2">
		<div class="text-sm text-(--btn-content) opacity-70">
			相册配置与图片改动会直接提交仓库并触发重新构建（约 3-5 分钟生效）
		</div>
		<button
			type="button"
			class="admin-btn admin-btn--primary admin-btn--sm"
			disabled={saving || loading}
			onclick={openCreate}
		>
			<AdminIcon name="plus" class="h-3.5 w-3.5" />
			新增相册
		</button>
	</div>

	{#if loading}
		<div class="admin-card admin-card--bordered p-4">
			<span class="admin-field__hint">正在加载相册配置…</span>
		</div>
	{:else if !githubReady}
		<div class="admin-card admin-card--bordered p-4">
			<span class="admin-field__hint">
				未配置 GitHub 仓库或访问令牌，请先在「设置 → GitHub 发布」里完成配置。
			</span>
		</div>
	{:else if albums.length === 0 && !showForm}
		<div class="admin-card admin-card--bordered p-4">
			<span class="admin-field__hint">还没有相册，点右上角「新增相册」创建第一个。</span>
		</div>
	{:else}
		<!-- 相册列表 -->
		<div class="admin-list">
			{#each albums as album, index (index)}
				{@const albumId = String(album.id ?? "")}
				<div class="admin-list__item">
					<div class="admin-list__bar">
						<span class="admin-list__index">#{index + 1}</span>
						<div class="min-w-0 flex-1">
							<div class="flex flex-wrap items-center gap-2">
								<span class="font-bold">{String(album.name ?? albumId)}</span>
								<code class="admin-field__preview">{albumId}</code>
								{#if album.password}
									<span class="admin-badge">🔒 加密</span>
								{/if}
							</div>
							<div class="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-(--btn-content) opacity-70">
								{#if album.date}<span>{String(album.date)}</span>{/if}
								{#if album.location}<span>{String(album.location)}</span>{/if}
								{#each (Array.isArray(album.tags) ? album.tags : []) as tag (tag)}
									<span># {String(tag)}</span>
								{/each}
							</div>
						</div>
						<div class="admin-list__actions">
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								onclick={() =>
									manageAlbumId === albumId
										? ((manageAlbumId = ""), (images = []))
										: loadImages(albumId)}
							>
								<AdminIcon name="image" class="h-3.5 w-3.5" />
								{manageAlbumId === albumId ? "收起图片" : "管理图片"}
							</button>
							<button
								type="button"
								class="admin-btn admin-btn--ghost admin-btn--sm"
								disabled={saving}
								onclick={() => openEdit(index)}
							>
								<AdminIcon name="edit" class="h-3.5 w-3.5" />
								编辑
							</button>
							<button
								type="button"
								class="admin-btn admin-btn--danger admin-btn--sm"
								disabled={saving}
								onclick={() => removeAlbum(index)}
							>
								<AdminIcon name="trash" class="h-3.5 w-3.5" />
								删除
							</button>
						</div>
					</div>

					{#if manageAlbumId === albumId}
						<div class="admin-field__nested">
							<div class="admin-field__row">
								<button
									type="button"
									class="admin-btn admin-btn--regular admin-btn--sm"
									disabled={uploading || loadingImages}
									onclick={() => imageInput?.click()}
								>
									<AdminIcon name="plus" class="h-3.5 w-3.5" />
									{uploading ? "上传中…" : "上传图片（可多选）"}
								</button>
								<button
									type="button"
									class="admin-btn admin-btn--ghost admin-btn--sm"
									disabled={loadingImages || uploading}
									onclick={() => loadImages(albumId)}
								>
									<AdminIcon name="refresh" class="h-3.5 w-3.5" />
									刷新
								</button>
								<input
									bind:this={imageInput}
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
							{#if loadingImages}
								<span class="admin-field__hint">正在读取图片列表…</span>
							{/if}
							{#if imageMessage}
								<span class="admin-field__hint">{imageMessage}</span>
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
												<span class="admin-gallery-item__size">{formatSize(image.size)}</span>
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
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}

	{#if saving}
		<div class="admin-card admin-card--bordered p-4">
			<span class="admin-field__hint">正在提交相册配置到 GitHub…</span>
		</div>
	{/if}

	<!-- 新增/编辑表单 -->
	{#if showForm}
		<div class="admin-card admin-card--bordered p-4">
			<div class="admin-section__title">
				<AdminIcon name="edit" class="h-4 w-4" />
				<span>{editingIndex >= 0 ? "编辑相册" : "新增相册"}</span>
			</div>
			<div class="admin-grid-2">
				<label class="admin-field__stack">
					<span class="admin-field__label">相册 id（必填）</span>
					<input
						class="admin-input"
						type="text"
						placeholder="例如 travel-2026"
						bind:value={form.id}
					/>
					<span class="admin-field__hint">
						唯一标识，对应 public/gallery/ 下的子目录名，创建后不建议修改
					</span>
				</label>
				<label class="admin-field__stack">
					<span class="admin-field__label">相册名称</span>
					<input class="admin-input" type="text" bind:value={form.name} />
				</label>
				<label class="admin-field__stack">
					<span class="admin-field__label">拍摄地点</span>
					<input class="admin-input" type="text" bind:value={form.location} />
				</label>
				<label class="admin-field__stack">
					<span class="admin-field__label">日期</span>
					<input class="admin-input" type="date" bind:value={form.date} />
				</label>
				<label class="admin-field__stack">
					<span class="admin-field__label">标签（用逗号分隔）</span>
					<input
						class="admin-input"
						type="text"
						placeholder="风景, 旅行"
						bind:value={form.tags}
					/>
				</label>
				<label class="admin-field__stack">
					<span class="admin-field__label">访问密码（可选）</span>
					<input class="admin-input" type="text" bind:value={form.password} />
					<span class="admin-field__hint">设置后需输入密码才能查看相册</span>
				</label>
				<label class="admin-field__stack">
					<span class="admin-field__label">密码提示（可选）</span>
					<input class="admin-input" type="text" bind:value={form.passwordHint} />
				</label>
			</div>
			<label class="admin-field__stack">
				<span class="admin-field__label">相册描述</span>
				<textarea class="admin-textarea" rows="3" bind:value={form.description}></textarea>
			</label>
			<div class="admin-field__row">
				<button
					type="button"
					class="admin-btn admin-btn--primary admin-btn--sm"
					disabled={saving}
					onclick={saveAlbum}
				>
					<AdminIcon name="check" class="h-3.5 w-3.5" />
					保存并提交
				</button>
				<button
					type="button"
					class="admin-btn admin-btn--ghost admin-btn--sm"
					disabled={saving}
					onclick={() => (showForm = false)}
				>
					取消
				</button>
			</div>
		</div>
	{/if}
</div>
