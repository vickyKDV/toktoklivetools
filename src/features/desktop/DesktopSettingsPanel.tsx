"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Copy, Monitor, Play, RefreshCw, Save, Square, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createTauriCommandBridge } from "@/runtime/desktop/tauri-bridge";
import type { DesktopLocalConfig } from "@/runtime/desktop/local-config";
import { setDesktopObsBrowserSourceUrl, testDesktopObsConnection } from "@/runtime/desktop/obs-websocket-client";

type DesktopSettingsPanelProps = {
  workspaceId: string;
  overlayKey: string;
  overlays: DesktopOverlayOption[];
};

type DesktopOverlayOption = {
  id: string;
  name: string;
  kind: string;
  publishedAt: string | null;
};

type StatusState = {
  kind: "idle" | "success" | "error";
  message: string;
};

export function DesktopSettingsPanel({ workspaceId, overlayKey, overlays }: DesktopSettingsPanelProps) {
  const bridge = useMemo(() => createTauriCommandBridge(), []);
  const [config, setConfig] = useState<DesktopLocalConfig | null>(null);
  const [health, setHealth] = useState<unknown>(null);
  const [sidecars, setSidecars] = useState<unknown>(null);
  const [status, setStatus] = useState<StatusState>({ kind: "idle", message: "" });
  const [busy, setBusy] = useState(false);
  const [selectedOverlayId, setSelectedOverlayId] = useState(
    () => overlays.find((overlay) => overlay.publishedAt)?.id ?? overlays[0]?.id ?? ""
  );

  const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId) ?? overlays[0] ?? null;
  const localOverlayUrl = config ? buildLocalOverlayUrl(config.overlay.baseUrl, selectedOverlay, overlayKey) : "";

  useEffect(() => {
    if (!bridge.available) {
      return;
    }

    void refreshDesktopState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bridge.available]);

  if (!bridge.available) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Desktop Runtime</CardTitle>
          <CardDescription>
            Pengaturan ini aktif saat Liplo berjalan sebagai aplikasi desktop Tauri.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  async function refreshDesktopState() {
    setBusy(true);
    try {
      const [nextConfig, nextHealth, nextSidecars] = await Promise.all([
        bridge.readConfig(),
        bridge.checkDesktopHealth(),
        bridge.getSidecarStatus()
      ]);
      setConfig(nextConfig);
      setHealth(nextHealth);
      setSidecars(nextSidecars);
      setStatus({ kind: "success", message: "Desktop runtime status refreshed." });
    } catch (error) {
      setStatus({ kind: "error", message: toErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function saveConfig() {
    if (!config) {
      return;
    }

    setBusy(true);
    try {
      await bridge.writeConfig(config);
      setStatus({ kind: "success", message: "Desktop config saved." });
    } catch (error) {
      setStatus({ kind: "error", message: toErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function startSidecars() {
    setBusy(true);
    try {
      await bridge.startSidecars();
      await refreshDesktopState();
      setStatus({ kind: "success", message: "Local runtime started." });
    } catch (error) {
      setStatus({ kind: "error", message: toErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function stopSidecars() {
    setBusy(true);
    try {
      await bridge.stopSidecars();
      await refreshDesktopState();
      setStatus({ kind: "success", message: "Local runtime stopped." });
    } catch (error) {
      setStatus({ kind: "error", message: toErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function restartSidecars() {
    setBusy(true);
    try {
      await bridge.restartSidecars();
      await refreshDesktopState();
      setStatus({ kind: "success", message: "Local runtime restarted." });
    } catch (error) {
      setStatus({ kind: "error", message: toErrorMessage(error) });
    } finally {
      setBusy(false);
    }
  }

  async function testObs() {
    if (!config) {
      return;
    }

    setBusy(true);
    try {
      const result = await testDesktopObsConnection(config);
      setStatus({
        kind: result.ok ? "success" : "error",
        message: result.ok ? "OBS websocket reachable." : result.error ?? "OBS websocket failed."
      });
    } finally {
      setBusy(false);
    }
  }

  async function sendUrlToObs() {
    if (!config || !localOverlayUrl) {
      return;
    }

    setBusy(true);
    try {
      const result = await setDesktopObsBrowserSourceUrl(
        config,
        config.obs.defaultBrowserSourceName,
        localOverlayUrl
      );
      setStatus({
        kind: result.ok ? "success" : "error",
        message: result.ok ? "OBS Browser Source URL updated." : result.error ?? "OBS update failed."
      });
    } finally {
      setBusy(false);
    }
  }

  function patchConfig(patch: Partial<DesktopLocalConfig>) {
    setConfig((current) => current ? { ...current, ...patch } : current);
  }

  function patchNested<TKey extends keyof DesktopLocalConfig>(
    key: TKey,
    patch: Partial<DesktopLocalConfig[TKey]>
  ) {
    setConfig((current) => {
      if (!current) {
        return current;
      }

      return {
        ...current,
        [key]: {
          ...(current[key] as object),
          ...patch
        }
      };
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desktop Runtime</CardTitle>
        <CardDescription>
          Local runtime untuk OBS/TikTok desktop. Data tetap cloud-backed; desktop tidak direct-connect ke MySQL produksi.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {status.message ? (
          <div
            className={
              status.kind === "error"
                ? "rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                : "rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-sm text-primary"
            }
          >
            {status.message}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={refreshDesktopState} disabled={busy}>
            <RefreshCw />
            Refresh
          </Button>
          <Button type="button" variant="outline" onClick={startSidecars} disabled={busy}>
            <Play />
            Start Runtime
          </Button>
          <Button type="button" variant="outline" onClick={stopSidecars} disabled={busy}>
            <Square />
            Stop
          </Button>
          <Button type="button" variant="outline" onClick={restartSidecars} disabled={busy}>
            <Activity />
            Restart
          </Button>
          <Button type="button" onClick={saveConfig} disabled={busy || !config}>
            <Save />
            Save Config
          </Button>
        </div>

        {config ? (
          <>
            <section className="grid gap-3 rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-semibold">Local Web Runtime</p>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Host" value={config.web.host} onChange={(host) => patchNested("web", { host })} />
                <Field
                  label="Port"
                  type="number"
                  value={String(config.web.port)}
                  onChange={(port) => patchNested("web", { port: Number(port) })}
                />
                <Field
                  label="Base URL"
                  value={config.web.baseUrl}
                  onChange={(baseUrl) => {
                    patchNested("web", { baseUrl });
                    patchNested("overlay", { baseUrl });
                  }}
                />
              </div>
            </section>

            <section className="grid gap-3 rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-semibold">Realtime Socket</p>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Host" value={config.realtime.host} onChange={(host) => patchNested("realtime", { host })} />
                <Field
                  label="Port"
                  type="number"
                  value={String(config.realtime.port)}
                  onChange={(port) => patchNested("realtime", { port: Number(port) })}
                />
                <Field
                  label="Socket URL"
                  value={config.realtime.socketUrl}
                  onChange={(socketUrl) => patchNested("realtime", { socketUrl })}
                />
                <Field label="Path" value={config.realtime.path} onChange={(path) => patchNested("realtime", { path })} />
              </div>
            </section>

            <section className="grid gap-3 rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-semibold">OBS Websocket</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field
                  label="Websocket URL"
                  value={config.obs.websocketUrl}
                  onChange={(websocketUrl) => patchNested("obs", { websocketUrl })}
                />
                <Field
                  label="Password"
                  type="password"
                  value={config.obs.password}
                  onChange={(password) => patchNested("obs", { password })}
                />
                <Field
                  label="Scene"
                  value={config.obs.defaultSceneName}
                  onChange={(defaultSceneName) => patchNested("obs", { defaultSceneName })}
                />
                <Field
                  label="Browser Source"
                  value={config.obs.defaultBrowserSourceName}
                  onChange={(defaultBrowserSourceName) => patchNested("obs", { defaultBrowserSourceName })}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={testObs} disabled={busy}>
                  <Wifi />
                  Test OBS
                </Button>
                <Button type="button" variant="outline" onClick={sendUrlToObs} disabled={busy}>
                  <Monitor />
                  Send URL to OBS
                </Button>
              </div>
            </section>

            <section className="grid gap-3 rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-semibold">Overlay</p>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Overlay Base URL" value={config.overlay.baseUrl} onChange={(baseUrl) => patchNested("overlay", { baseUrl })} />
                {overlays.length ? (
                  <div className="space-y-1.5">
                    <Label>OBS Overlay</Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      value={selectedOverlay?.id ?? ""}
                      onChange={(event) => setSelectedOverlayId(event.currentTarget.value)}
                    >
                      {overlays.map((overlay) => (
                        <option key={overlay.id} value={overlay.id}>
                          {overlay.name} ({overlay.kind.toLowerCase()}{overlay.publishedAt ? "" : ", draft"})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <Input readOnly value={localOverlayUrl} className="font-mono text-xs" />
                <div className="flex items-end">
                  <Button type="button" variant="outline" onClick={() => void navigator.clipboard.writeText(localOverlayUrl)}>
                    <Copy />
                    Copy Local URL
                  </Button>
                </div>
              </div>
              <p className="rounded-md border bg-background px-3 py-2 font-mono text-xs text-muted-foreground">
                {localOverlayUrl}
              </p>
              <p className="text-xs text-muted-foreground">
                {selectedOverlay
                  ? `Workspace: ${workspaceId} · Overlay: ${selectedOverlay.name}`
                  : `Workspace: ${workspaceId} · Fallback dock: ${overlayKey}`}
              </p>
            </section>

            <section className="grid gap-3 rounded-md border bg-muted/20 p-3">
              <p className="text-sm font-semibold">Hotkeys</p>
              {config.hotkeys.map((hotkey, index) => (
                <div key={hotkey.id} className="grid gap-2 rounded-md border bg-background p-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
                  <Field
                    label={hotkey.label}
                    value={hotkey.accelerator}
                    onChange={(accelerator) => {
                      const nextHotkeys = [...config.hotkeys];
                      nextHotkeys[index] = { ...hotkey, accelerator };
                      patchConfig({ hotkeys: nextHotkeys });
                    }}
                  />
                  <p className="text-xs text-muted-foreground">{hotkey.action.command}</p>
                  <label className="flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={hotkey.enabled}
                      onChange={(event) => {
                        const nextHotkeys = [...config.hotkeys];
                        nextHotkeys[index] = { ...hotkey, enabled: event.currentTarget.checked };
                        patchConfig({ hotkeys: nextHotkeys });
                      }}
                    />
                    Enabled
                  </label>
                </div>
              ))}
            </section>
          </>
        ) : (
          <div className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Desktop config belum terbaca.
          </div>
        )}

        <section className="grid gap-3 rounded-md border bg-muted/20 p-3">
          <p className="text-sm font-semibold">Diagnostics</p>
          <pre className="max-h-56 overflow-auto rounded-md bg-background p-3 text-xs text-muted-foreground">
            {JSON.stringify({ health, sidecars }, null, 2)}
          </pre>
        </section>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text"
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} onChange={(event) => onChange(event.currentTarget.value)} />
    </div>
  );
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function buildLocalOverlayUrl(baseUrl: string, overlay: DesktopOverlayOption | null, overlayKey: string) {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, "");

  if (overlay) {
    return `${normalizedBaseUrl}/overlay/${overlay.kind.toLowerCase()}/${overlay.id}`;
  }

  return `${normalizedBaseUrl}/widgets/dock/chat/${overlayKey}`;
}
