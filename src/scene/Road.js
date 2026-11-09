// The highway: grass, asphalt, lane markings, median guardrail and horizon haze.
import React from 'react';
import Svg, { Rect, Polygon, Line, Defs, LinearGradient, Stop } from 'react-native-svg';
import { project } from './projection';
import { SCENE } from '../art';

const ROAD_HALF = 1.95; // asphalt incl. shoulders
const EDGE_X = 1.5; // solid edge lines
const EDGE_W = 0.05;
const DASH_W = 0.045;
const SEG = 2.5; // world length of one dash / grass stripe
const RAIL_X = 2.2; // guardrail on the median (right side, Malaysia drives on the left)
const RAIL_TOP = 0.24; // knee-high steel beam (world units: 1 = one lane width)
const RAIL_BOTTOM = 0.17;

const pts = (arr) => arr.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

export default function Road({ v, s }) {
  const cam = { x: s.camX, curve: s.curve };
  const P = (x, y, z) => project(v, cam, x, y, z);

  // segment boundaries, fixed in world space so stripes scroll toward you
  const zMin = 1.2;
  const first = Math.ceil((s.dist + zMin) / SEG);
  const last = Math.floor((s.dist + v.zFar) / SEG);
  const zs = [{ z: zMin, j: first - 1 }];
  for (let j = first; j <= last; j++) zs.push({ z: j * SEG - s.dist, j });
  zs.push({ z: v.zFar, j: last });

  // a ribbon following the road from near to far
  const strip = (xa, xb, ya = 0, yb = 0) =>
    pts([...zs.map((b) => P(xa, ya, b.z)), ...zs.slice().reverse().map((b) => P(xb, yb, b.z))]);

  const stripes = [];
  const dashes = [];
  const posts = [];
  for (let i = 0; i < zs.length - 1; i++) {
    const a = zs[i];
    const b = zs[i + 1];
    if (a.j % 2 === 0) {
      const ya = P(0, 0, a.z).y;
      const yb = P(0, 0, b.z).y;
      // darker grass bands scrolling toward you give the sense of speed
      stripes.push(
        <Rect key={`g${a.j}`} x={0} y={yb} width={v.width} height={Math.max(0, ya - yb)}
          fill={SCENE.ground ? 'rgba(20,60,10,0.12)' : '#4f9a49'} />
      );
    } else {
      for (const lx of [-0.5, 0.5]) {
        dashes.push(
          <Polygon
            key={`d${a.j}${lx}`}
            points={pts([P(lx - DASH_W, 0, a.z), P(lx - DASH_W, 0, b.z), P(lx + DASH_W, 0, b.z), P(lx + DASH_W, 0, a.z)])}
            fill="#f1f3f5"
          />
        );
      }
    }
    const p0 = P(RAIL_X, 0, b.z);
    const p1 = P(RAIL_X, RAIL_TOP, b.z);
    posts.push(<Line key={`p${b.j}`} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#6c757d" strokeWidth={Math.max(1, 0.03 * p0.scale)} />);
  }

  const hz = v.horizonY;
  return (
    <Svg style={{ position: 'absolute', left: 0, top: 0 }} width={v.width} height={v.height}>
      <Defs>
        <LinearGradient id="bkFog" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#d6e6ee" stopOpacity="0" />
          <Stop offset="0.55" stopColor="#d6e6ee" stopOpacity="0.85" />
          <Stop offset="1" stopColor="#d6e6ee" stopOpacity="0" />
        </LinearGradient>
      </Defs>
      {!SCENE.ground && <Rect x={0} y={hz} width={v.width} height={v.height - hz} fill="#5aa652" />}
      {stripes}
      <Polygon points={strip(-ROAD_HALF, ROAD_HALF)} fill="#4b4c52" />
      <Polygon points={strip(-EDGE_X - EDGE_W, -EDGE_X + EDGE_W)} fill="#f1f3f5" />
      <Polygon points={strip(EDGE_X - EDGE_W, EDGE_X + EDGE_W)} fill="#f1f3f5" />
      {dashes}
      {posts}
      <Polygon points={strip(RAIL_X, RAIL_X, RAIL_TOP, RAIL_BOTTOM)} fill="#9aa3ab" />
      <Polygon points={strip(RAIL_X, RAIL_X, RAIL_TOP, RAIL_TOP - 0.025)} fill="#e9ecef" />
      <Rect x={0} y={hz - v.height * 0.04} width={v.width} height={v.height * 0.075} fill="url(#bkFog)" />
    </Svg>
  );
}
