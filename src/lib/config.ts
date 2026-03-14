import fs from "node:fs";
import path from "node:path";

type ConfigJson = {
  token: string;
  clientId: string;
  guildId: string;
  panelThumbUrl?: string;
  env?: string;
};

function readConfig(): ConfigJson {
  const filePath = path.resolve(process.cwd(), "config.json");
  if (!fs.existsSync(filePath)) throw new Error("config.json não encontrado na raiz do projeto.");
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw) as ConfigJson;
  const token = String(parsed.token ?? "").trim();
  const clientId = String(parsed.clientId ?? "").trim();
  const guildId = String(parsed.guildId ?? "").trim();
  if (!token || token.length < 30) throw new Error("config.json inválido: token ausente ou incorreto.");
  if (!clientId) throw new Error("config.json inválido: clientId ausente.");
  if (!guildId) throw new Error("config.json inválido: guildId ausente.");
  return {
    ...parsed,
    token,
    clientId,
    guildId,
    panelThumbUrl: String(parsed.panelThumbUrl ?? "").trim(),
    env: String(parsed.env ?? "DEVELOPMENT").toUpperCase(),
  };
}

export const config = readConfig();
