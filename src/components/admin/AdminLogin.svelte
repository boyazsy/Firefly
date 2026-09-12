<script lang="ts">
/**
 * 后台登录卡片 - 输入密码后本地计算哈希比对，不向任何服务器发送密码
 */
import {
	createSession,
	formatDuration,
	getLockState,
	registerFailedAttempt,
	resetAttempts,
	verifyPassword,
} from "@/utils/admin-auth";
import AdminIcon from "./AdminIcon.svelte";

interface Props {
	onSuccess: () => void;
}

const { onSuccess }: Props = $props();

let password = $state("");
let error = $state("");
let loading = $state(false);
let hint = $state("");
let lockRemainMs = $state(0);
let shake = $state(false);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

// 进入页面时先看是否处于锁定状态
$effect(() => {
	const state = getLockState();
	if (state.locked) {
		lockRemainMs = state.remainMs;
		startCountdown();
	}
	return () => {
		if (countdownTimer) clearInterval(countdownTimer);
	};
});

function startCountdown() {
	if (countdownTimer) clearInterval(countdownTimer);
	countdownTimer = setInterval(() => {
		lockRemainMs = Math.max(0, lockRemainMs - 1000);
		if (lockRemainMs <= 0 && countdownTimer) {
			clearInterval(countdownTimer);
			countdownTimer = null;
			error = "";
		}
	}, 1000);
}

function triggerShake() {
	shake = false;
	requestAnimationFrame(() => {
		shake = true;
		setTimeout(() => (shake = false), 450);
	});
}

async function submit() {
	if (loading || lockRemainMs > 0) return;
	if (!password) {
		error = "请输入管理密码";
		triggerShake();
		return;
	}
	loading = true;
	error = "";
	hint = "";
	try {
		const ok = await verifyPassword(password);
		if (ok) {
			resetAttempts();
			await createSession(password);
			password = "";
			onSuccess();
		} else {
			const result = registerFailedAttempt();
			if (result.locked) {
				lockRemainMs = result.remainMs;
				startCountdown();
				error = "";
			} else {
				error = `密码错误，还可尝试 ${result.remainAttempts} 次`;
				triggerShake();
			}
			password = "";
		}
	} catch (e) {
		error = e instanceof Error ? e.message : "登录失败，请稍后再试";
	} finally {
		loading = false;
	}
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === "Enter") submit();
}
</script>

<div class="admin-shell flex items-center justify-center py-6">
	<div
		class="admin-card admin-card--bordered w-full max-w-md overflow-hidden {shake
			? 'admin-shake'
			: ''}"
	>
		<div class="px-6 pt-8 pb-2 text-center">
			<div
				class="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-(--primary) text-white"
			>
				<AdminIcon name="lock" class="h-7 w-7" />
			</div>
			<h2 class="text-xl font-bold">管理后台</h2>
			<p class="mt-1.5 text-sm text-(--btn-content) opacity-80">
				请输入管理密码以继续
			</p>
		</div>

		<div class="px-6 pb-7 pt-4">
			{#if lockRemainMs > 0}
				<div class="admin-alert admin-alert--warn mb-4">
					<AdminIcon name="clock" class="mt-0.5 h-4 w-4 flex-none" />
					<span
						>尝试次数过多，已临时锁定，请 {formatDuration(lockRemainMs)} 后再试</span
					>
				</div>
			{/if}

			<label class="admin-label" for="admin-password">管理密码</label>
			<input
				id="admin-password"
				class="admin-input"
				type="password"
				autocomplete="current-password"
				placeholder="请输入密码"
				bind:value={password}
				onkeydown={onKeydown}
				disabled={loading || lockRemainMs > 0}
			/>

			{#if error}
				<div class="admin-alert admin-alert--error mt-3">
					<AdminIcon name="alert" class="mt-0.5 h-4 w-4 flex-none" />
					<span>{error}</span>
				</div>
			{/if}

			<button
				class="admin-btn admin-btn--primary admin-btn--block mt-5"
				onclick={submit}
				disabled={loading || lockRemainMs > 0}
			>
				{#if loading}
					<AdminIcon name="spinner" class="h-4 w-4" />
					校验中…
				{:else}
					<AdminIcon name="key" class="h-4 w-4" />
					进入后台
				{/if}
			</button>

			<p class="mt-4 text-center text-xs leading-relaxed text-(--btn-content) opacity-70">
				密码在 src/config/adminConfig.ts 中设置<br />
				修改命令：<code class="rounded bg-(--btn-regular-bg) px-1 py-0.5">pnpm
					admin:passwd 新密码</code>
			</p>
		</div>
	</div>
</div>
