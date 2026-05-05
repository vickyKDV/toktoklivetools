import type { OverlayDesignSchema } from "@/features/overlay-builder/schema/overlaySchema";

export type OverlayEventPayload = {
  id: string;
  type: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  userRole?: ChatUserRole | null;
  giftName?: string | null;
  giftImageUrl?: string | null;
  giftCount?: number | null;
  likeCount?: number | null;
  shareCount?: number | null;
  viewerCount?: number | null;
  comment?: string | null;
  receivedAt: string;
  action?: string;
  flowId?: string | null;
  testMode?: boolean | null;
  animationUrl?: string | null;
  animationPosition?: string | null;
  animationSize?: number | null;
  animationFit?: string | null;
  mediaFrame?: string | null;
  mediaWidth?: number | null;
  mediaHeight?: number | null;
  actionLayer?: string | null;
  text3dTemplate?: string | null;
  text3dSubtitle?: string | null;
  text3dEffect?: string | null;
  text3dColor?: string | null;
  text3dAccentColor?: string | null;
  text3dDepth?: number | null;
  text3dBevel?: number | null;
  text3dMetalness?: number | null;
  text3dRoughness?: number | null;
  text3dSpin?: boolean | null;
  text3dFloat?: boolean | null;
  text3dOffsetX?: number | null;
  text3dOffsetY?: number | null;
  confettiEnabled?: boolean | null;
  confettiMode?: string | null;
  confettiPresets?: string[] | null;
  confettiLayer?: string | null;
  confettiParticleCount?: number | null;
  confettiSpread?: number | null;
  confettiStartVelocity?: number | null;
  confettiScalar?: number | null;
  confettiIntervalMs?: number | null;
  confettiOriginY?: number | null;
  confettiDurationMs?: number | null;
  confettiEmoji?: string | null;
  soundUrl?: string | null;
  volume?: number | null;
  durationMs?: number | null;
  useMediaDuration?: boolean | null;
};

export type OverlayType = "alert" | "gift" | "chat" | "focus-chat" | "leaderboard";

export type ChatUserRole =
  | "viewer"
  | "moderator"
  | "subscriber"
  | "follower"
  | "friend"
  | "topgifter";

export type LeaderboardMetric = "gift" | "like" | "chat";

export type LeaderboardPeriod = "realtime" | "7d" | "14d" | "30d" | "month";

export type LeaderboardEntry = {
  username: string;
  displayName: string | null;
  avatarUrl?: string | null;
  score: number;
  events: number;
};

export type OverlayDesignElementKey =
  | "profile"
  | "name"
  | "username"
  | "badge"
  | "message"
  | "timestamp";

export type OverlayDesignElement = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex?: number;
  visible: boolean;
  css: string;
};

export type OverlayCustomDesign = {
  width: number;
  height: number;
  containerCss: string;
  elements: Record<OverlayDesignElementKey, OverlayDesignElement>;
};

export type ChatOverlayStyle = {
  font: string;
  fontSize: number;
  lineGap: number;
  letterSpacing: number;
  fontColor: string;
  backgroundColor: string;
  moderatorColor: string;
  subscriberColor: string;
  followerColor: string;
  friendColor: string;
  animation: string;
  animationIn: string;
  animationOut: string;
  hideAfterMs: number;
  maxMessages: number;
  alignRight: boolean;
  showProfile: boolean;
  showBadge: boolean;
  showJoinEvents: boolean;
  showShareEvents: boolean;
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  customDesignEnabled: boolean;
  customDesignId?: string;
  customDesign: OverlayCustomDesign;
  customJsonDesign?: OverlayDesignSchema;
};

export type FocusChatStyle = {
  font: string;
  nameSize: number;
  messageSize: number;
  fontColor: string;
  nameColor: string;
  backgroundColor: string;
  borderColor: string;
  accentColor: string;
  shadowColor: string;
  width: number;
  radius: number;
  padding: number;
  animationIn: string;
  animationOut: string;
  durationMs: number;
  showProfile: boolean;
  showBadge: boolean;
  showUsername: boolean;
  showTimestamp: boolean;
  showQuoteIcon: boolean;
  shadowEnabled: boolean;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  strokeEnabled: boolean;
  strokeColor: string;
  strokeWidth: number;
  customDesignEnabled: boolean;
  customDesignId?: string;
  customDesign: OverlayCustomDesign;
};

export type GiftOverlayStyle = {
  font: string;
  fontSize: number;
  fontColor: string;
  backgroundColor: string;
  accentColor: string;
  animationIn: string;
  animationOut: string;
  maxItems: number;
  showProfile: boolean;
  showGiftIcon: boolean;
  showCoin: boolean;
  showSparkles: boolean;
};

export type RuleAction =
  | {
      type: "SHOW_OVERLAY";
      overlayKey: string;
      durationMs?: number;
    }
  | {
      type: "PLAY_SOUND";
      soundUrl: string;
      volume?: number;
    }
  | {
      type: "WEBHOOK";
      url: string;
      method?: "POST";
    };
