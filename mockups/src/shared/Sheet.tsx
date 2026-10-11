import { Drawer } from '@base-ui/react/drawer'
import type { ReactNode } from 'react'
import { useFrame } from './frame'

/**
 * Bottom sheet on Base UI's Drawer: swipe-down or Escape to dismiss, focus is
 * trapped, and it uses the iOS sheet curve. Designs style the panel through
 * `panelClassName`; motion and behavior stay identical across designs.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  hideTitle = false,
  children,
  panelClassName = '',
  handleClassName = 'bg-current opacity-25',
  backdropOpacity = 0.45,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  hideTitle?: boolean
  children: ReactNode
  panelClassName?: string
  handleClassName?: string
  backdropOpacity?: number
}) {
  const frame = useFrame()
  return (
    <Drawer.Root open={open} onOpenChange={(o) => onOpenChange(o)}>
      <Drawer.Portal container={frame}>
        <Drawer.Backdrop
          style={{ ['--backdrop-opacity' as string]: backdropOpacity }}
          className="fixed inset-0 z-40 bg-black opacity-[calc(var(--backdrop-opacity)*(1-var(--drawer-swipe-progress)))] transition-opacity duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:duration-0 data-starting-style:opacity-0 data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]"
        />
        <Drawer.Viewport className="fixed inset-0 z-50 flex items-end justify-center">
          <Drawer.Popup
            className={`relative flex max-h-[88%] w-full flex-col outline-none [transform:translateY(var(--drawer-swipe-movement-y))] transition-transform duration-[450ms] ease-[cubic-bezier(0.32,0.72,0,1)] data-swiping:select-none data-starting-style:[transform:translateY(100%)] data-ending-style:[transform:translateY(100%)] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] ${panelClassName}`}
          >
            <div aria-hidden className="flex shrink-0 justify-center pt-2 pb-1">
              <span className={`h-1.5 w-10 rounded-full ${handleClassName}`} />
            </div>
            <Drawer.Content className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(var(--sab)+20px)]">
              <Drawer.Title className={hideTitle ? 'sr-only' : ''}>{title}</Drawer.Title>
              {description ? <Drawer.Description className="sr-only">{description}</Drawer.Description> : null}
              {children}
            </Drawer.Content>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}

export const SheetClose = Drawer.Close
