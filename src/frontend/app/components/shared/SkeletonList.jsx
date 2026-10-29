import Skeleton from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

// Styling
import './SkeletonList.scss';

// A stack of full-width placeholder rows, for lists and forms that are still loading
export default function SkeletonList({ count = 3, height = 40, gap = 16 }) {
  return (
    <div className="ride-skeleton-list" style={{ gap }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} height={height} />
      ))}
    </div>
  );
}
