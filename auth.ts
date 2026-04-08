// auth.ts
// Cognito refresh token → ID token manager

const COGNITO_ENDPOINT = "https://cognito-idp.us-east-1.amazonaws.com/";
const COGNITO_CLIENT_ID = "3fmtnokmptq4l3q7pfham4o2fn";

let currentIdToken: string = "";
let tokenExpiresAt: number = 0; // unix ms

function decodeTokenExpiry(jwt: string): number {
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split(".")[1], "base64url").toString("utf8"),
    );
    return payload.exp * 1000; // convert to ms
  } catch {
    return 0;
  }
}

export async function refreshIdToken(refreshToken: string): Promise<string> {
  const res = await fetch(COGNITO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target":
        "AWSCognitoIdentityProviderService.InitiateAuth",
    },
    body: JSON.stringify({
      AuthFlow: "REFRESH_TOKEN_AUTH",
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cognito refresh failed: ${res.status} ${body}`);
  }

  const json = await res.json();
  const idToken = json?.AuthenticationResult?.IdToken;
  if (!idToken) throw new Error("No IdToken in Cognito response");

  currentIdToken = idToken;
  tokenExpiresAt = decodeTokenExpiry(idToken);
  console.log(
    `🔑 Token refreshed. Expires at ${new Date(tokenExpiresAt).toISOString()}`,
  );
  return idToken;
}

export function getIdToken(): string {
  return currentIdToken;
}

export function isTokenExpiringSoon(bufferMs = 5 * 60 * 1000): boolean {
  return Date.now() >= tokenExpiresAt - bufferMs;
}

/**
 * Initialize on startup. If a refresh token is provided, fetch a fresh ID
 * token immediately. Otherwise fall back to a static JWT from env.
 */
export async function initAuth(
  refreshToken: string | undefined,
  staticJwt: string | undefined,
): Promise<void> {
  if (refreshToken) {
    await refreshIdToken(refreshToken);
    // Schedule proactive refresh every 55 minutes
    setInterval(
      async () => {
        try {
          await refreshIdToken(refreshToken);
        } catch (err) {
          console.error("❌ Proactive token refresh failed:", err);
        }
      },
      55 * 60 * 1000,
    );
  } else if (staticJwt) {
    // Strip "Bearer " prefix if present
    currentIdToken = staticJwt.replace(/^Bearer\s+/i, "");
    tokenExpiresAt = decodeTokenExpiry(currentIdToken);
    console.warn(
      "⚠️  Using static JWT — will expire. Set TH_REFRESH_TOKEN to auto-refresh.",
    );
  } else {
    throw new Error(
      "Must provide either TH_REFRESH_TOKEN or TH_JWT_TOKEN in .env",
    );
  }
}
