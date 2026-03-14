import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  SeparatorSpacingSize,
  TextDisplayBuilder,
  parseEmoji,
} from "discord.js";
import { getGuildSettings } from "../lib/store";
import { em } from "../lib/emoji";
import type { ViewPayload } from "./common";

function se(btn: ButtonBuilder, key: string) {
  const raw = em(key) || "";
  const parsed = raw ? parseEmoji(raw) : null;
  if (parsed?.id) {
    btn.setEmoji({ id: parsed.id, name: parsed.name ?? undefined, animated: parsed.animated ?? false });
  }
}

function bold(s: string) {
  return `**${s}**`;
}

function statusDot(on: boolean) {
  return on ? em("online") : em("dnd");
}

export function buildPainelView(guildId: string): ViewPayload {
  const s = getGuildSettings(guildId);
  const w = s.welcome;

  const ticketTypes = s.ticket.types?.length ?? 0;
  const logsConfigured = !!s.ticket.logsChannelId;
  const panelConfigured = !!s.ticket.panelChannelId;
  const transcriptConfigured = !!s.ticket.transcriptChannelId;

  const headerContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          `# ${em("home")} Painel de Gerenciamento\n` +
          `-# ${em("info")} Este painel está focado apenas nos módulos de Tickets e Boas-vindas.`,
        )
        .setId(1),
    );

  const statusContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`### ${em("status")} Visão Geral`)
        .setId(10),
      new TextDisplayBuilder()
        .setContent(
          `${em("ftvline")} ${em("textc")} **Tickets**\n` +
          `${em("ftvline")} ${em("fthline")} Status: ${statusDot(s.ticket.enabled)} ${s.ticket.enabled ? bold("Ativo") : bold("Inativo")}\n` +
          `${em("ftvline")} ${em("fthline")} Tipos configurados: ${bold(String(ticketTypes))}\n` +
          `${em("ftvline")} ${em("fthline")} Canal do painel: ${panelConfigured ? em("success") + " Configurado" : em("cancel") + " Não configurado"}\n` +
          `${em("ftvline")} ${em("fthline")} Canal de logs: ${logsConfigured ? em("success") + " Configurado" : em("cancel") + " Não configurado"}\n` +
          `${em("ftvline")} ${em("ftendbranch")} Transcripts: ${transcriptConfigured ? em("success") + " Configurado" : em("cancel") + " Não configurado"}`,
        )
        .setId(11),
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small))
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(
          `${em("ftendbranch")} ${em("celebration")} **Boas-vindas**\n` +
          `${em("fthline")} Status: ${statusDot(w.enabled)} ${w.enabled ? bold("Ativo") : bold("Inativo")}\n` +
          `${em("fthline")} Canal entrada: ${w.joinChannelId ? `<#${w.joinChannelId}>` : em("cancel") + " Não configurado"}\n` +
          `${em("fthline")} Canal saída: ${w.leaveChannelId ? `<#${w.leaveChannelId}>` : em("cancel") + " Não configurado"}\n` +
          `${em("fthline")} Banner: ${w.bannerUrl ? em("success") + " Configurado" : em("cancel") + " Não definido"}\n` +
          `${em("ftendbranch")} Auto-cargo: ${w.autoRoleIds.length ? bold(String(w.autoRoleIds.length) + " cargo(s)") : em("cancel") + " Nenhum"}`,
        )
        .setId(12),
    );

  const navContainer = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder()
        .setContent(`### ${em("lightning")} Navegação\n-# Selecione um dos módulos disponíveis.`)
        .setId(20),
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("nav:refresh:painel")
      .setLabel("Atualizar")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("painel:ticket")
      .setLabel("Tickets")
      .setStyle(s.ticket.enabled ? ButtonStyle.Primary : ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("painel:welcome")
      .setLabel("Boas-vindas")
      .setStyle(w.enabled ? ButtonStyle.Primary : ButtonStyle.Secondary),
  );
  se(row1.components[0], "refresh");
  se(row1.components[1], "textc");
  se(row1.components[2], "celebration");

  navContainer.addActionRowComponents(row1);

  return {
    componentsV2: true,
    components: [headerContainer as any, statusContainer as any, navContainer as any],
  } as any;
}
