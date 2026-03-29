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

const readEnvFile = (filePath) =>
  existsSync(filePath) ? parseEnvFile(readFileSync(filePath, "utf8")) : {};

export const getEnv = () => {
  const backendEnv = readEnvFile(resolve(process.cwd(), "backend", ".env"));
  const rootEnv = readEnvFile(resolve(process.cwd(), ".env"));
  const legacyServerEnv = Object.fromEntries(
    Object.entries(rootEnv).filter(([key]) =>
      /^HF_|^IMAGE_API_PORT$|^NODE_ENV$/.test(key),
    ),
  );

  return {
    ...legacyServerEnv,
    ...backendEnv,
    ...process.env,
  };
};
