import { useCallback, useRef, useState, useEffect } from 'react'

interface SplitViewProps {
  direction: 'horizontal' | 'vertical'
  ratio: number
  onRatioChange: (ratio: number) => void
  first: React.ReactNode
  second: React.ReactNode
}

export function SplitView({ direction, ratio, onRatioChange, first, second }: SplitViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)

  const isHorizontal = direction === 'horizontal'

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      setDragging(true)

      const container = containerRef.current
      if (!container) return

      const onMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect()
        const newRatio = isHorizontal
          ? Math.min(0.85, Math.max(0.15, (e.clientX - rect.left) / rect.width))
          : Math.min(0.85, Math.max(0.15, (e.clientY - rect.top) / rect.height))
        onRatioChange(newRatio)
      }

      const onMouseUp = () => {
        setDragging(false)
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)
    },
    [onRatioChange, isHorizontal]
  )

  useEffect(() => {
    if (dragging) {
      document.body.style.userSelect = 'none'
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize'
    } else {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [dragging, isHorizontal])

  const firstSize = `${ratio * 100}%`
  const secondSize = `${(1 - ratio) * 100}%`

  return (
    <div
      ref={containerRef}
      className={`flex h-full ${isHorizontal ? 'flex-row' : 'flex-col'}`}
    >
      <div
        style={{ [isHorizontal ? 'width' : 'height']: firstSize }}
        className="min-h-0 min-w-0 overflow-hidden"
      >
        {first}
      </div>

      {/* Gutter */}
      <div
        onMouseDown={handleMouseDown}
        className={`group relative shrink-0 transition-all duration-150 ${
          isHorizontal ? 'w-[5px] cursor-col-resize' : 'h-[5px] cursor-row-resize'
        }`}
      >
        {/* Center line */}
        <div
          className={`absolute transition-all duration-150 ${
            isHorizontal
              ? 'left-[2px] top-0 bottom-0 w-px'
              : 'top-[2px] left-0 right-0 h-px'
          } ${dragging ? 'bg-accent' : 'bg-border group-hover:bg-border-bright'}`}
        />
      </div>

      <div
        style={{ [isHorizontal ? 'width' : 'height']: secondSize }}
        className="min-h-0 min-w-0 overflow-hidden"
      >
        {second}
      </div>
    </div>
  )
}
