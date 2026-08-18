import os
import json
import io
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# Mock Database ชั่วคราว
GAMES_DATABASE = {}

# ==========================================
# 📄 1. File Text Extraction
# ==========================================
@app.post("/api/extract-text")
async def extract_text_from_file(file: UploadFile = File(...)):
    try:
        filename = file.filename.lower()
        contents = await file.read()
        extracted_text = ""

        if filename.endswith(".pdf"):
            pdf_file = io.BytesIO(contents)
            reader = PdfReader(pdf_file)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n"
        elif filename.endswith((".txt", ".md")):
            extracted_text = contents.decode("utf-8", errors="ignore")
        else:
            return {"status": "error", "message": "รองรับเฉพาะไฟล์ .pdf, .txt, .md"}

        if not extracted_text.strip():
            return {"status": "error", "message": "ไม่สามารถสกัดข้อความจากไฟล์ได้"}

        return {"status": "success", "filename": file.filename, "extracted_text": extracted_text.strip()}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# ✨ 2. AI Game Generator
# ==========================================
class GenerateGameRequest(BaseModel):
    topic: str
    learning_objective: str = ""
    raw_content: str = ""
    game_type: str = "quiz"
    item_count: int = 5

@app.post("/api/generate-game")
async def generate_game(payload: GenerateGameRequest):
    try:
        prompt = f"""
คุณเป็นผู้เชี่ยวชาญด้านการออกแบบเนื้อหาการศึกษา (Instructional Designer)
กรุณาสร้างเนื้อหาสำหรับ {payload.game_type} ตามข้อมูลนี้:
- หัวข้อ: {payload.topic}
- จุดประสงค์การเรียนรู้: {payload.learning_objective}
- เนื้อหาอ้างอิง: {payload.raw_content}
- จำนวนที่ต้องการ: {payload.item_count} รายการ

กรุณาส่งออกผลลัพธ์เป็นโครงสร้าง JSON ล้วน (ไม่ต้องมีข้อความเกริ่นนำ):
"""
        if payload.game_type == "quiz":
            prompt += """
{
  "title": "ชื่อชุดแบบทดสอบ",
  "questions": [
    {
      "id": 1,
      "question": "คำถาม",
      "options": ["ตัวเลือก A", "ตัวเลือก B", "ตัวเลือก C", "ตัวเลือก D"],
      "answer": 0,
      "explanation": "คำอธิบายเฉลย"
    }
  ]
}
หมายเหตุ: answer ให้ระบุเป็น index ของตัวเลือกที่ถูกต้อง (0, 1, 2 หรือ 3)
"""
        elif payload.game_type == "flashcard":
            prompt += """
{
  "title": "ชื่อชุดการ์ดคำศัพท์",
  "cards": [
    {
      "id": 1,
      "front": "คำถามหรือหัวข้อหน้าการ์ด",
      "back": "คำตอบหรือคำอธิบายหลังการ์ด"
    }
  ]
}
"""
        elif payload.game_type == "matching":
            prompt += """
{
  "title": "ชื่อชุดเกมจับคู่",
  "pairs": [
    {
      "id": 1,
      "term": "คำศัพท์/ข้อความฝั่งซ้าย",
      "definition": "ความหมาย/คู่ที่ตรงกันฝั่งขวา"
    }
  ]
}
"""
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                temperature=0.7
            )
        )
        
        parsed_json = json.loads(response.text)
        return {"status": "success", "data": parsed_json}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ==========================================
# 💾 3. Save & Retrieve Game
# ==========================================
class SaveGameRequest(BaseModel):
    title: str
    game_type: str
    data: dict

@app.post("/api/games/save")
async def save_game(payload: SaveGameRequest):
    import uuid
    game_id = str(uuid.uuid4())[:8]
    GAMES_DATABASE[game_id] = {
        "title": payload.title,
        "game_type": payload.game_type,
        "data": payload.data,
        "scores": []
    }
    return {"status": "success", "game_id": game_id}

@app.get("/api/games/{game_id}")
async def get_game(game_id: str):
    if game_id not in GAMES_DATABASE:
        raise HTTPException(status_code=404, detail="Game not found")
    return {"status": "success", "data": GAMES_DATABASE[game_id]}

# ==========================================
# 📊 4. Analytics & Score
# ==========================================
class SubmitScoreRequest(BaseModel):
    game_id: str
    player_name: str
    score: int
    total_questions: int
    time_taken: str = "0s"

@app.post("/api/games/score")
async def submit_score(payload: SubmitScoreRequest):
    try:
        if payload.game_id not in GAMES_DATABASE:
            return {"status": "error", "message": "ไม่พบเกมนี้ในระบบ"}
        
        score_record = {
            "player_name": payload.player_name,
            "score": payload.score,
            "total_questions": payload.total_questions,
            "time_taken": payload.time_taken,
            "percentage": round((payload.score / payload.total_questions) * 100, 1) if payload.total_questions > 0 else 0
        }
        
        GAMES_DATABASE[payload.game_id]["scores"].append(score_record)
        return {"status": "success", "data": score_record}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/api/games/analytics/{game_id}")
async def get_analytics(game_id: str):
    if game_id not in GAMES_DATABASE:
        raise HTTPException(status_code=404, detail="Game not found")
        
    game_info = GAMES_DATABASE[game_id]
    scores_list = game_info.get("scores", [])
    
    total_players = len(scores_list)
    avg_score = round(sum(s["score"] for s in scores_list) / total_players, 1) if total_players > 0 else 0
    avg_percentage = round(sum(s["percentage"] for s in scores_list) / total_players, 1) if total_players > 0 else 0
    
    return {
        "status": "success",
        "title": game_info.get("title", "บทเรียน"),
        "game_type": game_info.get("game_type", "quiz"),
        "total_players": total_players,
        "avg_score": avg_score,
        "avg_percentage": avg_percentage,
        "scores": scores_list
    }
# ==========================================
# 📚 5. List All Games (Dashboard Library)
# ==========================================
@app.get("/api/games")
async def list_games():
    games_list = []
    for g_id, g_data in GAMES_DATABASE.items():
        data_obj = g_data.get("data", {})
        item_count = (
            len(data_obj.get("questions", []))
            or len(data_obj.get("cards", []))
            or len(data_obj.get("pairs", []))
            or 0
        )
        games_list.append({
            "id": g_id,
            "title": g_data.get("title", "บทเรียน"),
            "game_type": g_data.get("game_type", "quiz"),
            "total_items": item_count,
            "total_players": len(g_data.get("scores", []))
        })
    return {"status": "success", "games": games_list}
# ==========================================
# 🗑️ 6. Delete Game Endpoint
# ==========================================
@app.delete("/api/games/{game_id}")
async def delete_game(game_id: str):
    if game_id in GAMES_DATABASE:
        del GAMES_DATABASE[game_id]
        return {"status": "success", "message": f"ลบเกมรหัส {game_id} สำเร็จ"}
    raise HTTPException(status_code=404, detail="ไม่พบเกมที่ต้องการลบ")
# ==========================================
# ✏️ 7. Update/Edit Game Endpoint
# ==========================================
class UpdateGameRequest(BaseModel):
    title: str
    game_type: str
    data: dict

@app.put("/api/games/{game_id}")
async def update_game(game_id: str, payload: UpdateGameRequest):
    if game_id not in GAMES_DATABASE:
        raise HTTPException(status_code=404, detail="ไม่พบเกมที่ต้องการแก้ไข")
    
    # อัปเดตข้อมูลเกมเดิมโดยยังคงประวัติ scores เอาไว้
    GAMES_DATABASE[game_id]["title"] = payload.title
    GAMES_DATABASE[game_id]["game_type"] = payload.game_type
    GAMES_DATABASE[game_id]["data"] = payload.data
    
    return {"status": "success", "message": "อัปเดตข้อมูลเกมสำเร็จ", "game_id": game_id}