import { GuildMember, Guild } from "discord.js";
import { getGuildSettings } from "./store";

async function getCanvas() {
  try {
    return await import("@napi-rs/canvas");
  } catch {
    return null;
  }
}

async function fetchBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    return null;
  }
}

function hex(color: string): string {
  return color.startsWith("#") ? color : `#${color}`;
}

function applyVars(template: string, member: GuildMember, guild: Guild): string {
  return template
    .replace(/\{username\}/g, member.user.username)
    .replace(/\{user\}/g,     member.user.username)
    .replace(/\{server\}/g,   guild.name)
    .replace(/\{count\}/g,    guild.memberCount.toString());
}

function roundedRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export async function buildWelcomeCard(
  member: GuildMember,
  guild: Guild,
): Promise<Buffer | null> {
  const canvas = await getCanvas();
  if (!canvas) return null;

  const { createCanvas, loadImage, GlobalFonts } = canvas;

  const W = 900;
  const H = 300;

  const w = getGuildSettings(guild.id).welcome;
  const cfg = {
    bg:           hex(w.cardBgColor),
    bgImageUrl:   w.cardBgImageUrl ?? null,
    text:         hex(w.cardTextColor),
    subtext:      hex(w.cardSubtextColor),
    avatarBorder: hex(w.cardAvatarBorderColor),
    accent:       hex(w.cardAccentColor),
    title:        applyVars(w.cardTitle, member, guild),
    subtitle:     applyVars(w.cardSubtitle, member, guild),
    message:      applyVars(w.joinMessage.replace(/\*\*/g, ""), member, guild),
  };

  const cv  = createCanvas(W, H);
  const ctx = cv.getContext("2d") as any;

  ctx.save();
  roundedRect(ctx, 0, 0, W, H, 24);
  ctx.clip();

  if (cfg.bgImageUrl) {
    const bgBuf = await fetchBuffer(cfg.bgImageUrl);
    if (bgBuf) {
      try {
        const bgImg = await loadImage(bgBuf);
        const scale = Math.max(W / bgImg.width, H / bgImg.height);
        const sw = bgImg.width * scale;
        const sh = bgImg.height * scale;
        ctx.drawImage(bgImg, (W - sw) / 2, (H - sh) / 2, sw, sh);
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, W, H);
      } catch {
        ctx.fillStyle = cfg.bg;
        ctx.fillRect(0, 0, W, H);
      }
    } else {
      ctx.fillStyle = cfg.bg;
      ctx.fillRect(0, 0, W, H);
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, cfg.bg);
    grad.addColorStop(1, shadeColor(cfg.bg, -30));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();

  ctx.save();
  roundedRect(ctx, 0, 0, 6, H, 3);
  ctx.fillStyle = cfg.accent;
  ctx.fill();
  ctx.restore();

  const avatarSize = 160;
  const avatarX    = 60;
  const avatarY    = (H - avatarSize) / 2;
  const avatarUrl  = member.user.displayAvatarURL({ size: 256, extension: "png" });
  const avatarBuf  = await fetchBuffer(avatarUrl);

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2 + 5, 0, Math.PI * 2);
  ctx.fillStyle = cfg.avatarBorder;
  ctx.fill();
  ctx.restore();

  if (avatarBuf) {
    try {
      const avatarImg = await loadImage(avatarBuf);
      ctx.save();
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
      ctx.restore();
    } catch {}
  }

  const textX      = avatarX + avatarSize + 40;
  const textMaxW   = W - textX - 30;
  const centerY    = H / 2;

  ctx.fillStyle = cfg.text;
  ctx.font      = "bold 38px Sans";
  ctx.fillText(cfg.title, textX, centerY - 38, textMaxW);

  ctx.strokeStyle = cfg.accent;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(textX, centerY - 18);
  ctx.lineTo(textX + Math.min(textMaxW, 300), centerY - 18);
  ctx.stroke();

  ctx.fillStyle = cfg.subtext;
  ctx.font      = "24px Sans";
  ctx.fillText(cfg.subtitle, textX, centerY + 14, textMaxW);

  if (w.showCustomMessage && cfg.message.trim()) {
    ctx.fillStyle = cfg.subtext;
    ctx.font      = "italic 18px Sans";
    const msg = cfg.message.length > 80 ? cfg.message.slice(0, 77) + "..." : cfg.message;
    ctx.fillText(msg, textX, centerY + 48, textMaxW);
  }

  if (w.showMemberCount) {
    const badgeText = `👥 ${guild.memberCount} membros`;
    ctx.font        = "bold 16px Sans";
    const bw        = ctx.measureText(badgeText).width + 24;
    const bh        = 30;
    const bx        = W - bw - 20;
    const by        = H - bh - 16;

    ctx.save();
    roundedRect(ctx, bx, by, bw, bh, 8);
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = cfg.subtext;
    ctx.fillText(badgeText, bx + 12, by + bh - 9);
  }

  return cv.toBuffer("image/png");
}

function shadeColor(color: string, amount: number): string {
  let hex = color.replace("#", "");
  if (hex.length === 3) hex = hex.split("").map(c => c + c).join("");
  const num = parseInt(hex, 16);
  const r   = Math.min(255, Math.max(0, (num >> 16) + amount));
  const g   = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amount));
  const b   = Math.min(255, Math.max(0, (num & 0xff) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
