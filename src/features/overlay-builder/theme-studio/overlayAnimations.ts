export type OverlayAnimationOption = {
  value: string;
  label: string;
};

export const animationInOptions: OverlayAnimationOption[] = [
  { value: "slide-right", label: "Slide In Right" },
  { value: "slide-up", label: "Slide In Up" },
  { value: "fade", label: "Fade In" },
  { value: "scale", label: "Scale In" },
  { value: "pop", label: "Pop In" }
];

export const animationOutOptions: OverlayAnimationOption[] = [
  { value: "fade", label: "Fade Out" },
  { value: "slide-left", label: "Slide Out Left" },
  { value: "slide-down", label: "Slide Out Down" },
  { value: "scale", label: "Scale Out" },
  { value: "pop", label: "Pop Out" }
];

export function resolvePreviewAnimationName(animation: string) {
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

export function resolvePreviewExitAnimationName(animation: string) {
  if (animation === "slide-down") {
    return "themePreviewSlideDownOut";
  }

  if (animation === "slide-left") {
    return "themePreviewSlideLeftOut";
  }

  if (animation === "scale" || animation === "pop") {
    return "themePreviewScaleOut";
  }

  return "themePreviewFadeOut";
}
