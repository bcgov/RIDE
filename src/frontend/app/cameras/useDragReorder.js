import { useRef, useState } from 'react';

// Where each row sits in the list's own coordinates, so scrolling does not matter
const measureRows = (list) => {
  const listTop = list.getBoundingClientRect().top - list.scrollTop;
  return [...list.querySelectorAll('[draggable="true"]')].map((row) => {
    const rect = row.getBoundingClientRect();
    return { top: rect.top - listTop, height: rect.height };
  });
};

// How far each row moves (px) when the row at `from` ends up at `to`: the others close
// the gap it leaves and open one where it lands, keeping the spacing the list already has
const slideOffsets = (rows, from, to) => {
  const gap = rows.length > 1 ? rows[1].top - rows[0].top - rows[0].height : 0;
  const order = rows.map((_, i) => i);
  order.splice(to, 0, order.splice(from, 1)[0]);

  const offsets = [];
  let top = rows[0].top;
  order.forEach((i) => {
    offsets[i] = top - rows[i].top;
    top += rows[i].height + gap;
  });
  return offsets;
};

// Drag-to-reorder for one list of rows.
//   onMove(from, to)   called with the dragged row's index and the index it should end up at
//
// Returns
//   rowProps(index, className)   for each row: dragging, plus
//       is-dragging     the row being dragged, which stands in as the gap where it will land
//       is-reordering   while a drag is on: the rows slide to their new places
//   listProps   for the element around the rows: it is the drop zone, so the space above the first
//       row and below the last one accepts a drop too
// Rows are measured once when the drag starts, so the pointer is always compared with where the
// rows were, not where they have slid to.
export default function useDragReorder(onMove) {
  /* Hooks */
  // Refs: the logic reads these, so it never sees stale state mid-drag
  const listRef = useRef(null);
  const dragRef = useRef(null);
  const dropRef = useRef(null);
  const rowsRef = useRef([]);

  // States: only what the rows need to show
  const [dragIndex, setDragIndex] = useState(null);
  const [offsets, setOffsets] = useState(null);

  /* Handlers */
  const reset = () => {
    dragRef.current = null;
    dropRef.current = null;
    setDragIndex(null);
    setOffsets(null);
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
    rowsRef.current = measureRows(listRef.current);
    // Dimming the row in the same tick can cancel the drag in Chrome
    setTimeout(() => setDragIndex(index), 0);
  };

  // The gap opens before the first row whose middle is below the pointer, or after the last row
  const handleDragOver = (event) => {
    if (dragRef.current === null) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const list = listRef.current;
    const pointerY = event.clientY - list.getBoundingClientRect().top + list.scrollTop;
    const rows = rowsRef.current;
    let insertAt = rows.findIndex((row) => pointerY < row.top + row.height / 2);
    if (insertAt === -1) insertAt = rows.length;

    if (insertAt !== dropRef.current) {
      dropRef.current = insertAt;
      const from = dragRef.current;
      const to = insertAt > from ? insertAt - 1 : insertAt;
      setOffsets(slideOffsets(rows, from, to));
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
  const rowProps = (index, className) => ({
    className: [className, dragIndex === index && 'is-dragging', dragIndex !== null && 'is-reordering']
      .filter(Boolean).join(' '),
    style: offsets?.[index] ? { transform: `translateY(${offsets[index]}px)` } : undefined,
    draggable: true,
    onDragStart: (event) => handleDragStart(event, index),
    onDragEnd: reset,
  });

  const listProps = { ref: listRef, onDragOver: handleDragOver, onDrop: handleDrop };

  return { rowProps, listProps };
}
