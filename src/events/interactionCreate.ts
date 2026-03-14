import {
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
  ChatInputCommandInteraction,
  Events,
  Interaction,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  TextChannel,
  TextInputBuilder,
  TextInputStyle,
  UserSelectMenuBuilder,
} from "discord.js";

import * as painelCmd from "../commands/painel";
import { getGuildSettings, setGuildSettings } from "../lib/store";
import { em } from "../lib/emoji";
import {
  createTicketChannel,
  closeTicket,
  deleteTicketChannel,
  claimTicket,
  addMemberToTicket,
  removeMemberFromTicket,
  leaveTicket,
  notifyStaff,
  notifyUser,
  createTicketCall,
  deleteTicketCall,
  renameTicket,
  isStaffMemberForTicket,
} from "../lib/tickets";
import { getTicketByChannel } from "../lib/ticketStore";
import { buildPainelView } from "../views/painel";
import { buildGeraisView } from "../views/gerais";
import { buildTicketConfigView } from "../views/ticket";
import { buildWelcomeView } from "../views/welcome";
import { buildTicketTypeSelect, buildTicketMemberPanel, buildTicketStaffPanel } from "../views/ticketRuntime";
import { safeReply, safeUpdate, type ViewPayload } from "../views/common";
import { sendWelcomeMessage } from "../lib/welcome";

type ViewKey = "painel" | "gerais" | "ticket" | "welcome";

async function viewFor(guildId: string, key: ViewKey): Promise<ViewPayload> {
  if (key === "painel") return buildPainelView(guildId);
  if (key === "gerais") return buildGeraisView(guildId);
  if (key === "ticket") return buildTicketConfigView(guildId);
  return buildWelcomeView(guildId);
}

async function refresh(i: any, key: ViewKey = "painel") {
  const guildId = i.guildId;
  if (!guildId) return;
  const payload = await viewFor(guildId, key);
  await safeUpdate(i, payload);
}

function modalOne(customId: string, title: string, fieldId: string, label: string, value = "", paragraph = false, required = true) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(
      new TextInputBuilder()
        .setCustomId(fieldId)
        .setLabel(label)
        .setStyle(paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short)
        .setRequired(required)
        .setValue(value.slice(0, 4000)),
    ),
  );
  return modal;
}

export async function onInteractionCreate(i: Interaction) {
  try {
    if (i.isChatInputCommand()) {
      const n = i.commandName;
      if (n === painelCmd.data.name) return painelCmd.execute(i as ChatInputCommandInteraction);
      return;
    }

    if (i.isButton()) {
      const guildId = i.guildId;
      if (!guildId) return;
      const parts = i.customId.split(":");
      const a = parts[0];
      const b = parts[1];

      if (a === "nav" && b === "home") return refresh(i, "painel");
      if (a === "nav" && b === "refresh") {
        const key = (parts[2] as ViewKey | undefined) ?? "painel";
        if (["painel", "gerais", "ticket", "welcome"].includes(key)) {
          return refresh(i, key as ViewKey);
        }
        return refresh(i, "painel");
      }

      if (a === "painel" && b === "ticket") return refresh(i, "ticket");
      if (a === "painel" && b === "welcome") return refresh(i, "welcome");
      if (a === "painel" && b === "geral") return refresh(i, "gerais");

      const s = getGuildSettings(guildId);

      if (a === "toggle" && b === "ticket") {
        setGuildSettings(guildId, { ticket: { enabled: !s.ticket.enabled } as any });
        return refresh(i, "gerais");
      }

      if (a === "ticket") {
        if (b === "mention") {
          setGuildSettings(guildId, { ticket: { mentionOnOpen: !s.ticket.mentionOnOpen } as any });
          return refresh(i, "ticket");
        }
        if (b === "openReason") {
          setGuildSettings(guildId, { ticket: { requireOpenReason: !s.ticket.requireOpenReason } as any });
          return refresh(i, "ticket");
        }
        if (b === "closeReason") {
          setGuildSettings(guildId, { ticket: { requireCloseReason: !s.ticket.requireCloseReason } as any });
          return refresh(i, "ticket");
        }
        if (b === "logs" || b === "panel" || b === "transcripts") {
          const menu = new ChannelSelectMenuBuilder()
            .setCustomId(`ticket:setChannel:${b}`)
            .setPlaceholder("Selecione um canal")
            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
          return safeReply(i, {
            ephemeral: true,
            content: `${em("info")} Selecione o canal para ${b}.`,
            components: [new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(menu)],
          });
        }
        if (b === "roles") {
          const menu = new RoleSelectMenuBuilder()
            .setCustomId("ticket:setImmuneRoles")
            .setPlaceholder("Selecione cargos imunes");
          return safeReply(i, {
            ephemeral: true,
            content: `${em("info")} Selecione os cargos imunes do sistema de ticket.`,
            components: [new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(menu)],
          });
        }
        if (b === "panelTitle") {
          return i.showModal(modalOne("ticket:savePanelTitle", "Título do painel", "value", "Título", s.ticket.panelTitle || "Painel de Tickets"));
        }
        if (b === "panelEmoji") {
          return i.showModal(modalOne("ticket:savePanelEmoji", "Emoji do painel", "value", "Emoji", s.ticket.panelEmoji || "🎫"));
        }
        if (b === "panelDesc") {
          return i.showModal(modalOne("ticket:savePanelDesc", "Descrição do painel", "value", "Descrição", s.ticket.panelDescription || "", true));
        }
        if (b === "publish") {
          if (!s.ticket.panelChannelId) {
            return safeReply(i, { ephemeral: true, content: `${em("warning")} Defina primeiro o canal do painel.` });
          }
          const ch = await i.guild!.channels.fetch(s.ticket.panelChannelId).catch(() => null);
          if (!ch || !ch.isTextBased()) {
            return safeReply(i, { ephemeral: true, content: `${em("warning")} Canal do painel inválido.` });
          }
          await (ch as TextChannel).send({
            content: `${s.ticket.panelEmoji || "🎫"} **${s.ticket.panelTitle || "Painel de Tickets"}**\n${s.ticket.panelDescription || "Selecione um tipo abaixo para abrir um ticket."}`,
            components: [buildTicketTypeSelect(s.ticket.types)],
          }).catch(() => null);
          return safeReply(i, { ephemeral: true, content: `${em("success")} Painel de tickets publicado.` });
        }
        if (b === "types" || b === "auto") {
          return safeReply(i, { ephemeral: true, content: `${em("info")} Essa configuração foi ocultada nesta versão enxuta do projeto.` });
        }
      }

      if (a === "welcome") {
        if (b === "toggle") {
          setGuildSettings(guildId, { welcome: { enabled: !s.welcome.enabled } as any });
          return refresh(i, "welcome");
        }
        if (b === "toggleDm") {
          setGuildSettings(guildId, { welcome: { sendDm: !s.welcome.sendDm } as any });
          return refresh(i, "welcome");
        }
        if (b === "toggleBanner") {
          setGuildSettings(guildId, { welcome: { showBanner: !s.welcome.showBanner } as any });
          return refresh(i, "welcome");
        }
        if (b === "toggleAvatar") {
          setGuildSettings(guildId, { welcome: { showAvatar: !s.welcome.showAvatar } as any });
          return refresh(i, "welcome");
        }
        if (b === "toggleCard") {
          setGuildSettings(guildId, { welcome: { cardEnabled: !((s.welcome as any).cardEnabled ?? false) } as any });
          return refresh(i, "welcome");
        }
        if (b === "toggleDetails") {
          setGuildSettings(guildId, {
            welcome: {
              showCreatedAt: !s.welcome.showCreatedAt,
              showUserId: !s.welcome.showUserId,
              showStatus: !s.welcome.showStatus,
            } as any,
          });
          return refresh(i, "welcome");
        }
        if (b === "setJoinChannel" || b === "setLeaveChannel") {
          const menu = new ChannelSelectMenuBuilder()
            .setCustomId(`welcome:setChannel:${b}`)
            .setPlaceholder("Selecione um canal")
            .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);
          return safeReply(i, {
            ephemeral: true,
            content: `${em("info")} Selecione o canal desejado.`,
            components: [new ActionRowBuilder<ChannelSelectMenuBuilder>().addComponents(menu)],
          });
        }
        if (b === "setAutoRole") {
          const menu = new RoleSelectMenuBuilder()
            .setCustomId("welcome:setAutoRoleIds")
            .setPlaceholder("Selecione os cargos automáticos");
          return safeReply(i, {
            ephemeral: true,
            content: `${em("info")} Selecione os cargos automáticos.`,
            components: [new ActionRowBuilder<RoleSelectMenuBuilder>().addComponents(menu)],
          });
        }
        if (b === "editTitles") {
          const modal = new ModalBuilder().setCustomId("welcome:saveTitles").setTitle("Títulos de boas-vindas");
          modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder().setCustomId("joinTitle").setLabel("Título de entrada").setStyle(TextInputStyle.Short).setValue(s.welcome.joinTitle || "Bem-vindo!"),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder().setCustomId("leaveTitle").setLabel("Título de saída").setStyle(TextInputStyle.Short).setValue(s.welcome.leaveTitle || "Até logo!"),
            ),
          );
          return i.showModal(modal);
        }
        if (b === "editJoinMsg") return i.showModal(modalOne("welcome:saveJoinMsg", "Mensagem de entrada", "value", "Mensagem", s.welcome.joinMessage || "", true));
        if (b === "editLeaveMsg") return i.showModal(modalOne("welcome:saveLeaveMsg", "Mensagem de saída", "value", "Mensagem", s.welcome.leaveMessage || "", true));
        if (b === "editDmMsg") return i.showModal(modalOne("welcome:saveDmMsg", "Mensagem de DM", "value", "Mensagem", s.welcome.dmMessage || "", true));
        if (b === "editBanner") return i.showModal(modalOne("welcome:saveBanner", "Banner de entrada", "value", "URL da imagem", s.welcome.bannerUrl || ""));
        if (b === "editLeaveBanner") return i.showModal(modalOne("welcome:saveLeaveBanner", "Banner de saída", "value", "URL da imagem", s.welcome.leaveBannerUrl || ""));
        if (b === "cardTexts") {
          const modal = new ModalBuilder().setCustomId("welcome:saveCardTexts").setTitle("Textos do card");
          modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder().setCustomId("cardTitle").setLabel("Título").setStyle(TextInputStyle.Short).setValue((s.welcome as any).cardTitle ?? "Bem-vindo(a), {username}!"),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder().setCustomId("cardSubtitle").setLabel("Subtítulo").setStyle(TextInputStyle.Short).setValue((s.welcome as any).cardSubtitle ?? "Membro #{count} de {server}"),
            ),
          );
          return i.showModal(modal);
        }
        if (b === "cardColors") {
          const modal = new ModalBuilder().setCustomId("welcome:saveCardColors").setTitle("Cores do card");
          modal.addComponents(
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder().setCustomId("cardBgColor").setLabel("Cor de fundo").setStyle(TextInputStyle.Short).setValue((s.welcome as any).cardBgColor ?? "#1a1a2e"),
            ),
            new ActionRowBuilder<TextInputBuilder>().addComponents(
              new TextInputBuilder().setCustomId("cardAccentColor").setLabel("Cor de destaque").setStyle(TextInputStyle.Short).setValue((s.welcome as any).cardAccentColor ?? "#5865f2"),
            ),
          );
          return i.showModal(modal);
        }
        if (b === "cardBgImage") return i.showModal(modalOne("welcome:saveCardBgImage", "Imagem de fundo do card", "value", "URL da imagem", (s.welcome as any).cardBgImageUrl || ""));
        if (b === "test" || b === "cardTest") {
          await safeReply(i, { ephemeral: true, content: `${em("success")} Enviando teste...` });
          const member = await i.guild!.members.fetch(i.user.id).catch(() => null);
          if (member) await sendWelcomeMessage(member).catch(() => null);
          return;
        }
      }

      if (a === "ticketRT") {
        if (!i.channel || i.channel.isDMBased()) return;
        const ch = i.channel as TextChannel;
        const ticket = getTicketByChannel(guildId, ch.id);
        if (!ticket) return safeReply(i, { ephemeral: true, content: `${em("warning")} Este canal não é um ticket.` });
        const guildMember = await i.guild!.members.fetch(i.user.id).catch(() => null);
        const isStaff = isStaffMemberForTicket(guildId, ticket, guildMember);

        if (b === "leave") {
          try {
            await leaveTicket({ guild: i.guild!, channel: ch, member: guildMember! });
            return safeReply(i, { ephemeral: true, content: `${em("success")} Você saiu do ticket.` });
          } catch (e: any) {
            return safeReply(i, { ephemeral: true, content: `${em("warning")} ${e?.message ?? e}` });
          }
        }
        if (b === "memberPanel") {
          return safeReply(i, { ephemeral: true, content: `${em("info")} Painel do membro`, components: buildTicketMemberPanel() as any });
        }
        if (b === "staffPanel") {
          if (!isStaff) return safeReply(i, { ephemeral: true, content: `${em("warning")} Apenas a staff pode usar esse painel.` });
          return safeReply(i, { ephemeral: true, content: `${em("info")} Painel da staff`, components: buildTicketStaffPanel(Boolean(ticket.voiceChannelId)) as any });
        }
        if (b === "close") {
          if (!isStaff) return safeReply(i, { ephemeral: true, content: `${em("warning")} Apenas a staff pode fechar o ticket.` });
          await closeTicket({ client: i.client as any, guild: i.guild!, channel: ch, closedBy: i.user, reason: "Fechado pela staff" });
          return safeReply(i, { ephemeral: true, content: `${em("success")} Ticket fechado.` });
        }
        if (b === "delete") {
          if (!isStaff) return safeReply(i, { ephemeral: true, content: `${em("warning")} Apenas a staff pode deletar o ticket.` });
          await safeReply(i, { ephemeral: true, content: `${em("success")} Ticket deletado.` });
          await deleteTicketChannel({ guild: i.guild!, channel: ch, by: i.user });
          return;
        }
      }

      if (a === "ticketMember") {
        if (!i.channel || i.channel.isDMBased()) return;
        const ch = i.channel as TextChannel;
        const ticket = getTicketByChannel(guildId, ch.id);
        if (!ticket) return safeReply(i, { ephemeral: true, content: `${em("warning")} Este canal não é um ticket.` });

        if (b === "notifyStaff") {
          await notifyStaff({ guild: i.guild!, channel: ch, by: i.user });
          return safeReply(i, { ephemeral: true, content: `${em("success")} Staff notificada.` });
        }
        if (b === "addMember") {
          const menu = new UserSelectMenuBuilder().setCustomId("ticketMember:addSelect").setPlaceholder("Selecione um membro");
          return safeReply(i, { ephemeral: true, content: `${em("info")} Selecione um membro para adicionar.`, components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(menu)] });
        }
        if (b === "removeMember") {
          const menu = new UserSelectMenuBuilder().setCustomId("ticketMember:removeSelect").setPlaceholder("Selecione um membro");
          return safeReply(i, { ephemeral: true, content: `${em("info")} Selecione um membro para remover.`, components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(menu)] });
        }
      }

      if (a === "ticketStaff") {
        if (!i.channel || i.channel.isDMBased()) return;
        const ch = i.channel as TextChannel;
        const ticket = getTicketByChannel(guildId, ch.id);
        if (!ticket) return safeReply(i, { ephemeral: true, content: `${em("warning")} Este canal não é um ticket.` });

        const guildMember = await i.guild!.members.fetch(i.user.id).catch(() => null);
        const isStaff = isStaffMemberForTicket(guildId, ticket, guildMember);
        if (!isStaff) return safeReply(i, { ephemeral: true, content: `${em("warning")} Apenas a staff pode usar esse painel.` });

        if (b === "claim") {
          await claimTicket({ guild: i.guild!, channel: ch, by: i.user });
          return safeReply(i, { ephemeral: true, content: `${em("success")} Ticket assumido.` });
        }
        if (b === "rename") {
          return i.showModal(modalOne("ticketStaff:saveRename", "Renomear ticket", "value", "Novo nome", ticket.title || ch.name));
        }
        if (b === "notifyUser") {
          await notifyUser({ guild: i.guild!, channel: ch, by: i.user });
          return safeReply(i, { ephemeral: true, content: `${em("success")} Usuário notificado.` });
        }
        if (b === "createCall") {
          await createTicketCall({ guild: i.guild!, channel: ch, by: i.user });
          return safeReply(i, { ephemeral: true, content: `${em("success")} Call criada.` });
        }
        if (b === "deleteCall") {
          await deleteTicketCall({ guild: i.guild!, channel: ch, by: i.user });
          return safeReply(i, { ephemeral: true, content: `${em("success")} Call deletada.` });
        }
        if (b === "addMember") {
          const menu = new UserSelectMenuBuilder().setCustomId("ticketStaff:addSelect").setPlaceholder("Selecione um membro");
          return safeReply(i, { ephemeral: true, content: `${em("info")} Selecione um membro para adicionar.`, components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(menu)] });
        }
        if (b === "removeMember") {
          const menu = new UserSelectMenuBuilder().setCustomId("ticketStaff:removeSelect").setPlaceholder("Selecione um membro");
          return safeReply(i, { ephemeral: true, content: `${em("info")} Selecione um membro para remover.`, components: [new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(menu)] });
        }
      }

      return;
    }

    if (i.isStringSelectMenu()) {
      const guildId = i.guildId;
      if (!guildId) return;
      const [a, b] = i.customId.split(":");

      if (a === "ticketPUB" && b === "open") {
        const typeId = i.values[0];
        const s = getGuildSettings(guildId);
        const t = s.ticket.types.find((x) => x.id === typeId);
        if (!t) return safeReply(i, { ephemeral: true, content: `${em("warning")} Tipo inválido.` });

        const modal = new ModalBuilder().setCustomId(`ticketPUB:create:${typeId}`).setTitle(`Abrir ticket • ${t.name}`);
        const rows: ActionRowBuilder<TextInputBuilder>[] = [];
        rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(
          new TextInputBuilder()
            .setCustomId("reason")
            .setLabel(t.requireReason || s.ticket.requireOpenReason ? "Motivo" : "Assunto")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(Boolean(t.requireReason || s.ticket.requireOpenReason)),
        ));
        for (let idx = 0; idx < (t.questions ?? []).slice(0, 4).length; idx++) {
          const q = t.questions[idx];
          rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(
            new TextInputBuilder().setCustomId(`q${idx}`).setLabel(q.slice(0, 45)).setStyle(TextInputStyle.Short).setRequired(false),
          ));
        }
        modal.addComponents(...rows);
        return i.showModal(modal);
      }
      return;
    }

    if (i.isChannelSelectMenu()) {
      const guildId = i.guildId;
      if (!guildId) return;
      const selected = i.values[0] ?? null;
      const [a, b, c] = i.customId.split(":");

      if (a === "ticket" && b === "setChannel") {
        const patch: any = {};
        if (c === "logs") patch.logsChannelId = selected;
        if (c === "panel") patch.panelChannelId = selected;
        if (c === "transcripts") patch.transcriptChannelId = selected;
        setGuildSettings(guildId, { ticket: patch });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Canal atualizado.` });
      }

      if (a === "welcome" && b === "setChannel") {
        const patch: any = {};
        if (c === "setJoinChannel") patch.joinChannelId = selected;
        if (c === "setLeaveChannel") patch.leaveChannelId = selected;
        setGuildSettings(guildId, { welcome: patch });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Canal atualizado.` });
      }
      return;
    }

    if (i.isRoleSelectMenu()) {
      const guildId = i.guildId;
      if (!guildId) return;
      if (i.customId === "ticket:setImmuneRoles") {
        setGuildSettings(guildId, { ticket: { immuneRoleIds: [...i.values] } as any });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Cargos imunes atualizados.` });
      }
      if (i.customId === "welcome:setAutoRoleIds") {
        setGuildSettings(guildId, { welcome: { autoRoleIds: [...i.values] } as any });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Auto-cargos atualizados.` });
      }
      return;
    }

    if (i.isUserSelectMenu()) {
      const guildId = i.guildId;
      if (!guildId || !i.channel || i.channel.isDMBased()) return;
      const ch = i.channel as TextChannel;
      const ticket = getTicketByChannel(guildId, ch.id);
      if (!ticket) return safeReply(i, { ephemeral: true, content: `${em("warning")} Este canal não é um ticket.` });
      const userId = i.values[0];

      if (i.customId === "ticketMember:addSelect" || i.customId === "ticketStaff:addSelect") {
        await addMemberToTicket({ guild: i.guild!, channel: ch, addedBy: i.user, userId });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Membro adicionado.` });
      }
      if (i.customId === "ticketMember:removeSelect" || i.customId === "ticketStaff:removeSelect") {
        await removeMemberFromTicket({ guild: i.guild!, channel: ch, removedBy: i.user, userId });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Membro removido.` });
      }
      return;
    }

    if (i.isModalSubmit()) {
      const guildId = i.guildId;
      if (!guildId) return;

      if (i.customId.startsWith("ticketPUB:create:")) {
        const typeId = i.customId.split(":")[2];
        const reason = (i.fields.getTextInputValue("reason") || "").trim();
        const answers: Record<string, string> = {};
        const s = getGuildSettings(guildId);
        const t = s.ticket.types.find((x) => x.id === typeId);
        for (let idx = 0; idx < (t?.questions ?? []).slice(0, 4).length; idx++) {
          const q = (t?.questions ?? [])[idx];
          answers[q] = i.fields.getTextInputValue(`q${idx}`) || "";
        }
        const member = await i.guild!.members.fetch(i.user.id).catch(() => null);
        if (!member) return safeReply(i, { ephemeral: true, content: `${em("warning")} Membro não encontrado.` });
        const result = await createTicketChannel({ guild: i.guild!, member, typeId, reason, answers });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Ticket criado em ${result.channel}.` });
      }

      if (i.customId === "ticket:savePanelTitle") {
        setGuildSettings(guildId, { ticket: { panelTitle: i.fields.getTextInputValue("value") } as any });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Título atualizado.` });
      }
      if (i.customId === "ticket:savePanelEmoji") {
        setGuildSettings(guildId, { ticket: { panelEmoji: i.fields.getTextInputValue("value") } as any });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Emoji atualizado.` });
      }
      if (i.customId === "ticket:savePanelDesc") {
        setGuildSettings(guildId, { ticket: { panelDescription: i.fields.getTextInputValue("value") } as any });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Descrição atualizada.` });
      }
      if (i.customId === "ticketStaff:saveRename") {
        if (!i.channel || i.channel.isDMBased()) return;
        await renameTicket({ guild: i.guild!, channel: i.channel as TextChannel, by: i.user, newName: i.fields.getTextInputValue("value") });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Ticket renomeado.` });
      }

      if (i.customId === "welcome:saveTitles") {
        setGuildSettings(guildId, {
          welcome: {
            joinTitle: i.fields.getTextInputValue("joinTitle"),
            leaveTitle: i.fields.getTextInputValue("leaveTitle"),
          } as any,
        });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Títulos atualizados.` });
      }

      const oneFieldMap: Record<string, [string, string]> = {
        "welcome:saveJoinMsg": ["joinMessage", "Mensagem de entrada atualizada."],
        "welcome:saveLeaveMsg": ["leaveMessage", "Mensagem de saída atualizada."],
        "welcome:saveDmMsg": ["dmMessage", "Mensagem de DM atualizada."],
        "welcome:saveBanner": ["bannerUrl", "Banner de entrada atualizado."],
        "welcome:saveLeaveBanner": ["leaveBannerUrl", "Banner de saída atualizado."],
        "welcome:saveCardBgImage": ["cardBgImageUrl", "Imagem de fundo do card atualizada."],
      };

      if (i.customId in oneFieldMap) {
        const [key, message] = oneFieldMap[i.customId];
        setGuildSettings(guildId, { welcome: { [key]: i.fields.getTextInputValue("value") } as any });
        return safeReply(i, { ephemeral: true, content: `${em("success")} ${message}` });
      }

      if (i.customId === "welcome:saveCardTexts") {
        setGuildSettings(guildId, {
          welcome: {
            cardTitle: i.fields.getTextInputValue("cardTitle"),
            cardSubtitle: i.fields.getTextInputValue("cardSubtitle"),
          } as any,
        });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Textos do card atualizados.` });
      }

      if (i.customId === "welcome:saveCardColors") {
        setGuildSettings(guildId, {
          welcome: {
            cardBgColor: i.fields.getTextInputValue("cardBgColor"),
            cardAccentColor: i.fields.getTextInputValue("cardAccentColor"),
          } as any,
        });
        return safeReply(i, { ephemeral: true, content: `${em("success")} Cores do card atualizadas.` });
      }

      return;
    }
  } catch (err) {
    console.error(err);
    if (i.isRepliable()) {
      try {
        await safeReply(i as any, { ephemeral: true, content: `${em("danger")} Erro ao processar essa ação.` });
      } catch {}
    }
  }
}

export const name = Events.InteractionCreate;
