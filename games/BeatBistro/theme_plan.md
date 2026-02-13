
# Cooking Theme Implementation

## 1. Textures (Preload.js)

- **'icon_knife'**: Simple rectangle + handle (Left Lane)
- **'icon_pan'**: Circle + handle (Right Lane)
- **'particle_spark'**: Small square/circle for sizzle
- **'particle_smoke'**: Soft circle

## 2. Game Scene Visuals (Game.js)

- **Lane Icons**: Display Knife icon at bottom of Left Lane, Pan on Right.
- **Note Sprites**: Differentiate notes (maybe 'ingredients').
- **Particle Emitters**:
  - `sizzleEmitter`: White/Yellow sparks on hit. Intensity increases with combo.
  - `fireEmitter`: Red/Orange bursts on high combo (e.g. > 20).
  - `smokeEmitter`: Grey puff on Miss.
- **Feedback Text**:
  - Perfect -> "Taste Perfect!", "Sharp Cut!", "Just Right!"
  - Good -> "Good", "Tasty"
  - Miss -> "Burnt!", "Missed!", "Oh no!"

## 3. Plating Animation (Game.js -> Result.js)

- On `finishGame`, before transitioning, perform a quick animation:
  - Notes converge to center?
  - Or just a "Dish Ready!" overlay.
- `Result Scene`:
  - Show a big "Dish" circle.
  - Animate ingredients falling onto it.
  - Text: "Order Up!", "Perfectly Plated"

## 4. UI Tone

- Update `ScoreManager` or `Game.js` feedback strings.
