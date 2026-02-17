# CryptoScope 🔭

**The CRM built for Crypto Creators** — Track your Twitter growth, manage creator relationships, monitor competitors, and automate your community with AI agents.

![CryptoScope Dashboard](https://via.placeholder.com/1200x600/1f2937/f97316?text=CryptoScope+Dashboard)

## Features

### 📊 Twitter Analytics
- Real-time follower growth tracking
- Engagement rate analysis
- Impression and reach metrics
- Best posting time recommendations
- Viral content detection

### 👥 Creator CRM
- Contact management with Twitter integration
- Deal pipeline (Idea → Outreach → Agreed → Live → Completed)
- Activity timeline per contact
- Import contacts from Twitter followers
- Tags, filters, and search

### 🔍 Competitor Intelligence
- Track up to 20 competitors
- Side-by-side comparison
- Growth spike alerts
- Content strategy insights

### 🤖 AI Agent Automation
- Connect Moltbook agents
- Schedule tweets and threads
- Auto-reply to mentions
- Keyword monitoring
- DM campaigns

### ✍️ Content Studio
- AI tweet generator (5 tones: hype, educational, controversial, community, alpha)
- Thread builder with hooks and CTAs
- Content calendar
- Best posting time scheduler

### 🔔 Real-time Alerts
- Follower milestone notifications
- Viral tweet detection
- Negative sentiment spikes
- Competitor growth alerts
- Email, Discord, Telegram delivery

### 💳 Flexible Billing
- Stripe (card payments)
- BTC & SOL via NOWPayments
- Free, Pro ($29/mo), Agency ($99/mo) plans

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Neon serverless)
- **ORM**: Drizzle ORM
- **Auth**: Clerk
- **API**: tRPC
- **Jobs**: Inngest
- **Payments**: Stripe + NOWPayments
- **Email**: Resend
- **UI**: shadcn/ui + Tailwind CSS
- **Charts**: Recharts

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (we recommend [Neon](https://neon.tech))
- Clerk account for auth
- Twitter API credentials (for data sync)

### Environment Variables

Create `.env.local`:

```bash
# Database (Neon)
DATABASE_URL="postgresql://..."
DATABASE_URL_UNPOOLED="postgresql://..." # For migrations

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# Stripe
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_MONTHLY_PRICE_ID="price_..."
STRIPE_PRO_ANNUAL_PRICE_ID="price_..."
STRIPE_AGENCY_MONTHLY_PRICE_ID="price_..."
STRIPE_AGENCY_ANNUAL_PRICE_ID="price_..."

# NOWPayments (BTC/SOL)
NOWPAYMENTS_API_KEY="..."
NOWPAYMENTS_IPN_SECRET="..."

# Twitter API (for data sync)
TWITTER_CLIENT_ID="..."
TWITTER_CLIENT_SECRET="..."

# Inngest (background jobs)
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# Email (Resend)
RESEND_API_KEY="re_..."
EMAIL_FROM="CryptoScope <alerts@yourdomain.com>"

# App
NEXT_PUBLIC_APP_URL="https://app.cryptoscope.ai"
```

### Installation

```bash
# Install dependencies
npm install

# Apply database schema
npx drizzle-kit push:pg

# Run development server
npm run dev
```

### Deploy to Vercel

1. Push to GitHub
2. Connect repo to Vercel
3. Add all environment variables
4. Deploy!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/AmentiAI/cryptoscope)

## API Reference

All API endpoints require authentication:
```
Authorization: Bearer cs_live_xxxxx
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/accounts` | List connected Twitter accounts |
| GET | `/api/v1/analytics/:accountId` | Get account analytics |
| GET | `/api/v1/mentions/:accountId` | Get recent mentions |
| POST | `/api/v1/crm/contacts` | Create CRM contact |
| GET | `/api/v1/alerts` | Get active alerts |

## Webhooks

### Stripe
`POST /api/webhooks/stripe`

### NOWPayments
`POST /api/webhooks/nowpayments`

### Inngest
`POST /api/inngest`

## Database Schema

Key tables:
- `users` - Clerk user profiles
- `subscriptions` - Plan subscriptions
- `crypto_payments` - BTC/SOL payments
- `twitter_accounts` - Connected Twitter accounts
- `twitter_snapshots` - Daily stats snapshots
- `tweets` - Tweet data
- `mentions` - Mentions with sentiment
- `competitors` - Tracked competitors
- `agents` - Connected Moltbook agents
- `agent_tasks` - Agent task queue
- `crm_contacts` - CRM contacts
- `crm_deals` - Deal pipeline
- `crm_activities` - Activity timeline

## Pricing

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 1 account, 7-day history, basic analytics |
| Pro | $29/mo | 3 accounts, 90-day history, full analytics, 1 agent |
| Agency | $99/mo | Unlimited accounts, unlimited history, 10 agents, team |

**Accept BTC & SOL** — 33% discount on annual plans

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📧 Email: support@cryptoscope.ai
- 🐦 Twitter: [@cryptoscope_](https://twitter.com/cryptoscope_)
- 💬 Discord: [Join our community](https://discord.gg/cryptoscope)

---

Built with ❤️ for the crypto creator community.
