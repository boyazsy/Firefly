<script lang="ts">
/**
 * 本地草稿箱 - 保存在浏览器 localStorage，换设备不同步
 */
import type { AdminDraft } from "@/types/adminConfig";
import { formatTimestamp } from "@/utils/admin-drafts";
import AdminIcon from "./AdminIcon.svelte";

interface Props {
	drafts: AdminDraft[];
	editorUrl: string;
	onDelete: (id: string) => void;
}

const { drafts, editorUrl, onDelete }: Props = $props();
</script>

<div class="admin-card admin-card--bordered overflow-hidden">
	<div
		class="flex items-center justify-between border-b border-(--line-divider) px-5 py-3.5"
	>
		<h3 class="text-sm font-bold">本地草稿</h3>
		<span class="text-xs text-(--btn-content) opacity-70">
			{drafts.length} 份 · 仅保存在当前浏览器
		</span>
	</div>

	{#if drafts.length === 0}
		<div class="px-5 py-14 text-center">
			<div class="mb-2 flex justify-center text-(--btn-content) opacity-40">
				<AdminIcon name="save" class="h-10 w-10" />
			</div>
			<p class="text-sm text-(--btn-content) opacity-70">
				还没有草稿，在撰写页点击「保存草稿」即可留存
			</p>
		</div>
	{:else}
		<ul class="divide-y divide-(--line-divider)">
			{#each drafts as draft (draft.id)}
				<li class="flex items-center gap-3 px-5 py-3.5">
					<div class="min-w-0 flex-1">
						<div class="truncate font-medium">
							{draft.title || "未命名文章"}
						</div>
						<div
							class="mt-1 flex items-center gap-2 text-xs text-(--btn-content) opacity-70"
						>
							<span class="inline-flex items-center gap-1">
								<AdminIcon name="clock" class="h-3.5 w-3.5" />
								{formatTimestamp(draft.savedAt)}
							</span>
							<span>·</span>
							<span>{draft.body.length} 字符</span>
						</div>
					</div>
					<div class="flex flex-none items-center gap-2">
						<a
							class="admin-btn admin-btn--ghost admin-btn--sm"
							href={`${editorUrl}?draft=${encodeURIComponent(draft.id)}`}
							data-no-swup
						>
							<AdminIcon name="edit" class="h-3.5 w-3.5" />
							继续写
						</a>
						<button
							class="admin-btn admin-btn--danger admin-btn--sm"
							onclick={() => onDelete(draft.id)}
						>
							<AdminIcon name="trash" class="h-3.5 w-3.5" />
							删除
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>
