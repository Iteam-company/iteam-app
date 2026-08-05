import { createFileRoute } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { ChevronRight, CheckCircle2, Circle, Clock } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '#/components/ui/card'

export const Route = createFileRoute('/dashboard/okr')({ component: OKRPage, ssr: false })

// ── Mock data ──────────────────────────────────────────────────────────────────

const OBJECTIVES = [
  {
    title: 'Відкрити 3 нові локації',
    progress: 45,
    keyResults: [
      {
        title: 'Найняти 10 баристів',
        progress: 60,
        tasks: [
          { title: 'Розмістити вакансії на Work.ua', assignee: 'HR', done: true },
          { title: 'Провести 20 співбесід', assignee: 'Олена К.', done: false },
          { title: 'Зробити фінальні офери', assignee: 'Олена К.', done: false },
        ],
      },
      {
        title: 'Підписати договори оренди ×3',
        progress: 30,
        tasks: [
          { title: 'Знайти локацію у Центрі (Київ)', assignee: 'Петро Б.', done: true },
          { title: 'Переговори з орендодавцем', assignee: 'Петро Б.', done: false },
        ],
      },
    ],
  },
  {
    title: 'Зростання виручки на 30%',
    progress: 72,
    keyResults: [
      {
        title: 'Запустити програму лояльності',
        progress: 85,
        tasks: [
          { title: 'Розробити механіку бонусів', assignee: 'Маркетинг', done: true },
          { title: 'Інтегрувати з POS-системою', assignee: 'Іван М.', done: true },
        ],
      },
      {
        title: 'Збільшити середній чек на 15%',
        progress: 58,
        tasks: [
          { title: 'Навчання персоналу upsell', assignee: 'HR', done: false },
          { title: 'Оновити меню', assignee: 'Операції', done: false },
        ],
      },
    ],
  },
]

const HEATMAP = [
  { name: 'Олена К.',  scores: [5, 4, 5, 3, 5] },
  { name: 'Іван М.',   scores: [3, 5, 4, 5, 4] },
  { name: 'Марія Ш.',  scores: [4, 4, 3, 4, 5] },
  { name: 'Петро Б.',  scores: [5, 3, 2, 3, 4] },
  { name: 'Наталія Я.',scores: [4, 5, 5, 4, 5] },
]

const WEEKS = ['Т1', 'Т2', 'Т3', 'Т4', 'Т5']

function heatColor(v: number) {
  if (v >= 5) return 'bg-primary'
  if (v >= 4) return 'bg-primary/60'
  if (v >= 3) return 'bg-primary/30'
  return 'bg-muted'
}

function ProgressBar({ value }: { value: number }) {
  const color = value >= 70 ? 'bg-primary' : value >= 40 ? 'bg-amber-500' : 'bg-destructive'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value}%</span>
    </div>
  )
}

function OKRPage() {
  const { t } = useTranslation()

  return (
    <main className="flex flex-col gap-6 p-6">
      {/* Goal tree */}
      <div>
        <h2 className="mb-4 text-sm font-semibold">{t('dashboard.okr.goalTree')}</h2>
        <div className="flex flex-col gap-4">
          {OBJECTIVES.map((obj, oi) => (
            <Card key={oi}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <CardTitle className="text-base">{obj.title}</CardTitle>
                  <Badge variant={obj.progress >= 70 ? 'default' : obj.progress >= 40 ? 'secondary' : 'destructive'}>
                    {obj.progress}%
                  </Badge>
                </div>
                <ProgressBar value={obj.progress} />
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                {obj.keyResults.map((kr, ki) => (
                  <div key={ki} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <ChevronRight className="size-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium">{kr.title}</span>
                    </div>
                    <div className="ml-5 mb-2">
                      <ProgressBar value={kr.progress} />
                    </div>
                    <div className="ml-5 flex flex-col gap-1">
                      {kr.tasks.map((task, ti) => (
                        <div key={ti} className="flex items-center gap-2 text-xs text-muted-foreground">
                          {task.done
                            ? <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                            : <Circle className="size-3.5 shrink-0" />}
                          <span className={task.done ? 'line-through opacity-60' : ''}>{task.title}</span>
                          <span className="ml-auto shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                            {task.assignee}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Nudge settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.okr.nudge')}</CardTitle>
          <CardDescription>{t('dashboard.okr.nudgeDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
            <Clock className="size-4 text-muted-foreground shrink-0" />
            <span>{t('dashboard.okr.nudgeExample')}</span>
            <Badge variant="outline" className="ml-auto shrink-0">{t('dashboard.okr.active')}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Completion heatmap */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('dashboard.okr.heatmap')}</CardTitle>
          <CardDescription>{t('dashboard.okr.heatmapDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 pl-24">
              {WEEKS.map((w) => (
                <span key={w} className="w-8 text-center text-xs text-muted-foreground">{w}</span>
              ))}
            </div>
            {HEATMAP.map((row) => (
              <div key={row.name} className="flex items-center gap-2">
                <span className="w-24 text-xs text-muted-foreground truncate">{row.name}</span>
                {row.scores.map((v, i) => (
                  <div key={i} className={`size-8 rounded ${heatColor(v)}`} title={`${v}/5`} />
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
