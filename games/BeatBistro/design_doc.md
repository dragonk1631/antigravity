# Game Design Document: Beat Bistro (Beat Bistro)

## 1. Game Overview

- **Title (Tentative):** Beat Bistro
- **Genre:** Casual Rhythm Action (Polyrhythm)
- **Platform:** Web (PC/Mobile), Progressive Web App (PWA) friendly
- **Core Gameplay:** Two-lane rhythm game (Left/Right hands) requiring players to master polyrhythms (e.g., 2:3).
- **Target Audience:** Casual gamers who enjoy musical challenges.

## 2. Gameplay Mechanics

- **Controls:**
  - **Desktop:** Keyboard 'F' (Left) and 'J' (Right). Re-mappable.
  - **Mobile:** Split screen touch pads (Left half / Right half).
- **Rhythm System:**
  - **Polyrhythm:** Left and right hands play different time signatures simultaneously.
  - **Visuals:** Abstract visualization (e.g., central rings or timeline bars).
  - **Input Layer:** Abstracted `Hit(hand, eventTimeMs)` function.
- **Scoring:**
  - **Judgement:** Perfect (±45ms), Good (±90ms), Miss (Outside).
  - **Score Multipliers:** Combo-based and "Concurrency Bonus" for maintaining rhythm with both hands.

## 3. Audio & Technical

- **Engine:** Phaser 3 (Rendering), Web Audio API (Audio Timing).
- **Scheduling:** Look-ahead scheduler (25ms loop, booking 100ms ahead) for precise timing, avoiding main thread jitter.
- **Latency Compensation:** Audio/Input offset slider in settings.

## 4. Game Structure

- **Session:** Short bursts (30-90 seconds).
- **Progression:**
  - **World Map:** Linear or branching progression unlocking new "Recipes" (Songs/Levels).
  - **XP/Rank:** Unlocks cosmetic items (skins, sound packs).
- **Daily Menu:** Daily challenge with fixed seed.

## 5. Content (MVP)

- **Levels:** 15 Total (10x 2:3 patterns, 5x 3:4 patterns).
- **Mutations:** Gameplay modifiers like "Hidden Guide", "Accent Bonus", "Swap Phase".

## 6. Monetization (Hooks)

- **AdService:** Interface for Interstitial/Rewarded ads.
- **Rewards:** Combo Shield, Revive.

## 7. Tech Stack

- **Languages:** HTML5, JavaScript.
- **Build Tool:** Vite.
- **Hosting:** Static Web Hosting capable.
