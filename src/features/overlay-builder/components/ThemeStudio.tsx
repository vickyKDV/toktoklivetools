'use client'

import Link from 'next/link'
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  Gift,
  Save,
  Heart,
  Image as ImageIcon,
  LogIn,
  MessageSquare,
  Monitor,
  Palette,
  Play,
  Rocket,
  SlidersHorizontal,
  Share2,
  UserCheck,
  Target,
  Trophy,
  type LucideIcon,
} from 'lucide-react'
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from 'react'
import type { OverlayKind } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { CopyButton } from '@/components/ui/copy-button'
import { ExternalLinkButton } from '@/components/ui/external-link-button'
import { Input } from '@/components/ui/input'
import { OverlayThumbnail } from '@/features/overlay-builder/components/OverlayThumbnail'
import { ChatOverlayRenderer } from '@/features/overlay-builder/theme-studio/ChatOverlayRenderer'
import {
  animationInOptions,
  animationOutOptions,
  resolvePreviewAnimationName,
} from '@/features/overlay-builder/theme-studio/overlayAnimations'
import {
  chatOverlayThemes,
  studioKinds,
  type ChatOverlayTheme,
} from '@/features/overlay-builder/theme-studio/overlayThemes'
import { normalizeDesignSchema } from '@/core/overlay/normalizeDesignSchema'
import type { OverlayDesignSchema } from '@/core/overlay/schema'

export type ThemeStudioTemplate = {
  id: string
  name: string
  description: string
  kind: OverlayKind
  schema: OverlayDesignSchema
}

export type ThemeStudioSavedDesign = {
  id: string
  name: string
  kind: OverlayKind
  schema: OverlayDesignSchema
  publishedAt?: string | null
}

type ThemeStudioPageProps = {
  workspaceId: string
  workspaceName: string
  initialKind?: OverlayKind
  initialDesignId?: string | null
  initialDesigns: ThemeStudioSavedDesign[]
  templates: ThemeStudioTemplate[]
}

type SaveResponse = {
  ok: boolean
  message?: string
  design?: ThemeStudioSavedDesign
}

type ThemeSettings = {
  name: string
  enterAnimation: string
  exitAnimation: string
  animationDurationMs: number
  autoCloseMs: number
  chatMaxItems: number
  eventTypes: ChatEventSource[]
  eventMessages: ChatEventMessages
}

type StudioThemeOption = ThemeStudioTemplate & {
  chatTheme?: ChatOverlayTheme
}

type KindMeta = {
  title: string
  subtitle: string
  icon: LucideIcon
}

type ChatEventSource =
  | 'CHAT'
  | 'GIFT'
  | 'LIKE'
  | 'FOLLOW'
  | 'JOIN'
  | 'SHARE'
  | 'ABSENT'
type ChatMessageEventSource = Exclude<ChatEventSource, 'CHAT'>
type ChatEventMessages = Record<ChatMessageEventSource, string>

type ChatEventSourceOption = {
  icon: LucideIcon
  label: string
  value: ChatEventSource
}

type ChatEventMessageOption = {
  label: string
  placeholder?: string
  value: ChatMessageEventSource
}

const kindMeta: Record<string, KindMeta> = {
  CHAT: {
    title: 'Chat Overlay',
    subtitle: 'Pilih theme, animasi, dan simpan pengaturan chat overlay dari satu layar.',
    icon: MessageSquare,
  },
  GIFT: {
    title: 'Gift Overlay',
    subtitle: 'Pilih theme alert gift dan animasi masuk/keluar.',
    icon: Gift,
  },
  LEADERBOARD: {
    title: 'Leaderboard Overlay',
    subtitle: 'Pilih style ranking yang siap dipakai untuk OBS.',
    icon: Trophy,
  },
  DOCK: {
    title: 'Dock Overlay',
    subtitle: 'Atur tampilan dock komentar untuk workflow live.',
    icon: Monitor,
  },
  GOAL: {
    title: 'Goal Overlay',
    subtitle: 'Pilih tampilan goal progress untuk live stream.',
    icon: Target,
  },
  STATIC: {
    title: 'Static Overlay',
    subtitle: 'Pilih frame static atau media overlay siap dipakai.',
    icon: ImageIcon,
  },
  CUSTOM: {
    title: 'Custom Overlay',
    subtitle: 'Theme custom tetap bisa dibuka lewat Advanced Builder.',
    icon: Palette,
  },
}

const chatEventSourceOptions: ChatEventSourceOption[] = [
  { icon: MessageSquare, label: 'Chat', value: 'CHAT' },
  { icon: Gift, label: 'Gift', value: 'GIFT' },
  { icon: Heart, label: 'Like', value: 'LIKE' },
  { icon: UserCheck, label: 'Follow', value: 'FOLLOW' },
  { icon: LogIn, label: 'Join', value: 'JOIN' },
  { icon: Share2, label: 'Share', value: 'SHARE' },
  { icon: Eye, label: 'Absent', value: 'ABSENT' },
]

const defaultChatEventTypes: ChatEventSource[] = [
  'CHAT',
  'GIFT',
  'FOLLOW',
  'SHARE',
]
const defaultChatEventMessages: ChatEventMessages = {
  ABSENT: 'Barusan Hadir.',
  FOLLOW: 'Ngikutin anda.',
  GIFT: 'Ngasih GIFT {{giftName}}.',
  JOIN: 'Baru masuk.',
  LIKE: 'Makasih Like nya',
  SHARE: 'Ngebagiin live.',
}
const chatEventMessageOptions: ChatEventMessageOption[] = [
  { label: 'Gift', placeholder: 'Ngasih GIFT {{giftName}}.', value: 'GIFT' },
  { label: 'Like', value: 'LIKE' },
  { label: 'Follow', value: 'FOLLOW' },
  { label: 'Join', value: 'JOIN' },
  { label: 'Share', value: 'SHARE' },
  { label: 'Absent', value: 'ABSENT' },
]

export function ThemeStudioPage({
  workspaceId,
  workspaceName,
  initialKind = 'CHAT',
  initialDesignId = null,
  initialDesigns,
  templates,
}: ThemeStudioPageProps) {
  const initialSavedDesign =
    initialDesigns.find((design) => design.id === initialDesignId) ?? null
  const selectedKind = normalizeStudioKind(
    initialSavedDesign?.kind ?? initialKind,
  )
  const themeOptions = useMemo(
    () => getThemeOptionsForKind(templates, selectedKind),
    [selectedKind, templates],
  )
  const initialTheme = resolveInitialTheme(themeOptions, initialSavedDesign)
  const [selectedThemeId, setSelectedThemeId] = useState(initialTheme.id)
  const selectedTheme = useMemo(
    () =>
      themeOptions.find((theme) => theme.id === selectedThemeId) ??
      themeOptions[0],
    [selectedThemeId, themeOptions],
  )
  const [designId, setDesignId] = useState<string | null>(
    initialSavedDesign?.id ?? null,
  )
  const [settings, setSettings] = useState<ThemeSettings>(() =>
    createInitialSettings(
      initialSavedDesign?.schema ?? initialTheme.schema,
      initialSavedDesign?.name ?? initialTheme.name,
    ),
  )
  const [status, setStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [browserOrigin, setBrowserOrigin] = useState('')
  const [replayToken, setReplayToken] = useState(0)
  const meta = kindMeta[selectedKind] ?? kindMeta.CHAT
  const previewSchema = useMemo(
    () => applyThemeSettings(selectedTheme.schema, selectedKind, settings),
    [selectedKind, selectedTheme.schema, settings],
  )
  const outputUrl =
    designId && browserOrigin
      ? `${browserOrigin}/overlay/${selectedKind.toLowerCase()}/${designId}`
      : ''

  useEffect(() => {
    setBrowserOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    const previousHtmlOverflow = document.documentElement.style.overflow
    const previousBodyOverflow = document.body.style.overflow
    const lockScroll = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0)
      }
    }

    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    lockScroll()
    window.addEventListener('scroll', lockScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', lockScroll)
      document.documentElement.style.overflow = previousHtmlOverflow
      document.body.style.overflow = previousBodyOverflow
    }
  }, [])

  useEffect(() => {
    setReplayToken((current) => current + 1)
  }, [
    settings.animationDurationMs,
    settings.enterAnimation,
    settings.exitAnimation,
    selectedThemeId,
  ])

  const updateSettings = useCallback((patch: Partial<ThemeSettings>) => {
    setSettings((current) => ({
      ...current,
      ...patch,
    }))
    setStatus('')
  }, [])

  const toggleChatEventType = useCallback((eventType: ChatEventSource) => {
    setSettings((current) => {
      const hasEventType = current.eventTypes.includes(eventType)
      const nextEventTypes = hasEventType
        ? current.eventTypes.filter((value) => value !== eventType)
        : [...current.eventTypes, eventType]

      return {
        ...current,
        eventTypes: nextEventTypes.length ? nextEventTypes : ['CHAT'],
      }
    })
    setStatus('')
  }, [])

  const updateChatEventMessage = useCallback(
    (eventType: ChatMessageEventSource, message: string) => {
      setSettings((current) => ({
        ...current,
        eventMessages: {
          ...current.eventMessages,
          [eventType]: message,
        },
      }))
      setStatus('')
    },
    [],
  )

  const selectTheme = useCallback((theme: StudioThemeOption) => {
    setSelectedThemeId(theme.id)
    setDesignId(null)
    setSettings((current) => ({
      ...current,
      name: theme.name,
    }))
    setStatus('')
  }, [])

  const replayPreview = useCallback(() => {
    setReplayToken((current) => current + 1)
  }, [])

  const saveTheme = useCallback(async () => {
      setSaving(true)
      setStatus('')

      try {
        const response = await fetch(
          designId ? `/api/overlays/${designId}` : '/api/overlays',
          {
            method: designId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              workspaceId,
              name: settings.name,
              schema: previewSchema,
              kind: selectedKind,
              overlayType:
                selectedKind === 'CHAT' ? 'CHAT_STYLE' : 'CUSTOM_OVERLAY',
              publish: true,
            }),
          },
        )
        const data = (await response.json()) as SaveResponse

        if (!response.ok || !data.ok || !data.design) {
          setStatus(data.message ?? 'Theme gagal disimpan.')
          return
        }

        setDesignId(data.design.id)

        const nextUrl = `${browserOrigin || window.location.origin}/overlay/${data.design.kind.toLowerCase()}/${data.design.id}`

        setStatus(`Overlay disimpan. URL: ${nextUrl}`)
      } catch (error) {
        setStatus(
          error instanceof Error
            ? error.message
            : 'Server tidak merespon saat menyimpan overlay.',
        )
      } finally {
        setSaving(false)
      }
    },
    [
      browserOrigin,
      designId,
      previewSchema,
      selectedKind,
      settings.name,
      workspaceId,
    ],
  )

  return (
    <ThemeStudioShell>
      <ThemeStudioHeader
        designId={designId}
        meta={meta}
        workspaceId={workspaceId}
        workspaceName={workspaceName}
      />
      <ThemeSettingsToolbar
        onApply={() => void saveTheme()}
        onChange={updateSettings}
        saving={saving}
        selectedKind={selectedKind}
        settings={settings}
      />
      <main
        className="grid min-h-0 flex-1 gap-4 overflow-hidden"
        style={{ gridTemplateColumns: 'minmax(22rem, 35%) minmax(0, 1fr)' }}
      >
        <ThemeCardGrid
          eventMessages={settings.eventMessages}
          onEventMessageChange={updateChatEventMessage}
          onSelect={selectTheme}
          selectedThemeId={selectedThemeId}
          themes={themeOptions}
        />
        <OverlayLivePreview
          designId={designId}
          outputUrl={outputUrl}
          replayToken={replayToken}
          saving={saving}
          schema={previewSchema}
          selectedKind={selectedKind}
          status={status}
          theme={selectedTheme.chatTheme}
          eventMessages={settings.eventMessages}
          eventTypes={settings.eventTypes}
          onEventTypeToggle={toggleChatEventType}
          onPublish={() => void saveTheme()}
          onReplay={replayPreview}
        />
      </main>
    </ThemeStudioShell>
  )
}

export function ThemeStudio(props: ThemeStudioPageProps) {
  return <ThemeStudioPage {...props} />
}

function ThemeStudioShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-theme-studio-shell="true"
      className="-mx-2 -my-2 flex min-h-0 flex-col gap-3 overflow-hidden rounded-[24px] border border-[#1c2431] bg-[radial-gradient(circle_at_12%_0%,rgba(124,58,237,.16),transparent_32%),#060a12] p-3 text-slate-100 shadow-[0_24px_90px_rgba(0,0,0,.38)]"
      style={{
        height: 'calc(100dvh - 7rem)',
        maxHeight: 'calc(100dvh - 7rem)',
      }}
    >
      {children}
    </div>
  )
}

const ThemeStudioHeader = memo(function ThemeStudioHeader({
  designId,
  meta,
  workspaceId,
  workspaceName,
}: {
  designId: string | null
  meta: KindMeta
  workspaceId: string
  workspaceName: string
}) {
  const Icon = meta.icon

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 rounded-[18px] border border-[#202938] bg-[#0b111b]/90 px-5 py-3 shadow-[0_18px_46px_rgba(0,0,0,.22)]">
      <div className="flex min-w-0 items-center gap-4">
        <div className="grid size-11 shrink-0 place-items-center rounded-[15px] border border-violet-500/50 bg-violet-500/10 text-violet-300 shadow-[0_0_26px_rgba(139,92,246,.22)]">
          <Icon className="size-6" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="truncate text-[1.4rem] font-semibold leading-tight tracking-normal text-white">
              {meta.title}
            </h1>
            <span className="rounded-full border border-violet-500/25 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200">
              Live Preview
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-slate-400">
            {meta.subtitle}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden rounded-full border border-[#2a3344] bg-[#080d15] px-3 py-1 text-xs font-medium text-slate-400 xl:inline-flex">
          {workspaceName}
        </span>
        <Button
          asChild
          variant="outline"
          className="h-10 rounded-xl border-[#2a3344] bg-[#101722] px-4 text-slate-100 hover:bg-[#151f2e]"
        >
          <Link
            href={`/dashboard/workspaces/${workspaceId}/overlay-design-builder?advanced=1${designId ? `&overlayId=${designId}` : ''}`}
          >
            <SlidersHorizontal />
            Advanced Builder
          </Link>
        </Button>
      </div>
    </header>
  )
})

const ThemeSettingsToolbar = memo(function ThemeSettingsToolbar({
  settings,
  selectedKind,
  saving,
  onChange,
  onApply,
}: {
  settings: ThemeSettings
  selectedKind: OverlayKind
  saving: boolean
  onChange: (patch: Partial<ThemeSettings>) => void
  onApply: () => void
}) {
  return (
    <section
      className="grid shrink-0 items-end gap-3 rounded-[18px] border border-[#202938] bg-[#0d141f]/95 px-4 py-2.5 shadow-[0_18px_48px_rgba(0,0,0,.2)]"
      style={{
        gridTemplateColumns:
          'minmax(136px,1.05fr) minmax(136px,1.05fr) minmax(150px,.9fr) minmax(130px,.82fr) 190px',
      }}
    >
      <ToolbarSelect
        label="Animation IN"
        options={animationInOptions}
        value={settings.enterAnimation}
        onChange={(enterAnimation) => onChange({ enterAnimation })}
      />
      <ToolbarSelect
        label="Animation OUT"
        options={animationOutOptions}
        value={settings.exitAnimation}
        onChange={(exitAnimation) => onChange({ exitAnimation })}
      />
      <ToolbarRange
        label="Duration"
        max={1600}
        min={160}
        step={20}
        suffix="ms"
        value={settings.animationDurationMs}
        onChange={(animationDurationMs) => onChange({ animationDurationMs })}
      />
      <div className={selectedKind === 'CHAT' ? '' : 'opacity-45'}>
        <ToolbarRange
          disabled={selectedKind !== 'CHAT'}
          label="Chat List Max"
          max={10}
          min={1}
          step={1}
          value={settings.chatMaxItems}
          onChange={(chatMaxItems) => onChange({ chatMaxItems })}
        />
      </div>
      <Button
        type="button"
        onClick={onApply}
        disabled={saving || !settings.name.trim()}
        className="h-10 min-w-0 whitespace-nowrap rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-4 text-[13px] font-semibold text-white shadow-[0_0_28px_rgba(20,184,166,.24)] hover:from-emerald-400 hover:to-teal-400"
      >
        <Save />
        {saving ? 'Menyimpan...' : 'Simpan'}
      </Button>
    </section>
  )
})

function ToolbarSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ value: string; label: string }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="text-xs font-semibold text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-xl border border-[#2a3344] bg-[#080d15] px-3 text-sm font-medium text-slate-100 outline-none transition-colors hover:border-violet-500/45 focus:border-violet-400"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function ToolbarRange({
  disabled = false,
  label,
  max,
  min,
  step,
  suffix = '',
  value,
  onChange,
}: {
  disabled?: boolean
  label: string
  max: number
  min: number
  step: number
  suffix?: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="grid min-w-0 gap-2">
      <span className="flex items-center justify-between gap-3 text-xs font-semibold text-slate-300">
        <span>{label}</span>
        <span className="text-slate-100">
          {value}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-cyan-400 disabled:opacity-50"
      />
    </label>
  )
}

const ThemeCardGrid = memo(function ThemeCardGrid({
  eventMessages,
  themes,
  selectedThemeId,
  onEventMessageChange,
  onSelect,
}: {
  eventMessages: ChatEventMessages
  themes: StudioThemeOption[]
  selectedThemeId: string
  onEventMessageChange: (
    eventType: ChatMessageEventSource,
    message: string,
  ) => void
  onSelect: (theme: StudioThemeOption) => void
}) {
  return (
    <aside className="flex min-h-0 flex-col rounded-[18px] border border-[#202938] bg-[#0d141f]/95 p-3 shadow-[0_18px_48px_rgba(0,0,0,.2)]">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Palette className="size-4 text-cyan-300" />
          <h2 className="text-base font-semibold text-white">Pilih Tema</h2>
        </div>
        <span className="rounded-full border border-[#2a3344] bg-[#080d15] px-2.5 py-1 text-[11px] font-semibold text-slate-400">
          {themes.length} themes
        </span>
      </div>
      <div className="theme-studio-scrollbar grid min-h-0 flex-1 grid-cols-1 gap-2 overflow-y-auto pr-1">
        {themes.map((theme) => (
          <ThemeCard
            key={theme.id}
            selected={selectedThemeId === theme.id}
            theme={theme}
            onSelect={onSelect}
          />
        ))}
      </div>
      <ChatEventMessageForm
        eventMessages={eventMessages}
        onChange={onEventMessageChange}
      />
    </aside>
  )
})

const ChatEventMessageForm = memo(function ChatEventMessageForm({
  eventMessages,
  onChange,
}: {
  eventMessages: ChatEventMessages
  onChange: (eventType: ChatMessageEventSource, message: string) => void
}) {
  return (
    <section className="mt-3 shrink-0 rounded-2xl border border-[#202938] bg-[#080d15] p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Event Message</h3>
        <span className="text-[10px] font-medium uppercase tracking-[.14em] text-slate-500">
          Global
        </span>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-4">
        {chatEventMessageOptions.map((option) => (
          <div key={option.value} className="min-w-0 sm:px-0">
            <label className="grid min-w-0 gap-2">
              <span className="text-[11px] font-semibold text-slate-400">
                {option.label}
              </span>

              <Input
                value={eventMessages[option.value]}
                placeholder={
                  option.placeholder ?? defaultChatEventMessages[option.value]
                }
                onChange={(event) => onChange(option.value, event.target.value)}
                className="h-10 w-full rounded-xl border-[#263143] bg-[#0d141f] px-3 py-2 text-xs font-medium text-slate-100 shadow-none outline-none placeholder:text-slate-600 focus-visible:ring-1 focus-visible:ring-cyan-400"
              />
            </label>
          </div>
        ))}
      </div>
    </section>
  )
})

const ThemeCard = memo(function ThemeCard({
  selected,
  theme,
  onSelect,
}: {
  selected: boolean
  theme: StudioThemeOption
  onSelect: (theme: StudioThemeOption) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(theme)}
      className={`group relative flex h-[52px] items-center overflow-hidden rounded-[14px] border px-3 text-left transition-colors ${selected ? 'border-violet-500 bg-violet-500/14 shadow-[0_0_18px_rgba(139,92,246,.34)]' : 'border-[#263143] bg-[#080d15] hover:border-cyan-400/50 hover:bg-[#0b1320]'}`}
      style={{ height: 52 }}
    >
      {selected ? (
        <span className="absolute right-2 top-2 z-20 grid size-6 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_16px_rgba(139,92,246,.45)]">
          <Check className="size-4" />
        </span>
      ) : null}
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_0%_0%,rgba(139,92,246,.18),transparent_45%)] opacity-0 transition-opacity group-hover:opacity-100" />
      <ThemeSwatch theme={theme} />
      <p className="relative z-10 max-w-[calc(100%-4.75rem)] truncate text-sm font-semibold text-slate-100">
        {theme.name}
      </p>
    </button>
  )
})

function ThemeSwatch({ theme }: { theme: StudioThemeOption }) {
  const preview = theme.chatTheme?.preview
  const frame = theme.chatTheme?.frame
  const swatchStyle: CSSProperties = preview
    ? {
        background:
          frame === 'gaming' || frame === 'women'
            ? `linear-gradient(105deg, ${preview.panel}, ${preview.accent}, ${preview.panelSoft})`
            : frame === 'glass' || frame === 'dynamic'
              ? `linear-gradient(135deg, rgba(255,255,255,.22), ${preview.panelSoft})`
              : `linear-gradient(135deg, ${preview.panel}, ${preview.panelSoft})`,
        borderColor: preview.border,
        boxShadow:
          frame === 'white' || frame === 'square' || frame === 'neumorph-light'
            ? 'none'
            : `0 0 14px ${withAlpha(preview.glow, 0.32)}`,
        color: preview.text,
      }
    : {}

  return (
    <span
      aria-hidden="true"
      className="relative z-10 mr-3 h-7 w-11 shrink-0 overflow-hidden rounded-lg border bg-[#101722]"
      style={swatchStyle}
    >
      {frame === 'gaming' ? (
        <svg
          className="absolute inset-0 size-full"
          preserveAspectRatio="none"
          viewBox="0 0 44 28"
        >
          <path
            d="M3 10 L10 3 H34 L39 8 H43 V20 L36 26 H9 L4 22 Z"
            fill="none"
            stroke={preview?.border ?? '#8b5cf6'}
            strokeLinejoin="round"
            strokeWidth="1.5"
          />
          <path
            d="M29 3 L34 7 H40"
            fill="none"
            stroke={preview?.accent2 ?? '#22d3ee'}
            strokeLinecap="round"
            strokeWidth="1.2"
          />
        </svg>
      ) : null}
      {frame === 'pixel' ? (
        <span className="absolute inset-1 border-2 border-[#111827] shadow-[3px_3px_0_rgba(17,24,39,.75)]" />
      ) : null}
      {frame === 'pink' ? (
        <span
          className="absolute -left-1 bottom-1 size-3 rotate-45 border-b border-l"
          style={{ background: preview?.panel, borderColor: preview?.border }}
        />
      ) : null}
      <span
        className="absolute left-2 top-1/2 size-3 -translate-y-1/2 rounded-full"
        style={{
          background: preview?.avatarBg ?? '#334155',
          border: `1px solid ${preview?.border ?? '#64748b'}`,
        }}
      />
      <span
        className="absolute left-6 top-[9px] h-1.5 w-3 rounded-full"
        style={{ background: preview?.badgeBg ?? '#8b5cf6' }}
      />
      <span
        className="absolute bottom-[7px] left-6 right-2 h-1 rounded-full"
        style={{
          background: preview?.text ?? '#f8fafc',
          opacity:
            frame === 'white' ||
            frame === 'pixel' ||
            frame === 'pink' ||
            frame === 'neumorph-light'
              ? 0.75
              : 0.9,
        }}
      />
    </span>
  )
}

const OverlayLivePreview = memo(function OverlayLivePreview({
  schema,
  theme,
  outputUrl,
  designId,
  selectedKind,
  replayToken,
  saving,
  status,
  eventMessages,
  eventTypes,
  onReplay,
  onEventTypeToggle,
  onPublish,
}: {
  schema: OverlayDesignSchema
  theme?: ChatOverlayTheme
  outputUrl: string
  designId: string | null
  selectedKind: OverlayKind
  replayToken: number
  saving: boolean
  status: string
  eventMessages: ChatEventMessages
  eventTypes: ChatEventSource[]
  onEventTypeToggle: (eventType: ChatEventSource) => void
  onReplay: () => void
  onPublish: () => void
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-[18px] border border-[#202938] bg-[#0d141f]/95 p-3 shadow-[0_18px_48px_rgba(0,0,0,.2)]">
      <div className="mb-2 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-4 text-violet-300" />
          <h2 className="text-base font-semibold text-white">Live Preview</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.55)]" />
            Realtime Preview
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReplay}
            className="border-[#2a3344] bg-[#080d15] text-slate-100 hover:bg-[#151e2c]"
          >
            <Play />
            Replay
          </Button>
        </div>
      </div>
      <div className="relative min-h-[230px] flex-1 overflow-hidden rounded-2xl border border-[#161d29] bg-[#050814]">
        <LivePreviewCanvas
          key={`${schema.name}-${schema.layout.enterAnimation}-${schema.layout.animationDurationMs}-${replayToken}`}
          schema={schema}
          theme={theme}
          eventMessages={eventMessages}
          eventTypes={eventTypes}
        />
      </div>
      {selectedKind === 'CHAT' ? (
        <ChatEventSourceBar
          eventTypes={eventTypes}
          onToggle={onEventTypeToggle}
        />
      ) : null}
      <OverlayPublishBar
        designId={designId}
        outputUrl={outputUrl}
        saving={saving}
        selectedKind={selectedKind}
        status={status}
        onPublish={onPublish}
      />
    </section>
  )
})

function LivePreviewCanvas({
  schema,
  theme,
  eventMessages,
  eventTypes,
}: {
  schema: OverlayDesignSchema
  theme?: ChatOverlayTheme
  eventMessages: ChatEventMessages
  eventTypes: ChatEventSource[]
}) {
  return (
    <div className="theme-preview-stage absolute inset-0 overflow-hidden">
      <div
        className="theme-preview-overlay pointer-events-none absolute inset-0"
        style={
          theme
            ? undefined
            : {
                animationDuration: `${schema.layout.animationDurationMs}ms`,
                animationName: resolvePreviewAnimationName(
                  schema.layout.enterAnimation,
                ),
              }
        }
      >
        {theme ? (
          <ChatOverlayRenderer
            className="size-full"
            durationMs={schema.layout.animationDurationMs}
            enterAnimation={schema.layout.enterAnimation}
            exitAnimation={schema.layout.exitAnimation}
            eventMessages={eventMessages}
            eventTypes={eventTypes}
            itemCount={schema.layout.maxItems}
            theme={theme}
            variant="preview"
          />
        ) : (
          <div className="grid size-full place-items-center p-10">
            <OverlayThumbnail
              schema={schema}
              className="h-72 w-[min(82%,760px)] rounded-2xl border-violet-500/25"
            />
          </div>
        )}
      </div>
    </div>
  )
}

const ChatEventSourceBar = memo(function ChatEventSourceBar({
  eventTypes,
  onToggle,
}: {
  eventTypes: ChatEventSource[]
  onToggle: (eventType: ChatEventSource) => void
}) {
  return (
    <div className="mt-3 flex shrink-0 flex-wrap items-center gap-2 rounded-2xl border border-[#202938] bg-[#080d15] px-3 py-2">
      <span className="mr-1 text-xs font-semibold text-slate-400">
        Event Sources
      </span>
      {chatEventSourceOptions.map((option) => {
        const checked = eventTypes.includes(option.value)
        const Icon = option.icon

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onToggle(option.value)}
            aria-pressed={checked}
            className={`inline-flex h-8 items-center gap-2 rounded-xl border px-3 text-xs font-semibold transition-colors ${checked ? 'border-cyan-400/60 bg-cyan-400/12 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,.16)]' : 'border-[#2a3344] bg-[#0d141f] text-slate-400 hover:border-violet-400/45 hover:text-slate-100'}`}
          >
            <span
              className={`grid size-4 place-items-center rounded ${checked ? 'bg-cyan-400 text-slate-950' : 'bg-[#151e2c] text-slate-500'}`}
            >
              {checked ? (
                <Check className="size-3" />
              ) : (
                <Icon className="size-3" />
              )}
            </span>
            {option.label}
          </button>
        )
      })}
    </div>
  )
})

const OverlayPublishBar = memo(function OverlayPublishBar({
  outputUrl,
  designId,
  selectedKind,
  saving,
  status,
  onPublish,
}: {
  outputUrl: string
  designId: string | null
  selectedKind: OverlayKind
  saving: boolean
  status: string
  onPublish: () => void
}) {
  return (
    <div
      className="mt-3 grid shrink-0 items-center gap-2"
      style={{
        gridTemplateColumns:
          'minmax(130px,1fr) 42px minmax(122px,.64fr) minmax(132px,.68fr)',
      }}
    >
      <div className="grid min-w-0 gap-1 rounded-xl border border-[#202938] bg-[#080d15] px-3 py-2">
        <p className="text-xs font-semibold text-slate-400">Overlay URL</p>
        <Input
          readOnly
          value={outputUrl || 'Simpan overlay untuk membuat URL OBS'}
          className="h-7 border-0 bg-transparent px-0 font-mono text-xs text-slate-200 shadow-none focus-visible:ring-0"
        />
      </div>
      {outputUrl ? (
        <CopyButton
          compact
          value={outputUrl}
          className="h-10 w-10 rounded-xl border-[#2a3344] bg-[#080d15] px-0"
        />
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled
          className="h-10 rounded-xl border-[#2a3344] bg-[#080d15] px-3"
        >
          <Copy />
        </Button>
      )}
      {outputUrl && designId ? (
        <ExternalLinkButton
          href={`/overlay/${selectedKind.toLowerCase()}/${designId}?preview=1`}
          variant="outline"
          className="h-10 rounded-xl border-[#2a3344] bg-[#080d15] px-3 text-xs text-slate-100 hover:bg-[#151e2c]"
        >
          <ExternalLink />
          Preview in Browser
        </ExternalLinkButton>
      ) : (
        <Button
          type="button"
          variant="outline"
          disabled
          className="h-10 rounded-xl border-[#2a3344] bg-[#080d15] px-3 text-xs"
        >
          <ExternalLink />
          Preview in Browser
        </Button>
      )}
      <Button
        type="button"
        onClick={onPublish}
        disabled={saving}
        className="h-10 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-3 text-xs font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,.3)] hover:from-violet-500 hover:to-fuchsia-400"
      >
        <Save />
        {saving ? 'Menyimpan...' : 'Simpan Overlay'}
      </Button>
      {status ? (
        <p className="col-span-4 truncate text-xs font-medium text-slate-400">
          {status}
        </p>
      ) : null}
      {outputUrl && designId ? (
        <span className="sr-only">{`/overlay/${selectedKind.toLowerCase()}/${designId}`}</span>
      ) : null}
    </div>
  )
})

function createInitialSettings(
  schema: OverlayDesignSchema,
  name: string,
): ThemeSettings {
  return {
    name,
    enterAnimation: schema.layout.enterAnimation,
    exitAnimation: schema.layout.exitAnimation,
    animationDurationMs: schema.layout.animationDurationMs,
    autoCloseMs: schema.layout.autoCloseMs,
    chatMaxItems: Math.min(schema.layout.maxItems, 10),
    eventTypes: readChatEventTypes(schema),
    eventMessages: readChatEventMessages(schema),
  }
}

function applyThemeSettings(
  schema: OverlayDesignSchema,
  kind: OverlayKind,
  settings: ThemeSettings,
) {
  const maxItems =
    kind === 'CHAT' ? settings.chatMaxItems : schema.layout.maxItems
  const dataSourceType =
    kind === 'CHAT'
      ? 'chat'
      : kind === 'GIFT'
        ? 'gift'
        : kind === 'LEADERBOARD'
          ? 'leaderboard'
          : kind === 'GOAL'
            ? 'goal'
            : kind === 'DOCK'
              ? 'dock'
              : kind === 'STATIC'
                ? 'static'
                : schema.dataSource.type

  return normalizeDesignSchema({
    ...structuredClone(schema),
    name: settings.name,
    kind,
    dataSource: {
      ...schema.dataSource,
      type: dataSourceType,
      filters:
        kind === 'CHAT'
          ? {
              ...schema.dataSource.filters,
              eventMessages: settings.eventMessages,
              eventTypes: settings.eventTypes,
            }
          : schema.dataSource.filters,
    },
    layout: {
      ...schema.layout,
      animationDurationMs: settings.animationDurationMs,
      autoCloseMs: kind === 'CHAT' ? 0 : settings.autoCloseMs,
      enterAnimation: settings.enterAnimation,
      exitAnimation: settings.exitAnimation,
      maxItems,
    },
  })
}

function readChatEventMessages(schema: OverlayDesignSchema): ChatEventMessages {
  const storedMessages = schema.dataSource.filters?.eventMessages

  if (
    !storedMessages ||
    typeof storedMessages !== 'object' ||
    Array.isArray(storedMessages)
  ) {
    return defaultChatEventMessages
  }

  return chatEventMessageOptions.reduce<ChatEventMessages>(
    (messages, option) => {
      const value = (storedMessages as Record<string, unknown>)[option.value]

      return {
        ...messages,
        [option.value]:
          typeof value === 'string' && value.trim()
            ? value
            : defaultChatEventMessages[option.value],
      }
    },
    { ...defaultChatEventMessages },
  )
}

function readChatEventTypes(schema: OverlayDesignSchema): ChatEventSource[] {
  const eventTypes = schema.dataSource.filters?.eventTypes

  if (Array.isArray(eventTypes)) {
    const normalized = eventTypes
      .filter((value): value is string => typeof value === 'string')
      .map((value) => value.toUpperCase())
      .filter((value): value is ChatEventSource => isChatEventSource(value))

    if (normalized.length) {
      return [...new Set(normalized)]
    }
  }

  const filters = schema.dataSource.filters ?? {}
  const legacyEventTypes: ChatEventSource[] = []

  if (filters.chat !== false) legacyEventTypes.push('CHAT')
  if (filters.gift === true) legacyEventTypes.push('GIFT')
  if (filters.like === true) legacyEventTypes.push('LIKE')
  if (filters.follow === true) legacyEventTypes.push('FOLLOW')
  if (filters.join === true) legacyEventTypes.push('JOIN')
  if (filters.share === true) legacyEventTypes.push('SHARE')
  if (filters.absent === true) legacyEventTypes.push('ABSENT')

  return legacyEventTypes.length ? legacyEventTypes : defaultChatEventTypes
}

function isChatEventSource(value: string): value is ChatEventSource {
  return (
    value === 'CHAT' ||
    value === 'GIFT' ||
    value === 'LIKE' ||
    value === 'FOLLOW' ||
    value === 'JOIN' ||
    value === 'SHARE' ||
    value === 'ABSENT'
  )
}

function getThemeOptionsForKind(
  templates: ThemeStudioTemplate[],
  kind: OverlayKind,
): StudioThemeOption[] {
  if (kind === 'CHAT') {
    return chatOverlayThemes.map((theme) => ({
      id: theme.id,
      name: theme.name,
      description: theme.description,
      kind: 'CHAT',
      schema: theme.schema,
      chatTheme: theme,
    }))
  }

  const directTemplates = templates.filter((template) => template.kind === kind)

  if (directTemplates.length) {
    return directTemplates.slice(0, 8)
  }

  return [createFallbackTemplate(templates, kind)]
}

function resolveInitialTheme(
  themes: StudioThemeOption[],
  savedDesign: ThemeStudioSavedDesign | null,
) {
  if (!savedDesign) {
    return themes[0]
  }

  return (
    themes.find(
      (theme) =>
        normalizeThemeName(theme.name) === normalizeThemeName(savedDesign.name),
    ) ?? themes[0]
  )
}

function createFallbackTemplate(
  templates: ThemeStudioTemplate[],
  kind: OverlayKind,
): StudioThemeOption {
  const source =
    templates.find((template) => template.kind === 'CHAT') ?? templates[0]
  const meta = kindMeta[kind] ?? kindMeta.CHAT
  const schema = normalizeDesignSchema({
    ...source.schema,
    kind,
    name: meta.title,
    dataSource: {
      ...source.schema.dataSource,
      type: kind === 'DOCK' ? 'dock' : kind.toLowerCase(),
    },
  })

  return {
    id: `${kind.toLowerCase()}-default-theme`,
    name: meta.title,
    description: meta.subtitle,
    kind,
    schema,
  }
}

function normalizeStudioKind(kind: OverlayKind) {
  return studioKinds.includes(kind) ? kind : 'CHAT'
}

function normalizeThemeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '')
}

function withAlpha(color: string, alpha: number) {
  if (color.startsWith('rgba(') || color.startsWith('rgb(')) {
    return color
  }

  const normalized = color.replace('#', '')
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((character) => character + character)
          .join('')
      : normalized.slice(0, 6)

  if (!/^[\da-f]{6}$/i.test(value)) {
    return color
  }

  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)

  return `rgba(${red},${green},${blue},${alpha})`
}
