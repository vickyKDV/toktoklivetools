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

export const overlayTemplates: OverlayTemplate[] = [
  {
    id: "profile-outside-card",
    name: "Profile Outside Card",
    description: "Foto profil di luar card, nama dan komentar di dalam card.",
    schema: {
      version: 1,
      name: "Profile Outside Card",
      canvas: {
        width: 800,
        height: 600,
        background: { type: "transparent", color: "transparent", opacity: 0 },
        radius: 0,
        stroke: { enabled: false, color: "#ffffff", width: 0 },
        shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 }
      },
      components: [
        {
          id: "profile_1",
          type: "profile_photo",
          name: "Foto Profil",
          x: 24,
          y: 58,
          width: 84,
          height: 84,
          zIndex: 3,
          visible: true,
          locked: false,
          props: { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" },
          style: { radius: 999, opacity: 100, border: { enabled: true, color: "#ffffff", width: 4 }, objectFit: "cover" }
        },
        {
          id: "card_1",
          type: "bubble_card",
          name: "Comment Card",
          x: 90,
          y: 40,
          width: 600,
          height: 130,
          zIndex: 1,
          visible: true,
          locked: false,
          props: { clipContent: true, padding: 16, layout: "free" },
          style: {
            background: { type: "solid", color: "#ffffff", opacity: 92 },
            radius: 24,
            overflow: "hidden",
            border: { enabled: true, color: "#ff9bb0", width: 2 },
            shadow: { enabled: true, color: "#000000", opacity: 20, blur: 20, x: 0, y: 8 }
          },
          children: [
            {
              id: "name_1",
              type: "viewer_name",
              name: "Nama",
              x: 42,
              y: 18,
              width: 260,
              height: 28,
              zIndex: 1,
              visible: true,
              locked: false,
              props: { text: "{{viewer.name}}" },
              style: { fontSize: 20, fontWeight: 800, color: "#111111", lineHeight: 1.1 }
            },
            {
              id: "comment_1",
              type: "comment",
              name: "Komentar",
              x: 42,
              y: 52,
              width: 520,
              height: 58,
              zIndex: 2,
              visible: true,
              locked: false,
              props: { text: "{{comment.text}}" },
              style: { fontSize: 24, fontWeight: 700, color: "#111111", lineHeight: 1.25, overflow: "hidden", textOverflow: "clip", autoFitFontSize: true }
            }
          ]
        }
      ]
    }
  },
  {
    id: "comment-inside-bubble",
    name: "Comment Inside Bubble",
    description: "Profile dan nama di atas, komentar di dalam bubble card.",
    schema: {
      version: 1,
      name: "Comment Inside Bubble",
      canvas: {
        width: 800,
        height: 600,
        background: { type: "transparent", color: "transparent", opacity: 0 },
        radius: 0,
        stroke: { enabled: false, color: "#ffffff", width: 0 },
        shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 }
      },
      components: [
        { id: "profile_1", type: "profile_photo", name: "Foto Profil", x: 36, y: 26, width: 56, height: 56, zIndex: 2, visible: true, locked: false, props: { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" }, style: { radius: 999, opacity: 100, objectFit: "cover" } },
        { id: "name_1", type: "viewer_name", name: "Nama", x: 108, y: 36, width: 280, height: 28, zIndex: 2, visible: true, locked: false, props: { text: "{{viewer.name}}" }, style: { fontSize: 21, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 } },
        {
          id: "bubble_1",
          type: "bubble_card",
          name: "Bubble Card",
          x: 84,
          y: 92,
          width: 580,
          height: 104,
          zIndex: 1,
          visible: true,
          locked: false,
          props: { clipContent: true, padding: 18, layout: "free" },
          style: { background: { type: "solid", color: "#111827", opacity: 86 }, radius: 28, overflow: "hidden", shadow: { enabled: true, color: "#000000", opacity: 34, blur: 28, x: 0, y: 12 } },
          children: [
            { id: "comment_1", type: "comment", name: "Komentar", x: 26, y: 22, width: 528, height: 58, zIndex: 1, visible: true, locked: false, props: { text: "{{comment.text}}" }, style: { fontSize: 25, fontWeight: 700, color: "#ffffff", lineHeight: 1.25, overflow: "hidden", textOverflow: "clip", autoFitFontSize: true } }
          ]
        }
      ]
    }
  },
  {
    id: "moderator-card",
    name: "Moderator Card",
    description: "Badge moderator kecil, nama dan komentar di dalam card.",
    schema: {
      version: 1,
      name: "Moderator Card",
      canvas: { width: 800, height: 600, background: { type: "transparent", color: "transparent", opacity: 0 }, radius: 0, stroke: { enabled: false, color: "#ffffff", width: 0 }, shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 } },
      components: [
        {
          id: "card_1",
          type: "gradient_card",
          name: "Moderator Card",
          x: 70,
          y: 46,
          width: 630,
          height: 138,
          zIndex: 1,
          visible: true,
          locked: false,
          props: { clipContent: true, padding: 18, layout: "free" },
          style: { background: { type: "gradient", color: "#4d85ff", from: "#1d4ed8", to: "#f43f5e", angle: 135, opacity: 94 }, radius: 22, overflow: "hidden", shadow: { enabled: true, color: "#000000", opacity: 30, blur: 26, x: 0, y: 10 } },
          children: [
            { id: "badge_1", type: "viewer_badge", name: "Badge", x: 24, y: 18, width: 122, height: 26, zIndex: 1, visible: true, locked: false, props: { text: "{{viewer.badge}}" }, style: { backgroundColor: "#dc2626", radius: 999, fontSize: 12, fontWeight: 900, color: "#ffffff", align: "center" } },
            { id: "name_1", type: "viewer_name", name: "Nama", x: 162, y: 18, width: 250, height: 28, zIndex: 2, visible: true, locked: false, props: { text: "{{viewer.name}}" }, style: { fontSize: 21, fontWeight: 900, color: "#ffffff", lineHeight: 1.1 } },
            { id: "comment_1", type: "comment", name: "Komentar", x: 24, y: 58, width: 580, height: 58, zIndex: 3, visible: true, locked: false, props: { text: "{{comment.text}}" }, style: { fontSize: 25, fontWeight: 800, color: "#ffffff", lineHeight: 1.25, overflow: "hidden", textOverflow: "clip", autoFitFontSize: true } }
          ]
        }
      ]
    }
  },
  {
    id: "minimal-floating",
    name: "Minimal Floating",
    description: "Profile tanpa card, komentar dengan background tipis.",
    schema: {
      version: 1,
      name: "Minimal Floating",
      canvas: { width: 800, height: 600, background: { type: "transparent", color: "transparent", opacity: 0 }, radius: 0, stroke: { enabled: false, color: "#ffffff", width: 0 }, shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 } },
      components: [
        { id: "profile_1", type: "profile_photo", name: "Foto Profil", x: 28, y: 42, width: 58, height: 58, zIndex: 2, visible: true, locked: false, props: { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" }, style: { radius: 999, opacity: 100, objectFit: "cover" } },
        {
          id: "comment_card_1",
          type: "glass_card",
          name: "Comment Background",
          x: 98,
          y: 36,
          width: 560,
          height: 76,
          zIndex: 1,
          visible: true,
          locked: false,
          props: { clipContent: true, padding: 14, layout: "free" },
          style: { background: { type: "glass", color: "#000000", opacity: 38 }, radius: 14, backdropBlur: 10, overflow: "hidden" },
          children: [
            { id: "comment_1", type: "comment", name: "Komentar", x: 18, y: 17, width: 520, height: 38, zIndex: 1, visible: true, locked: false, props: { text: "{{viewer.name}}: {{comment.text}}" }, style: { fontSize: 22, fontWeight: 700, color: "#ffffff", lineHeight: 1.2, overflow: "hidden", textOverflow: "clip", autoFitFontSize: true } }
          ]
        }
      ]
    }
  },
  moderatorStackTemplate,
  {
    id: "soft-bubble",
    name: "Soft Bubble",
    description: "Bubble putih lembut untuk chat kasual.",
    schema: {
      version: 1,
      name: "Soft Bubble",
      canvas: {
        width: 800,
        height: 600,
        background: { type: "solid", color: "#ffffff", opacity: 92 },
        radius: 30,
        stroke: { enabled: true, color: "#fecdd3", width: 2 },
        shadow: { enabled: true, color: "#00000030", blur: 22, x: 0, y: 10 }
      },
      components: [
        {
          id: "profile_1",
          type: "profile_photo",
          name: "Foto Profil",
          x: 24,
          y: 38,
          width: 68,
          height: 68,
          zIndex: 1,
          visible: true,
          locked: false,
          props: { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" },
          style: { radius: 999, opacity: 100, border: { enabled: true, color: "#fecdd3", width: 3 }, objectFit: "cover" }
        },
        {
          id: "name_1",
          type: "viewer_name",
          name: "Nama",
          x: 112,
          y: 30,
          width: 260,
          height: 30,
          zIndex: 2,
          visible: true,
          locked: false,
          props: { text: "{{viewer.name}}" },
          style: { fontSize: 22, fontWeight: 900, color: "#65a30d", align: "left", lineHeight: 1.1 }
        },
        {
          id: "comment_1",
          type: "comment",
          name: "Komentar",
          x: 112,
          y: 70,
          width: 560,
          height: 68,
          zIndex: 3,
          visible: true,
          locked: false,
          props: { text: "{{comment.text}}" },
          style: { fontSize: 26, fontWeight: 800, color: "#18181b", align: "left", lineHeight: 1.2 }
        }
      ]
    }
  },
  {
    id: "minimal-line",
    name: "Minimal Line",
    description: "Bar chat tipis tanpa avatar untuk canvas kecil.",
    schema: {
      version: 1,
      name: "Minimal Line",
      canvas: {
        width: 800,
        height: 600,
        background: { type: "solid", color: "#000000", opacity: 64 },
        radius: 12,
        stroke: { enabled: false, color: "#ffffff", width: 0 },
        shadow: { enabled: true, color: "#00000055", blur: 18, x: 0, y: 8 }
      },
      components: [
        {
          id: "name_1",
          type: "viewer_name",
          name: "Nama",
          x: 22,
          y: 16,
          width: 230,
          height: 24,
          zIndex: 1,
          visible: true,
          locked: false,
          props: { text: "{{viewer.name}}" },
          style: { fontSize: 18, fontWeight: 900, color: "#22d3ee", align: "left", lineHeight: 1 }
        },
        {
          id: "comment_1",
          type: "comment",
          name: "Komentar",
          x: 22,
          y: 46,
          width: 640,
          height: 42,
          zIndex: 2,
          visible: true,
          locked: false,
          props: { text: "{{comment.text}}" },
          style: { fontSize: 22, fontWeight: 700, color: "#ffffff", align: "left", lineHeight: 1.1 }
        }
      ]
    }
  }
];
