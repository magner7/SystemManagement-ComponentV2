import type { Client } from "discord.js";
import { ChannelType, EmbedBuilder } from "discord.js";
import { getGuildSettings } from "./store";
import { listTickets, patchTicket } from "./ticketStore";
import { em } from "./emoji";
import { closeTicket } from "./tickets";

export async function runTicketScheduler(client: Client) {
  for (const guild of client.guilds.cache.values()) {
    const s = getGuildSettings(guild.id);
    if (!s.ticket.enabled) continue;

    const globalHours = s.ticket.inactivityCloseHours || 0;
    const reminderMin = s.ticket.reminderMinutes || 0;

    const open = listTickets(guild.id, { status: "OPEN" });
    for (const t of open) {
      const typeCfg = s.ticket.types.find((x) => x.id === t.typeId);
      const hours = (typeCfg?.autoCloseHours || 0) > 0 ? (typeCfg!.autoCloseHours) : globalHours;
      if (!hours || hours <= 0) continue;

      const now = Date.now();
      const closeAt = t.lastActivityAt + hours * 60 * 60 * 1000;

      if (reminderMin > 0 && now < closeAt) {
        const remindAt = closeAt - reminderMin * 60 * 1000;
        const already = t.reminderSentAt && t.reminderSentAt >= remindAt;
        if (!already && now >= remindAt) {
          const ch = await guild.channels.fetch(t.channelId).catch(() => null);
          if (ch && ch.type === ChannelType.GuildText && ch.isTextBased()) {
            await (ch as any).send({
              embeds: [
                new EmbedBuilder()
                  .setTitle(`${em("clock")} Inatividade detectada`.trim())
                  .setDescription(
                    `Sem atividade recente. Este ticket será fechado automaticamente em **${reminderMin} min** se ninguém responder.`,
                  ),
              ],
            }).catch(() => null);
            patchTicket(t.id, { reminderSentAt: now });
          }
        }
      }

      if (now >= closeAt) {
        const ch = await guild.channels.fetch(t.channelId).catch(() => null);
        if (!ch || !ch.isTextBased() || ch.type !== ChannelType.GuildText) continue;
        const user = await client.users.fetch(t.userId).catch(() => null);
        await closeTicket({
          client,
          guild,
          channel: ch as any,
          closedBy: user ?? client.user!,
          reason: "Auto-fechado por inatividade",
        }).catch(() => null);
      }
    }
  }
}
