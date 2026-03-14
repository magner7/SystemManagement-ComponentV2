import fs from "node:fs";
import { kvGet, kvSet } from "./db";
import path from "node:path";

export type TicketSettings = {
  enabled: boolean;
  logsChannelId: string | null;
  panelChannelId: string | null;
  transcriptChannelId: string | null;
  mentionOnOpen: boolean;
  requireOpenReason: boolean;
  requireCloseReason: boolean;
  maxOpenPerUser: number;
  inactivityCloseHours: number;
  reminderMinutes: number;
  immuneRoleIds: string[];
  lockToAssignee: boolean;

  panelTitle: string;
  panelDescription: string;
  panelEmoji: string;

  types: TicketType[];
};

export type TicketType = {
  id: string;
  name: string;

  emoji?: string;

  description?: string;

  categoryId: string | null;

  archiveCategoryId: string | null;

  staffRoleIds: string[];

  autoCloseHours: number;

  questions: string[];

  requireReason: boolean;
};

export type BotPermission =
  | "VIEW_PANEL"
  | "MANAGE_TICKETS"
  | "VIEW_OCCURRENCES"
  | "MANAGE_OCCURRENCES"
  | "MANAGE_MODLOG";

export const BOT_PERMISSIONS: { key: BotPermission; label: string; desc: string }[] = [
  { key: "VIEW_PANEL",         label: "Ver painel",           desc: "Acessa o painel de gerenciamento" },
  { key: "MANAGE_TICKETS",     label: "Gerenciar tickets",    desc: "Configura o sistema de tickets" },
  { key: "VIEW_OCCURRENCES",   label: "Ver ocorrências",      desc: "Visualiza ocorrências e perfis de membros" },
  { key: "MANAGE_OCCURRENCES", label: "Gerenciar ocorrências",desc: "Registra, edita e revoga ocorrências" },
  { key: "MANAGE_MODLOG",      label: "Gerenciar modlog",     desc: "Acessa e gerencia o log de moderação" },
];

export type WelcomeSettings = {
  enabled: boolean;

  joinChannelId: string | null;

  leaveChannelId: string | null;

  bannerUrl: string | null;

  leaveBannerUrl: string | null;

  joinMessage: string;

  leaveMessage: string;

  joinTitle: string;

  leaveTitle: string;

  autoRoleIds: string[];

  sendDm: boolean;

  dmMessage: string;

  showBanner: boolean;

  showAvatar: boolean;

  showCreatedAt: boolean;

  showUserId: boolean;

  showStatus: boolean;

  showMemberCount: boolean;

  showCustomMessage: boolean;

  cardEnabled: boolean;

  cardBgColor: string;

  cardBgImageUrl: string | null;

  cardTextColor: string;

  cardSubtextColor: string;

  cardAvatarBorderColor: string;

  cardTitle: string;

  cardSubtitle: string;

  cardAccentColor: string;
};

export function defaultWelcome(): WelcomeSettings {
  return {
    enabled: false,
    joinChannelId: null,
    leaveChannelId: null,
    bannerUrl: null,
    leaveBannerUrl: null,
    joinMessage: "Bem-vindo(a) ao **{server}**, {user}!\nEsperamos que aproveite sua estadia.",
    leaveMessage: "{username} saiu do servidor.",
    joinTitle: "Novo membro",
    leaveTitle: "Membro saiu",
    autoRoleIds: [],
    sendDm: false,
    dmMessage: "Bem-vindo(a) ao **{server}**! Leia as regras e bom proveito.",
    showBanner: true,
    showAvatar: true,
    showCreatedAt: true,
    showUserId: true,
    showStatus: true,
    showMemberCount: true,
    showCustomMessage: true,
    cardEnabled: false,
    cardBgColor: "#1a1a2e",
    cardBgImageUrl: null,
    cardTextColor: "#ffffff",
    cardSubtextColor: "#a0a0b0",
    cardAvatarBorderColor: "#5865f2",
    cardTitle: "Bem-vindo(a), {username}!",
    cardSubtitle: "Membro #{count} de {server}",
    cardAccentColor: "#5865f2",
  };
}

export type GuildSettings = {
  ticket: TicketSettings;
  welcome: WelcomeSettings;
};

const dataDir = path.join(process.cwd(), "data");
const file = path.join(dataDir, "guilds.json");

function ensure() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify({}), "utf8");
}

export function defaultTicket(): TicketSettings {
  return {
    enabled: true,
    logsChannelId: null,
    panelChannelId: null,
    transcriptChannelId: null,
    mentionOnOpen: false,
    requireOpenReason: false,
    requireCloseReason: false,
    maxOpenPerUser: 1,
    inactivityCloseHours: 0,
    reminderMinutes: 30,
    immuneRoleIds: [],
    lockToAssignee: false,
    panelTitle: "📋 Abrir Ticket",
    panelDescription: "Selecione o tipo de ticket abaixo para abrir um atendimento com nossa equipe.",
    panelEmoji: "🎫",
    types: [
      {
        id: "SUP",
        name: "Suporte",
        emoji: "🎫",
        description: "Abrir um ticket de suporte geral",
        categoryId: null,
        archiveCategoryId: null,
        staffRoleIds: [],
        autoCloseHours: 0,
        questions: ["Detalhe seu problema"],
        requireReason: true,
      },
    ],
  };
}

export function defaultSettings(): GuildSettings {
  return {
    ticket: defaultTicket(),
    welcome: defaultWelcome(),
  };
}

export function getGuildSettings(guildId: string): GuildSettings {
  ensure();
  const raw = JSON.parse(fs.readFileSync(file, "utf8") || "{}") as Record<string, any>;
  const stored = raw[guildId] ?? {};
  const base = defaultSettings();

  return {
    ...base,
    ...stored,
    ticket: {
      ...base.ticket,
      ...(stored.ticket ?? {}),
      types: stored.ticket?.types ?? base.ticket.types,
      immuneRoleIds: stored.ticket?.immuneRoleIds ?? [],
    },
    welcome: {
      ...base.welcome,
      ...(stored.welcome ?? {}),
      autoRoleIds: stored.welcome?.autoRoleIds ?? [],
      leaveBannerUrl: stored.welcome?.leaveBannerUrl ?? null,
      showCreatedAt: stored.welcome?.showCreatedAt ?? true,
      showUserId: stored.welcome?.showUserId ?? true,
      showStatus: stored.welcome?.showStatus ?? true,
      showMemberCount: stored.welcome?.showMemberCount ?? true,
      showCustomMessage: stored.welcome?.showCustomMessage ?? true,
      cardEnabled: stored.welcome?.cardEnabled ?? false,
      cardBgColor: stored.welcome?.cardBgColor ?? "#1a1a2e",
      cardBgImageUrl: stored.welcome?.cardBgImageUrl ?? null,
      cardTextColor: stored.welcome?.cardTextColor ?? "#ffffff",
      cardSubtextColor: stored.welcome?.cardSubtextColor ?? "#a0a0b0",
      cardAvatarBorderColor: stored.welcome?.cardAvatarBorderColor ?? "#5865f2",
      cardTitle: stored.welcome?.cardTitle ?? "Bem-vindo(a), {username}!",
      cardSubtitle: stored.welcome?.cardSubtitle ?? "Membro #{count} de {server}",
      cardAccentColor: stored.welcome?.cardAccentColor ?? "#5865f2",
    },
  };
}

export function setGuildSettings(guildId: string, patch: Partial<GuildSettings>) {
  ensure();
  const raw = JSON.parse(fs.readFileSync(file, "utf8") || "{}") as Record<string, any>;
  const current = raw[guildId] || defaultSettings();

  const next: any = {
    ...current,
    ...patch,
    ticket: {
      ...(current.ticket ?? {}),
      ...(patch.ticket ?? {}),
    },
    welcome: {
      ...(current.welcome ?? {}),
      ...(patch.welcome ?? {}),
    },
  };

  raw[guildId] = next;
  fs.writeFileSync(file, JSON.stringify(raw, null, 2), "utf8");
}

export type OccurrenceType =
  | "WARN"
  | "SUSPEND"
  | "KICK"
  | "BAN"
  | "UNBAN"
  | "MUTE"
  | "TIMEOUT"
  | "UNMUTE"
  | "NOTE"
  | "COMMEND"
  | "CUSTOM";

export const OCCURRENCE_TYPES: { key: OccurrenceType; label: string; emojiKey: string; color: number; severe: boolean }[] = [
  { key: "WARN",    label: "Advertência",       emojiKey: "warning",     color: 0xfee75c, severe: false },
  { key: "SUSPEND", label: "Suspensão",         emojiKey: "lock",        color: 0xed4245, severe: true  },
  { key: "KICK",    label: "Expulsão",          emojiKey: "remove",      color: 0xffa500, severe: true  },
  { key: "BAN",     label: "Banimento",         emojiKey: "hammer",      color: 0xb22222, severe: true  },
  { key: "UNBAN",   label: "Desbanimento",      emojiKey: "unlock",      color: 0x57f287, severe: false },
  { key: "MUTE",    label: "Silenciamento",     emojiKey: "mute",        color: 0xffa500, severe: false },
  { key: "TIMEOUT", label: "Castigo (timeout)", emojiKey: "timedout",    color: 0xed4245, severe: true  },
  { key: "UNMUTE",  label: "Remoção de mudo",   emojiKey: "mic",         color: 0x57f287, severe: false },
  { key: "NOTE",    label: "Observação",        emojiKey: "clipboard",   color: 0x5865f2, severe: false },
  { key: "COMMEND", label: "Elogio",            emojiKey: "achievement", color: 0xffd700, severe: false },
  { key: "CUSTOM",  label: "Ação customizada",  emojiKey: "seguranca",   color: 0x99aab5, severe: false },
];

export type OccurrenceStatus = "ACTIVE" | "REVOKED" | "EXPIRED";

export type Occurrence = {
  id: string;
  guildId: string;
  targetId: string;
  targetTag: string;
  staffId: string;
  staffTag: string;
  type: OccurrenceType;
  reason: string;
  details: string;
  evidence: string;
  duration: string | null;
  expiresAt: number | null;
  status: OccurrenceStatus;
  revokedBy: string | null;
  revokedReason: string | null;
  revokedAt: number | null;
  createdAt: number;
  updatedAt: number;
  attachmentUrl: string | null;
  points: number;
  notifyDm: boolean;
};

export type OccurrenceSettings = {
  enabled: boolean;
  logChannelId: string | null;
  alertChannelId: string | null;
  staffRoleIds: string[];
  pointThresholds: { points: number; action: string }[];
  warnPoints: number;
  suspendPoints: number;
  banPoints: number;
  notePoints: number;
  commendPoints: number;
  customPoints: number;
  autoExpireDays: number | null;
  dmOnOccurrence: boolean;
  requireEvidence: boolean;
};

export function defaultOccurrenceSettings(): OccurrenceSettings {
  return {
    enabled: false,
    logChannelId: null,
    alertChannelId: null,
    staffRoleIds: [],
    pointThresholds: [
      { points: 3,  action: "Revisão obrigatória pela administração" },
      { points: 5,  action: "Suspensão recomendada" },
      { points: 10, action: "Banimento recomendado" },
    ],
    warnPoints: 1,
    suspendPoints: 3,
    banPoints: 5,
    notePoints: 0,
    commendPoints: -1,
    customPoints: 2,
    autoExpireDays: 30,
    dmOnOccurrence: true,
    requireEvidence: false,
  };
}

const occurrencesFile = path.join(dataDir, "occurrences.json");
const occurrenceSettingsFile = path.join(dataDir, "occurrence_settings.json");

function ensureOcc() {
  ensure();
  if (!fs.existsSync(occurrencesFile)) fs.writeFileSync(occurrencesFile, JSON.stringify({}), "utf8");
  if (!fs.existsSync(occurrenceSettingsFile)) fs.writeFileSync(occurrenceSettingsFile, JSON.stringify({}), "utf8");
}

export function occId(): string {
  return "OCC-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

export function getOccurrenceSettings(guildId: string): OccurrenceSettings {
  ensureOcc();
  const raw = JSON.parse(fs.readFileSync(occurrenceSettingsFile, "utf8") || "{}") as Record<string, Partial<OccurrenceSettings>>;
  return { ...defaultOccurrenceSettings(), ...(raw[guildId] ?? {}) };
}

export function setOccurrenceSettings(guildId: string, patch: Partial<OccurrenceSettings>) {
  ensureOcc();
  const raw = JSON.parse(fs.readFileSync(occurrenceSettingsFile, "utf8") || "{}") as Record<string, OccurrenceSettings>;
  raw[guildId] = { ...getOccurrenceSettings(guildId), ...patch };
  fs.writeFileSync(occurrenceSettingsFile, JSON.stringify(raw, null, 2), "utf8");
}

export function saveOccurrence(occ: Occurrence) {
  ensureOcc();
  const raw = JSON.parse(fs.readFileSync(occurrencesFile, "utf8") || "{}") as Record<string, Occurrence>;
  raw[occ.id] = occ;
  fs.writeFileSync(occurrencesFile, JSON.stringify(raw, null, 2), "utf8");
}

export function getOccurrence(id: string): Occurrence | null {
  ensureOcc();
  const raw = JSON.parse(fs.readFileSync(occurrencesFile, "utf8") || "{}") as Record<string, Occurrence>;
  return raw[id] ?? null;
}

export function updateOccurrence(id: string, patch: Partial<Occurrence>) {
  const cur = getOccurrence(id);
  if (!cur) return;
  saveOccurrence({ ...cur, ...patch, updatedAt: Date.now() });
}

export function getPlayerOccurrences(guildId: string, targetId: string): Occurrence[] {
  ensureOcc();
  const raw = JSON.parse(fs.readFileSync(occurrencesFile, "utf8") || "{}") as Record<string, Occurrence>;
  return Object.values(raw)
    .filter((o) => o.guildId === guildId && o.targetId === targetId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export function getGuildOccurrences(guildId: string, filters?: {
  type?: OccurrenceType;
  status?: OccurrenceStatus;
  staffId?: string;
  since?: number;
  limit?: number;
}): Occurrence[] {
  ensureOcc();
  const raw = JSON.parse(fs.readFileSync(occurrencesFile, "utf8") || "{}") as Record<string, Occurrence>;
  let list = Object.values(raw).filter((o) => o.guildId === guildId);
  if (filters?.type)    list = list.filter((o) => o.type === filters.type);
  if (filters?.status)  list = list.filter((o) => o.status === filters.status);
  if (filters?.staffId) list = list.filter((o) => o.staffId === filters.staffId);
  if (filters?.since)   list = list.filter((o) => o.createdAt >= filters.since!);
  list.sort((a, b) => b.createdAt - a.createdAt);
  if (filters?.limit) list = list.slice(0, filters.limit);
  return list;
}

export function getPlayerPoints(guildId: string, targetId: string, settings: OccurrenceSettings): number {
  const occs = getPlayerOccurrences(guildId, targetId).filter((o) => o.status === "ACTIVE");
  return occs.reduce((sum, o) => sum + o.points, 0);
}

export function checkExpiredOccurrences(guildId: string): Occurrence[] {
  ensureOcc();
  const now = Date.now();
  const raw = JSON.parse(fs.readFileSync(occurrencesFile, "utf8") || "{}") as Record<string, Occurrence>;
  const expired: Occurrence[] = [];
  for (const occ of Object.values(raw)) {
    if (occ.guildId !== guildId) continue;
    if (occ.status === "ACTIVE" && occ.expiresAt && occ.expiresAt <= now) {
      occ.status = "EXPIRED";
      occ.updatedAt = now;
      raw[occ.id] = occ;
      expired.push(occ);
    }
  }
  if (expired.length) fs.writeFileSync(occurrencesFile, JSON.stringify(raw, null, 2), "utf8");
  return expired;
}

export function parseDuration(raw: string): number | null {
  const m = raw.trim().match(/^(\d+)(s|m|h|d|w)$/i);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  const unit = m[2].toLowerCase();
  const mult: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return n * mult[unit];
}
