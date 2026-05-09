import path from "path";
import { readDesktopLocalConfig } from "./local-config";

export type DesktopSqliteAdapter = {
  provider: "sqlite";
  databaseUrl: string;
  filePath: string;
};

export async function getDesktopSqliteAdapter(rootDir = process.cwd()): Promise<DesktopSqliteAdapter> {
  const config = await readDesktopLocalConfig(rootDir);
  const filePath = path.isAbsolute(config.sqlitePath)
    ? config.sqlitePath
    : path.join(rootDir, config.sqlitePath);

  return {
    provider: "sqlite",
    filePath,
    databaseUrl: `file:${filePath}`
  };
}
