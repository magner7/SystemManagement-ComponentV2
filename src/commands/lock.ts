import {
  ChatInputCommandInteraction,
  MessageFlags,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextChannel,
  ChannelType,
  NewsChannel,
} from "discord.js";
import { em } from "../lib/emoji";

export const data = new SlashCommandBuilder()
  .setName("lock")
  .setDescription("Tranca um canal — membros não poderão enviar mensagens.")
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
  .addChannelOption((o) =>
    o
      .setName("canal")
      .setDescription("Canal a trancar (padrão: canal atual)")
      .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
      .setRequired(false),
  )
  .addStringOption((o) =>
    o
      .setName("motivo")
      .setDescription("Motivo do bloqueio (opcional)")
      .setRequired(false)
      .setMaxLength(300),
  );

export async function execute(i: ChatInputCommandInteraction) {
  if (!i.guild || !i.inCachedGuild()) {
    return i.reply({ flags: MessageFlags.Ephemeral, content: `${em("warning")} Comando disponível apenas em servidores.` });
  }

  const targetChannel = (i.options.getChannel("canal") ?? i.channel) as TextChannel | NewsChannel;
  const reason = i.options.getString("motivo") ?? "Sem motivo informado";

  if (
    !targetChannel ||
    (targetChannel.type !== ChannelType.GuildText && targetChannel.type !== ChannelType.GuildAnnouncement)
  ) {
    return i.reply({ flags: MessageFlags.Ephemeral, content: `${em("warning")} Canal inválido ou não suportado.` });
  }

  const botMember = i.guild.members.me;
  if (!botMember?.permissions.has(PermissionFlagsBits.ManageChannels)) {
    return i.reply({ flags: MessageFlags.Ephemeral, content: `${em("danger")} Não tenho permissão para gerenciar canais.` });
  }

  if (!botMember.permissions.has(PermissionFlagsBits.Administrator)) {
    const botPermsInChannel = targetChannel.permissionsFor(botMember);
    if (!botPermsInChannel?.has(PermissionFlagsBits.ManageChannels)) {
      return i.reply({
        ephemeral: true,
        content: `${em("danger")} Não tenho permissão para gerenciar ${targetChannel}.`,
      });
    }
  }

  const everyoneRole = i.guild.roles.everyone;
  const existingOverwrite = targetChannel.permissionOverwrites.cache.get(everyoneRole.id);
  const alreadyLocked = existingOverwrite?.deny.has(PermissionFlagsBits.SendMessages);

  if (alreadyLocked) {
    return i.reply({
      ephemeral: true,
      content: `${em("warning")} ${targetChannel} já está trancado.`,
    });
  }

  await i.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    await targetChannel.permissionOverwrites.edit(
      everyoneRole,
      {
        SendMessages: false,
        SendMessagesInThreads: false,
        AddReactions: false,
        CreatePublicThreads: false,
        CreatePrivateThreads: false,
      },
      { reason: `[Lock] ${i.user.tag} — ${reason}` },
    );

    const embed = new EmbedBuilder()
      .setColor(0xed4245 as any)
      .setTitle(`${em("lock")} Canal Trancado`)
      .setDescription(
        `Este canal foi **trancado** por <@${i.user.id}>.\n\n` +
        `${em("info")} **Motivo:** ${reason}`,
      )
      .addFields(
        { name: `${em("user")} Responsável`, value: `<@${i.user.id}>`, inline: true },
        { name: `${em("clock")} Horário`, value: `<t:${Math.floor(Date.now() / 1000)}:f>`, inline: true },
      )
      .setTimestamp()
      .setFooter({ text: `ID: ${i.user.id}` });

    await targetChannel.send({ embeds: [embed] }).catch(() => null);

    return i.editReply({
      content: `${em("success")} Canal ${targetChannel} trancado com sucesso!\n-# Motivo: ${reason}`,
    });
  } catch (err: any) {
    return i.editReply({
      content: `${em("danger")} Erro ao trancar canal: ${err?.message ?? "Desconhecido"}`,
    });
  }
}
