import React from 'react';
import { Text, Image, View } from 'react-native';
import { VECTORS } from './scene/Vectors';

// Width / height of each built-in vector drawing (matches their viewBox).
const VECTOR_ASPECT = { car: 100 / 80, lorry: 100 / 150, pothole: 100 / 30, palm: 100 / 120, tree: 100 / 120 };

// Width / height of any sprite, so things can be sized by width and keep their shape.
export function spriteAspect(sprite) {
  if (sprite && typeof sprite === 'object' && sprite.aspect) return sprite.aspect;
  if (typeof sprite === 'string' && sprite.startsWith('@')) return VECTOR_ASPECT[sprite.slice(1)] ?? 1;
  return 1;
}

// Renders one of these kinds of sprite (see src/assets.js):
//   { source, aspect }  painted art from src/art.js
//   '@name'             built-in vector drawing (src/scene/Vectors.js)
//   '🐄'                emoji placeholder
//   require()           any other image
export default function Sprite({ sprite, width, height = width, color, style }) {
  if (typeof sprite === 'string' && sprite.startsWith('@')) {
    const Art = VECTORS[sprite.slice(1)];
    return (
      <View style={[{ width, height }, style]}>
        <Art width={width} height={height} color={color} />
      </View>
    );
  }
  if (typeof sprite === 'string') {
    const fs = Math.min(width, height) * 0.8;
    return (
      <Text style={[{ width, height, fontSize: fs, lineHeight: height, textAlign: 'center' }, style]}>
        {sprite}
      </Text>
    );
  }
  const source = sprite && sprite.source ? sprite.source : sprite;
  return <Image source={source} resizeMode="stretch" style={[{ width, height }, style]} />;
}
