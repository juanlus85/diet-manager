/**
 * auth.login.test.ts — Verifica que el token JWT generado en el login local
 * es compatible con sdk.verifySession (usa jose, no jsonwebtoken).
 *
 * El bug original: localAuth.ts usaba jsonwebtoken con payload {openId, name}
 * pero sdk.verifySession requiere {openId, appId, name} y usa jose.
 * Ahora localAuth.ts usa sdk.signSession con {openId, appId, name}.
 */
import { describe, expect, it } from "vitest";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";

describe("auth.login — compatibilidad JWT", () => {
  it("sdk.signSession genera un token que sdk.verifySession puede verificar", async () => {
    const token = await sdk.signSession(
      {
        openId: "local_test_user",
        appId: "local",
        name: "Test User",
      },
      { expiresInMs: ONE_YEAR_MS }
    );

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // formato JWT: header.payload.signature

    const session = await sdk.verifySession(token);

    expect(session).not.toBeNull();
    expect(session?.openId).toBe("local_test_user");
    expect(session?.appId).toBe("local");
    expect(session?.name).toBe("Test User");
  });

  it("sdk.verifySession devuelve null para un token inválido", async () => {
    const result = await sdk.verifySession("token.invalido.aqui");
    expect(result).toBeNull();
  });

  it("sdk.verifySession devuelve null para token vacío", async () => {
    const result = await sdk.verifySession("");
    expect(result).toBeNull();
  });

  it("sdk.verifySession devuelve null para undefined", async () => {
    const result = await sdk.verifySession(undefined);
    expect(result).toBeNull();
  });
});
