// Vercel serverless entry point.
// Vercel's Node runtime calls the default export as the request handler, and an
// Express app *is* a (req, res) handler — so we just re-export the app. The
// vercel.json routes every request here; Express then routes by URL as usual.
import app from "../src/app";

export default app;
