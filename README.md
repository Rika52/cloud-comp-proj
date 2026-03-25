# Study Buddy — AI Slide Assistant

A web application that lets students upload class slides (PDF) and chat with an AI tutor about the content. The AI answers questions, creates summaries, quizzes, and explains concepts — all based on the uploaded slides.

**Live demo:** http://13.60.95.67

## Features

- **PDF slide upload** — drag & drop or browse, supports multiple files
- **AI-powered chat** — ask questions, get summaries, quizzes, and explanations
- **Streaming responses** — answers appear in real-time as they're generated
- **Markdown rendering** — formatted output with code blocks, lists, and headings
- **Mobile responsive** — collapsible sidebar for small screens
- **No user setup required** — API key is stored server-side

## Architecture

```
┌────────────┐       ┌──────────────┐       ┌──────────────┐
│   Browser   │──────▶│  Express.js   │──────▶│  OpenRouter   │
│  (Frontend) │◀──────│  (EC2 / Port  │◀──────│  API (Kimi    │
│             │       │     80)       │       │   K2 model)   │
└────────────┘       └──────────────┘       └──────────────┘
```

- **Frontend** (`public/index.html`) — single-page app using vanilla JS and [pdf.js](https://mozilla.github.io/pdf.js/) for PDF text extraction
- **Backend** (`server.js`) — Express server that proxies chat requests to the OpenRouter API, keeping the API key hidden from clients
- **AI Model** — [Kimi K2 Thinking](https://openrouter.ai/moonshotai/kimi-k2-thinking) via [OpenRouter](https://openrouter.ai/)
- **Hosting** — AWS EC2 (Amazon Linux 2023, t2.micro)

## Tech Stack

- HTML / CSS / JavaScript (no frameworks)
- Node.js + Express
- pdf.js (client-side PDF parsing)
- OpenRouter API (AI inference)
- AWS EC2 + Nginx (deployment)

## Running Locally

```bash
# Install dependencies
npm install

# Start the server (runs on port 80, needs sudo for ports < 1024)
sudo node server.js

# Or run on a non-privileged port by setting PORT
PORT=3000 node server.js
```

Then open http://localhost:3000 in your browser.

## Deploying to EC2

1. Launch an EC2 instance (Amazon Linux 2023, t2.micro)
2. Open ports 22 (SSH) and 80 (HTTP) in the Security Group
3. SSH into the instance and install Node.js:
   ```bash
   curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
   sudo yum install -y nodejs
   ```
4. Copy the project files to `/opt/studybuddy/`
5. Install dependencies and start the server:
   ```bash
   cd /opt/studybuddy
   npm install
   sudo node server.js
   ```

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `80` |
| `OPENROUTER_KEY` | OpenRouter API key | Hardcoded fallback |

## Project Structure

```
cloud-comp-proj/
├── server.js          # Express backend (proxies to OpenRouter)
├── package.json       # Node.js dependencies
├── public/
│   └── index.html     # Frontend (deployed version)
├── index.html         # Frontend (standalone version with Gemini/WebGPU fallback)
├── deploy.sh          # EC2 deployment helper script
└── README.md
```
