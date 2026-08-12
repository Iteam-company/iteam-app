import { useEffect, useState } from 'react'

/**
 * Tracks the app's theme, which is a `.dark` class on <html> written by the
 * inline script in __root.tsx and by ThemeToggle.
 *
 * Third-party widgets usually offer a "system" theme that reads
 * prefers-color-scheme, which is wrong here: a user who forced light mode on a
 * dark OS would get a dark widget inside a light app. Watch the class instead.
 */
export function useIsDark() {
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const root = document.documentElement
    const update = () => setIsDark(root.classList.contains('dark'))
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}
