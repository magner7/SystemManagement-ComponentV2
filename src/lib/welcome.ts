import {
  GuildMember,
  User,
  Guild,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  ThumbnailBuilder,
  MessageFlags,
  AttachmentBuilder,
} from "discord.js";
import { getGuildSettings } from "./store";
import { em } from "./emoji";
import { buildWelcomeCard } from "./welcomeCard";

function applyVars(template: string, user: User | null, guild: Guild): string {
  const username = user?.username ?? "Usuário";
  const mention  = user ? `<@${user.id}>` : username;
  const server   = guild.name;
  const count    = guild.memberCount.toString();
  return template
    .replace(/\{user\}/g, mention)
    .replace(/\{username\}/g, username)
    .replace(/\{server\}/g, server)
    .replace(/\{count\}/g, count);
}

function formatDateFull(ts: number): string { return `<t:${Math.floor(ts / 1000)}:F>`; }
function formatDateShort(ts: number): string { return `<t:${Math.floor(ts / 1000)}:D>`; }

export async function buildJoinContainer(member: GuildMember, guild: Guild): Promise<ContainerBuilder> {
  const w       = getGuildSettings(guild.id).welcome;
  const user    = member.user;
  const title   = applyVars(w.joinTitle, user, guild);
  const msgBody = applyVars(w.joinMessage, user, guild);

  const fullUser  = await member.client.users.fetch(user.id, { force: true }).catch(() => user);
  const bannerUrl = fullUser.bannerURL({ size: 1024 }) ?? null;
  const avatarUrl = user.displayAvatarURL({ size: 256, extension: "png" });

  const container = new ContainerBuilder();

  if (w.showBanner) {
    const bannerToShow = bannerUrl ?? w.bannerUrl ?? null;
    if (bannerToShow) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerToShow)),
      );
    }
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${title}, <@${user.id}>!`).setId(1),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false) as any);

  const profileLines: string[] = ["**Perfil do usuário:**"];
  if (w.showStatus)    profileLines.push(`Status: ${em("invisible")} **Offline**`);
  if (w.showCreatedAt) profileLines.push(`Conta criada em: ${formatDateFull(user.createdTimestamp)}\nConta criada há: ${formatDateShort(user.createdTimestamp)}`);
  if (w.showUserId)    profileLines.push(`ID do usuário: ${user.id}`);
  const profileText = profileLines.join("\n");

  if (w.showAvatar) {
    try {
      const { SectionBuilder } = await import("discord.js") as any;
      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(profileText).setId(2))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl));
      container.addSectionComponents(section as any);
    } catch {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(profileText).setId(2));
    }
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(profileText).setId(2));
  }

  const bottomLines: string[] = [];
  if (w.showCustomMessage && msgBody.trim()) bottomLines.push(msgBody);
  if (w.showMemberCount) bottomLines.push(`\nTotal de membros: **${guild.memberCount}**`);
  if (bottomLines.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false) as any);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(bottomLines.join("\n")).setId(3));
  }

  return container;
}

export async function buildLeaveContainer(user: User, guild: Guild, membersAfter: number): Promise<ContainerBuilder> {
  const w       = getGuildSettings(guild.id).welcome;
  const title   = w.leaveTitle.replace(/\{username\}/g, user.username).replace(/\{server\}/g, guild.name);
  const msgBody = applyVars(w.leaveMessage, user, guild);

  const fullUser  = await guild.client.users.fetch(user.id, { force: true }).catch(() => user);
  const bannerUrl = fullUser.bannerURL({ size: 1024 }) ?? null;
  const avatarUrl = user.displayAvatarURL({ size: 256, extension: "png" });

  const container = new ContainerBuilder();

  if (w.showBanner) {
    const bannerToShow = (w as any).leaveBannerUrl ?? bannerUrl ?? w.bannerUrl ?? null;
    if (bannerToShow) {
      container.addMediaGalleryComponents(
        new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(bannerToShow)),
      );
    }
  }

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`-# ${title}: <@${user.id}>`).setId(1),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false) as any);

  const profileLines: string[] = ["**Perfil do usuário:**"];
  if (w.showStatus)    profileLines.push(`Status: ${em("invisible")} **Offline**`);
  if (w.showCreatedAt) profileLines.push(`Conta criada em: ${formatDateFull(user.createdTimestamp)}\nConta criada há: ${formatDateShort(user.createdTimestamp)}`);
  if (w.showUserId)    profileLines.push(`ID do usuário: ${user.id}`);
  const profileText = profileLines.join("\n");

  if (w.showAvatar) {
    try {
      const { SectionBuilder } = await import("discord.js") as any;
      const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(profileText).setId(2))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(avatarUrl));
      container.addSectionComponents(section as any);
    } catch {
      container.addTextDisplayComponents(new TextDisplayBuilder().setContent(profileText).setId(2));
    }
  } else {
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(profileText).setId(2));
  }

  const bottomLines: string[] = [];
  if (w.showCustomMessage && msgBody.trim()) bottomLines.push(msgBody);
  if (w.showMemberCount) bottomLines.push(`\nTotal de membros restantes: **${membersAfter}**`);
  if (bottomLines.length > 0) {
    container.addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false) as any);
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(bottomLines.join("\n")).setId(3));
  }

  return container;
}

export async function sendWelcomeMessage(member: GuildMember): Promise<void> {
  const guild    = member.guild;
  const settings = getGuildSettings(guild.id);
  const w        = settings.welcome;
  if (!w.enabled) return;

  for (const roleId of w.autoRoleIds) await member.roles.add(roleId).catch(() => null);

  if (w.sendDm && w.dmMessage.trim()) {
    const dmText = applyVars(w.dmMessage, member.user, guild);
    await member.user.send({ content: dmText }).catch(() => null);
  }

  if (!w.joinChannelId) return;
  const channel = await guild.channels.fetch(w.joinChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  if (w.cardEnabled) {
    const cardBuf = await buildWelcomeCard(member, guild).catch((err) => {
      console.error("[welcomeCard] Erro ao gerar card:", err?.message ?? err);
      return null;
    });
    if (cardBuf) {
      const attachment = new AttachmentBuilder(cardBuf, { name: "welcome.png" });
      await (channel as any).send({ files: [attachment] }).catch((err: any) =>
        console.error("[welcomeCard] Erro ao enviar card:", err?.message ?? err),
      );
    }
  }

  const container = await buildJoinContainer(member, guild);
  await (channel as any).send({
    components: [container],
    flags: MessageFlags.IsComponentsV2 as any,
  }).catch(() => null);
}

export async function sendLeaveMessage(user: User, guild: Guild, client: any): Promise<void> {
  const settings = getGuildSettings(guild.id);
  const w        = settings.welcome;
  if (!w.enabled) return;
  if (!w.leaveChannelId) return;

  const channel = await guild.channels.fetch(w.leaveChannelId).catch(() => null);
  if (!channel?.isTextBased()) return;

  const membersAfter = guild.memberCount;
  const fullUser     = await client.users.fetch(user.id, { force: true }).catch(() => user);
  const container    = await buildLeaveContainer(fullUser, guild, membersAfter);

  await (channel as any).send({
    components: [container],
    flags: MessageFlags.IsComponentsV2 as any,
  }).catch(() => null);
}
