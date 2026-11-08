# Touch Me Not

A touchless interface made in honour of the touch-me-not plant. The form's elements run away when your hand comes close. Pinch your thumb and index finger to catch them. Catch all ten and the page turns into a wall of notes left by everyone who finished.

It uses the front camera and MediaPipe Hand Landmarker to track your hand, then maps it to screen coordinates and pushes nearby elements away with a small spring physics loop. Touch and mouse work as a fallback.

## Deploy on Vercel

1. Import this repo at vercel.com/new (Framework: Other, no build command).
2. Turn on the notes wall: in the project, open **Storage → Upstash for Redis** (free tier is fine), create a database and **connect it to this project**. This adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`.
3. Redeploy once so the notes API picks up the new settings.

Until step 2 is done the game works, and the notes page says notes aren't switched on yet.

## Files

- `index.html` – the whole interface
- `api/notes.js` – reads and saves notes (GET / POST `/api/notes`)
