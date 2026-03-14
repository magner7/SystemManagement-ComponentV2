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

function se(btn: ButtonBuilder, key: string) {
  const parsed = parseEmoji(em(key) || "");
  if (parsed?.id) btn.setEmoji({ id: parsed.id, name: parsed.name ?? undefined, animated: parsed.animated ?? false });
}

export function buildGeraisView(guildId: string): ViewPayload {
  const s = getGuildSettings(guildId);

  const nav = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("nav:home").setLabel("Voltar").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("nav:refresh:gerais").setLabel("Atualizar").setStyle(ButtonStyle.Secondary),
  );
  se(nav.components[0], "left");
  se(nav.components[1], "refresh");

  const toggles = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("toggle:ticket")
      .setLabel(s.ticket.enabled ? "Desativar tickets" : "Ativar tickets")
      .setStyle(s.ticket.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
  );
  se(toggles.components[0], "textc");

  const box = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${em("settings")} Configurações Gerais`).setId(1),
      new TextDisplayBuilder().setContent(
        `${em("info")} Ative ou desative os módulos do bot.\n\n` +
        `> ${em("textc")} Tickets: **${s.ticket.enabled ? "Ativado" : "Desativado"}**`,
      ).setId(2),
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(1))
    .addActionRowComponents(nav)
    .addActionRowComponents(toggles);

  return { componentsV2: true, components: [box as any] } as any;
}
