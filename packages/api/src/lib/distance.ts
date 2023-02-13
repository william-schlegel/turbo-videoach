import destination from "@turf/destination";
import distance from "@turf/distance";
import { point } from "@turf/helpers";
import { getCoord } from "@turf/invariant";
/**
 * calculate the bounding box arround a point at a certain distance (top left and bottom right)
 * @param originLat latitude
 * @param originLng longitude
 * @param distance distance in km
 */
export function calculateBBox(
  originLng: number,
  originLat: number,
  distance: number
) {
  if (distance <= 0) {
    return [
      [originLng, originLat],
      [originLng, originLat],
    ];
  }
  const diagonalDistance = distance * Math.sqrt(2);
  const org = point([originLng, originLat]);
  const topLeft = destination(org, diagonalDistance, -45, {
    units: "kilometers",
  });
  const bottomRight = destination(org, diagonalDistance, 135, {
    units: "kilometers",
  });
  return [getCoord(topLeft), getCoord(bottomRight)];
}

export function calculateDistance(
  originLng: number,
  originLat: number,
  distanceLng: number,
  distanceLat: number
) {
  const from = point([originLng, originLat]);
  const to = point([distanceLng, distanceLat]);

  return distance(from, to, { units: "kilometers" });
}
