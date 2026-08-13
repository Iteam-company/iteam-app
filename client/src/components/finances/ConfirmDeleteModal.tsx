import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '#/components/ui/dialog'

/** Shared confirm for deleting a box or a whole month. */
export function ConfirmDeleteModal({
  title,
  message,
  isPending,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  isPending: boolean
  onConfirm: () => Promise<unknown>
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async () => {
    setError(null)
    try {
      await onConfirm()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.error'))
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('dashboard.finances.cancel')}
          </Button>
          <Button variant="destructive" className="gap-2" onClick={handleConfirm} disabled={isPending}>
            {isPending && <Loader2 className="size-4 animate-spin" />}
            {t('dashboard.finances.delete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
