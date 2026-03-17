import { useEffect, useRef, useCallback, useState } from 'react'
import { api } from '~/lib/ipc'
import { useUIStore } from '~/stores/ui-store'

interface BrowserNavInfo {
  url: string
  title: string
  canGoBack: boolean
  canGoForward: boolean
}

interface UseBrowserOptions {
  projectId: string
  initialUrl: string
  visible: boolean
}

export function useBrowser({ projectId, initialUrl, visible }: UseBrowserOptions) {
  const placeholderRef = useRef<HTMLDivElement>(null)
  const createdRef = useRef(false)
  const [navInfo, setNavInfo] = useState<BrowserNavInfo>({
    url: initialUrl || '',
    title: '',
    canGoBack: false,
    canGoForward: false
  })

  // Browser views are native OS overlays that render above all HTML content,
  // so they must be hidden whenever any modal overlay (command palette, etc.) is open.
  const anyOverlayOpen = useUIStore(
    (s) => s.commandPaletteOpen || s.projectSwitcherOpen || s.projectSettingsId !== null
  )

  const shouldShow = visible && !anyOverlayOpen

  // Create / show / hide browser view
  useEffect(() => {
    if (!visible) {
      api.hideBrowser(projectId)
      return
    }

    if (!createdRef.current) {
      createdRef.current = true
      api.createBrowser(projectId, initialUrl || undefined).then(() => {
        api.setupBrowserNavListener(projectId)
        if (shouldShow) api.showBrowser(projectId)
      })
    } else {
      if (shouldShow) {
        api.showBrowser(projectId)
      } else {
        api.hideBrowser(projectId)
      }
    }

    return () => {
      api.hideBrowser(projectId)
    }
  }, [projectId, visible, initialUrl, shouldShow])

  // Listen for navigation updates
  useEffect(() => {
    const remove = api.onBrowserNavigated((id, info) => {
      if (id === projectId) {
        setNavInfo(info)
      }
    })
    return remove
  }, [projectId])

  // Bounds synchronization
  useEffect(() => {
    if (!shouldShow) return

    const updateBounds = () => {
      const el = placeholderRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      api.setBrowserBounds(projectId, {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      })
    }

    // Initial bounds
    requestAnimationFrame(updateBounds)

    const observer = new ResizeObserver(updateBounds)
    if (placeholderRef.current) observer.observe(placeholderRef.current)

    // Also update on window resize
    window.addEventListener('resize', updateBounds)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateBounds)
    }
  }, [projectId, shouldShow])

  const navigate = useCallback(
    (url: string) => {
      api.navigateBrowser(projectId, url)
      setNavInfo((prev) => ({ ...prev, url }))
    },
    [projectId]
  )

  const goBack = useCallback(() => api.browserBack(projectId), [projectId])
  const goForward = useCallback(() => api.browserForward(projectId), [projectId])
  const reload = useCallback(() => api.browserReload(projectId), [projectId])
  const toggleDevTools = useCallback(() => api.browserToggleDevTools(projectId), [projectId])
  const openInChrome = useCallback(() => api.browserOpenInChrome(projectId), [projectId])

  return {
    placeholderRef,
    navInfo,
    navigate,
    goBack,
    goForward,
    reload,
    toggleDevTools,
    openInChrome
  }
}
