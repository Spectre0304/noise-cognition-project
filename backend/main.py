"""
環境噪音對認知表現影響量測系統 — 後端 API
技術：FastAPI + SQLite + scipy 統計分析
"""
import os, sqlite3, json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from scipy import stats
import numpy as np
from datetime import datetime

app = FastAPI(title="噪音認知量測系統 API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DB = "results.db"

def init_db():
    conn = sqlite3.connect(DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id    TEXT    NOT NULL,
            timestamp  TEXT    NOT NULL,
            noise_db   REAL    NOT NULL,
            noise_cat  TEXT    NOT NULL,  -- quiet / moderate / loud
            n_level    INTEGER NOT NULL,  -- 1 or 2
            accuracy   REAL    NOT NULL,  -- 0.0 ~ 1.0
            avg_rt_ms  REAL    NOT NULL,  -- average reaction time
            total_q    INTEGER NOT NULL,
            correct    INTEGER NOT NULL
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ── Models ─────────────────────────────────────────────────────
class SessionResult(BaseModel):
    user_id:    str
    noise_db:   float
    noise_cat:  str
    n_level:    int
    accuracy:   float
    avg_rt_ms:  float
    total_q:    int
    correct:    int

class StatsResponse(BaseModel):
    user_id:      str
    n_sessions:   int
    t_statistic:  float | None
    p_value:      float | None
    cohen_d:      float | None
    correlation_r: float | None
    mean_quiet:   float | None
    mean_loud:    float | None
    significant:  bool

# ── Endpoints ───────────────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "ok", "message": "噪音認知量測系統 API 運行中 🎙️🧠"}

@app.post("/result")
def save_result(r: SessionResult):
    """儲存一次測試結果"""
    conn = sqlite3.connect(DB)
    conn.execute("""
        INSERT INTO sessions
            (user_id, timestamp, noise_db, noise_cat, n_level, accuracy, avg_rt_ms, total_q, correct)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (r.user_id, datetime.now().isoformat(), r.noise_db, r.noise_cat,
          r.n_level, r.accuracy, r.avg_rt_ms, r.total_q, r.correct))
    conn.commit()
    conn.close()
    return {"status": "saved"}

@app.get("/results/{user_id}")
def get_results(user_id: str):
    """取得某使用者的所有測試紀錄"""
    conn = sqlite3.connect(DB)
    rows = conn.execute(
        "SELECT * FROM sessions WHERE user_id=? ORDER BY timestamp DESC", (user_id,)
    ).fetchall()
    conn.close()
    cols = ["id","user_id","timestamp","noise_db","noise_cat","n_level","accuracy","avg_rt_ms","total_q","correct"]
    return {"results": [dict(zip(cols, r)) for r in rows]}

@app.get("/stats/{user_id}", response_model=StatsResponse)
def get_stats(user_id: str):
    """
    對某使用者做統計分析：
    - 安靜 vs 吵鬧環境的 Paired t-test（取 accuracy 比較）
    - 噪音 dB 與答對率的 Pearson 相關係數
    - Cohen's d 效果量
    """
    conn = sqlite3.connect(DB)
    rows = conn.execute(
        "SELECT noise_db, noise_cat, accuracy FROM sessions WHERE user_id=?", (user_id,)
    ).fetchall()
    conn.close()

    if len(rows) < 4:
        raise HTTPException(status_code=400, detail=f"資料不足（目前 {len(rows)} 筆，至少需要 4 筆）")

    dbs       = [r[0] for r in rows]
    accuracies = [r[2] for r in rows]

    quiet = [r[2] for r in rows if r[1] == "quiet"]
    loud  = [r[2] for r in rows if r[1] == "loud"]

    # Paired t-test（需要同樣多的安靜和吵鬧資料）
    t_stat = p_val = cohen_d = None
    if len(quiet) >= 2 and len(loud) >= 2:
        n = min(len(quiet), len(loud))
        t_stat, p_val = stats.ttest_rel(quiet[:n], loud[:n])
        pooled_std = np.std(quiet[:n] + loud[:n], ddof=1)
        if pooled_std > 0:
            cohen_d = (np.mean(quiet[:n]) - np.mean(loud[:n])) / pooled_std

    # Pearson 相關（噪音 dB vs 答對率）
    corr_r = None
    if len(dbs) >= 4:
        corr_r, _ = stats.pearsonr(dbs, accuracies)

    return StatsResponse(
        user_id=user_id,
        n_sessions=len(rows),
        t_statistic=round(float(t_stat), 4) if t_stat is not None else None,
        p_value=round(float(p_val), 4) if p_val is not None else None,
        cohen_d=round(float(cohen_d), 3) if cohen_d is not None else None,
        correlation_r=round(float(corr_r), 3) if corr_r is not None else None,
        mean_quiet=round(float(np.mean(quiet)), 3) if quiet else None,
        mean_loud=round(float(np.mean(loud)), 3) if loud else None,
        significant=bool(p_val is not None and p_val < 0.05),
    )

@app.delete("/results/{user_id}")
def delete_results(user_id: str):
    """清除某使用者的資料（測試用）"""
    conn = sqlite3.connect(DB)
    conn.execute("DELETE FROM sessions WHERE user_id=?", (user_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
