"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  addEdge,
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes
} from "@xyflow/react";
import {
  Bell,
  CircleDot,
  GitBranch,
  Gift,
  MessageCircle,
  MousePointer2,
  Plus,
  Reply,
  Save,
  Sparkles,
  Trash2,
  Volume2,
  Zap
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";
import type {
  AutomationExecutionRecord,
  AutomationFlowEdge,
  AutomationFlowNode,
  AutomationFlowRecord,
  AutomationNodeData,
  AutomationNodeType,
  AutomationTriggerType
} from "@/types/automation";

type FlowNode = Node<AutomationNodeData, AutomationNodeType>;
type FlowEdge = Edge;

type AutomationBuilderProps = {
  workspaceId: string;
  workspaceName: string;
  overlayKey: string;
  widgetBaseUrl: string;
  initialFlows: AutomationFlowRecord[];
  initialExecutions: AutomationExecutionRecord[];
};

type AnimationAsset = {
  id: string;
  name: string;
  label: string;
  source: "default" | "workspace";
  sourceLabel: string;
  type: "lottie" | "video" | "image";
  url: string;
  size: number;
};

type AnimationAssetsResponse = {
  assets?: AnimationAsset[];
  asset?: AnimationAsset;
  error?: string;
};

type GiftOption = {
  value: string;
  label: string;
  source: "observed" | "default";
  giftId?: string | null;
};

type GiftOptionsResponse = {
  gifts?: GiftOption[];
  error?: string;
};

type AutomationFlowMutationResponse = {
  ok: boolean;
  message: string;
  flowId?: string;
};

const defaultAnimationUrl = "/uploads/animations/default/rose-animation.webm";

type NodeDefinition = {
  type: AutomationNodeType;
  title: string;
  description: string;
  group: "Trigger" | "Logic" | "Action";
  icon: typeof Gift;
  defaultData: AutomationNodeData;
};

const nodeDefinitions: NodeDefinition[] = [
  {
    type: "giftTrigger",
    title: "Gift Trigger",
    description: "Mulai flow saat gift diterima.",
    group: "Trigger",
    icon: Gift,
    defaultData: {
      label: "Gift Received",
      eventType: "GIFT"
    }
  },
  {
    type: "commentTrigger",
    title: "Comment Trigger",
    description: "Mulai flow saat komentar masuk.",
    group: "Trigger",
    icon: MessageCircle,
    defaultData: {
      label: "Comment Received",
      eventType: "CHAT"
    }
  },
  {
    type: "likeTrigger",
    title: "Like Trigger",
    description: "Mulai flow saat like masuk.",
    group: "Trigger",
    icon: Zap,
    defaultData: {
      label: "Like Received",
      eventType: "LIKE"
    }
  },
  {
    type: "followTrigger",
    title: "Follow Trigger",
    description: "Mulai flow saat user follow.",
    group: "Trigger",
    icon: Bell,
    defaultData: {
      label: "Follow Received",
      eventType: "FOLLOW"
    }
  },
  {
    type: "condition",
    title: "Condition",
    description: "Filter gift, komentar, username, atau metric.",
    group: "Logic",
    icon: GitBranch,
    defaultData: {
      label: "Condition",
      field: "giftName",
      operator: "equals",
      value: "Mawar"
    }
  },
  {
    type: "showAnimation",
    title: "Show Animation",
    description: "Tampilkan asset animasi di overlay.",
    group: "Action",
    icon: Sparkles,
    defaultData: {
      label: "Show Animation",
      animationUrl: defaultAnimationUrl,
      durationMs: 3000,
      useMediaDuration: false,
      position: "center",
      size: 420
    }
  },
  {
    type: "playSound",
    title: "Play Sound",
    description: "Putar efek suara di overlay.",
    group: "Action",
    icon: Volume2,
    defaultData: {
      label: "Play Sound",
      soundUrl: "/api/assets/sounds/message_sound_alert.mp3",
      volume: 1
    }
  },
  {
    type: "replyComment",
    title: "Reply Comment",
    description: "Siapkan response komentar otomatis.",
    group: "Action",
    icon: Reply,
    defaultData: {
      label: "Reply Comment",
      message: "Harga tiket bisa dicek di link bio ya kak."
    }
  }
];

const nodeTypes: NodeTypes = {
  giftTrigger: AutomationNodeCard,
  commentTrigger: AutomationNodeCard,
  likeTrigger: AutomationNodeCard,
  followTrigger: AutomationNodeCard,
  condition: AutomationNodeCard,
  showAnimation: AutomationNodeCard,
  playSound: AutomationNodeCard,
  replyComment: AutomationNodeCard
};

const soundOptions = [
  { value: "", label: "Tanpa Sound" },
  { value: "/api/assets/sounds/message_sound_alert.mp3", label: "Message Alert 1" },
  { value: "/api/assets/sounds/message_sound_alert_2.mp3", label: "Message Alert 2" },
  { value: "/api/assets/sounds/message_sound_alert_3.mp3", label: "Message Alert 3" }
];

const emptyDraft = createDefaultDraft();

export function AutomationBuilder(props: AutomationBuilderProps) {
  return (
    <ReactFlowProvider>
      <AutomationBuilderCanvas {...props} />
    </ReactFlowProvider>
  );
}

function AutomationBuilderCanvas({
  workspaceId,
  workspaceName,
  overlayKey,
  widgetBaseUrl,
  initialFlows,
  initialExecutions
}: AutomationBuilderProps) {
  const firstFlow = initialFlows[0];
  const initialDraft = firstFlow ?? emptyDraft;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();
  const [flows, setFlows] = useState(initialFlows);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(firstFlow?.id ?? null);
  const [flowName, setFlowName] = useState(initialDraft.name);
  const [flowDescription, setFlowDescription] = useState(initialDraft.description ?? "");
  const [flowActive, setFlowActive] = useState(initialDraft.isActive);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialDraft.nodes[0]?.id ?? null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [assetMessage, setAssetMessage] = useState<string | null>(null);
  const [animationAssets, setAnimationAssets] = useState<AnimationAsset[]>([]);
  const [giftOptions, setGiftOptions] = useState<GiftOption[]>([]);
  const [isUploadingAsset, setIsUploadingAsset] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(toReactNodes(initialDraft.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(toReactEdges(initialDraft.edges));
  const actionOverlayUrl = useMemo(
    () =>
      selectedFlowId
        ? `${widgetBaseUrl}/widgets/action/${overlayKey}/${selectedFlowId}?position=center`
        : "",
    [overlayKey, selectedFlowId, widgetBaseUrl]
  );

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  useEffect(() => {
    let active = true;

    fetch(`/api/workspaces/${workspaceId}/animation-assets`)
      .then((response) => response.json())
      .then((data: AnimationAssetsResponse) => {
        if (!active) {
          return;
        }

        setAnimationAssets(data.assets ?? []);
      })
      .catch(() => {
        if (active) {
          setAssetMessage("Gagal membaca daftar animation asset.");
        }
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  useEffect(() => {
    let active = true;

    fetch(`/api/workspaces/${workspaceId}/gift-options`)
      .then((response) => response.json())
      .then((data: GiftOptionsResponse) => {
        if (!active) {
          return;
        }

        setGiftOptions(data.gifts ?? []);
      })
      .catch(() => {
        if (active) {
          setGiftOptions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [workspaceId]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            animated: true,
            markerEnd: {
              type: MarkerType.ArrowClosed
            }
          },
          current
        )
      );
    },
    [setEdges]
  );

  const addNode = useCallback(
    (type: AutomationNodeType, position?: { x: number; y: number }) => {
      const node = createNode(type, position ?? { x: 160 + nodes.length * 28, y: 120 + nodes.length * 28 });

      setNodes((current) => [...current, node]);
      setSelectedNodeId(node.id);
    },
    [nodes.length, setNodes]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const type = event.dataTransfer.getData("application/tla-node") as AutomationNodeType;

      if (!type) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });

      addNode(type, position);
    },
    [addNode, screenToFlowPosition]
  );

  function loadFlow(flow: AutomationFlowRecord) {
    setSelectedFlowId(flow.id);
    setFlowName(flow.name);
    setFlowDescription(flow.description ?? "");
    setFlowActive(flow.isActive);
    setNodes(toReactNodes(flow.nodes));
    setEdges(toReactEdges(flow.edges));
    setSelectedNodeId(flow.nodes[0]?.id ?? null);
    setStatusMessage(null);
  }

  function createNewFlow() {
    const draft = createDefaultDraft();

    setSelectedFlowId(null);
    setFlowName(draft.name);
    setFlowDescription(draft.description ?? "");
    setFlowActive(true);
    setNodes(toReactNodes(draft.nodes));
    setEdges(toReactEdges(draft.edges));
    setSelectedNodeId(draft.nodes[0]?.id ?? null);
    setStatusMessage("Draft baru dibuat. Simpan untuk memasukkan ke database.");
  }

  function updateSelectedNodeData<K extends keyof AutomationNodeData>(key: K, value: AutomationNodeData[K]) {
    if (!selectedNode) {
      return;
    }

    setNodes((current) =>
      current.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                [key]: value
              }
            }
          : node
      )
    );
  }

  function deleteSelectedNode() {
    if (!selectedNode) {
      return;
    }

    setNodes((current) => current.filter((node) => node.id !== selectedNode.id));
    setEdges((current) =>
      current.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id)
    );
    setSelectedNodeId(null);
  }

  async function uploadAnimationAsset(file: File) {
    setAssetMessage(null);
    setIsUploadingAsset(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const response = await fetch(`/api/workspaces/${workspaceId}/animation-assets`, {
        method: "POST",
        body: formData
      });
      const data = (await response.json()) as AnimationAssetsResponse;

      if (!response.ok || !data.asset) {
        setAssetMessage(data.error ?? "Upload animation gagal.");
        return;
      }

      setAnimationAssets((current) => [
        ...current.filter((asset) => asset.url !== data.asset?.url),
        data.asset as AnimationAsset
      ]);
      updateSelectedNodeData("animationUrl", data.asset.url);
      setAssetMessage("Animation asset berhasil di-upload ke workspace.");
    } catch {
      setAssetMessage("Upload animation gagal.");
    } finally {
      setIsUploadingAsset(false);
    }
  }

  function saveFlow() {
    setStatusMessage(null);

    startTransition(async () => {
      const persistedNodes = toPersistedNodes(nodes);
      const persistedEdges = toPersistedEdges(edges);

      const response = await fetch(`/api/workspaces/${workspaceId}/automation-flows`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          flowId: selectedFlowId,
          name: flowName,
          description: flowDescription,
          isActive: flowActive,
          nodes: persistedNodes,
          edges: persistedEdges
        })
      });
      const result = await readMutationResponse(response);

      if (!response.ok || !result.ok) {
        setStatusMessage(result.message);
        return;
      }

      const flowId = result.flowId ?? selectedFlowId;

      if (flowId) {
        setSelectedFlowId(flowId);
        setFlows((current) => {
          const nextFlow: AutomationFlowRecord = {
            id: flowId,
            name: flowName,
            description: flowDescription || null,
            isActive: flowActive,
            nodes: persistedNodes,
            edges: persistedEdges,
            updatedAt: new Date().toISOString()
          };
          const existing = current.findIndex((flow) => flow.id === flowId);

          if (existing >= 0) {
            const next = [...current];
            next[existing] = nextFlow;
            return next;
          }

          return [nextFlow, ...current];
        });
      }

      setStatusMessage(result.message);
    });
  }

  function toggleActive() {
    const nextActive = !flowActive;
    setFlowActive(nextActive);

    if (!selectedFlowId) {
      setStatusMessage("Status aktif berubah di draft. Klik Simpan untuk menyimpan.");
      return;
    }

    startTransition(async () => {
      const response = await fetch(`/api/workspaces/${workspaceId}/automation-flows`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          flowId: selectedFlowId,
          isActive: nextActive
        })
      });
      const result = await readMutationResponse(response);

      if (!response.ok || !result.ok) {
        setFlowActive(!nextActive);
        setStatusMessage(result.message);
        return;
      }

      setFlows((current) =>
        current.map((flow) => (flow.id === selectedFlowId ? { ...flow, isActive: nextActive } : flow))
      );
      setStatusMessage(result.message);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-normal">Automation Builder</h1>
            <Badge variant={flowActive ? "default" : "muted"}>{flowActive ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Susun trigger, condition, dan action untuk {workspaceName}. Flow aktif akan dieksekusi setiap event TikTok LIVE masuk.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={createNewFlow}>
            <Plus />
            Flow Baru
          </Button>
          <Button type="button" variant="outline" onClick={toggleActive} disabled={isPending}>
            <CircleDot />
            {flowActive ? "Disable" : "Enable"}
          </Button>
          <Button type="button" onClick={saveFlow} disabled={isPending}>
            <Save />
            {isPending ? "Menyimpan..." : "Simpan Flow"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Node Library</CardTitle>
          <CardDescription>Drag node dari bar ini ke canvas, atau klik untuk menambahkan node.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {nodeDefinitions.map((definition) => (
              <NodePaletteItem
                key={definition.type}
                definition={definition}
                layout="horizontal"
                onClick={() => addNode(definition.type)}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)_24rem]">
        <section className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Flow Database</CardTitle>
              <CardDescription>Pilih flow tersimpan atau mulai draft baru.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <SelectInput
                id="flowSelect"
                label="Load Flow"
                value={selectedFlowId ?? "__draft"}
                onChange={(value) => {
                  const flow = flows.find((item) => item.id === value);
                  if (flow) {
                    loadFlow(flow);
                  } else {
                    createNewFlow();
                  }
                }}
                options={[
                  { value: "__draft", label: "Draft baru" },
                  ...flows.map((flow) => ({
                    value: flow.id,
                    label: `${flow.name}${flow.isActive ? " (Active)" : " (Inactive)"}`
                  }))
                ]}
              />
              <TextInput id="flowName" label="Nama Flow" value={flowName} onChange={setFlowName} />
              <div className="space-y-2">
                <Label htmlFor="flowDescription">Deskripsi</Label>
                <Textarea
                  id="flowDescription"
                  value={flowDescription}
                  onChange={(event) => setFlowDescription(event.target.value)}
                  placeholder="Contoh: Rose gift menampilkan animasi dan sound."
                />
              </div>
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                Overlay target: <span className="font-mono text-foreground">{overlayKey}</span>
              </div>
              {statusMessage ? (
                <div className="rounded-md border bg-card px-3 py-2 text-sm">{statusMessage}</div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Action Overlay URL</CardTitle>
              <CardDescription>
                Pasang URL per-flow ini di OBS untuk menampilkan action dari Automation Builder.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="actionOverlayUrl">Browser Source URL</Label>
                <Input
                  id="actionOverlayUrl"
                  readOnly
                  value={actionOverlayUrl || "Simpan flow dulu untuk membuat URL unik."}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {actionOverlayUrl ? (
                  <>
                    <CopyButton value={actionOverlayUrl} />
                    <Button asChild variant="outline">
                      <Link href={actionOverlayUrl} target="_blank">
                        Open
                      </Link>
                    </Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" disabled>
                    URL dibuat setelah save
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Setiap flow punya URL sendiri. Action dari flow lain tidak akan muncul di Browser Source ini.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="min-h-[720px] overflow-hidden rounded-lg border bg-card">
          <div ref={wrapperRef} className="h-[720px]" onDrop={onDrop} onDragOver={onDragOver}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
              minZoom={0.25}
              maxZoom={1.6}
            >
              <Background />
              <Controls />
              <MiniMap pannable zoomable nodeStrokeWidth={3} />
            </ReactFlow>
          </div>
        </section>

        <aside className="space-y-4">
          <NodeSettingsPanel
            node={selectedNode}
            animationAssets={animationAssets}
            giftOptions={giftOptions}
            assetMessage={assetMessage}
            isUploadingAsset={isUploadingAsset}
            onChange={updateSelectedNodeData}
            onUploadAnimation={uploadAnimationAsset}
            onDelete={deleteSelectedNode}
          />

          <ExecutionLog executions={initialExecutions} />
        </aside>
      </div>
    </div>
  );
}

function NodePaletteItem({
  definition,
  layout = "vertical",
  onClick
}: {
  definition: NodeDefinition;
  layout?: "vertical" | "horizontal";
  onClick: () => void;
}) {
  const Icon = definition.icon;

  return (
    <button
      type="button"
      draggable
      onClick={onClick}
      onDragStart={(event) => {
        event.dataTransfer.setData("application/tla-node", definition.type);
        event.dataTransfer.effectAllowed = "move";
      }}
      className={`flex items-start gap-3 rounded-md border bg-card p-3 text-left transition-colors hover:bg-muted ${
        layout === "horizontal" ? "min-w-60 flex-1 basis-60" : ""
      }`}
    >
      <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <span className="min-w-0">
        <span className="flex items-center gap-2">
          <span className="block truncate font-medium">{definition.title}</span>
          {layout === "horizontal" ? (
            <Badge variant="muted" className="shrink-0">
              {definition.group}
            </Badge>
          ) : null}
        </span>
        <span className="mt-1 block text-xs text-muted-foreground">{definition.description}</span>
      </span>
    </button>
  );
}

function AutomationNodeCard(props: NodeProps<FlowNode>) {
  const data = props.data;
  const type = props.type as AutomationNodeType;
  const definition = nodeDefinitions.find((item) => item.type === type);
  const Icon = definition?.icon ?? MousePointer2;
  const colorClass = getNodeColorClass(type);

  return (
    <div
      className={`relative min-w-56 rounded-lg border-2 bg-card px-4 py-3 shadow-lg ${
        props.selected ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`grid size-9 shrink-0 place-items-center rounded-md ${colorClass}`}>
          <Icon className="size-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">{String(data.label ?? definition?.title ?? "Node")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{nodeSubtitle(type, data)}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground">
        <span>{definition?.group ?? "Node"}</span>
        <span>{type}</span>
      </div>
      <Handle
        type="target"
        position={Position.Left}
        className="!size-3 !border !border-border !bg-card"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!size-3 !border !border-border !bg-card"
      />
    </div>
  );
}

function NodeSettingsPanel({
  node,
  animationAssets,
  giftOptions,
  assetMessage,
  isUploadingAsset,
  onChange,
  onUploadAnimation,
  onDelete
}: {
  node: FlowNode | null;
  animationAssets: AnimationAsset[];
  giftOptions: GiftOption[];
  assetMessage: string | null;
  isUploadingAsset: boolean;
  onChange: <K extends keyof AutomationNodeData>(key: K, value: AutomationNodeData[K]) => void;
  onUploadAnimation: (file: File) => void;
  onDelete: () => void;
}) {
  if (!node) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Node Settings</CardTitle>
          <CardDescription>Pilih node di canvas untuk mengubah konfigurasi.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            Klik node seperti Gift Trigger, Condition, atau Show Animation.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Node Settings</CardTitle>
        <CardDescription>Konfigurasi node yang sedang dipilih.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <TextInput
          id="nodeLabel"
          label="Label Node"
          value={String(node.data.label ?? "")}
          onChange={(value) => onChange("label", value)}
        />

        {isTriggerNode(node.type) ? (
          <SelectInput
            id="triggerEvent"
            label="Event"
            value={String(node.data.eventType ?? defaultEventType(node.type))}
            onChange={(value) => onChange("eventType", value as AutomationTriggerType)}
            options={[
              { value: "GIFT", label: "Gift Received" },
              { value: "CHAT", label: "Comment Received" },
              { value: "LIKE", label: "Like Received" },
              { value: "FOLLOW", label: "Follow Received" },
              { value: "SHARE", label: "Share Received" },
              { value: "SUBSCRIBE", label: "Subscribe Received" }
            ]}
          />
        ) : null}

        {node.type === "condition" ? (
          <>
            <SelectInput
              id="conditionField"
              label="Field"
              value={String(node.data.field ?? "giftName")}
              onChange={(value) => onChange("field", value)}
              options={[
                { value: "giftName", label: "Gift name" },
                { value: "giftCount", label: "Gift value/count" },
                { value: "comment", label: "Comment text" },
                { value: "username", label: "Username" },
                { value: "displayName", label: "Display name" },
                { value: "likeCount", label: "Like count" },
                { value: "shareCount", label: "Share count" }
              ]}
            />
            <SelectInput
              id="conditionOperator"
              label="Operator"
              value={String(node.data.operator ?? "equals")}
              onChange={(value) => onChange("operator", value as AutomationNodeData["operator"])}
              options={[
                { value: "equals", label: "Equals" },
                { value: "contains", label: "Contains" },
                { value: "greaterThan", label: "Greater than" },
                { value: "lessThan", label: "Less than" },
                { value: "exists", label: "Exists" }
              ]}
            />
            {node.data.field === "giftName" || (!node.data.field && node.type === "condition") ? (
              <GiftNameValueField
                value={String(node.data.value ?? "")}
                giftOptions={giftOptions}
                onChange={(value) => onChange("value", value)}
              />
            ) : (
              <TextInput
                id="conditionValue"
                label="Value"
                value={String(node.data.value ?? "")}
                onChange={(value) => onChange("value", value)}
                placeholder="Mawar, harga, 10, dst"
              />
            )}
          </>
        ) : null}

        {node.type === "showAnimation" ? (
          <>
            <AnimationAssetField
              value={String(node.data.animationUrl ?? "")}
              assets={animationAssets}
              assetMessage={assetMessage}
              isUploading={isUploadingAsset}
              onChange={(value) => onChange("animationUrl", value)}
              onUpload={onUploadAnimation}
            />
            <SwitchField
              id="useMediaDuration"
              label="Ikuti durasi video"
              description="Jika aktif, overlay hilang setelah file video selesai. Untuk image/Lottie tetap memakai durasi ms sebagai fallback."
              checked={node.data.useMediaDuration === true}
              onChange={(checked) => onChange("useMediaDuration", checked)}
            />
            {node.data.useMediaDuration === true ? (
              <div className="rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
                Durasi tampil ms disimpan sebagai fallback, tapi video akan mengikuti durasi asli sampai selesai.
              </div>
            ) : (
              <NumberInput
                id="durationMs"
                label="Durasi tampil ms"
                value={Number(node.data.durationMs ?? 3000)}
                min={500}
                max={30000}
                step={500}
                onChange={(value) => onChange("durationMs", value)}
              />
            )}
            <SelectInput
              id="animationPosition"
              label="Posisi"
              value={String(node.data.position ?? "center")}
              onChange={(value) => onChange("position", value)}
              options={[
                { value: "top-left", label: "Top Left" },
                { value: "top-center", label: "Top Center" },
                { value: "top-right", label: "Top Right" },
                { value: "center", label: "Center" },
                { value: "bottom-left", label: "Bottom Left" },
                { value: "bottom-center", label: "Bottom Center" },
                { value: "bottom-right", label: "Bottom Right" }
              ]}
            />
            <NumberInput
              id="animationSize"
              label="Ukuran px"
              value={Number(node.data.size ?? 420)}
              min={80}
              max={1200}
              step={20}
              onChange={(value) => onChange("size", value)}
            />
            <SelectInput
              id="animationSound"
              label="Sound optional"
              value={String(node.data.soundUrl ?? "")}
              onChange={(value) => onChange("soundUrl", value)}
              options={soundOptions}
            />
          </>
        ) : null}

        {node.type === "playSound" ? (
          <>
            <SelectInput
              id="soundUrl"
              label="Sound"
              value={String(node.data.soundUrl ?? "")}
              onChange={(value) => onChange("soundUrl", value)}
              options={soundOptions}
            />
            <NumberInput
              id="soundVolume"
              label="Volume"
              value={Number(node.data.volume ?? 1)}
              min={0}
              max={1}
              step={0.1}
              onChange={(value) => onChange("volume", value)}
            />
          </>
        ) : null}

        {node.type === "replyComment" ? (
          <div className="space-y-2">
            <Label htmlFor="replyMessage">Reply message</Label>
            <Textarea
              id="replyMessage"
              value={String(node.data.message ?? "")}
              onChange={(event) => onChange("message", event.target.value)}
              placeholder="Harga tiket bisa dicek di link bio ya kak."
            />
            <p className="text-xs text-muted-foreground">
              Untuk MVP, reply disimpan sebagai execution action. Pengiriman chat TikTok butuh channel khusus karena connector yang dipakai read-only.
            </p>
          </div>
        ) : null}

        <Button type="button" variant="destructive" className="w-full" onClick={onDelete}>
          <Trash2 />
          Hapus Node
        </Button>
      </CardContent>
    </Card>
  );
}

function ExecutionLog({ executions }: { executions: AutomationExecutionRecord[] }) {
  const rows = executions.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Log</CardTitle>
        <CardDescription>5 eksekusi automation terakhir.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="space-y-3">
            {rows.map((execution) => (
              <div key={execution.id} className="rounded-md border p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate font-medium">{execution.flowName}</p>
                  <Badge variant={execution.status === "SUCCESS" ? "default" : execution.status === "ERROR" ? "destructive" : "muted"}>
                    {execution.status}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>{execution.eventType}</span>
                  <span>{formatDateTime(new Date(execution.executedAt))}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-5 text-sm text-muted-foreground">
            Log akan muncul setelah event live memicu automation flow.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function GiftNameValueField({
  value,
  giftOptions,
  onChange
}: {
  value: string;
  giftOptions: GiftOption[];
  onChange: (value: string) => void;
}) {
  const knownValue = giftOptions.some((gift) => gift.value === value);
  const [customMode, setCustomMode] = useState(Boolean(value && !knownValue));
  const observedGifts = giftOptions.filter((gift) => gift.source === "observed");
  const defaultGifts = giftOptions.filter((gift) => gift.source === "default");

  useEffect(() => {
    if (value) {
      setCustomMode(!knownValue);
    }
  }, [knownValue, value]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="conditionGiftName">Gift name</Label>
        <select
          id="conditionGiftName"
          value={customMode ? "__custom" : value}
          onChange={(event) => {
            if (event.target.value === "__custom") {
              setCustomMode(true);
              return;
            }

            setCustomMode(false);
            onChange(event.target.value);
          }}
          className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Pilih gift name</option>
          {observedGifts.length ? (
            <optgroup label="Pernah masuk di live">
              {observedGifts.map((gift) => (
                <option key={`observed-${gift.value}`} value={gift.value}>
                  {gift.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          {defaultGifts.length ? (
            <optgroup label="Template sistem">
              {defaultGifts.map((gift) => (
                <option key={`default-${gift.value}`} value={gift.value}>
                  {gift.label}
                </option>
              ))}
            </optgroup>
          ) : null}
          <option value="__custom">Custom gift name</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Pilihan live diambil dari gift yang sudah pernah terekam di workspace ini.
        </p>
      </div>

      {customMode ? (
        <TextInput
          id="conditionGiftNameCustom"
          label="Custom gift name"
          value={value}
          onChange={onChange}
          placeholder="Masukkan persis seperti nama gift dari TikTok"
        />
      ) : null}
    </div>
  );
}

function AnimationAssetField({
  value,
  assets,
  assetMessage,
  isUploading,
  onChange,
  onUpload
}: {
  value: string;
  assets: AnimationAsset[];
  assetMessage: string | null;
  isUploading: boolean;
  onChange: (value: string) => void;
  onUpload: (file: File) => void;
}) {
  const knownValue = assets.some((asset) => asset.url === value);
  const defaultAssets = assets.filter((asset) => asset.source === "default");
  const workspaceAssets = assets.filter((asset) => asset.source === "workspace");

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="animationAsset">Animation asset</Label>
        <select
          id="animationAsset"
          value={knownValue ? value : value ? "__manual" : ""}
          onChange={(event) => {
            if (event.target.value !== "__manual") {
              onChange(event.target.value);
            }
          }}
          className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Pilih animation asset</option>
          {!knownValue && value ? <option value="__manual">Custom URL aktif</option> : null}
          {defaultAssets.length ? (
            <optgroup label="Default Templates">
              {defaultAssets.map((asset) => (
                <option key={asset.id} value={asset.url}>
                  {asset.label} ({asset.type})
                </option>
              ))}
            </optgroup>
          ) : null}
          {workspaceAssets.length ? (
            <optgroup label="Workspace Uploads">
              {workspaceAssets.map((asset) => (
                <option key={asset.id} value={asset.url}>
                  {asset.label} ({asset.type})
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="animationUrl">Animation file URL</Label>
        <Input
          id="animationUrl"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={defaultAnimationUrl}
        />
        <p className="text-xs text-muted-foreground">
          Mendukung JSON/Lottie, video, dan image. Template default berasal dari `public/uploads/animations/default`.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="animationUpload">Upload ke workspace</Label>
        <Input
          id="animationUpload"
          type="file"
          accept=".json,.lottie,.webm,.mp4,.mov,.png,.jpg,.jpeg,.gif,.webp,.svg,application/json,video/*,image/*"
          disabled={isUploading}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              onUpload(file);
              event.target.value = "";
            }
          }}
        />
        {assetMessage ? <p className="text-xs text-muted-foreground">{assetMessage}</p> : null}
      </div>
    </div>
  );
}

function TextInput({
  id,
  label,
  value,
  onChange,
  placeholder
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function NumberInput({
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
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function SwitchField({
  id,
  label,
  description,
  checked,
  onChange
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <Label htmlFor={id}>{label}</Label>
          {description ? <p className="text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
        </div>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            checked ? "border-primary bg-primary" : "border-input bg-muted"
          }`}
        >
          <span
            className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    </div>
  );
}

function SelectInput({
  id,
  label,
  value,
  onChange,
  options
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

async function readMutationResponse(response: Response): Promise<AutomationFlowMutationResponse> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return {
      ok: false,
      message: "Server mengirim response tidak valid. Coba refresh halaman lalu simpan ulang."
    };
  }

  try {
    return (await response.json()) as AutomationFlowMutationResponse;
  } catch {
    return {
      ok: false,
      message: "Response server tidak bisa dibaca."
    };
  }
}

function createDefaultDraft(): AutomationFlowRecord {
  const nodes: AutomationFlowNode[] = [
    {
      id: "trigger-gift",
      type: "giftTrigger",
      position: {
        x: 80,
        y: 160
      },
      data: {
        label: "Gift Received",
        eventType: "GIFT"
      }
    },
    {
      id: "condition-gift",
      type: "condition",
      position: {
        x: 420,
        y: 160
      },
      data: {
        label: "Gift name equals",
        field: "giftName",
        operator: "equals",
        value: "Mawar"
      }
    },
    {
      id: "action-animation",
      type: "showAnimation",
      position: {
        x: 760,
        y: 160
      },
      data: {
        label: "Show Animation",
        animationUrl: defaultAnimationUrl,
        durationMs: 3000,
        useMediaDuration: false,
        position: "center",
        size: 420
      }
    }
  ];

  return {
    id: "",
    name: "Gift Mawar Animation",
    description: "Saat gift Mawar masuk, tampilkan animasi di overlay.",
    isActive: true,
    nodes,
    edges: [
      {
        id: "edge-trigger-condition",
        source: "trigger-gift",
        target: "condition-gift"
      },
      {
        id: "edge-condition-action",
        source: "condition-gift",
        target: "action-animation"
      }
    ],
    updatedAt: new Date().toISOString()
  };
}

function createNode(type: AutomationNodeType, position: { x: number; y: number }): FlowNode {
  const definition = nodeDefinitions.find((item) => item.type === type);
  const id = `${type}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;

  return {
    id,
    type,
    position,
    data: {
      ...(definition?.defaultData ?? {}),
      label: definition?.defaultData.label ?? definition?.title ?? type
    }
  };
}

function toReactNodes(nodes: AutomationFlowNode[]): FlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: normalizeNodeData(node.data)
  }));
}

function toReactEdges(edges: AutomationFlowEdge[]): FlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed
    }
  }));
}

function toPersistedNodes(nodes: FlowNode[]): AutomationFlowNode[] {
  return nodes.map((node) => ({
    id: node.id,
    type: node.type as AutomationNodeType,
    position: {
      x: node.position.x,
      y: node.position.y
    },
    data: normalizeNodeData(node.data)
  }));
}

function normalizeNodeData(data: AutomationNodeData): AutomationNodeData {
  return {
    ...data,
    animationUrl: normalizeAnimationUrl(data.animationUrl)
  };
}

function normalizeAnimationUrl(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  if (
    value === "/uploads/rose-animation.webm" ||
    value === "/uploads/rose-animation.svg" ||
    value === "/uploads/animations/default/rose-animation.svg"
  ) {
    return defaultAnimationUrl;
  }

  return value;
}

function toPersistedEdges(edges: FlowEdge[]): AutomationFlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target
  }));
}

function isTriggerNode(type: string | undefined) {
  return type === "giftTrigger" || type === "commentTrigger" || type === "likeTrigger" || type === "followTrigger";
}

function defaultEventType(type: string | undefined): AutomationTriggerType {
  if (type === "commentTrigger") {
    return "CHAT";
  }

  if (type === "likeTrigger") {
    return "LIKE";
  }

  if (type === "followTrigger") {
    return "FOLLOW";
  }

  return "GIFT";
}

function getNodeColorClass(type: AutomationNodeType) {
  if (isTriggerNode(type)) {
    return "bg-teal-600 text-white";
  }

  if (type === "condition") {
    return "bg-amber-500 text-black";
  }

  if (type === "replyComment") {
    return "bg-sky-600 text-white";
  }

  if (type === "playSound") {
    return "bg-rose-600 text-white";
  }

  return "bg-violet-600 text-white";
}

function nodeSubtitle(type: AutomationNodeType, data: AutomationNodeData) {
  if (isTriggerNode(type)) {
    return String(data.eventType ?? defaultEventType(type));
  }

  if (type === "condition") {
    return `${String(data.field ?? "field")} ${String(data.operator ?? "equals")} ${String(data.value ?? "")}`;
  }

  if (type === "showAnimation") {
    if (data.useMediaDuration === true) {
      return `${String(data.position ?? "center")} | ikut durasi video`;
    }

    return `${String(data.position ?? "center")} | ${Number(data.durationMs ?? 3000)}ms`;
  }

  if (type === "playSound") {
    return String(data.soundUrl ?? "No sound selected");
  }

  if (type === "replyComment") {
    return String(data.message ?? "Reply message");
  }

  return "Automation node";
}
