export const DEG_TO_RAD = Math.PI / 180
export const RAD_TO_DEG = 180 / Math.PI

export function degreesToRadians(degrees) {
  return degrees * DEG_TO_RAD
}

export function radiansToDegrees(radians) {
  return radians * RAD_TO_DEG
}

// keep it cutre
export function keepIt(angle) {
  if (angle < 0) {
    while (angle < -Math.PI * 2) {
      angle += Math.PI * 2
    }
  } else {
    while (angle > Math.PI * 2) {
      angle -= Math.PI * 2
    }
  }
  return angle
}

export function shortestArc(a, b) {
  if (Math.abs(b - a) < Math.PI) {
    return b - a
  }
  if (b > a) {
    return b - a - Math.PI * 2
  }
  return b - a + Math.PI * 2
}

export default {
  keepIt,
  shortestArc,
}
