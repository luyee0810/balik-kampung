// First-person cockpit: dashboard, arms, steering wheel with hands, speedometer.
// Uses the painted wheel/dashboard from src/assets.js when present, else built-in drawings.
import React from 'react';
import { View, Text, Image } from 'react-native';
import Svg, { Path, Line, Circle, Ellipse, Rect, Defs, LinearGradient, Stop } from 'react-native-svg';
import { SPRITES } from '../assets';

const SKIN = '#b97a4a';
const SKIN_DARK = '#8f5a33';
const SLEEVE = '#0b7285'; // baju Melayu
const DASH = '#34363c'; // matches the painted dashboard's lower edge
const HAND_ANGLE = 58; // built-in wheel: hands at 10 and 2
const HAND_R = 0.86;

// Painted art geometry (fractions of the image), measured from the art.
const WHEEL_RIM = 0.44; // rim outer radius / image size (wheel centred in the square image)
// Where each sleeve leaves the painted wheel image (relative to the centre, in image sizes),
// so a plain sleeve can continue off-screen. null = that arm is fully inside the picture.
const CUFFS = {
  wheel: { left: { x: -0.42, y: 0.11 }, right: { x: 0.42, y: 0.11 }, w: 0.15 },
  wheelHonk: { left: { x: -0.42, y: 0.11 }, right: null, w: 0.15 }, // pressing arm runs off the bottom
};
const DASH_LCD = { x: 0.5, y: 0.8 }; // little screen under the speedometer
const DASH_SIDE_TOP = 0.53; // where the dashboard's outer edges start (fraction of its height)

export const wheelRadius = (v) => Math.min(v.width * 0.42, v.height * 0.26, 260);
// Wheel centre: low enough to leave the road visible, high enough to see the horn pad.
export const wheelCenterY = (v) => v.height - wheelRadius(v) * 0.2;

// Built-in wheel; hands are part of it, so they turn with it.
const WheelArt = React.memo(() => {
  const hx = 86 * Math.sin((HAND_ANGLE * Math.PI) / 180);
  const hy = 100 - 86 * Math.cos((HAND_ANGLE * Math.PI) / 180);
  const hand = (cx, flip) => (
    <>
      <Circle cx={cx} cy={hy} r="16" fill={SKIN} stroke={SKIN_DARK} strokeWidth="2" />
      <Path
        d={`M${cx - 9} ${hy - 6} Q${cx} ${hy - 12} ${cx + 9} ${hy - 6} M${cx - 10} ${hy} Q${cx} ${hy - 5} ${cx + 10} ${hy}`}
        stroke={SKIN_DARK}
        strokeWidth="1.5"
        fill="none"
      />
      <Ellipse cx={cx + flip * 12} cy={hy + 8} rx="9" ry="5" fill={SKIN} stroke={SKIN_DARK} strokeWidth="1.5" />
    </>
  );
  return (
    <>
      <Circle cx="100" cy="100" r="86" stroke="#1b1b1e" strokeWidth="18" fill="none" />
      <Circle cx="100" cy="100" r="93" stroke="#35353b" strokeWidth="2" fill="none" />
      <Path d="M100 92 L16 96 L16 114 L100 114 Z" fill="#26262b" />
      <Path d="M100 92 L184 96 L184 114 L100 114 Z" fill="#26262b" />
      <Path d="M90 110 L94 186 L106 186 L110 110 Z" fill="#26262b" />
      <Circle cx="100" cy="104" r="28" fill="#1f1f23" stroke="#3a3a40" strokeWidth="2" />
      <Circle cx="100" cy="104" r="8" fill="#adb5bd" />
      {hand(100 - hx, 1)}
      {hand(100 + hx, -1)}
    </>
  );
});

export default function Cockpit({ v, s, kmh }) {
  const { width: W, height: H, cx } = v;
  const R = wheelRadius(v);
  const cy = wheelCenterY(v);
  const rot = (s.wheel * Math.PI) / 180;
  const rotate = (dx, dy) => ({
    x: cx + dx * Math.cos(rot) - dy * Math.sin(rot),
    y: cy + dx * Math.sin(rot) + dy * Math.cos(rot),
  });

  // ---- dashboard ----
  let dash;
  let lcd; // where the speed reading goes
  if (SPRITES.dashboard) {
    const DW = 4.7 * R;
    const DH = DW / SPRITES.dashboard.aspect;
    const lcdY = cy - 0.55 * R; // visible through the top of the wheel
    const top = lcdY - DASH_LCD.y * DH;
    const left = cx - DW / 2;
    const sideTop = top + DASH_SIDE_TOP * DH;
    lcd = { x: left + DASH_LCD.x * DW, y: lcdY, size: DH * 0.075 };
    dash = (
      <>
        <View style={{ position: 'absolute', left: 0, right: 0, top: top + DH - 2, bottom: 0, backgroundColor: DASH }} />
        {left > 0 && (
          <>
            <View style={{ position: 'absolute', left: 0, width: left + 2, top: sideTop, bottom: 0, backgroundColor: DASH }} />
            <View style={{ position: 'absolute', right: 0, width: left + 2, top: sideTop, bottom: 0, backgroundColor: DASH }} />
          </>
        )}
        <Image
          source={SPRITES.dashboard.source}
          resizeMode="stretch"
          style={{ position: 'absolute', left, top, width: DW, height: DH }}
        />
      </>
    );
  } else {
    const dashTop = v.roadBottomY - 2;
    lcd = { x: cx, y: cy - R * 0.55, size: Math.max(12, R * 0.15) };
    dash = (
      <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={W} height={H}>
        <Defs>
          <LinearGradient id="bkDash" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#2c2f35" />
            <Stop offset="1" stopColor="#141518" />
          </LinearGradient>
        </Defs>
        <Path d={`M0 ${dashTop + 18} Q${cx} ${dashTop - 22} ${W} ${dashTop + 18} L${W} ${H} L0 ${H} Z`} fill="url(#bkDash)" />
        <Path
          d={`M${cx - R * 0.9} ${dashTop + 30} Q${cx} ${dashTop - R * 0.35} ${cx + R * 0.9} ${dashTop + 30} Z`}
          fill="#16181c"
        />
      </Svg>
    );
  }

  // ---- arms + wheel ----
  let arms;
  let wheel;
  if (SPRITES.wheel) {
    const S = R / WHEEL_RIM; // image size
    const pressing = s.honkPose > 0 && SPRITES.wheelHonk;
    const art = pressing ? SPRITES.wheelHonk : SPRITES.wheel;
    const cuffs = CUFFS[pressing ? 'wheelHonk' : 'wheel'];
    const sleeve = (side) => {
      const c = cuffs[side < 0 ? 'left' : 'right'];
      if (!c) return null;
      const start = rotate((c.x - side * 0.02) * S, c.y * S);
      return (
        <Line
          key={side}
          x1={start.x}
          y1={start.y}
          x2={cx + side * R * 1.35}
          y2={H + R * 0.8}
          stroke={SLEEVE}
          strokeWidth={cuffs.w * S}
          strokeLinecap="round"
        />
      );
    };
    arms = (
      <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={W} height={H}>
        {sleeve(-1)}
        {sleeve(1)}
      </Svg>
    );
    wheel = (
      <Image
        source={art.source}
        style={{
          position: 'absolute', left: cx - S / 2, top: cy - S / 2, width: S, height: S,
          // pressing the horn: no steering, and a little push-in
          transform: [{ rotate: `${pressing ? 0 : s.wheel}deg` }, { scale: pressing ? 1.015 : 1 }],
        }}
      />
    );
  } else {
    const armW = R * 0.34;
    const arm = (deg, shoulderX, key) => {
      const a = ((deg + s.wheel) * Math.PI) / 180;
      const hand = { x: cx + R * HAND_R * Math.sin(a), y: cy - R * HAND_R * Math.cos(a) };
      const sy = H + armW;
      const at = (k) => ({ x: hand.x + (shoulderX - hand.x) * k, y: hand.y + (sy - hand.y) * k });
      const wrist = at(0.22);
      const cuff = at(0.27);
      return (
        <React.Fragment key={key}>
          <Line x1={shoulderX} y1={sy} x2={wrist.x} y2={wrist.y} stroke={SLEEVE} strokeWidth={armW} strokeLinecap="round" />
          <Line x1={wrist.x} y1={wrist.y} x2={cuff.x} y2={cuff.y} stroke="#e8b923" strokeWidth={armW} />
          <Line x1={wrist.x} y1={wrist.y} x2={hand.x} y2={hand.y} stroke={SKIN} strokeWidth={armW * 0.6} strokeLinecap="round" />
        </React.Fragment>
      );
    };
    arms = (
      <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={W} height={H}>
        {arm(-HAND_ANGLE, cx - R * 1.25, 'l')}
        {arm(HAND_ANGLE, cx + R * 1.25, 'r')}
      </Svg>
    );
    wheel = (
      <View
        style={{
          position: 'absolute', left: cx - R, top: cy - R, width: R * 2, height: R * 2,
          transform: [{ rotate: `${s.wheel}deg` }],
        }}
      >
        <Svg width={R * 2} height={R * 2} viewBox="0 0 200 200">
          <WheelArt />
        </Svg>
      </View>
    );
  }

  return (
    <>
      {dash}
      <Text
        style={{
          position: 'absolute', left: lcd.x - 60, width: 120, top: lcd.y - lcd.size * 0.65,
          textAlign: 'center', color: '#69db7c', fontWeight: '800', fontSize: lcd.size,
          lineHeight: lcd.size * 1.3,
        }}
      >
        {kmh} km/j
      </Text>
      {arms}
      {wheel}
    </>
  );
}
