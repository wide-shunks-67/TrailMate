# 🌿 TrailMate — AI-Powered Outdoor Adventure Companion

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.0-009688?logo=fastapi)
![Google Gemma](https://img.shields.io/badge/Powered_by-Gemma-orange)
![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-2026-F74700)
![License](https://img.shields.io/badge/License-MIT-green)

TrailMate is an open-source, AI-powered outdoor adventure companion built for the **Hacktoberfest 2026 Open-Source AI Challenge** (Theme: "Touch Grass"). 

It uses Google's open-weight **Gemma** AI model and real-time local weather data to generate highly personalized, hyper-local outdoor adventures and micro-challenges to help developers step away from their screens and reconnect with nature.

## ✨ Features

- **Hyper-Local Adventures**: AI generates 3 specific, real-world parks, trails, or lakes near your location based on your interests and fitness level.
- **Client-Side Weather Integration**: Uses Open-Meteo to fetch your local weather and coordinates directly from your browser, securely bypassing datacenter rate limits.
- **Deep-Dive Roadmaps**: Click on an adventure to generate an immersive, step-by-step nature guide and interactive checklist for your outing.
- **"Touch Grass" Micro-Challenges**: Don't have time for a full hike? Generate a quick 15-minute outdoor challenge to clear your mind.
- **Add to Calendar**: Instantly download `.ics` calendar invites for your adventures to hold yourself accountable.
- **Save Offline**: Download your deep-dive roadmap as a `.txt` file so you can leave your internet connection behind.

## 🏗️ Architecture

TrailMate uses a decoupled **Split-Stack Architecture**:
- **Frontend (Vercel)**: Vanilla JavaScript and Tailwind CSS.
- **Backend (Render)**: FastAPI Python REST API.
- **AI**: `google-genai` SDK using the `gemma-4-26b-a4b-it` open-weight model.

```mermaid
flowchart TD
    User([🚶 User Browser])
    Vercel[💻 Frontend UI\nVanilla JS / Tailwind]
    OpenMeteo[🌤️ Open-Meteo API\nGeocoding & Weather]
    Render[⚙️ Backend API\nFastAPI / Python]
    Gemma[🧠 Google Gemma\nOpen-Weight AI]

    User <-->|Interacts| Vercel
    Vercel <-->|Fetches weather locally| OpenMeteo
    Vercel <-->|POST /api/adventures\n(Sends weather context)| Render
    Render <-->|Generates personalized itinerary| Gemma
```

## 🚀 Quick Start (Local Development)

### 1. Backend Setup
1. Clone the repository: `git clone https://github.com/your-username/TrailMate.git`
2. Navigate to the backend: `cd backend`
3. Create a `.env` file and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```
4. Install dependencies: `pip install -r requirements.txt`
5. Start the server: `uvicorn main:app --reload`

### 2. Frontend Setup
1. Open `frontend/app.js` and ensure `API_BASE` points to your local server:
   ```javascript
   const API_BASE = 'http://127.0.0.1:8000';
   ```
2. Open `frontend/index.html` in your web browser. That's it! No build steps required.

## 📡 API Endpoints

| Method | Endpoint | Description | Payload Example |
|---|---|---|---|
| `POST` | `/api/adventures` | Generates 3 full adventures | `{ "location": "Mumbai", "interests": ["Hiking"], "fitness_level": "Easy", "weather_context": "30°C, Clear sky" }` |
| `POST` | `/api/roadmap` | Generates a deep-dive step-by-step guide | `{ "adventure": {...}, "weather_context": "30°C, Clear sky" }` |
| `POST` | `/api/challenge` | Generates a 15-min quick outdoor challenge | `{ "location": "Mumbai", "weather_context": "30°C, Clear sky" }` |
| `GET` | `/api/health` | Backend status check | N/A |

## 🌍 Hacktoberfest 2026: Touch Grass

This project was built to solve the modern developer's dilemma: we spend too much time building the digital world and forget to experience the physical one. By utilizing open-weight AI (Gemma), TrailMate ensures that the outdoors remains accessible, personalized, and engaging without trapping you in another endless social media feed.

## 🤝 Contributing

Pull requests are welcome! If you'd like to contribute, please open an issue first to discuss what you would like to change.

## 📄 License

This project is open-sourced under the [MIT License](LICENSE).

---
*Built with 🌿 by Ansh Tayal ([@anshtayal02](https://dev.to/anshtayal02))*
