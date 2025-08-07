import { useCallback, useState } from 'react';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from '@dnd-kit/modifiers';

/* A DraggableRow is a container for form fields that participates in a set of
 * rows enclosed by a DraggableRows component.  The parent component provides
 * the drag-and-drop functionality in a vertical list; the row provides the
 * handle for dragging and a trailing 'delete row' element.
 *
 * The specific form fields for the row are children of the DraggableRow.  All
 * state is maintained by the parent component, with state-changing callbacks
 * passed in as props.
 */
function DraggableRow({ children, id, isDraggable, remove }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition: null,
  };

  return (
    <div
      className="draggable"
      ref={isDraggable ? setNodeRef : null}
      style={style}
      {...attributes}
    >
      <div
        className={`handle drag ${ isDraggable ? '' : 'inactive'}`}
        ref={isDraggable ? setActivatorNodeRef : null}
        { ...(isDraggable ? listeners : {}) }
      >:::</div>

      <div className="control">
        { children }
      </div>

      <div
        className={`handle delete ${ isDraggable ? '' : 'inactive' }`}
        onClick={() => remove(id)}
      >×</div>
    </div>
  );
}

/* A DraggableRows component is a container for a set of DraggableRow
 * components that each enclose a row's specific form fields.  It provides the
 * drag-and-drop context and maintains state for the rows, which consists
 * mainly of an ordered set of elements with an id and label, and optional extra
 * data fields.  It provides the state-changing callbacks to children as props.
 */
export function DraggableRows({ label, limit=5, itemsSource, Child, initial, errors }) {
  if (!Array.isArray(initial)) { initial = []; }
  if (initial.length === 0) { initial.push({ id: 0, label: '' }); }
  const [items, setItems] = useState(initial)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // change the selected value
  const change = useCallback((oldId, newId) => {
    setItems((oldItems) => {
      let hasNewline = false;
      const newItems = oldItems.reduce((acc, curr, ii) => {
        acc.push(curr);
        if (curr.id === oldId) { curr.id = newId; }
        if (curr.id === 0) { hasNewline = true; }
        return acc;
      }, []);
      if (!hasNewline && newItems.length < limit) {
        newItems.push({ id: 0 });
      }
      return newItems;
    })
  });

  // update the item with extra information
  const update = useCallback((id, updates) => {
    setItems((oldItems) => {
      return oldItems.reduce((acc, curr, ii) => {
        acc.push(curr);
        if (id === curr.id) { Object.assign(curr, updates); }
        return acc;
      }, []);
    });
  }, [])

  // remove the item from the list
  const remove = useCallback((id) => {
    if (id === 0) { return; } // don't remove the empty row
    setItems((oldItems) => {
      const newItems = oldItems.filter((item) => item.id !== id && item.id !== 0);
      if (newItems.length < limit) {
        newItems.push({ id: 0 });
      }
      return newItems;
    });
  });

  function handleDragEnd(event) {
    const {active, over} = event;

    if (active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((el) => el.id === active.id);
        const newIndex = items.findIndex((el) => el.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  return (
    <div>
      <div className={`title ${errors[label] ? 'error' : ''}`}>
        <p>
          <strong>{label}</strong>
          <span className="error-message">{errors[label]}</span>
        </p>
        {/* <button>+ Add traffic impact</button> */}
      </div>

      <div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {items.map((item, i) => (
              <DraggableRow
                id={item.id}
                isDraggable={item.id !== 0}
                remove={remove}
                key={`${label} row ${i}`}
              >
                <Child
                  id={item.id}
                  source={itemsSource[item.id]}
                  item={items[i]}
                  change={change}
                  update={update}
                  current={items.map((item) => item.id)}
                />
              </DraggableRow>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}
