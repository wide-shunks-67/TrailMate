import os
import json
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv

from google import genai
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import FileResponse, Response

# Load environment variables
load_dotenv()

import sentry_sdk

SENTRY_DSN = os.getenv("SENTRY_DSN")
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=1.0,
        profiles_sample_rate=1.0,
    )
    print("Sentry initialized successfully!")

MONGO_URI = os.getenv("MONGODB_URI")
ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")

try:
    mongo_client = AsyncIOMotorClient(MONGO_URI) if MONGO_URI else None
    db = mongo_client.trailmate if mongo_client else None
except Exception as e:
    print(f"Warning: Failed to initialize MongoDB Client. Error: {e}")
    db = None

# Initialize FastAPI
app = FastAPI(title="TrailMate API", description="AI-powered outdoor adventure companion")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Gemini Client (automatically picks up GEMINI_API_KEY from environment)
try:
    gemini_client = genai.Client()
except Exception as e:
    print(f"Warning: Failed to initialize Gemini Client. Ensure GEMINI_API_KEY is set. Error: {e}")
    gemini_client = None

GEMMA_MODEL = "gemma-4-26b-a4b-it"

# --- Helper Functions ---
WEATHER_CODES = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
}

def get_weather_description(code: int) -> str:
    return WEATHER_CODES.get(code, "Unknown weather condition")

def get_season() -> str:
    month = datetime.now().month
    if month in [3, 4, 5]:
        return "Spring"
    elif month in [6, 7, 8]:
        return "Summer"
    elif month in [9, 10, 11]:
        return "Autumn"
    else:
        return "Winter"

# --- Models ---

class AdventureRequest(BaseModel):
    location: str
    interests: List[str]
    fitness_level: str
    weather_context: str = "Unknown weather"

class ChallengeRequest(BaseModel):
    location: str
    weather_context: str = "Unknown weather"

# --- Helper Functions ---

async def get_coordinates(location: str):
    """Fetch coordinates for a given location using Open-Meteo Geocoding API."""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://geocoding-api.open-meteo.com/v1/search",
            params={"name": location, "count": 1}
        )
        if response.status_code != 200:
            raise HTTPException(status_code=500, detail="Failed to fetch coordinates")
        data = response.json()
        if not data.get("results"):
            raise HTTPException(status_code=404, detail="Location not found")
        result = data["results"][0]
        return result["latitude"], result["longitude"], result.get("name", location)

async def get_weather(lat: float, lon: float):
    """Fetch current and daily weather data from Open-Meteo."""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m",
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code",
                    "timezone": "auto"
                }
            )
            if response.status_code != 200:
                print(f"Weather API Error: {response.text}")
                return {} # Fallback if Render IP is rate-limited
            return response.json()
    except Exception as e:
        print(f"Weather Fetch Exception: {e}")
        return {}

# --- Endpoints ---

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/weather")
async def get_weather_endpoint(lat: float = Query(...), lon: float = Query(...)):
    weather_data = await get_weather(lat, lon)
    
    current = weather_data.get("current", {})
    code = current.get("weather_code", -1)
    current["weather_description"] = get_weather_description(code)
    
    return weather_data

@app.post("/api/adventures")
async def generate_adventures(req: AdventureRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="AI Client not initialized")

    try:
        season = get_season()
        
        prompt = (
            f"Generate 3 highly specific, real outdoor adventures for {req.location}.\n"
            f"CRITICAL: Name REAL, actual parks, trails, or lakes near {req.location}. No generic ideas.\n"
            f"Current weather: {req.weather_context}.\n"
            f"Season: {season}.\n"
            f"User interests: {', '.join(req.interests)}.\n"
            f"Fitness level: {req.fitness_level}.\n\n"
            "KEEP DESCRIPTIONS BRIEF AND PUNCHY. Keep itineraries to just 3 short bullet points.\n"
            "Return EXACTLY a JSON array of 3 objects with these keys: "
            "title, specific_destination, description, duration, difficulty, itinerary (an array of 3 short strings), what_to_bring, why_outside."
        )
        
        system_instruction = (
            "You are a local expert outdoor adventure guide. "
            "You MUST recommend REAL geographical places specific to the requested city. "
            "Be very concise to ensure ultra-fast generation times. Respond with valid JSON only."
        )
        
        response = gemini_client.models.generate_content(
            model=GEMMA_MODEL,
            contents=prompt,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json"
            }
        )
        
        parsed = json.loads(response.text)
        # Handle cases where Gemini wraps the array in an {"adventures": [...]} object
        if isinstance(parsed, dict) and "adventures" in parsed:
            adventures = parsed["adventures"]
        elif isinstance(parsed, dict):
            # If it wrapped it but used a different key, just grab the first list we find
            lists = [v for v in parsed.values() if isinstance(v, list)]
            adventures = lists[0] if lists else []
        else:
            adventures = parsed
        
        return {
            "adventures": adventures
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/challenge")
async def generate_challenge(req: ChallengeRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="AI Client not initialized")

    try:
        season = get_season()
        
        prompt = (
            f"Generate ONE quick 'Touch Grass' outdoor challenge for {req.location}.\n"
            f"CRITICAL: Name a REAL, specific park, street, or landmark in {req.location} to do this.\n"
            f"Current weather: {req.weather_context}.\n"
            f"Season: {season}.\n"
            "This should be a 15-30 minute easy and fun activity to get outside immediately.\n"
            "Return EXACTLY a JSON object with these keys: title, specific_destination, description, duration, tip."
        )
        
        system_instruction = (
            "You are a local wellness coach whose mission is to encourage quick nature breaks. "
            "Provide accessible, immediate outdoor mini-challenges at REAL local spots. Respond with valid JSON only."
        )
        
        response = gemini_client.models.generate_content(
            model=GEMMA_MODEL,
            contents=prompt,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json"
            }
        )
        
        challenge = json.loads(response.text)
        
        return {
            "challenge": challenge
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="Failed to parse AI response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ElevenLabs & MongoDB Endpoints ---

class SaveAdventureRequest(BaseModel):
    user_id: Optional[str] = "default_user"
    title: str
    description: str
    duration: str
    difficulty: str
    location: str

@app.post("/api/save")
async def save_adventure(req: SaveAdventureRequest):
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not configured")
    adventure_dict = req.model_dump()
    adventure_dict["saved_at"] = datetime.utcnow().isoformat()
    await db.adventures.insert_one(adventure_dict)
    return {"status": "success"}

@app.get("/api/saved")
async def get_saved_adventures(user_id: Optional[str] = Query(None)):
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not configured")
    if not user_id:
        return []
    cursor = db.adventures.find({"user_id": user_id}).sort("saved_at", -1)
    adventures = await cursor.to_list(length=50)
    for adv in adventures:
        adv["_id"] = str(adv["_id"])
    return adventures

@app.delete("/api/saved/{trail_id}")
async def delete_saved_adventure(trail_id: str, user_id: Optional[str] = Query(None)):
    if db is None:
        raise HTTPException(status_code=500, detail="MongoDB not configured")
    try:
        from bson import ObjectId
        query: Dict[str, Any] = {"_id": ObjectId(trail_id)}
        if user_id:
            query["user_id"] = user_id
        res = await db.adventures.delete_one(query)
        return {"deleted": res.deleted_count > 0}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

class TTSRequest(BaseModel):
    text: str

@app.post("/api/tts")
async def generate_tts(req: TTSRequest):
    if not ELEVENLABS_API_KEY:
        raise HTTPException(status_code=500, detail="ElevenLabs API key not configured")
    
    # Adam voice (deep, narration style)
    voice_id = "pNInz6obpgDQGcFmaJgB" 
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
    }
    
    data = {
        "text": req.text,
        "model_id": "eleven_turbo_v2_5",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.5}
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=data, headers=headers)
        
        if response.status_code != 200:
            error_details = response.text
            print(f"ElevenLabs Error [{response.status_code}]: {error_details}")
            raise HTTPException(status_code=response.status_code, detail=f"TTS failed: {error_details}")
            
        return Response(content=response.content, media_type="audio/mpeg")


class RoadmapRequest(BaseModel):
    location: str
    title: str
    destination: str

@app.post("/api/roadmap")
async def get_roadmap(req: RoadmapRequest):
    if not gemini_client:
        raise HTTPException(status_code=500, detail="AI Client not initialized")
    try:
        prompt = (
            f"Create a deep-dive, step-by-step roadmap for an outdoor adventure titled '{req.title}' "
            f"at '{req.destination}' in {req.location}.\n"
            "Return EXACTLY one flat JSON object (do not wrap it in a 'roadmap' key) with these exact keys at the top level:\n"
            "- 'where_to_go': A detailed paragraph on exactly where this is and how to begin the outing.\n"
            "- 'timeline': An array of 3 to 4 objects, each with 'step' (e.g., 'Arrival', 'Exploration') and 'details' (exactly what to do).\n"
            "- 'nature_tips': An array of 3 actionable tips on how to deeply connect with nature and what wildlife/plants to observe here.\n"
            "- 'pro_tip': One final insider tip to make the outing perfect."
        )
        
        system_instruction = (
            "You are an expert local guide and nature enthusiast. "
            "Provide rich, immersive, step-by-step details for the requested adventure. "
            "Keep it highly specific to the location. Respond with valid JSON only."
        )
        
        response = gemini_client.models.generate_content(
            model=GEMMA_MODEL,
            contents=prompt,
            config={
                "system_instruction": system_instruction,
                "response_mime_type": "application/json"
            }
        )
        
        parsed = json.loads(response.text)
        
        # Defensive unwrapping in case Gemini nests the output
        if isinstance(parsed, dict):
            # If the expected keys are missing, search for them in nested objects
            if "where_to_go" not in parsed and "timeline" not in parsed:
                for v in parsed.values():
                    if isinstance(v, dict) and ("where_to_go" in v or "timeline" in v):
                        parsed = v
                        break
        elif isinstance(parsed, list) and len(parsed) > 0:
            parsed = parsed[0]
            
        return parsed
        
    except Exception as e:
        print(f"Roadmap error: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate roadmap")

@app.get("/")
async def root():
    return {"status": "ok", "message": "TrailMate Backend API is running."}
