# 🚀 DSA Tracker — Full Stack Algorithmic Problem Tracking & AI Code Evaluator

A comprehensive platform designed for tracking DSA (Data Structures & Algorithms) preparation, cohort management, live code execution, and real-time AI code analysis with Groq LLMs.

---

## ✨ Key Features

- 🎯 **LeetCode-Style Full-Window Code Editor**: Integrated Monaco editor with dark theme, syntax highlighting, starter code templates, test cases, and constraints.
- 🤖 **AI Code Evaluator (Groq + LangChain)**: Real-time code execution and analysis evaluating correctness, time/space complexity, and edge case handling with score scaling by difficulty.
- 🛡️ **Anti-Cheat Validation**: Intelligent verification ensuring submitted code directly addresses the specific problem statement.
- 📊 **Dynamic Multi-Dimensional Filters**: Filter problems by difficulty, solve status, assignment status, topic, and 8+ timeframe ranges (All Time, Today, Last 7/10/30 Days, Year, custom month/year).
- 👥 **Admin & User Dashboards**: Cohort progress monitoring, bulk problem publishing, user activity inspection, streak tracking, and leaderboard rankings.
- 🔒 **Secure Role-Based Auth**: Supabase authentication with tab-isolated session storage and auto-redirection.

---

## 🏗️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, Monaco Editor, Lucide Icons, Axios, React Router |
| **Backend API** | Node.js, Express, Supabase Client |
| **AI Evaluation Agent** | Python 3, FastAPI, LangChain, ChatGroq (`llama3-70b-8192`), Uvicorn |
| **Database & Auth** | Supabase (PostgreSQL, Row Level Security, Auth) |

---

## 📁 Project Structure

```
DSA_TRACKER/
├── Frontend/                 # React + Vite client application
│   ├── src/
│   │   ├── components/       # CodeEditor, Modals, UI components
│   │   ├── pages/            # UserDashboard, AdminDashboard, AuthPage, LandingPage
│   │   ├── api.js            # Axios client with auth interceptors
│   │   └── supabase.js       # Supabase client with sessionStorage
├── Backend/                  # Node.js + Express API server
│   ├── controllers/          # problemController, submissionController, adminController, authController
│   ├── middleware/           # auth.js (JWT authentication)
│   ├── routes/               # problemRoutes, adminRoutes, authRoutes
│   └── server.js             # Express app entry point
└── agent/                    # Python FastAPI AI evaluation service
    ├── evaluator.py          # Code execution engine + Groq prompt evaluation
    ├── main.py               # FastAPI server on port 5001
    ├── start.sh              # Setup & run script
    └── requirements.txt      # Python dependencies
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18+)
- **Python** (v3.10+)
- **Supabase** account
- **Groq API Key** ([console.groq.com](https://console.groq.com))

---

### 2. Environment Configuration

#### 🔹 `Frontend/.env`
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_URL=http://localhost:3000/api
```

#### 🔹 `Backend/.env`
```env
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

#### 🔹 `agent/.env`
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
```

---

### 3. Installation & Running Locally

Run each service in a separate terminal:

#### 🟢 Terminal 1: AI Agent Service (Port 5001)
```bash
cd agent
./start.sh
```
*Or manually:*
```bash
cd agent
python3 -m venv venv
./venv/bin/pip install -r requirements.txt
./venv/bin/uvicorn main:app --host 0.0.0.0 --port 5001 --reload
```

#### 🟢 Terminal 2: Node.js Backend (Port 3000)
```bash
cd Backend
npm install
node server.js
```

#### 🟢 Terminal 3: Frontend (Port 5173)
```bash
cd Frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🎯 Scoring & Difficulty System

The AI evaluator grades solutions from **0 to 10** based on algorithmic correctness and optimal complexity, which scales according to problem difficulty:

| Difficulty | Max Points | Formula |
|---|---|---|
| 🟢 **Easy** | **3 pts** | `round(quality / 10 × 3)` |
| 🟠 **Medium** | **6 pts** | `round(quality / 10 × 6)` |
| 🔴 **Hard** | **10 pts** | `round(quality / 10 × 10)` |

- **Re-submissions**: If a user re-submits with a better score, only the incremental difference is added. Re-submissions with equal/lower scores never duplicate or inflate total points.

---

## 🌐 Deployment Overview

- **Frontend**: Deploy on **Vercel** / **Netlify** (Root directory: `Frontend`, Output: `dist`)
- **Backend**: Deploy on **Render** / **Railway** (Root directory: `Backend`, Start: `node server.js`)
- **Agent**: Deploy on **Render** / **Railway** (Root directory: `agent`, Start: `uvicorn main:app --host 0.0.0.0 --port $PORT`)

---

## 📄 License
This project is licensed under the MIT License.
