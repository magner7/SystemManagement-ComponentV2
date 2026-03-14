import { SlashCommandBuilder, type ChatInputCommandInteraction, PermissionFlagsBits } from "discord.js";
import { buildPainelView } from "../views/painel";
import { safeReply } from "../views/common";

export const data = new SlashCommandBuilder()
  .setName("painel")
  .setDescription("Abre o painel de gerenciamento")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

export async function execute(interaction: ChatInputCommandInteraction) {
  const guildId = interaction.guildId;
  if (!guildId) return safeReply(interaction, { content: "Esse comando só funciona em servidor.", ephemeral: true });
  const view = await buildPainelView(guildId);
  await safeReply(interaction, view);
}
