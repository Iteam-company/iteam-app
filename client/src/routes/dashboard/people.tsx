import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FileText, CreditCard, QrCode, Send } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'

export const Route = createFileRoute('/dashboard/people')({ component: PeoplePage, ssr: false })

// ── Mock data ──────────────────────────────────────────────────────────────────

const WORKERS = [
  {
    id: 1, name: 'Олена Ковальчук', role: 'HR-спеціаліст', email: 'olena@company.ua',
    fop: 'ФОП Група 3', iban: 'UA12 3456 7890 1234 5678 9012 3456', salary: 42000,
    bonus: 5000, deduction: 2100, contracts: [
      { name: 'Договір №1 від 01.01.2025', signed: true },
      { name: 'NDA від 01.01.2025', signed: true },
    ],
  },
  {
    id: 2, name: 'Іван Мельник', role: 'Розробник', email: 'ivan@company.ua',
    fop: 'ФОП Група 2', iban: 'UA98 7654 3210 9876 5432 1098 7654', salary: 95000,
    bonus: 12000, deduction: 4750, contracts: [
      { name: 'Договір №2 від 15.01.2025', signed: true },
      { name: 'Акт надання послуг №4', signed: false },
    ],
  },
  {
    id: 3, name: 'Марія Шевченко', role: 'Дизайнер', email: 'maria@company.ua',
    fop: 'ФОП Група 3', iban: 'UA55 1122 3344 5566 7788 9900 1122', salary: 55000,
    bonus: 6000, deduction: 2750, contracts: [
      { name: 'Договір №3 від 10.02.2025', signed: true },
    ],
  },
]

type Worker = typeof WORKERS[number]

function WorkerCard({ worker, onSelect, selected }: { worker: Worker; onSelect: () => void; selected: boolean }) {
  const total = worker.salary + worker.bonus - worker.deduction
  return (
    <Card
      className={`cursor-pointer transition-all ${selected ? 'border-primary ring-1 ring-primary' : 'hover:border-muted-foreground/30'}`}
      onClick={onSelect}
    >
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold">
            {worker.name[0]}
          </div>
          <div>
            <p className="text-sm font-medium">{worker.name}</p>
            <p className="text-xs text-muted-foreground">{worker.role}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">₴{total.toLocaleString('uk-UA')}</p>
          <p className="text-xs text-muted-foreground">{worker.fop}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function WorkerDossier({ worker }: { worker: Worker }) {
  const { t } = useTranslation()
  const net = worker.salary + worker.bonus - worker.deduction

  return (
    <Card className="flex-1">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-lg font-bold">
            {worker.name[0]}
          </div>
          <div>
            <CardTitle>{worker.name}</CardTitle>
            <CardDescription>{worker.role} · {worker.email}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="legal">
          <TabsList className="mb-4">
            <TabsTrigger value="legal">
              <FileText className="mr-1.5 size-3.5" />
              {t('dashboard.people.legal')}
            </TabsTrigger>
            <TabsTrigger value="financial">
              <CreditCard className="mr-1.5 size-3.5" />
              {t('dashboard.people.financial')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="legal" className="flex flex-col gap-3">
            {worker.contracts.map((c, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="text-sm">{c.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={c.signed ? 'default' : 'secondary'}>
                    {c.signed ? t('dashboard.people.signed') : t('dashboard.people.pending')}
                  </Badge>
                  {!c.signed && (
                    <Button size="sm" variant="outline" className="h-7 text-xs">
                      <Send className="mr-1 size-3" />
                      Diia
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </TabsContent>

          <TabsContent value="financial" className="flex flex-col gap-4">
            <div className="rounded-lg border border-border p-3 text-sm">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">{t('dashboard.people.base')}</span>
                <span className="font-medium">₴{worker.salary.toLocaleString('uk-UA')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">{t('dashboard.people.bonus')}</span>
                <span className="font-medium text-primary">+₴{worker.bonus.toLocaleString('uk-UA')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">{t('dashboard.people.deduction')}</span>
                <span className="font-medium text-destructive">-₴{worker.deduction.toLocaleString('uk-UA')}</span>
              </div>
              <div className="mt-2 flex justify-between border-t border-border pt-2">
                <span className="font-semibold">{t('dashboard.people.net')}</span>
                <span className="font-bold">₴{net.toLocaleString('uk-UA')}</span>
              </div>
            </div>

            <div className="rounded-lg border border-border p-3 text-sm">
              <p className="text-xs text-muted-foreground mb-1">{t('dashboard.people.taxGroup')}</p>
              <p className="font-medium">{worker.fop}</p>
              <p className="text-xs text-muted-foreground mt-2 mb-1">IBAN</p>
              <p className="font-mono text-xs">{worker.iban}</p>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1 gap-2">
                <QrCode className="size-4" />
                {t('dashboard.people.qrPay')}
              </Button>
              <Button variant="outline" className="flex-1 gap-2">
                <FileText className="size-4" />
                {t('dashboard.people.autoAkt')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

function PeoplePage() {
  const { t } = useTranslation()
  const [selected, setSelected] = useState<number>(1)
  const worker = WORKERS.find((w) => w.id === selected)!

  return (
    <main className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('dashboard.people.title')}</h2>
        <Badge variant="outline">{WORKERS.length} {t('dashboard.people.workers')}</Badge>
      </div>

      <div className="flex gap-6">
        {/* Worker list */}
        <div className="flex w-72 shrink-0 flex-col gap-2">
          {WORKERS.map((w) => (
            <WorkerCard key={w.id} worker={w} selected={selected === w.id} onSelect={() => setSelected(w.id)} />
          ))}
        </div>

        {/* Dossier */}
        <WorkerDossier worker={worker} />
      </div>
    </main>
  )
}
