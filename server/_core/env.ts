export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  sslCommerzStoreId: process.env.SSLCOMMERZ_STORE_ID ?? "",
  sslCommerzStorePassword: process.env.SSLCOMMERZ_STORE_PASSWORD ?? "",
  sslCommerzSandbox: process.env.SSLCOMMERZ_IS_SANDBOX === "true",
};
