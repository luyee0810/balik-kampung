// Pseudo-3D camera. World units: 1 unit = 1 lane width.
//   x: sideways (lanes sit at -1, 0, 1)
//   y: height above the road
//   z: distance ahead of the driver

export function makeView(width, height) {
  const horizonY = Math.round(height * 0.42);
  const roadBottomY = height * 0.8; // where the dashboard starts
  const zNear = 3; // road depth at the dashboard edge
  const viewW = Math.min(width, height * 1.05);
  const focal = (viewW * 1.8 * zNear) / 3; // 3 lanes span 1.8x the view at the dashboard
  const camH = ((roadBottomY - horizonY) * zNear) / focal;
  return { width, height, cx: width / 2, horizonY, roadBottomY, zNear, zFar: 80, focal, camH };
}

// cam = { x: camera sideways position, curve: road bend amount }
export function project(v, cam, x, y, z) {
  const scale = v.focal / z;
  return {
    x: v.cx + (x - cam.x + cam.curve * z * z) * scale,
    y: v.horizonY + (v.camH - y) * scale,
    scale,
  };
}

export const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
