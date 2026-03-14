import { REST, Routes } from "discord.js";
import { config } from "./lib/config";
import { info } from "./lib/logger";
import * as painel from "./commands/painel";
import * as lock from "./commands/lock";
import * as unlock from "./commands/unlock";

async function main() {
  const rest = new REST({ version: "10" }).setToken(config.token);
  const cmds = [painel.data, lock.data, unlock.data].map((c) => c.toJSON());

  info(`Registrando ${cmds.length} comandos na guild ${config.guildId}`);
  await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), { body: cmds });
  info("Comandos registrados com sucesso.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
