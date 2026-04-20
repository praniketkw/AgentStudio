# Deployment Guide

## Local Development

```bash
# 1. Copy env file
cp .env.example .env.local

# 2. Fill in your Neon Postgres URLs in .env.local

# 3. Push the schema to the database
npm run db:push

# 4. Start the dev server
npm run dev
```

---

## Deploy to Vercel + Neon (Free Tier)

### Step 1 — Create a Neon Database
1. Go to https://console.neon.tech and sign up (free)
2. Create a new project
3. Copy the **Connection string** from the dashboard
   - You need the **pooled** connection URL for `DATABASE_URL`
   - And the **direct** connection URL for `DIRECT_URL`

### Step 2 — Deploy to Vercel
1. Push this repo to GitHub
2. Go to https://vercel.com → New Project → Import your repo
3. Add these environment variables in Vercel project settings:
   - `DATABASE_URL` — your Neon pooled connection string
   - `DIRECT_URL` — your Neon direct connection string
4. Click Deploy

### Step 3 — Run the database migration
After the first deploy, run the schema push via Vercel CLI or locally pointing at Neon:

```bash
# In your local terminal with .env.local pointing at Neon:
npm run db:push
```

Or add `prisma db push` to the build command in Vercel project settings:
```
prisma generate && prisma db push && next build
```

### Step 4 — Use the App
- Visit your Vercel URL
- Enter your Anthropic API key when prompted (stored in your browser only)
- Start building agents!

---

## Notes
- The Anthropic API key is **never** stored on the server — only in the user's browser localStorage
- Each user provides their own API key
- The database stores only agent definitions (name, description, system prompt, model, tools, knowledge sources)
