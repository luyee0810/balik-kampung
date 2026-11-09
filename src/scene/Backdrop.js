// Sky, clouds and mountains. Uses the painted layers from src/art.js when present,
// otherwise falls back to simple vector ridges.
import React from 'react';
import { View, Image } from 'react-native';
import Svg, { Rect, Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import { BACKDROP as LAYERS, SCENE } from '../art';

const wrap = (offset, period) => -(((offset % period) + period) % period);

// A periodic ridge line, drawn twice so it tiles seamlessly (viewBox 0..2000 x 0..100).
function ridge(base, amp, waves) {
  let d = 'M0 100';
  for (let x = 0; x <= 2000; x += 10) {
    let f = 0;
    for (const [k, a, ph] of waves) f += a * Math.sin((2 * Math.PI * k * x) / 1000 + ph);
    d += ` L${x} ${(base - amp * f).toFixed(1)}`;
  }
  return d + ' L2000 100 Z';
}
const FAR = ridge(55, 40, [[2, 0.5, 0.3], [3, 0.3, 1.7], [5, 0.18, 4.1], [9, 0.08, 2.2]]);
const NEAR = ridge(62, 32, [[3, 0.45, 2.0], [5, 0.3, 0.4], [8, 0.15, 3.3], [14, 0.08, 1.1]]);

const CLOUDS = [[90, 30, 1], [330, 55, 0.7], [560, 22, 1.2], [800, 48, 0.8]];
const Clouds = React.memo(() =>
  CLOUDS.flatMap(([x, y, s], i) =>
    [0, 1000].map((dx) => (
      <React.Fragment key={`${i}-${dx}`}>
        <Ellipse cx={x + dx} cy={y} rx={70 * s} ry={12 * s} fill="#fff" opacity={0.85} />
        <Ellipse cx={x + dx - 25 * s} cy={y - 8 * s} rx={35 * s} ry={12 * s} fill="#fff" opacity={0.85} />
        <Ellipse cx={x + dx + 20 * s} cy={y - 12 * s} rx={40 * s} ry={14 * s} fill="#fff" opacity={0.9} />
      </React.Fragment>
    ))
  )
);

function VectorLayer({ W, top, h, offset, children }) {
  return (
    <View style={{ position: 'absolute', left: wrap(offset, W), top, width: W * 2, height: h }}>
      <Svg width={W * 2} height={h} viewBox="0 0 2000 100" preserveAspectRatio="none">
        {children}
      </Svg>
    </View>
  );
}

// Painted layer, tiled with every other copy mirrored so the seams always match.
function ImageLayer({ W, hz, layer, offset, top, opacity = 1 }) {
  const h = layer.height * hz;
  const y = top ?? hz - h + 2;
  const tw = h * layer.aspect;
  const tiles = [];
  let x = wrap(offset, tw * 2);
  for (let i = 0; x < W; i++, x += tw) {
    tiles.push(
      <Image
        key={i}
        source={layer.source}
        resizeMode="stretch"
        style={{
          position: 'absolute',
          left: x,
          top: y,
          opacity,
          width: tw,
          height: h,
          transform: i % 2 ? [{ scaleX: -1 }] : [],
        }}
      />
    );
  }
  return tiles;
}

export default function Backdrop({ v, s }) {
  const W = v.width;
  const hz = v.horizonY;
  return (
    <>
      <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={W} height={hz + 4}>
        <Defs>
          <LinearGradient id="bkSky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3d8fd6" />
            <Stop offset="1" stopColor="#d4ebf5" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={W} height={hz + 4} fill="url(#bkSky)" />
      </Svg>

      {SCENE.clouds ? (
        <ImageLayer
          W={W}
          hz={hz}
          top={hz * 0.02}
          opacity={0.9}
          layer={{ ...SCENE.clouds, height: 0.55 }}
          offset={s.t * 6 + s.bg * 0.1}
        />
      ) : (
        <VectorLayer W={W} top={hz * 0.08} h={hz * 0.3} offset={s.t * 6 + s.bg * 0.1}>
          <Clouds />
        </VectorLayer>
      )}

      {LAYERS.length > 0 ? (
        LAYERS.map((layer, i) => (
          <ImageLayer key={i} W={W} hz={hz} layer={layer} offset={s.bg * layer.parallax} />
        ))
      ) : (
        <>
          <VectorLayer W={W} top={hz - hz * 0.42 + 2} h={hz * 0.42} offset={s.bg * 0.15}>
            <Path d={FAR} fill="#86a6bb" />
          </VectorLayer>
          <VectorLayer W={W} top={hz - hz * 0.22 + 2} h={hz * 0.22} offset={s.bg * 0.4}>
            <Path d={NEAR} fill="#3c7a45" />
          </VectorLayer>
        </>
      )}

      {SCENE.ground && (
        <Image
          source={SCENE.ground.source}
          resizeMode="cover"
          style={{ position: 'absolute', left: 0, top: hz, width: W, height: v.height - hz }}
        />
      )}
    </>
  );
}
