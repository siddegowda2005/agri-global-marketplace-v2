# Deployment (NOT performed)
Frontend: Vercel (build `npm run build`, output `dist`, set VITE_API_URL). Backend: Render (start `npm start`, set env from .env.example, MongoDB Atlas URI). AI service: any Python host; commit trained model files or train on deploy; set AI_SERVICE_URL.
Uploaded images use local disk, which is ephemeral on Render free tier; use a persistent disk or object storage for production.
International accessibility must be tested after real public deployment; localhost testing does not prove it.
