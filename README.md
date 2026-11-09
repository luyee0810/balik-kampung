# Balik Kampung 🚗🏡

First-person driving game: drive from KL to the kampung (300 km) for Raya.
Built with Expo, so it runs in the browser and on phones.

## Run it

```bash
npm install          # first time only
npm run web          # play in the browser → http://localhost:8081  (?play skips the menu, ?km=250 starts partway, ?call rings Mak quickly)
npx expo start       # play on your phone: scan the QR code with Expo Go
```

## Controls
- **Browser:** ← → (or A / D) to change lane, H to honk, Space / Enter to answer Mak's call. Clicking also works.
- **Phone:** tap the left/right side of the screen, or swipe. Tap the HON button to honk. Tap Mak's phone to answer (+15).
- **Honking** makes a kancil, car, kapcai or lembu ahead in your lane move aside (if there's room). Lorries and buses ignore you.

## Files
- `src/assets.js`: every sprite (traffic, pickups, roadside trees). Swap in your own PNGs here.
- `src/config.js`: difficulty, speed, bends, obstacles, pickups, milestones & gantry signs, Mak's lines
- `src/GameScreen.js`: game loop, collisions, HUD
- `src/scene/`: the 3D-ish view
  - `projection.js` camera maths (horizon, perspective)
  - `Backdrop.js` sky, clouds, mountains · `Road.js` highway · `Billboards.js` things standing in the world
  - `Cockpit.js` dashboard, steering wheel, hands · `Vectors.js` built-in placeholder drawings
- `App.js`: menu and result screens

## Art
Your painted art lives in `art/` (originals, any size):
- `art/backdrop/far.png`, `mid.png`, `front.png`: parallax layers on a solid magenta (#FF00FF) background
- `art/sprites/<name>.png`: kancil, lorry, cow, pothole, duit, rendang, teh, palm, tree, house, wheel, dashboard

After adding or changing art, run:

```bash
python3 scripts/prepare_art.py      # needs: pip install pillow numpy
```

Sound effects are synthesized by `python3 scripts/make_sounds.py` (writes `assets/sounds/`).

It removes the magenta, trims and shrinks everything into `assets/`, and regenerates `src/art.js`.
Missing pieces fall back to the built-in drawings. Sizes in the world are in `src/config.js`
(`w` for traffic/pickups, `SCENERY` for trees/houses). Layer height and parallax are at the top of the script.
