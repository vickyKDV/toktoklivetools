import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demoUser = {
  name: "Vicky Admin",
  email: "admin@tiktoklive.local",
  password: "Admin12345!"
};

const defaultChatOverlaySchema = {
  version: 2,
  kind: "CHAT",
  name: "Default Chat Overlay",
  canvas: {
    width: 800,
    height: 600,
    background: { type: "transparent", color: "transparent", opacity: 0 },
    radius: 0,
    stroke: { enabled: false, color: "#ffffff", width: 0 },
    shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 }
  },
  dataSource: { type: "chat", filters: {} },
  layout: { mode: "list", maxItems: 10, gap: 12, direction: "vertical", reverse: true, align: "start", enterAnimation: "slide-up", exitAnimation: "fade" },
  components: [
    {
      id: "card_1",
      type: "bubble_card",
      name: "Chat Card",
      x: 0,
      y: 0,
      width: 800,
      height: 140,
      zIndex: 1,
      visible: true,
      locked: false,
      props: { clipContent: true },
      style: {
        background: { type: "solid", color: "#111827", opacity: 88 },
        radius: 24,
        overflow: "hidden",
        shadow: { enabled: true, color: "#000000", opacity: 24, blur: 20, x: 0, y: 8 }
      },
      children: [
        {
          id: "name_1",
          type: "viewer_name",
          name: "Nama",
          x: 96,
          y: 24,
          width: 260,
          height: 28,
          zIndex: 2,
          visible: true,
          locked: false,
          props: { text: "{{viewer.name}}" },
          style: { fontSize: 20, fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }
        },
        {
          id: "comment_1",
          type: "comment",
          name: "Komentar",
          x: 96,
          y: 58,
          width: 570,
          height: 56,
          zIndex: 3,
          visible: true,
          locked: false,
          props: { text: "{{comment.text}}" },
          style: { fontSize: 24, fontWeight: 600, color: "#ffffff", lineHeight: 1.2, maxLines: 2, textOverflow: "ellipsis" }
        }
      ]
    },
    {
      id: "profile_1",
      type: "profile_photo",
      name: "Foto Profil",
      x: 24,
      y: 34,
      width: 72,
      height: 72,
      zIndex: 4,
      visible: true,
      locked: false,
      props: { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" },
      style: { radius: 999, border: { enabled: true, color: "#ffffff", width: 3 }, objectFit: "cover" }
    }
  ]
};

async function main() {
  const passwordHash = await bcrypt.hash(demoUser.password, 12);

  const user = await prisma.user.upsert({
    where: {
      email: demoUser.email
    },
    create: {
      name: demoUser.name,
      email: demoUser.email,
      passwordHash
    },
    update: {
      name: demoUser.name,
      passwordHash
    }
  });

  const existingMembership = await prisma.workspaceMember.findFirst({
    where: {
      userId: user.id
    },
    include: {
      workspace: true
    }
  });

  if (!existingMembership) {
    await prisma.workspace.create({
      data: {
        name: "Demo TikTok Live",
        slug: `demo-tiktok-live-${randomUUID().slice(0, 6)}`,
        tiktokUsername: "demo_live",
        overlayKey: randomUUID().replaceAll("-", ""),
        members: {
          create: {
            userId: user.id,
            role: "OWNER"
          }
        },
        connection: {
          create: {
            tiktokUsername: "demo_live"
          }
        },
        overlays: {
          create: {
            name: "Default Chat Overlay",
            kind: "CHAT",
            draftSchema: {
              version: 2,
              kind: "CHAT",
              name: "Default Chat Overlay",
              canvas: {
                width: 800,
                height: 600,
                background: { type: "transparent", color: "transparent", opacity: 0 },
                radius: 0,
                stroke: { enabled: false, color: "#ffffff", width: 0 },
                shadow: { enabled: false, color: "#000000", blur: 0, x: 0, y: 0 }
              },
              dataSource: { type: "chat", filters: {} },
              layout: { mode: "list", maxItems: 10, gap: 12, direction: "vertical", reverse: true, align: "start", enterAnimation: "slide-up", exitAnimation: "fade" },
              components: [
                {
                  id: "card_1",
                  type: "bubble_card",
                  name: "Chat Card",
                  x: 0,
                  y: 0,
                  width: 800,
                  height: 140,
                  zIndex: 1,
                  visible: true,
                  locked: false,
                  props: { clipContent: true },
                  style: {
                    background: { type: "solid", color: "#111827", opacity: 88 },
                    radius: 24,
                    overflow: "hidden",
                    shadow: { enabled: true, color: "#000000", opacity: 24, blur: 20, x: 0, y: 8 }
                  },
                  children: [
                    {
                      id: "name_1",
                      type: "viewer_name",
                      name: "Nama",
                      x: 96,
                      y: 24,
                      width: 260,
                      height: 28,
                      zIndex: 2,
                      visible: true,
                      locked: false,
                      props: { text: "{{viewer.name}}" },
                      style: { fontSize: 20, fontWeight: 800, color: "#ffffff", lineHeight: 1.1 }
                    },
                    {
                      id: "comment_1",
                      type: "comment",
                      name: "Komentar",
                      x: 96,
                      y: 58,
                      width: 570,
                      height: 56,
                      zIndex: 3,
                      visible: true,
                      locked: false,
                      props: { text: "{{comment.text}}" },
                      style: { fontSize: 24, fontWeight: 600, color: "#ffffff", lineHeight: 1.2, maxLines: 2, textOverflow: "ellipsis" }
                    }
                  ]
                },
                {
                  id: "profile_1",
                  type: "profile_photo",
                  name: "Foto Profil",
                  x: 24,
                  y: 34,
                  width: 72,
                  height: 72,
                  zIndex: 4,
                  visible: true,
                  locked: false,
                  props: { src: "{{viewer.avatar}}", fallback: "/default-avatar.png" },
                  style: { radius: 999, border: { enabled: true, color: "#ffffff", width: 3 }, objectFit: "cover" }
                }
              ]
            },
            publishedSchema: defaultChatOverlaySchema,
            publishedAt: new Date()
          }
        },
        rules: {
          create: [
            {
              name: "Rose Gift Alert",
              triggerType: "GIFT",
              conditionField: "giftName",
              operator: "EQUALS",
              conditionValue: "Rose",
              actions: [
                {
                  type: "SHOW_OVERLAY",
                  durationMs: 5000
                }
              ]
            },
            {
              name: "Comment Alert",
              triggerType: "CHAT",
              conditionField: "comment",
              operator: "EXISTS",
              actions: [
                {
                  type: "SHOW_OVERLAY",
                  durationMs: 5000
                }
              ]
            }
          ]
        }
      }
    });
  }

  console.log("Demo login ready:");
  console.log(`Email: ${demoUser.email}`);
  console.log(`Password: ${demoUser.password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
