import { Bell, Mail, MessageSquare } from 'lucide-react'

// Workflows/templates are placeholder content — there's no automation-engine
// backend yet, only the real "send email" tab (see MailComposer.tsx) which
// hits the actual /company/send-message endpoint.

export type WorkflowStatus = 'active' | 'paused' | 'draft'

export const WORKFLOWS = [
  {
    id: 1,
    name: 'Нагадування щодо ЄСВ',
    trigger: 'Щомісяця, 18-го числа',
    channel: 'email',
    recipients: 3,
    status: 'active' as WorkflowStatus,
    lastRun: '18.03.2025',
    opens: 87,
  },
  {
    id: 2,
    name: 'Check-in під час тривоги',
    trigger: 'Повітряна тривога (webhook)',
    channel: 'telegram',
    recipients: 6,
    status: 'active' as WorkflowStatus,
    lastRun: '14.04.2025',
    opens: 100,
  },
  {
    id: 3,
    name: 'Щотижневий дайджест команди',
    trigger: 'Щопонеділка, 09:00',
    channel: 'email',
    recipients: 6,
    status: 'paused' as WorkflowStatus,
    lastRun: '07.04.2025',
    opens: 62,
  },
  {
    id: 4,
    name: 'Вітання нового співробітника',
    trigger: 'Новий контракт підписано',
    channel: 'email',
    recipients: 1,
    status: 'draft' as WorkflowStatus,
    lastRun: '—',
    opens: 0,
  },
]

export const TEMPLATES = [
  {
    id: 1,
    name: 'Нагадування ФОП (ЄСВ)',
    category: 'tax',
    preview: 'Шановний {{name}}, нагадуємо, що до {{date}} необхідно сплатити ЄСВ у розмірі {{amount}} грн.',
  },
  {
    id: 2,
    name: 'Оголошення для команди',
    category: 'internal',
    preview: 'Команда {{company}}, маємо важливе оголошення: {{message}}',
  },
  {
    id: 3,
    name: 'Check-in під час тривоги',
    category: 'safety',
    preview: '{{name}}, ви в безпеці? Будь ласка, підтвердіть свій статус: ✅ Так / ⚠️ Потрібна допомога',
  },
  {
    id: 4,
    name: 'Акт надання послуг',
    category: 'legal',
    preview: 'Відповідно до договору №{{contract}}, просимо підписати Акт надання послуг за {{month}}.',
  },
  {
    id: 5,
    name: 'Зарплатна квитанція',
    category: 'finance',
    preview: 'Нараховано за {{month}}: оклад {{salary}} грн, бонус {{bonus}} грн, утримання {{deduction}} грн.',
  },
]

export const CHANNEL_ICON: Record<string, React.ElementType> = {
  email: Mail,
  telegram: MessageSquare,
  push: Bell,
}

export const STATUS_BADGE: Record<WorkflowStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  active:  { label: 'automation.active',  variant: 'default'   },
  paused:  { label: 'automation.paused',  variant: 'secondary' },
  draft:   { label: 'automation.draft',   variant: 'outline'   },
}

export const CATEGORY_COLOR: Record<string, string> = {
  tax:      'bg-amber-500/10 text-amber-600',
  internal: 'bg-blue-500/10 text-blue-600',
  safety:   'bg-destructive/10 text-destructive',
  legal:    'bg-primary/10 text-primary',
  finance:  'bg-green-500/10 text-green-600',
}
