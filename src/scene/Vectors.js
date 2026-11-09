// Built-in vector drawings used until real art replaces them (see src/assets.js).
// Everything is drawn in a fixed viewBox, so it scales cleanly to any size.
import React from 'react';
import Svg, { Rect, Ellipse, Path, Circle, Line, Text as SvgText } from 'react-native-svg';

// Small car seen from behind (the "kancil" hogging your lane)
export function Car({ width, height, color = '#e03131' }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 80">
      <Ellipse cx="50" cy="76" rx="50" ry="5" fill="rgba(0,0,0,0.35)" />
      <Rect x="8" y="62" width="16" height="16" rx="3" fill="#1a1a1a" />
      <Rect x="76" y="62" width="16" height="16" rx="3" fill="#1a1a1a" />
      <Path
        d="M18 30 Q22 6 50 6 Q78 6 82 30 L92 40 Q96 44 96 52 L96 66 Q96 72 90 72 L10 72 Q4 72 4 66 L4 52 Q4 44 8 40 Z"
        fill={color}
      />
      <Path d="M24 30 Q27 12 50 12 Q73 12 76 30 Z" fill="#2b3a4a" />
      <Path d="M30 26 Q34 16 46 15" stroke="rgba(255,255,255,0.35)" strokeWidth="3" fill="none" />
      <Rect x="8" y="42" width="18" height="9" rx="3" fill="#ff2d2d" />
      <Rect x="74" y="42" width="18" height="9" rx="3" fill="#ff2d2d" />
      <Rect x="36" y="52" width="28" height="10" rx="1.5" fill="#111" />
      <SvgText x="50" y="60" fontSize="7" fontWeight="bold" fill="#fff" textAnchor="middle">
        WKL 88
      </SvgText>
      <Rect x="4" y="64" width="92" height="8" rx="3" fill="rgba(0,0,0,0.25)" />
    </Svg>
  );
}

// Lorry seen from behind
export function Lorry({ width, height }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 150">
      <Ellipse cx="50" cy="146" rx="50" ry="5" fill="rgba(0,0,0,0.35)" />
      <Rect x="6" y="126" width="18" height="21" rx="3" fill="#1a1a1a" />
      <Rect x="76" y="126" width="18" height="21" rx="3" fill="#1a1a1a" />
      <Rect x="2" y="4" width="96" height="112" rx="4" fill="#e9ecef" stroke="#adb5bd" strokeWidth="2" />
      <Line x1="50" y1="8" x2="50" y2="112" stroke="#adb5bd" strokeWidth="2" />
      <Rect x="42" y="56" width="4" height="18" rx="1" fill="#868e96" />
      <Rect x="54" y="56" width="4" height="18" rx="1" fill="#868e96" />
      <Rect x="6" y="112" width="88" height="18" fill="#343a40" />
      <Rect x="8" y="116" width="14" height="8" rx="2" fill="#ff2d2d" />
      <Rect x="78" y="116" width="14" height="8" rx="2" fill="#ff2d2d" />
      <Rect x="26" y="117" width="48" height="6" fill="#ffd43b" />
      <Rect x="38" y="130" width="24" height="9" rx="1.5" fill="#111" />
      <SvgText x="50" y="137" fontSize="6.5" fontWeight="bold" fill="#fff" textAnchor="middle">
        CBD 3321
      </SvgText>
    </Svg>
  );
}

// Pothole lying flat on the road
export function Pothole({ width, height }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 30">
      <Ellipse cx="50" cy="15" rx="48" ry="13" fill="#2b2b2f" />
      <Ellipse cx="50" cy="17" rx="38" ry="9" fill="#17171a" />
      <Path d="M8 12 L2 6 M90 10 L98 4 M70 26 L76 30" stroke="#2b2b2f" strokeWidth="2" />
    </Svg>
  );
}

// Oil palm (kelapa sawit)
export function Palm({ width, height }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 120">
      <Path d="M50 120 Q46 80 50 46" stroke="#6b4f2a" strokeWidth="9" fill="none" strokeLinecap="round" />
      <Path
        d="M50 46 Q25 30 4 52 M50 46 Q75 30 96 52 M50 46 Q30 20 14 24 M50 46 Q70 20 86 24 M50 46 Q48 18 50 4 M50 46 Q20 50 10 74 M50 46 Q80 50 90 74"
        stroke="#2f7d32"
        strokeWidth="7"
        fill="none"
        strokeLinecap="round"
      />
      <Path
        d="M50 46 Q35 36 22 44 M50 46 Q65 36 78 44 M50 46 Q42 28 34 18 M50 46 Q58 28 66 18"
        stroke="#4caf50"
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <Circle cx="50" cy="48" r="6" fill="#8a5a2b" />
    </Svg>
  );
}

// Rainforest / angsana-style tree
export function Tree({ width, height }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 100 120">
      <Rect x="45" y="66" width="10" height="54" rx="3" fill="#5c4326" />
      <Circle cx="30" cy="58" r="24" fill="#2b6e33" />
      <Circle cx="70" cy="58" r="24" fill="#2b6e33" />
      <Circle cx="50" cy="38" r="30" fill="#378a3f" />
      <Circle cx="50" cy="64" r="22" fill="#2f7a37" />
      <Circle cx="40" cy="30" r="12" fill="#4aa352" />
    </Svg>
  );
}

export const VECTORS = { car: Car, lorry: Lorry, pothole: Pothole, palm: Palm, tree: Tree };
