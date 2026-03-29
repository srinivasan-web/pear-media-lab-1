import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const parseEnvFile = (content) => {
  const entries = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
};

export const getEnv = () => {
  const envPath = resolve(process.cwd(), ".env");
  const fileEnv =
    existsSync(envPath) ? parseEnvFile(readFileSync(envPath, "utf8")) : {};

  return {
    ...fileEnv,
    ...process.env,
  };
};
