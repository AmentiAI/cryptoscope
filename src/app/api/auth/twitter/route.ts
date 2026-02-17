import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import crypto from "crypto";

/**
 * Twitter OAuth 2.0 flow - Step 1: Redirect to Twitter
 * GET /api/auth/twitter
 */

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CALLBACK_URL = `${APP_URL}/api/auth/twitter/callback`;

// PKCE helpers
function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.redirect(`${APP_URL}/sign-in`);
    }

    if (!TWITTER_CLIENT_ID) {
      return NextResponse.json(
        { error: "Twitter OAuth not configured" },
        { status: 500 }
      );
    }

    // Generate PKCE codes
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = generateCodeChallenge(codeVerifier);
    const state = crypto.randomBytes(16).toString("hex");

    // Store code verifier in cookie for callback
    const response = NextResponse.redirect(
      `https://twitter.com/i/oauth2/authorize?` +
        new URLSearchParams({
          response_type: "code",
          client_id: TWITTER_CLIENT_ID,
          redirect_uri: CALLBACK_URL,
          scope: "tweet.read users.read follows.read offline.access",
          state,
          code_challenge: codeChallenge,
          code_challenge_method: "S256",
        }).toString()
    );

    // Set cookies for callback verification
    response.cookies.set("twitter_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutes
    });

    response.cookies.set("twitter_code_verifier", codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
    });

    return response;
  } catch (error) {
    console.error("Twitter OAuth error:", error);
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=oauth_failed`);
  }
}
