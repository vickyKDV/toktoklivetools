import { LiveEventType } from "@prisma/client";
import type { ChatUserRole } from "@/types/live";

type MappedEvent = {
  type: LiveEventType;
  tiktokUserId?: string | null;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  userRole?: ChatUserRole | null;
  giftName?: string | null;
  giftImageUrl?: string | null;
  giftId?: string | null;
  giftCount?: number | null;
  repeatCount?: number | null;
  comment?: string | null;
  likeCount?: number | null;
  shareCount?: number | null;
  viewerCount?: number | null;
  rawJson: unknown;
};

export function mapTikTokEvent(eventName: string, payload: unknown): MappedEvent {
  const data = safeRecord(payload);

  switch (eventName) {
    case "chat":
      return {
        type: LiveEventType.CHAT,
        tiktokUserId: pickString(data.userId),
        username: pickString(data.uniqueId),
        displayName: pickString(data.nickname),
        avatarUrl: findAvatarUrl(data),
        userRole: getUserRole(data),
        comment: pickString(data.comment),
        rawJson: toJsonSafe(payload)
      };
    case "gift":
      return {
        type: LiveEventType.GIFT,
        tiktokUserId: pickString(data.userId),
        username: pickString(data.uniqueId),
        displayName: pickString(data.nickname),
        avatarUrl: findAvatarUrl(data),
        userRole: getUserRole(data),
        giftName: pickString(data.giftName),
        giftImageUrl: findGiftImageUrl(data),
        giftId: pickString(data.giftId),
        giftCount: pickNumber(data.diamondCount) ?? pickNumber(data.repeatCount) ?? 1,
        repeatCount: pickNumber(data.repeatCount),
        rawJson: toJsonSafe(payload)
      };
    case "like":
      return {
        type: LiveEventType.LIKE,
        tiktokUserId: pickString(data.userId),
        username: pickString(data.uniqueId),
        displayName: pickString(data.nickname),
        avatarUrl: findAvatarUrl(data),
        userRole: getUserRole(data),
        likeCount: pickNumber(data.likeCount) ?? pickNumber(data.totalLikeCount),
        rawJson: toJsonSafe(payload)
      };
    case "share":
      return {
        type: LiveEventType.SHARE,
        tiktokUserId: pickString(data.userId),
        username: pickString(data.uniqueId),
        displayName: pickString(data.nickname),
        avatarUrl: findAvatarUrl(data),
        userRole: getUserRole(data),
        shareCount: pickNumber(data.shareCount),
        rawJson: toJsonSafe(payload)
      };
    case "follow":
      return {
        type: LiveEventType.FOLLOW,
        tiktokUserId: pickString(data.userId),
        username: pickString(data.uniqueId),
        displayName: pickString(data.nickname),
        avatarUrl: findAvatarUrl(data),
        userRole: getUserRole(data),
        rawJson: toJsonSafe(payload)
      };
    case "member":
      return {
        type: LiveEventType.MEMBER,
        tiktokUserId: pickString(data.userId),
        username: pickString(data.uniqueId),
        displayName: pickString(data.nickname),
        avatarUrl: findAvatarUrl(data),
        userRole: getUserRole(data),
        rawJson: toJsonSafe(payload)
      };
    case "subscribe":
      return {
        type: LiveEventType.SUBSCRIBE,
        tiktokUserId: pickString(data.userId),
        username: pickString(data.uniqueId),
        displayName: pickString(data.nickname),
        avatarUrl: findAvatarUrl(data),
        userRole: "subscriber",
        rawJson: toJsonSafe(payload)
      };
    case "roomUser":
      return {
        type: LiveEventType.VIEWER_COUNT,
        viewerCount: pickNumber(data.viewerCount) ?? pickNumber(data.totalUser),
        rawJson: toJsonSafe(payload)
      };
    case "streamEnd":
      return {
        type: LiveEventType.STREAM_END,
        rawJson: toJsonSafe(payload)
      };
    default:
      return {
        type: LiveEventType.CHAT,
        rawJson: toJsonSafe(payload)
      };
  }
}

export function socialEventName(payload: unknown) {
  const data = safeRecord(payload);
  const displayType = pickString(data.displayType)?.toLowerCase() ?? "";
  const label = pickString(data.label)?.toLowerCase() ?? "";
  const text = `${displayType} ${label}`;

  if (text.includes("follow")) {
    return "follow";
  }

  if (text.includes("share")) {
    return "share";
  }

  return "share";
}

function safeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function pickString(value: unknown) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  if (typeof value === "number") {
    return String(value);
  }

  return null;
}

function pickNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function pickBoolean(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    return value === "true" || value === "1";
  }

  return false;
}

function getUserRole(data: Record<string, unknown>): ChatUserRole {
  const followRole = pickNumber(data.followRole);
  const badgeText = safeText(data);

  if (
    pickBoolean(data.isModerator) ||
    pickBoolean(data.isMod) ||
    badgeText.includes("moderator")
  ) {
    return "moderator";
  }

  if (
    pickBoolean(data.isSubscriber) ||
    pickBoolean(data.subscriber) ||
    pickBoolean(data.isSubscribe) ||
    badgeText.includes("subscriber") ||
    badgeText.includes("superfan") ||
    badgeText.includes("super fan")
  ) {
    return "subscriber";
  }

  if (followRole === 2 || pickBoolean(data.isFriend) || badgeText.includes("friend")) {
    return "friend";
  }

  if (
    followRole === 1 ||
    pickBoolean(data.isFollower) ||
    pickBoolean(data.following) ||
    badgeText.includes("follower")
  ) {
    return "follower";
  }

  return "viewer";
}

function findAvatarUrl(data: Record<string, unknown>) {
  const direct =
    pickString(data.profilePictureUrl) ??
    pickString(data.profilePicture) ??
    pickString(data.avatarUrl) ??
    pickString(data.avatarThumb) ??
    pickString(data.avatarMedium) ??
    pickString(data.avatarLarger);

  if (direct) {
    return direct;
  }

  return findNestedAvatarUrl(data);
}

function findGiftImageUrl(data: Record<string, unknown>) {
  const direct =
    pickString(data.giftPictureUrl) ??
    pickString(data.giftPicture) ??
    pickString(data.giftImageUrl) ??
    pickString(data.giftImage) ??
    pickString(data.giftIconUrl) ??
    pickString(data.giftIcon) ??
    pickString(data.imageUrl) ??
    pickString(data.iconUrl);

  if (direct && isImageUrl(direct)) {
    return direct;
  }

  const nestedGift =
    findNestedGiftImageUrl(data.gift) ??
    findNestedGiftImageUrl(data.giftDetails) ??
    findNestedGiftImageUrl(data.giftInfo) ??
    findNestedGiftImageUrl(data.giftData);

  if (nestedGift) {
    return nestedGift;
  }

  return findNestedGiftImageUrl(data);
}

function findNestedAvatarUrl(value: unknown, depth = 0): string | null {
  if (!value || depth > 4) {
    return null;
  }

  if (typeof value === "string") {
    return isImageUrl(value) ? value : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedAvatarUrl(item, depth + 1);
      if (found) {
        return found;
      }
    }
    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const preferredKeys = [
    "profilePictureUrl",
    "profilePicture",
    "avatarUrl",
    "avatarThumb",
    "avatarMedium",
    "avatarLarger",
    "url"
  ];

  for (const key of preferredKeys) {
    const candidate = record[key];
    if (typeof candidate === "string" && isImageUrl(candidate)) {
      return candidate;
    }
    const nested = findNestedAvatarUrl(candidate, depth + 1);
    if (nested) {
      return nested;
    }
  }

  for (const [key, candidate] of Object.entries(record)) {
    if (!/avatar|profile|picture|image|thumb/i.test(key)) {
      continue;
    }
    const nested = findNestedAvatarUrl(candidate, depth + 1);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function findNestedGiftImageUrl(value: unknown, depth = 0): string | null {
  if (!value || depth > 5) {
    return null;
  }

  if (typeof value === "string") {
    return isImageUrl(value) ? value : null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNestedGiftImageUrl(item, depth + 1);
      if (found) {
        return found;
      }
    }

    return null;
  }

  if (typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const preferredKeys = [
    "giftPictureUrl",
    "giftPicture",
    "giftImageUrl",
    "giftImage",
    "giftIconUrl",
    "giftIcon",
    "imageUrl",
    "image",
    "iconUrl",
    "icon",
    "url"
  ];

  for (const key of preferredKeys) {
    const candidate = record[key];

    if (typeof candidate === "string" && isImageUrl(candidate)) {
      return candidate;
    }

    const nested = findNestedGiftImageUrl(candidate, depth + 1);
    if (nested) {
      return nested;
    }
  }

  for (const [key, candidate] of Object.entries(record)) {
    if (/avatar|profile/i.test(key) || !/gift|diamond|icon|image|picture|thumb/i.test(key)) {
      continue;
    }

    const nested = findNestedGiftImageUrl(candidate, depth + 1);
    if (nested) {
      return nested;
    }
  }

  return null;
}

function isImageUrl(value: string) {
  return /^https?:\/\//i.test(value) && /avatar|profile|image|picture|p16|p19|tiktokcdn|byteimg/i.test(value);
}

function safeText(value: unknown) {
  try {
    return JSON.stringify(value).toLowerCase();
  } catch {
    return "";
  }
}

function toJsonSafe(value: unknown) {
  const seen = new WeakSet();
  const serialized = JSON.stringify(value, (_key, innerValue) => {
    if (typeof innerValue === "bigint") {
      return innerValue.toString();
    }

    if (innerValue && typeof innerValue === "object") {
      if (seen.has(innerValue)) {
        return "[Circular]";
      }
      seen.add(innerValue);
    }

    return innerValue;
  });

  return serialized ? JSON.parse(serialized) : null;
}
