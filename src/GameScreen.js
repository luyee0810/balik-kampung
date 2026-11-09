import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, PanResponder, Pressable, Platform, useWindowDimensions } from 'react-native';
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { SPRITES } from './assets';
import Sprite, { spriteAspect } from './Sprite';
import { CONFIG, OBSTACLES, PICKUPS, MILESTONES, CALL_LINES, CAR_COLORS, STAGES, REACTIONS, SMALL_HITS, MAK_REPLIES, BUMPY } from './config';
import { makeView } from './scene/projection';
import Backdrop from './scene/Backdrop';
import Road from './scene/Road';
import Billboards from './scene/Billboards';
import Cockpit, { wheelRadius, wheelCenterY } from './scene/Cockpit';
import Mirror, { mirrorSize } from './scene/Mirror';
import MakPhone from './scene/MakPhone';

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (n) => Math.floor(Math.random() * n);
const pick = (arr) => arr[randInt(arr.length)];
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const pickWeighted = (items) => {
  const total = items.reduce((t, i) => t + i.weight, 0);
  let r = Math.random() * total;
  for (const i of items) {
    r -= i.weight;
    if (r <= 0) return i;
  }
  return items[items.length - 1];
};
const SHAKE_TIME = 0.4;
const HORN = 64; // horn button size

// On the web, ?km=250 starts partway along the route (handy for testing later stretches).
const startKm = () => {
  if (Platform.OS !== 'web') return 0;
  const m = /[?&]km=(\d+)/.exec(window.location.search);
  return m ? Math.min(Number(m[1]), CONFIG.targetKm - 1) : 0;
};

// Current stage and how far through it we are (0..1).
function stageAt(km) {
  let i = 0;
  while (i + 1 < STAGES.length && km >= STAGES[i + 1].fromKm) i++;
  const st = STAGES[i];
  const end = i + 1 < STAGES.length ? STAGES[i + 1].fromKm : CONFIG.targetKm;
  const f = Math.max(0, Math.min(1, (km - st.fromKm) / (end - st.fromKm)));
  const lerp = ([a, b]) => a + (b - a) * f;
  return { index: i, stage: st, speed: lerp(st.speed), gap: lerp(st.gap) };
}

function createState() {
  const km = startKm();
  return {
    lane: 1, // 0 left, 1 middle, 2 right
    camX: 0, // camera sideways position (smoothly follows lane)
    wheel: 0, // steering wheel angle in degrees
    curve: 0, // current bend of the road
    bg: 0, // how far the mountains have panned
    dist: 0, // world distance travelled
    t: 0,
    objects: [],
    floaters: [],
    km,
    speed: stageAt(km).speed,
    stageIdx: stageAt(km).index,
    lives: CONFIG.lives,
    score: 0,
    spawnTimer: 3, // a few quiet seconds to settle in
    invincible: 0,
    honkCool: 0, // seconds until the horn can be used again
    honkPose: 0, // seconds left showing the hand on the horn
    shield: 0,
    shake: 0,
    nextId: 1,
    banner: null,
    bannerTime: 0,
    milestoneIdx: MILESTONES.filter((m) => m.km <= km).length,
    // ?mak=calling|happy|scold on the web keeps Mak's phone up in that mood (for testing the art)
    call: (() => {
      const mood = Platform.OS === 'web' && (window.location.search.match(/[?&]mak=(\w+)/) || [])[1];
      if (!mood) return null;
      const text = mood === 'calling' ? CALL_LINES[0] : MAK_REPLIES[mood === 'happy' ? 'answered' : 'missed'][0];
      return { mood, text, time: 999, start: 0 };
    })(),
    // ?call on the web makes Mak ring after 3 s (for testing the phone)
    callTimer: Platform.OS === 'web' && /[?&]call\b/.test(window.location.search) ? 3 : rand(CONFIG.callMin, CONFIG.callMax),
    collected: { duit: 0, rendang: 0, teh: 0 },
    hits: 0,
    lastHit: null,
    face: null, // { face, start, end, prio } reaction showing in the rear-view mirror
    // ?faces on the web plays every mirror reaction in turn, ?faces=dizzy shows just one (for testing the face art)
    faceTest: Platform.OS === 'web' ? (window.location.search.match(/[?&]faces=?(\w*)/) || [])[1] ?? null : null,
    over: false,
  };
}

// Traffic ahead drives slower than you, so potholes (which stand still) slide under it.
// When one passes under a vehicle in the same lane, that vehicle wobbles (drawn in Billboards).
function potholeBumps(s) {
  const holes = s.objects.filter((o) => o.key === 'pothole' && !o.done);
  if (!holes.length) return;
  for (const car of s.objects) {
    if (car.kind !== 'obstacle' || !BUMPY.includes(car.key) || car.wobble > 0.3) continue;
    const x = car.x ?? car.lane - 1;
    const hit = holes.find((h) => Math.abs(h.lane - 1 - x) < 0.45 && h.prevZ > car.z && h.z <= car.z);
    if (hit) car.wobble = CONFIG.wobbleTime;
  }
}

// Show a reaction in the rear-view mirror (see REACTIONS in config.js).
function reactFace(s, r) {
  if (s.face && s.t < s.face.end && s.face.prio > r.prio) return;
  s.face = { face: r.face, start: s.t, end: s.t + r.time, prio: r.prio };
}

function addFloater(s, v, text, color = '#fff') {
  const y = v.roadBottomY - 90 - 28 * s.floaters.length; // stack, don't overlap
  s.floaters.push({ id: s.nextId++, text, x: v.cx, y, t: 1.4, color });
}

function spawnPickup(s, p, lane, z) {
  s.objects.push({ id: s.nextId++, kind: 'pickup', key: p.key, lane, z, w: p.w, speedMul: 1 });
}

function spawnWave(s, v) {
  const lane = randInt(3);
  const allowed = stageAt(s.km).stage.obstacles;
  const ob = pickWeighted(OBSTACLES.filter((o) => allowed.includes(o.key)));
  const z = v.zFar - 2;
  s.objects.push({
    id: s.nextId++, kind: 'obstacle', key: ob.key, lane, z,
    w: ob.w, speedMul: ob.speedMul, color: pick(CAR_COLORS),
  });
  if (Math.random() < CONFIG.pickupChance) {
    const otherLane = (lane + 1 + randInt(2)) % 3;
    spawnPickup(s, pickWeighted(PICKUPS.filter((x) => x.weight > 0)), otherLane, z + rand(1, 6));
  }
}

function summary(s, win) {
  return { win, score: s.score, km: Math.floor(s.km), collected: s.collected, hits: s.hits, lastHit: s.lastHit };
}

// Hon! The nearest vehicle/lembu ahead in your lane may move aside. Returns false while on cooldown.
function honk(s, v) {
  if (s.over || s.honkCool > 0) return false;
  s.honkCool = CONFIG.honkCooldown;
  s.honkPose = 0.45;
  const lane = Math.round(s.camX) + 1;
  const target = s.objects
    .filter((o) => o.kind === 'obstacle' && o.lane === lane && o.z > v.zNear && o.z < CONFIG.honkRange)
    .filter((o) => OBSTACLES.find((x) => x.key === o.key).honk)
    .sort((a, b) => a.z - b.z)[0];
  if (!target) {
    addFloater(s, v, 'Hon! 📯', '#fff');
    return true;
  }
  const react = OBSTACLES.find((x) => x.key === target.key).honk;
  if (!react.moves) {
    addFloater(s, v, react.text, '#ffd8a8');
    reactFace(s, REACTIONS.honkIgnored);
    return true;
  }
  // move to an adjacent lane with nothing nearby
  const free = [target.lane - 1, target.lane + 1].filter(
    (l) => l >= 0 && l <= 2 && !s.objects.some((o) => o !== target && o.lane === l && Math.abs(o.z - target.z) < 6)
  );
  if (!free.length) {
    addFloater(s, v, 'Tak ada ruang nak ke tepi!', '#ffd8a8');
    return true;
  }
  target.x = target.lane - 1;
  target.lane = pick(free);
  target.slow = !!react.slow;
  addFloater(s, v, react.text, '#b2f2bb');
  return true;
}

// One frame of game logic. Returns a result object when the game ends.
function update(s, v, dt) {
  if (s.over) return null;
  s.t += dt;

  // steering: camera glides to the chosen lane, wheel turns with lane changes and bends
  const targetX = s.lane - 1;
  s.camX += (targetX - s.camX) * Math.min(1, dt * 9);

  // speed & distance
  const stage = stageAt(s.km);
  s.speed += (stage.speed - s.speed) * Math.min(1, dt * 0.6); // ease into the stage's speed
  if (stage.index !== s.stageIdx) {
    s.stageIdx = stage.index;
    s.banner = stage.stage.title;
    s.bannerTime = 4;
    reactFace(s, REACTIONS.busyStage);
  }
  const move = s.speed * dt;
  const zMove = move * CONFIG.worldPerPx;
  s.km += move / CONFIG.pxPerKm;
  s.dist += zMove;
  s.curve = CONFIG.curviness * (Math.sin(s.dist / 170) * 0.7 + Math.sin(s.dist / 61) * 0.3);
  s.bg += s.curve * zMove * 900;
  const wheelTarget = clamp((targetX - s.camX) * 60 + s.curve * 9000, -75, 75);
  s.wheel += (wheelTarget - s.wheel) * Math.min(1, dt * 10);

  s.invincible = Math.max(0, s.invincible - dt);
  s.honkCool = Math.max(0, s.honkCool - dt);
  s.honkPose = Math.max(0, s.honkPose - dt);
  s.shield = Math.max(0, s.shield - dt);
  s.shake = Math.max(0, s.shake - dt);
  s.bannerTime = Math.max(0, s.bannerTime - dt);
  if (s.faceTest != null && (!s.face || s.t >= s.face.end + 0.5)) {
    const all = ['shock', 'sweat', 'hairUp', 'dizzy', 'sleepy'];
    const face = s.faceTest || all[(s.faceTestIdx = ((s.faceTestIdx ?? -1) + 1) % all.length)];
    s.face = { face, start: s.t, end: s.t + 1.5, prio: 9 };
  }

  // route milestones: banner + gantry sign driving toward you
  const m = MILESTONES[s.milestoneIdx];
  if (m && s.km >= m.km) {
    s.banner = m.text;
    s.bannerTime = 3;
    s.milestoneIdx++;
    if (m.sign) s.objects.push({ id: s.nextId++, kind: 'sign', text: m.sign, z: v.zFar - 2, speedMul: 1 });
    if (m.teh) spawnPickup(s, PICKUPS.find((p) => p.key === 'teh'), randInt(3), v.zFar + 4);
  }

  // spawning
  s.spawnTimer -= dt;
  if (s.spawnTimer <= 0 && s.km < CONFIG.targetKm - 5) {
    spawnWave(s, v);
    s.spawnTimer = stage.gap * rand(0.85, 1.25);
  }

  // move objects & check collisions as they reach the front of the car
  const playerLane = Math.round(s.camX) + 1;
  for (const o of s.objects) {
    o.prevZ = o.z;
    o.z -= zMove * o.speedMul;
    if (o.wobble) o.wobble = Math.max(0, o.wobble - dt);
    if (o.x != null) o.x += (o.lane - 1 - o.x) * Math.min(1, dt * (o.slow ? 1.8 : 5)); // sliding aside
    if (o.kind === 'sign' || o.done || o.lane !== playerLane) continue;
    if (o.z > v.zNear + 0.6 || o.z < v.zNear - 0.5) continue;

    if (o.kind === 'pickup') {
      const p = PICKUPS.find((x) => x.key === o.key);
      s.score += p.score;
      s.collected[p.key]++;
      if (p.shield) s.shield = CONFIG.shieldTime;
      addFloater(s, v, p.text, '#ffe066');
      o.done = true;
    } else if (s.shield > 0) {
      s.score += 5;
      addFloater(s, v, 'Langgar je! +5', '#8ce99a');
      o.done = true;
    } else if (s.invincible <= 0) {
      const ob = OBSTACLES.find((x) => x.key === o.key);
      s.lives--;
      s.hits++;
      s.lastHit = ob.hit;
      s.invincible = CONFIG.invincibleTime;
      s.shake = SHAKE_TIME;
      addFloater(s, v, ob.hit, '#ff8787');
      reactFace(s, SMALL_HITS.includes(ob.key) ? REACTIONS.hitSmall : REACTIONS.hitBig);
      o.done = true;
    }
  }
  potholeBumps(s);
  s.objects = s.objects.filter((o) => !o.done && o.z > (o.kind === 'sign' ? 1 : v.zNear - 0.6));

  // floating texts
  for (const f of s.floaters) {
    f.t -= dt;
    f.y -= 45 * dt;
  }
  s.floaters = s.floaters.filter((f) => f.t > 0);

  // Mak calling
  // mood: 'calling' (ringing, tap to answer) → 'happy' (answered) or 'scold' (missed), shown briefly
  if (s.call) {
    s.call.time -= dt;
    if (s.call.time <= 0 && s.call.mood !== 'calling') {
      s.call = null;
    } else if (s.call.time <= 0) {
      s.call = { mood: 'scold', text: pick(MAK_REPLIES.missed), time: MAK_REPLIES.showTime, start: s.t };
      addFloater(s, v, 'Mak merajuk 😤', '#ffa8a8');
      reactFace(s, REACTIONS.makMissed);
    }
  } else {
    s.callTimer -= dt;
    if (s.callTimer <= 0) {
      s.call = { mood: 'calling', text: pick(CALL_LINES), time: CONFIG.callDuration, start: s.t };
      reactFace(s, REACTIONS.makCalls);
      s.callTimer = rand(CONFIG.callMin, CONFIG.callMax);
    }
  }

  // end conditions
  if (s.lives <= 0) {
    s.over = true;
    return summary(s, false);
  }
  if (s.km >= CONFIG.targetKm) {
    s.km = CONFIG.targetKm;
    s.score += s.lives * 50; // bonus for arriving in one piece
    s.over = true;
    return summary(s, true);
  }
  return null;
}

export default function GameScreen({ onEnd }) {
  const { width, height } = useWindowDimensions();
  const g = useRef(createState());
  const [, setFrame] = useState(0);
  const [hudH, setHudH] = useState(100); // measured, so the mirror hangs just below the HUD
  const v = makeView(width, height);
  const dims = useRef(v);
  dims.current = v;

  const changeLane = (dir) => {
    const s = g.current;
    if (s.over) return;
    const from = s.lane;
    s.lane = clamp(s.lane + dir, 0, 2);
    // near miss: swerved out of the way of something about to hit you
    const v = dims.current;
    const soon = v.zNear + 0.6 + s.speed * CONFIG.worldPerPx * REACTIONS.nearMissTime;
    if (s.lane !== from && s.invincible <= 0 && s.shield <= 0) {
      const close = s.objects.some((o) => o.kind === 'obstacle' && o.lane === from && o.z > v.zNear && o.z < soon);
      if (close) reactFace(s, REACTIONS.nearMiss);
    }
  };

  const horn = useAudioPlayer(require('../assets/sounds/horn.wav'));
  const hornRef = useRef(horn);
  hornRef.current = horn;
  useEffect(() => {
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);
  const doHonk = () => {
    if (!honk(g.current, dims.current)) return;
    try {
      hornRef.current.seekTo(0);
      hornRef.current.play();
    } catch (e) {
      // sound is a bonus; never let it break the game
    }
  };

  const answerCall = () => {
    const s = g.current;
    if (!s.call || s.call.mood !== 'calling') return;
    s.call = { mood: 'happy', text: pick(MAK_REPLIES.answered), time: MAK_REPLIES.showTime, start: s.t };
    s.score += 15;
    addFloater(s, dims.current, 'Angkat call Mak +15', '#a5d8ff');
  };

  // Tap left/right half of the screen, or swipe, to change lanes.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderRelease: (_, gs) => {
        if (Math.abs(gs.dx) > 25) changeLane(gs.dx > 0 ? 1 : -1);
        else changeLane(gs.x0 < dims.current.width / 2 ? -1 : 1);
      },
    })
  ).current;

  // game loop
  useEffect(() => {
    let raf;
    let last = null;
    const tick = (t) => {
      if (last == null) last = t;
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;
      const result = update(g.current, dims.current, dt);
      setFrame((f) => (f + 1) % 1000000);
      if (result) {
        setTimeout(() => onEnd(result), 1000);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Keyboard controls (browser only): ←/→ or A/D to change lane, Space/Enter to answer Mak, H to honk.
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') changeLane(-1);
      else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') changeLane(1);
      else if (e.key === ' ' || e.key === 'Enter') answerCall();
      else if (e.key === 'h' || e.key === 'H') doHonk();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const s = g.current;
  const progress = s.km / CONFIG.targetKm;
  const barW = width - 110;
  const kmh = Math.round(60 + s.speed * 0.12); // ~90 km/j at the start, ~115 at the end
  const shakeK = s.shake / SHAKE_TIME;
  const shake = [{ translateX: Math.sin(s.t * 90) * 10 * shakeK }, { translateY: Math.cos(s.t * 70) * 6 * shakeK }];
  const phoneW = SPRITES.phone ? Math.min(150, width * 0.32) : Math.min(150, width * 0.36);
  // Phone holder on the dashboard, just right of the steering wheel and above the right hand.
  const wheelR = wheelRadius(v);
  const wheelCy = wheelCenterY(v);
  const phoneSpot = SPRITES.phone && {
    left: Math.min(v.cx + wheelR * 1.15, width - phoneW / 2 - 8) - phoneW / 2,
    top: wheelCy - wheelR * 0.6 - phoneW / SPRITES.phone.aspect,
  };
  // Rear-view mirror: top of the windscreen, a little left of centre (right-hand drive).
  const mirror = mirrorSize(v);
  mirror.left = clamp(v.cx - width * 0.12 - mirror.w / 2, 8, width - mirror.w - 8);
  mirror.top = hudH + 6;
  const bannerTop = Math.max(v.horizonY * 0.45, mirror.top + mirror.h + 10);

  return (
    <View style={styles.root} {...pan.panHandlers}>
      {/* the world */}
      <View style={[StyleSheet.absoluteFill, { transform: shake }]} pointerEvents="none">
        <Backdrop v={v} s={s} />
        <Road v={v} s={s} />
        <Billboards v={v} s={s} />
        <Cockpit v={v} s={s} kmh={kmh} />
        <Mirror s={s} {...mirror} />
      </View>

      {/* hit flash & teh tarik shield glow */}
      {s.shake > 0 && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(255,40,40,${0.35 * shakeK})` }]} />
      )}
      {s.shield > 0 && (
        <View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.shieldGlow, { opacity: s.shield < 1 && Math.floor(s.t * 8) % 2 ? 0.3 : 1 }]}
        />
      )}

      {/* floating texts */}
      {s.floaters.map((f) => (
        <Text
          key={f.id}
          pointerEvents="none"
          style={[styles.floater, { left: f.x - 140, top: f.y, color: f.color, opacity: Math.min(1, f.t * 2) }]}
        >
          {f.text}
        </Text>
      ))}

      {/* HUD */}
      <View
        style={[styles.hud, { paddingTop: Platform.OS === 'web' ? 12 : 48 }]}
        pointerEvents="none"
        onLayout={(e) => setHudH(e.nativeEvent.layout.height)}
      >
        <View style={styles.hudRow}>
          <View style={styles.hudRow}>
            {Array.from({ length: CONFIG.lives }).map((_, i) => (
              <Sprite key={i} sprite={i < s.lives ? SPRITES.heart : SPRITES.heartEmpty} width={22} style={{ marginRight: 3 }} />
            ))}
            {s.shield > 0 && <Text style={styles.hearts}>{`  ☕${Math.ceil(s.shield)}`}</Text>}
          </View>
          <Text style={styles.score}>Duit raya: RM{s.score}</Text>
        </View>
        <View style={styles.progressRow}>
          <Sprite sprite={SPRITES.city} width={30} />
          <View style={[styles.bar, { width: barW }]}>
            <View style={[styles.barFill, { width: barW * progress }]} />
            <Sprite
              sprite={SPRITES.player}
              width={28}
              height={28 / spriteAspect(SPRITES.player)}
              style={{ position: 'absolute', left: barW * progress - 14, bottom: -2 }}
            />
          </View>
          <Sprite sprite={SPRITES.kampung} width={30} />
        </View>
        <Text style={styles.km}>
          {Math.floor(s.km)} / {CONFIG.targetKm} km · Peringkat {s.stageIdx + 1}
        </Text>
      </View>

      {/* milestone banner */}
      {s.bannerTime > 0 && (
        <View style={[styles.bannerWrap, { top: bannerTop }]} pointerEvents="none">
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{s.banner}</Text>
          </View>
        </View>
      )}

      {/* horn button on the dashboard, left of the wheel */}
      <Pressable
        onPress={doHonk}
        style={[
          styles.horn,
          {
            width: HORN, height: HORN, borderRadius: HORN / 2,
            left: Math.max(v.cx - wheelR * 1.15, HORN / 2 + 8) - HORN / 2,
            top: wheelCy - wheelR * 0.6 - HORN,
            opacity: s.honkCool > 0 ? 0.55 : 1,
            transform: [{ scale: s.honkCool > CONFIG.honkCooldown - 0.15 ? 0.9 : 1 }],
          },
        ]}
      >
        <Text style={styles.hornIcon}>📯</Text>
        <Text style={styles.hornText}>HON{Platform.OS === 'web' ? ' (H)' : ''}</Text>
      </Pressable>

      {/* Mak calling: phone in the holder on the dashboard */}
      {s.call &&
        (SPRITES.phone ? (
          <MakPhone call={s.call} t={s.t} onPress={answerCall} {...phoneSpot} width={phoneW} />
        ) : (
          <Pressable
            onPress={answerCall}
            style={[styles.phone, { width: phoneW, right: 12, top: v.roadBottomY - wheelRadius(v) * 0.25 - 120 }]}
          >
            <Text style={styles.callTitle}>
              {s.call.mood === 'calling' ? '📱 Mak calling...' : s.call.mood === 'happy' ? '🥰 Mak' : '😤 Mak'}
            </Text>
            <Text style={styles.callText}>"{s.call.text}"</Text>
            {s.call.mood === 'calling' && (
              <Text style={styles.callHint}>
                {Platform.OS === 'web' ? 'Tap / Space' : 'Tap'} to angkat ({Math.ceil(s.call.time)})
              </Text>
            )}
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#3d8fd6', overflow: 'hidden' },
  shieldGlow: { borderWidth: 8, borderColor: 'rgba(255,212,59,0.85)' },
  floater: {
    position: 'absolute', width: 280, textAlign: 'center', fontSize: 18, fontWeight: '800',
    textShadowColor: '#000', textShadowRadius: 4, textShadowOffset: { width: 1, height: 1 },
  },
  hud: {
    position: 'absolute', top: 0, left: 0, right: 0, paddingHorizontal: 14,
    paddingBottom: 8, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hearts: { fontSize: 20, color: '#ffe066', fontWeight: '800' },
  score: { color: '#ffe066', fontSize: 18, fontWeight: '800' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  bar: { height: 10, backgroundColor: '#495057', borderRadius: 5, marginHorizontal: 6 },
  barFill: { height: 10, backgroundColor: '#69db7c', borderRadius: 5 },
  km: { color: '#fff', textAlign: 'center', marginTop: 4, fontWeight: '600' },
  bannerWrap: { position: 'absolute', left: 20, right: 20, alignItems: 'center' },
  banner: { padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.92)', maxWidth: 520 },
  bannerText: { textAlign: 'center', fontSize: 16, fontWeight: '700', color: '#212529' },
  phone: {
    position: 'absolute', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 18,
    backgroundColor: '#1c7ed6', borderWidth: 4, borderColor: '#111', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6,
  },
  callTitle: { color: '#fff', fontWeight: '800', fontSize: 14 },
  callText: { color: '#fff', fontSize: 13, marginTop: 4, textAlign: 'center' },
  callHint: { color: '#d0ebff', fontSize: 11, marginTop: 6, textAlign: 'center' },
  horn: {
    position: 'absolute', backgroundColor: '#1f2125', borderWidth: 3, borderColor: '#868e96',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 6,
  },
  hornIcon: { fontSize: 22 },
  hornText: { color: '#ffd43b', fontSize: 10, fontWeight: '900', marginTop: -2 },
});
