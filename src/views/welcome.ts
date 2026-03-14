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
  if (parsed?.id)
    btn.setEmoji({ id: parsed.id, name: parsed.name ?? undefined, animated: parsed.animated ?? false });
}

function onOff(v: boolean) { return v ? `${em("success")} Sim` : `${em("cancel")} Não`; }
function chan(id: string | null) { return id ? `<#${id}>` : `${em("cancel")} N/D`; }
function trunc(s: string, n = 40) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }
function dot(v: boolean) { return v ? em("online") : em("dnd"); }

export function buildWelcomeView(guildId: string): ViewPayload {
  const s = getGuildSettings(guildId);
  const w = s.welcome;
  const cardEnabled = (w as any).cardEnabled ?? false;

  const info = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${em("celebration")} Boas-vindas\n` +
        `${dot(w.enabled)} **Sistema:** ${w.enabled ? "Ativo" : "Inativo"}` +
        ` · ${em("announcementc")} Entrada: ${chan(w.joinChannelId)}` +
        ` · Saída: ${chan(w.leaveChannelId)}\n` +
        `${em("role")} Auto-cargo: ${w.autoRoleIds.length ? `${w.autoRoleIds.map(r => `<@&${r}>`).join(", ")}` : "Nenhum"}` +
        ` · ${em("send")} DM: ${onOff(w.sendDm)}\n` +
        `${em("image")} Banner: ${w.showBanner ? onOff(!!w.bannerUrl) : `${em("cancel")} Oculto`}` +
        ` · ${em("user")} Avatar: ${onOff(w.showAvatar)}` +
        ` · ${em("fields")} ID: ${onOff((w as any).showUserId ?? true)}` +
        ` · ${em("clock")} Data: ${onOff((w as any).showCreatedAt ?? true)}\n` +
        `${em("message")} Título: \`${trunc(w.joinTitle)}\`` +
        ` · Msg: \`${trunc(w.joinMessage)}\`\n` +
        `${dot(cardEnabled)} **Card Canvas:** ${cardEnabled ? "Ativo" : "Inativo"}` +
        ` · Fundo: \`${(w as any).cardBgImageUrl ? "Imagem" : ((w as any).cardBgColor ?? "#1a1a2e")}\``,
      ).setId(1),
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const r1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("nav:home").setLabel("Voltar").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("nav:refresh:welcome").setLabel("Atualizar").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:toggle").setLabel(w.enabled ? "Desativar" : "Ativar").setStyle(w.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId("welcome:test").setLabel("Testar").setStyle(ButtonStyle.Primary),
  );
  se(r1.components[0], "left"); se(r1.components[1], "refresh");
  se(r1.components[2], w.enabled ? "cancel" : "check"); se(r1.components[3], "play");

  const r2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("welcome:setJoinChannel").setLabel("Canal Entrada").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:setLeaveChannel").setLabel("Canal Saída").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:setAutoRole").setLabel("Auto-cargo").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:toggleDm").setLabel(w.sendDm ? "Desativar DM" : "Ativar DM").setStyle(w.sendDm ? ButtonStyle.Danger : ButtonStyle.Success),
  );
  se(r2.components[0], "announcementc"); se(r2.components[1], "announcementc");
  se(r2.components[2], "role"); se(r2.components[3], w.sendDm ? "cancel" : "send");

  const r3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("welcome:editTitles").setLabel("Títulos").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:editJoinMsg").setLabel("Msg Entrada").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:editLeaveMsg").setLabel("Msg Saída").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:editDmMsg").setLabel("Msg DM").setStyle(ButtonStyle.Secondary),
  );
  se(r3.components[0], "wand"); se(r3.components[1], "message");
  se(r3.components[2], "message"); se(r3.components[3], "send");

  const r4 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("welcome:editBanner").setLabel("Banner Entrada").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:editLeaveBanner").setLabel("Banner Saída").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:toggleBanner").setLabel(w.showBanner ? "Ocultar Banner" : "Mostrar Banner").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:toggleAvatar").setLabel(w.showAvatar ? "Ocultar Avatar" : "Mostrar Avatar").setStyle(ButtonStyle.Secondary),
  );
  se(r4.components[0], "image"); se(r4.components[1], "image");
  se(r4.components[2], "image"); se(r4.components[3], "user");

  info.addActionRowComponents(r1).addActionRowComponents(r2).addActionRowComponents(r3).addActionRowComponents(r4);

  const card = new ContainerBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `### ${em("wand")} Card de Boas-vindas (Canvas)\n` +
        `${dot(cardEnabled)} **Status:** ${cardEnabled ? "Ativo" : "Inativo"}` +
        ` · ${em("image")} Fundo: \`${(w as any).cardBgImageUrl ? "Imagem URL" : ((w as any).cardBgColor ?? "#1a1a2e")}\`\n` +
        `${em("textc")} Título: \`${trunc((w as any).cardTitle ?? "Bem-vindo(a), {username}!")}\`\n` +
        `${em("textc")} Subtítulo: \`${trunc((w as any).cardSubtitle ?? "Membro #{count} de {server}")}\`\n` +
        `${em("role")} Anel: \`${(w as any).cardAvatarBorderColor ?? "#5865f2"}\`` +
        ` · ${em("lightning")} Destaque: \`${(w as any).cardAccentColor ?? "#5865f2"}\`\n` +
        `-# Variáveis: \`{username}\` \`{server}\` \`{count}\``,
      ).setId(2),
    )
    .addSeparatorComponents(new SeparatorBuilder().setSpacing(SeparatorSpacingSize.Small));

  const r5 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("welcome:toggleCard").setLabel(cardEnabled ? "Desativar Card" : "Ativar Card").setStyle(cardEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
    new ButtonBuilder().setCustomId("welcome:cardTexts").setLabel("Textos").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:cardColors").setLabel("Cores").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:cardBgImage").setLabel("Fundo").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("welcome:cardTest").setLabel("Testar Card").setStyle(ButtonStyle.Primary),
  );
  se(r5.components[0], cardEnabled ? "cancel" : "wand");
  se(r5.components[1], "textc"); se(r5.components[2], "image");
  se(r5.components[3], "upload"); se(r5.components[4], "play");

  const r6 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("welcome:toggleDetails").setLabel("Detalhes do Perfil").setStyle(ButtonStyle.Secondary),
  );
  se(r6.components[0], "fields");

  card.addActionRowComponents(r5).addActionRowComponents(r6);

  return {
    componentsV2: true,
    components: [info as any, card as any],
  } as any;
}
