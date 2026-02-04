# Bug Hunters – Kanal 2k26

A fully automated, multi-language debugging contest platform. Students fix buggy code across three progressive rounds while the system handles bug injection, test-case generation, sandboxed execution, and scoring — all without manual intervention.

---

## 📐 Architecture at a Glance

```
┌─────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                     │
│  Landing → Registration → Contest Editor → Results      │
│  Admin Login → Dashboard (Rounds / Questions / Scores)  │
└──────────────────────┬──────────────────────────────────┘
                       │  HTTP / REST
┌──────────────────────▼──────────────────────────────────┐
│                   BACKEND (Express)                       │
│  ┌───────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Student   │  │ Admin       │  │ Services         │   │
│  │ Routes    │  │ Routes      │  │ • Bug Injection  │   │
│  └───────────┘  └─────────────┘  │ • Test Gen       │   │
│                                  │ • Execution      │   │
│                                  │ • Scoring        │   │
│                                  │ • Distribution   │   │
│                                  └──────────────────┘   │
└──────────────────────┬──────────────────────────────────┘
                       │
       ┌───────────────┼───────────────┐
       ▼               ▼               ▼
  ┌─────────┐   ┌─────────┐    ┌──────────────┐
  │ MongoDB │   │ Docker  │    │ Sandbox imgs │
  │         │   │ Engine  │    │ gcc / openjdk│
  │ Students│   │         │    │ python       │
  │ Questions│  │ compile │    └──────────────┘
  │ Submissions│ │ & run   │
  └─────────┘   └─────────┘
```

---

## 📁 Project Structure

```
contest-platform/
├── .env                          # Environment variables
├── docker-compose.yml            # Full stack orchestration
├── package.json                  # Root (concurrently)
│
├── backend/
│   ├── server.js                 # Express entry point
│   ├── package.json
│   ├── Dockerfile
│   ├── config/
│   │   └── database.js           # Mongoose connection
│   ├── middleware/
│   │   └── authMiddleware.js     # JWT verification
│   ├── models/
│   │   ├── Student.js            # Student schema
│   │   ├── Question.js           # Question schema
│   │   ├── Submission.js         # Submission schema
│   │   └── RoundConfig.js        # Timer config schema
│   ├── routes/
│   │   ├── adminRoutes.js        # All /api/admin/* endpoints
│   │   └── studentRoutes.js      # All /api/student/* endpoints
│   └── services/
│       ├── bugInjectionService.js      # Mutates correct code → buggy
│       ├── testCaseGenerationService.js # Runs correct code to produce expected outputs
│       ├── executionService.js         # Docker sandbox runner
│       ├── scoringService.js           # Evaluates submission vs test cases
│       └── questionDistributionService.js # Shuffles & assigns questions
│
├── frontend/
│   ├── package.json
│   ├── Dockerfile
│   └── src/
│       ├── index.js              # React entry
│       ├── App.js                # Router
│       ├── utils/
│       │   └── api.js            # Axios instance
│       ├── styles/
│       │   └── global.css        # Theme & reset
│       └── pages/
│           ├── LandingPage.js/.css
│           ├── RegistrationPage.js/.css
│           ├── ContestPage.js/.css
│           ├── AdminLogin.js/.css
│           └── AdminDashboard.js/.css
│
└── scripts/
    └── pull-sandbox-images.sh    # Pre-pulls Docker sandbox images
```

---

## 🚀 Quick Setup (Local Development)

### Prerequisites
- **Node.js** ≥ 18
- **MongoDB** (local or Atlas)
- **Docker Desktop** (running)

### Step 1 – Install dependencies
```bash
cd contest-platform
npm install                    # root devDeps (concurrently)
cd backend  && npm install     # backend deps
cd ../frontend && npm install  # frontend deps
```

### Step 2 – Configure environment
Edit `contest-platform/.env` with your MongoDB URI and desired credentials.
Copy `.env` into `backend/` as well (or the backend will read from the project root via dotenv).

### Step 3 – Pull sandbox Docker images (one-time)
```bash
cd contest-platform
bash scripts/pull-sandbox-images.sh
```

### Step 4 – Start services
```bash
# Terminal 1 – MongoDB (if running locally)
mongod

# Terminal 2 – Backend
cd backend && npm run dev      # uses nodemon for auto-reload

# Terminal 3 – Frontend
cd frontend && npm start       # React dev server on :3000
```

Or use Docker Compose for everything at once:
```bash
cd contest-platform
docker-compose up -d
```

---

## 🔗 API Reference

### Admin Endpoints (require JWT)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/admin/login` | Authenticate → returns JWT |
| POST | `/api/admin/rounds/config` | Set timer for a round |
| GET | `/api/admin/rounds/config` | Get all round timers |
| POST | `/api/admin/questions` | Upload a question (auto bug + tests) |
| GET | `/api/admin/questions` | List questions (filter by round/language) |
| DELETE | `/api/admin/questions/:id` | Delete a question |
| GET | `/api/admin/dashboard` | Full score dashboard |
| GET | `/api/admin/export-excel` | Download results as .xlsx |

### Student Endpoints (no auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/student/register` | Register with info + language |
| GET | `/api/student/:roll/status` | Get current round & scores |
| POST | `/api/student/:roll/start-round` | Start round timer |
| GET | `/api/student/:roll/questions/:round` | Get assigned questions |
| POST | `/api/student/:roll/submit` | Submit code (auto-scored) |
| POST | `/api/student/:roll/complete-round` | Finish round → unlock next |

---

## 🧠 How Bug Injection Works

The `bugInjectionService` applies one of these mutations randomly:

| Mutation | Example |
|----------|---------|
| Off-by-one | `i < n` → `i < n + 1` |
| Wrong comparison | `==` → `!=` in if-statements |
| Operator swap | `+` → `-` in arithmetic |
| Wrong return | Negates or zeroes the return value |
| Wrong index | `arr[i]` → `arr[i - 1]` |

Each language has its own mutation catalogue tuned to common patterns.

---

## 📊 Scoring Table

| Result | Points |
|--------|--------|
| All test cases pass | 30 |
| Some test cases pass | 15 |
| Runs but wrong output | 5 |
| Compile / runtime error | 0 |

**Final Score** = (Round 1 + Round 2 + Round 3) / 3

---

## 🏆 Round Progression

| Round | Questions | Unlock Condition |
|-------|-----------|------------------|
| 1 | 4 | Available on registration |
| 2 | 3 | Round 1 completed |
| 3 | 2 | Round 2 completed |

---

## 🛡️ Security Notes

- **correctCode** and **testCases** are stored in MongoDB but **never** sent to the frontend (excluded via `.select('-correctCode -testCases')`)
- Code execution runs in Docker containers with **no network access**, strict memory/CPU limits, and a timeout
- Admin routes are protected by **JWT** (8-hour expiry)
- Student identity is tied to their unique roll number (no password needed)

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URI` | `mongodb://localhost:27017/debugcontest` | MongoDB connection string |
| `PORT` | `5000` | Backend server port |
| `ADMIN_USERNAME` | `admin` | Admin login username |
| `ADMIN_PASSWORD` | `admin123` | Admin login password |
| `JWT_SECRET` | (set a random value in prod) | JWT signing secret |
| `DOCKER_TIMEOUT_SECONDS` | `15` | Max execution time per container |
| `DOCKER_MEMORY_LIMIT` | `256m` | Container memory cap |
| `DOCKER_CPU_LIMIT` | `0.5` | Container CPU cap (cores) |
| `CLIENT_URL` | `http://localhost:3000` | CORS allowed origin |
