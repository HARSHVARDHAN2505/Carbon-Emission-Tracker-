# CarbonTrack v2 — Dynamic Edition

## What's new in v2
- **Real activity logger** — tap the `+` button to log actual activities
- **Live carbon score** — calculated from real IPCC/DEFRA emission factors
- **Emission factors reference** — all factors shown on the Impact screen with sources
- **Dynamic equivalents** — tree hours, km driven, AC hours update from your real logs
- **Activity feed** — every logged item appears with timestamp and CO₂ value

## Project Structure
```
carbontrack-v2/
├── index.html          ← App shell + all screens
├── css/
│   └── style.css       ← All styles including logger modal
├── js/
│   ├── emissions.js    ← Emission factors + score formula
│   └── app.js          ← Navigation, logger, live calculations
└── README.md
```

## How to Run in VS Code
1. Install **Live Server** extension (Ritwick Dey)
2. `File → Open Folder → carbontrack-v2`
3. Right-click `index.html` → **Open with Live Server**
4. Opens at `http://127.0.0.1:5500`

Or just double-click `index.html` in any browser — no server needed.

## How the Carbon Score Works

```
Score = f(daily_kg_CO₂)

If emissions ≤ target (3.5kg):
  Score = 100 - (ratio × 35)     → range 65–100

If emissions > target:
  Score = 65 - (overRatio × 65)  → range 0–65
```

| Daily CO₂  | Score | Level          |
|-----------|-------|----------------|
| 0 kg      | 100   | Climate Champion|
| 1.75 kg   | 82    | Eco Warrior     |
| 3.5 kg    | 65    | Green Guard     |
| 7.0 kg    | 32    | Beginner        |
| 14+ kg    | 0     | High Emitter    |

## Emission Factors (key ones)
| Activity              | Factor         | Source         |
|-----------------------|---------------|----------------|
| Petrol car            | 0.192 kg/km   | DEFRA 2023     |
| Metro/Train           | 0.041 kg/km   | DEFRA 2023     |
| Beef meal             | 6.61 kg/meal  | Poore 2018     |
| Vegan meal            | 0.18 kg/meal  | Poore 2018     |
| India electricity     | 0.716 kg/kWh  | CEA 2023       |
| AC (1hr, 1.4kW)       | 1.003 kg/hr   | BEE / CEA      |
| Domestic flight       | 0.255 kg/km   | DEFRA 2023     |
