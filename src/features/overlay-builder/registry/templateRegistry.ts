import { chatOverlayThemes } from "@/features/overlay-builder/theme-studio/overlayThemes";

export type OverlayTemplate = {
  id: string;
  name: string;
  description: string;
  schema: unknown;
};

export const moderatorStackTemplate: OverlayTemplate = {
  id: "moderator-stack",
  name: "Moderator Stack",
  description: "Kartu chat compact dengan avatar, nama, badge, dan komentar.",
  schema: {
    version: 1,
    name: "Moderator Stack",
    canvas: {
      width: 800,
      height: 600,
      background: { type: "solid", color: "#4d85ff", opacity: 100 },
      radius: 28,
      stroke: { enabled: false, color: "#ffffff", width: 0 },
      shadow: { enabled: true, color: "#00000055", blur: 24, x: 0, y: 12 }
    },
    components: [
      {
        id: "profile_1",
        type: "profile_photo",
        name: "Foto Profil",
        x: 22,
        y: 42,
        width: 72,
        height: 72,
        zIndex: 1,
        visible: true,
        locked: false,
        props: { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" },
        style: {
          radius: 999,
          opacity: 100,
          border: { enabled: true, color: "#ffffff", width: 3 },
          objectFit: "cover"
        }
      },
      {
        id: "name_1",
        type: "viewer_name",
        name: "Nama",
        x: 120,
        y: 34,
        width: 250,
        height: 34,
        zIndex: 2,
        visible: true,
        locked: false,
        props: { text: "{{viewer.name}}" },
        style: { fontSize: 24, fontWeight: 800, color: "#ffffff", align: "left", lineHeight: 1.1 }
      },
      {
        id: "badge_1",
        type: "viewer_badge",
        name: "Badge",
        x: 398,
        y: 35,
        width: 150,
        height: 28,
        zIndex: 3,
        visible: true,
        locked: false,
        props: { text: "{{viewer.badge}}" },
        style: { radius: 8, fontSize: 13, fontWeight: 900, color: "#ffffff", align: "center", backgroundColor: "#dc2626" }
      },
      {
        id: "comment_1",
        type: "comment",
        name: "Komentar",
        x: 120,
        y: 78,
        width: 610,
        height: 86,
        zIndex: 4,
        visible: true,
        locked: false,
        props: { text: "{{comment.text}}" },
        style: { fontSize: 30, fontWeight: 800, color: "#ffffff", align: "left", lineHeight: 1.15 }
      }
    ]
  }
};

const leaderboardTemplates: OverlayTemplate[] = [
  createLeaderboardTemplate({
    id: "leaderboard-default-clean",
    name: "Default Clean",
    description: "Leaderboard clean dengan card putih sederhana dan text hitam.",
    cardType: "container",
    canvasColor: "transparent",
    from: "#ffffff",
    to: "#f8fafc",
    accent: "#111827",
    text: "#111827"
  }),
  createLeaderboardTemplate({
    id: "leaderboard-neon-rank",
    name: "Neon Rank Board",
    description: "Leaderboard neon gelap dengan ranking besar dan score kontras.",
    cardType: "gradient_card",
    canvasColor: "#030712",
    from: "#0f172a",
    to: "#0891b2",
    accent: "#22d3ee",
    text: "#ecfeff"
  }),
  createLeaderboardTemplate({
    id: "leaderboard-cyberpunk",
    name: "Cyberpunk",
    description: "Leaderboard cyberpunk dengan glow magenta dan cyan.",
    cardType: "gradient_card",
    canvasColor: "#020617",
    from: "#111827",
    to: "#701a75",
    accent: "#22d3ee",
    text: "#fdf4ff"
  }),
  createLeaderboardTemplate({
    id: "leaderboard-gold-podium",
    name: "Gold Podium",
    description: "List leader premium dengan aksen gold untuk top gifter.",
    cardType: "bubble_card",
    canvasColor: "#17120a",
    from: "#78350f",
    to: "#f59e0b",
    accent: "#fde68a",
    text: "#fffbeb"
  }),
  createLeaderboardTemplate({
    id: "leaderboard-glass-arena",
    name: "Liquid Glass",
    description: "Glass leaderboard bersih untuk overlay vertical modern.",
    cardType: "glass_card",
    canvasColor: "#020617",
    from: "#1e293b",
    to: "#475569",
    accent: "#cbd5e1",
    text: "#f8fafc"
  }),
  createLeaderboardTemplate({
    id: "leaderboard-arcade-score",
    name: "Arcade Scoreboard",
    description: "Scoreboard energetic dengan warna arcade dan score besar.",
    cardType: "gradient_card",
    canvasColor: "#16021f",
    from: "#7c3aed",
    to: "#e11d48",
    accent: "#f0abfc",
    text: "#fff7ed"
  }),
  createLeaderboardTemplate({
    id: "leaderboard-minimal-slate",
    name: "Minimal Slate",
    description: "Leaderboard minimal, tipis, dan fokus ke nama serta score.",
    cardType: "container",
    canvasColor: "#020617",
    from: "#111827",
    to: "#1f2937",
    accent: "#60a5fa",
    text: "#f8fafc"
  })
];

const chatBubbleTemplates: OverlayTemplate[] = chatOverlayThemes.map((theme) => ({
  id: theme.id,
  name: theme.name,
  description: theme.description,
  schema: theme.schema
}));

const goalTemplates: OverlayTemplate[] = [
  {
    id: "goal-target-board",
    name: "Goal Target Board",
    description: "Canvas goal multi target untuk like, gift, viewer, comment, dan share.",
    schema: {
      version: 2,
      kind: "GOAL",
      name: "Goal Target Board",
      canvas: {
        width: 800,
        height: 400,
        background: { type: "transparent", color: "transparent", opacity: 0 },
        radius: 0,
        stroke: { enabled: false, color: "#ffffff", width: 0 },
        shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 },
        animation: { type: "none", enabled: false, color: "#22d3ee", color2: "#f43f5e", durationMs: 2400, intensity: 70 }
      },
      dataSource: {
        type: "goal",
        filters: {}
      },
      layout: {
        mode: "single",
        maxItems: 1,
        gap: 0,
        direction: "vertical",
        reverse: false,
        align: "start",
        listStyle: "default",
        enterAnimation: "fade",
        exitAnimation: "fade",
        autoCloseMs: 0,
        animationDurationMs: 620
      },
      components: [
        {
          id: "goal_like_bar",
          type: "goal_progress_bar",
          name: "Like Goal",
          x: 54,
          y: 42,
          width: 520,
          height: 78,
          zIndex: 1,
          visible: true,
          locked: false,
          props: { metricType: "likes", label: "Like Goal", currentValue: 6500, targetValue: 10000, icon: "heart" },
          style: {
            radius: 20,
            fontSize: 18,
            fontWeight: 900,
            color: "#ffffff",
            backgroundColor: "#0f172a",
            border: { enabled: true, color: "#ec4899", width: 2 },
            shadow: { enabled: true, color: "#ec4899", opacity: 24, blur: 22, x: 0, y: 8 }
          }
        },
        {
          id: "goal_gift_ring",
          type: "goal_progress_ring",
          name: "Gift Goal Ring",
          x: 604,
          y: 42,
          width: 138,
          height: 138,
          zIndex: 2,
          visible: true,
          locked: false,
          props: { metricType: "gifts", label: "Gift", currentValue: 42, targetValue: 100, icon: "gift" },
          style: {
            radius: 999,
            fontSize: 17,
            fontWeight: 900,
            color: "#ffffff",
            backgroundColor: "#111827",
            border: { enabled: true, color: "#fbbf24", width: 4 },
            shadow: { enabled: true, color: "#f59e0b", opacity: 32, blur: 24, x: 0, y: 8 }
          }
        },
        {
          id: "goal_viewer_bar",
          type: "goal_progress_bar",
          name: "Viewer Goal",
          x: 54,
          y: 150,
          width: 520,
          height: 78,
          zIndex: 3,
          visible: true,
          locked: false,
          props: { metricType: "viewers", label: "Viewer Goal", currentValue: 720, targetValue: 1000, icon: "eye" },
          style: {
            radius: 20,
            fontSize: 18,
            fontWeight: 900,
            color: "#ffffff",
            backgroundColor: "#0b1220",
            border: { enabled: true, color: "#22d3ee", width: 2 },
            shadow: { enabled: true, color: "#22d3ee", opacity: 24, blur: 22, x: 0, y: 8 }
          }
        },
        {
          id: "goal_comment_bar",
          type: "goal_progress_bar",
          name: "Comment Goal",
          x: 54,
          y: 258,
          width: 330,
          height: 72,
          zIndex: 4,
          visible: true,
          locked: false,
          props: { metricType: "comments", label: "Comment Goal", currentValue: 84, targetValue: 150, icon: "comment" },
          style: {
            radius: 18,
            fontSize: 16,
            fontWeight: 900,
            color: "#ffffff",
            backgroundColor: "#111827",
            border: { enabled: true, color: "#a78bfa", width: 2 },
            shadow: { enabled: true, color: "#8b5cf6", opacity: 20, blur: 18, x: 0, y: 8 }
          }
        },
        {
          id: "goal_share_bar",
          type: "goal_progress_bar",
          name: "Share Goal",
          x: 410,
          y: 258,
          width: 332,
          height: 72,
          zIndex: 5,
          visible: true,
          locked: false,
          props: { metricType: "shares", label: "Share Goal", currentValue: 32, targetValue: 80, icon: "target" },
          style: {
            radius: 18,
            fontSize: 16,
            fontWeight: 900,
            color: "#ffffff",
            backgroundColor: "#111827",
            border: { enabled: true, color: "#34d399", width: 2 },
            shadow: { enabled: true, color: "#10b981", opacity: 20, blur: 18, x: 0, y: 8 }
          }
        }
      ]
    }
  }
];

const staticTemplates: OverlayTemplate[] = [
  {
    id: "static-media-switch",
    name: "Static Media Switch",
    description: "Overlay statis untuk rotasi image, GIF, JSON/Lottie, atau video promo.",
    schema: {
      version: 2,
      kind: "STATIC",
      name: "Static Media Switch",
      canvas: {
        width: 800,
        height: 400,
        background: { type: "transparent", color: "transparent", opacity: 0 },
        radius: 0,
        stroke: { enabled: false, color: "#ffffff", width: 0 },
        shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 },
        animation: { type: "none", enabled: false, color: "#22d3ee", color2: "#f43f5e", durationMs: 2400, intensity: 70 }
      },
      dataSource: {
        type: "static",
        filters: {}
      },
      layout: {
        mode: "single",
        maxItems: 1,
        gap: 0,
        direction: "vertical",
        reverse: false,
        align: "start",
        listStyle: "default",
        enterAnimation: "fade",
        exitAnimation: "fade",
        autoCloseMs: 0,
        animationDurationMs: 620
      },
      components: [
        {
          id: "static_media_switch_1",
          type: "media_switch",
          name: "Media Switch",
          x: 0,
          y: 0,
          width: 800,
          height: 400,
          zIndex: 1,
          visible: true,
          locked: false,
          props: {
            items: [],
            intervalMs: 5000,
            transition: "fade",
            videoSwitchMode: "ended",
            muted: true,
            autoplay: true,
            loopSingle: true
          },
          style: {
            radius: 0,
            opacity: 100,
            objectFit: "contain",
            overflow: "hidden",
            backgroundColor: "transparent"
          }
        }
      ]
    }
  }
];

export const overlayTemplates: OverlayTemplate[] = [
  ...leaderboardTemplates,
  ...chatBubbleTemplates,
  ...goalTemplates,
  ...staticTemplates
];

function createLeaderboardTemplate({
  id,
  name,
  description,
  cardType,
  canvasColor,
  from,
  to,
  accent,
  text
}: {
  id: string;
  name: string;
  description: string;
  cardType: "container" | "bubble_card" | "glass_card" | "gradient_card";
  canvasColor: string;
  from: string;
  to: string;
  accent: string;
  text: string;
}): OverlayTemplate {
  return {
    id,
    name,
    description,
    schema: {
      version: 2,
      kind: "LEADERBOARD",
      name,
      canvas: {
        width: 800,
        height: 600,
        background: { type: "solid", color: canvasColor, opacity: 0 },
        radius: 0,
        stroke: { enabled: false, color: "#ffffff", width: 0 },
        shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 },
        animation: { type: "none", enabled: false, color: accent, color2: to, durationMs: 2400, intensity: 70 }
      },
      dataSource: {
        type: "leaderboard",
        filters: { metric: "gift" }
      },
      layout: {
        mode: "list",
        maxItems: 10,
        gap: 10,
        direction: "vertical",
        reverse: false,
        align: "start",
        listStyle: "stacked_card",
        enterAnimation: "slide-up",
        exitAnimation: "fade",
        autoCloseMs: 0,
        animationDurationMs: 620
      },
      components: [
        {
          id: `${id}_row`,
          type: cardType,
          name: "Leaderboard Row",
          x: 54,
          y: 58,
          width: 690,
          height: 78,
          zIndex: 1,
          visible: true,
          locked: false,
          props: { clipContent: true, padding: 14, layout: "free" },
          style: {
            background: { type: "gradient", color: from, from, to, angle: 135, opacity: 92 },
            radius: cardType === "container" ? 14 : 22,
            overflow: "hidden",
            border: { enabled: true, color: accent, width: 2 },
            shadow: { enabled: true, color: accent, opacity: 24, blur: 18, x: 0, y: 8 },
            animation: { type: "glow", enabled: id.includes("neon"), color: accent, color2: to, durationMs: 2200, intensity: 50 }
          },
          children: [
            {
              id: `${id}_rank`,
              type: "leaderboard_rank",
              name: "Rank",
              x: 18,
              y: 16,
              width: 56,
              height: 46,
              zIndex: 1,
              visible: true,
              locked: false,
              props: { mode: "text", metric: "auto", textPrefix: "#", topCrownCount: 3 },
              style: { backgroundColor: accent, radius: 14, fontSize: 22, fontWeight: 900, color: canvasColor, align: "center", lineHeight: 1 }
            },
            {
              id: `${id}_name`,
              type: "viewer_name",
              name: "Leader Name",
              x: 92,
              y: 14,
              width: 330,
              height: 30,
              zIndex: 2,
              visible: true,
              locked: false,
              props: { text: "{{viewer.name}}" },
              style: { fontSize: 23, fontWeight: 900, color: text, align: "left", lineHeight: 1.05, textOverflow: "ellipsis" }
            },
            {
              id: `${id}_metric`,
              type: "comment",
              name: "Metric Label",
              x: 92,
              y: 45,
              width: 330,
              height: 22,
              zIndex: 3,
              visible: true,
              locked: false,
              props: { text: "{{comment.text}}" },
              style: { fontSize: 15, fontWeight: 700, color: text, opacity: 80, align: "left", lineHeight: 1.1, textOverflow: "ellipsis" }
            },
            {
              id: `${id}_score`,
              type: "gift_count",
              name: "Score",
              x: 474,
              y: 14,
              width: 132,
              height: 48,
              zIndex: 4,
              visible: true,
              locked: false,
              props: { text: "{{gift.count}}" },
              style: { fontSize: 34, fontWeight: 1000, color: text, align: "right", lineHeight: 1, autoFitFontSize: true }
            },
            {
              id: `${id}_metric_icon`,
              type: "leaderboard_rank",
              name: "Metric Icon",
              x: 622,
              y: 21,
              width: 34,
              height: 34,
              zIndex: 5,
              visible: true,
              locked: false,
              props: { mode: "metric_icon", metric: "auto", textPrefix: "#", topCrownCount: 3 },
              style: { backgroundColor: "transparent", radius: 999, fontSize: 20, fontWeight: 900, color: accent, align: "center", lineHeight: 1 }
            }
          ]
        }
      ]
    }
  };
}
