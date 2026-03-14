import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
  parseEmoji,
} from "discord.js";
import { getGuildSettings } from "../lib/store";
import { em } from "../lib/emoji";
import type { ViewPayload } from "./common";

function setEmoji(btn: ButtonBuilder, key: string) {
  const parsed = parseEmoji(em(key) || "");
  if (parsed?.id) btn.setEmoji({ id: parsed.id, name: parsed.name ?? undefined, animated: parsed.animated ?? false });
}

function title(s: string) {
  return `### ${s}`;
}

export async function buildTicketConfigView(guildId: string): Promise<ViewPayload> {
  const s = await getGuildSettings(guildId);
  const t = s.ticket;

  const typesLine = t.types?.length
    ? t.types
        .slice(0, 8)
        .map(
          (x) =>
            `• \`${x.id}\` ${x.emoji ?? em("textc")} **${x.name}**${x.description ? ` — ${x.description}` : ""} | staff: ${x.staffRoleIds.length ? x.staffRoleIds.map((r) => `<@&${r}>`).join(", ") : "(não definido)"}`,
        )
        .join("\n")
    : `${em("warning")} Nenhum tipo configurado.`;

  const info =
    `${em("logs")} Logs: ${t.logsChannelId ? `<#${t.logsChannelId}>` : "**não definido**"}   |   ` +
    `${em("upload")} Painel: ${t.panelChannelId ? `<#${t.panelChannelId}>` : "**não definido**"}   |   ` +
    `${em("attach")} Transcripts: ${t.transcriptChannelId ? `<#${t.transcriptChannelId}>` : "(usa logs)"}\n` +
    `${em("user")} Marcar staff ao abrir: **${t.mentionOnOpen ? "Sim" : "Não"}**\n` +
    `${em("textc")} Título do painel: **${t.panelTitle || "(padrão)"}**\n` +
    `${em("textc")} Emoji do painel: **${t.panelEmoji || em("textc")}**\n` +
    `${em("clock")} Limites: máx. abertos/usuário **${t.maxOpenPerUser || 0}** | auto-fechar **${t.inactivityCloseHours || 0}h**\n` +
    `${em("role")} Trava de fechamento: **${t.lockToAssignee ? "Ativada" : "Desativada"}**`;

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("nav:home").setLabel("Voltar").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("nav:refresh:ticket").setLabel("Atualizar").setStyle(ButtonStyle.Secondary),
  );
  setEmoji(nav.components[0], "left");
  setEmoji(nav.components[1], "refresh");

  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:logs").setLabel("Canal de Logs").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:panel").setLabel("Canal do Painel").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:transcripts").setLabel("Transcripts").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:mention").setLabel("Marcar staff").setStyle(t.mentionOnOpen ? ButtonStyle.Success : ButtonStyle.Secondary),
  );
  setEmoji(row1.components[0], "logs");
  setEmoji(row1.components[1], "upload");
  setEmoji(row1.components[2], "attach");
  setEmoji(row1.components[3], "user");

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:panelTitle").setLabel("Título do Painel").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:panelEmoji").setLabel("Emoji do Painel").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:panelDesc").setLabel("Descrição do Painel").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:publish").setLabel("Publicar Painel").setStyle(ButtonStyle.Success),
  );
  setEmoji(row2.components[0], "textc");
  setEmoji(row2.components[1], "textc");
  setEmoji(row2.components[2], "textc");
  setEmoji(row2.components[3], "upload");

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket:openReason").setLabel("Motivo ao abrir").setStyle(t.requireOpenReason ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:closeReason").setLabel("Motivo ao fechar").setStyle(t.requireCloseReason ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:auto").setLabel("Limites / automação").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:roles").setLabel("Cargos imunes / trava").setStyle(t.lockToAssignee ? ButtonStyle.Success : ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("ticket:types").setLabel("Gerenciar tipos").setStyle(ButtonStyle.Primary),
  );
  setEmoji(row3.components[0], "textc");
  setEmoji(row3.components[1], "textc");
  setEmoji(row3.components[2], "clock");
  setEmoji(row3.components[3], "role");
  setEmoji(row3.components[4], "fields");

  const box = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(title(`${em("textc")} Configurações de Ticket`)).setId(1),
      new TextDisplayBuilder().setContent(`${em("info")} Configure o sistema de tickets completo pelo painel.\n\n${info}`).setId(2),
      new TextDisplayBuilder().setContent(`${title(`${em("fields")} Tipos de Ticket`)}\n${typesLine}`).setId(3),
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(1))
    .addActionRowComponents(nav)
    .addActionRowComponents(row1)
    .addActionRowComponents(row2)
    .addActionRowComponents(row3);

  return { componentsV2: true, components: [box as any] } as any;
}
