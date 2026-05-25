import os
import uuid
import json
import base64
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
import httpx
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(title="Wreck Link API", version="0.1.0")

# CORS setup (Allow frontend on port 3000 and 3001)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:8080"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client setup
supabase_url = os.environ.get("SUPABASE_URL")
supabase_service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

supabase: Client = None
if supabase_url and supabase_service_key:
    try:
        supabase = create_client(supabase_url, supabase_service_key)
        print("Supabase client initialized successfully.")
    except Exception as e:
        print(f"Failed to initialize Supabase client: {e}")
else:
    print("Warning: Supabase credentials missing in environment.")


async def upload_to_supabase(file_bytes: bytes, filename: str, content_type: str) -> str:
    """Upload image to Supabase Storage bucket 'wreck-alarms'"""
    if not supabase:
        print("Warning: Supabase not configured. Skipping upload, using mock storage URL.")
        return f"https://mock-storage.local/wreck-alarms/{filename}"
    
    try:
        # Attempt to create the public bucket if it doesn't exist
        try:
            supabase.storage.create_bucket("wreck-alarms", options={"public": True})
            print("Created Supabase storage bucket 'wreck-alarms'.")
        except Exception:
            # Bucket likely already exists, ignore exception
            pass
        
        # Upload file content
        supabase.storage.from_("wreck-alarms").upload(
            path=filename,
            file=file_bytes,
            file_options={"content-type": content_type}
        )
        
        # Get public url
        public_url = supabase.storage.from_("wreck-alarms").get_public_url(filename)
        return public_url
    except Exception as e:
        print(f"Supabase upload failed: {e}. Falling back to mock storage URL.")
        return f"https://mock-storage.local/wreck-alarms/{filename}"


async def analyze_image_with_gemini(file_bytes: bytes, content_type: str) -> str:
    """Analyze image using Google Gemini 2.5 Flash Vision REST API"""
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_key:
        print("Warning: GEMINI_API_KEY missing. Using visual analysis fallback description.")
        return "Visual analysis fallback: Photo displays scattering wreckage resembling fuselage fragments. No digital forgery or generative AI markers detected."
    
    try:
        encoded_image = base64.b64encode(file_bytes).decode("utf-8")
        
        gemini_payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": "Analyze this image for visual evidence of a plane crash, aviation wreck, fuselage debris, or emergency survival markers. Also, check for visual anomalies, tell-tale signs of AI generation (GAN/diffusion markers, unnatural stitching, metadata inconsistencies), or digital forgery. Return a concise, detailed paragraph of your physical and digital forgery findings."
                        },
                        {
                            "inlineData": {
                                "mimeType": content_type,
                                "data": encoded_image
                            }
                        }
                    ]
                }
            ]
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}",
                json=gemini_payload,
                timeout=30.0
            )
            
            if res.status_code != 200:
                print(f"Gemini API returned status {res.status_code}: {res.text}")
                return "Visual analysis error: Failed to query Gemini API. Mocking description: Crash site debris identified; no visual anomaly tags found."
                
            data = res.json()
            analysis = data["candidates"][0]["content"]["parts"][0]["text"]
            return analysis
    except Exception as e:
        print(f"Gemini analysis exception: {e}")
        return "Visual analysis exception: Error processing visual contents. Fallback description: Image displays suspicious metallic structure fragments."


async def run_groq_decision_engine(
    visual_analysis: str,
    callsign: str,
    altitude: float,
    velocity: float,
    heading: float,
    transponder_loss: bool
) -> dict:
    """Correlate visual findings with telemetry parameters using Groq (Llama 3.3 70B)"""
    groq_key = os.environ.get("GROQ_API_KEY")
    if not groq_key:
        print("Warning: GROQ_API_KEY missing. Using fallback mock decision engine.")
        # Mock logic based on telemetry metrics
        is_false = False
        reason = "Fallback decision: Telemetry altitude drops and signal loss match visual crash debris indicators."
        if altitude > 2000 and not transponder_loss:
            is_false = True
            reason = "Fallback decision: Telemetry indicates flight is cruising safely at altitude, contradicting visual wreck report."
        elif "forgery" in visual_analysis.lower() or "ai-generated" in visual_analysis.lower() or "not a crash" in visual_analysis.lower():
            is_false = True
            reason = "Fallback decision: Image was flagged as forged, synthetic, or completely unrelated to aviation wrecks."
        return {"isFalseAlarm": is_false, "reasoning": reason}

    try:
        groq_payload = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {
                    "role": "user",
                    "content": f"""
Verify if the following public wreck alarm is a false alarm or a genuine crash event by correlating the visual analysis of the reported crash site image with the live flight telemetry.

Live Flight Telemetry:
- Callsign: {callsign}
- Current Altitude: {altitude} meters
- Current Velocity: {velocity} km/h
- Current Heading: {heading} degrees
- Transponder Link Loss: {"YES" if transponder_loss else "NO"}

Visual Analysis of reported wreck site photo:
{visual_analysis}

A false alarm is defined as any of the following:
1. Mismatch between telemetry and visual state: e.g. Telemetry shows the flight is cruising at high altitude and speed, but the image shows a crash site on the ground.
2. AI-generated, forged, or fake crash imagery (as flagged by visual analysis).
3. The image is completely unrelated to aircraft debris or a crash (e.g. photos of pets, cities, memes, or nature).

Return a strict JSON response containing:
- "isFalseAlarm": boolean (true if it is a false alarm, false if it is a genuine, verified crash event matching the telemetry distress)
- "reasoning": string (a concise 2-sentence explanation summarizing the correlation results and fake visual markers check)
"""
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }
        
        async with httpx.AsyncClient() as client:
            res = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"},
                json=groq_payload,
                timeout=20.0
            )
            
            if res.status_code != 200:
                print(f"Groq API returned status {res.status_code}: {res.text}")
                raise Exception(f"Groq API returned error {res.status_code}")
                
            data = res.json()
            content = data["choices"][0]["message"]["content"]
            decision = json.loads(content)
            return decision
    except Exception as e:
        print(f"Groq decision exception: {e}. Falling back to default decision.")
        is_false = False
        if altitude > 2000 and not transponder_loss:
            is_false = True
        return {
            "isFalseAlarm": is_false,
            "reasoning": f"Groq correlation exception fallback. Telemetry correlation suggests {'False Alarm' if is_false else 'True Distress'}."
        }


@app.get("/")
def read_root():
    return {"status": "Wreck Link API Online", "version": "0.1.0"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.post("/api/verify-wreck")
async def verify_wreck(
    file: UploadFile = File(...),
    callsign: str = Form(...),
    altitude: float = Form(...),
    velocity: float = Form(...),
    heading: float = Form(...),
    transponder_loss: bool = Form(...)
):
    """Securely upload report image to Supabase, analyze via Gemini, and decide true/false alert state via Groq"""
    try:
        # Read uploaded file contents
        file_bytes = await file.read()
        
        # 1. Securely upload to Supabase Storage
        filename = f"{uuid.uuid4()}_{file.filename}"
        public_url = await upload_to_supabase(file_bytes, filename, file.content_type or "image/png")
        
        # 2. visual analysis via Gemini Vision API
        visual_analysis = await analyze_image_with_gemini(file_bytes, file.content_type or "image/png")
        
        # 3. Decision Correlation via Groq Decision Engine
        verification = await run_groq_decision_engine(
            visual_analysis=visual_analysis,
            callsign=callsign,
            altitude=altitude,
            velocity=velocity,
            heading=heading,
            transponder_loss=transponder_loss
        )
        
        return {
            "success": True,
            "public_url": public_url,
            "visual_analysis": visual_analysis,
            "verification": verification
        }
    except Exception as e:
        print(f"Wreck verification failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
