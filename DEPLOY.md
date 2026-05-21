# Deployment Guide

Deploy **Habitly** with Vercel (frontend) + Render (backend) + MongoDB Atlas.

## Step 1 — Push to GitHub

```bash
cd habit-tracker
git init
git add .
git commit -m "Initial commit — Habitly v1.0"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/habitly.git
git push -u origin main
```

## Step 2 — Deploy Backend to Render

1. Go to [render.com](https://render.com) → sign up with GitHub
2. **New +** → **Web Service**
3. Connect your repository
4. Settings:
   - **Name:** `habitly-api`
   - **Root Directory:** `backend`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Environment variables (from your local `backend/.env`):

   | Key | Notes |
   |-----|--------|
   | `MONGO_URI` | MongoDB Atlas connection string |
   | `JWT_SECRET` | Min 32 characters |
   | `JWT_EXPIRES_IN` | e.g. `7d` |
   | `CLIENT_URL` | Your Vercel URL (add after step 3) |
   | `GOOGLE_CLIENT_ID` | Google Cloud Console |
   | `GOOGLE_CLIENT_SECRET` | Google Cloud Console |
   | `VAPID_PUBLIC_KEY` | Web push |
   | `VAPID_PRIVATE_KEY` | Web push |
   | `VAPID_EMAIL` | e.g. `mailto:you@email.com` |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Optional email |
   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Avatar uploads |
   | `NODE_ENV` | `production` |

6. Create Web Service → wait for deploy
7. Copy your API URL, e.g. `https://habitly-api.onrender.com`
8. Verify: `curl https://habitly-api.onrender.com/health`

> Free tier sleeps after ~15 minutes of inactivity; first request may take 30–60s to wake.

## Step 3 — Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → import GitHub repo
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
3. Environment variables:

   | Key | Value |
   |-----|--------|
   | `VITE_API_URL` | `https://habitly-api.onrender.com/api` |
   | `VITE_GOOGLE_CLIENT_ID` | Same as backend Google client |
   | `VITE_VAPID_PUBLIC_KEY` | Same as backend VAPID public key |
   | `VITE_CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |

4. Deploy → copy URL, e.g. `https://habitly.vercel.app`

## Step 4 — Connect Frontend & Backend

1. **Render** → `habitly-api` → Environment → set `CLIENT_URL` to your Vercel URL (no trailing slash)
2. **Google Cloud Console** → OAuth client:
   - **Authorized JavaScript origins:** `https://habitly.vercel.app`, `http://localhost:3000`
   - No redirect URI needed for `@react-oauth/google` token flow
3. Redeploy Render (or wait for auto-redeploy after env change)
4. Redeploy Vercel if you changed env vars

## Step 5 — Verify Production

- [ ] `https://your-api.onrender.com/health` returns `{ "status": "ok" }`
- [ ] Landing page loads on Vercel
- [ ] Sign up / log in works
- [ ] Create a habit → dashboard loads
- [ ] Stats → weekly comparison shows hover breakdown
- [ ] `/leaderboard` loads (public)
- [ ] Settings → upload profile photo (Cloudinary)
- [ ] Enable notifications (HTTPS required for push)

## Troubleshooting

| Issue | Fix |
|-------|-----|
| CORS errors | Set `CLIENT_URL` on Render to exact Vercel origin |
| API 502 on first load | Render waking from sleep — retry after ~30s |
| Google login fails | Add Vercel URL to authorized origins |
| Push notifications fail | Site must be HTTPS; VAPID keys must match frontend env |
