const NON_FUNCTIONAL_AFTER_MS = 24 * 60 * 60 * 1000; // 24 hours

// 'NORTHWEST' -> 'Northwest'; empty for a missing value
export function orientationLabel(orientation) {
  if (!orientation) return '';
  return orientation.charAt(0).toUpperCase() + orientation.slice(1).toLowerCase();
}

export const isCameraDelayed = (camera) =>
  (camera.views || camera.cameraview_set || []).some(
    (view) => (view.marked_delayed ?? camera.marked_delayed) === true
  );

export const isViewNonFunctional = (view, camera, now = Date.now()) => {
  const delayed = (view.marked_delayed ?? camera.marked_delayed) === true;
  if (!delayed || !view.last_update_modified) return false;

  const lastUpdate = new Date(view.last_update_modified).getTime();
  if (Number.isNaN(lastUpdate)) return false;

  return now - lastUpdate > NON_FUNCTIONAL_AFTER_MS;
};

export const isCameraNonFunctional = (camera, now = Date.now()) =>
  (camera.views || camera.cameraview_set || []).some((view) =>
    isViewNonFunctional(view, camera, now)
  );