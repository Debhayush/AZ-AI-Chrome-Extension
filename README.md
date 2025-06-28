# 🔧 AZ AI Helper Chrome Extension

This is a Chrome extension that integrates **Gemini AI** as a helpful mentor on coding problems on [maang.in](https://maang.in/). It provides hints, discusses your code, and avoids giving the full solution unless requested.

---

## 🚀 Features

- Automatically loads problem metadata.
- Remembers per-problem chat history.
- Mentors you instead of solving for you.
- Embedded chatbox UI.
- Blocks unrelated queries (e.g., general knowledge).
- Lightweight and fast.

---

## 🔑 Setup Gemini API Key

This extension uses the Gemini API. To use it, you must provide your own API key.

### Steps:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and generate a Gemini API key.
2. Open the `content.js` file in this project.
3. Replace the placeholder value of `GEMINI_API_KEY` with your actual key:

   ```js
   // ⚠️ Replace this with your own Gemini API key
   const GEMINI_API_KEY = "YOUR_API_KEY_HERE";

🛠 Installation (Developer Mode)
Open Chrome and go to chrome://extensions/.

Enable Developer Mode (top right).

Click Load unpacked.

Select the root folder of this extension (where manifest.json is).

Visit https://maang.in/problems/... and click the AI Help button.
---

## 📁 Folder Structure
📁 project-root/
├── content.js # Main logic for AI chat + injection
├── inject.js # Network interceptor for problem data
├── popup.html # Chrome popup UI
├── popup.js # JS for popup.html (opens maang.in)
├── assets/ # Icon(s)
├── manifest.json # Chrome extension config
└── README.md # You’re reading it!

---

## 💡 Example Prompt
User: What are the constraints?
AI: [lists constraints from the problem]

User: Give a hint.
AI: Here's a helpful hint...

User: I give up.
AI: Here's the full C++ solution.

---



Made with ❤️ by Debhayush Nandy
