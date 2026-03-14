import { kvGet, kvSet } from "./db";

export type TicketStatus = "OPEN" | "CLOSED";

export type TicketRecord = {
  id: string;
  guildId: string;
  channelId: string;
  typeId: string;
  title?: string | null;
  userId: string;
  createdAt: number;
  createdByTag?: string;
  status: TicketStatus;
  assigneeId: string | null;
  priority: "LOW" | "NORMAL" | "HIGH";
  lastActivityAt: number;
  reminderSentAt?: number;
  closedAt?: number;
  closeReason?: string;
  transcriptPath?: string;

  addedMemberIds: string[];

  voiceChannelId?: string | null;
};

type DB = Record<string, TicketRecord>;
const KEY = "tickets:all";

function readAll(): DB { return kvGet<DB>(KEY, {}); }
function writeAll(raw: DB) { kvSet(KEY, raw); }

export function ticketId(): string {
  return Math.random().toString(36).slice(2, 9).toUpperCase();
}

export function saveTicket(t: TicketRecord) {
  const raw = readAll();
  raw[t.id] = t;
  writeAll(raw);
}

export function getTicket(id: string): TicketRecord | null {
  const raw = readAll();
  return raw[id] ?? null;
}

export function getTicketByChannel(guildId: string, channelId: string): TicketRecord | null {
  const raw = readAll();
  return Object.values(raw).find((t) => t.guildId === guildId && t.channelId === channelId) ?? null;
}

export function patchTicket(id: string, patch: Partial<TicketRecord>) {
  const raw = readAll();
  const cur = raw[id];
  if (!cur) return;
  raw[id] = { ...cur, ...patch };
  writeAll(raw);
}

export function listTickets(guildId: string, filter?: { status?: TicketStatus; userId?: string }) {
  const raw = readAll();
  let items = Object.values(raw).filter((t) => t.guildId === guildId);
  if (filter?.status) items = items.filter((t) => t.status === filter.status);
  if (filter?.userId) items = items.filter((t) => t.userId === filter.userId);
  items.sort((a, b) => b.createdAt - a.createdAt);
  return items;
}

export function deleteTicket(id: string) {
  const raw = readAll();
  if (!raw[id]) return;
  delete raw[id];
  writeAll(raw);
}

export function deleteTicketByChannel(guildId: string, channelId: string) {
  const raw = readAll();
  const entry = Object.values(raw).find((t) => t.guildId === guildId && t.channelId === channelId);
  if (!entry) return;
  delete raw[entry.id];
  writeAll(raw);
}
