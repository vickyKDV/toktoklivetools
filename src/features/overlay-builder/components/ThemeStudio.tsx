"use client";

import Link from "next/link";
import { ArrowLeft, Copy, Eye, Monitor, Palette, Save, Settings2, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { OverlayKind } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { ExternalLinkButton } from "@/components/ui/external-link-button";
import { Input } from "@/components/ui/input";
import { OverlayThumbnail } from "@/features/overlay-builder/components/OverlayThumbnail";
import { normalizeDesignSchema } from "@/core/overlay/normalizeDesignSchema";
import type { OverlayDesignSchema } from "@/core/overlay/schema";

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

type ThemeStudioProps = {
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

const kindTabs: Array<{ kind: OverlayKind; label: string }> = [
  { kind: "CHAT", label: "Chat" },
  { kind: "GIFT", label: "Gift" },
  { kind: "LEADERBOARD", label: "Leaderboard" },
  { kind: "STATIC", label: "Static" },
  { kind: "GOAL", label: "Goal" }
];

const animationOptions = [
  { value: "fade", label: "Fade" },
  { value: "slide-up", label: "Slide Up" },
  { value: "slide-down", label: "Slide Down" },
  { value: "slide-left", label: "Slide Left" },
  { value: "slide-right", label: "Slide Right" },
  { value: "scale", label: "Scale" },
  { value: "pop", label: "Pop" }
];

export function ThemeStudio({
  workspaceId,
  workspaceName,
  initialKind = "CHAT",
  initialDesignId = null,
  initialDesigns,
  templates
}: ThemeStudioProps) {
  const initialSavedDesign = initialDesigns.find((design) => design.id === initialDesignId) ?? null;
  const initialTemplate = templates.find((template) => template.kind === (initialSavedDesign?.kind ?? initialKind)) ?? templates[0];
  const [selectedKind, setSelectedKind] = useState<OverlayKind>(initialSavedDesign?.kind ?? initialTemplate.kind);
  const [selectedTemplateId, setSelectedTemplateId] = useState(initialSavedDesign ? "" : initialTemplate.id);
  const [designId, setDesignId] = useState<string | null>(initialSavedDesign?.id ?? null);
  const [name, setName] = useState(initialSavedDesign?.name ?? initialTemplate.name);
  const [enterAnimation, setEnterAnimation] = useState(initialSavedDesign?.schema.layout.enterAnimation ?? initialTemplate.schema.layout.enterAnimation);
  const [exitAnimation, setExitAnimation] = useState(initialSavedDesign?.schema.layout.exitAnimation ?? initialTemplate.schema.layout.exitAnimation);
  const [animationDurationMs, setAnimationDurationMs] = useState(initialSavedDesign?.schema.layout.animationDurationMs ?? initialTemplate.schema.layout.animationDurationMs);
  const [autoCloseMs, setAutoCloseMs] = useState(initialSavedDesign?.schema.layout.autoCloseMs ?? initialTemplate.schema.layout.autoCloseMs);
  const [chatMaxItems, setChatMaxItems] = useState(Math.min(initialSavedDesign?.schema.layout.maxItems ?? initialTemplate.schema.layout.maxItems, 10));
  const [savedDesigns, setSavedDesigns] = useState(initialDesigns);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [browserOrigin, setBrowserOrigin] = useState("");
  const [outputUrl, setOutputUrl] = useState("");
  const templatesForKind = useMemo(() => templates.filter((template) => template.kind === selectedKind), [selectedKind, templates]);
  const selectedTemplate = templates.find((template) => template.id === selectedTemplateId) ?? templatesForKind[0] ?? templates[0];
  const activeSavedDesign = designId ? savedDesigns.find((design) => design.id === designId) ?? null : null;
  const sourceSchema = activeSavedDesign?.schema ?? selectedTemplate.schema;
  const previewSchema = useMemo(() => {
    const source = sourceSchema;

    return applyThemeSettings(source, {
      name,
      kind: selectedKind,
      enterAnimation,
      exitAnimation,
      animationDurationMs,
      autoCloseMs,
      maxItems: selectedKind === "CHAT" ? chatMaxItems : source.layout.maxItems
    });
  }, [autoCloseMs, chatMaxItems, enterAnimation, exitAnimation, animationDurationMs, name, selectedKind, sourceSchema]);

  useEffect(() => {
    setBrowserOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (!browserOrigin || !designId) {
      return;
    }

    setOutputUrl(`${browserOrigin}/overlay/${selectedKind.toLowerCase()}/${designId}`);
  }, [browserOrigin, designId, selectedKind]);

  function selectKind(kind: OverlayKind) {
    const nextTemplate = templates.find((template) => template.kind === kind) ?? templates[0];

    setSelectedKind(kind);
    setSelectedTemplateId(nextTemplate.id);
    setDesignId(null);
    setName(nextTemplate.name);
    setEnterAnimation(nextTemplate.schema.layout.enterAnimation);
    setExitAnimation(nextTemplate.schema.layout.exitAnimation);
    setAnimationDurationMs(nextTemplate.schema.layout.animationDurationMs);
    setAutoCloseMs(nextTemplate.schema.layout.autoCloseMs);
    setChatMaxItems(Math.min(nextTemplate.schema.layout.maxItems, 10));
    setOutputUrl("");
    setStatus("");
  }

  function selectTemplate(template: ThemeStudioTemplate) {
    setSelectedTemplateId(template.id);
    setDesignId(null);
    setName(template.name);
    setEnterAnimation(template.schema.layout.enterAnimation);
    setExitAnimation(template.schema.layout.exitAnimation);
    setAnimationDurationMs(template.schema.layout.animationDurationMs);
    setAutoCloseMs(template.schema.layout.autoCloseMs);
    setChatMaxItems(Math.min(template.schema.layout.maxItems, 10));
    setOutputUrl("");
    setStatus("");
  }

  function selectSavedDesign(design: ThemeStudioSavedDesign) {
    setSelectedKind(design.kind);
    setSelectedTemplateId("");
    setDesignId(design.id);
    setName(design.name);
    setEnterAnimation(design.schema.layout.enterAnimation);
    setExitAnimation(design.schema.layout.exitAnimation);
    setAnimationDurationMs(design.schema.layout.animationDurationMs);
    setAutoCloseMs(design.schema.layout.autoCloseMs);
    setChatMaxItems(Math.min(design.schema.layout.maxItems, 10));
    setOutputUrl(browserOrigin ? `${browserOrigin}/overlay/${design.kind.toLowerCase()}/${design.id}` : "");
    setStatus("");
  }

  async function applyTheme() {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch(designId ? `/api/overlays/${designId}` : "/api/overlays", {
        method: designId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name,
          schema: previewSchema,
          kind: selectedKind,
          overlayType: selectedKind === "CHAT" ? "CHAT_STYLE" : "CUSTOM_OVERLAY",
          publish: true
        })
      });
      const data = await response.json() as SaveResponse;

      if (!response.ok || !data.ok || !data.design) {
        setStatus(data.message ?? "Theme gagal disimpan.");
        return;
      }

      setDesignId(data.design.id);
      setSavedDesigns((current) => upsertSavedDesign(current, data.design!));
      const url = `${browserOrigin || window.location.origin}/overlay/${data.design.kind.toLowerCase()}/${data.design.id}`;

      setOutputUrl(url);
      await navigator.clipboard?.writeText(url);
      setStatus("Theme diterapkan dan link OBS sudah dicopy.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Server tidak merespon saat menyimpan theme.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/workspaces/${workspaceId}/overlays`}>
                  <ArrowLeft />
                  Overlays
                </Link>
              </Button>
              <h1 className="text-2xl font-semibold tracking-normal">Overlay Theme Studio</h1>
              <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{workspaceName}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Pilih theme siap pakai, atur animasi show/hide, lalu publish tanpa membuka design builder.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/dashboard/workspaces/${workspaceId}/overlay-design-builder?advanced=1${designId ? `&overlayId=${designId}` : ""}`}>
              <SlidersHorizontal />
              Advanced Builder
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[20rem_minmax(0,1fr)_22rem]">
        <aside className="grid gap-4 xl:sticky xl:top-4">
          <section className="grid gap-3 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Palette className="size-4 text-primary" />
              <p className="text-sm font-semibold">Overlay Type</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {kindTabs.map((tab) => (
                <button
                  key={tab.kind}
                  type="button"
                  onClick={() => selectKind(tab.kind)}
                  className={`rounded-md border px-3 py-2 text-left text-sm font-semibold transition-colors ${selectedKind === tab.kind ? "border-primary bg-primary/15 text-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </section>

          <section className="grid max-h-[34rem] gap-3 overflow-y-auto rounded-lg border bg-card p-4">
            <p className="text-sm font-semibold">Theme Preset</p>
            {templatesForKind.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => selectTemplate(template)}
                className={`rounded-md border p-4 text-left transition-colors ${selectedTemplateId === template.id ? "border-primary bg-primary/15" : "bg-background hover:bg-muted"}`}
              >
                <span className="block text-sm font-semibold">{template.name}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{template.description}</span>
              </button>
            ))}
          </section>

          {savedDesigns.length ? (
            <section className="grid gap-3 rounded-lg border bg-card p-4">
              <p className="text-sm font-semibold">Published Overlay</p>
              {savedDesigns.slice(0, 6).map((design) => (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => selectSavedDesign(design)}
                  className={`rounded-md border p-3 text-left transition-colors ${designId === design.id ? "border-primary bg-primary/15" : "bg-background hover:bg-muted"}`}
                >
                  <span className="block truncate text-sm font-semibold">{design.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{design.kind} · {design.publishedAt ? "Published" : "Draft"}</span>
                </button>
              ))}
            </section>
          ) : null}
        </aside>

        <main className="grid min-w-0 gap-5">
          <section className="grid min-h-[34rem] place-items-center overflow-hidden rounded-lg border bg-[radial-gradient(circle_at_1px_1px,hsl(var(--border))_1px,transparent_0)] [background-size:36px_36px] p-6">
            <div className="w-full max-w-3xl">
              <OverlayThumbnail schema={previewSchema} />
            </div>
          </section>

          {outputUrl ? (
            <section className="grid gap-3 rounded-lg border bg-card p-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto] lg:items-center">
              <Input readOnly value={outputUrl} className="font-mono text-xs" />
              <CopyButton value={outputUrl} />
              <ExternalLinkButton href={`/overlay-preview/${designId}`} variant="outline">
                <Eye />
                Preview
              </ExternalLinkButton>
              <ExternalLinkButton href={`/overlay/${selectedKind.toLowerCase()}/${designId}`} variant="outline">
                <Monitor />
                OBS
              </ExternalLinkButton>
            </section>
          ) : null}
        </main>

        <aside className="grid gap-4 xl:sticky xl:top-4">
          <section className="grid gap-4 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <Settings2 className="size-4 text-primary" />
              <p className="text-sm font-semibold">Theme Settings</p>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Overlay name
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </label>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <label className="grid gap-2 text-sm font-medium">
                Show animation
                <select value={enterAnimation} onChange={(event) => setEnterAnimation(event.target.value)} className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {animationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label className="grid gap-2 text-sm font-medium">
                Hide animation
                <select value={exitAnimation} onChange={(event) => setExitAnimation(event.target.value)} className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  {animationOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <label className="grid gap-2 text-sm font-medium">
              Animation duration: {animationDurationMs}ms
              <input type="range" min={120} max={2000} step={20} value={animationDurationMs} onChange={(event) => setAnimationDurationMs(Number(event.target.value))} />
            </label>
            <label className="grid gap-2 text-sm font-medium">
              Auto hide: {autoCloseMs === 0 ? "Off" : `${autoCloseMs}ms`}
              <input type="range" min={0} max={30000} step={500} value={autoCloseMs} onChange={(event) => setAutoCloseMs(Number(event.target.value))} />
            </label>
            {selectedKind === "CHAT" ? (
              <label className="grid gap-2 text-sm font-medium">
                Chat list max: {chatMaxItems}
                <input type="range" min={1} max={10} step={1} value={chatMaxItems} onChange={(event) => setChatMaxItems(Number(event.target.value))} />
              </label>
            ) : null}
            <Button type="button" onClick={applyTheme} disabled={saving || !name.trim()}>
              {saving ? <Save /> : <Copy />}
              {saving ? "Saving..." : "Apply & Copy Link"}
            </Button>
            {status ? <p className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">{status}</p> : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function applyThemeSettings(
  schema: OverlayDesignSchema,
  settings: {
    name: string;
    kind: OverlayKind;
    enterAnimation: string;
    exitAnimation: string;
    animationDurationMs: number;
    autoCloseMs: number;
    maxItems: number;
  }
) {
  return normalizeDesignSchema({
    ...structuredClone(schema),
    name: settings.name,
    kind: settings.kind,
    layout: {
      ...schema.layout,
      enterAnimation: settings.enterAnimation,
      exitAnimation: settings.exitAnimation,
      animationDurationMs: settings.animationDurationMs,
      autoCloseMs: settings.autoCloseMs,
      maxItems: Math.min(settings.maxItems, settings.kind === "CHAT" ? 10 : 100)
    }
  });
}

function upsertSavedDesign(designs: ThemeStudioSavedDesign[], design: ThemeStudioSavedDesign) {
  const next = designs.filter((item) => item.id !== design.id);

  return [design, ...next];
}
