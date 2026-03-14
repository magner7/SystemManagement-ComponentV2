import type { Client, Guild, GuildMember, TextChannel, User, VoiceChannel } from "discord.js";
import {
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  PermissionsBitField,
  MessageFlags,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  AttachmentBuilder,
} from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { em } from "./emoji";
import { getGuildSettings } from "./store";
import { info } from "./logger";
import {
  TicketRecord,
  ticketId,
  saveTicket,
  patchTicket,
  getTicketByChannel,
  listTickets,
  deleteTicketByChannel,
} from "./ticketStore";
import { buildTicketPanelRows, buildTicketClosedRow } from "../views/ticketRuntime";

async function sendV2(channel: TextChannel, components: any[]) {
  return channel.send({ components: components as any, flags: MessageFlags.IsComponentsV2 as any } as any);
}

function normalizeTicketText(input: string) {
  const t = (input || "").toString().trim();
  if (!t) return "Sem informações.";
  return t.length > 4000 ? t.slice(0, 3997) + "..." : t;
}

export function findType(guildId: string, typeId: string) {
  const s = getGuildSettings(guildId);
  return s.ticket.types.find((t) => t.id === typeId) ?? null;
}

function staffMentions(roleIds: string[]) {
  const ids = (roleIds ?? []).filter(Boolean);
  if (!ids.length) return "";
  return ids.map((id) => `<@&${id}>`).join(" ");
}

export function isStaffMemberForTicket(guildId: string, ticket: TicketRecord, member: GuildMember | null) {
  if (!member) return false;
  const typeCfg = findType(guildId, ticket.typeId);
  const staffRoles = new Set((typeCfg?.staffRoleIds ?? []).filter(Boolean));
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  return member.roles.cache.some((r) => staffRoles.has(r.id));
}

export function canAccessTicket(guildId: string, ticket: TicketRecord, member: GuildMember): boolean {
  if (member.id === ticket.userId) return true;
  if ((ticket.addedMemberIds ?? []).includes(member.id)) return true;
  if (isStaffMemberForTicket(guildId, ticket, member)) return true;
  return false;
}

export async function createTicketChannel(opts: {
  guild: Guild;
  member: GuildMember;
  typeId: string;
  reason: string;
  answers: Record<string, string>;
}) {
  const { guild, member, typeId, reason, answers } = opts;
  const settings = getGuildSettings(guild.id);
  const tcfg = findType(guild.id, typeId);
  if (!tcfg) throw new Error("Tipo de ticket inválido.");

  const openTickets = listTickets(guild.id, { status: "OPEN", userId: member.id });
  const limit = settings.ticket.maxOpenPerUser ?? 0;
  if (limit > 0 && openTickets.length >= limit) {
    throw new Error(`Limite de ${limit} ticket(s) aberto(s) atingido.`);
  }

  const tid = ticketId();

  const uSlug = (() => {
    const raw = (member.user.username || member.user.id).toString();
    const normalized = raw.normalize("NFKD").replace(/[^a-zA-Z0-9 _-]/g, "");
    return normalized.trim().toLowerCase().replace(/\s+/g, "-").replace(/_+/g, "-").replace(/-+/g, "-").slice(0, 40) || "user";
  })();

  const typeName = tcfg.name.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 20);
  const channelName = `ticket-${typeName}-${uSlug}`.slice(0, 90);

  const overwrites = [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: member.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
    { id: guild.members.me!.id, allow: [PermissionsBitField.Flags.Administrator] },
    ...tcfg.staffRoleIds.map((rid) => ({
      id: rid,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    })),
  ];

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: tcfg.categoryId ?? undefined,
    permissionOverwrites: overwrites,
    reason: `Ticket ${tid} (${tcfg.name})`,
  });

  const record: TicketRecord = {
    title: opts.reason || null,
    id: tid,
    guildId: guild.id,
    channelId: channel.id,
    typeId,
    userId: member.id,
    createdAt: Date.now(),
    createdByTag: member.user.tag,
    status: "OPEN",
    assigneeId: null,
    priority: "NORMAL",
    lastActivityAt: Date.now(),
    addedMemberIds: [],
    voiceChannelId: null,
  };
  saveTicket(record);

  const fields = Object.entries(answers)
    .filter(([_, v]) => (v ?? "").trim())
    .slice(0, 10)
    .map(([k, v]) => ({ name: k.slice(0, 256), value: v.slice(0, 1024) }));

  const mentionLine = settings.ticket.mentionOnOpen
    ? `${staffMentions(tcfg.staffRoleIds)} <@${member.id}>`
    : `<@${member.id}>`;

  const openText = normalizeTicketText(
    `${em("textc")} **${tcfg.name}**\n\n` +
      `${mentionLine}\n` +
      `${em("ftvline")} ${em("info")} Assunto: ${reason || "(sem assunto)"}\n` +
      (record.assigneeId ? `${em("ftvline")} ${em("seguranca")} Staff que assumiu: <@${record.assigneeId}>\n` : "") +
      (fields.length ? "\n" + fields.map((f) => `**${f.name}**\n${f.value}`).join("\n\n") : ""),
  );

  const [panelRow1, panelRow2] = buildTicketPanelRows({ assigneeId: record.assigneeId });

  const openContainer = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(openText))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(true) as any)
    .addActionRowComponents(panelRow1 as any)
    .addActionRowComponents(panelRow2 as any);

  const msg = await sendV2(channel as TextChannel, [openContainer] as any);

  try { await msg.pin(); } catch {}

  await logTicket(guild, {
    title: "Ticket criado",
    description: `Ticket **${tid}** (${tcfg.name}) criado por <@${member.id}> em <#${channel.id}>.`,
  });

  return { channel: channel as TextChannel, ticket: record };
}

export async function logTicket(guild: Guild, entry: { title: string; description: string }) {
  const s = getGuildSettings(guild.id);
  const chId = s.ticket.logsChannelId;
  if (!chId) return;
  const ch = await guild.channels.fetch(chId).catch(() => null);
  if (!ch || !ch.isTextBased()) return;
  const embed = new EmbedBuilder()
    .setTitle(`${em("logs")} ${entry.title}`.trim())
    .setDescription(entry.description)
    .setTimestamp(new Date());
  await (ch as any).send({ embeds: [embed] }).catch(() => null);
}

export async function setTicketActivity(guildId: string, channelId: string) {
  const t = getTicketByChannel(guildId, channelId);
  if (!t || t.status !== "OPEN") return;
  patchTicket(t.id, { lastActivityAt: Date.now() });
}

export async function closeTicket(opts: {
  client: Client;
  guild: Guild;
  channel: TextChannel;
  closedBy: User;
  reason: string;
}) {
  const { guild, channel, closedBy, reason } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t || t.status !== "OPEN") throw new Error("Ticket não encontrado/aberto.");
  const typeCfg = findType(guild.id, t.typeId);

  const transcript = await buildTranscript(channel);
  const transcriptPath = persistTranscript(guild.id, t.id, transcript);

  patchTicket(t.id, {
    status: "CLOSED",
    closedAt: Date.now(),
    closeReason: reason,
    transcriptPath,
  });

  await channel.permissionOverwrites.edit(t.userId, {
    SendMessages: false,
    AddReactions: false,
  }).catch(() => null);

  if (typeCfg?.archiveCategoryId) {
    await channel.setParent(typeCfg.archiveCategoryId).catch(() => null);
  }
  await channel.setName(`closed-${channel.name}`.slice(0, 95)).catch(() => null);

  const closedText = normalizeTicketText(
    `${em("success")} **Ticket fechado**\n\n` +
      `> Fechado por <@${closedBy.id}>\n` +
      `> Motivo: ${reason || "(sem motivo)"}`,
  );

  const closedContainer = new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(closedText))
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false) as any)
    .addActionRowComponents(buildTicketClosedRow(t.id) as any);

  await sendV2(channel, [closedContainer] as any);
  await sendTranscript(guild, t.id, transcriptPath);
  await logTicket(guild, {
    title: "Ticket fechado",
    description: `Ticket **${t.id}** fechado por <@${closedBy.id}> em <#${channel.id}>.`,
  });

  info(`[ticket] closed ${t.id} by ${closedBy.id}`);
}

export async function deleteTicketChannel(opts: { guild: Guild; channel: TextChannel; by: User }) {
  const { guild, channel, by } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t) throw new Error("Ticket não encontrado.");

  if (t.voiceChannelId) {
    try {
      const vc = await guild.channels.fetch(t.voiceChannelId).catch(() => null);
      if (vc) await vc.delete("Ticket deletado").catch(() => null);
    } catch {}
  }

  deleteTicketByChannel(guild.id, channel.id);

  await logTicket(guild, {
    title: "Ticket deletado",
    description: `Ticket **${t.id}** deletado por <@${by.id}> (canal <#${channel.id}>).`,
  });

  await channel.delete(`Ticket deletado por ${by.tag}`).catch(() => null);
}

export async function claimTicket(opts: { guild: Guild; channel: TextChannel; by: GuildMember }) {
  const { guild, channel, by } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t || t.status !== "OPEN") throw new Error("Ticket não encontrado/aberto.");
  if (!isStaffMemberForTicket(guild.id, t, by)) throw new Error("Apenas staff pode assumir este ticket.");
  if (t.assigneeId && t.assigneeId !== by.id) throw new Error("Ticket já foi assumido por outro staff.");
  patchTicket(t.id, { assigneeId: by.id });
  await channel.send({
    content: `${em("seguranca")} **Ticket assumido** por <@${by.id}>`,
  }).catch(() => null);
  await logTicket(guild, {
    title: "Ticket assumido",
    description: `Ticket **${t.id}** assumido por <@${by.id}> em <#${channel.id}>.`,
  });
}

export async function renameTicket(opts: { guild: Guild; channel: TextChannel; by: User; newName: string }) {
  const { guild, channel, by, newName } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t || t.status !== "OPEN") throw new Error("Ticket não encontrado/aberto.");
  const safeName = newName.toLowerCase().replace(/[^a-z0-9\-]/g, "-").replace(/-+/g, "-").slice(0, 90);
  await channel.setName(safeName).catch(() => null);
  patchTicket(t.id, { title: newName });
  await logTicket(guild, {
    title: "Ticket renomeado",
    description: `Ticket **${t.id}** renomeado para \`${safeName}\` por <@${by.id}>.`,
  });
}

export async function addMemberToTicket(opts: {
  guild: Guild;
  channel: TextChannel;
  addedBy: User;
  userId: string;
}) {
  const { guild, channel, addedBy, userId } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t) throw new Error("Ticket não encontrado.");

  const addedMemberIds = Array.from(new Set([...(t.addedMemberIds ?? []), userId]));
  patchTicket(t.id, { addedMemberIds });

  await channel.permissionOverwrites.edit(userId, {
    ViewChannel: true,
    SendMessages: true,
    ReadMessageHistory: true,
    AttachFiles: true,
    EmbedLinks: true,
  });
}

export async function removeMemberFromTicket(opts: {
  guild: Guild;
  channel: TextChannel;
  removedBy: User;
  userId: string;
}) {
  const { guild, channel, removedBy, userId } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t) throw new Error("Ticket não encontrado.");

  const addedMemberIds = (t.addedMemberIds ?? []).filter((id) => id !== userId);
  patchTicket(t.id, { addedMemberIds });

  await channel.permissionOverwrites.delete(userId).catch(() => null);
}

export async function leaveTicket(opts: { guild: Guild; channel: TextChannel; member: GuildMember }) {
  const { guild, channel, member } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t) throw new Error("Ticket não encontrado.");

  if (member.id === t.userId) throw new Error("O criador do ticket não pode sair.");

  if (!(t.addedMemberIds ?? []).includes(member.id)) {
    throw new Error("Você não está na lista de membros adicionados.");
  }

  const addedMemberIds = (t.addedMemberIds ?? []).filter((id) => id !== member.id);
  patchTicket(t.id, { addedMemberIds });

  await channel.permissionOverwrites.delete(member.id).catch(() => null);

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setDescription(`👋 <@${member.id}> saiu do ticket.`)
        .setColor(0xffa500)
        .setTimestamp(),
    ],
  }).catch(() => null);
}

export async function notifyStaff(opts: {
  guild: Guild;
  channel: TextChannel;
  by: User;
}) {
  const { guild, channel, by } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t) throw new Error("Ticket não encontrado.");

  if (t.assigneeId) {
    await channel.send({
      content: `${em("bell")} <@${t.assigneeId}> você foi chamado por <@${by.id}>!`,
    }).catch(() => null);
  } else {
    const typeCfg = findType(guild.id, t.typeId);
    const mentions = (typeCfg?.staffRoleIds ?? []).map((r) => `<@&${r}>`).join(" ");
    if (mentions) {
      await channel.send({
        content: `${em("bell")} ${mentions} — <@${by.id}> precisa de atenção neste ticket!`,
      }).catch(() => null);
    } else {
      await channel.send({
        content: `${em("bell")} <@${by.id}> está solicitando atenção da staff.`,
      }).catch(() => null);
    }
  }
}

export async function notifyUser(opts: {
  guild: Guild;
  channel: TextChannel;
  by: User;
}) {
  const { guild, channel, by } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t) throw new Error("Ticket não encontrado.");

  await channel.send({
    content: `${em("bell")} <@${t.userId}> — <@${by.id}> está chamando você neste ticket!`,
  }).catch(() => null);
}

export async function createTicketCall(opts: { guild: Guild; channel: TextChannel; by: User }) {
  const { guild, channel, by } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t) throw new Error("Ticket não encontrado.");

  if (t.voiceChannelId) {
    const existing = await guild.channels.fetch(t.voiceChannelId).catch(() => null);
    if (existing) throw new Error("Já existe uma call para este ticket.");
    patchTicket(t.id, { voiceChannelId: null });
  }

  const textCh = channel;
  const vc = await guild.channels.create({
    name: `call-${textCh.name}`.slice(0, 90),
    type: ChannelType.GuildVoice,
    parent: textCh.parentId ?? undefined,
    permissionOverwrites: textCh.permissionOverwrites.cache.map((o) => ({
      id: o.id,
      allow: o.allow,
      deny: o.deny,
    })),
    reason: `Call do ticket ${t.id}`,
  });

  patchTicket(t.id, { voiceChannelId: vc.id });

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`${em("voicecsuccess")} Call criada`)
        .setDescription(`Acesse: <#${vc.id}>\nCriada por <@${by.id}>`)
        .setColor(0x57f287)
        .setTimestamp(),
    ],
  }).catch(() => null);

  await logTicket(guild, {
    title: "Call criada",
    description: `Call <#${vc.id}> criada para o ticket **${t.id}** por <@${by.id}>.`,
  });

  return vc;
}

export async function deleteTicketCall(opts: { guild: Guild; channel: TextChannel; by: User }) {
  const { guild, channel, by } = opts;
  const t = getTicketByChannel(guild.id, channel.id);
  if (!t) throw new Error("Ticket não encontrado.");
  if (!t.voiceChannelId) throw new Error("Nenhuma call ativa para este ticket.");

  const vc = await guild.channels.fetch(t.voiceChannelId).catch(() => null);
  if (vc) await vc.delete("Call do ticket deletada").catch(() => null);
  patchTicket(t.id, { voiceChannelId: null });

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setTitle(`${em("voicecdanger")} Call encerrada`)
        .setDescription(`Encerrada por <@${by.id}>`)
        .setColor(0xed4245)
        .setTimestamp(),
    ],
  }).catch(() => null);

  await logTicket(guild, {
    title: "Call encerrada",
    description: `Call do ticket **${t.id}** encerrada por <@${by.id}>.`,
  });
}

async function buildTranscript(channel: TextChannel): Promise<string> {
  const lines: string[] = [];
  lines.push(`# Transcript: #${channel.name}`);
  lines.push(`Canal: ${channel.id}`);
  lines.push(`Gerado em: ${new Date().toISOString()}`);
  lines.push(``);

  let lastId: string | undefined = undefined;
  let fetched = 0;
  while (fetched < 300) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId }).catch(() => null);
    if (!batch || batch.size === 0) break;
    const arr = [...batch.values()];
    lastId = arr[arr.length - 1]?.id;
    fetched += arr.length;
    arr.reverse().forEach((m) => {
      const ts = new Date(m.createdTimestamp).toISOString();
      const author = `${m.author.tag}`;
      const content = (m.content || "").replace(/\n/g, " ");
      const attachments = m.attachments.size
        ? ` [anexos: ${[...m.attachments.values()].map((a) => a.url).join(", ")}]`
        : "";
      lines.push(`[${ts}] ${author}: ${content}${attachments}`.trim());
    });
  }
  return lines.join("\n");
}

function persistTranscript(guildId: string, tid: string, content: string) {
  const dir = path.join(process.cwd(), "data", "transcripts", guildId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `ticket-${tid}.md`);
  fs.writeFileSync(file, content, "utf8");
  return file;
}

async function sendTranscript(guild: Guild, tid: string, transcriptPath: string) {
  const s = getGuildSettings(guild.id);
  const chId = s.ticket.transcriptChannelId || s.ticket.logsChannelId;
  if (!chId) return;
  const ch = await guild.channels.fetch(chId).catch(() => null);
  if (!ch || !ch.isTextBased()) return;
  const file = new AttachmentBuilder(transcriptPath);
  await (ch as any).send({
    content: `${em("attach")} Transcript do ticket **${tid}**`,
    files: [file],
  }).catch(() => null);
}
