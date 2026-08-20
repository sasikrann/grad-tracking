<script setup lang="ts">
defineOptions({ name: 'LoginView' })

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { loginForDevelopment, loginWithGoogleCredential } from '@/services/auth'

const router = useRouter()
const googleButton = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const isLoading = ref(false)
const devEmail = ref('6631501108@lamduan.mfu.ac.th')
const devLoginEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true'

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google) {
      resolve()
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>('#google-identity-script')

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener(
        'error',
        () => reject(new Error('Unable to load Google Sign-In')),
        {
          once: true,
        },
      )
      return
    }

    const script = document.createElement('script')
    script.id = 'google-identity-script'
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener('error', () => reject(new Error('Unable to load Google Sign-In')), {
      once: true,
    })
    document.head.appendChild(script)
  })
}

async function handleGoogleCredential(response: GoogleCredentialResponse) {
  errorMessage.value = ''
  isLoading.value = true

  try {
    await loginWithGoogleCredential(response.credential)
    await router.push('/')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to sign in'
  } finally {
    isLoading.value = false
  }
}

async function handleDevelopmentLogin() {
  errorMessage.value = ''
  isLoading.value = true

  try {
    await loginForDevelopment(devEmail.value)
    await router.push('/')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to sign in'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  if (!clientId || clientId.startsWith('YOUR_')) {
    if (!devLoginEnabled) errorMessage.value = 'Google SSO is not configured'
    return
  }

  try {
    await loadGoogleScript()

    if (!window.google || !googleButton.value) {
      throw new Error('Unable to initialize Google Sign-In')
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential,
      hd: 'lamduan.mfu.ac.th',
    })
    window.google.accounts.id.renderButton(googleButton.value, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'rectangular',
      width: 270,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Google Sign-In'
  }
})
</script>

<template>
  <div class="flex min-h-[100dvh] w-full items-center justify-center bg-[#fafafa] px-4 py-5">
    <section
      class="w-full max-w-[320px] rounded-2xl bg-[#872c26] px-4 pb-5 pt-3 text-white shadow-[0_8px_18px_rgba(0,0,0,0.3)] sm:max-w-[340px] sm:px-5 sm:pb-6 sm:pt-4"
    >
      <div class="flex flex-col items-center">
        <img
          src="@/assets/logomfu.png"
          alt="Mae Fah Luang University logo"
          class="h-30 w-auto object-contain sm:h-34"
        />
        <h1 class="pb-2 text-center text-base font-semibold tracking-tight sm:text-lg">
          ACADEMIC TRACKING
        </h1>
        <p class="pb-1 text-[10px] text-white/60">Sign in to your account</p>
      </div>

      <div class="mt-2 flex min-h-10 justify-center">
        <div ref="googleButton" :class="{ 'pointer-events-none opacity-60': isLoading }"></div>
      </div>

      <form
        v-if="devLoginEnabled"
        class="mx-auto mt-3 w-full max-w-[270px] border-t border-white/20 pt-3"
        @submit.prevent="handleDevelopmentLogin"
      >
        <p class="mb-1.5 text-center text-[11px] font-medium text-white/80">Development Login</p>
        <label class="sr-only" for="dev-email">Registered user email</label>
        <input
          id="dev-email"
          v-model.trim="devEmail"
          type="email"
          required
          autocomplete="email"
          placeholder="Registered user email"
          class="h-9 w-full rounded-md border border-white/30 bg-white px-3 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-white/60"
        />
        <button
          type="submit"
          :disabled="isLoading || !devEmail"
          class="mt-1.5 h-9 w-full rounded-md bg-[#650009] px-3 text-xs font-medium text-white transition hover:bg-[#530007] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue for development
        </button>
        <p class="mt-1.5 text-center text-[9px] text-white/60">
          Available only in local development
        </p>
      </form>

      <div class="mx-auto mt-2 flex min-h-7 w-full max-w-[270px] flex-col justify-end gap-1 px-1">
        <div
          v-if="isLoading"
          class="flex items-center justify-center gap-2 text-xs font-normal text-white/70"
        >
          <span
            aria-hidden="true"
            class="size-3.5 animate-spin rounded-full border-2 border-white/35 border-t-white/80"
          ></span>
          <span>Signing in...</span>
        </div>
        <p class="text-center text-[9px] font-normal leading-4 text-white/55">
          Use your MFU Lamduan Mail account to sign in
        </p>
        <p
          v-if="errorMessage"
          role="alert"
          class="text-center text-[15px] font-medium leading-5 text-white"
        >
          {{ errorMessage }}
        </p>
      </div>
    </section>
  </div>
</template>
