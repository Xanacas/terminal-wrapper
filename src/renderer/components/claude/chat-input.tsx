import { useState, useRef, useCallback, useEffect } from 'react'

interface ImageAttachment {
  id: string
  base64: string
  mediaType: string
  preview: string
}

interface ChatInputProps {
  onSend: (text: string, images?: Array<{ base64: string; mediaType: string }>) => void
  onInterrupt: () => void
  isStreaming: boolean
  disabled?: boolean
}

export function ChatInput({ onSend, onInterrupt, isStreaming, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const [images, setImages] = useState<ImageAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const resize = useCallback(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const maxHeight = 6 * 20 // ~6 lines
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`
  }, [])

  useEffect(() => {
    resize()
  }, [value, resize])

  const addImagesFromFiles = useCallback((files: globalThis.FileList | globalThis.File[]) => {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue
      const reader = new globalThis.FileReader()
      reader.onload = () => {
        const dataUrl = reader.result as string
        const base64 = dataUrl.split(',')[1]!
        setImages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            base64,
            mediaType: file.type,
            preview: dataUrl,
          },
        ])
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items
      const imageFiles: globalThis.File[] = []
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) imageFiles.push(file)
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault()
        addImagesFromFiles(imageFiles)
      }
    },
    [addImagesFromFiles]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        addImagesFromFiles(e.target.files)
        e.target.value = ''
      }
    },
    [addImagesFromFiles]
  )

  const removeImage = useCallback((id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id))
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.dataTransfer.files.length > 0) {
        addImagesFromFiles(e.dataTransfer.files)
      }
    },
    [addImagesFromFiles]
  )

  const handleSend = useCallback(() => {
    const trimmed = value.trim()
    if ((!trimmed && images.length === 0) || disabled) return
    const imgPayload = images.length > 0
      ? images.map(({ base64, mediaType }) => ({ base64, mediaType }))
      : undefined
    onSend(trimmed || '(image)', imgPayload)
    setValue('')
    setImages([])
    requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    })
  }, [value, images, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const canSend = (value.trim().length > 0 || images.length > 0) && !disabled
  const showSend = canSend || !isStreaming
  const showStop = isStreaming

  return (
    <div
      className="shrink-0 border-t border-border/60 bg-bg p-3"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Image thumbnails */}
      {images.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {images.map((img) => (
            <div key={img.id} className="group relative">
              <img
                src={img.preview}
                alt="Attached"
                className="h-12 w-12 rounded-md border border-border/60 object-cover"
              />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-bg-tertiary text-text-dim opacity-0 shadow-sm transition-opacity hover:text-danger group-hover:opacity-100"
              >
                <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 1.5l5 5M6.5 1.5l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 rounded-lg bg-bg-tertiary p-1.5 ring-1 ring-border/50 transition-all duration-150 focus-within:ring-accent/40">
        {/* Upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-text-dim transition-all duration-150 hover:bg-bg-hover hover:text-text-secondary disabled:opacity-30"
          title="Attach image"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Send a message..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent px-2 py-1.5 text-[12.5px] leading-[1.5] text-text placeholder-text-dim/60 outline-none disabled:opacity-40"
        />

        <div className="flex shrink-0 items-center gap-1">
          {showSend && (
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-accent transition-all duration-150 hover:bg-accent-hover disabled:bg-text-dim/20 disabled:cursor-default"
              title="Send"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path
                  d="M6 10V2M6 2L2.5 5.5M6 2l3.5 3.5"
                  stroke={canSend ? 'white' : 'rgba(255,255,255,0.3)'}
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {showStop && (
            <button
              onClick={onInterrupt}
              className="flex h-7 w-7 items-center justify-center rounded-md bg-danger/90 transition-all duration-150 hover:bg-danger"
              title="Interrupt"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="2" y="2" width="6" height="6" rx="1" fill="white" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
