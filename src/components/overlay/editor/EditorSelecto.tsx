"use client";

import Selecto from "react-selecto";
import { useRef } from "react";

type EditorSelectoProps = {
  canvasElement: HTMLElement | null;
  onSelectNodes: (ids: string[]) => void;
};

export function EditorSelecto({ canvasElement, onSelectNodes }: EditorSelectoProps) {
  const skipSelectionRef = useRef(false);

  if (!canvasElement) {
    return null;
  }

  return (
    <Selecto
      container={canvasElement}
      dragContainer={canvasElement}
      selectableTargets={[".overlay-editor-node"]}
      selectByClick={false}
      selectFromInside={false}
      continueSelect={false}
      toggleContinueSelect="shift"
      keyContainer={typeof window !== "undefined" ? window : undefined}
      hitRate={20}
      onDragStart={(event: { inputEvent: Event; stop: () => void }) => {
        if (isEditorControlTarget(event.inputEvent.target)) {
          skipSelectionRef.current = true;
          event.stop();
          event.inputEvent.stopPropagation();
          return;
        }

        skipSelectionRef.current = false;
      }}
      onSelectEnd={(event: { selected: Element[] }) => {
        if (skipSelectionRef.current || isEditorControlTarget(document.activeElement)) {
          skipSelectionRef.current = false;
          return;
        }

        const ids = event.selected
          .map((element: Element) => element instanceof HTMLElement ? element.dataset.nodeId : null)
          .filter((id: string | null | undefined): id is string => Boolean(id));

        onSelectNodes(ids);
      }}
    />
  );
}

function isEditorControlTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest("[class*='moveable'], [class*='selecto'], [data-editor-toolbar='true']"));
}
