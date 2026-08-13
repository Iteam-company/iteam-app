import { Toaster as Sonner } from 'sonner'
import type { ToasterProps } from 'sonner'
import { useIsDark } from '#/hooks/use-is-dark'

/**
 * shadcn's stock sonner wrapper reads the theme from next-themes, which this
 * app does not use — the theme is a `.dark` class on <html>. useIsDark watches
 * that class, so the toasts follow the same source of truth as everything else.
 *
 * Colours come from the app's own CSS variables rather than sonner's defaults
 * so a toast looks like the rest of the UI in both themes.
 */
export function Toaster(props: ToasterProps) {
  const isDark = useIsDark()

  return (
    <Sonner
      theme={isDark ? 'dark' : 'light'}
      className="toaster group"
      position="bottom-right"
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}
