import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { config } from "./lib/config";
import { info } from "./lib/logger";
import { onInteractionCreate } from "./events/interactionCreate";
import { onReady } from "./events/ready";
import { onMessageCreate } from "./events/messageCreate";
import { onGuildMemberAdd, onGuildMemberRemove } from "./events/guildMember";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel, Partials.GuildMember],
});

client.once("clientReady", () => onReady(client));
client.on("interactionCreate", (i) => void onInteractionCreate(i));
client.on("messageCreate", (m) => void onMessageCreate(client, m));
client.on("guildMemberAdd", (m) => onGuildMemberAdd(m));
client.on("guildMemberRemove", (m) => onGuildMemberRemove(m, client));

info("Sistemas carregando");
info("Runtime");
info(`  ├─ Node v${process.versions.node}`);
info(`  ├─ discord.js v${(await import("discord.js")).version}`);
info(`  ├─ Ambiente: ${config.env}`);
info(`  └─ Inicialização concluída`);

client.login(config.token);
