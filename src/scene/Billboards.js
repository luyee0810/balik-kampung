// Everything standing in the world (trees, traffic, pickups, signs), drawn far-to-near.
import React from 'react';
import { View, Text } from 'react-native';
import Sprite, { spriteAspect } from '../Sprite';
import { SPRITES } from '../assets';
import { SCENERY, CONFIG } from '../config';
import { project, hash } from './projection';

const TREE_GAP = 4.5;
const VERGE = 2.6; // trees stand clear of the guardrail
const PELITA_GAP = 3;

// Overhead sign gantry spanning the highway. The painted one has a blank board we write on.
const GANTRY_W = 4.9; // world width
const BOARD = { x0: 0.273, x1: 0.777, y0: 0.023, y1: 0.427 }; // board area in the painted gantry

function Gantry({ v, cam, z, text }) {
  const base = project(v, cam, 0, 0, z);
  const sc = base.scale;
  const art = SPRITES.gantry;
  if (art) {
    const w = GANTRY_W * sc;
    const h = w / art.aspect;
    const boardW = (BOARD.x1 - BOARD.x0) * w;
    const fs = Math.min((BOARD.y1 - BOARD.y0) * h * 0.3, (boardW * 0.85) / (Math.max(6, text.length) * 0.62));
    return (
      <View style={{ position: 'absolute', left: base.x - w / 2, top: base.y - h, width: w, height: h }}>
        <Sprite sprite={art} width={w} height={h} />
        <View
          style={{
            position: 'absolute', left: BOARD.x0 * w, width: (BOARD.x1 - BOARD.x0) * w,
            top: BOARD.y0 * h, height: (BOARD.y1 - BOARD.y0) * h, alignItems: 'center', justifyContent: 'center',
          }}
        >
          {fs > 3 && (
            <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: fs, textAlign: 'center' }}>
              {text}
            </Text>
          )}
        </View>
      </View>
    );
  }
  // built-in: posts + green board
  const top = project(v, cam, 0, 3.1, z);
  const fs = 0.26 * sc;
  return (
    <View style={{ position: 'absolute', left: base.x - 2.3 * sc, top: top.y, width: 4.6 * sc, height: 3.1 * sc }}>
      <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 0.09 * sc, backgroundColor: '#868e96' }} />
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 0.09 * sc, backgroundColor: '#868e96' }} />
      <View style={{ position: 'absolute', left: 0, right: 0, top: 0.35 * sc, height: 0.07 * sc, backgroundColor: '#868e96' }} />
      <View
        style={{
          position: 'absolute', left: 0.7 * sc, top: 0, width: 3.2 * sc, height: 0.8 * sc,
          backgroundColor: '#1e7a46', borderColor: '#fff', borderWidth: Math.max(0.5, 0.04 * sc),
          borderRadius: 0.06 * sc, alignItems: 'center', justifyContent: 'center',
        }}
      >
        {fs > 3 && (
          <Text numberOfLines={1} style={{ color: '#fff', fontWeight: '800', fontSize: fs }}>
            {text}
          </Text>
        )}
      </View>
    </View>
  );
}

// A vehicle that just drove over a pothole: hops, rocks side to side, and a comic "DUSH!".
function Wobbling({ o, sprite, x, y, w, h }) {
  const k = o.wobble / CONFIG.wobbleTime; // 1 → 0
  const e = CONFIG.wobbleTime - o.wobble; // seconds since the bump
  const hop = -Math.abs(Math.sin(e * 22)) * h * 0.1 * k;
  const tilt = Math.sin(e * 26) * 7 * k;
  const fs = Math.max(10, Math.min(w * 0.3, 34));
  return (
    <>
      <Sprite
        sprite={sprite}
        width={w}
        height={h}
        color={o.color}
        style={{ position: 'absolute', left: x - w / 2, top: y - h, transform: [{ translateY: hop }, { rotate: `${tilt}deg` }] }}
      />
      {k > 0.3 && (
        <Text
          style={{
            position: 'absolute', left: x - fs * 2.5, width: fs * 5, top: y - h - fs * 1.3, textAlign: 'center',
            fontSize: fs, fontWeight: '900', color: '#ffd43b', opacity: Math.min(1, (k - 0.3) * 4),
            textShadowColor: '#5c2d00', textShadowRadius: 1, textShadowOffset: { width: 2, height: 2 },
            transform: [{ rotate: '-8deg' }, { scale: 1 + 0.4 * Math.max(0, k - 0.8) * 5 }],
          }}
        >
          DUSH!
        </Text>
      )}
    </>
  );
}

export default function Billboards({ v, s }) {
  const cam = { x: s.camX, curve: s.curve };
  const items = [];
  const onScreen = (x, w) => x + w / 2 > 0 && x - w / 2 < v.width;

  // roadside trees (and kampung houses near the end)
  const first = Math.ceil((s.dist + 1.5) / TREE_GAP);
  const last = Math.floor((s.dist + v.zFar) / TREE_GAP);
  for (let j = first; j <= last; j++) {
    const z = j * TREE_GAP - s.dist;
    for (const side of [-1, 1]) {
      const r = hash(j * 7 + side);
      if (r < 0.12) continue;
      const kampung = s.km > 280 && r < 0.35;
      const kind = kampung ? 'house' : r < (side < 0 ? 0.7 : 0.4) ? 'palm' : 'tree';
      const sprite = SPRITES[kind];
      const hW = SCENERY[kind].h * (0.85 + hash(j * 5 + side) * 0.35); // height in world units
      const wW = hW * spriteAspect(sprite);
      const x = side * (VERGE + wW / 2 + hash(j * 13 + side) * 2.5);
      const p = project(v, cam, x, 0, z);
      const w = wW * p.scale;
      const h = hW * p.scale;
      if (w < 2 || !onScreen(p.x, w)) continue;
      items.push({
        z,
        el: (
          <Sprite
            key={`t${j}${side}`}
            sprite={sprite}
            width={w}
            height={h}
            style={{ position: 'absolute', left: p.x - w / 2, top: p.y - h }}
          />
        ),
      });
    }
  }

  // pelita lamps lining the road on the last stretch to the kampung
  if (s.km > 255) {
    const art = SPRITES.pelita;
    for (let j = Math.ceil((s.dist + 1.5) / PELITA_GAP); j * PELITA_GAP - s.dist < v.zFar * 0.6; j++) {
      const z = j * PELITA_GAP - s.dist;
      for (const side of [-1, 1]) {
        const p = project(v, cam, side * 2.15, 0, z);
        const h = SCENERY.pelita.h * p.scale;
        const w = h * spriteAspect(art);
        if (h < 3 || !onScreen(p.x, w)) continue;
        items.push({
          z,
          el: <Sprite key={`p${j}${side}`} sprite={art} width={w} height={h} style={{ position: 'absolute', left: p.x - w / 2, top: p.y - h }} />,
        });
      }
    }
  }

  // traffic, hazards, pickups and gantry signs
  for (const o of s.objects) {
    if (o.z > v.zFar || o.z < 0.8) continue;
    if (o.kind === 'sign') {
      items.push({ z: o.z, el: <Gantry key={`s${o.id}`} v={v} cam={cam} z={o.z} text={o.text} /> });
      continue;
    }

    const x = o.x ?? o.lane - 1; // o.x slides when something changes lane
    const lift = o.kind === 'pickup' ? 0.25 + 0.08 * Math.sin(s.t * 5 + o.id) : 0;
    const p = project(v, cam, x, lift, o.z);
    const sprite = SPRITES[o.key];
    const w = o.w * p.scale;
    const h = w / spriteAspect(sprite);
    if (w < 1.5) continue;
    if (o.wobble > 0) {
      items.push({ z: o.z, el: <Wobbling key={`o${o.id}`} o={o} sprite={sprite} x={p.x} y={p.y} w={w} h={h} /> });
      continue;
    }
    items.push({
      z: o.z,
      el: (
        <Sprite
          key={`o${o.id}`}
          sprite={sprite}
          width={w}
          height={h}
          color={o.color}
          style={{ position: 'absolute', left: p.x - w / 2, top: p.y - h }}
        />
      ),
    });
  }

  items.sort((a, b) => b.z - a.z);
  return items.map((i) => i.el);
}
