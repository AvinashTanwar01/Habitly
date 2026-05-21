# Habitly 🌱

> Build habits that actually stick.

A full-stack habit tracker with streaks, personal constellations, group accountability, and a public leaderboard.

## Tech Stack

- **Frontend:** React + Vite + Tailwind CSS → [Vercel](https://vercel.com)
- **Backend:** Node.js + Express → [Render](https://render.com)
- **Database:** MongoDB Atlas
- **Images:** Cloudinary
- **Auth:** JWT + Google OAuth
- **Notifications:** Web Push API + VAPID

## Local Development

### Prerequisites

- Node.js 18+
- MongoDB (Atlas or local)

### Setup

```bash
git clone https://github.com/YOURUSERNAME/habitly.git
cd habitly

# Backend
cd backend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev

# Frontend (new terminal)
cd frontend
cp .env.example .env
# Fill in your .env values
npm install
npm run dev
```

Open http://localhost:3000

## Deployment

See [DEPLOY.md](./DEPLOY.md) for step-by-step Vercel + Render instructions.

## Environment Variables

- Backend: `backend/.env.example`
- Frontend: `frontend/.env.example`
