import type { OverlayKind } from "@prisma/client";
import type { OverlayComponentSchema, OverlayDesignSchema } from "@/core/overlay/schema";

export type ChatOverlayThemeFrame =
  | "dynamic"
  | "pixel"
  | "gaming"
  | "glass"
  | "white"
  | "neumorph-light"
  | "neumorph-dark"
  | "square"
  | "women"
  | "pink"
  | "colorful"
  | "glitch"
  | "rgb-glitch"
  | "paper";

export type ChatOverlayTheme = {
  id: string;
  name: string;
  description: string;
  frame: ChatOverlayThemeFrame;
  schema: OverlayDesignSchema;
  preview: {
    background: string;
    panel: string;
    panelSoft: string;
    border: string;
    accent: string;
    accent2: string;
    glow: string;
    text: string;
    muted: string;
    username: string;
    badgeBg: string;
    badgeText: string;
    avatarBg: string;
    radius: number;
    darkText?: boolean;
  };
};

export const studioKinds: OverlayKind[] = ["CHAT", "GIFT", "LEADERBOARD", "DOCK", "GOAL", "STATIC"];

type ChatThemeInput = Omit<ChatOverlayTheme, "schema"> & {
  schemaStyle: {
    cardType: OverlayComponentSchema["type"];
    backgroundType: "solid" | "gradient" | "glass";
    borderWidth: number;
    shadowOpacity: number;
    bubbleTail?: OverlayComponentSchema["style"]["bubbleTail"];
  };
};

const chatThemeInputs: ChatThemeInput[] = [
  {
    id: "chat-dynamic-island",
    name: "Dynamic Island",
    description: "Compact iOS-style pill untuk chat masuk.",
    frame: "dynamic",
    preview: {
      background: "#070b14",
      panel: "#05070c",
      panelSoft: "#171923",
      border: "#1f2937",
      accent: "#60a5fa",
      accent2: "#f472b6",
      glow: "#60a5fa",
      text: "#f8fafc",
      muted: "#94a3b8",
      username: "#ffffff",
      badgeBg: "#ef3b7d",
      badgeText: "#ffffff",
      avatarBg: "#111827",
      radius: 999
    },
    schemaStyle: {
      cardType: "glass_card",
      backgroundType: "glass",
      borderWidth: 1,
      shadowOpacity: 30
    }
  },
  {
    id: "chat-special-roblox",
    name: "Special Roblox",
    description: "Pixel speech bubble dengan outline game retro.",
    frame: "pixel",
    preview: {
      background: "#090b14",
      panel: "#ffffff",
      panelSoft: "#f3f4f6",
      border: "#111827",
      accent: "#ff3b7a",
      accent2: "#38bdf8",
      glow: "#ffffff",
      text: "#111827",
      muted: "#4b5563",
      username: "#111827",
      badgeBg: "#ff3b7a",
      badgeText: "#ffffff",
      avatarBg: "#111827",
      radius: 0,
      darkText: true
    },
    schemaStyle: {
      cardType: "speech_bubble_card",
      backgroundType: "solid",
      borderWidth: 3,
      shadowOpacity: 18,
      bubbleTail: { enabled: true, side: "right", position: "bottom", size: 18 }
    }
  },
  {
    id: "chat-gaming-mood",
    name: "Gaming Mood",
    description: "Neon RGB outline dengan glow bergerak untuk gaming.",
    frame: "gaming",
    preview: {
      background: "#090616",
      panel: "#09091f",
      panelSoft: "#15112d",
      border: "#22d3ee",
      accent: "#ff2bd6",
      accent2: "#22d3ee",
      glow: "#22d3ee",
      text: "#ffffff",
      muted: "#a5f3fc",
      username: "#ffffff",
      badgeBg: "#ff2bd6",
      badgeText: "#ffffff",
      avatarBg: "#0f172a",
      radius: 10
    },
    schemaStyle: {
      cardType: "gradient_card",
      backgroundType: "gradient",
      borderWidth: 1,
      shadowOpacity: 34
    }
  },
  {
    id: "chat-color-pop",
    name: "Color Pop",
    description: "Rectangle colorful dengan warna berbeda tiap chat.",
    frame: "colorful",
    preview: {
      background: "#0a0f1d",
      panel: "#f8fafc",
      panelSoft: "#e0f2fe",
      border: "#ffffff",
      accent: "#f97316",
      accent2: "#22d3ee",
      glow: "#38bdf8",
      text: "#111827",
      muted: "#334155",
      username: "#111827",
      badgeBg: "#111827",
      badgeText: "#ffffff",
      avatarBg: "#0f172a",
      radius: 4,
      darkText: true
    },
    schemaStyle: {
      cardType: "container",
      backgroundType: "solid",
      borderWidth: 1,
      shadowOpacity: 18
    }
  },
  {
    id: "chat-glitch-cartoon",
    name: "Glitch Cartoon",
    description: "Black cartoon bubble dengan outer RGB glitch ramai.",
    frame: "glitch",
    preview: {
      background: "#050505",
      panel: "#050505",
      panelSoft: "#111111",
      border: "#00f5ff",
      accent: "#ff2bd6",
      accent2: "#39ff14",
      glow: "#00f5ff",
      text: "#ffffff",
      muted: "#cbd5e1",
      username: "#ffffff",
      badgeBg: "#ff2bd6",
      badgeText: "#050505",
      avatarBg: "#111827",
      radius: 7
    },
    schemaStyle: {
      cardType: "container",
      backgroundType: "solid",
      borderWidth: 0,
      shadowOpacity: 38
    }
  },
  {
    id: "chat-rgb-glitch-bubble",
    name: "RGB Glitch Bubble",
    description: "Clean black bubble dengan outline RGB glitch premium.",
    frame: "rgb-glitch",
    preview: {
      background: "#05070d",
      panel: "#0B0B0F",
      panelSoft: "#11121a",
      border: "#22d3ee",
      accent: "#ff2bd6",
      accent2: "#ffe600",
      glow: "#22d3ee",
      text: "#f8fafc",
      muted: "#cbd5e1",
      username: "#ffffff",
      badgeBg: "#ff2bd6",
      badgeText: "#ffffff",
      avatarBg: "#111827",
      radius: 8
    },
    schemaStyle: {
      cardType: "container",
      backgroundType: "solid",
      borderWidth: 0,
      shadowOpacity: 30
    }
  },
  {
    id: "chat-paper-bubble",
    name: "Paper Chat Bubble",
    description: "Old paper texture natural tanpa tail.",
    frame: "paper",
    preview: {
      background: "#0b0f16",
      panel: "#e8d2ad",
      panelSoft: "#f4dfbd",
      border: "#5b3a1d",
      accent: "#8e3df5",
      accent2: "#28b94f",
      glow: "#341b09",
      text: "#1e140d",
      muted: "rgba(32,21,13,.78)",
      username: "#22150c",
      badgeBg: "#8e3df5",
      badgeText: "#ffffff",
      avatarBg: "#5521a8",
      radius: 10,
      darkText: true
    },
    schemaStyle: {
      cardType: "speech_bubble_card",
      backgroundType: "solid",
      borderWidth: 2,
      shadowOpacity: 28
    }
  },
  {
    id: "chat-minimalist-glass",
    name: "Minimalist Glass",
    description: "Elegant glassmorphism dark, halus dan modern.",
    frame: "glass",
    preview: {
      background: "#090d16",
      panel: "rgba(255,255,255,.13)",
      panelSoft: "rgba(148,163,184,.12)",
      border: "rgba(255,255,255,.18)",
      accent: "#94a3b8",
      accent2: "#ec4899",
      glow: "#64748b",
      text: "#f8fafc",
      muted: "#cbd5e1",
      username: "#ffffff",
      badgeBg: "#ec4899",
      badgeText: "#ffffff",
      avatarBg: "#334155",
      radius: 22
    },
    schemaStyle: {
      cardType: "glass_card",
      backgroundType: "glass",
      borderWidth: 1,
      shadowOpacity: 26
    }
  },
  {
    id: "chat-minimalist-white",
    name: "Minimalist White",
    description: "Clean bright overlay dengan shadow lembut.",
    frame: "white",
    preview: {
      background: "#111827",
      panel: "#ffffff",
      panelSoft: "#f8fafc",
      border: "#e5e7eb",
      accent: "#64748b",
      accent2: "#9ca3af",
      glow: "#ffffff",
      text: "#111827",
      muted: "#6b7280",
      username: "#111827",
      badgeBg: "#fee2e2",
      badgeText: "#be123c",
      avatarBg: "#e5e7eb",
      radius: 28,
      darkText: true
    },
    schemaStyle: {
      cardType: "container",
      backgroundType: "solid",
      borderWidth: 1,
      shadowOpacity: 18
    }
  },
  {
    id: "chat-neumorphism-light",
    name: "Neumorphism Light",
    description: "Soft UI terang dengan embossed shadow.",
    frame: "neumorph-light",
    preview: {
      background: "#dfe6ef",
      panel: "#e9eef6",
      panelSoft: "#f8fafc",
      border: "#ffffff",
      accent: "#3b82f6",
      accent2: "#94a3b8",
      glow: "#94a3b8",
      text: "#1f2937",
      muted: "#64748b",
      username: "#0f172a",
      badgeBg: "#dbeafe",
      badgeText: "#1d4ed8",
      avatarBg: "#cbd5e1",
      radius: 30,
      darkText: true
    },
    schemaStyle: {
      cardType: "container",
      backgroundType: "solid",
      borderWidth: 1,
      shadowOpacity: 22
    }
  },
  {
    id: "chat-neumorphism-dark",
    name: "Neumorphism Dark",
    description: "Soft UI dark dengan depth premium.",
    frame: "neumorph-dark",
    preview: {
      background: "#0a0f19",
      panel: "#151c29",
      panelSoft: "#0d121d",
      border: "#202a3a",
      accent: "#8b5cf6",
      accent2: "#38bdf8",
      glow: "#000000",
      text: "#f8fafc",
      muted: "#94a3b8",
      username: "#ffffff",
      badgeBg: "#312e81",
      badgeText: "#ddd6fe",
      avatarBg: "#1f2937",
      radius: 30
    },
    schemaStyle: {
      cardType: "container",
      backgroundType: "solid",
      borderWidth: 1,
      shadowOpacity: 30
    }
  },
  {
    id: "chat-square-minimalist",
    name: "Square Minimalist",
    description: "Sharp bold rectangle untuk layout tegas.",
    frame: "square",
    preview: {
      background: "#070b12",
      panel: "#10151f",
      panelSoft: "#151b26",
      border: "#475569",
      accent: "#f97316",
      accent2: "#22d3ee",
      glow: "#000000",
      text: "#f8fafc",
      muted: "#94a3b8",
      username: "#ffffff",
      badgeBg: "#f97316",
      badgeText: "#111827",
      avatarBg: "#1f2937",
      radius: 6
    },
    schemaStyle: {
      cardType: "container",
      backgroundType: "solid",
      borderWidth: 2,
      shadowOpacity: 18
    }
  },
  {
    id: "chat-women-style",
    name: "Women Style",
    description: "Fancy aesthetic dengan soft rose accent.",
    frame: "women",
    preview: {
      background: "#160914",
      panel: "#3b142f",
      panelSoft: "#231024",
      border: "#f9a8d4",
      accent: "#f472b6",
      accent2: "#fde68a",
      glow: "#f472b6",
      text: "#fff7fb",
      muted: "#fbcfe8",
      username: "#ffffff",
      badgeBg: "#f9a8d4",
      badgeText: "#831843",
      avatarBg: "#831843",
      radius: 32
    },
    schemaStyle: {
      cardType: "gradient_card",
      backgroundType: "gradient",
      borderWidth: 1,
      shadowOpacity: 30
    }
  },
  {
    id: "chat-girl-pink",
    name: "Girl Pink",
    description: "Minimal pink clean dengan bubble ringan.",
    frame: "pink",
    preview: {
      background: "#1f0a18",
      panel: "#ffe4f1",
      panelSoft: "#fbcfe8",
      border: "#f9a8d4",
      accent: "#ec4899",
      accent2: "#fb7185",
      glow: "#f9a8d4",
      text: "#831843",
      muted: "#be185d",
      username: "#9d174d",
      badgeBg: "#ec4899",
      badgeText: "#ffffff",
      avatarBg: "#f9a8d4",
      radius: 26,
      darkText: true
    },
    schemaStyle: {
      cardType: "speech_bubble_card",
      backgroundType: "solid",
      borderWidth: 1,
      shadowOpacity: 24,
      bubbleTail: { enabled: true, side: "left", position: "bottom", size: 22 }
    }
  }
];

export const chatOverlayThemes: ChatOverlayTheme[] = chatThemeInputs.map((theme) => ({
  ...theme,
  schema: createChatThemeSchema(theme)
}));

export function getChatOverlayTheme(themeId: string) {
  return chatOverlayThemes.find((theme) => theme.id === themeId) ?? chatOverlayThemes[0];
}

export function isChatOverlayThemeId(value: string) {
  return chatOverlayThemes.some((theme) => theme.id === value);
}

function createChatThemeSchema(theme: ChatThemeInput): OverlayDesignSchema {
  const cardX = 126;
  const cardY = 236;
  const cardWidth = 610;
  const cardHeight = 108;
  const avatarSize = 72;
  const avatarX = cardX + 18;
  const avatarY = cardY + 18;
  const contentX = 112;
  const badgeWidth = theme.frame === "pixel" ? 74 : 58;
  const card: OverlayComponentSchema = {
    id: `${theme.id}_card`,
    type: theme.schemaStyle.cardType,
    name: `${theme.name} Card`,
    x: cardX,
    y: cardY,
    width: cardWidth,
    height: cardHeight,
    zIndex: 1,
    visible: true,
    locked: false,
    props: {
      clipContent: true,
      padding: 20,
      layout: "free"
    },
    style: {
      background: getSchemaBackground(theme),
      bubbleTail: theme.schemaStyle.bubbleTail,
      radius: theme.preview.radius,
      overflow: "hidden",
      border: {
        enabled: theme.schemaStyle.borderWidth > 0,
        color: theme.preview.border,
        width: theme.schemaStyle.borderWidth
      },
      shadow: {
        enabled: theme.schemaStyle.shadowOpacity > 0,
        color: theme.preview.glow,
        opacity: theme.schemaStyle.shadowOpacity,
        blur: theme.frame === "square" ? 12 : 26,
        x: 0,
        y: 10
      },
      backdropBlur: theme.schemaStyle.backgroundType === "glass" ? 14 : 0,
      animation: {
        type: "none",
        enabled: false,
        color: theme.preview.border,
        color2: theme.preview.accent2,
        durationMs: 2400,
        intensity: 48
      }
    },
    children: [
      {
        id: `${theme.id}_badge`,
        type: "viewer_badge",
        name: "Badge",
        x: contentX,
        y: 18,
        width: badgeWidth,
        height: 25,
        zIndex: 3,
        visible: true,
        locked: false,
        props: { text: theme.frame === "pixel" ? "💎 7" : "LIVE" },
        style: {
          backgroundColor: theme.preview.badgeBg,
          radius: theme.frame === "pixel" || theme.frame === "square" ? 4 : 999,
          fontSize: 11,
          fontWeight: 900,
          color: theme.preview.badgeText,
          align: "center",
          lineHeight: 1,
          opacity: 100
        }
      },
      {
        id: `${theme.id}_username`,
        type: "viewer_username",
        name: "Username",
        x: contentX + badgeWidth + 14,
        y: 17,
        width: 230,
        height: 28,
        zIndex: 4,
        visible: true,
        locked: false,
        props: { text: "@{{viewer.username}}" },
        style: {
          fontSize: theme.frame === "pixel" ? 18 : 22,
          fontWeight: 900,
          color: theme.preview.username,
          align: "left",
          lineHeight: 1.05,
          textOverflow: "ellipsis",
          opacity: 100
        }
      },
      {
        id: `${theme.id}_comment`,
        type: "comment",
        name: "Message",
        x: contentX,
        y: 56,
        width: 420,
        height: 34,
        zIndex: 5,
        visible: true,
        locked: false,
        props: { text: "{{comment.text}}" },
        style: {
          fontSize: theme.frame === "pixel" ? 18 : 22,
          fontWeight: theme.frame === "pixel" ? 800 : 700,
          color: theme.preview.text,
          align: "left",
          lineHeight: 1.12,
          overflow: "hidden",
          textOverflow: "clip",
          autoFitFontSize: true,
          opacity: 100
        }
      },
      {
        id: `${theme.id}_status`,
        type: "container",
        name: "Status Dot",
        x: cardWidth - 36,
        y: 42,
        width: 9,
        height: 9,
        zIndex: 6,
        visible: true,
        locked: false,
        props: {},
        style: {
          backgroundColor: theme.preview.accent2,
          radius: 999,
          opacity: 90
        }
      }
    ]
  };

  return {
    version: 2,
    kind: "CHAT",
    name: theme.name,
    canvas: {
      width: 840,
      height: 430,
      background: { type: "transparent", color: "transparent", opacity: 0 },
      radius: 0,
      stroke: { enabled: false, color: "#ffffff", width: 0 },
      shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 },
      animation: {
        type: "none",
        enabled: false,
        color: theme.preview.border,
        color2: theme.preview.accent2,
        durationMs: 2400,
        intensity: 54
      }
    },
    dataSource: {
      type: "chat",
      filters: {
        chat: true,
        follow: false,
        gift: false,
        join: true,
        like: false,
        share: false,
        themeFrame: theme.frame,
        themeId: theme.id
      }
    },
    layout: {
      mode: "list",
      maxItems: 5,
      gap: -8,
      direction: "vertical",
      reverse: true,
      align: "start",
      listStyle: "focus_stack",
      enterAnimation: "slide-right",
      exitAnimation: "slide-left",
      autoCloseMs: 0,
      animationDurationMs: 320
    },
    components: [
      card,
      {
        id: `${theme.id}_profile`,
        type: "profile_photo",
        name: "Avatar",
        x: avatarX,
        y: avatarY,
        width: avatarSize,
        height: avatarSize,
        zIndex: 8,
        visible: true,
        locked: false,
        props: {
          src: "{{viewer.avatar}}",
          fallback: "/default-avatar.png"
        },
        style: {
          radius: theme.frame === "pixel" || theme.frame === "square" ? 8 : 999,
          opacity: 100,
          border: { enabled: true, color: theme.preview.border, width: theme.frame === "square" ? 2 : 1 },
          shadow: {
            enabled: theme.frame !== "white" && theme.frame !== "neumorph-light",
            color: theme.preview.glow,
            opacity: 28,
            blur: 16,
            x: 0,
            y: 0
          },
          objectFit: "cover",
          backgroundColor: theme.preview.avatarBg
        }
      }
    ]
  };
}

function getSchemaBackground(theme: ChatThemeInput): OverlayComponentSchema["style"]["background"] {
  if (theme.schemaStyle.backgroundType === "gradient") {
    return {
      type: "gradient",
      color: theme.preview.panel,
      from: theme.preview.panel,
      to: theme.preview.panelSoft,
      angle: theme.frame === "women" ? 120 : 135,
      opacity: 96
    };
  }

  if (theme.schemaStyle.backgroundType === "glass") {
    return {
      type: "glass",
      color: theme.preview.panel,
      from: theme.preview.panel,
      to: theme.preview.panelSoft,
      angle: 135,
      opacity: 36
    };
  }

  return {
    type: "solid",
    color: theme.preview.panel,
    opacity: theme.frame === "white" || theme.frame === "pixel" || theme.frame === "pink" || theme.frame === "neumorph-light" ? 98 : 94
  };
}
