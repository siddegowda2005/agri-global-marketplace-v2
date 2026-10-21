# Deploying AgriGlobal V2 (beginner walkthrough)

Everything in the app is already prepared for production. You only need to create the
free accounts below and paste a few values. **Never paste a password or connection string
into a file that gets committed to Git.**

Layout after deployment:

| Piece | Where | Free tier |
|---|---|---|
| React + Vite frontend | Vercel | Yes (Hobby) |
| Node + Express API | Render web service | Yes (Free) |
| Python FastAPI AI service | Render web service | Yes (Free) |
| Database | MongoDB Atlas | Yes (M0) |

Uploaded crop images are stored in MongoDB (GridFS), so they survive redeploys.
The two AI models (`ai-service/app/models/*.joblib`, ~6 MB + ~7 MB) are committed to Git
and loaded at startup — nothing has to be trained on the server.

---

## 0. What is already done for you

- `render.yaml` — creates both Render services (free plan) with the right start commands.
- `frontend/vercel.json` — makes refreshing any page work (SPA rewrites to `index.html`).
- `backend` reads `PORT` from the host, allows CORS from `CLIENT_ORIGIN`, and reads the AI
  service URL from `AI_SERVICE_URL`.
- `frontend` reads the API URL from `VITE_API_URL`.
- `ai-service/requirements.txt` is pinned and `ai-service/.python-version` selects Python 3.10.11.
- `UPLOAD_STORAGE=gridfs` switches image storage to MongoDB (set automatically in production).
- `backend/src/scripts-migrate-to-cloud.js` copies your local data + images to Atlas.
- The admin account is never created automatically, and the DEMO seeder refuses to run
  against a database whose name does not contain "demo" (so fake records cannot become
  "verified buyers" in production).

---

## 1. Create the free accounts

1. GitHub — https://github.com/signup
2. MongoDB Atlas — https://www.mongodb.com/cloud/atlas/register
3. Render — https://dashboard.render.com/register (sign in with GitHub)
4. Vercel — https://vercel.com/signup (sign in with GitHub)

---

## 2. MongoDB Atlas (database)

1. Create a **free M0** cluster (any region close to you).
2. **Database Access** → Add New Database User → username + password → role *Read and write to any database*.
3. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`).
   (Render's free tier has no fixed outbound IP, so this is required. The DB is still
   protected by the username/password.)
4. **Connect** → *Drivers* → copy the string. It looks like:
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/agri_marketplace?retryWrites=true&w=majority`
5. Replace `<password>` with your real password and keep `/agri_marketplace` as the database name.

Keep this string handy; it is your `MONGODB_URI`.

---

## 3. Put the code on GitHub

From the project folder (`agri-global-marketplace`):

```bash
git init
git add .
git commit -m "AgriGlobal V2 ready for deployment"
git branch -M main
git remote add origin https://github.com/<your-username>/agri-global-marketplace.git
git push -u origin main
```

`.gitignore` already excludes `.env`, `node_modules/` and `dist/`. The trained model files
**are** included on purpose.

---

## 4. Deploy the two backends on Render

1. Render dashboard → **New** → **Blueprint**.
2. Pick your GitHub repository. Render reads `render.yaml` and shows two services:
   `agri-backend` and `agri-ai`.
3. Before clicking Apply, note that these values are asked for (the `agri-backend` service):
   - `MONGODB_URI` → the Atlas string from step 2.
   - `CLIENT_ORIGIN` → leave a placeholder for now, e.g. `http://localhost:5173`; you will
     set the real Vercel URL in step 6.
   - `AI_SERVICE_URL` → leave blank for now; you will fill it in step 5.
   - `JWT_SECRET` → Render generates a strong value automatically.
4. Click **Apply**. Wait for both services to say **Live**.
5. Copy the two URLs Render shows, e.g.
   - API: `https://agri-backend.onrender.com`
   - AI:  `https://agri-ai.onrender.com`
6. Go to `agri-backend` → **Environment** → set
   `AI_SERVICE_URL = https://agri-ai.onrender.com` → **Save** (it redeploys automatically).

Check both are healthy in a browser:
- `https://agri-ai.onrender.com/health` → `{"status":"ok","models":{"price_model":{"loaded":true...`
- `https://agri-backend.onrender.com/api/health` → `{"status":"ok"}`

---

## 5. Deploy the frontend on Vercel

1. Vercel dashboard → **Add New…** → **Project** → import the same GitHub repository.
2. **Root Directory** → `frontend`.
3. Framework preset: Vite (detected automatically). Build `npm run build`, output `dist`.
4. **Environment Variables** → add:
   - `VITE_API_URL` = `https://agri-backend.onrender.com` (no trailing slash)
5. **Deploy**. Copy your site URL, e.g. `https://agri-global.vercel.app`.

---

## 6. Tell the backend to trust the frontend (CORS)

1. Render → `agri-backend` → **Environment**.
2. Set `CLIENT_ORIGIN` = `https://agri-global.vercel.app`
   (several URLs are allowed, comma-separated; the Vercel preview URLs can be added too).
3. **Save** and wait for the redeploy.

---

## 7. Load your real data into Atlas

This copies every collection from your local database and uploads your local images into
GridFS. It never deletes anything, and it skips records tagged as `SAMPLE / DEMO DATA`.

Run from the `backend` folder (PowerShell):

```powershell
$env:SOURCE_MONGODB_URI="mongodb://127.0.0.1:27017/agri_marketplace"
$env:MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/agri_marketplace"
npm run migrate:cloud
```

(On macOS/Linux use `SOURCE_MONGODB_URI=... MONGODB_URI=... npm run migrate:cloud`.)

Then create your admin account (choose your own strong password, 12+ characters):

```powershell
$env:MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/agri_marketplace"
$env:ADMIN_EMAIL="you@example.com"
$env:ADMIN_PASSWORD="a-long-strong-password"
npm run seed:admin
```

> Do **not** run `npm run seed:demo` against the Atlas database. It exists for local
> demonstration only and writes fictional records (it refuses to run unless the database
> name contains "demo").

---

## 8. Check it works

Open your Vercel URL and try: register, log in, browse crop listings, Global Buyers,
Indian Exporters, Buyer Finder, send an enquiry, and run an AI price prediction.
Refreshing a sub-page (e.g. `/global-buyers`) must keep working — that is what
`frontend/vercel.json` fixes.

---

## 9. Things that are free-tier limits (not bugs)

- Render free web services **sleep after ~15 minutes** of inactivity. The first request
  afterwards can take 30–60 seconds to wake them. Nothing is lost; it just feels slow once.
- Render free services rebuild on every push; images live in MongoDB so they survive.
- Atlas M0 gives 512 MB of storage — plenty for this project.
- Free hosts do not provide a custom domain with HTTPS. Use the `.onrender.com` and
  `.vercel.app` URLs, or add your own domain in either dashboard (Vercel is free; Render
  custom domains are free too).

## 10. If something fails

| Symptom | Fix |
|---|---|
| Website loads but every action says "Cannot reach the server" | `VITE_API_URL` is wrong or missing → fix it in Vercel and redeploy. |
| Browser console shows a CORS error | `CLIENT_ORIGIN` on Render does not match the Vercel URL exactly (no trailing slash). |
| `/api/health` is ok but AI predictions return 503 | `AI_SERVICE_URL` on the backend is wrong (must be the `https://…onrender.com` URL, no trailing slash). |
| AI service starts but `/health` shows `"loaded": false` | The model files were not committed — check `git status` includes `ai-service/app/models/*.joblib`. |
| Uploaded image shows a broken icon | The backend is not in GridFS mode — confirm `UPLOAD_STORAGE=gridfs` on Render. |
| Login works, but you get logged out on refresh | A browser extension is clearing `localStorage`; try a normal window. |
