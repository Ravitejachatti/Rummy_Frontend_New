# 🎯 Rummy Pro - React Frontend

This is the **React-based frontend for Rummy Pro**, a private real-time multiplayer Rummy game project, styled with Tailwind CSS and built using Vite.

---

## 📦 Project Structure

client/
├── src/
│   ├── components/        # Reusable UI components
│   ├── store/             # Redux Toolkit slices and store
│   ├── config/            # API and socket configurations
│   ├── pages/             # Page components
│   └── index.css          # Tailwind and custom styles
├── public/                # Static assets
├── index.html             # HTML template
├── package.json           # Frontend dependencies
├── postcss.config.js      # PostCSS configuration
├── tailwind.config.js     # Tailwind theme config
└── vite.config.js         # Vite build configuration

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or later)

### Install dependencies
```bash
cd client
npm install

npm run dev

The app will run at http://localhost:3000.

⸻

⚙️ Available Scripts
	•	npm run dev: Start local development server
	•	npm run build: Build for production
	•	npm run preview: Preview the production build

⸻

🔧 Tech Stack
	•	React 18
	•	Vite
	•	Redux Toolkit
	•	Tailwind CSS
	•	Socket.IO Client
	•	Heroicons / Lucide-React

🌱 Environment Variables

Environment variables can be set in a .env file inside the client/ folder.

Example:
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001

📝 Notes
	•	This repository is private and for internal use only.
	•	Please ensure correct .env configuration before running locally.

⸻

Built for a private full-stack multiplayer Rummy game 🎮

---