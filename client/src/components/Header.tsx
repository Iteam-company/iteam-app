import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '#/components/ui/button'
import { toggleLanguage } from '#/i18n'
import ThemeToggle from './ThemeToggle'

export default function Header() {
  const { i18n } = useTranslation()

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 px-4 backdrop-blur-lg">
      <nav className="mx-auto flex max-w-5xl items-center gap-3 py-3">
        <Link to="/" className="text-sm font-semibold text-foreground no-underline">
          Iteam
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLanguage}
            className="text-xs font-medium uppercase"
          >
            {i18n.language === 'en' ? 'UA' : 'EN'}
          </Button>
          <ThemeToggle />
        </div>
      </nav>
    </header>
  )
}
