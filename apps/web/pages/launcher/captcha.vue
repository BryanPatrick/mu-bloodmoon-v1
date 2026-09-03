<template>
  <div class="grid min-h-screen place-items-center bg-black p-6">
    <div class="grid gap-3 text-center">
      <p class="text-sm font-semibold text-white/70">
        {{ statusText }}
      </p>
      <TurnstileWidget ref="widget" action="login" @token="onToken" />
    </div>
  </div>
</template>

<script setup lang="ts">
// Phase 2D Part 2/3 -- the legitimate embedded CAPTCHA challenge for the
// WPF Launcher. Reuses the exact same TurnstileWidget.vue component the
// main web login page uses (same site key, same real Cloudflare
// challenge, same server-side siteverify validation on the API side) --
// this is not a separate, weaker "Launcher-only" check. The Launcher's
// CaptchaChallengeService (apps/launcher/Services/) hosts this page in a
// WebView2 control and reads the resulting token back via
// window.chrome.webview.postMessage, WebView2's own real, documented
// JS<->native bridge -- never a hardcoded token, never a bypass.
//
// This page intentionally has NO header/footer/nav (layout: 'blank') --
// it exists only to be embedded, never linked to or visited directly by
// a player. action="login" matches auth.controller.ts's real
// @AuthAbuseProtection({ captchaAction: 'login', ... }) on POST
// /auth/login exactly -- CaptchaService.verify() rejects a token whose
// embedded Cloudflare action doesn't match the endpoint's expected one,
// so this must stay identical to login.vue's own TurnstileWidget action.
definePageMeta({ layout: 'blank' })
useSeoMeta({ title: 'Verificação de segurança' })

const widget = ref<{ reset(): void } | null>(null)
const statusText = ref('Confirme que você é uma pessoa para continuar.')

type WebView2Bridge = { postMessage(message: string): void }
const hostBridge = () => (window as typeof window & { chrome?: { webview?: WebView2Bridge } }).chrome?.webview

const onToken = (token: string) => {
  if (!token) {
    statusText.value = 'Não foi possível concluir a verificação. Tente novamente.'
    hostBridge()?.postMessage('')
    return
  }
  statusText.value = 'Verificação concluída.'
  hostBridge()?.postMessage(token)
}
</script>
