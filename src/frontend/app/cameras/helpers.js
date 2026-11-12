// 'NORTHWEST' -> 'Northwest'; empty for a missing value
export function orientationLabel(orientation) {
  if (!orientation) return '';
  return orientation.charAt(0).toUpperCase() + orientation.slice(1).toLowerCase();
}
