// Mak's video call on the phone in the dashboard holder.
// call.mood: 'calling' (ringing, tap to angkat) → 'happy' (answered) or 'scold' (missed).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Sprite from '../Sprite';
import { SPRITES } from '../assets';

// Where things sit on the painted phone (fractions of the phone image), measured from the art.
const PORTRAIT = { x: 0.17, y: 0.075, w: 0.66, h: 0.43 }; // covers the avatar circle
const TEXT = { y: 0.515, h: 0.2 }; // between the portrait and the answer/decline buttons
const ANSWER = { x: 0.305, y: 0.755, r: 0.1 }; // green answer button: centre (fractions of the image), radius (of width)
const FACE_ZOOM = 1.15; // portrait image size relative to the portrait box width

function phoneMotion(call, t) {
  const e = t - call.start;
  const fade = call.mood === 'calling' ? 1 : Math.min(1, call.time / 0.25);
  if (call.mood === 'calling') {
    const ring = (e % 1) < 0.45 ? Math.sin(e * 60) * 5 : 0; // brr-brr, pause, brr-brr
    return { opacity: 1, transform: [{ rotate: `${ring}deg` }, { scale: 1 + 0.2 * Math.exp(-e * 6) * Math.cos(e * 20) }] };
  }
  if (call.mood === 'scold') return { opacity: fade, transform: [{ translateX: Math.sin(e * 45) * 2 }] };
  return { opacity: fade, transform: [] };
}

function faceMotion(call, t) {
  const e = t - call.start;
  if (call.mood === 'happy') return [{ translateY: -Math.abs(Math.sin(e * 8)) * 4 * Math.exp(-e * 1.2) }];
  if (call.mood === 'scold') return [{ translateX: Math.sin(e * 45) * 3 }, { scale: 1 + 0.15 * Math.exp(-e * 7) }];
  return [{ translateY: Math.sin(t * 3) * 1.5 }];
}

export default function MakPhone({ call, t, onPress, left, top, width }) {
  const height = width / SPRITES.phone.aspect;
  const pw = PORTRAIT.w * width;
  const ph = PORTRAIT.h * height;
  const size = pw * FACE_ZOOM;
  const face = SPRITES.mak[call.mood] ?? SPRITES.mak.calling;
  const isArt = typeof face === 'object';
  const calling = call.mood === 'calling';

  return (
    <Pressable
      onPress={onPress}
      disabled={!calling}
      pointerEvents={calling ? 'auto' : 'none'}
      style={[{ position: 'absolute', left, top, width, height }, phoneMotion(call, t)]}
    >
      <Sprite sprite={SPRITES.phone} width={width} height={height} />
      {/* video call: Mak's face */}
      <View
        style={{
          position: 'absolute', left: PORTRAIT.x * width, top: PORTRAIT.y * height, width: pw, height: ph,
          borderRadius: pw * 0.14, overflow: 'hidden',
          backgroundColor: call.mood === 'scold' ? '#ffc9c9' : '#ffe8a3',
        }}
      >
        <View style={{ position: 'absolute', left: (pw - size) / 2, top: (ph - size) / 2, transform: faceMotion(call, t) }}>
          {isArt ? (
            <Sprite sprite={face} width={size} height={size} />
          ) : (
            <Sprite sprite={face} width={size} height={size * 0.8} style={{ marginTop: size * 0.1 }} />
          )}
        </View>
      </View>
      {/* name + what she says */}
      <View
        style={{
          position: 'absolute', left: '13%', right: '13%', top: TEXT.y * height, height: TEXT.h * height,
          alignItems: 'center', justifyContent: 'flex-start',
        }}
      >
        <Text style={{ color: '#0b3d5c', fontWeight: '900', fontSize: width * 0.11 }}>Mak</Text>
        <Text
          numberOfLines={2}
          style={{ color: call.mood === 'scold' ? '#c92a2a' : '#0b3d5c', fontSize: width * 0.078, textAlign: 'center', fontWeight: '700' }}
        >
          "{call.text}"
        </Text>
      </View>
      {/* "angkat!": a ring pulsing round the green button, faster as time runs out */}
      {calling && (
        <View
          style={{
            position: 'absolute', left: ANSWER.x * width - ANSWER.r * width, top: ANSWER.y * height - ANSWER.r * width,
            width: ANSWER.r * 2 * width, height: ANSWER.r * 2 * width, borderRadius: ANSWER.r * width,
            borderWidth: Math.max(2, width * 0.025), borderColor: '#b2f2bb',
            opacity: 1 - ((t * (call.time < 2 ? 3 : 1.6)) % 1),
            transform: [{ scale: 1 + 0.6 * ((t * (call.time < 2 ? 3 : 1.6)) % 1) }],
          }}
        />
      )}
    </Pressable>
  );
}
