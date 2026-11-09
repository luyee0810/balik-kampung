// Arriving at the kampung: a short comic where the anak buah ask for duit raya.
// Steps: 'arrive' (tap) → 'ask' (choose how much to give) → 'result' (summary).
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Platform, useWindowDimensions } from 'react-native';
import Sprite from './Sprite';
import { SPRITES } from './assets';
import { SCREENS } from './art';
import { KAMPUNG } from './config';

// Pose art: every pose of a character shares one canvas (aspect 0.75); feet = where the feet
// touch the ground in that canvas (fraction of its height), measured from the art.
const CANVAS_ASPECT = 0.75;
const FEET = { boy: 0.955, mak: 0.895, kids: { waiting: 0.73, cheer: 0.73, sulk: 0.735 } };

const easeOutBack = (x) => 1 + 2.2 * (x - 1) ** 3 + 1.2 * (x - 1) ** 2;
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// Clock in seconds since the scene opened, ticking every frame.
function useClock(start = 0) {
  const [t, setT] = useState(start);
  useEffect(() => {
    let raf;
    const t0 = Date.now() - start * 1000;
    const tick = () => {
      setT((Date.now() - t0) / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return t;
}

// One character standing on the ground line. e = seconds since its pose changed.
function Actor({ sprite, x, ground, size, feet, e, motion, enterFrom, enterAt = 0, t }) {
  const w = size * CANVAS_ASPECT;
  const isArt = typeof sprite === 'object';
  const transform = [];
  // entrance: slide in (enterFrom = -1 left, 1 right) or pop up (0)
  const k = clamp01((t - enterAt) / 0.6);
  if (enterFrom) transform.push({ translateX: enterFrom * (1 - easeOutBack(k)) * 600 });
  else transform.push({ scale: k === 0 ? 0.001 : easeOutBack(k) });
  // comic pop whenever the pose changes
  const pop = Math.exp(-e * 6) * Math.cos(e * 20);
  if (motion === 'shock') transform.push({ scale: 1 + 0.12 * pop }, { translateX: Math.sin(e * 60) * 4 * Math.exp(-e * 3) });
  else if (motion === 'hop') transform.push({ translateY: -Math.abs(Math.sin(e * 7)) * size * 0.04 });
  else if (motion === 'sway') transform.push({ rotate: `${Math.sin(t * 3) * 3}deg` });
  else if (motion === 'shake') transform.push({ translateX: Math.sin(e * 40) * 2 });
  else transform.push({ scale: 1 + 0.05 * pop });
  if (t < enterAt) return null;
  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', left: x - w / 2, top: ground - feet * size, width: w, height: size, transform }}
    >
      {isArt ? (
        <Sprite sprite={sprite} width={w} height={size} />
      ) : (
        <Sprite sprite={sprite} width={w} height={size * 0.5} style={{ marginTop: size * 0.4 }} />
      )}
    </View>
  );
}

// Comic speech bubble with a little tail pointing down at the speaker; its tail ends at y = above.
function Bubble({ text, x, above, maxW, e, tail = 0.3 }) {
  const s = easeOutBack(clamp01(e / 0.35));
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: x - maxW / 2, width: maxW, top: 0, height: above,
        justifyContent: 'flex-end', alignItems: 'center', transform: [{ scale: Math.max(0.001, s) }],
      }}
    >
      <View style={styles.bubble}>
        <Text style={styles.bubbleText}>{text}</Text>
      </View>
      <View style={[styles.tail, { left: maxW * tail }]} />
    </View>
  );
}

export default function KampungScreen({ result, onAgain, onMenu }) {
  const win = useWindowDimensions();
  const [box, setBox] = useState(null); // the scene's real size (can differ from the window on web)
  const W = box?.width ?? win.width;
  const H = box?.height ?? win.height;
  // ?kampung=ask / ?kampung=give10 / ?kampung=give0 on the web opens at that step (for testing),
  // with the entrance animations already finished
  const test = Platform.OS === 'web' ? (window.location.search.match(/[?&]kampung=(ask|give(\d+))/) || []) : [];
  const t = useClock(test[1] ? 10 : 0);
  const [step, setStep] = useState(test[2] != null ? 'result' : test[1] ? 'ask' : 'arrive');
  const [gift, setGift] = useState(test[2] != null ? Number(test[2]) : null); // RM per kid
  const stepAt = useRef(0);
  const go = (next) => {
    stepAt.current = t;
    setStep(next);
  };
  const e = t - stepAt.current; // seconds into this step

  const wallet = result.score;
  const given = gift ? gift * KAMPUNG.kids : 0;
  const hearts = KAMPUNG.hearts[gift ?? 0] ?? 0;

  // layout: characters on the sandy yard, panel at the top over the sky
  const size = Math.min(H * 0.55, W * 0.85, 520);
  const ground = H * 0.94;
  const spread = Math.min(W * 0.3, size * 0.62);
  const mx = W / 2 - spread;
  const bx = W / 2 + spread;

  const S = SPRITES.scene;
  const pose = {
    arrive: { mak: 'welcome', boy: 'happy', kids: null },
    ask: { mak: 'asking', boy: 'shock', kids: 'waiting' },
    result: gift ? { mak: 'joy', boy: 'happy', kids: 'cheer' } : { mak: 'asking', boy: 'nervous', kids: 'sulk' },
  }[step];
  const motions = {
    mak: pose.mak === 'joy' ? 'sway' : 'pop',
    boy: pose.boy === 'shock' ? 'shock' : pose.boy === 'nervous' ? 'shake' : 'pop',
    kids: pose.kids === 'cheer' ? 'hop' : 'pop',
  };
  const bubble = {
    arrive: KAMPUNG.welcome,
    ask: KAMPUNG.ask,
    result: gift ? KAMPUNG.thanks[gift] : KAMPUNG.stingy,
  }[step];
  const makHead = ground - FEET.mak * size + size * 0.13;

  const background = SCREENS.kampung ? (
    <Image source={SCREENS.kampung} resizeMode="cover" style={styles.cover} />
  ) : (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: '#e9c46a' }]} />
  );

  return (
    <Pressable
      style={styles.fill}
      onLayout={(ev) => setBox(ev.nativeEvent.layout)}
      onPress={() => step === 'arrive' && t > 0.8 && go('ask')}
    >
      {background}

      <Actor
        sprite={S.mak[pose.mak]} x={mx} ground={ground} size={size} feet={FEET.mak}
        e={e} motion={motions.mak} enterFrom={-1} t={t}
      />
      {pose.kids && (
        <Actor
          sprite={S.kids[pose.kids]} x={W / 2} ground={ground + size * 0.02} size={size} feet={FEET.kids[pose.kids]}
          e={e} motion={motions.kids} enterAt={step === 'ask' ? stepAt.current + 0.2 : 0} t={t}
        />
      )}
      <Actor
        sprite={S.boy[pose.boy]} x={bx} ground={ground} size={size} feet={FEET.boy}
        e={e} motion={motions.boy} enterFrom={1} enterAt={0.25} t={t}
      />

      {t > 0.7 && (
        <Bubble
          key={step + (gift ?? '')} text={bubble} x={Math.max(W * 0.3, mx + size * 0.12)} above={makHead - 8}
          maxW={Math.min(W * 0.6, 300)} e={step === 'arrive' ? t - 0.7 : e} tail={0.28}
        />
      )}

      {/* top panel */}
      <View style={[styles.panelWrap, { top: H * 0.04 }]} pointerEvents="box-none">
        {step === 'arrive' && (
          <View style={styles.panel}>
            <Text style={styles.title}>Sampai kampung!</Text>
            <Text style={styles.line}>Duit raya dalam dompet: RM{wallet}</Text>
            {t > 1.2 && <Text style={styles.hint}>Tap untuk teruskan ▸</Text>}
          </View>
        )}

        {step === 'ask' && e > 0.9 && (
          <View style={styles.panel}>
            <Text style={styles.title}>Beri duit raya?</Text>
            <Text style={styles.line}>
              {KAMPUNG.kids} anak buah · Dompet: RM{wallet}
            </Text>
            <View style={styles.choices}>
              {KAMPUNG.gifts.map((g) => {
                const cost = g * KAMPUNG.kids;
                const ok = cost <= wallet;
                return (
                  <Pressable
                    key={g}
                    disabled={!ok}
                    onPress={() => {
                      setGift(g);
                      go('result');
                    }}
                    style={[styles.choice, !ok && styles.choiceOff]}
                  >
                    <Text style={styles.choiceBig}>RM{g}</Text>
                    <Text style={styles.choiceSmall}>seorang · RM{cost}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => {
                setGift(0);
                go('result');
              }}
            >
              <Text style={styles.link}>Maaf, tak ada duit 😅</Text>
            </Pressable>
          </View>
        )}

        {step === 'result' && e > 1.2 && (
          <View style={styles.panel}>
            <Text style={styles.title}>Selamat Hari Raya!</Text>
            <Text style={styles.line}>Duit raya dikumpul: RM{wallet}</Text>
            <Text style={styles.line}>Beri anak buah: −RM{given}</Text>
            <Text style={[styles.line, styles.bold]}>Baki: RM{wallet - given}</Text>
            <Text style={styles.hearts}>
              Mak: {'❤️'.repeat(hearts)}
              {'🤍'.repeat(3 - hearts)}
            </Text>
            <Pressable style={styles.btn} onPress={onAgain}>
              <Text style={styles.btnText}>Balik lagi</Text>
            </Pressable>
            <Pressable onPress={onMenu}>
              <Text style={styles.link}>Menu</Text>
            </Pressable>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const INK = '#4a2a12';
const styles = StyleSheet.create({
  fill: { flex: 1, overflow: 'hidden', backgroundColor: '#e9c46a' },
  cover: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  panelWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  panel: {
    backgroundColor: 'rgba(255,248,231,0.94)', borderRadius: 18, borderWidth: 3, borderColor: INK,
    paddingVertical: 14, paddingHorizontal: 18, alignItems: 'center', width: '100%', maxWidth: 420,
  },
  title: { fontSize: 24, fontWeight: '900', color: INK },
  line: { fontSize: 15, color: INK, marginTop: 4, fontWeight: '600' },
  bold: { fontWeight: '900', fontSize: 17 },
  hint: { marginTop: 8, color: '#9c6644', fontWeight: '800' },
  hearts: { fontSize: 22, marginTop: 8 },
  choices: { flexDirection: 'row', gap: 8, marginTop: 10 },
  choice: {
    backgroundColor: '#2f9e44', borderRadius: 12, borderWidth: 3, borderColor: INK,
    paddingVertical: 8, paddingHorizontal: 10, alignItems: 'center', minWidth: 86,
  },
  choiceOff: { opacity: 0.35 },
  choiceBig: { color: '#fff', fontSize: 20, fontWeight: '900' },
  choiceSmall: { color: '#d3f9d8', fontSize: 11, fontWeight: '700' },
  link: { color: INK, marginTop: 12, fontSize: 15, textDecorationLine: 'underline', fontWeight: '700' },
  btn: { backgroundColor: '#ffd43b', paddingVertical: 12, paddingHorizontal: 40, borderRadius: 30, marginTop: 12, borderWidth: 3, borderColor: INK },
  btnText: { fontSize: 19, fontWeight: '900', color: INK },
  bubble: {
    backgroundColor: '#fff', borderRadius: 18, borderWidth: 3, borderColor: INK,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  bubbleText: { fontSize: 17, fontWeight: '800', color: INK, textAlign: 'center' },
  tail: {
    position: 'absolute', bottom: -9, width: 18, height: 18, backgroundColor: '#fff',
    borderRightWidth: 3, borderBottomWidth: 3, borderColor: INK, transform: [{ rotate: '45deg' }],
  },
});
