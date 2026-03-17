import { useBrowser } from '~/hooks/use-browser'
import { AddressBar } from './address-bar'

interface BrowserViewProps {
  projectId: string
  url: string
  visible: boolean
  onUrlChange?: (url: string) => void
}

export function BrowserView({ projectId, url, visible, onUrlChange }: BrowserViewProps) {
  const {
    placeholderRef,
    navInfo,
    navigate,
    goBack,
    goForward,
    reload,
    toggleDevTools,
    openInChrome
  } = useBrowser({ projectId, initialUrl: url, visible })

  const handleNavigate = (newUrl: string) => {
    navigate(newUrl)
    onUrlChange?.(newUrl)
  }

  return (
    <div className="flex h-full flex-col">
      <AddressBar
        url={navInfo.url}
        canGoBack={navInfo.canGoBack}
        canGoForward={navInfo.canGoForward}
        onNavigate={handleNavigate}
        onBack={goBack}
        onForward={goForward}
        onReload={reload}
        onToggleDevTools={toggleDevTools}
        onOpenInChrome={openInChrome}
      />
      {/* Placeholder that maps to WebContentsView bounds */}
      <div ref={placeholderRef} className="flex-1 bg-white" />
    </div>
  )
}
