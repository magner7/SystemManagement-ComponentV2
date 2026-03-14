import type { Client, Message } from "discord.js";
import { ChannelType } from "discord.js";
import { setTicketActivity } from "../lib/tickets";

export async function onMessageCreate(client: Client, msg: Message) {
  if (!msg.guildId) return;
  if (msg.author.bot) return;
  if (!msg.channel || msg.channel.type !== ChannelType.GuildText) return;

  setTicketActivity(msg.guildId, msg.channel.id).catch(() => null);
}
