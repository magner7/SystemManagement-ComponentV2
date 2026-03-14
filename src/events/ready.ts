import type { Client } from "discord.js";
import { info } from "../lib/logger";

export async function onReady(client: Client) {
  info(`Bot online: ${client.user.tag}`);
}