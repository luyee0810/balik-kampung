// Rear-view mirror with the driver's face reacting to what happens (REACTIONS in config.js).
// The face art is a square image; FACE_* say which part of it shows in the glass.
import React from 'react';
import { View } from 'react-native';
import Sprite from '../Sprite';
import { SPRITES } from '../assets';
import { REACTIONS } from '../config';

const ASPECT = 2.7; // mirror width / height
const FACE_TOP = 0.2; // image row at the top of the glass, as a fraction of the face image
const FACE_SHOW = 0.52; // how much of the image height fits in the glass (forehead to chin)

export const mirrorSize = (v) => {
  const w = Math.min(Math.max(v.width * 0.36, 170), 280);
  return { w, h: w / ASPECT };
};

// Comic motion for each face. e = seconds since the reaction started, t = game time.
function motion(face, e, t) {
  const pop = Math.exp(-e * 7) * Math.cos(e * 28); // quick bounce that settles
  switch (face) {
    case 'shock':
      return [{ scale: 1 + 0.3 * pop }];
    case 'hairUp':
      return [
        { translateY: -8 * Math.exp(-e * 6) },
        { translateX: Math.sin(e * 70) * 3 * Math.exp(-e * 3) },
        { scale: 1 + 0.2 * pop },
      ];
    case 'sweat':
      return [{ translateX: Math.sin(e * 50) * 1.5 }, { scale: 1 + 0.1 * pop }];
    case 'dizzy':
      return [{ rotate: `${Math.sin(e * 7) * 8}deg` }, { scale: 1 + 0.12 * pop }];
    case 'sleepy':
      return [{ translateY: Math.sin(t * 2) * 2 }, { rotate: '4deg' }];
    default:
      return [{ translateY: Math.sin(t * 14) * 0.7 }]; // road vibration
  }
}

export default function Mirror({ s, left, top, w, h }) {
  const active = s.face && s.t < s.face.end;
  const face = active ? s.face.face : s.lives === 1 ? REACTIONS.lastLifeFace : 'normal';
  const e = active ? s.t - s.face.start : 99;
  const pad = Math.max(3, h * 0.08);
  const gh = h - pad * 2; // glass size
  const gw = w - pad * 2;
  const size = gh / FACE_SHOW; // face image size
  const sprite = SPRITES.faces[face] ?? SPRITES.faces.normal;
  const isArt = typeof sprite === 'object';

  return (
    <>
      {/* stem up to the roof */}
      <View
        style={{
          position: 'absolute', left: left + w / 2 - h * 0.09, width: h * 0.18, top: 0, height: top + pad,
          backgroundColor: '#2b2d31',
        }}
      />
      <View
        style={{
          position: 'absolute', left, top, width: w, height: h, padding: pad,
          borderRadius: h * 0.45, backgroundColor: '#1f2125',
          shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 5,
        }}
      >
        <View style={{ flex: 1, borderRadius: gh * 0.45, overflow: 'hidden', backgroundColor: '#c9dfe9' }}>
          {/* back seat & rear window seen in the mirror */}
          <View style={{ position: 'absolute', left: 0, right: 0, top: 0, height: gh * 0.45, backgroundColor: '#e3f0f6' }} />
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: gh * 0.3, backgroundColor: '#8c7a6b' }} />
          <View
            style={{
              position: 'absolute', left: gw / 2 - size / 2, top: -FACE_TOP * size, width: size, height: size,
              transform: motion(face, e, s.t),
            }}
          >
            {isArt ? (
              <Sprite sprite={sprite} width={size} height={size} />
            ) : (
              <Sprite sprite={sprite} width={size} height={gh} style={{ marginTop: FACE_TOP * size }} />
            )}
          </View>
          {/* glass shine */}
          <View
            style={{
              position: 'absolute', top: -gh, left: gw * 0.72, width: gw * 0.08, height: gh * 3,
              backgroundColor: 'rgba(255,255,255,0.28)', transform: [{ rotate: '25deg' }],
            }}
          />
        </View>
      </View>
    </>
  );
}
