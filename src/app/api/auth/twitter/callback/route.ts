import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { twitterAccounts } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { inngest } from "@/lib/inngest/jobs";

const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const CALLBACK_URL = `${APP_URL}/api/auth/twitter/callback`;

/**
 * Twitter OAuth 2.0 callback - Step 2: Exchange code for tokens
 * GET /api/auth/twitter/callback
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return NextResponse.redirect(`${APP_URL}/sign-in`);
    }

    const { searchParams } = req.nextUrl;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      console.error("Twitter OAuth error:", error);
      return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=${error}`);
    }

    // Verify state
    const savedState = req.cookies.get("twitter_oauth_state")?.value;
    const codeVerifier = req.cookies.get("twitter_code_verifier")?.value;

    if (!state || state !== savedState || !codeVerifier || !code) {
      return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=invalid_state`);
    }

    if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
      return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=not_configured`);
    }

    // Exchange code for tokens
    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(
          `${TWITTER_CLIENT_ID}:${TWITTER_CLIENT_SECRET}`
        ).toString("base64")}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: CALLBACK_URL,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenRes.ok) {
      const errorText = await tokenRes.text();
      console.error("Token exchange failed:", errorText);
      return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=token_failed`);
    }

    const tokens = await tokenRes.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    // Fetch user profile
    const profileRes = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=public_metrics,profile_image_url,description,verified",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      }
    );

    if (!profileRes.ok) {
      console.error("Profile fetch failed:", await profileRes.text());
      return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=profile_failed`);
    }

    const { data: profile } = await profileRes.json() as {
      data: {
        id: string;
        username: string;
        name: string;
        profile_image_url?: string;
        description?: string;
        public_metrics?: {
          followers_count: number;
          following_count: number;
          tweet_count: number;
          listed_count: number;
        };
        verified?: boolean;
      };
    };

    // Upsert Twitter account
    const existing = await db
      .select()
      .from(twitterAccounts)
      .where(eq(twitterAccounts.id, profile.id))
      .limit(1);

    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    if (existing.length > 0) {
      // Update existing account
      await db
        .update(twitterAccounts)
        .set({
          userId, // Transfer ownership if different user
          username: profile.username,
          displayName: profile.name,
          avatarUrl: profile.profile_image_url,
          bio: profile.description,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          tokenExpiresAt,
          followerCount: profile.public_metrics?.followers_count ?? 0,
          followingCount: profile.public_metrics?.following_count ?? 0,
          tweetCount: profile.public_metrics?.tweet_count ?? 0,
          listedCount: profile.public_metrics?.listed_count ?? 0,
          isActive: true,
          lastSyncedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(twitterAccounts.id, profile.id));
    } else {
      // Create new account
      await db.insert(twitterAccounts).values({
        id: profile.id,
        userId,
        username: profile.username,
        displayName: profile.name,
        avatarUrl: profile.profile_image_url,
        bio: profile.description,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt,
        followerCount: profile.public_metrics?.followers_count ?? 0,
        followingCount: profile.public_metrics?.following_count ?? 0,
        tweetCount: profile.public_metrics?.tweet_count ?? 0,
        listedCount: profile.public_metrics?.listed_count ?? 0,
        isActive: true,
      });
    }

    // Trigger initial sync
    try {
      await inngest.send({
        name: "twitter/sync.account",
        data: { accountId: profile.id, userId },
      });
    } catch (err) {
      console.error("Failed to queue sync:", err);
    }

    // Clear cookies and redirect
    const response = NextResponse.redirect(
      `${APP_URL}/dashboard/settings?twitter=connected`
    );
    response.cookies.delete("twitter_oauth_state");
    response.cookies.delete("twitter_code_verifier");

    return response;
  } catch (error) {
    console.error("Twitter callback error:", error);
    return NextResponse.redirect(`${APP_URL}/dashboard/settings?error=unknown`);
  }
}
