import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

import Sidebar, { SidebarLayout, SidebarNav } from '../components/shared/Sidebar.jsx';

// Shown while a cameras page loads: the page's own layout with grey blocks where the data goes.
// It reuses the real class names, so each block takes the size of what will replace it.
const FILTER_WIDTHS = [70, 50, 70, 70, 90, 140, 100];

function LocationSkeleton() {
  return (
    <section className="camera-location">
      <div className="camera-location-header">
        <Skeleton width={180} height={20} />
        <Skeleton width={149} height={32} />
      </div>

      <div className="camera-cards">
        {[0, 1, 2, 3].map((i) => (
          <div className="camera-card" key={i}>
            <Skeleton height={135} />
            <Skeleton width={78} height={21} />
          </div>
        ))}
      </div>
    </section>
  );
}

// The overview, while the cameras load
export default function CamerasSkeleton() {
  return (
    <SidebarLayout
      sidebar={
        <Sidebar title="Filters">
          <SidebarNav>
            {FILTER_WIDTHS.map((width, i) => (
              <div className="cameras-skeleton__filter" key={i}>
                <Skeleton width={width} height={20} />
              </div>
            ))}
          </SidebarNav>
        </Sidebar>
      }
    >
      <div className="camera-content-wrapper">
        <div className="cameras-header">
          <div>
            <h1>Cameras</h1>
            <div className="camera-count">
              <Skeleton width={190} height={20} />
            </div>
          </div>
        </div>

        <div className="camera-search">
          <Skeleton height={35} />
        </div>

        <main className="camera-content">
          <div className="camera-groups">
            <section className="camera-highway-group">
              <h2>
                <Skeleton width={240} height={28} />
              </h2>
              <LocationSkeleton />
              <LocationSkeleton />
            </section>
          </div>
        </main>
      </div>
    </SidebarLayout>
  );
}

// Any cameras page, while the sign-in check runs. It does not know which page is coming,
// so it only shows the sidebar and content frames.
export function PageSkeleton() {
  return (
    <SidebarLayout
      sidebar={
        <Sidebar title={<Skeleton width={80} />}>
          <SidebarNav>
            {FILTER_WIDTHS.map((width, i) => (
              <div className="cameras-skeleton__filter" key={i}>
                <Skeleton width={width} height={20} />
              </div>
            ))}
          </SidebarNav>
        </Sidebar>
      }
    >
      <div className="camera-content-wrapper">
        <div className="cameras-header">
          <Skeleton width={220} height={40} />
        </div>
        <div className="camera-content">
          <Skeleton height={44} />
        </div>
      </div>
    </SidebarLayout>
  );
}
