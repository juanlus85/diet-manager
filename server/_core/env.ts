// Soporte para OpenAI API como alternativa a Manus LLM
// En VPS propio: configura OPENAI_API_KEY y opcionalmente OPENAI_API_URL
// En Manus: usa BUILT_IN_FORGE_API_URL y BUILT_IN_FORGE_API_KEY automáticamente
const llmApiUrl =
  process.env.OPENAI_API_URL ||
  process.env.BUILT_IN_FORGE_API_URL ||
  "https://api.openai.com";

const llmApiKey =
  process.env.OPENAI_API_KEY ||
  process.env.BUILT_IN_FORGE_API_KEY ||
  "";

export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: llmApiUrl,
  forgeApiKey: llmApiKey,
};
