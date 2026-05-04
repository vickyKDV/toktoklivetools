"use client";

import Link from "next/link";
import { ArrowLeft, Code2, Eye, FilePlus2, Monitor, Redo2, Save, Trash2, Undo2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { ComponentLibrary } from "@/features/overlay-builder/components/ComponentLibrary";
import { CanvasEditor } from "@/features/overlay-builder/components/CanvasEditor";
import { PropertyInspector } from "@/features/overlay-builder/components/PropertyInspector";
import { getSampleChatRenderData, sampleChatRenderData } from "@/features/overlay-builder/components/ChatStyleRenderer";
import { OverlaySceneRenderer } from "@/features/overlay-builder/components/OverlaySceneRenderer";
import { eventToRenderData } from "@/features/overlay-builder/components/OverlayRuntimeClient";
import { componentRegistry } from "@/features/overlay-builder/registry/componentRegistry";
import { overlayTemplates } from "@/features/overlay-builder/registry/templateRegistry";
import { normalizeDesignSchema } from "@/features/overlay-builder/utils/normalizeDesignSchema";
import {
  blankOverlayDesignSchema,
  dummyOverlayData,
  type OverlayComponentSchema,
  type OverlayComponentType,
  type OverlayDesignSchema
} from "@/features/overlay-builder/schema/overlaySchema";
import { createDefaultComponent } from "@/features/overlay-builder/utils/createDefaultComponent";
import type { OverlayEventPayload } from "@/types/live";
import {
  appendComponentToParent,
  findComponent,
  findParentId,
  flattenComponents,
  isContainerType,
  moveComponentToParent,
  removeComponentFromTree,
  updateComponentInTree
} from "@/features/overlay-builder/utils/componentTree";

export type BuilderSavedDesign = {
  id: string;
  name: string;
  schema: OverlayDesignSchema;
  kind: OverlayKind;
  overlayType: OverlayBuilderType;
  isActive: boolean;
  updatedAt: string;
  publishedAt?: string | null;
};

type BuilderLayoutProps = {
  workspaceId: string;
  workspaceName: string;
  workspaceOverlayKey: string;
  initialDesign: OverlayDesignSchema;
  initialDesignId?: string | null;
  initialDesigns: BuilderSavedDesign[];
};

type SaveResponse = {
  ok: boolean;
  message?: string;
  design?: BuilderSavedDesign;
  designs?: BuilderSavedDesign[];
};

type BuilderView = "editor" | "json" | "preview";
type PreviewDataMode = "sample" | "live";
type OverlayBuilderType = "CUSTOM_OVERLAY" | "CHAT_STYLE";
type OverlayKind = "CHAT" | "GIFT" | "LEADERBOARD" | "DOCK" | "CUSTOM";

export function BuilderLayout({
  workspaceId,
  workspaceName,
  workspaceOverlayKey,
  initialDesign,
  initialDesignId = null,
  initialDesigns
}: BuilderLayoutProps) {
  const [designId, setDesignId] = useState<string | null>(initialDesignId);
  const [designSchema, setDesignSchema] = useState(initialDesign);
  const [overlayType, setOverlayType] = useState<OverlayBuilderType>(initialDesigns.find((design) => design.id === initialDesignId)?.overlayType ?? "CUSTOM_OVERLAY");
  const [overlayKind, setOverlayKind] = useState<OverlayKind>(initialDesigns.find((design) => design.id === initialDesignId)?.kind ?? initialDesign.kind ?? "CUSTOM");
  const [savedDesigns, setSavedDesigns] = useState(initialDesigns);
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(initialDesign.components[0]?.id ?? null);
  const [builderStarted, setBuilderStarted] = useState(Boolean(initialDesignId || initialDesigns.length));
  const [view, setView] = useState<BuilderView>("editor");
  const [previewDataMode, setPreviewDataMode] = useState<PreviewDataMode>("sample");
  const [previewSingleData, setPreviewSingleData] = useState(dummyOverlayData);
  const [previewItems, setPreviewItems] = useState(sampleChatRenderData);
  const [browserOrigin, setBrowserOrigin] = useState("");
  const [history, setHistory] = useState<OverlayDesignSchema[]>([]);
  const [future, setFuture] = useState<OverlayDesignSchema[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const selectedComponent = useMemo(
    () => findComponent(designSchema.components, selectedComponentId),
    [designSchema.components, selectedComponentId]
  );
  const flatComponents = useMemo(() => flattenComponents(designSchema.components), [designSchema.components]);
  const isListPreview = designSchema.layout.mode === "list" || designSchema.kind === "CHAT" || designSchema.kind === "LEADERBOARD" || designSchema.kind === "DOCK";
  const previewSampleItems = useMemo(
    () => getSampleChatRenderData(designSchema.layout.maxItems, getEnabledEventTypes(designSchema)),
    [designSchema]
  );
  const designOutputPath = designId ? `/overlay/${overlayKind.toLowerCase()}/${designId}` : "";
  const designOutputUrl = designOutputPath ? `${browserOrigin}${designOutputPath}` : "";

  useEffect(() => {
    setBrowserOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    if (view !== "preview" || previewDataMode !== "live") {
      return;
    }

    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin;
    const socket: Socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });

    socket.emit("overlay:join", workspaceOverlayKey);
    socket.on("connect", () => socket.emit("overlay:join", workspaceOverlayKey));
    socket.on("overlay:live-event", handlePreviewEvent);
    socket.on("overlay:focus-chat", handleFocusPreviewEvent);

    return () => {
      socket.disconnect();
    };

    function handlePreviewEvent(event: OverlayEventPayload) {
      const data = eventToRenderData(event);
      setPreviewSingleData(data);
      setPreviewItems((current) => {
        const itemWithId = {
          ...data,
          meta: {
            ...data.meta,
            instanceId: `preview-${data.meta?.id ?? "event"}-${Date.now()}`
          }
        };
        const next = designSchema.layout.reverse ? [itemWithId, ...current] : [...current, itemWithId];

        return designSchema.layout.reverse
          ? next.slice(0, designSchema.layout.maxItems)
          : next.slice(-designSchema.layout.maxItems);
      });
    }

    function handleFocusPreviewEvent(event: OverlayEventPayload) {
      if (!acceptsFocusDock(designSchema) || event.type !== "CHAT" || !event.comment) {
        return;
      }

      setPreviewSingleData(eventToRenderData(event));
    }
  }, [designSchema, previewDataMode, view, workspaceOverlayKey]);

  function commit(next: OverlayDesignSchema) {
    setHistory((current) => [...current.slice(-30), designSchema]);
    setFuture([]);
    setDesignSchema(next);
    setIsDirty(true);
  }

  function updateDesign(patch: Partial<OverlayDesignSchema>) {
    commit({ ...designSchema, ...patch });
  }

  function updateCanvas(patch: Partial<OverlayDesignSchema["canvas"]>) {
    commit({
      ...designSchema,
      canvas: {
        ...designSchema.canvas,
        ...patch
      }
    });
  }

  function updateComponent(id: string, patch: Partial<OverlayComponentSchema>) {
    commit({
      ...designSchema,
      components: updateComponentInTree(designSchema.components, id, (component) => ({
        ...component,
        ...patch,
        props: patch.props ? { ...component.props, ...patch.props } : component.props,
        style: patch.style ? { ...component.style, ...patch.style } : component.style
      }))
    });
  }

  function addComponent(type: OverlayComponentType, x?: number, y?: number, parentId: string | null = null) {
    const registryItem = componentRegistry[type];
    const parent = parentId ? findComponent(designSchema.components, parentId) : null;
    const targetWidth = parent?.width ?? designSchema.canvas.width;
    const targetHeight = parent?.height ?? designSchema.canvas.height;
    const nextX = x ?? Math.round((targetWidth - registryItem.defaultSize.width) / 2);
    const nextY = y ?? Math.round((targetHeight - registryItem.defaultSize.height) / 2);
    const component = createDefaultComponent(type, nextX, nextY, designSchema.components.length + 1);

    commit({
      ...designSchema,
      components: appendComponentToParent(designSchema.components, parentId, component)
    });
    setSelectedComponentId(component.id);
    setBuilderStarted(true);
    setView("editor");
  }

  function deleteComponent(id: string) {
    const result = removeComponentFromTree(designSchema.components, id);

    commit({
      ...designSchema,
      components: result.components
    });
    setSelectedComponentId(null);
  }

  function duplicateComponent(id: string) {
    const component = findComponent(designSchema.components, id);

    if (!component) {
      return;
    }

    const duplicate = {
      ...structuredClone(component),
      id: `${component.type}_${Date.now()}`,
      name: `${component.name} Copy`,
      x: component.x + 16,
      y: component.y + 16,
      zIndex: Math.max(...designSchema.components.map((item) => item.zIndex), 0) + 1
    };

    commit({
      ...designSchema,
      components: appendComponentToParent(designSchema.components, findParentId(designSchema.components, id), duplicate)
    });
    setSelectedComponentId(duplicate.id);
  }

  function moveIntoContainer(id: string, parentId: string) {
    const parent = findComponent(designSchema.components, parentId);
    const child = findComponent(designSchema.components, id);

    if (!parent || !child || !isContainerType(parent.type)) {
      return;
    }

    const flatChild = flatComponents.find((item) => item.id === id);
    const flatParent = flatComponents.find((item) => item.id === parentId);
    const nextX = Math.max(0, Math.round((flatChild?.absoluteX ?? child.x) - (flatParent?.absoluteX ?? parent.x)));
    const nextY = Math.max(0, Math.round((flatChild?.absoluteY ?? child.y) - (flatParent?.absoluteY ?? parent.y)));

    commit({
      ...designSchema,
      components: moveComponentToParent(designSchema.components, id, parentId, nextX, nextY)
    });
    setSelectedComponentId(id);
  }

  function removeFromContainer(id: string) {
    const parentId = findParentId(designSchema.components, id);

    if (!parentId) {
      return;
    }

    const removed = removeComponentFromTree(designSchema.components, id);

    if (!removed.removed) {
      return;
    }

    commit({
      ...designSchema,
      components: appendComponentToParent(removed.components, null, {
        ...removed.removed,
        x: removed.absoluteX,
        y: removed.absoluteY
      })
    });
    setSelectedComponentId(id);
  }

  function bringToFront(id: string) {
    const maxZ = Math.max(0, ...flatComponents.map((component) => component.zIndex));
    updateComponent(id, { zIndex: maxZ + 1 });
  }

  function sendToBack(id: string) {
    const minZ = Math.min(0, ...flatComponents.map((component) => component.zIndex));
    updateComponent(id, { zIndex: minZ - 1 });
  }

  function loadTemplate(templateId: string) {
    const template = overlayTemplates.find((item) => item.id === templateId);

    if (!template) {
      return;
    }

    if (builderStarted && designSchema.components.length > 0 && !window.confirm("Template akan mengganti isi canvas saat ini. Lanjutkan?")) {
      return;
    }

    const schema = normalizeDesignSchema(template.schema);

    commit(structuredClone(schema));
    setDesignId(null);
    setOverlayKind(normalizeKind(schema.kind ?? overlayKind));
    setOverlayType(schema.kind === "CHAT" ? "CHAT_STYLE" : "CUSTOM_OVERLAY");
    setSelectedComponentId(schema.components[0]?.id ?? null);
    setBuilderStarted(true);
    setView("editor");
  }

  function startBlankCanvas(confirmReplace = false) {
    if (confirmReplace && designSchema.components.length > 0 && !window.confirm("Blank Canvas akan mengganti isi canvas saat ini. Lanjutkan?")) {
      return;
    }

    commit(structuredClone(blankOverlayDesignSchema));
    setDesignId(null);
    setOverlayKind("CUSTOM");
    setOverlayType("CUSTOM_OVERLAY");
    setSelectedComponentId(null);
    setBuilderStarted(true);
    setView("editor");
  }

  function clearCanvas() {
    if (designSchema.components.length > 0 && !window.confirm("Clear Canvas akan menghapus semua component. Lanjutkan?")) {
      return;
    }

    commit({
      ...designSchema,
      components: []
    });
    setSelectedComponentId(null);
    setView("editor");
  }

  function handleReparentFromCanvas(id: string, parentId: string, x: number, y: number) {
    if (id === parentId) {
      return;
    }

    commit({
      ...designSchema,
      components: moveComponentToParent(designSchema.components, id, parentId, x, y)
    });
    setSelectedComponentId(id);
  }

  function loadSavedDesign(id: string) {
    const design = savedDesigns.find((item) => item.id === id);

    if (!design) {
      return;
    }

    setHistory((current) => [...current.slice(-30), designSchema]);
    setFuture([]);
    setDesignId(design.id);
    setOverlayKind(design.kind);
    setOverlayType(design.overlayType);
    setDesignSchema(structuredClone(design.schema));
    setSelectedComponentId(design.schema.components[0]?.id ?? null);
    setIsDirty(false);
  }

  function undo() {
    const previous = history.at(-1);

    if (!previous) {
      return;
    }

    setFuture((current) => [designSchema, ...current]);
    setHistory((current) => current.slice(0, -1));
    setDesignSchema(previous);
    setIsDirty(true);
  }

  function redo() {
    const next = future[0];

    if (!next) {
      return;
    }

    setHistory((current) => [...current, designSchema]);
    setFuture((current) => current.slice(1));
    setDesignSchema(next);
    setIsDirty(true);
  }

  async function saveDesign() {
    await persistDesign(false);
  }

  async function publishDesign() {
    await persistDesign(true);
  }

  async function persistDesign(publish: boolean) {
    setSaving(true);
    setStatus("");

    try {
      const response = await fetch(designId ? `/api/overlays/${designId}` : "/api/overlays", {
        method: designId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          name: designSchema.name,
          schema: {
            ...designSchema,
            kind: overlayKind
          },
          kind: overlayKind,
          overlayType,
          publish
        })
      });
      const data = (await response.json()) as SaveResponse;

      if (!response.ok || !data.ok || !data.design) {
        setStatus(data.message ?? "Design gagal disimpan.");
        return;
      }

      setDesignId(data.design.id);
      setOverlayKind(data.design.kind);
      setOverlayType(data.design.overlayType);
      setDesignSchema(data.design.schema);
      setSavedDesigns(data.designs ?? upsertDesign(savedDesigns, data.design));
      setIsDirty(false);
      setStatus(data.message ?? (publish ? "Overlay berhasil dipublish" : "Draft overlay berhasil disimpan"));
    } catch {
      setStatus("Server tidak merespon saat menyimpan design.");
    } finally {
      setSaving(false);
    }
  }

  if (!builderStarted) {
    return (
      <div className="grid gap-5">
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  <ArrowLeft />
                  Dashboard
                </Link>
              </Button>
              <h1 className="text-2xl font-semibold tracking-normal">JSON Overlay Builder</h1>
              <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{workspaceName}</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Mulai dari canvas kosong atau pakai template sebagai shortcut JSON.</p>
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <button
            type="button"
            onClick={() => startBlankCanvas(false)}
            className="rounded-lg border bg-card p-6 text-left transition-colors hover:bg-muted"
          >
            <FilePlus2 className="size-6 text-primary" />
            <span className="mt-4 block text-xl font-semibold">Start From Scratch</span>
            <span className="mt-2 block text-sm text-muted-foreground">
              Buat schema JSON kosong, atur canvas, lalu tambahkan component satu per satu.
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setBuilderStarted(true);
              setView("editor");
            }}
            className="rounded-lg border bg-card p-6 text-left transition-colors hover:bg-muted"
          >
            <Eye className="size-6 text-primary" />
            <span className="mt-4 block text-xl font-semibold">Use Template</span>
            <span className="mt-2 block text-sm text-muted-foreground">
              Buka template preset, lalu edit JSON schema-nya seperti design biasa.
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      <Card>
        <CardContent className="flex flex-col gap-4 p-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  <ArrowLeft />
                  Dashboard
                </Link>
              </Button>
              <h1 className="text-2xl font-semibold tracking-normal">JSON Overlay Builder</h1>
              <span className="rounded-md border px-2 py-1 text-xs text-muted-foreground">{workspaceName}</span>
              {isDirty ? <span className="rounded-md bg-secondary px-2 py-1 text-xs font-semibold text-secondary-foreground">Unsaved</span> : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Builder menyimpan schema JSON ke record Overlay resmi. Preview dan OBS membaca overlay yang sama.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={undo} disabled={!history.length}>
              <Undo2 />
            </Button>
            <Button type="button" variant="outline" onClick={redo} disabled={!future.length}>
              <Redo2 />
            </Button>
            <Button type="button" variant="outline" onClick={() => startBlankCanvas(true)}>
              <FilePlus2 />
              Blank Canvas
            </Button>
            <select
              value={overlayKind}
              onChange={(event) => {
                const kind = normalizeKind(event.target.value);
                setOverlayKind(kind);
                setOverlayType(kind === "CHAT" ? "CHAT_STYLE" : "CUSTOM_OVERLAY");
                updateDesign({ kind });
              }}
              className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="CHAT">Chat</option>
              <option value="GIFT">Gift</option>
              <option value="LEADERBOARD">Leaderboard</option>
              <option value="DOCK">Dock</option>
              <option value="CUSTOM">Custom</option>
            </select>
            <Button type="button" variant="outline" onClick={clearCanvas}>
              <Trash2 />
              Clear Canvas
            </Button>
            {designId ? (
              <>
                <Button asChild variant="outline">
                  <Link href={`/overlay-preview/${designId}`} target="_blank">
                    <Eye />
                    Public Preview
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href={`/overlay/${overlayKind.toLowerCase()}/${designId}`} target="_blank">
                    <Monitor />
                    OBS
                  </Link>
                </Button>
              </>
            ) : null}
            <Button type="button" onClick={saveDesign} disabled={saving}>
              <Save />
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button type="button" variant="outline" onClick={publishDesign} disabled={saving}>
              <Monitor />
              Publish
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[18rem_minmax(0,1fr)_24rem]">
        <aside className="grid gap-4 xl:sticky xl:top-4">
          <ComponentLibrary onAddComponent={addComponent} onLoadTemplate={loadTemplate} onBlankCanvas={() => startBlankCanvas(true)} />
          <section className="grid gap-2 rounded-lg border bg-card p-3">
            <p className="text-sm font-semibold">Saved Designs</p>
            {savedDesigns.length ? (
              savedDesigns.map((design) => (
                <button
                  key={design.id}
                  type="button"
                  onClick={() => loadSavedDesign(design.id)}
                  className="rounded-md border bg-background p-3 text-left transition-colors hover:bg-muted"
                >
                  <span className="block truncate text-sm font-semibold">{design.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{design.kind} · {design.publishedAt ? "Published" : "Draft"}</span>
                </button>
              ))
            ) : (
              <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">Belum ada design JSON.</p>
            )}
          </section>
        </aside>

        <main className="grid min-w-0 gap-4">
          <Card>
            <CardContent className="grid gap-3 p-4">
              <div>
                <p className="text-sm font-semibold">OBS Browser Source URL</p>
                <p className="text-xs text-muted-foreground">
                  Setiap overlay punya URL unik berdasarkan id. OBS membaca published schema; draft tidak mengubah live sebelum dipublish.
                </p>
              </div>
              {designOutputPath ? (
                <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                  <Input readOnly value={designOutputUrl} />
                  <CopyButton value={designOutputUrl} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <Input value={designSchema.name} onChange={(event) => updateDesign({ name: event.target.value })} />
              <div className="grid grid-cols-3 gap-1 rounded-lg border bg-muted/30 p-1">
                {([
                  ["editor", "Editor"],
                  ["json", "JSON"],
                  ["preview", "Preview"]
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setView(value)}
                    className={`rounded-md px-3 py-2 text-sm font-semibold ${view === value ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                  >
                    {value === "json" ? <Code2 className="mr-1 inline size-4" /> : null}
                    {label}
                  </button>
                ))}
              </div>
              <select
                value={zoom}
                onChange={(event) => setZoom(Number(event.target.value))}
                className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value={0.5}>50%</option>
                <option value={0.75}>75%</option>
                <option value={1}>100%</option>
                <option value={1.25}>125%</option>
              </select>
              <select
                value={previewDataMode}
                onChange={(event) => setPreviewDataMode(event.target.value === "live" ? "live" : "sample")}
                className="flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="sample">Sample data</option>
                <option value="live">Live socket data</option>
              </select>
            </CardContent>
          </Card>

          {view === "editor" ? (
            <CanvasEditor
              designSchema={designSchema}
              data={dummyOverlayData}
              selectedComponentId={selectedComponentId}
              zoom={zoom}
              previewMode={false}
              onSelectComponent={setSelectedComponentId}
              onUpdateComponent={updateComponent}
              onDropComponent={addComponent}
              onReparentComponent={handleReparentFromCanvas}
              onAddComment={() => addComponent("comment")}
              onChooseTemplate={() => loadTemplate(overlayTemplates[0].id)}
            />
          ) : null}

          {view === "json" ? (
            <Card>
              <CardContent className="p-4">
                <pre className="max-h-[680px] overflow-auto rounded-lg bg-zinc-950 p-4 text-xs leading-relaxed text-zinc-50">
                  {JSON.stringify(designSchema, null, 2)}
                </pre>
              </CardContent>
            </Card>
          ) : null}

          {view === "preview" ? (
            <div className="min-h-[560px] overflow-auto rounded-lg border bg-zinc-950/5 p-8 shadow-inner">
              <OverlaySceneRenderer
                schema={designSchema}
                data={previewDataMode === "live" ? previewSingleData : dummyOverlayData}
                items={isListPreview ? (previewDataMode === "live" ? previewItems : previewSampleItems) : undefined}
                scale={zoom}
              />
            </div>
          ) : null}

          {status ? <p role="status" className="rounded-lg border bg-card px-4 py-3 text-sm text-muted-foreground">{status}</p> : null}
        </main>

        <aside className="grid gap-4 xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
          <Card>
            <CardContent className="p-4">
              <PropertyInspector
                designSchema={designSchema}
                selectedComponent={selectedComponent}
                onUpdateDesign={updateDesign}
                onUpdateCanvas={updateCanvas}
                onUpdateComponent={updateComponent}
                onDeleteComponent={deleteComponent}
                onDuplicateComponent={duplicateComponent}
                onMoveIntoContainer={moveIntoContainer}
                onRemoveFromContainer={removeFromContainer}
                onBringToFront={bringToFront}
                onSendToBack={sendToBack}
                components={flatComponents}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function upsertDesign(current: BuilderSavedDesign[], design: BuilderSavedDesign) {
  const exists = current.some((item) => item.id === design.id);
  const next = exists ? current.map((item) => (item.id === design.id ? design : item)) : [design, ...current];

  return next;
}

function normalizeKind(value: string | undefined): OverlayKind {
  if (value === "CHAT" || value === "GIFT" || value === "LEADERBOARD" || value === "DOCK" || value === "CUSTOM") {
    return value;
  }

  return "CUSTOM";
}

function getEnabledEventTypes(schema: OverlayDesignSchema) {
  const value = schema.dataSource.filters?.eventTypes;

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return ["CHAT"];
}

function acceptsFocusDock(schema: OverlayDesignSchema) {
  return schema.kind === "CUSTOM" && schema.layout.mode === "single" && schema.dataSource.type === "manual";
}
