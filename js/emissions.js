/* ── CarbonTrack · emissions.js ──
   Real-world emission factors from IPCC AR6, EPA, DEFRA 2023
   All values in kg CO₂e per unit stated
   ─────────────────────────────────────────────────────────── */

const EMISSION_FACTORS = {

  /* ── TRANSPORT ──────────────────────────────────────────────
     Source: DEFRA 2023, IPCC AR6 WG3 Ch10
     Unit: kg CO₂e per km unless noted                        */
  transport: {
    car_petrol:      { factor: 0.192,  unit: 'km',  label: 'Petrol car' },
    car_diesel:      { factor: 0.171,  unit: 'km',  label: 'Diesel car' },
    car_electric:    { factor: 0.053,  unit: 'km',  label: 'Electric car' },
    motorbike:       { factor: 0.114,  unit: 'km',  label: 'Motorbike' },
    bus:             { factor: 0.089,  unit: 'km',  label: 'Bus' },
    metro_train:     { factor: 0.041,  unit: 'km',  label: 'Metro / Train' },
    auto_rickshaw:   { factor: 0.098,  unit: 'km',  label: 'Auto-rickshaw' },
    flight_domestic: { factor: 0.255,  unit: 'km',  label: 'Domestic flight (per km)' },
    flight_longhaul: { factor: 0.195,  unit: 'km',  label: 'Long-haul flight (per km)' },
    walking_cycling: { factor: 0.0,    unit: 'km',  label: 'Walking / Cycling' },
  },

  /* ── FOOD ───────────────────────────────────────────────────
     Source: Poore & Nemecek 2018 (Science), OurWorldInData
     Unit: kg CO₂e per meal (avg portion ~400–600g)           */
  food: {
    beef_meal:       { factor: 6.61,   unit: 'meal', label: 'Beef meal' },
    lamb_meal:       { factor: 5.84,   unit: 'meal', label: 'Lamb meal' },
    pork_meal:       { factor: 1.72,   unit: 'meal', label: 'Pork meal' },
    chicken_meal:    { factor: 0.97,   unit: 'meal', label: 'Chicken meal' },
    fish_meal:       { factor: 0.84,   unit: 'meal', label: 'Fish meal' },
    egg_meal:        { factor: 0.53,   unit: 'meal', label: 'Egg-based meal' },
    dairy_meal:      { factor: 0.94,   unit: 'meal', label: 'Dairy-heavy meal' },
    vegetarian:      { factor: 0.43,   unit: 'meal', label: 'Vegetarian meal' },
    vegan:           { factor: 0.18,   unit: 'meal', label: 'Vegan meal' },
    south_indian_veg:{ factor: 0.29,   unit: 'meal', label: 'South Indian veg (idli/dosa)' },
  },

  /* ── HOME ENERGY ────────────────────────────────────────────
     Source: India CEA 2023 grid emission factor, BEE
     Unit: kg CO₂e per kWh (electricity) or per hour (AC/fan) */
  home: {
    electricity_kwh: { factor: 0.716,  unit: 'kWh',  label: 'Electricity (India grid)' },
    ac_hour:         { factor: 1.003,  unit: 'hour', label: 'Air conditioning (1.4kW unit)' },
    fan_hour:        { factor: 0.057,  unit: 'hour', label: 'Ceiling fan' },
    lpg_cylinder:    { factor: 63.2,   unit: 'cylinder', label: 'LPG cylinder (14.2kg)' },
    lpg_meal_cook:   { factor: 0.63,   unit: 'meal', label: 'LPG cooking (per meal)' },
    led_bulb_hour:   { factor: 0.007,  unit: 'hour', label: 'LED bulb (10W)' },
    washing_machine: { factor: 0.716,  unit: 'load', label: 'Washing machine (1 load)' },
    hot_shower_min:  { factor: 0.048,  unit: 'min',  label: 'Hot shower (per minute)' },
  },

  /* ── SHOPPING & CONSUMPTION ─────────────────────────────────
     Source: DEFRA 2023, Carbon Trust
     Unit: kg CO₂e per item / purchase                        */
  shopping: {
    clothing_item:   { factor: 10.0,   unit: 'item', label: 'Clothing item (avg)' },
    electronics_sm:  { factor: 70.0,   unit: 'item', label: 'Small electronic (phone acc.)' },
    electronics_lg:  { factor: 300.0,  unit: 'item', label: 'Large electronic (laptop/TV)' },
    online_delivery: { factor: 0.44,   unit: 'order',label: 'Online delivery order' },
    plastic_bag:     { factor: 0.033,  unit: 'bag',  label: 'Single-use plastic bag' },
    paper_bag:       { factor: 0.012,  unit: 'bag',  label: 'Paper bag' },
    streaming_hour:  { factor: 0.036,  unit: 'hour', label: 'Video streaming (1hr)' },
  },
};

/* Daily target (kg CO₂) — based on 1.5°C pathway per capita
   India average budget: ~2.5 kg/day
   We use 3.5 kg as a realistic near-term target               */
const DAILY_TARGET_KG = 3.5;

/* Max realistic daily emissions for score floor               */
const DAILY_MAX_KG = 20.0;

/* ── Core calculation functions ── */

/**
 * Calculate kg CO₂e for a single logged activity
 * @param {string} category  - 'transport' | 'food' | 'home' | 'shopping'
 * @param {string} type      - key within category
 * @param {number} quantity  - amount in the activity's native unit
 * @returns {number} kg CO₂e
 */
function calcActivityCO2(category, type, quantity) {
  const cat = EMISSION_FACTORS[category];
  if (!cat) return 0;
  const entry = cat[type];
  if (!entry) return 0;
  return Math.round(entry.factor * quantity * 100) / 100;
}

/**
 * Compute Carbon Score (0–100) from total daily kg CO₂
 * Formula:
 *   - At 0 kg       → Score = 100
 *   - At target     → Score = 65  (still rewarded for hitting target)
 *   - At 2× target  → Score = 30
 *   - At max        → Score = 0
 */
function calcCarbonScore(totalKg) {
  if (totalKg <= 0) return 100;
  const ratio = totalKg / DAILY_TARGET_KG;
  let score;
  if (ratio <= 1) {
    // 0–target: score goes from 100 → 65
    score = 100 - (ratio * 35);
  } else {
    // target–max: score goes from 65 → 0
    const overRatio = Math.min((totalKg - DAILY_TARGET_KG) / (DAILY_MAX_KG - DAILY_TARGET_KG), 1);
    score = 65 - (overRatio * 65);
  }
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Get level label from score
 */
function getLevel(score) {
  if (score >= 90) return { label: 'CLIMATE CHAMPION', next: null,      nextAt: null };
  if (score >= 75) return { label: 'ECO WARRIOR',      next: 'Climate Champion', nextAt: 90 };
  if (score >= 55) return { label: 'GREEN GUARD',      next: 'Eco Warrior',      nextAt: 75 };
  if (score >= 35) return { label: 'BEGINNER',         next: 'Green Guard',      nextAt: 55 };
  return               { label: 'HIGH EMITTER',    next: 'Beginner',         nextAt: 35 };
}

/**
 * Translate total kg into relatable equivalents
 */
function getEquivalents(totalKg) {
  return [
    {
      icon: '🌳',
      main: `= ${(totalKg / 0.06).toFixed(1)} hrs of tree absorption`,
      sub:  'A mature tree absorbs ~0.06kg CO₂/hr',
    },
    {
      icon: '🚗',
      main: `= driving ${Math.round(totalKg / 0.192)} km in a petrol car`,
      sub:  'Based on avg petrol car (0.192 kg/km)',
    },
    {
      icon: '❄️',
      main: `= ${(totalKg / 1.003).toFixed(1)} hrs of AC running`,
      sub:  'Standard 1.4kW split AC unit',
    },
    {
      icon: '💡',
      main: `= ${Math.round(totalKg / 0.716)} kWh of Indian grid electricity`,
      sub:  'India grid emission factor 2023',
    },
  ];
}

/* Export everything for use in app.js */
window.CT = {
  EMISSION_FACTORS,
  DAILY_TARGET_KG,
  calcActivityCO2,
  calcCarbonScore,
  getLevel,
  getEquivalents,
};
