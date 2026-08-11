import { onBeforeUnmount, onMounted } from 'vue'

interface AutoRefreshOptions {
  interval?: number
  canRefresh?: () => boolean
}

export function useAutoRefresh(
  refresh: () => void | Promise<unknown>,
  { interval = 15_000, canRefresh = () => true }: AutoRefreshOptions = {},
) {
  let timer: ReturnType<typeof window.setInterval> | undefined
  let isRefreshing = false

  async function refreshWhenVisible() {
    if (document.visibilityState !== 'visible' || !canRefresh() || isRefreshing) return
    isRefreshing = true
    try {
      await refresh()
    } finally {
      isRefreshing = false
    }
  }

  function handleVisibilityChange() {
    if (document.visibilityState === 'visible') void refreshWhenVisible()
  }

  onMounted(() => {
    timer = window.setInterval(() => void refreshWhenVisible(), interval)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', handleVisibilityChange)
  })

  onBeforeUnmount(() => {
    if (timer) window.clearInterval(timer)
    window.removeEventListener('focus', refreshWhenVisible)
    document.removeEventListener('visibilitychange', handleVisibilityChange)
  })
}
