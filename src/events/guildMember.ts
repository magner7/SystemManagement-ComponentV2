import type { Client, GuildMember, PartialGuildMember } from "discord.js";
import { sendWelcomeMessage, sendLeaveMessage } from "../lib/welcome";
import { info } from "../lib/logger";

export function onGuildMemberAdd(member: GuildMember) {
  info(`[welcome] ${member.user.tag} entrou em ${member.guild.name}`);
  sendWelcomeMessage(member).catch((e) =>
    info(`[welcome] Erro ao enviar join: ${e?.message ?? e}`),
  );
}

export function onGuildMemberRemove(
  member: GuildMember | PartialGuildMember,
  client: Client,
) {
  const user = member.user;
  const guild = member.guild;
  if (!user || !guild) return;

  info(`[welcome] ${user.tag ?? user.id} saiu de ${guild.name}`);
  sendLeaveMessage(user as any, guild as any, client).catch((e) =>
    info(`[welcome] Erro ao enviar leave: ${e?.message ?? e}`),
  );
}
