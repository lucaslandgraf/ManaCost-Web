const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export function encodeGeohash(latitude: number, longitude: number, precision: number = 9): string {
  const BITS = [16, 8, 4, 2, 1];
  let isEven = true;
  let latMin = -90.0, latMax = 90.0;
  let lonMin = -180.0, lonMax = 180.0;
  let arg = 0;
  let bit = 0;
  let hash = '';

  while (hash.length < precision) {
    if (isEven) {
      const mid = (lonMin + lonMax) / 2;
      if (longitude > mid) {
        arg |= BITS[bit];
        lonMin = mid;
      } else {
        lonMax = mid;
      }
    } else {
      const mid = (latMin + latMax) / 2;
      if (latitude > mid) {
        arg |= BITS[bit];
        latMin = mid;
      } else {
        latMax = mid;
      }
    }

    isEven = !isEven;
    if (bit < 4) {
      bit++;
    } else {
      hash += BASE32[arg];
      bit = 0;
      arg = 0;
    }
  }
  return hash;
}

export function decodeGeohash(geohash: string): { latitude: number; longitude: number } {
  let isEven = true;
  let latMin = -90.0, latMax = 90.0;
  let lonMin = -180.0, lonMax = 180.0;

  for (let i = 0; i < geohash.length; i++) {
    const c = geohash[i];
    const cd = BASE32.indexOf(c);
    if (cd === -1) break;

    for (let j = 0; j < 5; j++) {
      const mask = [16, 8, 4, 2, 1][j];
      if (isEven) {
        const mid = (lonMin + lonMax) / 2;
        if ((cd & mask) !== 0) {
          lonMin = mid;
        } else {
          lonMax = mid;
        }
      } else {
        const mid = (latMin + latMax) / 2;
        if ((cd & mask) !== 0) {
          latMin = mid;
        } else {
          latMax = mid;
        }
      }
      isEven = !isEven;
    }
  }

  return {
    latitude: Number(((latMin + latMax) / 2).toFixed(6)),
    longitude: Number(((lonMin + lonMax) / 2).toFixed(6)),
  };
}

export const LONDRINA_FALLBACK = {
  lat: -23.3045,
  lng: -51.1696,
};

export async function getUserCoordinates(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(LONDRINA_FALLBACK);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(LONDRINA_FALLBACK),
      { timeout: 5000, enableHighAccuracy: false }
    );
  });
}