"use client";

import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Gift,
  Image as ImageIcon,
  MessageSquare,
  Monitor,
  Palette,
  Play,
  Rocket,
  SlidersHorizontal,
  Target,
  Trophy
} from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { OverlayKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { ExternalLinkButton } from "@/components/ui/external-link-button";
import { Input } from "@/components/ui/input";
import { OverlayThumbnail } from "@/features/overlay-builder/components/OverlayThumbnail";
import { normalizeDesignSchema } from "@/core/overlay/normalizeDesignSchema";
import type { OverlayComponentSchema, OverlayDesignSchema } from "@/core/overlay/schema";

export type ThemeStudioTemplate = {
  id: string;
  name: string;
  description: string;
  kind: OverlayKind;
  schema: OverlayDesignSchema;
};

export type ThemeStudioSavedDesign = {
  id: string;
  name: string;
  kind: OverlayKind;
  schema: OverlayDesignSchema;
  publishedAt?: string | null;
};

type ThemeStudioPageProps = {
  workspaceId: string;
  workspaceName: string;
  initialKind?: OverlayKind;
  initialDesignId?: string | null;
  initialDesigns: ThemeStudioSavedDesign[];
  templates: ThemeStudioTemplate[];
};

type SaveResponse = {
  ok: boolean;
  message?: string;
  design?: ThemeStudioSavedDesign;
};

type AnimationSetting = {
  value: string;
  label: string;
};

type ThemeSettings = {
  name: string;
  enterAnimation: string;
  exitAnimation: string;
  animationDurationMs: number;
  autoCloseMs: number;
  chatMaxItems: number;
};

type PreviewVisual = {
  background: CSSProperties["background"];
  borderColor: string;
  glowColor: string;
  nameColor: string;
  textColor: string;
  badgeColor: string;
  badgeTextColor: string;
  radius: CSSProperties["borderRadius"];
};

const studioKinds: OverlayKind[] = ["CHAT", "GIFT", "LEADERBOARD", "DOCK", "GOAL", "STATIC"];
const previewCardTypes = new Set<OverlayComponentSchema["type"]>(["raw_card", "speech_bubble_card", "container", "bubble_card", "glass_card", "gradient_card"]);

const animationInOptions: AnimationSetting[] = [
  { value: "slide-right", label: "Slide In Right" },
  { value: "slide-up", label: "Slide In Up" },
  { value: "fade", label: "Fade In" },
  { value: "scale", label: "Scale In" },
  { value: "pop", label: "Pop In" }
];

const animationOutOptions: AnimationSetting[] = [
  { value: "fade", label: "Fade Out" },
  { value: "slide-left", label: "Slide Out Left" },
  { value: "slide-down", label: "Slide Out Down" },
  { value: "scale", label: "Scale Out" },
  { value: "pop", label: "Pop Out" }
];

const chatThemeAliases = [
  { sourceId: "chat-cyberpunk-neon", id: "chat-cyberpunk-neon", name: "Cyberpunk Neon" },
  { sourceId: "chat-modern-glass-card", id: "chat-modern-glass", name: "Modern Glass" },
  { sourceId: "chat-whatsapp-style-bubble", id: "chat-whatsapp-bubble", name: "WhatsApp Bubble" },
  { sourceId: "chat-dark-minimal-card", id: "chat-dark-minimal", name: "Dark Minimal" },
  { sourceId: "chat-gradient-bubble", id: "chat-gradient-bubble", name: "Gradient Bubble" },
  { sourceId: "chat-glow-bubble", id: "chat-neon-border", name: "Neon Border" },
  { sourceId: "chat-gaming-hud-style", id: "chat-luxury-gold", name: "Luxury Gold" },
  { sourceId: "chat-basic-rounded-white", id: "chat-minimal-white", name: "Minimal White" }
];

const kindMeta: Record<string, { title: string; subtitle: string; icon: typeof MessageSquare }> = {
  CHAT: {
    title: "Chat Overlay",
    subtitle: "Pilih tema dan animasi untuk chat overlay kamu.",
    icon: MessageSquare
  },
  GIFT: {
    title: "Gift Overlay",
    subtitle: "Pilih tema alert gift dan animasi masuk/keluar.",
    icon: Gift
  },
  LEADERBOARD: {
    title: "Leaderboard Overlay",
    subtitle: "Pilih style ranking yang siap dipakai untuk OBS.",
    icon: Trophy
  },
  DOCK: {
    title: "Dock Overlay",
    subtitle: "Atur tampilan dock komentar untuk workflow live.",
    icon: Monitor
  },
  GOAL: {
    title: "Goal Overlay",
    subtitle: "Pilih tampilan goal progress untuk live stream.",
    icon: Target
  },
  STATIC: {
    title: "Static Overlay",
    subtitle: "Pilih frame static atau media overlay siap publish.",
    icon: ImageIcon
  },
  CUSTOM: {
    title: "Custom Overlay",
    subtitle: "Theme custom tetap bisa dibuka lewat Advanced Builder.",
    icon: Palette
  }
};

export function ThemeStudioPage({
  workspaceId,
  workspaceName,
  initialKind = "CHAT",
  initialDesignId = null,
  initialDesigns,
  templates
}: ThemeStudioPageProps) {
  const resolvedInitialKind = normalizeStudioKind(initialDesigns.find((design) => design.id === initialDesignId)?.kind ?? initialKind);
  const initialThemeSet = getThemeTemplatesForKind(templates, resolvedInitialKind);
  const initialSavedDesign = initialDesigns.find((design) => design.id === initialDesignId) ?? null;
  const initialTemplate = resolveInitialTemplate(initialThemeSet, initialSavedDesign);
  const [selectedKind] = useState<OverlayKind>(resolvedInitialKind);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialTemplate.id);
  const [designId, setDesignId] = useState<string | null>(initialSavedDesign?.id ?? null);
  const [settings, setSettings] = useState<ThemeSettings>(() => createInitialSettings(initialSavedDesign?.schema ?? initialTemplate.schema, initialSavedDesign?.name ?? initialTemplate.name));
  const [savedDesigns, setSavedDesigns] = useState(initialDesigns);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [browserOrigin, setBrowserOrigin] = useState("");
  const [replayToken, setReplayToken] = useState(0);
  const themeTemplates = useMemo(() => getThemeTemplatesForKind(templates, selectedKind), [selectedKind, templates]);
  const selectedTemplate = useMemo(
    () => themeTemplates.find((template) => template.id === selectedTemplateId) ?? themeTemplates[0],
    [selectedTemplateId, themeTemplates]
  );
  const activeSavedDesign = designId ? savedDesigns.find((design) => design.id === designId) ?? null : null;
  const sourceSchema = activeSavedDesign?.schema ?? selectedTemplate.schema;
  const previewSchema = useMemo(
    () => applyThemeSettings(sourceSchema, selectedKind, settings),
    [settings, selectedKind, sourceSchema]
  );
  const outputUrl = designId && browserOrigin ? `${browserOrigin}/overlay/${selectedKind.toLowerCase()}/${designId}` : "";
  const meta = kindMeta[selectedKind] ?? kindMeta.CHAT;

  useEffect(() => {
    setBrowserOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    setReplayToken((current) => current + 1);
  }, [settings.animationDurationMs, settings.enterAnimation, settings.exitAnimation, selectedTemplateId]);

  const updateSettings = useCallback((patch: Partial<ThemeSettings>) => {
    setSettings((current) => ({
      ...current,
      ...patch
    }));
    setStatus("");
  }, []);

  const selectTemplate = useCallback((template: ThemeStudioTemplate) => {
    setSelectedTemplateId(template.id);
    setDesignId(null);
    setSettings(createInitialSettings(template.schema, template.name));
    setStatus("");
  }, []);

  const replayPreview = useCallback(() => {
    setReplayToken((current) => current + 1);
  }, []);

  const publishTheme = useCallback(async (options: { copyLink: boolean }) => {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch(designId ? `/api/overlays/${designId}` : "/api/overlays", {
        method: designId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: settings.name,
          schema: previewSchema,
          kind: selectedKind,
          overlayType: selectedKind === "CHAT" ? "CHAT_STYLE" : "CUSTOM_OVERLAY",
          publish: true
        })
      });
      const data = await response.json() as SaveResponse;

      if (!response.ok || !data.ok || !data.design) {
        setStatus(data.message ?? "Theme gagal dipublish.");
        return;
      }

      setDesignId(data.design.id);
      setSavedDesigns((current) => upsertSavedDesign(current, data.design!));

      const nextUrl = `${browserOrigin || window.location.origin}/overlay/${data.design.kind.toLowerCase()}/${data.design.id}`;

      if (options.copyLink) {
        try {
          await navigator.clipboard?.writeText(nextUrl);
          setStatus("Overlay dipublish dan link OBS sudah dicopy.");
        } catch {
          setStatus("Overlay dipublish. Copy link manual dari field URL.");
        }
      } else {
        setStatus("Overlay dipublish.");
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Server tidak merespon saat publish overlay.");
    } finally {
      setSaving(false);
    }
  }, [browserOrigin, designId, previewSchema, selectedKind, settings.name, workspaceId]);

  return (
    <ThemeStudioPageFrame>
      <header className="flex shrink-0 items-center justify-between gap-4 rounded-[18px] border border-[#202632] bg-[#101722]/92 px-5 py-4 shadow-[0_18px_50px_rgba(0,0,0,.22)]">
        <div className="flex min-w-0 items-center gap-4">
          <div className="grid size-11 shrink-0 place-items-center rounded-[14px] border border-violet-500/45 bg-violet-500/10 text-violet-300 shadow-[0_0_24px_rgba(139,92,246,.18)]">
            <meta.icon className="size-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="truncate text-2xl font-semibold tracking-normal text-white">{meta.title}</h1>
              <span className="rounded-full border border-violet-500/25 bg-violet-500/15 px-3 py-1 text-xs font-semibold text-violet-200">Live Preview</span>
            </div>
            <p className="mt-1 truncate text-sm text-slate-400">{meta.subtitle}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden rounded-full border border-[#2a2f3a] bg-[#0b111a] px-3 py-1 text-xs font-medium text-slate-400 lg:inline-flex">{workspaceName}</span>
          <Button asChild variant="outline" className="border-[#2a2f3a] bg-[#0d141f] text-slate-100 hover:bg-[#151e2c]">
            <Link href={`/dashboard/workspaces/${workspaceId}/overlay-design-builder?advanced=1${designId ? `&overlayId=${designId}` : ""}`}>
              <SlidersHorizontal />
              Advanced Builder
            </Link>
          </Button>
        </div>
      </header>

      <ThemeSettingsBar
        settings={settings}
        selectedKind={selectedKind}
        saving={saving}
        onChange={updateSettings}
        onApply={() => void publishTheme({ copyLink: true })}
      />

      <div
        className="grid min-h-0 flex-1 gap-4 overflow-hidden"
        style={{ gridTemplateColumns: "27rem minmax(0, 1fr)" }}
      >
        <ThemeCardGrid
          templates={themeTemplates}
          selectedTemplateId={selectedTemplateId}
          onSelect={selectTemplate}
        />
        <OverlayLivePreview
          schema={previewSchema}
          outputUrl={outputUrl}
          designId={designId}
          selectedKind={selectedKind}
          replayToken={replayToken}
          saving={saving}
          status={status}
          onReplay={replayPreview}
          onPublish={() => void publishTheme({ copyLink: false })}
        />
      </div>
    </ThemeStudioPageFrame>
  );
}

export function ThemeStudio(props: ThemeStudioPageProps) {
  return <ThemeStudioPage {...props} />;
}

function ThemeStudioPageFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-2 -my-2 flex h-[calc(100vh-8.5rem)] max-h-[calc(100vh-8.5rem)] min-h-0 flex-col gap-4 overflow-hidden rounded-[22px] border border-[#202632] bg-[#070b12] p-4 text-slate-100 shadow-[0_22px_70px_rgba(0,0,0,.34)]">
      {children}
    </div>
  );
}

const ThemeSettingsBar = memo(function ThemeSettingsBar({
  settings,
  selectedKind,
  saving,
  onChange,
  onApply
}: {
  settings: ThemeSettings;
  selectedKind: OverlayKind;
  saving: boolean;
  onChange: (patch: Partial<ThemeSettings>) => void;
  onApply: () => void;
}) {
  const autoHideEnabled = settings.autoCloseMs > 0;

  return (
    <section
      className="grid shrink-0 items-end gap-3 rounded-[18px] border border-[#202632] bg-[#0d131d]/95 px-4 py-3 shadow-[0_18px_55px_rgba(0,0,0,.18)]"
      style={{
        gridTemplateColumns: "minmax(126px,1fr) minmax(126px,1fr) minmax(138px,1fr) 74px minmax(118px,.82fr) 170px"
      }}
    >
      <div className="grid min-w-0 gap-2">
        <p className="text-xs font-semibold text-slate-300">Animation IN</p>
        <select
          value={settings.enterAnimation}
          onChange={(event) => onChange({ enterAnimation: event.target.value })}
          className="h-10 rounded-xl border border-[#2a2f3a] bg-[#080d15] px-3 text-sm font-medium text-slate-100 outline-none transition-colors hover:border-violet-500/45 focus:border-violet-400"
        >
          {animationInOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="grid min-w-0 gap-2">
        <p className="text-xs font-semibold text-slate-300">Animation OUT</p>
        <select
          value={settings.exitAnimation}
          onChange={(event) => onChange({ exitAnimation: event.target.value })}
          className="h-10 rounded-xl border border-[#2a2f3a] bg-[#080d15] px-3 text-sm font-medium text-slate-100 outline-none transition-colors hover:border-violet-500/45 focus:border-violet-400"
        >
          {animationOutOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </div>
      <div className="grid min-w-0 gap-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-300">Duration</p>
          <span className="text-xs font-semibold text-slate-200">{settings.animationDurationMs}ms</span>
        </div>
        <input
          type="range"
          min={160}
          max={1600}
          step={20}
          value={settings.animationDurationMs}
          onChange={(event) => onChange({ animationDurationMs: Number(event.target.value) })}
          className="accent-cyan-400"
        />
      </div>
      <div className="grid min-w-0 gap-2">
        <p className="text-xs font-semibold text-slate-300">Auto Hide</p>
        <button
          type="button"
          onClick={() => onChange({ autoCloseMs: autoHideEnabled ? 0 : 5000 })}
          className={`relative h-8 w-14 rounded-full border transition-colors ${autoHideEnabled ? "border-cyan-400/50 bg-cyan-400/30" : "border-[#2a2f3a] bg-slate-700/50"}`}
          aria-pressed={autoHideEnabled}
        >
          <span className={`absolute top-1 size-6 rounded-full bg-white transition-transform ${autoHideEnabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </div>
      <div className={`grid min-w-0 gap-2 ${selectedKind === "CHAT" ? "" : "opacity-40"}`}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-300">Chat List Max</p>
          <span className="text-xs font-semibold text-slate-200">{selectedKind === "CHAT" ? settings.chatMaxItems : "-"}</span>
        </div>
        <input
          type="range"
          min={1}
          max={10}
          step={1}
          disabled={selectedKind !== "CHAT"}
          value={settings.chatMaxItems}
          onChange={(event) => onChange({ chatMaxItems: Number(event.target.value) })}
          className="accent-cyan-400 disabled:opacity-50"
        />
      </div>
      <Button
        type="button"
        onClick={onApply}
        disabled={saving || !settings.name.trim()}
        className="h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 px-5 font-semibold text-white shadow-[0_0_28px_rgba(20,184,166,.22)] hover:from-emerald-400 hover:to-teal-400"
      >
        <Copy />
        {saving ? "Saving..." : "Apply & Copy Link"}
      </Button>
    </section>
  );
});

const ThemeCardGrid = memo(function ThemeCardGrid({
  templates,
  selectedTemplateId,
  onSelect
}: {
  templates: ThemeStudioTemplate[];
  selectedTemplateId: string;
  onSelect: (template: ThemeStudioTemplate) => void;
}) {
  return (
    <aside className="flex min-h-0 flex-col rounded-[18px] border border-[#202632] bg-[#0d131d]/95 p-4 shadow-[0_18px_55px_rgba(0,0,0,.18)]">
      <div className="mb-3 flex shrink-0 items-center gap-2">
        <Palette className="size-4 text-cyan-300" />
        <h2 className="text-base font-semibold text-white">Pilih Tema</h2>
      </div>
      <div className="theme-studio-scrollbar grid min-h-0 grid-cols-2 gap-3 overflow-y-auto pr-1">
        {templates.map((template) => (
          <ThemeCard
            key={template.id}
            template={template}
            selected={selectedTemplateId === template.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </aside>
  );
});

const ThemeCard = memo(function ThemeCard({
  template,
  selected,
  onSelect
}: {
  template: ThemeStudioTemplate;
  selected: boolean;
  onSelect: (template: ThemeStudioTemplate) => void;
}) {
  const displaySchema = useMemo(() => getDisplayPreviewSchema(template.schema), [template.schema]);

  return (
    <button
      type="button"
      onClick={() => onSelect(template)}
      className={`group relative overflow-hidden rounded-2xl border bg-[#090f18] p-2.5 text-left transition-colors ${selected ? "border-violet-500 shadow-[0_0_24px_rgba(139,92,246,.28)]" : "border-[#2a2f3a] hover:border-cyan-400/45"}`}
    >
      {selected ? (
        <span className="absolute right-2 top-2 z-10 grid size-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-white shadow-[0_0_18px_rgba(139,92,246,.45)]">
          <Check className="size-4" />
        </span>
      ) : null}
      <div className="overflow-hidden rounded-xl border border-[#1f2633] bg-[#050912]">
        <OverlayThumbnail schema={displaySchema} />
      </div>
      <p className="mt-3 truncate text-center text-sm font-semibold text-slate-100">{template.name}</p>
    </button>
  );
});

const OverlayLivePreview = memo(function OverlayLivePreview({
  schema,
  outputUrl,
  designId,
  selectedKind,
  replayToken,
  saving,
  status,
  onReplay,
  onPublish
}: {
  schema: OverlayDesignSchema;
  outputUrl: string;
  designId: string | null;
  selectedKind: OverlayKind;
  replayToken: number;
  saving: boolean;
  status: string;
  onReplay: () => void;
  onPublish: () => void;
}) {
  return (
    <section className="flex min-h-0 flex-col rounded-[18px] border border-[#202632] bg-[#0d131d]/95 p-4 shadow-[0_18px_55px_rgba(0,0,0,.18)]">
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Rocket className="size-4 text-violet-300" />
          <h2 className="text-base font-semibold text-white">Live Preview</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="size-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.55)]" />
            Realtime Preview
          </span>
          <Button type="button" variant="outline" size="sm" onClick={onReplay} className="border-[#2a2f3a] bg-[#080d15] text-slate-100 hover:bg-[#151e2c]">
            <Play />
            Replay
          </Button>
        </div>
      </div>
      <div className="relative min-h-[320px] flex-1 overflow-hidden rounded-2xl border border-[#161d29] bg-[#050814]">
        <LiveOverlayCanvas
          key={`${schema.name}-${schema.layout.enterAnimation}-${schema.layout.animationDurationMs}-${replayToken}`}
          schema={schema}
        />
      </div>
      <OverlayPublishBar
        outputUrl={outputUrl}
        designId={designId}
        selectedKind={selectedKind}
        saving={saving}
        status={status}
        onPublish={onPublish}
      />
    </section>
  );
});

const OverlayPublishBar = memo(function OverlayPublishBar({
  outputUrl,
  designId,
  selectedKind,
  saving,
  status,
  onPublish
}: {
  outputUrl: string;
  designId: string | null;
  selectedKind: OverlayKind;
  saving: boolean;
  status: string;
  onPublish: () => void;
}) {
  return (
    <div className="mt-3 grid shrink-0 grid-cols-[minmax(0,1fr)_auto_auto_auto] items-center gap-3">
      <div className="grid min-w-0 gap-1 rounded-2xl border border-[#202632] bg-[#080d15] px-4 py-3">
        <p className="text-xs font-semibold text-slate-400">Overlay URL</p>
        <Input
          readOnly
          value={outputUrl || "Publish overlay untuk membuat URL OBS"}
          className="h-7 border-0 bg-transparent px-0 font-mono text-xs text-slate-200 shadow-none focus-visible:ring-0"
        />
      </div>
      {outputUrl ? (
        <CopyButton value={outputUrl} />
      ) : (
        <Button type="button" variant="outline" disabled className="border-[#2a2f3a] bg-[#080d15]">
          <Copy />
        </Button>
      )}
      {outputUrl && designId ? (
        <ExternalLinkButton href={`/overlay-preview/${designId}`} variant="outline" className="border-[#2a2f3a] bg-[#080d15] text-slate-100 hover:bg-[#151e2c]">
          <ExternalLink />
          Preview in Browser
        </ExternalLinkButton>
      ) : (
        <Button type="button" variant="outline" disabled className="border-[#2a2f3a] bg-[#080d15]">
          <ExternalLink />
          Preview in Browser
        </Button>
      )}
      <Button
        type="button"
        onClick={onPublish}
        disabled={saving}
        className="h-11 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-5 font-semibold text-white shadow-[0_0_28px_rgba(124,58,237,.28)] hover:from-violet-500 hover:to-fuchsia-400"
      >
        <Rocket />
        {saving ? "Publishing..." : outputUrl ? "Publish Overlay" : "Create Overlay"}
      </Button>
      {status ? <p className="col-span-4 truncate text-xs font-medium text-slate-400">{status}</p> : null}
      {outputUrl && designId ? <span className="sr-only">{`/overlay/${selectedKind.toLowerCase()}/${designId}`}</span> : null}
    </div>
  );
});

function LiveOverlayCanvas({ schema }: { schema: OverlayDesignSchema }) {
  const visual = useMemo(() => getPreviewVisual(schema), [schema]);

  return (
    <div className="theme-preview-stage absolute inset-0 overflow-hidden">
      <div
        className="theme-preview-overlay pointer-events-none absolute inset-0 grid place-items-center px-10"
        style={{
          animationDuration: `${schema.layout.animationDurationMs}ms`,
          animationName: resolvePreviewAnimationName(schema.layout.enterAnimation)
        }}
      >
        <ThemePreviewCard schema={schema} visual={visual} />
      </div>
    </div>
  );
}

const ThemePreviewCard = memo(function ThemePreviewCard({
  schema,
  visual
}: {
  schema: OverlayDesignSchema;
  visual: PreviewVisual;
}) {
  const ghostCount = schema.kind === "CHAT" ? Math.min(3, Math.max(0, schema.layout.maxItems - 1)) : 0;

  return (
    <div className="relative grid size-full place-items-center">
      {Array.from({ length: ghostCount }).map((_, index) => (
        <div
          key={index}
          className="absolute h-[112px] w-[min(74%,700px)] rounded-[28px] border opacity-45"
          style={{
            background: visual.background,
            borderColor: visual.borderColor,
            boxShadow: `0 18px 40px ${hexToRgba(visual.glowColor, 0.12)}`,
            transform: `translate3d(${(index + 1) * 18}px, ${schema.layout.reverse ? -(index + 1) * 20 : (index + 1) * 20}px, 0) scale(${1 - (index + 1) * 0.045})`
          }}
        />
      ))}
      <div
        className="relative flex min-h-[132px] w-[min(82%,760px)] items-center gap-5 overflow-hidden border px-7 py-5"
        style={{
          background: visual.background,
          borderColor: visual.borderColor,
          borderRadius: visual.radius,
          boxShadow: `0 0 0 1px ${hexToRgba(visual.borderColor, 0.22)}, 0 28px 72px ${hexToRgba(visual.glowColor, 0.28)}`
        }}
      >
        <div
          className="grid size-20 shrink-0 place-items-center rounded-3xl border text-2xl font-black"
          style={{
            background: `linear-gradient(135deg, ${hexToRgba(visual.borderColor, 0.92)}, ${hexToRgba(visual.glowColor, 0.55)})`,
            borderColor: visual.borderColor,
            color: visual.badgeTextColor,
            boxShadow: `0 0 28px ${hexToRgba(visual.glowColor, 0.32)}`
          }}
        >
          V
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span
              className="rounded-full px-3 py-1 text-sm font-black"
              style={{ background: visual.badgeColor, color: visual.badgeTextColor }}
            >
              LIVE
            </span>
            <span className="truncate text-2xl font-black" style={{ color: visual.nameColor }}>
              @dailylife.ami
            </span>
          </div>
          <p className="truncate text-3xl font-semibold leading-tight" style={{ color: visual.textColor }}>
            Jangan lupa follow ya guys!
          </p>
        </div>
        <div className="grid shrink-0 gap-1 text-right text-xs font-semibold uppercase tracking-[.18em]" style={{ color: hexToRgba(visual.textColor, 0.62) }}>
          <span>{schema.kind}</span>
          <span>{Math.min(schema.layout.maxItems, 10)} max</span>
        </div>
      </div>
    </div>
  );
});

function createInitialSettings(schema: OverlayDesignSchema, name: string): ThemeSettings {
  return {
    name,
    enterAnimation: schema.layout.enterAnimation,
    exitAnimation: schema.layout.exitAnimation,
    animationDurationMs: schema.layout.animationDurationMs,
    autoCloseMs: schema.layout.autoCloseMs,
    chatMaxItems: Math.min(schema.layout.maxItems, 10)
  };
}

function getDisplayPreviewSchema(schema: OverlayDesignSchema) {
  return schema;
}

function getPreviewVisual(schema: OverlayDesignSchema): PreviewVisual {
  const primaryCard = findFirstComponent(schema.components, (component) => previewCardTypes.has(component.type));
  const nameComponent = findFirstComponent(schema.components, (component) => component.type === "viewer_name");
  const commentComponent = findFirstComponent(schema.components, (component) => component.type === "comment" || component.type === "gift_text");
  const badgeComponent = findFirstComponent(schema.components, (component) => component.type === "viewer_badge");
  const cardBackground = primaryCard?.style.background;
  const borderColor = primaryCard?.style.border?.color ?? schema.canvas.animation.color ?? "#8b5cf6";
  const glowColor = primaryCard?.style.shadow?.color ?? schema.canvas.animation.color2 ?? borderColor;

  return {
    background: resolvePreviewBackground(cardBackground, primaryCard?.style.backgroundColor),
    borderColor,
    glowColor,
    nameColor: nameComponent?.style.color ?? "#ffffff",
    textColor: commentComponent?.style.color ?? "#f8fafc",
    badgeColor: badgeComponent?.style.backgroundColor ?? borderColor,
    badgeTextColor: badgeComponent?.style.color ?? "#ffffff",
    radius: resolvePreviewRadius(primaryCard)
  };
}

function findFirstComponent(
  components: OverlayDesignSchema["components"],
  predicate: (component: OverlayComponentSchema) => boolean
): OverlayComponentSchema | null {
  for (const component of components) {
    if (predicate(component)) {
      return component;
    }

    const child = component.children?.length ? findFirstComponent(component.children, predicate) : null;

    if (child) {
      return child;
    }
  }

  return null;
}

function resolvePreviewBackground(
  background: OverlayComponentSchema["style"]["background"],
  fallbackColor?: string
): CSSProperties["background"] {
  if (!background) {
    return fallbackColor ?? "linear-gradient(135deg, rgba(17,24,39,.94), rgba(8,13,22,.96))";
  }

  if (background.type === "gradient") {
    return `linear-gradient(${background.angle ?? 135}deg, ${background.from ?? background.color}, ${background.to ?? "#111827"})`;
  }

  if (background.type === "glass") {
    return `linear-gradient(135deg, ${hexToRgba(background.from ?? background.color, 0.66)}, ${hexToRgba(background.to ?? "#0f172a", 0.42)})`;
  }

  return background.color ?? fallbackColor ?? "#111827";
}

function resolvePreviewRadius(component: OverlayComponentSchema | null): CSSProperties["borderRadius"] {
  const style = component?.style;
  const baseRadius = style?.radius ?? 28;
  const hasCornerRadius = typeof style?.radiusTopLeft === "number"
    || typeof style?.radiusTopRight === "number"
    || typeof style?.radiusBottomRight === "number"
    || typeof style?.radiusBottomLeft === "number";

  if (!hasCornerRadius) {
    return `${baseRadius}px`;
  }

  return [
    style?.radiusTopLeft ?? baseRadius,
    style?.radiusTopRight ?? baseRadius,
    style?.radiusBottomRight ?? baseRadius,
    style?.radiusBottomLeft ?? baseRadius
  ].map((value) => `${value}px`).join(" ");
}

function hexToRgba(color: string, alpha: number) {
  if (color === "transparent") {
    return `rgba(255,255,255,${alpha})`;
  }

  const normalized = color.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((character) => character + character).join("")
    : normalized.slice(0, 6);

  if (!/^[\da-f]{6}$/i.test(value)) {
    return color;
  }

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}

function applyThemeSettings(schema: OverlayDesignSchema, kind: OverlayKind, settings: ThemeSettings) {
  const maxItems = kind === "CHAT" ? settings.chatMaxItems : schema.layout.maxItems;
  const dataSourceType = kind === "CHAT"
    ? "chat"
    : kind === "GIFT"
      ? "gift"
      : kind === "LEADERBOARD"
        ? "leaderboard"
        : kind === "GOAL"
          ? "goal"
          : kind === "DOCK"
            ? "dock"
            : kind === "STATIC"
              ? "static"
              : schema.dataSource.type;

  return normalizeDesignSchema({
    ...structuredClone(schema),
    name: settings.name,
    kind,
    dataSource: {
      ...schema.dataSource,
      type: dataSourceType
    },
    layout: {
      ...schema.layout,
      animationDurationMs: settings.animationDurationMs,
      autoCloseMs: settings.autoCloseMs,
      enterAnimation: settings.enterAnimation,
      exitAnimation: settings.exitAnimation,
      maxItems
    }
  });
}

function getThemeTemplatesForKind(templates: ThemeStudioTemplate[], kind: OverlayKind) {
  if (kind === "CHAT") {
    const chatTemplates = chatThemeAliases
      .map((alias) => {
        const source = templates.find((template) => template.id === alias.sourceId);

        if (!source) {
          return null;
        }

        return {
          ...source,
          id: alias.id,
          name: alias.name,
          schema: normalizeDesignSchema({
            ...source.schema,
            name: alias.name,
            layout: {
              ...source.schema.layout,
              maxItems: Math.min(source.schema.layout.maxItems, 10)
            }
          })
        };
      })
      .filter((template): template is ThemeStudioTemplate => Boolean(template));

    if (chatTemplates.length) {
      return chatTemplates;
    }
  }

  const directTemplates = templates.filter((template) => template.kind === kind);

  if (directTemplates.length) {
    return directTemplates.slice(0, 8);
  }

  return [createFallbackTemplate(templates, kind)];
}

function resolveInitialTemplate(templates: ThemeStudioTemplate[], savedDesign: ThemeStudioSavedDesign | null) {
  if (!savedDesign) {
    return templates[0];
  }

  return templates.find((template) => normalizeThemeName(template.name) === normalizeThemeName(savedDesign.name)) ?? templates[0];
}

function createFallbackTemplate(templates: ThemeStudioTemplate[], kind: OverlayKind): ThemeStudioTemplate {
  const source = templates.find((template) => template.kind === "CHAT") ?? templates[0];
  const meta = kindMeta[kind] ?? kindMeta.CHAT;
  const schema = normalizeDesignSchema({
    ...source.schema,
    kind,
    name: meta.title,
    dataSource: {
      ...source.schema.dataSource,
      type: kind === "DOCK" ? "dock" : kind.toLowerCase()
    }
  });

  return {
    id: `${kind.toLowerCase()}-default-theme`,
    name: meta.title,
    description: meta.subtitle,
    kind,
    schema
  };
}

function normalizeStudioKind(kind: OverlayKind) {
  return studioKinds.includes(kind) ? kind : "CHAT";
}

function normalizeThemeName(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function upsertSavedDesign(designs: ThemeStudioSavedDesign[], design: ThemeStudioSavedDesign) {
  return [design, ...designs.filter((item) => item.id !== design.id)];
}

function resolvePreviewAnimationName(animation: string) {
  if (animation === "slide-up") {
    return "themePreviewSlideUp";
  }

  if (animation === "slide-down") {
    return "themePreviewSlideDown";
  }

  if (animation === "slide-left") {
    return "themePreviewSlideLeft";
  }

  if (animation === "slide-right") {
    return "themePreviewSlideRight";
  }

  if (animation === "scale") {
    return "themePreviewScale";
  }

  if (animation === "pop") {
    return "themePreviewPop";
  }

  return "themePreviewFade";
}
