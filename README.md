Here's the complete README — paste this into `README.md` at the root of your project:

```markdown
# Habitly 🌱

> Build habits that actually stick.

Habitly is a full-stack habit tracking web app with streaks, a public constellation leaderboard, group accountability, push notifications, and beautiful visualizations. Every user earns a star in the public sky — the longer your streak, the brighter you shine.

---

## Live Demo

- **App:** https://habitly-omega-cyan.vercel.app/
- **Leaderboard:** https://habitly-omega-cyan.vercel.app/leaderboard (public, no login needed)

---

## Features

### Personal Habit Tracking
- 3 habit types: **time-based**, **count-based**, **yes/no**
- Flexible scheduling: daily, weekdays, weekends, or custom days
- Streak protection — off-schedule days never break your streak
- Custom daily reset time per user
- Push notification reminders at your chosen time
- Current streak + longest streak per habit
- Completion history calendar (last 30 days)
- Habit constellation canvas — every completion lights up a star

### Dashboard
- Today's progress ring (live updates without refresh)
- This week view with completion dots
- Leaderboard spotlight (top 3 users)
- Upcoming habit reminders
- Daily motivational quotes

### Public Constellation Leaderboard
- Every user = one star in the sky
- Streak < 14 days = small faint star
- Streak 14–60 days = medium star
- Streak 60+ days = large glowing star, forms named constellation
- Constellations: The Scholars, The Athletes, The Seekers, The Wanderers
- Hover any star to see name + streak
- Fully public — no login needed

### Group Mode
- Create groups (max 3 per month)
- Max 15 members per group
- Leader assigns tasks with deadlines
- Invite members by username or email
- Auto reminders: 3 days left, 1 day left, due today, overdue
- Leader gets notified when a member completes early ⚡
- Group notes visible to everyone or specific members

### Auth & Account
- Email + password signup/login
- Google OAuth sign in
- Forgot password + email reset flow
- Profile picture upload (Cloudinary)
- Change display name, reset time, password
- Delete account (removes all data)

### Notifications
- Web Push API with VAPID keys
- Habit reminders at your set time
- Evening nudge if habits incomplete
- Group task deadline alerts
- In-app notification bell with history

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcrypt + Google OAuth |
| Images | Cloudinary |
| Email | Brevo HTTP API |
| Notifications | Web Push API + VAPID + Service Workers |
| Scheduling | node-cron |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |
| Database Host | MongoDB Atlas |

---

## Project Structure

```
habitly/
├── frontend/                  # React + Vite app
│   ├── src/
│   │   ├── pages/             # 15 pages (Dashboard, Habits, Stats, etc.)
│   │   ├── components/        # Reusable UI + layout components
│   │   │   ├── charts/        # Constellation canvases, progress ring
│   │   │   ├── groups/        # Group cards, task cards, member cards
│   │   │   ├── habits/        # Habit card, habit form
│   │   │   ├── layout/        # Navbar, AppHeader, PageContent
│   │   │   └── ui/            # Avatar, Button, Input, Toast
│   │   ├── context/           # AuthContext, ToastContext
│   │   ├── hooks/             # useHabits, useHabitReminders, usePageTitle
│   │   ├── services/          # API service layer (habit, auth, stats, group, task)
│   │   └── utils/             # streakUtils, dateUtils, constellationCanvas
│   ├── public/
│   │   └── sw.js              # Service worker for push notifications
│   └── vercel.json            # Vercel SPA routing config
│
├── backend/                   # Node.js + Express API
│   ├── src/
│   │   ├── config/            # MongoDB + Cloudinary config
│   │   ├── controllers/       # Auth, habits, groups, tasks, leaderboard
│   │   ├── middleware/        # Auth guard, error handler, DB check
│   │   ├── models/            # 9 Mongoose models
│   │   ├── routes/            # All API routes
│   │   └── utils/             # streakUtils, scheduler, emailUtils, pushUtils
│   └── server.js
│
├── .gitignore
├── README.md
└── DEPLOY.md
```

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free) or local MongoDB
- Cloudinary account (free)
- Brevo account for emails (free, optional)

### 1. Clone the repo
```bash
git clone https://github.com/AvinashTanwar/habitly.git
cd habitly
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
```

Fill in `backend/.env`:
```env
PORT=5000
MONGO_URI=your_mongodb_atlas_uri
JWT_SECRET=any_random_long_string
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
GOOGLE_CLIENT_ID=optional
GOOGLE_CLIENT_SECRET=optional
VAPID_PUBLIC_KEY=generate_with_npx_web-push_generate-vapid-keys
VAPID_PRIVATE_KEY=generated_private_key
VAPID_EMAIL=mailto:your@email.com
BREVO_API_KEY=optional_for_emails
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
npm install
npm run dev
```

Backend runs on http://localhost:5000

### 3. Frontend setup
```bash
cd frontend
cp .env.example .env
```

Fill in `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=optional
VITE_VAPID_PUBLIC_KEY=same_as_backend_public_key
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
```

```bash
npm install
npm run dev
```

Frontend runs on http://localhost:3000

### 4. Generate VAPID keys (for push notifications)
```bash
npx web-push generate-vapid-keys
```
Paste both keys into backend `.env` and the public key into frontend `.env`.

---

## API Overview

### Auth `/api/auth`
| Method | Route | Description |
|---|---|---|
| POST | /signup | Create account |
| POST | /login | Login with email + password |
| POST | /google | Google OAuth login |
| GET | /me | Get current user |
| PUT | /profile | Update display name / reset time |
| PUT | /password | Change password |
| POST | /forgot-password | Send reset email |
| POST | /reset-password | Reset with token |
| POST | /upload-avatar | Upload profile picture |
| DELETE | /me | Delete account + all data |

### Habits `/api/habits`
| Method | Route | Description |
|---|---|---|
| GET | / | All habits |
| GET | /today | Today's habits with completion status |
| GET | /:id | Single habit + 60 days completions |
| POST | / | Create habit |
| PUT | /:id | Update habit |
| DELETE | /:id | Delete habit + history |
| POST | /:id/complete | Mark complete + log amount |
| POST | /:id/uncomplete | Unmark complete |
| PUT | /:id/archive | Archive habit |
| PUT | /archive-all | Archive all habits |

### Stats `/api/stats`
| Method | Route | Description |
|---|---|---|
| GET | /leaderboard | Public leaderboard (no auth) |
| GET | /streak/:id | Streak for a habit |
| GET | /weekly | This week vs last week data |
| GET | /summary | Total habits, completions, best streak |

### Groups `/api/groups`
| Method | Route | Description |
|---|---|---|
| GET | / | All groups user is in |
| POST | / | Create group (max 3/month) |
| GET | /:id | Group details + members + tasks |
| POST | /:id/invite/email | Send email invite |
| POST | /:id/invite/username | Invite by username |
| POST | /join/:code | Join via invite code |
| DELETE | /:id/leave | Leave group |

### Tasks `/api/tasks`
| Method | Route | Description |
|---|---|---|
| GET | /group/:groupId | All tasks for group |
| POST | /group/:groupId | Create task (leader only) |
| PUT | /:id | Update task (leader only) |
| DELETE | /:id | Delete task (leader only) |
| POST | /:id/complete | Complete task |

---

## Deployment

See [DEPLOY.md](./DEPLOY.md) for full step-by-step deployment guide.

**Quick summary:**
- Frontend → [Vercel](https://vercel.com) (connect GitHub repo, set root to `frontend`)
- Backend → [Render](https://render.com) (connect GitHub repo, set root to `backend`)
- Database → [MongoDB Atlas](https://mongodb.com/atlas) (free M0 cluster)

---

## Environment Variables Reference

### Backend
| Variable | Required | Description |
|---|---|---|
| PORT | Yes | Server port (5000) |
| MONGO_URI | Yes | MongoDB Atlas connection string |
| JWT_SECRET | Yes | Secret for signing JWTs |
| JWT_EXPIRES_IN | Yes | Token expiry (7d) |
| CLIENT_URL | Yes | Frontend URL for CORS |
| GOOGLE_CLIENT_ID | No | Google OAuth client ID |
| GOOGLE_CLIENT_SECRET | No | Google OAuth client secret |
| VAPID_PUBLIC_KEY | No | Web push public key |
| VAPID_PRIVATE_KEY | No | Web push private key |
| VAPID_EMAIL | No | Web push contact email |
| BREVO_API_KEY | No | Brevo email API key |
| CLOUDINARY_CLOUD_NAME | No | Cloudinary cloud name |
| CLOUDINARY_API_KEY | No | Cloudinary API key |
| CLOUDINARY_API_SECRET | No | Cloudinary API secret |

### Frontend
| Variable | Required | Description |
|---|---|---|
| VITE_API_URL | Yes | Backend API URL |
| VITE_GOOGLE_CLIENT_ID | No | Google OAuth client ID |
| VITE_VAPID_PUBLIC_KEY | No | Web push public key |
| VITE_CLOUDINARY_CLOUD_NAME | No | Cloudinary cloud name |

---

## Key Business Rules

- Streaks only count on scheduled days — off days don't break them
- Max 3 groups created per user per calendar month
- Max 15 members per group
- Leaderboard is fully public — no login needed
- Group tasks trigger push notifications to assigned members
- Leader notified when member completes task before deadline
- Habit reminders only sent if habit not already done today
- Archive hides habits but keeps all history
- Delete removes habit + all completion history permanently

---

## License

MIT — free to use, modify and deploy.

---

## Author

Built by **Avinash Tanwar**
- GitHub: [@AvinashTanwar](https://github.com/AvinashTanwar)
- LinkedIn: [tanwaravinash352](https://linkedin.com/in/tanwaravinash352)
```

Replace the GitHub and LinkedIn links with your actual ones. Save this as `README.md` in the root of your project folder.