<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { loginWithGoogleCredential } from '@/services/auth'

const router = useRouter()
const googleButton = ref<HTMLElement | null>(null)
const errorMessage = ref('')
const isLoading = ref(false)

function loadGoogleScript() {
  return new Promise<void>((resolve, reject) => {
    if (window.google) {
      resolve()
      return
    }

    const existingScript = document.querySelector<HTMLScriptElement>('#google-identity-script')

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Google Sign-In')), {
        once: true,
      })
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
      class="w-full max-w-[390px] rounded-[30px] bg-[#872c26] px-11 pb-12 pt-5 text-white shadow-[0_10px_22px_rgba(0,0,0,0.34)] sm:px-12"
    >
      <div class="flex flex-col items-center">
        <img
          src="@/assets/logomfu.png"
          alt="Mae Fah Luang University logo"
          class="h-[150px] w-auto object-contain"
        />
        <h1 class="pb-5 text-center text-[21px] font-semibold tracking-tight">
          ACADEMIC TRACKING
        </h1>
        <p class="text-xs text-white/60 pb-1">Sign in to your account</p>
      </div>

      <div class="flex min-h-11 justify-center">
        <div ref="googleButton" :class="{ 'pointer-events-none opacity-60': isLoading }"></div>
      </div>

      <div v-if="isLoading" class="mt-3 flex items-center justify-center gap-2 text-sm text-white/80">
        <span
          aria-hidden="true"
          class="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
        ></span>
        <span>Signing in...</span>
      </div>
      <p v-if="errorMessage" role="alert" class="mt-3 text-center text-sm text-red-100">
        {{ errorMessage }}
      </p>
      <p class="mt-4 text-center text-xs text-white/60">
        Use your MFU Lamduan Mail account to sign in
      </p>
    </section>
  </div>
</template>
