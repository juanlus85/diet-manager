export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * Devuelve la URL de login.
 * - En Manus: redirige al portal OAuth (VITE_OAUTH_PORTAL_URL definida).
 * - En VPS propio: redirige al formulario de login local (/login).
 */
export const getLoginUrl = (returnPath?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL;

  // Si no hay portal OAuth configurado (VPS propio), usar login local
  if (!oauthPortalUrl) {
    return returnPath ? `/login?return=${encodeURIComponent(returnPath)}` : "/login";
  }

  // Modo Manus OAuth
  const appId = import.meta.env.VITE_APP_ID;
  const redirectUri = `${window.location.origin}/api/oauth/callback`;
  const state = btoa(JSON.stringify({ origin: window.location.origin, returnPath: returnPath ?? "/" }));
  const url = new URL(`${oauthPortalUrl}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");
  return url.toString();
};
