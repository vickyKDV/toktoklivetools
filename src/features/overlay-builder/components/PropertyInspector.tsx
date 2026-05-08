"use client";

import { Copy, Eye, EyeOff, Lock, Trash2, Unlock } from "lucide-react";
import { useState, type ReactNode } from "react";
import { componentRegistry, type ComponentSetting } from "@/features/overlay-builder/registry/componentRegistry";
import type { OverlayComponentSchema, OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";
import { isContainerType } from "@/features/overlay-builder/utils/componentTree";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PropertyInspectorProps = {
  designSchema: OverlayDesignSchema;
  selectedComponent: OverlayComponentSchema | null;
  onUpdateDesign: (patch: Partial<OverlayDesignSchema>) => void;
  onUpdateCanvas: (patch: Partial<OverlayDesignSchema["canvas"]>) => void;
  onUpdateComponent: (id: string, patch: Partial<OverlayComponentSchema>) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onMoveIntoContainer: (id: string, parentId: string) => void;
  onRemoveFromContainer: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
  components: Array<OverlayComponentSchema & { parentId: string | null; absoluteX: number; absoluteY: number }>;
};
type PropertyTab = "basic" | "layout" | "content" | "appearance" | "typography" | "animation" | "advanced";

export function PropertyInspector({
  designSchema,
  selectedComponent,
  onUpdateDesign,
  onUpdateCanvas,
  onUpdateComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onMoveIntoContainer,
  onRemoveFromContainer,
  onBringToFront,
  onSendToBack,
  components
}: PropertyInspectorProps) {
  const [tab, setTab] = useState<PropertyTab>("layout");
  const activeTab = selectedComponent
    ? (tab === "basic" ? "layout" : tab)
    : (tab === "content" || tab === "typography" ? "layout" : tab);

  if (!selectedComponent) {
    const canvasTabs: Array<{ value: PropertyTab; label: string }> = [
      { value: "basic", label: "Basic" },
      { value: "layout", label: "Layout" },
      { value: "appearance", label: "Look" },
      { value: "animation", label: "Anim" },
      { value: "advanced", label: "Adv" }
    ];

    return (
      <div className="grid gap-4">
        <PropertyTabs tabs={canvasTabs} value={activeTab} onChange={setTab} />
        {activeTab === "basic" ? (
        <div className="grid gap-4 min-[1400px]:grid-cols-2">
          <DesignNameSection designSchema={designSchema} onUpdateDesign={onUpdateDesign} />
          <EventSourceFields designSchema={designSchema} onUpdateDesign={onUpdateDesign} />
        </div>
        ) : null}
        {activeTab === "layout" ? (
          <LayoutFields designSchema={designSchema} onUpdateDesign={onUpdateDesign} />
        ) : null}
        {activeTab === "appearance" ? (
          <CanvasFields designSchema={designSchema} onUpdateCanvas={onUpdateCanvas} group="appearance" />
        ) : null}
        {activeTab === "animation" ? (
          <CanvasFields designSchema={designSchema} onUpdateCanvas={onUpdateCanvas} group="animation" />
        ) : null}
        {activeTab === "advanced" ? (
          <CanvasFields designSchema={designSchema} onUpdateCanvas={onUpdateCanvas} group="advanced" />
        ) : null}
      </div>
    );
  }

  const registryItem = componentRegistry[selectedComponent.type];
  const selectedMeta = components.find((component) => component.id === selectedComponent.id);
  const containerOptions = components.filter((component) => component.id !== selectedComponent.id && isContainerType(component.type));
  const contentSettings = registryItem.settings.filter((setting) => setting.key.startsWith("props."));
  const componentTabs: Array<{ value: PropertyTab; label: string }> = [
    { value: "layout", label: "Layout" },
    { value: "content", label: "Content" },
    { value: "appearance", label: "Look" },
    { value: "typography", label: "Type" },
    { value: "animation", label: "Anim" },
    { value: "advanced", label: "Adv" }
  ];

  return (
    <div className="grid gap-4">
      <PropertyTabs tabs={componentTabs} value={activeTab} onChange={setTab} />
      {activeTab === "layout" ? (
        <ComponentLayoutSection selectedComponent={selectedComponent} onUpdateComponent={onUpdateComponent} />
      ) : null}
      {activeTab === "content" ? (
        <ComponentContentSection
          selectedComponent={selectedComponent}
          contentSettings={contentSettings}
          onUpdateComponent={onUpdateComponent}
        />
      ) : null}
      {activeTab === "appearance" ? (
        <ComponentVisualFields component={selectedComponent} onUpdateComponent={onUpdateComponent} group="appearance" />
      ) : null}
      {activeTab === "typography" ? (
        <ComponentVisualFields component={selectedComponent} onUpdateComponent={onUpdateComponent} group="typography" />
      ) : null}
      {activeTab === "animation" ? (
        <ComponentVisualFields component={selectedComponent} onUpdateComponent={onUpdateComponent} group="animation" />
      ) : null}
      {activeTab === "advanced" ? (
      <div className="grid gap-4">
        <ComponentActionsSection
          selectedComponent={selectedComponent}
          selectedMeta={selectedMeta}
          containerOptions={containerOptions}
          onUpdateComponent={onUpdateComponent}
          onDeleteComponent={onDeleteComponent}
          onDuplicateComponent={onDuplicateComponent}
          onMoveIntoContainer={onMoveIntoContainer}
          onRemoveFromContainer={onRemoveFromContainer}
          onBringToFront={onBringToFront}
          onSendToBack={onSendToBack}
        />
        <ComponentVisualFields component={selectedComponent} onUpdateComponent={onUpdateComponent} group="advanced" />
      </div>
      ) : null}
    </div>
  );
}

function DesignNameSection({
  designSchema,
  onUpdateDesign
}: {
  designSchema: OverlayDesignSchema;
  onUpdateDesign: (patch: Partial<OverlayDesignSchema>) => void;
}) {
  return (
    <Section title="Design Name">
      <TextField label="Name" value={designSchema.name} onChange={(name) => onUpdateDesign({ name })} />
    </Section>
  );
}

function ComponentActionsSection({
  selectedComponent,
  selectedMeta,
  containerOptions,
  onUpdateComponent,
  onDeleteComponent,
  onDuplicateComponent,
  onMoveIntoContainer,
  onRemoveFromContainer,
  onBringToFront,
  onSendToBack
}: {
  selectedComponent: OverlayComponentSchema;
  selectedMeta: (OverlayComponentSchema & { parentId: string | null; absoluteX: number; absoluteY: number }) | undefined;
  containerOptions: Array<OverlayComponentSchema & { parentId: string | null; absoluteX: number; absoluteY: number }>;
  onUpdateComponent: (id: string, patch: Partial<OverlayComponentSchema>) => void;
  onDeleteComponent: (id: string) => void;
  onDuplicateComponent: (id: string) => void;
  onMoveIntoContainer: (id: string, parentId: string) => void;
  onRemoveFromContainer: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}) {
  return (
    <Section title="Actions">
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" onClick={() => onUpdateComponent(selectedComponent.id, { visible: !selectedComponent.visible })}>
            {selectedComponent.visible ? <EyeOff /> : <Eye />}
            {selectedComponent.visible ? "Hide" : "Show"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onUpdateComponent(selectedComponent.id, { locked: !selectedComponent.locked })}>
            {selectedComponent.locked ? <Unlock /> : <Lock />}
            {selectedComponent.locked ? "Unlock" : "Lock"}
          </Button>
          <Button type="button" variant="outline" onClick={() => onDuplicateComponent(selectedComponent.id)}>
            <Copy />
            Duplicate
          </Button>
          <Button type="button" variant="destructive" onClick={() => onDeleteComponent(selectedComponent.id)}>
            <Trash2 />
            Delete
          </Button>
        </div>
        <div className="space-y-2">
          <Label className="text-xs">Move into container</Label>
          <select
            value=""
            onChange={(event) => {
              if (event.target.value) {
                onMoveIntoContainer(selectedComponent.id, event.target.value);
              }
            }}
            className="flex h-10 w-full rounded-md border border-input bg-card px-4 py-2 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Select container</option>
            {containerOptions.map((component) => (
              <option key={component.id} value={component.id}>{component.name}</option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="outline" disabled={!selectedMeta?.parentId} onClick={() => onRemoveFromContainer(selectedComponent.id)}>
            Remove from container
          </Button>
          <Button type="button" variant="outline" onClick={() => onBringToFront(selectedComponent.id)}>
            Bring to front
          </Button>
          <Button type="button" variant="outline" onClick={() => onSendToBack(selectedComponent.id)}>
            Send to back
          </Button>
        </div>
      </div>
    </Section>
  );
}

function ComponentLayoutSection({
  selectedComponent,
  onUpdateComponent
}: {
  selectedComponent: OverlayComponentSchema;
  onUpdateComponent: (id: string, patch: Partial<OverlayComponentSchema>) => void;
}) {
  return (
    <Section title="Layout">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="X" value={selectedComponent.x} onChange={(x) => onUpdateComponent(selectedComponent.id, { x })} />
        <NumberField label="Y" value={selectedComponent.y} onChange={(y) => onUpdateComponent(selectedComponent.id, { y })} />
        <NumberField label="Width" value={selectedComponent.width} min={1} onChange={(width) => onUpdateComponent(selectedComponent.id, { width })} />
        <NumberField label="Height" value={selectedComponent.height} min={1} onChange={(height) => onUpdateComponent(selectedComponent.id, { height })} />
        <NumberField label="Z Index" value={selectedComponent.zIndex} onChange={(zIndex) => onUpdateComponent(selectedComponent.id, { zIndex })} />
        <NumberField label="Rotate" value={selectedComponent.rotation ?? 0} onChange={(rotation) => onUpdateComponent(selectedComponent.id, { rotation })} />
      </div>
    </Section>
  );
}

function ComponentContentSection({
  selectedComponent,
  contentSettings,
  onUpdateComponent
}: {
  selectedComponent: OverlayComponentSchema;
  contentSettings: ComponentSetting[];
  onUpdateComponent: (id: string, patch: Partial<OverlayComponentSchema>) => void;
}) {
  if (!contentSettings.length) {
    return null;
  }

  return (
    <Section title="Content">
      {contentSettings.map((setting) => (
        <SettingField
          key={setting.key}
          setting={setting}
          component={selectedComponent}
          onChange={(value) => onUpdateComponent(selectedComponent.id, setPath(selectedComponent, setting.key, value))}
        />
      ))}
    </Section>
  );
}

function EventSourceFields({
  designSchema,
  onUpdateDesign
}: {
  designSchema: OverlayDesignSchema;
  onUpdateDesign: (patch: Partial<OverlayDesignSchema>) => void;
}) {
  const dataSource = designSchema.dataSource;
  const enabledTypes = getEnabledEventTypes(designSchema);
  const rawMetric = typeof dataSource.filters?.metric === "string" ? dataSource.filters.metric : "gift";
  const metric = rawMetric === "chat" ? "comment" : rawMetric;
  const updateDataSource = (patch: Partial<OverlayDesignSchema["dataSource"]>) => onUpdateDesign({
    dataSource: {
      ...dataSource,
      ...patch,
      filters: {
        ...dataSource.filters,
        ...(patch.filters ?? {})
      }
    }
  });

  return (
    <Section title="Event Source">
      {designSchema.kind !== "LEADERBOARD" ? (
      <SelectField
        label="Source"
        value={dataSource.type}
        options={[
          { label: "Manual / Focus Dock", value: "manual" },
          { label: "Chat Events", value: "chat" },
          { label: "Gift Events", value: "gift" },
          { label: "Leaderboard Events", value: "leaderboard" },
          { label: "Dock", value: "dock" }
        ]}
        onChange={(type) => updateDataSource({ type: type as OverlayDesignSchema["dataSource"]["type"] })}
      />
      ) : null}
      {designSchema.kind === "LEADERBOARD" ? (
        <SelectField
          label="Leaderboard Metric"
          value={metric}
          options={leaderboardMetricOptions}
          onChange={(nextMetric) => updateDataSource({ type: "leaderboard", filters: { metric: nextMetric } })}
        />
      ) : null}
      {designSchema.kind !== "LEADERBOARD" ? (
      <div className="grid grid-cols-2 gap-3">
        {eventTypeOptions.map((option) => (
          <ToggleField
            key={option.value}
            label={option.label}
            checked={enabledTypes.includes(option.value)}
            onChange={(checked) => {
              const nextTypes = checked
                ? [...enabledTypes, option.value]
                : enabledTypes.filter((item) => item !== option.value);

              updateDataSource({
                filters: {
                  eventTypes: nextTypes.length ? nextTypes : ["CHAT"]
                }
              });
            }}
          />
        ))}
      </div>
      ) : null}
    </Section>
  );
}

function LayoutFields({
  designSchema,
  onUpdateDesign
}: {
  designSchema: OverlayDesignSchema;
  onUpdateDesign: (patch: Partial<OverlayDesignSchema>) => void;
}) {
  const layout = designSchema.layout;
  const isLeaderboard = designSchema.kind === "LEADERBOARD";

  return (
    <>
      <Section title={isLeaderboard ? "Leaderboard Layout" : "List Layout"}>
        <div className="grid grid-cols-2 gap-3">
          {!isLeaderboard ? (
          <SelectField
            label="Mode"
            value={layout.mode}
            options={[
              { label: "Single", value: "single" },
              { label: "List", value: "list" },
              { label: "Ticker", value: "ticker" },
              { label: "Dock", value: "dock" },
              { label: "Grid", value: "grid" }
            ]}
            onChange={(mode) => onUpdateDesign({ layout: { ...layout, mode: mode as OverlayDesignSchema["layout"]["mode"] } })}
          />
          ) : null}
          <NumberField
            label={isLeaderboard ? "Max Leaders" : "Max Items"}
            value={isLeaderboard ? clampLeaderboardMax(layout.maxItems) : layout.maxItems}
            min={isLeaderboard ? 3 : 1}
            max={isLeaderboard ? 50 : 100}
            onChange={(maxItems) => onUpdateDesign({ layout: { ...layout, mode: isLeaderboard ? "list" : layout.mode, maxItems: isLeaderboard ? clampLeaderboardMax(maxItems) : maxItems } })}
          />
          <NumberField label="Gap" value={layout.gap} min={-240} max={240} onChange={(gap) => onUpdateDesign({ layout: { ...layout, gap } })} />
          {layout.mode === "list" && !isLeaderboard ? (
            <SelectField
              label="Direction"
              value={layout.direction}
              options={[
                { label: "Vertical", value: "vertical" },
                { label: "Horizontal", value: "horizontal" }
              ]}
              onChange={(direction) => onUpdateDesign({ layout: { ...layout, direction: direction as OverlayDesignSchema["layout"]["direction"] } })}
            />
          ) : null}
          {layout.mode === "list" && !isLeaderboard ? (
            <SelectField
              label="List Style"
              value={layout.listStyle ?? "stacked_card"}
              options={listStyleOptions}
              onChange={(listStyle) => onUpdateDesign({ layout: { ...layout, listStyle: listStyle as OverlayDesignSchema["layout"]["listStyle"] } })}
            />
          ) : null}
          <SelectField
            label="Align"
            value={layout.align}
            options={[
              { label: "Start", value: "start" },
              { label: "Center", value: "center" },
              { label: "End", value: "end" },
              { label: "Stretch", value: "stretch" }
            ]}
            onChange={(align) => onUpdateDesign({ layout: { ...layout, align: align as OverlayDesignSchema["layout"]["align"] } })}
          />
        </div>
        <ToggleField label="Reverse order" checked={layout.reverse} onChange={(reverse) => onUpdateDesign({ layout: { ...layout, reverse } })} />
      </Section>
      <Section title="Animation">
        <div className="grid grid-cols-2 gap-3">
          <SelectField
            label="Enter"
            value={layout.enterAnimation}
            options={enterAnimationOptions}
            onChange={(enterAnimation) => onUpdateDesign({ layout: { ...layout, enterAnimation } })}
          />
          <SelectField
            label="Exit"
            value={layout.exitAnimation}
            options={exitAnimationOptions}
            onChange={(exitAnimation) => onUpdateDesign({ layout: { ...layout, exitAnimation } })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Duration ms"
            value={layout.animationDurationMs ?? 620}
            min={120}
            max={5000}
            onChange={(animationDurationMs) => onUpdateDesign({ layout: { ...layout, animationDurationMs } })}
          />
          <NumberField
            label="Auto Close ms"
            value={layout.autoCloseMs ?? 0}
            min={0}
            max={600000}
            onChange={(autoCloseMs) => onUpdateDesign({ layout: { ...layout, autoCloseMs } })}
          />
        </div>
        <p className="rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground">Auto Close 0 berarti overlay tidak ditutup otomatis.</p>
      </Section>
    </>
  );
}

function CanvasFields({
  designSchema,
  onUpdateCanvas,
  group = "all"
}: {
  designSchema: OverlayDesignSchema;
  onUpdateCanvas: (patch: Partial<OverlayDesignSchema["canvas"]>) => void;
  group?: "appearance" | "animation" | "advanced" | "all";
}) {
  const canvas = designSchema.canvas;
  const animation = normalizeAnimation(canvas.animation);

  return (
    <>
      {group === "appearance" || group === "all" ? (
      <Section title="Canvas">
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Width" value={canvas.width} min={120} onChange={(width) => onUpdateCanvas({ width })} />
          <NumberField label="Height" value={canvas.height} min={80} onChange={(height) => onUpdateCanvas({ height })} />
          <NumberField label="Opacity" value={canvas.background.opacity} min={0} max={100} onChange={(opacity) => onUpdateCanvas({ background: { ...canvas.background, opacity } })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <NumberField label="Radius" value={canvas.radius} min={0} max={999} onChange={(radius) => onUpdateCanvas({ radius })} />
          <NumberField label="Top Left" value={canvas.radiusTopLeft ?? canvas.radius} min={0} max={999} onChange={(radiusTopLeft) => onUpdateCanvas({ radiusTopLeft })} />
          <NumberField label="Top Right" value={canvas.radiusTopRight ?? canvas.radius} min={0} max={999} onChange={(radiusTopRight) => onUpdateCanvas({ radiusTopRight })} />
          <NumberField label="Bottom Right" value={canvas.radiusBottomRight ?? canvas.radius} min={0} max={999} onChange={(radiusBottomRight) => onUpdateCanvas({ radiusBottomRight })} />
          <NumberField label="Bottom Left" value={canvas.radiusBottomLeft ?? canvas.radius} min={0} max={999} onChange={(radiusBottomLeft) => onUpdateCanvas({ radiusBottomLeft })} />
        </div>
        <ColorField label="Background" value={canvas.background.color} onChange={(color) => onUpdateCanvas({ background: { ...canvas.background, type: "solid", color } })} />
      </Section>
      ) : null}
      {group === "animation" || group === "all" ? (
      <Section title="Canvas Animation">
        <ToggleField label="Enabled" checked={animation.enabled} onChange={(enabled) => onUpdateCanvas({ animation: { ...animation, enabled } })} />
        <SelectField
          label="Effect"
          value={animation.type}
          options={effectAnimationOptions}
          onChange={(type) => onUpdateCanvas({ animation: { ...animation, type: type as NonNullable<OverlayDesignSchema["canvas"]["animation"]>["type"], enabled: type !== "none" } })}
        />
        <div className="grid grid-cols-2 gap-3">
          <ColorField label="Color" value={animation.color} onChange={(color) => onUpdateCanvas({ animation: { ...animation, color } })} />
          <ColorField label="Color 2" value={animation.color2} onChange={(color2) => onUpdateCanvas({ animation: { ...animation, color2 } })} />
          <NumberField label="Duration ms" value={animation.durationMs} min={300} max={20000} onChange={(durationMs) => onUpdateCanvas({ animation: { ...animation, durationMs } })} />
          <NumberField label="Intensity" value={animation.intensity} min={0} max={100} onChange={(intensity) => onUpdateCanvas({ animation: { ...animation, intensity } })} />
        </div>
      </Section>
      ) : null}
      {group === "appearance" || group === "all" ? (
      <>
      <Section title="Canvas Stroke">
        <ToggleField label="Enabled" checked={canvas.stroke.enabled} onChange={(enabled) => onUpdateCanvas({ stroke: { ...canvas.stroke, enabled } })} />
        <ColorField label="Color" value={canvas.stroke.color} onChange={(color) => onUpdateCanvas({ stroke: { ...canvas.stroke, color } })} />
        <NumberField label="Width" value={canvas.stroke.width} min={0} onChange={(width) => onUpdateCanvas({ stroke: { ...canvas.stroke, width } })} />
      </Section>
      <Section title="Canvas Shadow">
        <ToggleField label="Enabled" checked={canvas.shadow.enabled} onChange={(enabled) => onUpdateCanvas({ shadow: { ...canvas.shadow, enabled } })} />
        <ColorField label="Color" value={canvas.shadow.color} onChange={(color) => onUpdateCanvas({ shadow: { ...canvas.shadow, color } })} />
        <div className="grid grid-cols-3 gap-3">
          <NumberField label="Blur" value={canvas.shadow.blur} min={0} onChange={(blur) => onUpdateCanvas({ shadow: { ...canvas.shadow, blur } })} />
          <NumberField label="X" value={canvas.shadow.x} onChange={(x) => onUpdateCanvas({ shadow: { ...canvas.shadow, x } })} />
          <NumberField label="Y" value={canvas.shadow.y} onChange={(y) => onUpdateCanvas({ shadow: { ...canvas.shadow, y } })} />
        </div>
      </Section>
      </>
      ) : null}
    </>
  );
}

function ComponentVisualFields({
  component,
  onUpdateComponent,
  group = "all"
}: {
  component: OverlayComponentSchema;
  onUpdateComponent: (id: string, patch: Partial<OverlayComponentSchema>) => void;
  group?: "appearance" | "typography" | "animation" | "advanced" | "all";
}) {
  const background = normalizeComponentBackground(component);
  const border = component.style.border ?? { enabled: false, color: "#ffffff", width: 0 };
  const shadow = component.style.shadow ?? { enabled: false, color: "#00000055", blur: 0, x: 0, y: 0 };
  const animation = normalizeAnimation(component.style.animation);
  const bubbleTail = {
    enabled: component.style.bubbleTail?.enabled ?? false,
    side: component.style.bubbleTail?.side ?? "left",
    position: component.style.bubbleTail?.position ?? "bottom",
    size: component.style.bubbleTail?.size ?? 22
  };
  const updateStyle = (style: Partial<OverlayComponentSchema["style"]>) => onUpdateComponent(component.id, { style: { ...component.style, ...style } });

  return (
    <>
      {group === "appearance" || group === "all" ? (
        <Section title="Background">
          <SelectField
            label="Background Type"
            value={background.type}
            options={[
              { label: "Transparent", value: "transparent" },
              { label: "Solid", value: "solid" },
              { label: "Gradient", value: "gradient" },
              { label: "Glass", value: "glass" }
            ]}
            onChange={(type) => updateStyle({ background: { ...background, type: type as NonNullable<OverlayComponentSchema["style"]["background"]>["type"] } })}
          />
          <ColorField label="Background Color" value={background.color} onChange={(color) => updateStyle({ background: { ...background, color } })} />
          <NumberField label="Background Opacity" value={background.opacity} min={0} max={100} onChange={(opacity) => updateStyle({ background: { ...background, opacity } })} />
          <ColorField label="Gradient From" value={background.from ?? background.color} onChange={(from) => updateStyle({ background: { ...background, from } })} />
          <ColorField label="Gradient To" value={background.to ?? background.color} onChange={(to) => updateStyle({ background: { ...background, to } })} />
          <NumberField label="Gradient Angle" value={background.angle ?? 135} min={0} max={360} onChange={(angle) => updateStyle({ background: { ...background, angle } })} />
        </Section>
      ) : null}

      {group === "typography" || group === "all" ? (
        <>
          <Section title="Typography">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Font Size" value={component.style.fontSize ?? 16} min={6} max={220} onChange={(fontSize) => updateStyle({ fontSize })} />
              <SelectField
                label="Weight"
                value={String(component.style.fontWeight ?? 400)}
                options={[
                  { label: "Regular", value: "400" },
                  { label: "Semi", value: "600" },
                  { label: "Bold", value: "700" },
                  { label: "Black", value: "900" }
                ]}
                onChange={(fontWeight) => updateStyle({ fontWeight: Number(fontWeight) })}
              />
              <ColorField label="Text Color" value={component.style.color ?? "#ffffff"} onChange={(color) => updateStyle({ color })} />
              <SelectField
                label="Align"
                value={component.style.align ?? "left"}
                options={[
                  { label: "Left", value: "left" },
                  { label: "Center", value: "center" },
                  { label: "Right", value: "right" }
                ]}
                onChange={(align) => updateStyle({ align: align as NonNullable<OverlayComponentSchema["style"]["align"]> })}
              />
              <NumberField label="Line Height" value={component.style.lineHeight ?? 1.2} min={0.6} max={4} step={0.05} onChange={(lineHeight) => updateStyle({ lineHeight })} />
              <NumberField label="Max Lines" value={component.style.maxLines ?? component.style.lineClamp ?? 0} min={0} max={20} onChange={(maxLines) => updateStyle({ maxLines: maxLines > 0 ? maxLines : undefined, lineClamp: undefined })} />
            </div>
            <ToggleField
              label="Auto Height"
              checked={component.type === "comment" ? component.style.autoHeight !== false : component.style.autoHeight === true}
              onChange={(autoHeight) => updateStyle({ autoHeight })}
            />
            <SelectField
              label="Text Overflow"
              value={component.style.textOverflow ?? "clip"}
              options={[
                { label: "Clip", value: "clip" },
                { label: "Ellipsis", value: "ellipsis" }
              ]}
              onChange={(textOverflow) => updateStyle({ textOverflow: textOverflow as NonNullable<OverlayComponentSchema["style"]["textOverflow"]> })}
            />
            <ToggleField
              label="Auto Fit Font Size"
              checked={component.style.autoFitFontSize === true}
              onChange={(autoFitFontSize) => updateStyle({ autoFitFontSize })}
            />
          </Section>
        </>
      ) : null}

      {group === "appearance" || group === "all" ? (
        <>
          <Section title="Shape">
            <div className="grid grid-cols-2 gap-3">
              <NumberField label="Radius" value={component.style.radius ?? 0} min={0} max={999} onChange={(radius) => updateStyle({ radius })} />
              <NumberField label="Top Left" value={component.style.radiusTopLeft ?? component.style.radius ?? 0} min={0} max={999} onChange={(radiusTopLeft) => updateStyle({ radiusTopLeft })} />
              <NumberField label="Top Right" value={component.style.radiusTopRight ?? component.style.radius ?? 0} min={0} max={999} onChange={(radiusTopRight) => updateStyle({ radiusTopRight })} />
              <NumberField label="Bottom Right" value={component.style.radiusBottomRight ?? component.style.radius ?? 0} min={0} max={999} onChange={(radiusBottomRight) => updateStyle({ radiusBottomRight })} />
              <NumberField label="Bottom Left" value={component.style.radiusBottomLeft ?? component.style.radius ?? 0} min={0} max={999} onChange={(radiusBottomLeft) => updateStyle({ radiusBottomLeft })} />
              <NumberField label="Opacity" value={component.style.opacity ?? 100} min={0} max={100} onChange={(opacity) => updateStyle({ opacity })} />
              <NumberField label="Blur" value={component.style.blur ?? 0} min={0} max={80} onChange={(blur) => updateStyle({ blur })} />
              <NumberField label="Backdrop Blur" value={component.style.backdropBlur ?? 0} min={0} max={80} onChange={(backdropBlur) => updateStyle({ backdropBlur })} />
            </div>
            <SelectField
              label="Overflow"
              value={component.style.overflow ?? "hidden"}
              options={[
                { label: "Visible", value: "visible" },
                { label: "Hidden", value: "hidden" }
              ]}
              onChange={(overflow) => updateStyle({ overflow: overflow as NonNullable<OverlayComponentSchema["style"]["overflow"]> })}
            />
            <SelectField
              label="Object Fit"
              value={component.style.objectFit ?? "cover"}
              options={[
                { label: "Cover", value: "cover" },
                { label: "Contain", value: "contain" }
              ]}
              onChange={(objectFit) => updateStyle({ objectFit: objectFit as NonNullable<OverlayComponentSchema["style"]["objectFit"]> })}
            />
          </Section>
          <Section title="Bubble Tail">
            <ToggleField
              label="Enabled"
              checked={bubbleTail.enabled}
              onChange={(enabled) => updateStyle({ bubbleTail: { ...bubbleTail, enabled } })}
            />
            <div className="grid grid-cols-2 gap-3">
              <SelectField
                label="Side"
                value={bubbleTail.side}
                options={[
                  { label: "Left", value: "left" },
                  { label: "Right", value: "right" }
                ]}
                onChange={(side) => updateStyle({ bubbleTail: { ...bubbleTail, side: side as "left" | "right" } })}
              />
              <SelectField
                label="Position"
                value={bubbleTail.position}
                options={[
                  { label: "Top", value: "top" },
                  { label: "Center", value: "center" },
                  { label: "Bottom", value: "bottom" }
                ]}
                onChange={(position) => updateStyle({ bubbleTail: { ...bubbleTail, position: position as "top" | "center" | "bottom" } })}
              />
              <NumberField
                label="Size"
                value={bubbleTail.size}
                min={4}
                max={120}
                onChange={(size) => updateStyle({ bubbleTail: { ...bubbleTail, size } })}
              />
            </div>
          </Section>
        </>
      ) : null}

      {group === "appearance" || group === "all" ? (
        <>
          <Section title="Border">
        <ToggleField
          label="Enabled"
          checked={border.enabled}
          onChange={(enabled) => updateStyle({ border: { ...border, enabled } })}
        />
        <ColorField
          label="Color"
          value={border.color}
          onChange={(color) => updateStyle({ border: { ...border, color } })}
        />
        <NumberField
          label="Width"
          value={border.width}
          min={0}
          onChange={(width) => updateStyle({ border: { ...border, width } })}
        />
          </Section>

          <Section title="Shadow">
        <ToggleField
          label="Enabled"
          checked={shadow.enabled}
          onChange={(enabled) => updateStyle({ shadow: { ...shadow, enabled } })}
        />
        <ColorField
          label="Color"
          value={shadow.color}
          onChange={(color) => updateStyle({ shadow: { ...shadow, color } })}
        />
        <div className="grid grid-cols-3 gap-3">
          <NumberField
            label="Blur"
            value={shadow.blur}
            min={0}
            onChange={(blur) => updateStyle({ shadow: { ...shadow, blur } })}
          />
          <NumberField
            label="X"
            value={shadow.x}
            onChange={(x) => updateStyle({ shadow: { ...shadow, x } })}
          />
          <NumberField
            label="Y"
            value={shadow.y}
            onChange={(y) => updateStyle({ shadow: { ...shadow, y } })}
          />
        </div>
          </Section>
        </>
      ) : null}

      {group === "animation" || group === "all" ? (
        <Section title="Animation">
          <ToggleField label="Enabled" checked={animation.enabled} onChange={(enabled) => updateStyle({ animation: { ...animation, enabled } })} />
          <SelectField
            label="Effect"
            value={animation.type}
            options={effectAnimationOptions}
            onChange={(type) => updateStyle({ animation: { ...animation, type: type as NonNullable<OverlayComponentSchema["style"]["animation"]>["type"], enabled: type !== "none" } })}
          />
          <div className="grid grid-cols-2 gap-3">
            <ColorField label="Color" value={animation.color} onChange={(color) => updateStyle({ animation: { ...animation, color } })} />
            <ColorField label="Color 2" value={animation.color2} onChange={(color2) => updateStyle({ animation: { ...animation, color2 } })} />
            <NumberField label="Duration ms" value={animation.durationMs} min={300} max={20000} onChange={(durationMs) => updateStyle({ animation: { ...animation, durationMs } })} />
            <NumberField label="Intensity" value={animation.intensity} min={0} max={100} onChange={(intensity) => updateStyle({ animation: { ...animation, intensity } })} />
          </div>
        </Section>
      ) : null}
    </>
  );
}

function normalizeAnimation(
  animation: OverlayComponentSchema["style"]["animation"] | OverlayDesignSchema["canvas"]["animation"] | undefined
): NonNullable<OverlayComponentSchema["style"]["animation"]> {
  return {
    type: animation?.type ?? "none",
    enabled: animation?.enabled ?? false,
    color: animation?.color ?? "#22d3ee",
    color2: animation?.color2 ?? "#f43f5e",
    durationMs: animation?.durationMs ?? 2400,
    intensity: animation?.intensity ?? 70
  };
}

function normalizeComponentBackground(component: OverlayComponentSchema): NonNullable<OverlayComponentSchema["style"]["background"]> {
  if (component.style.background) {
    return {
      type: component.style.background.type ?? "solid",
      color: component.style.background.color ?? component.style.backgroundColor ?? "#ffffff",
      opacity: component.style.background.opacity ?? 100,
      from: component.style.background.from,
      to: component.style.background.to,
      angle: component.style.background.angle
    };
  }

  if (component.style.backgroundColor) {
    return {
      type: "solid",
      color: component.style.backgroundColor,
      opacity: 100
    };
  }

  return {
    type: "transparent",
    color: "transparent",
    opacity: 0
  };
}

function SettingField({
  setting,
  component,
  onChange
}: {
  setting: ComponentSetting;
  component: OverlayComponentSchema;
  onChange: (value: string | number | boolean) => void;
}) {
  const value = getPath(component, setting.key);

  if (setting.type === "toggle") {
    return <ToggleField label={setting.label} checked={Boolean(value)} onChange={onChange} />;
  }

  if (setting.type === "color") {
    return <ColorField label={setting.label} value={String(value ?? "#ffffff")} onChange={onChange} />;
  }

  if (setting.type === "select") {
    return (
      <div className="space-y-1.5">
        <Label className="text-xs">{setting.label}</Label>
        <select
          value={String(value ?? "")}
          onChange={(event) => {
            const option = setting.options.find((item) => String(item.value) === event.target.value);
            onChange(option?.value ?? event.target.value);
          }}
          className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1.5 text-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          {setting.options.map((option) => (
            <option key={String(option.value)} value={String(option.value)}>{option.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (setting.type === "number") {
    return (
      <NumberField
        label={setting.label}
        value={Number(value ?? 0)}
        min={setting.min}
        max={setting.max}
        step={setting.step}
        onChange={onChange}
      />
    );
  }

  return <TextField label={setting.label} value={String(value ?? "")} onChange={onChange} />;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-md border bg-muted/20 p-3">
      <p className="text-xs font-semibold text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function PropertyTabs({
  tabs,
  value,
  onChange
}: {
  tabs: Array<{ value: PropertyTab; label: string }>;
  value: PropertyTab;
  onChange: (value: PropertyTab) => void;
}) {
  return (
    <div className="flex w-full max-w-full flex-nowrap gap-1.5 overflow-x-auto rounded-lg border bg-muted/40 p-1.5">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={`min-w-[3.25rem] flex-1 shrink-0 rounded-md border px-3 py-2 text-center text-[11px] font-semibold transition-colors ${
            value === tab.value
              ? "border-border bg-card text-foreground shadow-sm"
              : "border-transparent bg-background/45 text-muted-foreground hover:border-border hover:bg-card"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function NumberField({
  label,
  value,
  min = -10000,
  max = 10000,
  step = 1,
  onChange
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input className="h-9 px-3 py-1.5 text-xs" type="number" value={value} min={min} max={max} step={step} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Input className="h-9 px-3 py-1.5 text-xs" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function SelectField({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: Array<{ label: string; value: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="flex h-9 w-full rounded-md border border-input bg-card px-3 py-1.5 text-xs outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-3">
        <input
          type="color"
          value={toColorInput(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-9 w-11 rounded-md border border-input bg-card p-1"
        />
        <Input className="h-9 px-3 py-1.5 text-xs" value={value} onChange={(event) => onChange(event.target.value)} />
      </div>
    </div>
  );
}

function ToggleField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex h-9 items-center gap-2.5 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-muted">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="size-3.5 accent-primary" />
      {label}
    </label>
  );
}

function setPath(component: OverlayComponentSchema, path: string, value: string | number | boolean): Partial<OverlayComponentSchema> {
  const [root, ...keys] = path.split(".");

  if (root === "props") {
    return { props: setNestedValue(component.props, keys, value) };
  }

  return { style: setNestedValue(component.style, keys, value) };
}

function getPath(component: OverlayComponentSchema, path: string) {
  const [root, ...keys] = path.split(".");
  const source = root === "props" ? component.props : component.style;

  return keys.reduce<unknown>((current, key) => (
    typeof current === "object" && current !== null ? (current as Record<string, unknown>)[key] : undefined
  ), source);
}

function setNestedValue<T extends Record<string, unknown>>(source: T, keys: string[], value: string | number | boolean): T {
  const [key, ...rest] = keys;

  if (!key) {
    return source;
  }

  if (!rest.length) {
    return {
      ...source,
      [key]: value
    };
  }

  const current = typeof source[key] === "object" && source[key] !== null ? source[key] as Record<string, unknown> : {};

  return {
    ...source,
    [key]: setNestedValue(current, rest, value)
  };
}

function toColorInput(value: string) {
  if (/^#[0-9a-f]{6}$/i.test(value)) {
    return value;
  }

  if (/^#[0-9a-f]{8}$/i.test(value)) {
    return value.slice(0, 7);
  }

  return "#ffffff";
}

const enterAnimationOptions = [
  { label: "Fade In", value: "fade" },
  { label: "Zoom In", value: "zoom-in" },
  { label: "Slide Left In", value: "slide-left" },
  { label: "Slide Right In", value: "slide-right" },
  { label: "Slide Up In", value: "slide-up" },
  { label: "Slide Down In", value: "slide-down" },
  { label: "Bounce In", value: "bounce-in" },
  { label: "Pop In", value: "pop-in" }
];

const exitAnimationOptions = [
  { label: "Fade Out", value: "fade" },
  { label: "Zoom Out", value: "zoom-out" },
  { label: "Slide Left Out", value: "slide-left" },
  { label: "Slide Right Out", value: "slide-right" },
  { label: "Slide Up Out", value: "slide-up" },
  { label: "Slide Down Out", value: "slide-down" },
  { label: "Bounce Out", value: "bounce-out" }
];

const listStyleOptions = [
  { label: "Default", value: "default" },
  { label: "Stacked Card UI", value: "stacked_card" },
  { label: "Layered List", value: "layered_list" },
  { label: "Card Stack", value: "card_stack" },
  { label: "Focus Stack List", value: "focus_stack" },
  { label: "Depth List UI", value: "depth_list" }
];

const leaderboardMetricOptions = [
  { label: "Gifts", value: "gift" },
  { label: "Likes", value: "like" },
  { label: "Views", value: "view" },
  { label: "Comments", value: "comment" }
];

const effectAnimationOptions = [
  { label: "None", value: "none" },
  { label: "Glow", value: "glow" },
  { label: "Pulse", value: "pulse" },
  { label: "Neon", value: "neon" },
  { label: "Rotating Neon", value: "rotate_neon" },
  { label: "Gradient Sweep", value: "gradient_shift" },
  { label: "Float Glow", value: "float" }
];

const eventTypeOptions = [
  { label: "Chat", value: "CHAT" },
  { label: "Join", value: "JOIN" },
  { label: "Like", value: "LIKE" },
  { label: "Share", value: "SHARE" },
  { label: "Follow", value: "FOLLOW" },
  { label: "Gift", value: "GIFT" }
];

function getEnabledEventTypes(schema: OverlayDesignSchema) {
  const value = schema.dataSource.filters?.eventTypes;

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  if (schema.dataSource.type === "gift") {
    return ["GIFT"];
  }

  if (schema.dataSource.type === "leaderboard") {
    const metric = schema.dataSource.filters?.metric;

    if (metric === "like") {
      return ["LIKE"];
    }

    if (metric === "view") {
      return ["VIEW"];
    }

    if (metric === "comment" || metric === "chat") {
      return ["CHAT"];
    }

    return ["GIFT"];
  }

  return ["CHAT"];
}

function clampLeaderboardMax(value: number) {
  return Math.min(50, Math.max(3, Number.isFinite(Number(value)) ? Number(value) : 10));
}
