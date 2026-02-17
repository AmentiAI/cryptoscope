/**
 * Email service using Resend
 * 
 * Environment variables:
 *   RESEND_API_KEY - Your Resend API key
 *   EMAIL_FROM - Sender email (e.g., "CryptoScope <alerts@cryptoscope.ai>")
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const EMAIL_FROM = process.env.EMAIL_FROM ?? "CryptoScope <noreply@cryptoscope.ai>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.cryptoscope.ai";

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[Email] RESEND_API_KEY not set, skipping email");
    return false;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: Array.isArray(params.to) ? params.to : [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("[Email] Failed to send:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Email] Error:", error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Email templates
// ─────────────────────────────────────────────────────────────────────────────

export async function sendFollowerMilestoneEmail(
  to: string,
  username: string,
  milestone: number
) {
  const emoji = milestone >= 100000 ? "🎉🎉🎉" : milestone >= 10000 ? "🎉🎉" : "🎉";
  
  await sendEmail({
    to,
    subject: `${emoji} You hit ${milestone.toLocaleString()} followers!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f97316; margin-bottom: 24px;">${emoji} Milestone Reached!</h1>
        <p style="font-size: 18px; color: #333;">
          Congratulations! <strong>@${username}</strong> just crossed <strong>${milestone.toLocaleString()} followers</strong>.
        </p>
        <p style="color: #666; margin-top: 16px;">
          Keep up the amazing work. Your community is growing!
        </p>
        <div style="margin-top: 32px;">
          <a href="${APP_URL}/dashboard" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Your Analytics →
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          CryptoScope - Analytics for Crypto Creators
        </p>
      </div>
    `,
  });
}

export async function sendViralTweetEmail(
  to: string,
  username: string,
  tweetId: string,
  likes: number,
  retweets: number
) {
  await sendEmail({
    to,
    subject: `🔥 Your tweet is going viral!`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f97316; margin-bottom: 24px;">🔥 Viral Alert!</h1>
        <p style="font-size: 18px; color: #333;">
          Your tweet is blowing up with <strong>${likes.toLocaleString()} likes</strong> and <strong>${retweets.toLocaleString()} retweets</strong>!
        </p>
        <div style="margin-top: 24px;">
          <a href="https://twitter.com/${username}/status/${tweetId}" style="background: #1da1f2; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Tweet on Twitter →
          </a>
        </div>
        <p style="color: #666; margin-top: 24px;">
          This is a great time to engage with replies and keep the momentum going!
        </p>
        <div style="margin-top: 16px;">
          <a href="${APP_URL}/dashboard/analytics" style="color: #f97316; text-decoration: underline;">
            See full analytics on CryptoScope
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          CryptoScope - Analytics for Crypto Creators
        </p>
      </div>
    `,
  });
}

export async function sendNegativeSentimentAlertEmail(
  to: string,
  username: string,
  count: number,
  hours: number
) {
  await sendEmail({
    to,
    subject: `⚠️ Negative sentiment spike detected`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #ef4444; margin-bottom: 24px;">⚠️ Sentiment Alert</h1>
        <p style="font-size: 18px; color: #333;">
          <strong>@${username}</strong> received <strong>${count} negative mentions</strong> in the last ${hours} hours.
        </p>
        <p style="color: #666; margin-top: 16px;">
          You may want to review recent mentions and address any concerns from your community.
        </p>
        <div style="margin-top: 32px;">
          <a href="${APP_URL}/dashboard/mentions" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Review Mentions →
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          CryptoScope - Analytics for Crypto Creators
        </p>
      </div>
    `,
  });
}

export async function sendWeeklyReportEmail(
  to: string,
  username: string,
  stats: {
    followerDelta: number;
    tweetCount: number;
    totalLikes: number;
    totalRetweets: number;
    mentionCount: number;
    topTweetUrl?: string;
  }
) {
  const followerChange = stats.followerDelta >= 0 
    ? `+${stats.followerDelta.toLocaleString()}`
    : stats.followerDelta.toLocaleString();
  
  await sendEmail({
    to,
    subject: `📊 Your weekly Twitter report for @${username}`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f97316; margin-bottom: 24px;">📊 Weekly Report</h1>
        <p style="font-size: 16px; color: #333; margin-bottom: 24px;">
          Here's how <strong>@${username}</strong> performed this week:
        </p>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <strong>Follower Change</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; color: ${stats.followerDelta >= 0 ? '#22c55e' : '#ef4444'};">
              <strong>${followerChange}</strong>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <strong>Tweets Posted</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
              ${stats.tweetCount}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <strong>Total Likes</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
              ${stats.totalLikes.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              <strong>Total Retweets</strong>
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">
              ${stats.totalRetweets.toLocaleString()}
            </td>
          </tr>
          <tr>
            <td style="padding: 12px;">
              <strong>Mentions</strong>
            </td>
            <td style="padding: 12px; text-align: right;">
              ${stats.mentionCount}
            </td>
          </tr>
        </table>

        ${stats.topTweetUrl ? `
          <p style="color: #666;">
            <strong>Top performing tweet:</strong><br/>
            <a href="${stats.topTweetUrl}" style="color: #f97316;">View on Twitter →</a>
          </p>
        ` : ''}

        <div style="margin-top: 32px;">
          <a href="${APP_URL}/dashboard/analytics" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Full Analytics →
          </a>
        </div>
        
        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          CryptoScope - Analytics for Crypto Creators<br/>
          <a href="${APP_URL}/dashboard/settings" style="color: #999;">Manage email preferences</a>
        </p>
      </div>
    `,
  });
}

export async function sendCompetitorSpikeEmail(
  to: string,
  competitorUsername: string,
  followerGain: number
) {
  await sendEmail({
    to,
    subject: `📈 Competitor @${competitorUsername} is growing fast`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #f97316; margin-bottom: 24px;">📈 Competitor Alert</h1>
        <p style="font-size: 18px; color: #333;">
          <strong>@${competitorUsername}</strong> gained <strong>+${followerGain.toLocaleString()} followers</strong> recently.
        </p>
        <p style="color: #666; margin-top: 16px;">
          Check out what content is working for them and consider adapting your strategy.
        </p>
        <div style="margin-top: 32px;">
          <a href="${APP_URL}/dashboard/competitors" style="background: #f97316; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Competitor Analysis →
          </a>
        </div>
        <p style="color: #999; font-size: 12px; margin-top: 40px;">
          CryptoScope - Analytics for Crypto Creators
        </p>
      </div>
    `,
  });
}
