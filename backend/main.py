import os
import json
import uuid
import random
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from google import genai
import pypdf
import io
import motor.motor_asyncio

load_dotenv()

app = FastAPI(title="LearnCraft AI & MongoDB Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://learncraft-zeta.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🍃 MongoDB Connection Setup
# ==========================================
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://park318636_db_user:63y9y0w5k41ykUAv@cluster0.jcmu8iq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_URI)
db = client.learncraft_db
games_collection = db.games
results_collection = db.game_results

# ==========================================
# 🤖 Gemini AI Client Setup
# ==========================================
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    print("⚠️ WARNING: ไม่พบ GEMINI_API_KEY ใน .env กรุณาตรวจสอบ")

ai_client = genai.Client(api_key=api_key)

class GenerateRequest(BaseModel):
    topic: str
    learning_objective: Optional[str] = ""
    raw_content: Optional[str] = ""
    game_type: str = "quiz"
    item_count: int = 5

# ✅ เพิ่ม user_email เพื่อระบุเจ้าของเกม
class SaveGameRequest(BaseModel):
    title: str
    game_type: str
    data: dict
    user_email: Optional[str] = None

# ==========================================
# 1. Text Extraction Endpoint
# ==========================================
@app.post("/api/extract-text")
async def extract_text_from_file(file: UploadFile = File(...)):
    filename = file.filename.lower()
    content_bytes = await file.read()
    extracted_text = ""

    try:
        if filename.endswith(".pdf"):
            pdf_reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            for page in pdf_reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        elif filename.endswith((".txt", ".md")):
            extracted_text = content_bytes.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(status_code=400, detail="รองรับเฉพาะไฟล์ .pdf, .txt, .md")

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="ไม่พบข้อความที่สามารถอ่านได้ในไฟล์")

        return {
            "status": "success",
            "extracted_text": extracted_text.strip(),
            "filename": file.filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการอ่านไฟล์: {str(e)}")

# ==========================================
# 2. AI Game Generator Endpoint
# ==========================================
@app.post("/api/generate-game")
async def generate_game(payload: GenerateRequest):
    if payload.game_type == "quiz":
        instruction = f"""
        คุณคือผู้เชี่ยวชาญด้านการศึกษา ออกข้อสอบปรนัยจำนวน {payload.item_count} ข้อ 4 ตัวเลือก (A, B, C, D)
        ตอบกลับเป็น JSON Structure เท่านั้น:
        {{
            "title": "{payload.topic}",
            "questions": [
                {{
                    "id": 1,
                    "question": "คำถาม",
                    "options": ["ตัวเลือก 1", "ตัวเลือก 2", "ตัวเลือก 3", "ตัวเลือก 4"],
                    "answer": 0,
                    "explanation": "คำอธิบาย"
                }}
            ]
        }}
        """
    elif payload.game_type == "flashcard":
        instruction = f"""
        คุณคือผู้เชี่ยวชาญด้านการศึกษา สร้าง Flashcard คำศัพท์/แนวคิดสำคัญ {payload.item_count} ใบ
        ตอบกลับเป็น JSON Structure เท่านั้น:
        {{
            "title": "{payload.topic}",
            "cards": [
                {{
                    "id": 1,
                    "front": "คำถาม / ศัพท์",
                    "back": "คำตอบ / ความหมาย"
                }}
            ]
        }}
        """
    elif payload.game_type == "matching":
        instruction = f"""
        คุณคือผู้เชี่ยวชาญด้านการศึกษา สร้างคู่คำศัพท์และนิยาม {payload.item_count} คู่ สำหรับเกมจับคู่
        ตอบกลับเป็น JSON Structure เท่านั้น:
        {{
            "title": "{payload.topic}",
            "pairs": [
                {{
                    "id": 1,
                    "term": "คำศัพท์ / หัวข้อ",
                    "definition": "คำอธิบาย / ความหมาย"
                }}
            ]
        }}
        """
    else:
        raise HTTPException(status_code=400, detail="game_type ไม่ถูกต้อง")

    prompt = f"{instruction}\n\nหัวข้อ: {payload.topic}\nเนื้อหาดิบ:\n{payload.raw_content}"

    models_to_try = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-1.5-pro']
    response_text = None

    for model_name in models_to_try:
        try:
            response = ai_client.models.generate_content(
                model=model_name,
                contents=prompt,
                config={"response_mime_type": "application/json"}
            )
            response_text = response.text
            break
        except Exception as e:
            print(f"Model {model_name} failed: {e}")
            continue

    if not response_text:
        raise HTTPException(status_code=500, detail="AI models ใช้งานไม่ได้ชั่วคราว")

    try:
        parsed_json = json.loads(response_text)
        return {"status": "success", "data": parsed_json}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการแปลงผลลัพธ์ JSON: {str(e)}")

# ==========================================
# 3. Game Management Endpoints (MongoDB)
# ==========================================
@app.post("/api/games/save")
async def save_game(payload: SaveGameRequest):
    game_id = str(uuid.uuid4())[:8]
    doc = {
        "game_id": game_id,
        "title": payload.title,
        "game_type": payload.game_type,
        "data": payload.data,
        "user_email": payload.user_email, # ✅ บันทึกอีเมลผู้สร้างลง Database
        "created_at": str(uuid.uuid1())
    }
    await games_collection.insert_one(doc)
    return {"status": "success", "game_id": game_id}

@app.get("/api/games")
async def get_all_games(user_email: Optional[str] = None):
    # ✅ ถ้าไม่ได้ส่ง user_email มา ให้คืนค่าว่างทันที เพื่อไม่ให้เห็นข้อมูลคนอื่นหรือข้อมูลเทสต์เก่า
    if not user_email:
        return {"status": "success", "games": []}

    cursor = games_collection.find({"user_email": user_email}, {"_id": 0})
    games = await cursor.to_list(length=100)
    
    summary_list = []
    for g in games:
        g_id = g.get("game_id")
        scores_count = await results_collection.count_documents({"game_id": g_id})
        
        total_items = 0
        data = g.get("data", {})
        if "questions" in data:
            total_items = len(data["questions"])
        elif "cards" in data:
            total_items = len(data["cards"])
        elif "pairs" in data:
            total_items = len(data["pairs"])

        summary_list.append({
            "id": g_id,
            "title": g.get("title", "ไม่มีชื่อ"),
            "game_type": g.get("game_type", "quiz"),
            "total_items": total_items,
            "total_players": scores_count
        })
    return {"status": "success", "games": summary_list}

@app.get("/api/games/{game_id}")
async def get_game(game_id: str):
    game = await games_collection.find_one({"game_id": game_id}, {"_id": 0})
    if not game:
        game = await games_collection.find_one({"id": game_id}, {"_id": 0})
    if not game:
        raise HTTPException(status_code=404, detail="ไม่พบเกม")

    scores_cursor = results_collection.find({"game_id": game_id}, {"_id": 0})
    game["scores"] = await scores_cursor.to_list(length=100)

    return {"status": "success", "data": game}

@app.put("/api/games/{game_id}")
async def update_game(game_id: str, payload: SaveGameRequest):
    result = await games_collection.update_one(
        {"game_id": game_id},
        {"$set": {"title": payload.title, "game_type": payload.game_type, "data": payload.data}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="ไม่พบเกมที่ต้องการแก้ไข")
    return {"status": "success", "message": "อัปเดตข้อมูลเกมสำเร็จ", "game_id": game_id}

@app.delete("/api/games/{game_id}")
async def delete_game(game_id: str):
    result = await games_collection.delete_one({"game_id": game_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="ไม่พบเกมที่ต้องการลบ")
    await results_collection.delete_many({"game_id": game_id})
    return {"status": "success", "message": "ลบเกมสำเร็จ"}

# ==========================================
# 4. Scores & Analytics Endpoints (MongoDB)
# ==========================================
@app.post("/api/games/score")
@app.post("/api/games/{game_id}/score")
async def handle_submit_score(payload: dict, game_id: Optional[str] = None):
    target_id = game_id or payload.get("game_id") or "unknown"
    score_doc = {
        "game_id": target_id,
        "student_name": payload.get("student_name") or payload.get("playerName") or "ผู้เรียนทั่วไป",
        "score": int(payload.get("score", 0)),
        "total_score": int(payload.get("total_score", payload.get("totalScore", 0))),
        "time_taken_seconds": int(payload.get("time_taken_seconds", payload.get("timeTaken", 0)))
    }
    await results_collection.insert_one(score_doc)
    return {"status": "success", "message": "บันทึกคะแนนเรียบร้อย"}

@app.get("/api/games/{game_id}/analytics")
@app.get("/api/games/analytics/{game_id}")
async def get_analytics(game_id: str):
    game = await games_collection.find_one({"game_id": game_id}, {"_id": 0})
    game_title = game.get("title", "ไม่ระบุ") if game else "เกมทั่วไป"
    game_type = game.get("game_type", "quiz") if game else "quiz"

    cursor = results_collection.find({"game_id": game_id}, {"_id": 0})
    raw_scores = await cursor.to_list(length=500)

    total_players = len(raw_scores)
    formatted_scores = []
    total_score_sum = 0
    total_max_sum = 0

    for s in raw_scores:
        name = s.get("student_name") or s.get("playerName") or "ผู้เรียน"
        sc = int(s.get("score", 0))
        tot = int(s.get("total_score") or s.get("totalScore") or 5)
        tm = int(s.get("time_taken_seconds") or s.get("timeTaken") or 0)
        pct = round((sc / tot * 100), 1) if tot > 0 else 0

        total_score_sum += sc
        total_max_sum += tot

        formatted_scores.append({
            "student_name": name,
            "score": sc,
            "total_score": tot,
            "time_taken_seconds": tm,
            "percentage": pct
        })

    avg_score = round(total_score_sum / total_players, 2) if total_players > 0 else 0
    avg_pct = round((total_score_sum / total_max_sum * 100), 1) if total_max_sum > 0 else 0
    sorted_scores = sorted(formatted_scores, key=lambda x: (-x["score"], x["time_taken_seconds"]))

    return {
        "status": "success",
        "title": game_title,
        "game_type": game_type,
        "total_players": total_players,
        "average_score": avg_score,
        "average_percentage": avg_pct,
        "scores": sorted_scores
    }