import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  parseEmoji,
} from "discord.js";
import { em } from "../lib/emoji";

function se(btn: ButtonBuilder, key: string) {
  const parsed = parseEmoji(em(key) || "");
  if (parsed?.id) btn.setEmoji({ id: parsed.id, name: parsed.name ?? undefined, animated: parsed.animated ?? false });
}

export function buildTicketPanelRows(ticket: { assigneeId?: string | null }) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticketRT:leave")
      .setLabel("Sair do ticket")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticketRT:memberPanel")
      .setLabel("Painel membro")
      .setStyle(ButtonStyle.Secondary),
  );
  se(row1.components[0], "arrowl");
  se(row1.components[1], "user");

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticketRT:staffPanel")
      .setLabel("Painel Staff")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("ticketRT:close")
      .setLabel("Fechar ticket")
      .setStyle(ButtonStyle.Secondary),
  );
  se(row2.components[0], "seguranca");
  se(row2.components[1], "lock");

  return [row1, row2];
}

export function buildTicketMemberPanelRows() {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticketMember:notifyStaff")
      .setLabel("Notificar Staff")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticketMember:addMember")
      .setLabel("Adicionar Membro")
      .setStyle(ButtonStyle.Success),
  );
  se(row1.components[0], "bell");
  se(row1.components[1], "add");

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticketMember:removeMember")
      .setLabel("Remover Membro")
      .setStyle(ButtonStyle.Danger),
  );
  se(row2.components[0], "remove");

  return [row1, row2];
}

export function buildTicketStaffPanelRows(hasCall: boolean) {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticketStaff:claim")
      .setLabel("Assumir Ticket")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("ticketStaff:rename")
      .setLabel("Renomear Ticket")
      .setStyle(ButtonStyle.Secondary),
  );
  se(row1.components[0], "seguranca");
  se(row1.components[1], "wand");

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticketStaff:notifyUser")
      .setLabel("Notificar Usuário")
      .setStyle(ButtonStyle.Secondary),
    hasCall
      ? new ButtonBuilder()
          .setCustomId("ticketStaff:deleteCall")
          .setLabel("Deletar Call")
          .setStyle(ButtonStyle.Danger)
      : new ButtonBuilder()
          .setCustomId("ticketStaff:createCall")
          .setLabel("Criar Call")
          .setStyle(ButtonStyle.Secondary),
  );
  se(row2.components[0], "ping");
  se(row2.components[1], hasCall ? "voicecdanger" : "voicecsuccess");

  const row3 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("ticketStaff:addMember")
      .setLabel("Adicionar Membro")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("ticketStaff:removeMember")
      .setLabel("Remover Membro")
      .setStyle(ButtonStyle.Danger),
  );
  se(row3.components[0], "add");
  se(row3.components[1], "remove");

  return [row1, row2, row3];
}

export function buildTicketClosedRow(_ticketId: string) {
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticketRT:delete").setLabel("Deletar Ticket").setStyle(ButtonStyle.Danger),
  );
  se(row.components[0], "trashcan");
  return row;
}

export function buildTicketTypeSelect(types: { id: string; name: string; emoji?: string; emojiKey?: string; description?: string }[]) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticketPUB:open")
    .setPlaceholder("Selecione o tipo de ticket para abrir")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      types.slice(0, 25).map((t) => {
        const rawEmoji = t.emoji || (t.emojiKey ? em(t.emojiKey) : null);
        const parsed = rawEmoji ? parseEmoji(rawEmoji) : null;
        const emojiObj = parsed?.id
          ? { id: parsed.id, name: parsed.name ?? undefined, animated: parsed.animated ?? false }
          : rawEmoji && !rawEmoji.startsWith("<")
          ? { name: rawEmoji } // unicode emoji
          : undefined;

        return {
          label: t.name.slice(0, 100),
          description: (t.description ?? "").slice(0, 100) || undefined,
          value: t.id,
          emoji: emojiObj,
        };
      }),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildTicketMemberPanel() {
  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticketMember:action")
    .setPlaceholder("Painel do Membro — Selecione uma ação")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      { label: "Sair do Ticket", description: "Sair deste ticket", value: "leave", emoji: parseEmoji(em("arrowl")) ? { id: parseEmoji(em("arrowl"))!.id!, name: parseEmoji(em("arrowl"))!.name! } : undefined },
      { label: "Notificar Staff", description: "Chama a staff do ticket", value: "notify_staff", emoji: parseEmoji(em("bell")) ? { id: parseEmoji(em("bell"))!.id!, name: parseEmoji(em("bell"))!.name!, animated: parseEmoji(em("bell"))!.animated } : undefined },
      { label: "Adicionar Membro", description: "Adiciona um membro ao ticket", value: "add_member", emoji: parseEmoji(em("add")) ? { id: parseEmoji(em("add"))!.id!, name: parseEmoji(em("add"))!.name! } : undefined },
      { label: "Remover Membro", description: "Remove um membro do ticket", value: "remove_member", emoji: parseEmoji(em("remove")) ? { id: parseEmoji(em("remove"))!.id!, name: parseEmoji(em("remove"))!.name! } : undefined },
    ]);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}

export function buildTicketStaffPanel() {
  const makeEmoji = (key: string) => {
    const p = parseEmoji(em(key));
    return p?.id ? { id: p.id, name: p.name ?? undefined, animated: p.animated ?? false } : undefined;
  };
  const menu = new StringSelectMenuBuilder()
    .setCustomId("ticketStaff:action")
    .setPlaceholder("Painel da Staff — Selecione uma ação")
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions([
      { label: "Assumir Ticket",    value: "claim",         emoji: makeEmoji("seguranca") },
      { label: "Renomear Ticket",   value: "rename",        emoji: makeEmoji("wand") },
      { label: "Notificar Usuário", value: "notify_user",   emoji: makeEmoji("ping") },
      { label: "Criar Call",        value: "create_call",   emoji: makeEmoji("voicecsuccess") },
      { label: "Deletar Call",      value: "delete_call",   emoji: makeEmoji("voicecdanger") },
      { label: "Adicionar Membro",  value: "add_member",    emoji: makeEmoji("add") },
      { label: "Remover Membro",    value: "remove_member", emoji: makeEmoji("remove") },
      { label: "Fechar Ticket",     value: "close",         emoji: makeEmoji("lock") },
    ]);
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu);
}
