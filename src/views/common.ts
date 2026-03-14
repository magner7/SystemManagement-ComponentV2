import type {
  InteractionReplyOptions,
  InteractionUpdateOptions,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  RepliableInteraction,
} from "discord.js";
import { MessageFlags, Routes, ContainerBuilder, TextDisplayBuilder, SeparatorBuilder } from "discord.js";

export type ViewPayload = {

  content?: string;

  componentsV2?: boolean;

  embeds?: InteractionReplyOptions["embeds"];

  components?: InteractionReplyOptions["components"];
  ephemeral?: boolean;
};

function stripUnicodeEmoji(input: string): string {
  return input
    .replace(/\uFE0F/g, "")
    .replace(/\p{Extended_Pictographic}+/gu, "")
    .replace(/[\u{2600}-\u{27BF}]/gu, "")
    .replace(/[\u{1F000}-\u{1FAFF}]/gu, "");
}

function embedToText(e: any): string {
  const d: any = (e && typeof e === "object" && "data" in e) ? (e as any).data : e;

  const out: string[] = [];

  const title = stripUnicodeEmoji((d?.title ?? "").toString()).trim();
  const desc = stripUnicodeEmoji((d?.description ?? "").toString()).trim();

  if (title) out.push(`**${title}**`);
  if (desc) out.push(desc);

  const fields = Array.isArray(d?.fields) ? d.fields : [];
  for (const f of fields) {
    const n = stripUnicodeEmoji((f?.name ?? "").toString()).trim();
    const v = stripUnicodeEmoji((f?.value ?? "").toString()).trim();
    if (!n && !v) continue;
    if (n) out.push(`**${n}**`);
    if (v) out.push(v);
  }

  const footerText = stripUnicodeEmoji((d?.footer?.text ?? "").toString()).trim();
  if (footerText) out.push(footerText);

  return out.join("\n").trim();
}

function normalizeTextForTextDisplay(input: string): string {
  let t = stripUnicodeEmoji(input);
  t = t.replace(/\s{3,}/g, "  ").trim();
  if (!t) t = "Sem informações.";
  if (t.length > 4000) t = t.slice(0, 3997) + "...";
  return t;
}

function autoV2(payload: ViewPayload): ViewPayload {
  const hasEmbeds  = Array.isArray(payload.embeds) && payload.embeds.length > 0;
  const hasContent = Boolean((payload.content || "").trim());

  if (payload.componentsV2) {
    if (!hasEmbeds && !hasContent) return payload;

    const parts: string[] = [];
    if (hasContent) parts.push((payload.content || "").toString());
    if (hasEmbeds) {
      for (const e of payload.embeds as any[]) {
        const t = embedToText(e);
        if (t) parts.push(t);
      }
    }
    const text  = normalizeTextForTextDisplay(parts.filter(Boolean).join("\n\n"));
    const comps = Array.isArray(payload.components) ? [...(payload.components as any[])] : [];
    const first = comps[0] as any;

    if (first && typeof first.addTextDisplayComponents === "function") {
      first.addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
      if (typeof first.addSeparatorComponents === "function")
        first.addSeparatorComponents(new SeparatorBuilder().setSpacing(1).setDivider(false));
      return { ...payload, embeds: undefined, content: undefined, components: comps };
    }

    const header = new ContainerBuilder().addTextDisplayComponents(
      new TextDisplayBuilder().setContent(text),
    );
    return { ...payload, embeds: undefined, content: undefined, components: [header, ...comps] };
  }

  if (!hasEmbeds && !hasContent) return payload;

  const parts: string[] = [];
  if (hasContent) parts.push((payload.content || "").toString());
  if (hasEmbeds) {
    for (const e of payload.embeds as any[]) {
      const t = embedToText(e);
      if (t) parts.push(t);
    }
  }
  const text = normalizeTextForTextDisplay(parts.filter(Boolean).join("\n\n"));

  const container = new ContainerBuilder().addTextDisplayComponents(
    new TextDisplayBuilder().setContent(text),
  );

  if (Array.isArray(payload.components) && payload.components.length) {
    container.addSeparatorComponents(
      new SeparatorBuilder().setSpacing(1).setDivider(false) as any,
    );
    for (const row of payload.components as any[]) {
      (container as any).addActionRowComponents(row);
    }
  }

  return {
    componentsV2: true,
    ephemeral: payload.ephemeral,
    embeds: undefined,
    content: undefined,
    components: [container] as any,
  };
}

function flagsFor(p: ViewPayload) {
  return (
    (p.ephemeral ? MessageFlags.Ephemeral : 0) |
    (p.componentsV2 ? MessageFlags.IsComponentsV2 : 0)
  ) || undefined;
}

function toReplyOptions(p: ViewPayload): InteractionReplyOptions {
  if (p.componentsV2) {
    return { components: p.components, flags: flagsFor(p) } as InteractionReplyOptions;
  }
  return {
    content: p.content,
    embeds: p.embeds,
    components: p.components,
    flags: flagsFor(p),
  };
}

function toUpdateOptions(p: ViewPayload): InteractionUpdateOptions {
  if (p.componentsV2) {
    return { components: p.components } as any;
  }
  return {
    content: p.content,
    embeds: p.embeds,
    components: p.components,
    flags: p.ephemeral ? MessageFlags.Ephemeral : undefined,
  } as any;
}

async function restV2Callback(
  i: RepliableInteraction | MessageComponentInteraction | ModalSubmitInteraction,
  type: 4 | 7,
  payload: ViewPayload,
) {
  const flags = flagsFor(payload) ?? MessageFlags.IsComponentsV2;
  const components = (payload.components ?? []).map((c: any) =>
    typeof c?.toJSON === "function" ? c.toJSON() : c,
  );
  const body: any = {
    type,
    data: {
      flags,
      components,
    },
  };
  const res = await (i.client as any).rest.post(
    Routes.interactionCallback((i as any).id, (i as any).token),
    { body },
  );
  (i as any).replied = true;
  return res;
}

async function restV2EditOriginal(
  i: RepliableInteraction | MessageComponentInteraction | ModalSubmitInteraction,
  payload: ViewPayload,
) {
  const flags = flagsFor(payload) ?? MessageFlags.IsComponentsV2;
  const components = (payload.components ?? []).map((c: any) =>
    typeof c?.toJSON === "function" ? c.toJSON() : c,
  );
  const body: any = {
    flags,
    components,
  };
  const res = await (i.client as any).rest.patch(
    Routes.webhookMessage((i as any).applicationId, (i as any).token, "@original"),
    { body },
  );
  (i as any).replied = true;
  return res;
}

export async function safeReply(i: RepliableInteraction, payload: ViewPayload) {
  payload = autoV2(payload);
  if (payload.componentsV2) {
    if ((i as any).deferred || (i as any).replied) {
      return restV2EditOriginal(i as any, payload);
    }
    return restV2Callback(i as any, 4, payload);
  }

  const opts = toReplyOptions(payload);
  if (!(opts as any).content && !(opts as any).embeds && !(opts as any).components) {
    (opts as any).content = "Ok.";
  }
  if ((i as any).deferred || (i as any).replied) return (i as any).editReply(opts);
  return (i as any).reply(opts);
}

export async function safeUpdate(
  i: MessageComponentInteraction | ModalSubmitInteraction,
  payload: ViewPayload,
) {
  payload = autoV2(payload);
  const msgIsV2 = Boolean((i as any).message?.flags?.has?.(MessageFlags.IsComponentsV2));
  if (msgIsV2 && !payload.componentsV2) {
    const legacy = { ...payload, ephemeral: true } as ViewPayload;
    const opts = toReplyOptions(legacy);
    if ((i as any).deferred || (i as any).replied) {
      if (typeof (i as any).followUp === "function") return (i as any).followUp(opts);
      return (i as any).editReply(opts);
    }
    return (i as any).reply(opts);
  }

  if (payload.componentsV2) {
    if (!(i as any).deferred && !(i as any).replied) {
      return restV2Callback(i as any, 7, payload);
    }
    return restV2EditOriginal(i as any, payload);
  }

  const opts = toUpdateOptions(payload);

  if (!(opts as any).content && !(opts as any).embeds && !(opts as any).components) {
    (opts as any).content = "Ok.";
  }

  if ((i as any).deferred || (i as any).replied) {
    return (i as any).editReply(opts);
  }
  if (typeof (i as any).update === "function") {
    return (i as any).update(opts);
  }
  return (i as any).editReply(opts);
}
