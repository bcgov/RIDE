import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import SkeletonList from '../components/shared/SkeletonList.jsx';

// Shown while a camera's details load: the page's own layout with grey blocks where the data goes.
// It reuses the real class names, so each block takes the size of what will replace it.
export default function DetailsSkeleton() {
  return (
    <div className="camera-details-container">
      <header className="details-header">
        <div className="title-section">
          <Skeleton width={260} height={54} />
        </div>

        <div className="actions-toolbar">
          <Skeleton width={132} height={32} />
          <Skeleton width={150} height={32} />
          <Skeleton width={132} height={32} />
        </div>
      </header>

      <div className="details-grid">
        <div className="media-scroll">
          <div className="media-pane">
            <div className="main-preview-card">
              <div className="preview-toolbar">
                <Skeleton width={120} height={28} />
                <Skeleton width={140} height={32} />
              </div>

              <Skeleton containerClassName="details-skeleton__image" height="100%" />
            </div>

            <div className="views-section">
              <div className="views-header">
                <Skeleton width={160} height={28} />
                <Skeleton width={150} height={32} />
              </div>

              <div className="views-grid">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} height={170} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="form-pane">
          <h2 className="form-pane-title">Camera location settings</h2>

          <nav className="details-tabs">
            {[44, 40, 40, 44, 36, 52].map((width, i) => (
              <Skeleton key={i} width={width} height={20} />
            ))}
          </nav>

          <div className="tab-content">
            <SkeletonList count={7} height={32} gap={24} />
          </div>
        </div>
      </div>
    </div>
  );
}

// The sidebar's list of cameras, while it loads: a region, a highway and a few cameras under it
export function CameraListSkeleton() {
  return (
    <>
      <div className="details-skeleton__heading">
        <Skeleton width={90} height={20} />
      </div>
      <div className="details-skeleton__heading">
        <Skeleton width={130} height={20} />
      </div>
      <div className="details-skeleton__items">
        <SkeletonList count={5} height={32} gap={4} />
      </div>
    </>
  );
}
