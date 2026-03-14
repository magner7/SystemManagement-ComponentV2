export function info(msg: string) { console.log(`[INFO] ${new Date().toLocaleTimeString()} ${msg}`); }
export function warn(msg: string) { console.warn(`[WARN] ${new Date().toLocaleTimeString()} ${msg}`); }
export function error(msg: string, err?: unknown) {
  console.error(`[ERROR] ${new Date().toLocaleTimeString()} ${msg}`);
  if (err) console.error(err);
}
