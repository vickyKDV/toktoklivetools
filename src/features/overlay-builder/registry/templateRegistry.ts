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

const chatBubbleTemplates: OverlayTemplate[] = [
  createChatBubbleTemplate({
    id: "chat-cyberpunk-neon",
    name: "Cyberpunk Neon",
    description: "Bubble neon futuristik dengan garis cyan-magenta.",
    cardType: "gradient_card",
    from: "#061826",
    to: "#120013",
    text: "#fdf4ff",
    nameColor: "#f472d0",
    badgeColor: "#0891b2",
    badgeText: "#ecfeff",
    border: "#22d3ee",
    glow: "#f0abfc",
    radius: 12,
    radiusTopLeft: 24,
    radiusTopRight: 8,
    radiusBottomRight: 24,
    radiusBottomLeft: 8,
    effect: "rotate_neon"
  }),
  createChatBubbleTemplate({
    id: "chat-modern-glass-card",
    name: "Modern Glass Card",
    description: "Glass card premium dengan blur lembut dan border ungu.",
    cardType: "glass_card",
    from: "#4c1d95",
    to: "#111827",
    text: "#f8fafc",
    nameColor: "#ffffff",
    badgeColor: "#7c3aed",
    badgeText: "#ffffff",
    border: "#c4b5fd",
    glow: "#a78bfa",
    radius: 32,
    backdropBlur: 18
  }),
  createChatBubbleTemplate({
    id: "chat-whatsapp-style-bubble",
    name: "Whatsapp Style Bubble",
    description: "Bubble hijau muda, bersih, dan mudah dibaca.",
    cardType: "speech_bubble_card",
    from: "#dcfce7",
    to: "#bbf7d0",
    text: "#14532d",
    nameColor: "#14532d",
    badgeColor: "#16a34a",
    badgeText: "#ffffff",
    border: "#dcfce7",
    glow: "#86efac",
    radius: 30,
    profileSide: "left",
    darkText: true,
    bubbleTail: { enabled: true, side: "left", position: "bottom", size: 24 }
  }),
  createChatBubbleTemplate({
    id: "chat-dark-minimal-card",
    name: "Dark Minimal Card",
    description: "Card gelap minimal tanpa efek berlebihan.",
    cardType: "container",
    from: "#18181b",
    to: "#27272a",
    text: "#f4f4f5",
    nameColor: "#ffffff",
    badgeColor: "#52525b",
    badgeText: "#ffffff",
    border: "#3f3f46",
    glow: "#000000",
    radius: 24,
    shadowOpacity: 20
  }),
  createChatBubbleTemplate({
    id: "chat-gradient-bubble",
    name: "Gradient Bubble",
    description: "Bubble gradient pink-biru dengan bentuk rounded besar.",
    cardType: "gradient_card",
    from: "#ec4899",
    to: "#3b82f6",
    text: "#ffffff",
    nameColor: "#ffffff",
    badgeColor: "#ffffff",
    badgeText: "#7c3aed",
    border: "#ffffff",
    glow: "#ec4899",
    radius: 34,
    profileSide: "left"
  }),
  createChatBubbleTemplate({
    id: "chat-neumorphism-card",
    name: "Neumorphism Card",
    description: "Card putih halus dengan text hitam dan bayangan soft.",
    cardType: "container",
    from: "#f8fafc",
    to: "#e2e8f0",
    text: "#111827",
    nameColor: "#111827",
    badgeColor: "#e5e7eb",
    badgeText: "#374151",
    border: "#ffffff",
    glow: "#cbd5e1",
    radius: 30,
    darkText: true
  }),
  createChatBubbleTemplate({
    id: "chat-gaming-hud-style",
    name: "Gaming HUD Style",
    description: "HUD gaming dengan aksen orange dan sudut panel tegas.",
    cardType: "container",
    from: "#020617",
    to: "#111827",
    text: "#f8fafc",
    nameColor: "#fb923c",
    badgeColor: "#fb923c",
    badgeText: "#111827",
    border: "#fb923c",
    glow: "#fb923c",
    radius: 8,
    radiusTopLeft: 28,
    radiusBottomRight: 28,
    effect: "glow"
  }),
  createChatBubbleTemplate({
    id: "chat-paper-card-style",
    name: "Paper Card Style",
    description: "Paper card terang, simple, dan nyaman dibaca.",
    cardType: "container",
    from: "#fffaf0",
    to: "#f5efe4",
    text: "#18181b",
    nameColor: "#111827",
    badgeColor: "#e7decf",
    badgeText: "#57534e",
    border: "#f5efe4",
    glow: "#d6d3d1",
    radius: 10,
    darkText: true
  }),
  createChatBubbleTemplate({
    id: "chat-glow-bubble",
    name: "Glow Bubble",
    description: "Bubble gelap dengan glow cyan di tepi card.",
    cardType: "glass_card",
    from: "#082f49",
    to: "#0f172a",
    text: "#ecfeff",
    nameColor: "#f8fafc",
    badgeColor: "#14b8a6",
    badgeText: "#ecfeff",
    border: "#22d3ee",
    glow: "#22d3ee",
    radius: 30,
    effect: "neon",
    backdropBlur: 8
  }),
  createChatBubbleTemplate({
    id: "chat-liquid-bubble",
    name: "Liquid Bubble",
    description: "Bubble organik biru-ungu dengan radius per sisi.",
    cardType: "gradient_card",
    from: "#6366f1",
    to: "#0284c7",
    text: "#ffffff",
    nameColor: "#ffffff",
    badgeColor: "#8b5cf6",
    badgeText: "#ffffff",
    border: "#93c5fd",
    glow: "#60a5fa",
    radius: 44,
    radiusTopLeft: 70,
    radiusTopRight: 42,
    radiusBottomRight: 72,
    radiusBottomLeft: 38,
    effect: "float"
  }),
  createChatBubbleTemplate({
    id: "chat-basic-rounded-white",
    name: "Basic Rounded White",
    description: "Theme dasar: card putih rounded, text hitam.",
    cardType: "container",
    from: "#ffffff",
    to: "#ffffff",
    text: "#111111",
    nameColor: "#111111",
    badgeColor: "#e5e7eb",
    badgeText: "#374151",
    border: "#e5e7eb",
    glow: "#000000",
    radius: 18,
    darkText: true,
    shadowOpacity: 16
  })
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
  ...staticTemplates
];

function createChatBubbleTemplate({
  id,
  name,
  description,
  cardType,
  from,
  to,
  text,
  nameColor,
  badgeColor,
  badgeText,
  border,
  glow,
  radius,
  radiusTopLeft,
  radiusTopRight,
  radiusBottomRight,
  radiusBottomLeft,
  effect = "none",
  backdropBlur = 0,
  darkText = false,
  profileSide = "left",
  shadowOpacity = 30,
  bubbleTail
}: {
  id: string;
  name: string;
  description: string;
  cardType: "container" | "speech_bubble_card" | "bubble_card" | "glass_card" | "gradient_card";
  from: string;
  to: string;
  text: string;
  nameColor: string;
  badgeColor: string;
  badgeText: string;
  border: string;
  glow: string;
  radius: number;
  radiusTopLeft?: number;
  radiusTopRight?: number;
  radiusBottomRight?: number;
  radiusBottomLeft?: number;
  effect?: "none" | "pulse" | "glow" | "neon" | "rotate_neon" | "gradient_shift" | "float";
  backdropBlur?: number;
  darkText?: boolean;
  profileSide?: "left" | "right";
  shadowOpacity?: number;
  bubbleTail?: { enabled: boolean; side: "left" | "right"; position: "top" | "center" | "bottom"; size: number };
}): OverlayTemplate {
  const cardX = 120;
  const cardY = 242;
  const cardWidth = 600;
  const cardHeight = 96;
  const avatarSize = 64;
  const avatarX = profileSide === "right" ? cardX + cardWidth - 56 : cardX - 54;
  const avatarY = cardY + 16;
  const contentX = profileSide === "right" ? 28 : 72;
  const usernameX = profileSide === "right" ? 400 : 440;
  const backgroundType = cardType === "glass_card" ? "glass" : cardType === "gradient_card" ? "gradient" : "solid";

  return {
    id,
    name,
    description,
    schema: {
      version: 2,
      kind: "CHAT",
      name,
      canvas: {
        width: 800,
        height: 400,
        background: { type: "transparent", color: "transparent", opacity: 0 },
        radius: 0,
        stroke: { enabled: false, color: "#ffffff", width: 0 },
        shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 },
        animation: { type: "none", enabled: false, color: border, color2: to, durationMs: 2400, intensity: 70 }
      },
      dataSource: {
        type: "chat",
        filters: { chat: true, join: true, like: false, share: false, follow: false, gift: false }
      },
      layout: {
        mode: "list",
        maxItems: 5,
        gap: -10,
        direction: "vertical",
        reverse: true,
        align: "start",
        listStyle: "focus_stack",
        enterAnimation: "slide-right",
        exitAnimation: "slide-left",
        autoCloseMs: 0,
        animationDurationMs: 620
      },
      components: [
        {
          id: `${id}_card`,
          type: cardType,
          name: "Chat Bubble Card",
          x: cardX,
          y: cardY,
          width: cardWidth,
          height: cardHeight,
          zIndex: 1,
          visible: true,
          locked: false,
          props: { clipContent: true, padding: 18, layout: "free" },
          style: {
            background: { type: backgroundType, color: from, from, to, angle: 135, opacity: backgroundType === "glass" ? 42 : 94 },
            bubbleTail,
            radius,
            radiusTopLeft,
            radiusTopRight,
            radiusBottomRight,
            radiusBottomLeft,
            overflow: "hidden",
            border: { enabled: true, color: border, width: darkText ? 1 : 2 },
            shadow: { enabled: true, color: glow, opacity: shadowOpacity, blur: darkText ? 18 : 24, x: 0, y: 9 },
            backdropBlur,
            animation: { type: effect, enabled: effect !== "none", color: border, color2: to, durationMs: 2300, intensity: 56 }
          },
          children: [
            {
              id: `${id}_name`,
              type: "viewer_name",
              name: "Nama",
              x: contentX,
              y: 16,
              width: 250,
              height: 24,
              zIndex: 2,
              visible: true,
              locked: false,
              props: { text: "{{viewer.name}}" },
              style: { fontSize: 18, fontWeight: 900, color: nameColor, align: "left", lineHeight: 1.05, textOverflow: "ellipsis" }
            },
            {
              id: `${id}_username`,
              type: "viewer_username",
              name: "Username",
              x: usernameX,
              y: 17,
              width: 128,
              height: 18,
              zIndex: 3,
              visible: true,
              locked: false,
              props: { text: "{{viewer.username}}" },
              style: { fontSize: 12, fontWeight: 800, color: text, align: "right", lineHeight: 1, opacity: 78, textOverflow: "ellipsis" }
            },
            {
              id: `${id}_comment`,
              type: "comment",
              name: "Komentar",
              x: contentX,
              y: 48,
              width: 470,
              height: 32,
              zIndex: 4,
              visible: true,
              locked: false,
              props: { text: "{{comment.text}}" },
              style: { fontSize: 18, fontWeight: 800, color: text, align: "left", lineHeight: 1.2, overflow: "hidden", textOverflow: "clip", autoFitFontSize: true }
            },
            {
              id: `${id}_badge`,
              type: "viewer_badge",
              name: "Badge",
              x: 300,
              y: 14,
              width: 78,
              height: 20,
              zIndex: 5,
              visible: true,
              locked: false,
              props: { text: "{{viewer.badge}}" },
              style: { backgroundColor: badgeColor, radius: 999, fontSize: 9, fontWeight: 900, color: badgeText, align: "center", lineHeight: 1 }
            }
          ]
        },
        {
          id: `${id}_profile`,
          type: "profile_photo",
          name: "Foto Profil",
          x: avatarX,
          y: avatarY,
          width: avatarSize,
          height: avatarSize,
          zIndex: 6,
          visible: true,
          locked: false,
          props: { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" },
          style: {
            radius: 999,
            opacity: 100,
            border: { enabled: true, color: border, width: darkText ? 2 : 3 },
            shadow: { enabled: true, color: glow, opacity: darkText ? 18 : 40, blur: 14, x: 0, y: 0 },
            objectFit: "cover",
            animation: { type: "pulse", enabled: false, color: border, color2: to, durationMs: 1800, intensity: 35 }
          }
        }
      ]
    }
  };
}

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
