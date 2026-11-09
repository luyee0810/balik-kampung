// All game visuals live here. Each value can be:
//   ART.name                 your painted art (art/sprites/name.png, prepared by scripts/prepare_art.py)
//   '@name'                  a built-in vector drawing (src/scene/Vectors.js)
//   '🐄'                     an emoji placeholder
// Anything missing from ART falls back to the drawing/emoji after the ??.
// Vehicles and the cow are seen from BEHIND (you're following them).
import { ART } from './art';

export const SPRITES = {
  // on the road
  pothole: ART.pothole ?? '@pothole',
  cow: ART.cow ?? '🐄',
  kancil: ART.kancil ?? '@car', // slow car hogging the lane
  car2: ART.car2 ?? '@car',
  lorry: ART.lorry ?? '@lorry',
  bus: ART.bus ?? '@lorry',
  kapcai: ART.kapcai ?? '🛵',
  // pickups
  duit: ART.duit ?? '🧧', // duit raya packet
  rendang: ART.rendang ?? '🍛',
  teh: ART.teh ?? '☕', // teh tarik power-up from R&R
  // roadside
  palm: ART.palm ?? '@palm', // oil palm
  tree: ART.tree ?? '@tree', // rain tree
  house: ART.house ?? '🏠', // kampung houses near the end
  pelita: ART.pelita ?? '🔥', // oil lamps lining the kampung road
  gantry: ART.gantry ?? null, // overhead sign (blank board; the game writes the text)
  // cockpit (null = built-in drawing)
  wheel: ART.wheel ?? null, // wheel + hands, square, wheel centred
  wheelHonk: ART.wheel_honk ?? null, // same wheel, right hand pressing the horn
  dashboard: ART.dashboard ?? null,
  phone: ART.phone ?? null, // Mak calling
  // driver's face in the rear-view mirror (made by scripts/slice_faces.py)
  faces: {
    normal: ART.face_normal ?? '🙂',
    shock: ART.face_shock ?? '😲',
    sweat: ART.face_sweat ?? '😰',
    hairUp: ART.face_hairup ?? '😱',
    dizzy: ART.face_dizzy ?? '😵‍💫',
    sleepy: ART.face_sleepy ?? '😴',
  },
  // Mak's face on the phone during her calls (made by scripts/slice_faces.py --mak)
  mak: {
    calling: ART.mak_calling ?? '👩',
    happy: ART.mak_happy ?? '🥰',
    scold: ART.mak_scold ?? '😤',
  },
  // kampung scene after arriving (made by scripts/slice_sheet.py); null = emoji stand-ins
  scene: {
    boy: { happy: ART.boy_happy ?? '🙋', shock: ART.boy_shock ?? '😱', nervous: ART.boy_nervous ?? '😅' },
    mak: { welcome: ART.mak_welcome ?? '🤗', asking: ART.mak_asking ?? '🤲', joy: ART.mak_joy ?? '🥰' },
    kids: { waiting: ART.kids_waiting ?? '🤩', cheer: ART.kids_cheer ?? '🥳', sulk: ART.kids_sulk ?? '😢' },
  },
  // HUD: images or emoji
  player: ART.icon_car ?? '🚗',
  city: ART.icon_city ?? '🏙️',
  kampung: ART.icon_kampung ?? '🏡',
  heart: ART.heart ?? '❤️',
  heartEmpty: ART.heart_empty ?? '🖤',
};
