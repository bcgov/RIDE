import { useRef, useState } from 'react';

// Drag-to-reorder for one list of rows.
//   onMove(from, to)   called with the dragged row's index and the index it should end up at
//
// Returns
//   rowProps(index, className)   for each row: dragging, plus the classes
//       is-dragging   the row being dragged
//       drop-before / drop-after   the row next to the insertion point, which draws the drop line
//   listProps   for the element around the rows: it is the drop zone, so the space above the first
//       row and below the last one accepts a drop too
// The line is left out when dropping there would not move the row.
export default function useDragReorder(onMove) {
  /* Hooks */
  // Refs: the logic reads these, so it never sees stale state mid-drag
  const dragRef = useRef(null);
  const dropRef = useRef(null);

  // States: only what the rows need to show
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);

  /* Handlers */
  const reset = () => {
    dragRef.current = null;
    dropRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  };

  // The browser draws its own preview of the row, with the grip right on its edge.
  // Hand it a padded copy instead.
  const setGhost = (event) => {
    const row = event.currentTarget;
    const rect = row.getBoundingClientRect();
    const ghost = row.cloneNode(true);
    ghost.classList.add('drag-ghost');
    ghost.style.width = `${rect.width}px`;
    document.body.appendChild(ghost);
    event.dataTransfer.setDragImage(ghost, event.clientX - rect.left + 12, event.clientY - rect.top + 8);
    requestAnimationFrame(() => ghost.remove());
  };

  const handleDragStart = (event, index) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index)); // Firefox will not drag without data
    setGhost(event);
    dragRef.current = index;
    // Dimming the row in the same tick can cancel the drag in Chrome
    setTimeout(() => setDragIndex(index), 0);
  };

  // The drop line goes before the first row whose middle is below the pointer, or after the last row
  const handleDragOver = (event) => {
    if (dragRef.current === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const rows = [...event.currentTarget.querySelectorAll('[draggable="true"]')];
    let insertAt = rows.findIndex((row) => {
      const rect = row.getBoundingClientRect();
      return event.clientY < rect.top + rect.height / 2;
    });
    if (insertAt === -1) insertAt = rows.length;

    if (insertAt !== dropRef.current) {
      dropRef.current = insertAt;
      setDropIndex(insertAt);
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const from = dragRef.current;
    const insertAt = dropRef.current;
    reset();
    if (from === null || insertAt === null) return;

    const to = insertAt > from ? insertAt - 1 : insertAt;
    if (to !== from) onMove(from, to);
  };

  /* Rendering */
  const wouldMove = dragIndex !== null && dropIndex !== null
    && dropIndex !== dragIndex && dropIndex !== dragIndex + 1;

  const rowClass = (index) => {
    const classes = [];
    if (dragIndex === index) classes.push('is-dragging');
    if (wouldMove && dropIndex === 0 && index === 0) classes.push('drop-before');
    if (wouldMove && dropIndex > 0 && index === dropIndex - 1) classes.push('drop-after');
    return classes;
  };

  const rowProps = (index, className) => ({
    className: [className, ...rowClass(index)].join(' '),
    draggable: true,
    onDragStart: (event) => handleDragStart(event, index),
    onDragEnd: reset,
  });

  const listProps = { onDragOver: handleDragOver, onDrop: handleDrop };

  return { rowProps, listProps };
}
