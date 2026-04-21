# Noise-Cognition Impact Measurement System

**Student:** B1042036 王麒茗
**Department of Computer Science and Engineering**

---

## Overview

This project investigates whether environmental noise significantly affects cognitive performance in real-world settings — a question previous research has only examined in controlled laboratory environments.

We built a mobile app that automatically measures ambient noise levels using the phone's microphone, then administers a standardized 2-back working memory test. By collecting data from the same individual across different noise environments, we can statistically determine how much noise affects that person's cognitive performance.

---

## Research Question

> Does environmental noise level significantly affect short-term working memory performance, and if so, by how much?

---

## Key Features

- Real-time ambient noise measurement via microphone (dB)
- Standardized 2-back cognitive test (~2 minutes per session)
- Within-subjects experimental design to control for individual differences
- Automatic data logging to backend database
- Statistical analysis: Paired t-test, Pearson correlation, Cohen's d

---

## System Architecture

```
Mobile App (React Native / Expo)
    │
    ├── Microphone → Noise measurement (dB)
    ├── N-back test interface
    └── Results & charts screen
          │
          ▼
    Backend API (FastAPI / Python)
          │
          ├── POST /result  → Save each session
          ├── GET  /results → Retrieve history
          └── GET  /stats   → Run statistical analysis
                │
                ▼
          SQLite Database
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Native (Expo 52) |
| Audio | expo-av |
| Backend | FastAPI (Python) |
| Database | SQLite |
| Statistics | scipy (Paired t-test, Pearson r) |

---

## Experimental Design

This study uses a **within-subjects design**: the same participant takes the N-back test in multiple noise environments (quiet / moderate / loud). This controls for individual cognitive ability, so observed performance differences can be attributed to noise.

**Noise categories** (based on Stansfeld & Matheson, 2003):

| Category | dB Range | Example |
|---|---|---|
| Quiet | < 45 dB | Library, home at night |
| Moderate | 45–65 dB | Office, classroom |
| Loud | > 65 dB | Cafeteria, MRT station |

**Statistical methods:**
- Paired t-test — tests whether performance differs significantly between quiet and loud conditions
- Pearson r — measures linear relationship between dB level and accuracy
- Cohen's d — quantifies effect size

---

## Installation

### Backend

```bash
cd backend
pip install -r requirements.txt
python main.py
# API runs at http://0.0.0.0:8000
```

### Frontend

```bash
cd frontend
npm install
# Edit constants.js: set API_BASE to your machine's IP address
npx expo start
# Scan QR code with Expo Go app
```

---

## Project Structure

```
.
├── README.md
├── slides/
│   └── progress_report.pptx
├── frontend/
│   ├── App.js
│   ├── constants.js
│   └── screens/
│       ├── HomeScreen.js
│       ├── TestScreen.js
│       └── ResultScreen.js
└── backend/
    ├── main.py
    └── requirements.txt
```

---

## References

- Owen, A. M., et al. (2005). N-back working memory paradigm: A meta-analysis of normative functional neuroimaging studies. *Human Brain Mapping*, 25(1), 46–59.
- Stansfeld, S. A., & Matheson, M. P. (2003). Noise pollution: non-auditory effects on health. *British Medical Bulletin*, 68(1), 243–257.
- Perham, N., & Vizard, J. (2011). Can preference for background music mediate the irrelevant sound effect? *Applied Cognitive Psychology*, 25(4), 625–631.
