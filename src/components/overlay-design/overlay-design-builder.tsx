"use client";

import Link from "next/link";
import {
  BadgeIcon,
  Check,
  Eye,
  EyeOff,
  ImageIcon,
  LayoutTemplate,
  MessageSquareText,
  MousePointer2,
  Plus,
  Save,
  Trash2,
  Type,
  User,
  Wand2
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  OverlayRenderer,
  overlayCustomDesignToRendererSchema
} from "@/components/overlay/OverlayRenderer";
import {
  cloneOverlayDesign,
  createBlankOverlayDesign,
  type OverlayDesignMode,
  type OverlayDesignThemeState,
  type SavedOverlayDesign,
  type SystemOverlayDesignTemplate
} from "@/lib/overlay-designs";
import type { OverlayCustomDesign, OverlayDesignElement, OverlayDesignElementKey } from "@/types/live";

type OverlayDesignBuilderProps = {
  workspaceId: string;
  workspaceName: string;
  overlayKey: string;
  widgetBaseUrl: string;
  initialState: OverlayDesignThemeState;
  systemTemplates: Record<OverlayDesignMode, SystemOverlayDesignTemplate[]>;
};

type BuilderSource = "new" | "system" | "workspace";
type StyleTarget = "canvas" | "component";

type BuilderDraft = {
  id: string | null;
  source: BuilderSource;
  mode: OverlayDesignMode;
  name: string;
  design: OverlayCustomDesign;
};

type ResizeHandle = "right" | "bottom" | "corner";

type ElementInteraction = {
  kind: "move" | "resize";
  key: OverlayDesignElementKey;
  handle?: ResizeHandle;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  coordinateRatioX: number;
  coordinateRatioY: number;
};

type ShadowState = {
  enabled: boolean;
  x: number;
  y: number;
  blur: number;
  color: string;
};

type SaveResponse = {
  ok: boolean;
  message?: string;
  design?: SavedOverlayDesign;
  selectedDesignIds?: Partial<Record<OverlayDesignMode, string>>;
};

const componentLibrary: {
  key: OverlayDesignElementKey;
  label: string;
  description: string;
  icon: ReactNode;
}[] = [
  {
    key: "profile",
    label: "Foto Profil",
    description: "Avatar realtime viewer.",
    icon: <ImageIcon className="size-4" />
  },
  {
    key: "name",
    label: "Nama",
    description: "Display name viewer.",
    icon: <User className="size-4" />
  },
  {
    key: "username",
    label: "Username",
    description: "Handle @username.",
    icon: <Type className="size-4" />
  },
  {
    key: "badge",
    label: "Badge",
    description: "Moderator/subscriber/follower.",
    icon: <BadgeIcon className="size-4" />
  },
  {
    key: "message",
    label: "Komentar",
    description: "Isi chat realtime.",
    icon: <MessageSquareText className="size-4" />
  },
  {
    key: "timestamp",
    label: "Timestamp",
    description: "Jam chat dipilih/masuk.",
    icon: <Type className="size-4" />
  }
];

const textElementKeys = new Set<OverlayDesignElementKey>(["name", "username", "badge", "message", "timestamp"]);

export function OverlayDesignBuilder({
  workspaceId,
  workspaceName,
  overlayKey,
  widgetBaseUrl,
  initialState,
  systemTemplates
}: OverlayDesignBuilderProps) {
  const [mode, setMode] = useState<OverlayDesignMode>("chat");
  const [workspaceDesigns, setWorkspaceDesigns] = useState(initialState.designs);
  const [selectedDesignIds, setSelectedDesignIds] = useState(initialState.selectedDesignIds);
  const [selectedElement, setSelectedElement] = useState<OverlayDesignElementKey>("message");
  const [selectedTarget, setSelectedTarget] = useState<StyleTarget>("component");
  const [draft, setDraft] = useState<BuilderDraft>(() => createInitialDraft("chat", initialState));
  const [makeActive, setMakeActive] = useState(true);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<ElementInteraction | null>(null);
  const [canvasScale, setCanvasScale] = useState(1);
  const selected = draft.design.elements[selectedElement];
  const activeDesignName = useMemo(() => {
    const selectedId = selectedDesignIds[mode];
    return workspaceDesigns[mode].find((item) => item.id === selectedId)?.name ?? "Belum ada";
  }, [mode, selectedDesignIds, workspaceDesigns]);
  const liveUrl = useMemo(() => {
    const selectedId = selectedDesignIds[mode];
    const params = new URLSearchParams();

    params.set(mode === "focus" ? "focusCustom" : "chatCustom", selectedId ? "1" : "0");

    if (selectedId) {
      params.set(mode === "focus" ? "focusDesignId" : "chatDesignId", selectedId);
    }

    if (mode === "focus") {
      return `${widgetBaseUrl}/widgets/chat-focus/spotlight/${overlayKey}?${params.toString()}`;
    }

    return `${widgetBaseUrl}/widgets/chat/hud/${overlayKey}?${params.toString()}`;
  }, [mode, overlayKey, selectedDesignIds, widgetBaseUrl]);

  useEffect(() => {
    const area = canvasAreaRef.current;

    if (!area) {
      return;
    }

    function updateCanvasScale() {
      const width = area?.clientWidth ?? draft.design.width;
      const nextScale = Math.min(1, Math.max(0.2, width / Math.max(1, draft.design.width)));

      setCanvasScale(nextScale);
    }

    updateCanvasScale();

    const observer = new ResizeObserver(updateCanvasScale);
    observer.observe(area);

    return () => observer.disconnect();
  }, [draft.design.width]);

  function switchMode(nextMode: OverlayDesignMode) {
    setMode(nextMode);
    setSelectedElement("message");
    setSelectedTarget("component");
    setDraft(createInitialDraft(nextMode, { designs: workspaceDesigns, selectedDesignIds }));
    setStatus("");
  }

  function updateDesign(patch: Partial<OverlayCustomDesign>) {
    setDraft((current) => ({
      ...current,
      design: {
        ...current.design,
        ...patch
      }
    }));
  }

  function updateElement(key: OverlayDesignElementKey, patch: Partial<OverlayDesignElement>) {
    setDraft((current) => ({
      ...current,
      design: {
        ...current.design,
        elements: {
          ...current.design.elements,
          [key]: {
            ...current.design.elements[key],
            ...patch
          }
        }
      }
    }));
  }

  function startFromBlank() {
    setDraft({
      id: null,
      source: "new",
      mode,
      name: mode === "focus" ? "Focus Chat Custom" : "Chat Overlay Custom",
      design: createBlankOverlayDesign(mode)
    });
    setSelectedElement("message");
    setSelectedTarget("component");
    setStatus("Canvas kosong siap didesain dari nol.");
  }

  function loadTemplate(template: SystemOverlayDesignTemplate) {
    setMode(template.mode);
    setDraft({
      id: null,
      source: "system",
      mode: template.mode,
      name: `${template.name} Copy`,
      design: cloneOverlayDesign(template.design)
    });
    setSelectedElement("message");
    setSelectedTarget("component");
    setStatus("Template sistem dibuka sebagai copy workspace. Simpan untuk membuat versi milik workspace.");
  }

  function loadWorkspaceDesign(design: SavedOverlayDesign) {
    setMode(design.mode);
    setDraft({
      id: design.id,
      source: "workspace",
      mode: design.mode,
      name: design.name,
      design: cloneOverlayDesign(design.design)
    });
    setSelectedElement("message");
    setSelectedTarget("component");
    setStatus("Desain workspace dibuka untuk diedit.");
  }

  async function saveDesign() {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/overlay-designs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: draft.source === "workspace" ? draft.id : undefined,
          mode: draft.mode,
          name: draft.name,
          design: draft.design,
          makeActive
        })
      });
      const data = (await response.json()) as SaveResponse;

      if (!response.ok || !data.ok || !data.design) {
        setStatus(data.message ?? "Desain gagal disimpan.");
        return;
      }

      setWorkspaceDesigns((current) => {
        const existingIndex = current[data.design!.mode].findIndex((item) => item.id === data.design!.id);
        const nextList = existingIndex >= 0
          ? current[data.design!.mode].map((item) => (item.id === data.design!.id ? data.design! : item))
          : [data.design!, ...current[data.design!.mode]];

        return {
          ...current,
          [data.design!.mode]: nextList
        };
      });
      setSelectedDesignIds(data.selectedDesignIds ?? selectedDesignIds);
      setDraft({
        id: data.design.id,
        source: "workspace",
        mode: data.design.mode,
        name: data.design.name,
        design: cloneOverlayDesign(data.design.design)
      });
      setStatus(data.message ?? "Desain berhasil disimpan.");
    } catch {
      setStatus("Server tidak merespon saat menyimpan desain.");
    } finally {
      setSaving(false);
    }
  }

  async function setActiveDesign(designId: string | null) {
    const response = await fetch(`/api/workspaces/${workspaceId}/overlay-designs`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode,
        selectedDesignId: designId
      })
    });
    const data = (await response.json()) as SaveResponse;

    if (!response.ok || !data.ok) {
      setStatus(data.message ?? "Gagal mengubah desain aktif.");
      return;
    }

    setSelectedDesignIds(data.selectedDesignIds ?? {});
    setStatus(data.message ?? "Desain aktif diperbarui.");
  }

  async function deleteDesign(design: SavedOverlayDesign) {
    const response = await fetch(`/api/workspaces/${workspaceId}/overlay-designs`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        mode: design.mode,
        id: design.id
      })
    });
    const data = (await response.json()) as SaveResponse;

    if (!response.ok || !data.ok) {
      setStatus(data.message ?? "Gagal menghapus desain.");
      return;
    }

    setWorkspaceDesigns((current) => ({
      ...current,
      [design.mode]: current[design.mode].filter((item) => item.id !== design.id)
    }));
    setSelectedDesignIds(data.selectedDesignIds ?? {});

    if (draft.id === design.id) {
      startFromBlank();
    }

    setStatus(data.message ?? "Desain dihapus.");
  }

  function startElementDrag(event: ReactPointerEvent<HTMLDivElement>, key: OverlayDesignElementKey) {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedElement(key);
    setSelectedTarget("component");

    interactionRef.current = {
      kind: "move",
      key,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: draft.design.elements[key].x,
      startY: draft.design.elements[key].y,
      startWidth: draft.design.elements[key].width,
      startHeight: draft.design.elements[key].height,
      coordinateRatioX: draft.design.width / rect.width,
      coordinateRatioY: draft.design.height / rect.height
    };
  }

  function moveElementDrag(event: ReactPointerEvent<HTMLElement>) {
    const interaction = interactionRef.current;

    if (!interaction) {
      return;
    }

    const deltaX = (event.clientX - interaction.startClientX) * interaction.coordinateRatioX;
    const deltaY = (event.clientY - interaction.startClientY) * interaction.coordinateRatioY;

    if (interaction.kind === "resize") {
      updateElement(interaction.key, {
        width: Math.max(20, Math.round(
          interaction.handle === "right" || interaction.handle === "corner"
            ? interaction.startWidth + deltaX
            : interaction.startWidth
        )),
        height: Math.max(16, Math.round(
          interaction.handle === "bottom" || interaction.handle === "corner"
            ? interaction.startHeight + deltaY
            : interaction.startHeight
        ))
      });
      return;
    }

    updateElement(interaction.key, {
      x: Math.round(interaction.startX + deltaX),
      y: Math.round(interaction.startY + deltaY)
    });
  }

  function stopElementDrag() {
    interactionRef.current = null;
  }

  function startElementResize(event: ReactPointerEvent<HTMLButtonElement>, key: OverlayDesignElementKey, handle: ResizeHandle) {
    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedElement(key);
    setSelectedTarget("component");

    const element = draft.design.elements[key];
    interactionRef.current = {
      kind: "resize",
      key,
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startX: element.x,
      startY: element.y,
      startWidth: element.width,
      startHeight: element.height,
      coordinateRatioX: draft.design.width / rect.width,
      coordinateRatioY: draft.design.height / rect.height
    };
  }

  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    const key = event.dataTransfer.getData("application/x-overlay-component") as OverlayDesignElementKey;

    if (!componentLibrary.some((item) => item.key === key)) {
      return;
    }

    const rect = canvasRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const element = draft.design.elements[key];
    updateElement(key, {
      visible: true,
      x: Math.round(((event.clientX - rect.left) / rect.width) * draft.design.width - element.width / 2),
      y: Math.round(((event.clientY - rect.top) / rect.height) * draft.design.height - element.height / 2)
    });
    setSelectedElement(key);
    setSelectedTarget("component");
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-normal">Overlay Design Builder</h1>
              <Badge variant="outline">{workspaceName}</Badge>
              <Badge variant={selectedDesignIds[mode] ? "default" : "secondary"}>Aktif: {activeDesignName}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Buat desain Chat Overlay dan Focus Chat dari nol atau copy template sistem. Semua desain tersimpan khusus workspace ini.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={mode === "chat" ? "default" : "outline"} onClick={() => switchMode("chat")}>
              Chat Overlay
            </Button>
            <Button type="button" variant={mode === "focus" ? "default" : "outline"} onClick={() => switchMode("focus")}>
              Focus Chat
            </Button>
            <Button asChild variant="outline">
              <Link href={liveUrl} target="_blank">Preview Aktif</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-5 lg:grid-cols-2 xl:grid-cols-[20rem_minmax(0,1fr)_25rem] 2xl:grid-cols-[21rem_minmax(0,1fr)_26rem]">
        <aside className="order-3 grid content-start gap-5 lg:order-2 xl:sticky xl:top-4 xl:order-1 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:pr-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="size-4" />
                Component Library
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {componentLibrary.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  draggable
                  onDragStart={(event) => event.dataTransfer.setData("application/x-overlay-component", item.key)}
                  onClick={() => {
                    updateElement(item.key, { visible: true });
                    setSelectedElement(item.key);
                    setSelectedTarget("component");
                  }}
                  className="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    {item.icon}
                    {item.label}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">{item.description}</span>
                </button>
              ))}
              <p className="text-xs text-muted-foreground">Drag component ke canvas atau klik untuk menampilkan component.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutTemplate className="size-4" />
                Template Sistem
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button type="button" variant="outline" onClick={startFromBlank}>
                <Wand2 />
                Mulai Dari Nol
              </Button>
              {systemTemplates[mode].map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => loadTemplate(template)}
                  className="rounded-lg border bg-card p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="block text-sm font-semibold">{template.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{template.description}</span>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Desain Workspace</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {workspaceDesigns[mode].length ? (
                workspaceDesigns[mode].map((design) => (
                  <div key={design.id} className="rounded-lg border p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button type="button" className="min-w-0 text-left" onClick={() => loadWorkspaceDesign(design)}>
                        <span className="block truncate text-sm font-semibold">{design.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {selectedDesignIds[mode] === design.id ? "Sedang aktif" : "Klik untuk edit"}
                        </span>
                      </button>
                      <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => deleteDesign(design)}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="mt-3 w-full" onClick={() => setActiveDesign(design.id)}>
                      <Check />
                      Jadikan Aktif
                    </Button>
                  </div>
                ))
              ) : (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Belum ada desain custom untuk mode ini.
                </p>
              )}
              {selectedDesignIds[mode] ? (
                <Button type="button" variant="outline" onClick={() => setActiveDesign(null)}>
                  Nonaktifkan Custom Design
                </Button>
              ) : null}
            </CardContent>
          </Card>
        </aside>

        <main className="order-2 grid min-w-0 content-start gap-5 lg:col-span-2 xl:order-2 xl:col-span-1">
          <Card>
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div className="space-y-2">
                <Label htmlFor="designName">Nama Design</Label>
                <Input
                  id="designName"
                  value={draft.name}
                  onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={makeActive}
                    onChange={(event) => setMakeActive(event.target.checked)}
                    className="size-4 accent-primary"
                  />
                  Aktifkan setelah simpan
                </label>
                <Button type="button" onClick={saveDesign} disabled={saving}>
                  <Save />
                  {saving ? "Menyimpan..." : "Save ke Workspace"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2">
                <MousePointer2 className="size-4" />
                Base Canvas
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 overflow-hidden bg-muted/40 p-4">
              <div
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleCanvasDrop}
                className="relative min-w-0 overflow-auto rounded-lg border bg-zinc-950/5 p-10 shadow-inner sm:p-16 xl:p-20"
                style={{ minHeight: Math.max(460, Math.min(draft.design.height * canvasScale + 220, 820)) }}
              >
                <div ref={canvasAreaRef} className="flex min-h-full min-w-0 items-start justify-center">
                  <div
                    style={{
                      width: draft.design.width * canvasScale,
                      height: draft.design.height * canvasScale
                    }}
                  >
                  <div
                    ref={canvasRef}
                    className={`relative overflow-visible rounded-lg border border-dashed bg-[linear-gradient(45deg,#d1d5db_25%,transparent_25%),linear-gradient(-45deg,#d1d5db_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#d1d5db_75%),linear-gradient(-45deg,transparent_75%,#d1d5db_75%)] bg-[length:28px_28px] bg-[position:0_0,0_14px,14px_-14px,-14px_0] shadow-2xl ${
                      selectedTarget === "canvas" ? "border-primary ring-2 ring-primary/40" : "border-primary/60"
                    }`}
                    style={{
                      width: draft.design.width,
                      height: draft.design.height,
                      transform: `scale(${canvasScale})`,
                      transformOrigin: "top left"
                    }}
                  >
                    <OverlayRenderer
                      schema={overlayCustomDesignToRendererSchema(draft.design)}
                      className="overflow-visible"
                      onCanvasPointerDown={() => setSelectedTarget("canvas")}
                      getElementProps={(key) => ({
                        role: "button",
                        tabIndex: 0,
                        onPointerDown: (event) => startElementDrag(event, key),
                        onPointerMove: moveElementDrag,
                        onPointerUp: stopElementDrag,
                        onPointerCancel: stopElementDrag
                      })}
                      elementClassName={(key) => `cursor-move select-none outline-none transition ${
                        selectedTarget === "component" && selectedElement === key
                          ? "ring-2 ring-primary ring-offset-2"
                          : "hover:ring-1 hover:ring-primary"
                      }`}
                      renderElement={({ elementKey, elementStyle }) => (
                        <CanvasElement elementKey={elementKey} elementStyle={elementStyle} mode={mode} />
                      )}
                      renderElementOverlay={({ elementKey }) => (
                        selectedTarget === "component" && selectedElement === elementKey ? (
                          <ResizeHandles
                            elementKey={elementKey}
                            onResizeStart={startElementResize}
                            onResizeMove={moveElementDrag}
                            onResizeEnd={stopElementDrag}
                          />
                        ) : null
                      )}
                    />
                  </div>
                  </div>
                </div>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Base canvas hanya area kerja. Overlay canvas adalah frame yang tampil di OBS. Elemen boleh keluar dari overlay canvas.
              </p>
            </CardContent>
          </Card>

          {status ? (
            <p className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">{status}</p>
          ) : null}
        </main>

        <aside className="order-1 grid content-start gap-5 lg:order-1 xl:sticky xl:top-4 xl:order-3 xl:max-h-[calc(100vh-2rem)]">
          <Card className="flex min-h-0 flex-col overflow-hidden xl:max-h-[calc(100vh-2rem)]">
            <CardHeader className="border-b">
              <CardTitle>Selected Settings</CardTitle>
            </CardHeader>
            <CardContent className="min-h-0 overflow-visible p-4 xl:overflow-y-auto">
              <div className="sticky top-0 z-20 -mx-4 -mt-4 mb-4 bg-card px-4 pt-4">
                <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/30 p-1">
                  <button
                    type="button"
                    onClick={() => setSelectedTarget("canvas")}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${selectedTarget === "canvas" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                  >
                    Overlay Canvas
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedTarget("component")}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${selectedTarget === "component" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                  >
                    Component
                  </button>
                </div>
                <div className="h-4 bg-gradient-to-b from-card to-transparent" />
              </div>

              <div className="grid gap-4">
                <div className="rounded-lg border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  {selectedTarget === "canvas"
                    ? "Edit frame output yang tampil di OBS."
                    : `Edit component: ${componentLibrary.find((item) => item.key === selectedElement)?.label ?? selectedElement}.`}
                </div>

                {selectedTarget === "canvas" ? (
                  <CanvasSettingsPanel
                    design={draft.design}
                    onSizeChange={updateDesign}
                    onCssChange={(containerCss) => updateDesign({ containerCss })}
                  />
                ) : (
                  <ComponentSettingsPanel
                    selectedElement={selectedElement}
                    selected={selected}
                    design={draft.design}
                    onSelectedElementChange={setSelectedElement}
                    onElementChange={(patch) => updateElement(selectedElement, patch)}
                  />
                )}
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function createInitialDraft(mode: OverlayDesignMode, state: OverlayDesignThemeState): BuilderDraft {
  const selectedId = state.selectedDesignIds[mode];
  const selected = selectedId ? state.designs[mode].find((item) => item.id === selectedId) : null;
  const fallback = selected ?? state.designs[mode][0];

  if (fallback) {
    return {
      id: fallback.id,
      source: "workspace",
      mode,
      name: fallback.name,
      design: cloneOverlayDesign(fallback.design)
    };
  }

  return {
    id: null,
    source: "new",
    mode,
    name: mode === "focus" ? "Focus Chat Custom" : "Chat Overlay Custom",
    design: createBlankOverlayDesign(mode)
  };
}

function CanvasElement({
  elementKey,
  elementStyle,
  mode
}: {
  elementKey: OverlayDesignElementKey;
  elementStyle: CSSProperties;
  mode: OverlayDesignMode;
}) {
  const message = mode === "focus" ? "Chat pilihan tampil besar di OBS." : "Ini komentar live yang masuk.";

  if (elementKey === "profile") {
    const fallbackStyle: CSSProperties = {
      background: elementStyle.background || elementStyle.backgroundColor ? undefined : "#fda4af"
    };

    return (
      <div className="grid h-full w-full place-items-center overflow-hidden font-black text-zinc-950" style={fallbackStyle}>
        V
      </div>
    );
  }

  if (elementKey === "badge") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        MODERATOR
      </div>
    );
  }

  if (elementKey === "name") {
    return <div className="h-full w-full">Vicky Viewer</div>;
  }

  if (elementKey === "username") {
    return <div className="h-full w-full">@viewer</div>;
  }

  if (elementKey === "timestamp") {
    return <div className="h-full w-full">12.34</div>;
  }

  return <div className="h-full w-full">{message}</div>;
}

function ResizeHandles({
  elementKey,
  onResizeStart,
  onResizeMove,
  onResizeEnd
}: {
  elementKey: OverlayDesignElementKey;
  onResizeStart: (event: ReactPointerEvent<HTMLButtonElement>, key: OverlayDesignElementKey, handle: ResizeHandle) => void;
  onResizeMove: (event: ReactPointerEvent<HTMLElement>) => void;
  onResizeEnd: () => void;
}) {
  const handles: { handle: ResizeHandle; className: string; label: string }[] = [
    {
      handle: "right",
      label: "Resize width",
      className: "right-[-7px] top-1/2 h-8 w-3 -translate-y-1/2 cursor-ew-resize"
    },
    {
      handle: "bottom",
      label: "Resize height",
      className: "bottom-[-7px] left-1/2 h-3 w-8 -translate-x-1/2 cursor-ns-resize"
    },
    {
      handle: "corner",
      label: "Resize width height",
      className: "bottom-[-8px] right-[-8px] size-4 cursor-nwse-resize"
    }
  ];

  return (
    <>
      {handles.map((item) => (
        <button
          key={item.handle}
          type="button"
          aria-label={item.label}
          onPointerDown={(event) => onResizeStart(event, elementKey, item.handle)}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          className={`absolute z-20 rounded-full border border-primary bg-card shadow ${item.className}`}
        />
      ))}
    </>
  );
}

function CanvasSettingsPanel({
  design,
  onSizeChange,
  onCssChange
}: {
  design: OverlayCustomDesign;
  onSizeChange: (patch: Partial<OverlayCustomDesign>) => void;
  onCssChange: (css: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <SettingSection title="Ukuran Overlay">
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="designWidth" label="Width" value={design.width} min={280} max={1600} step={20} onChange={(width) => onSizeChange({ width })} />
          <NumberField id="designHeight" label="Height" value={design.height} min={120} max={900} step={20} onChange={(height) => onSizeChange({ height })} />
        </div>
      </SettingSection>

      <SettingSection title="Visual Canvas">
        <BackgroundControl idPrefix="canvas" css={design.containerCss} required fallback="#111827" onChange={onCssChange} />
        <div className="grid grid-cols-2 gap-3">
          <CssNumberField
            id="canvasRadius"
            label="Radius"
            css={design.containerCss}
            property="border-radius"
            fallback={0}
            min={0}
            max={200}
            step={1}
            unit="px"
            onChange={onCssChange}
          />
          <CssOpacityField id="canvasOpacity" label="Opacity %" css={design.containerCss} fallback={100} onChange={onCssChange} />
        </div>
        <StrokeControl idPrefix="canvas" css={design.containerCss} onChange={onCssChange} />
        <ShadowControl idPrefix="canvas" css={design.containerCss} onChange={onCssChange} />
        <div className="grid grid-cols-2 gap-3">
          <CssNumberField
            id="canvasBlur"
            label="Blur"
            css={design.containerCss}
            property="filter"
            fallback={0}
            min={0}
            max={40}
            step={1}
            unit="px"
            valueReader={(css) => getBlurValue(css, "filter")}
            valueWriter={(css, value) => setCssDeclaration(css, "filter", value > 0 ? `blur(${value}px)` : "none")}
            onChange={onCssChange}
          />
          <CssNumberField
            id="canvasBackdropBlur"
            label="Backdrop Blur"
            css={design.containerCss}
            property="backdrop-filter"
            fallback={0}
            min={0}
            max={40}
            step={1}
            unit="px"
            valueReader={(css) => getBlurValue(css, "backdrop-filter")}
            valueWriter={(css, value) => setCssDeclaration(css, "backdrop-filter", value > 0 ? `blur(${value}px)` : "none")}
            onChange={onCssChange}
          />
        </div>
      </SettingSection>

      <SettingSection title="Advanced CSS">
        <Textarea
          value={design.containerCss}
          onChange={(event) => onCssChange(event.target.value)}
          className="min-h-32 font-mono text-xs"
        />
      </SettingSection>
    </div>
  );
}

function ComponentSettingsPanel({
  selectedElement,
  selected,
  design,
  onSelectedElementChange,
  onElementChange
}: {
  selectedElement: OverlayDesignElementKey;
  selected: OverlayDesignElement;
  design: OverlayCustomDesign;
  onSelectedElementChange: (key: OverlayDesignElementKey) => void;
  onElementChange: (patch: Partial<OverlayDesignElement>) => void;
}) {
  const isText = isTextComponent(selectedElement);
  const isProfile = selectedElement === "profile";
  const isBadge = selectedElement === "badge";

  return (
    <div className="grid gap-4">
      <SettingSection title="Component">
        <div className="space-y-2">
          <Label htmlFor="selectedElement">Dipilih</Label>
          <select
            id="selectedElement"
            value={selectedElement}
            onChange={(event) => onSelectedElementChange(event.target.value as OverlayDesignElementKey)}
            className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {componentLibrary.map((item) => (
              <option key={item.key} value={item.key}>{item.label}</option>
            ))}
          </select>
        </div>
        <Button type="button" variant="outline" onClick={() => onElementChange({ visible: !selected.visible })}>
          {selected.visible ? <EyeOff /> : <Eye />}
          {selected.visible ? "Hide Component" : "Show Component"}
        </Button>
      </SettingSection>

      <SettingSection title="Layout">
        <div className="grid grid-cols-2 gap-3">
          <NumberField id="elementX" label="X" value={selected.x} min={-1000} max={design.width + 1000} step={1} onChange={(x) => onElementChange({ x })} />
          <NumberField id="elementY" label="Y" value={selected.y} min={-1000} max={design.height + 1000} step={1} onChange={(y) => onElementChange({ y })} />
          <NumberField id="elementWidth" label="Width" value={selected.width} min={20} max={design.width + 1000} step={1} onChange={(width) => onElementChange({ width })} />
          <NumberField id="elementHeight" label="Height" value={selected.height} min={16} max={design.height + 1000} step={1} onChange={(height) => onElementChange({ height })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            id="elementRotate"
            label="Rotate deg"
            value={selected.rotation ?? 0}
            min={-180}
            max={180}
            step={1}
            onChange={(rotation) => onElementChange({ rotation })}
          />
          <NumberField
            id="elementZIndex"
            label="Z Index"
            value={selected.zIndex ?? 1}
            min={-1000}
            max={1000}
            step={1}
            onChange={(zIndex) => onElementChange({ zIndex })}
          />
        </div>
      </SettingSection>

      <SettingSection title="Visual">
        {isText ? (
          <>
            <CssColorField
              id="elementColor"
              label="Warna teks"
              css={selected.css}
              property="color"
              fallback="#ffffff"
              onChange={(css) => onElementChange({ css })}
            />
            <div className="grid grid-cols-2 gap-3">
              <CssNumberField
                id="elementFontSize"
                label="Font Size"
                css={selected.css}
                property="font-size"
                fallback={selectedElement === "message" ? 28 : 16}
                min={8}
                max={140}
                step={1}
                unit="px"
                onChange={(css) => onElementChange({ css })}
              />
              <CssSelectField
                id="elementFontWeight"
                label="Weight"
                css={selected.css}
                property="font-weight"
                fallback={isBadge ? "900" : "800"}
                options={[
                  { value: "400", label: "Regular" },
                  { value: "600", label: "Semi" },
                  { value: "800", label: "Bold" },
                  { value: "900", label: "Black" }
                ]}
                onChange={(css) => onElementChange({ css })}
              />
            </div>
            <CssSelectField
              id="elementTextAlign"
              label="Text Align"
              css={selected.css}
              property="text-align"
              fallback="left"
              options={[
                { value: "left", label: "Left" },
                { value: "center", label: "Center" },
                { value: "right", label: "Right" }
              ]}
              onChange={(css) => onElementChange({ css })}
            />
            <div className="grid grid-cols-2 gap-3">
              <CssNumberField
                id="elementLineHeight"
                label="Line Height"
                css={selected.css}
                property="line-height"
                fallback={1.15}
                min={0.7}
                max={3}
                step={0.05}
                unit=""
                onChange={(css) => onElementChange({ css })}
              />
              <CssNumberField
                id="elementLetterSpacing"
                label="Letter Spacing"
                css={selected.css}
                property="letter-spacing"
                fallback={0}
                min={-8}
                max={40}
                step={0.5}
                unit="px"
                onChange={(css) => onElementChange({ css })}
              />
            </div>
          </>
        ) : null}

        {isProfile ? (
          <CssSelectField
            id="elementObjectFit"
            label="Object Fit Foto"
            css={selected.css}
            property="object-fit"
            fallback="cover"
            options={[
              { value: "cover", label: "Cover" },
              { value: "contain", label: "Contain" },
              { value: "fill", label: "Fill" },
              { value: "none", label: "None" }
            ]}
            onChange={(css) => onElementChange({ css })}
          />
        ) : null}

        <BackgroundControl
          idPrefix="element"
          css={selected.css}
          fallback={isProfile ? "#fda4af" : "#111827"}
          onChange={(css) => onElementChange({ css })}
        />
        <div className="grid grid-cols-2 gap-3">
          <CssNumberField
            id="elementRadius"
            label="Radius"
            css={selected.css}
            property="border-radius"
            fallback={isProfile ? 999 : isBadge ? 8 : 0}
            min={0}
            max={999}
            step={1}
            unit="px"
            onChange={(css) => onElementChange({ css })}
          />
          <CssOpacityField id="elementOpacity" label="Opacity %" css={selected.css} fallback={100} onChange={(css) => onElementChange({ css })} />
        </div>
        <CssSelectField
          id="elementOverflow"
          label="Overflow Component"
          css={selected.css}
          property="overflow"
          fallback={isProfile ? "hidden" : "visible"}
          options={[
            { value: "visible", label: "Visible" },
            { value: "hidden", label: "Hidden" },
            { value: "clip", label: "Clip" }
          ]}
          onChange={(css) => onElementChange({ css })}
        />

        {isText ? (
          <>
            <TextStrokeControl idPrefix="element" css={selected.css} onChange={(css) => onElementChange({ css })} />
            <ShadowControl
              idPrefix="elementText"
              css={selected.css}
              property="text-shadow"
              label="Text shadow aktif"
              onChange={(css) => onElementChange({ css })}
            />
          </>
        ) : (
          <>
            <StrokeControl idPrefix="element" css={selected.css} onChange={(css) => onElementChange({ css })} />
            <ShadowControl idPrefix="element" css={selected.css} onChange={(css) => onElementChange({ css })} />
          </>
        )}

        <CssNumberField
          id="elementBlur"
          label="Blur"
          css={selected.css}
          property="filter"
          fallback={0}
          min={0}
          max={40}
          step={1}
          unit="px"
          valueReader={(css) => getBlurValue(css, "filter")}
          valueWriter={(css, value) => setCssDeclaration(css, "filter", value > 0 ? `blur(${value}px)` : "none")}
          onChange={(css) => onElementChange({ css })}
        />
      </SettingSection>

      <SettingSection title="Advanced CSS">
        <Textarea
          value={selected.css}
          onChange={(event) => onElementChange({ css: event.target.value })}
          className="min-h-48 font-mono text-xs"
        />
      </SettingSection>
    </div>
  );
}

function SettingSection({
  title,
  children
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-3 rounded-lg border bg-muted/20 p-3">
      <p className="text-sm font-semibold">{title}</p>
      {children}
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function ToggleField({
  id,
  label,
  checked,
  onChange
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2 text-sm font-medium">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  );
}

function ColorInputField({
  id,
  label,
  value,
  fallback,
  onChange
}: {
  id: string;
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-2">
        <input
          id={id}
          type="color"
          value={toColorInputValue(value, fallback)}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 rounded-md border border-input bg-card p-1"
        />
        <Input value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function CssColorField({
  id,
  label,
  css,
  property,
  fallback,
  onChange
}: {
  id: string;
  label: string;
  css: string;
  property: string;
  fallback: string;
  onChange: (css: string) => void;
}) {
  const value = getCssDeclaration(css, property) || fallback;

  return (
    <ColorInputField
      id={id}
      label={label}
      value={value}
      fallback={fallback}
      onChange={(nextValue) => onChange(setCssDeclaration(css, property, nextValue))}
    />
  );
}

function CssSelectField({
  id,
  label,
  css,
  property,
  fallback,
  options,
  onChange
}: {
  id: string;
  label: string;
  css: string;
  property: string;
  fallback: string;
  options: { value: string; label: string }[];
  onChange: (css: string) => void;
}) {
  const value = getCssDeclaration(css, property) || fallback;

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(setCssDeclaration(css, property, event.target.value))}
        className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function BackgroundControl({
  idPrefix,
  css,
  fallback,
  required = false,
  onChange
}: {
  idPrefix: string;
  css: string;
  fallback: string;
  required?: boolean;
  onChange: (css: string) => void;
}) {
  const background = getCssDeclaration(css, "background") || getCssDeclaration(css, "background-color");
  const enabled = required || Boolean(background && background !== "transparent" && background !== "none");

  return (
    <div className="grid gap-3">
      {required ? null : (
        <ToggleField
          id={`${idPrefix}BackgroundEnabled`}
          label="Pakai background"
          checked={enabled}
          onChange={(checked) =>
            onChange(
              setCssDeclarations(css, {
                background: checked ? (background && background !== "transparent" && background !== "none" ? background : fallback) : "transparent",
                "background-color": ""
              })
            )
          }
        />
      )}
      {enabled ? (
        <CssColorField
          id={`${idPrefix}Background`}
          label="Warna background"
          css={css}
          property="background"
          fallback={fallback}
          onChange={(nextCss) => onChange(setCssDeclaration(nextCss, "background-color", ""))}
        />
      ) : null}
    </div>
  );
}

function CssNumberField({
  id,
  label,
  css,
  property,
  fallback,
  min,
  max,
  step,
  unit,
  valueReader,
  valueWriter,
  onChange
}: {
  id: string;
  label: string;
  css: string;
  property: string;
  fallback: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  valueReader?: (css: string) => number;
  valueWriter?: (css: string, value: number) => string;
  onChange: (css: string) => void;
}) {
  const value = valueReader ? valueReader(css) : getCssNumberValue(css, property, fallback);

  return (
    <NumberField
      id={id}
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(nextValue) => onChange(valueWriter ? valueWriter(css, nextValue) : setCssDeclaration(css, property, `${nextValue}${unit}`))}
    />
  );
}

function CssOpacityField({
  id,
  label,
  css,
  fallback,
  onChange
}: {
  id: string;
  label: string;
  css: string;
  fallback: number;
  onChange: (css: string) => void;
}) {
  return (
    <NumberField
      id={id}
      label={label}
      value={Math.round(getCssNumberValue(css, "opacity", fallback / 100) * 100)}
      min={0}
      max={100}
      step={5}
      onChange={(value) => onChange(setCssDeclaration(css, "opacity", String(value / 100)))}
    />
  );
}

function StrokeControl({
  idPrefix,
  css,
  onChange
}: {
  idPrefix: string;
  css: string;
  onChange: (css: string) => void;
}) {
  const borderShorthand = getCssDeclaration(css, "border");
  const enabled = getCssNumberValue(css, "border-width", 0) > 0 || Boolean(borderShorthand && borderShorthand !== "none");

  return (
    <div className="rounded-lg border bg-muted/25 p-3">
      <div className="grid gap-3">
        <ToggleField
          id={`${idPrefix}StrokeEnabled`}
          label="Stroke aktif"
          checked={enabled}
          onChange={(checked) =>
            onChange(
              setCssDeclarations(css, {
                border: "",
                "border-style": "solid",
                "border-width": checked ? `${Math.max(getCssNumberValue(css, "border-width", 2), 1)}px` : "0px",
                "border-color": getCssDeclaration(css, "border-color") || "#ffffff"
              })
            )
          }
        />
        <ColorInputField
          id={`${idPrefix}StrokeColor`}
          label="Warna stroke"
          value={getCssDeclaration(css, "border-color") || "#ffffff"}
          fallback="#ffffff"
          onChange={(color) =>
            onChange(
              setCssDeclarations(css, {
                border: "",
                "border-style": "solid",
                "border-width": `${Math.max(getCssNumberValue(css, "border-width", 1), 1)}px`,
                "border-color": color
              })
            )
          }
        />
        <CssNumberField
          id={`${idPrefix}StrokeWidth`}
          label="Ketebalan stroke"
          css={css}
          property="border-width"
          fallback={0}
          min={0}
          max={40}
          step={1}
          unit="px"
          valueWriter={(currentCss, value) =>
            setCssDeclarations(currentCss, {
              border: "",
              "border-style": "solid",
              "border-width": `${value}px`,
              "border-color": getCssDeclaration(currentCss, "border-color") || "#ffffff"
            })
          }
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function TextStrokeControl({
  idPrefix,
  css,
  onChange
}: {
  idPrefix: string;
  css: string;
  onChange: (css: string) => void;
}) {
  const width = getCssNumberValue(css, "-webkit-text-stroke-width", 0);
  const enabled = width > 0;

  return (
    <div className="rounded-lg border bg-muted/25 p-3">
      <div className="grid gap-3">
        <ToggleField
          id={`${idPrefix}TextStrokeEnabled`}
          label="Text stroke aktif"
          checked={enabled}
          onChange={(checked) =>
            onChange(
              setCssDeclarations(css, {
                "-webkit-text-stroke-width": checked ? `${Math.max(width, 1)}px` : "0px",
                "-webkit-text-stroke-color": getCssDeclaration(css, "-webkit-text-stroke-color") || "#ffffff",
                "paint-order": checked ? "stroke fill" : ""
              })
            )
          }
        />
        <ColorInputField
          id={`${idPrefix}TextStrokeColor`}
          label="Warna text stroke"
          value={getCssDeclaration(css, "-webkit-text-stroke-color") || "#ffffff"}
          fallback="#ffffff"
          onChange={(color) =>
            onChange(
              setCssDeclarations(css, {
                "-webkit-text-stroke-width": `${Math.max(width, 1)}px`,
                "-webkit-text-stroke-color": color,
                "paint-order": "stroke fill"
              })
            )
          }
        />
        <CssNumberField
          id={`${idPrefix}TextStrokeWidth`}
          label="Ketebalan text stroke"
          css={css}
          property="-webkit-text-stroke-width"
          fallback={0}
          min={0}
          max={16}
          step={1}
          unit="px"
          valueWriter={(currentCss, value) =>
            setCssDeclarations(currentCss, {
              "-webkit-text-stroke-width": `${value}px`,
              "-webkit-text-stroke-color": getCssDeclaration(currentCss, "-webkit-text-stroke-color") || "#ffffff",
              "paint-order": value > 0 ? "stroke fill" : ""
            })
          }
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function ShadowControl({
  idPrefix,
  css,
  property = "box-shadow",
  label = "Shadow aktif",
  onChange
}: {
  idPrefix: string;
  css: string;
  property?: "box-shadow" | "text-shadow";
  label?: string;
  onChange: (css: string) => void;
}) {
  const shadow = parseShadow(css, property);
  const writeShadow = (nextShadow: ShadowState) => onChange(setShadow(css, nextShadow, property));

  return (
    <div className="rounded-lg border bg-muted/25 p-3">
      <div className="grid gap-3">
        <ToggleField
          id={`${idPrefix}ShadowEnabled`}
          label={label}
          checked={shadow.enabled}
          onChange={(checked) => writeShadow({ ...shadow, enabled: checked })}
        />
        <ColorInputField
          id={`${idPrefix}ShadowColor`}
          label="Warna shadow"
          value={shadow.color}
          fallback="#00000088"
          onChange={(color) => writeShadow({ ...shadow, enabled: true, color })}
        />
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            id={`${idPrefix}ShadowX`}
            label="X"
            value={shadow.x}
            min={-120}
            max={120}
            step={1}
            onChange={(x) => writeShadow({ ...shadow, enabled: true, x })}
          />
          <NumberField
            id={`${idPrefix}ShadowY`}
            label="Y"
            value={shadow.y}
            min={-120}
            max={120}
            step={1}
            onChange={(y) => writeShadow({ ...shadow, enabled: true, y })}
          />
          <NumberField
            id={`${idPrefix}ShadowBlur`}
            label="Blur"
            value={shadow.blur}
            min={0}
            max={180}
            step={1}
            onChange={(blur) => writeShadow({ ...shadow, enabled: true, blur })}
          />
        </div>
      </div>
    </div>
  );
}

function getCssDeclaration(css: string, property: string) {
  return parseCssDeclarations(css).get(property) ?? "";
}

function setCssDeclaration(css: string, property: string, value: string) {
  return setCssDeclarations(css, {
    [property]: value
  });
}

function setCssDeclarations(css: string, declarations: Record<string, string>) {
  const map = parseCssDeclarations(css);

  Object.entries(declarations).forEach(([property, value]) => {
    if (!value) {
      map.delete(property);
      return;
    }

    map.set(property, value);
  });

  return Array.from(map.entries())
    .map(([property, value]) => `${property}: ${value}`)
    .join("; ");
}

function parseCssDeclarations(css: string) {
  const map = new Map<string, string>();

  css
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((declaration) => {
      const separatorIndex = declaration.indexOf(":");

      if (separatorIndex === -1) {
        return;
      }

      const property = declaration.slice(0, separatorIndex).trim();
      const value = declaration.slice(separatorIndex + 1).trim();

      if (!property || !value) {
        return;
      }

      map.set(property, value);
    });

  return map;
}

function getCssNumberValue(css: string, property: string, fallback: number) {
  const value = getCssDeclaration(css, property);
  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : fallback;
}

function getBlurValue(css: string, property: string) {
  const value = getCssDeclaration(css, property);
  const match = value.match(/blur\((-?\d+(?:\.\d+)?)px\)/i);

  if (!match) {
    return 0;
  }

  return Number(match[1]);
}

function isTextComponent(key: OverlayDesignElementKey) {
  return textElementKeys.has(key);
}

function parseShadow(css: string, property: "box-shadow" | "text-shadow"): ShadowState {
  const value = getCssDeclaration(css, property);

  if (!value || value === "none") {
    return {
      enabled: false,
      x: 0,
      y: 12,
      blur: 32,
      color: "#00000088"
    };
  }

  const match = value.match(/(-?\d+(?:\.\d+)?)px\s+(-?\d+(?:\.\d+)?)px\s+(\d+(?:\.\d+)?)px\s+(.+)/i);

  if (!match) {
    return {
      enabled: true,
      x: 0,
      y: 12,
      blur: 32,
      color: value
    };
  }

  return {
    enabled: true,
    x: Number(match[1]),
    y: Number(match[2]),
    blur: Number(match[3]),
    color: match[4]
  };
}

function setShadow(css: string, shadow: ShadowState, property: "box-shadow" | "text-shadow") {
  return setCssDeclaration(
    css,
    property,
    shadow.enabled ? `${shadow.x}px ${shadow.y}px ${shadow.blur}px ${shadow.color}` : "none"
  );
}

function toColorInputValue(value: string, fallback: string) {
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return value;
  }

  if (/^#[0-9a-f]{8}$/i.test(value)) {
    return value.slice(0, 7);
  }

  return /^#[0-9a-f]{6}$/i.test(fallback) ? fallback : "#ffffff";
}
