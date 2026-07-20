<script setup lang="ts">
defineOptions({ name: 'LoginView' })

import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { loginWithGoogleCredential } from '@/services/auth'
// import { loginForDevelopment } from '@/services/auth' // Development login bypass

const router = useRouter()
const googleButton = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const isLoading = ref(false)
// Development login bypass (disabled while Google Sign-In is in use)
// const devEmail = ref('')
// const devLoginEnabled = import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true'

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

/* DEVELOPMENT LOGIN BYPASS
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
*/

onMounted(async () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  if (!clientId || clientId.startsWith('YOUR_')) {
    errorMessage.value = 'Google SSO is not configured'
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
      width: 300,
    })
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Unable to load Google Sign-In'
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[#fafafa] px-5 py-10">
    <section
      class="w-full max-w-100 rounded-2xl bg-[#872c26] pb-12 pt-5 text-white shadow-[0_10px_22px_rgba(0,0,0,0.34)]"
    >
      <div class="flex flex-col items-center">
        <img
          src="@/assets/logomfu.png"
          alt="Mae Fah Luang University logo"
          class="h-50 w-auto object-contain"
        />
        <h1 class="pb-5 text-center text-[21px] font-semibold tracking-tight">ACADEMIC TRACKING</h1>
        <p class="text-xs text-white/60 pb-1">Sign in to your account</p>
      </div>

      <div class="flex min-h-11 justify-center">
        <div ref="googleButton" :class="{ 'pointer-events-none opacity-60': isLoading }"></div>
      </div>

      <!-- DEVELOPMENT LOGIN BYPASS
      <form
        v-if="devLoginEnabled"
        class="mx-auto mt-5 w-full max-w-75 border-t border-white/20 pt-5"
        @submit.prevent="handleDevelopmentLogin"
      >
        <p class="mb-2 text-center text-xs font-medium text-white/80">Development Login</p>
        <label class="sr-only" for="dev-email">Registered user email</label>
        <input
          id="dev-email"
          v-model.trim="devEmail"
          type="email"
          required
          autocomplete="email"
          placeholder="Registered user email"
          class="w-full rounded-md border border-white/30 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-white/60"
        />
        <button
          type="submit"
          :disabled="isLoading || !devEmail"
          class="mt-2 w-full rounded-md bg-[#650009] px-3 py-2 text-sm font-medium text-white transition hover:bg-[#530007] disabled:cursor-not-allowed disabled:opacity-60"
        >
          Continue for development
        </button>
        <p class="mt-2 text-center text-[10px] text-white/60">Available only in local development</p>
      </form>
      -->

      <div class="mx-auto mt-4 flex min-h-14 w-full max-w-75 flex-col justify-end gap-1.5 px-1">
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
        <p class="text-center text-[11px] font-normal leading-5 text-white/55">
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
