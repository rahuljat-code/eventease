import app from "./app";

// Local development entry point: start a normal HTTP server.
// (On Vercel the app is served as a serverless function via `api/index.ts`,
// which imports the same `app` and never calls listen.)
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
