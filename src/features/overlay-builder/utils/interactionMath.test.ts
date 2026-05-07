import assert from "node:assert/strict";
import test from "node:test";
import {
  getDragLayout,
  getPointerDelta,
  getResizedLayout,
  sanitizeInteractionLayout,
  type InteractionLayout
} from "./interactionMath";

const startLayout: InteractionLayout = {
  x: 100,
  y: 80,
  width: 200,
  height: 120
};

test("converts viewport pointer delta into scene delta using frozen viewport scale", () => {
  const result = getPointerDelta({
    startPointer: { x: 100, y: 50 },
    currentPointer: { x: 160, y: 20 },
    viewportScale: 2
  });

  assert.deepEqual(result, {
    rawDelta: { x: 60, y: -30 },
    sceneDelta: { x: 30, y: -15 }
  });
});

test("keeps pointer conversion finite for invalid pointer values", () => {
  const result = getPointerDelta({
    startPointer: { x: Number.NaN, y: Number.POSITIVE_INFINITY },
    currentPointer: { x: Number.NaN, y: Number.NEGATIVE_INFINITY },
    viewportScale: 0
  });

  assert.deepEqual(result, {
    rawDelta: { x: 0, y: 0 },
    sceneDelta: { x: 0, y: 0 }
  });
});

test("drag movement uses initial layout and scene delta", () => {
  assert.deepEqual(getDragLayout({
    startLayout,
    sceneDelta: { x: -25, y: 15 }
  }), {
    x: 75,
    y: 95,
    width: 200,
    height: 120
  });
});

test("resizes from left by moving x and shrinking width", () => {
  assert.deepEqual(getResizedLayout({
    startLayout,
    handle: "w",
    sceneDelta: { x: 30, y: 999 }
  }), {
    x: 130,
    y: 80,
    width: 170,
    height: 120
  });
});

test("resizes from right by changing width only", () => {
  assert.deepEqual(getResizedLayout({
    startLayout,
    handle: "e",
    sceneDelta: { x: 45, y: 999 }
  }), {
    x: 100,
    y: 80,
    width: 245,
    height: 120
  });
});

test("resizes from top by moving y and shrinking height", () => {
  assert.deepEqual(getResizedLayout({
    startLayout,
    handle: "n",
    sceneDelta: { x: 999, y: 25 }
  }), {
    x: 100,
    y: 105,
    width: 200,
    height: 95
  });
});

test("resizes from bottom by changing height only", () => {
  assert.deepEqual(getResizedLayout({
    startLayout,
    handle: "s",
    sceneDelta: { x: 999, y: 35 }
  }), {
    x: 100,
    y: 80,
    width: 200,
    height: 155
  });
});

test("resizes from a corner by combining horizontal and vertical formulas", () => {
  assert.deepEqual(getResizedLayout({
    startLayout,
    handle: "nw",
    sceneDelta: { x: 20, y: -10 }
  }), {
    x: 120,
    y: 70,
    width: 180,
    height: 130
  });
});

test("scaled viewport resize uses initial snapshot layout, not accumulated layout", () => {
  const first = getResizedLayout({
    startLayout,
    handle: "w",
    sceneDelta: getPointerDelta({
      startPointer: { x: 0, y: 0 },
      currentPointer: { x: 40, y: 0 },
      viewportScale: 2
    }).sceneDelta
  });
  const second = getResizedLayout({
    startLayout,
    handle: "w",
    sceneDelta: getPointerDelta({
      startPointer: { x: 0, y: 0 },
      currentPointer: { x: 80, y: 0 },
      viewportScale: 2
    }).sceneDelta
  });

  assert.deepEqual(first, {
    x: 120,
    y: 80,
    width: 180,
    height: 120
  });
  assert.deepEqual(second, {
    x: 140,
    y: 80,
    width: 160,
    height: 120
  });
});

test("prevents negative width when resizing past the opposite edge", () => {
  assert.deepEqual(getResizedLayout({
    startLayout,
    handle: "w",
    sceneDelta: { x: 500, y: 0 }
  }), {
    x: 288,
    y: 80,
    width: 12,
    height: 120
  });
});

test("prevents negative height when resizing past the opposite edge", () => {
  assert.deepEqual(getResizedLayout({
    startLayout,
    handle: "n",
    sceneDelta: { x: 0, y: 500 }
  }), {
    x: 100,
    y: 188,
    width: 200,
    height: 12
  });
});

test("sanitizes NaN and Infinity before committing layout", () => {
  assert.deepEqual(sanitizeInteractionLayout({
    x: Number.NaN,
    y: Number.POSITIVE_INFINITY,
    width: Number.NEGATIVE_INFINITY,
    height: Number.NaN
  }), {
    x: 0,
    y: 0,
    width: 12,
    height: 12
  });
});

test("locks aspect ratio on corner resize when requested", () => {
  assert.deepEqual(getResizedLayout({
    startLayout,
    handle: "se",
    sceneDelta: { x: 100, y: 0 },
    lockAspectRatio: true
  }), {
    x: 100,
    y: 80,
    width: 300,
    height: 180
  });
});
