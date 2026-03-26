// =============================================================================
// server.js — Backend server for Study Buddy
// =============================================================================
// This is the main backend file. It creates an Express web server that:
// 1. Serves the static frontend files (HTML, CSS, JS) from the "public" folder
// 2. Provides a POST /api/chat endpoint that acts as a proxy between the
//    frontend and the OpenRouter AI API, keeping the API key hidden from users
// 3. Supports Server-Sent Events (SSE) streaming so AI responses appear
//    word-by-word in real-time on the frontend
// =============================================================================

// Load environment variables from the .env file (e.g., OPENROUTER_KEY)
// This keeps sensitive data like API keys out of the source code
require('dotenv').config();

// Import Express — a lightweight web framework for Node.js that handles
// HTTP requests, routing, and serving static files
const express = require('express');

// Import path — a built-in Node.js module for working with file/directory paths
// Used here to construct the absolute path to the "public" folder
const path = require('path');

// Create an Express application instance — this is the core of our server
const app = express();

// Server port: use the PORT environment variable if set, otherwise default to 80
// Port 80 is the standard HTTP port so users don't need to type :port in the URL
const PORT = process.env.PORT || 80;

// Read the OpenRouter API key from environment variables
// This key authenticates our requests to the OpenRouter AI service
const OPENROUTER_KEY = process.env.OPENROUTER_KEY;

// The AI model to use for generating responses
// moonshotai/kimi-k2-thinking is a powerful reasoning model available via OpenRouter
const MODEL = process.env.MODEL || 'moonshotai/kimi-k2-thinking';

// Safety check: if no API key is configured, stop the server immediately
// and show a helpful error message telling the user what to do
if (!OPENROUTER_KEY) {
  console.error('ERROR: OPENROUTER_KEY not set. Create a .env file with your key.');
  process.exit(1);
}

// Middleware: parse incoming JSON request bodies up to 5MB
// This is needed because the frontend sends chat messages as JSON
// The 5MB limit allows for large slide content to be included in requests
app.use(express.json({ limit: '5mb' }));

// Middleware: serve all files in the "public" folder as static assets
// When a user visits http://yourserver.com/, Express will automatically
// serve public/index.html as the homepage
app.use(express.static(path.join(__dirname, 'public')));

// =============================================================================
// POST /api/chat — Main chat endpoint
// =============================================================================
// The frontend sends a POST request here with an array of chat messages.
// This endpoint forwards those messages to the OpenRouter API and streams
// the AI's response back to the frontend in real-time using SSE.
// =============================================================================
app.post('/api/chat', async (req, res) => {
  // Extract the messages array from the request body
  // This contains the conversation history (system prompt + user messages + AI replies)
  const { messages } = req.body;

  // Validate that messages is a non-empty array — reject bad requests
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' });
  }

  try {
    // Forward the chat request to OpenRouter's API
    // OpenRouter is a unified gateway that provides access to many AI models
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Authenticate with our API key using Bearer token format
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        // Required by OpenRouter: identifies the app making requests
        'HTTP-Referer': 'http://study-buddy.app',
        // Optional: shows the app name in the OpenRouter dashboard
        'X-Title': 'Study Buddy',
      },
      body: JSON.stringify({
        model: MODEL,          // Which AI model to use (Kimi K2)
        messages,              // The full conversation history
        temperature: 0.7,      // Controls randomness: 0 = deterministic, 1 = creative
        max_tokens: 4096,      // Maximum length of the AI's response
        stream: true,          // Enable streaming so we get the response word-by-word
      }),
    });

    // If OpenRouter returns an error (e.g., invalid key, rate limit, model error),
    // extract the error message and forward it to the frontend
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err?.error?.message || `API error ${response.status}` });
    }

    // Set up Server-Sent Events (SSE) headers for streaming
    // This tells the browser to expect a continuous stream of data, not a single response
    res.setHeader('Content-Type', 'text/event-stream');  // SSE content type
    res.setHeader('Cache-Control', 'no-cache');           // Don't cache streamed data
    res.setHeader('Connection', 'keep-alive');            // Keep the connection open

    // Read the streaming response from OpenRouter chunk by chunk
    // and immediately forward each chunk to the frontend
    const reader = response.body.getReader();    // Get a readable stream reader
    const decoder = new TextDecoder();           // Converts raw bytes to text strings

    // Continuously read chunks from OpenRouter and pipe them to the client
    while (true) {
      const { done, value } = await reader.read();  // Read next chunk
      if (done) break;                               // Stream finished
      // Decode the binary chunk to text and send it to the frontend
      // { stream: true } tells the decoder that more data is coming
      res.write(decoder.decode(value, { stream: true }));
    }

    // Signal the end of the stream to the frontend
    res.end();
  } catch (err) {
    // If anything goes wrong (network error, timeout, etc.),
    // log the error server-side and send a 500 error to the frontend
    console.error('OpenRouter error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =============================================================================
// Start the server
// =============================================================================
// Listen on all network interfaces (0.0.0.0) so the server is accessible
// from outside the machine (required for EC2 deployment)
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Study Buddy running at http://localhost:${PORT}`);
});
