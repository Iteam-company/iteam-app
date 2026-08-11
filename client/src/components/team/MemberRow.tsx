import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, ShieldCheck, Trash2, User } from 'lucide-react'
import { Badge } from '#/components/ui/badge'
import { Button } from '#/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '#/components/ui/select'
import {
  useRemoveMember, useUpdateMemberCompanyRole, useUpdateMemberOccupation, useUpdateMemberSalary,
} from '#/lib/company/mutations'
import type { CompanyMember, CompanyRole } from '#/lib/company/types'

export function MemberRow({ member, isAdmin, isSelf, companyRoles }: {
  member: CompanyMember
  isAdmin: boolean
  isSelf: boolean
  companyRoles: CompanyRole[]
}) {
  const { t } = useTranslation()
  const updateCompanyRole = useUpdateMemberCompanyRole()
  const updateOccupation = useUpdateMemberOccupation()
  const updateSalary = useUpdateMemberSalary()
  const removeMember = useRemoveMember()
  const [removeOpen, setRemoveOpen] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [salaryEditing, setSalaryEditing] = useState(false)
  const [salaryDraft, setSalaryDraft] = useState('')

  const hasAdminPermission = member.companyRole?.permissions.includes('ADMIN') ?? false

  const startSalaryEdit = () => {
    setSalaryDraft(member.salary != null ? String(member.salary) : '')
    setSalaryEditing(true)
  }

  const commitSalary = () => {
    setSalaryEditing(false)
    const parsed = salaryDraft.trim() === '' ? null : Number(salaryDraft)
    if (!isNaN(parsed as number) && parsed !== member.salary) {
      updateSalary.mutate({ id: member.id, salary: parsed })
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      await removeMember.mutateAsync(member.id)
      setRemoveOpen(false)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className={`grid items-center gap-4 px-6 py-3 ${isAdmin ? 'grid-cols-[1fr_180px_140px_160px_40px]' : 'grid-cols-[1fr_180px_160px]'}`}>
      {/* Name + email */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
          {member.fullName[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {member.fullName}
            {isSelf && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
          </p>
          <p className="truncate text-xs text-muted-foreground">{member.email}</p>
        </div>
      </div>

      {/* Occupation */}
      <div>
        {isAdmin ? (
          <Select
            value={member.occupation ?? '__none__'}
            onValueChange={(v) =>
              updateOccupation.mutate({ id: member.id, occupation: v === '__none__' ? '' : v })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {companyRoles.map((r) => (
                <SelectItem key={r.id} value={r.name}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          member.occupation
            ? <Badge variant="secondary" className="text-xs font-normal">{member.occupation}</Badge>
            : <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Salary — admin only */}
      {isAdmin && (
        <div>
          {salaryEditing ? (
            <Input
              autoFocus
              type="number"
              min={0}
              value={salaryDraft}
              onChange={(e) => setSalaryDraft(e.target.value)}
              onBlur={commitSalary}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitSalary()
                if (e.key === 'Escape') setSalaryEditing(false)
              }}
              className="h-7 w-full text-xs"
            />
          ) : (
            <button
              onClick={startSalaryEdit}
              className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted transition-colors"
            >
              {member.salary != null
                ? Number(member.salary).toLocaleString('uk-UA') + ' ₴'
                : <span className="text-muted-foreground">—</span>}
            </button>
          )}
        </div>
      )}

      {/* Company role — drives permissions, not just a label */}
      <div>
        {isAdmin && !isSelf ? (
          <Select
            value={member.companyRoleId != null ? String(member.companyRoleId) : '__none__'}
            onValueChange={(v) =>
              updateCompanyRole.mutate({
                id: member.id,
                companyRoleId: v === '__none__' ? null : Number(v),
              })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">—</SelectItem>
              {companyRoles.map((r) => (
                <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Badge variant={hasAdminPermission ? 'default' : 'secondary'} className="text-xs">
            {hasAdminPermission
              ? <><ShieldCheck className="mr-1 size-3" />{member.companyRole?.name}</>
              : <><User className="mr-1 size-3" />{member.companyRole?.name ?? '—'}</>}
          </Badge>
        )}
      </div>

      {/* Remove */}
      <div>
        {isAdmin && !isSelf ? (
          <Dialog open={removeOpen} onOpenChange={setRemoveOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="size-7 text-muted-foreground hover:text-destructive">
                <Trash2 className="size-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>{t('dashboard.team.removeConfirm')}</DialogTitle>
                <DialogDescription>
                  {t('dashboard.team.removeDesc', { name: member.fullName })}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setRemoveOpen(false)}>
                  {t('dashboard.team.cancel')}
                </Button>
                <Button variant="destructive" onClick={handleRemove} disabled={removing}>
                  {removing ? <Loader2 className="size-4 animate-spin" /> : t('dashboard.team.remove')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        ) : <div className="size-7" />}
      </div>
    </div>
  )
}
