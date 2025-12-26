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
function DraggableRow({ children, id, isDraggable, remove, noX }) {
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
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

      { !noX && <div
          className={`handle delete ${ isDraggable ? '' : 'inactive' }`}
          onClick={() => remove(id)}
        >×</div>
      }
    </div>
  );
}

/* A DraggableRows component is a container for a set of DraggableRow
 * components that each enclose a row's specific form fields.  It provides the
 * drag-and-drop context and maintains state for the rows, which consists
 * mainly of an ordered set of elements with an id and label, and optional extra
 * data fields.  It provides the state-changing callbacks to children as props.
 */
export function DraggableRows({
  label, limit=5, itemsSource, Child, errors, childErrors=[], callback, dispatch,
  section, appended, items=[], noX, noBlank }) {

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // change the selected value
  const change = (oldId, newValue) => {
    dispatch({ type: 'update list', section, id: oldId, value: newValue });
  };

  // update the item with extra information
  const update = (id, updates) => {
    dispatch( { type: 'update item', section, id, value: updates })
  };

  function handleDragEnd(event) {
    if (event.active.id !== event.over.id) {
      const oldIndex = items.findIndex((el) => el.id === event.active.id);
      const newIndex = items.findIndex((el) => el.id === event.over.id);
      dispatch({ type: 'change order', section, value: arrayMove(items, oldIndex, newIndex) });
    }
  }

  const current = items.map((item) => item.id);

  return (
    <div>
      <div className={`title ${errors[label] ? 'error' : ''}`}>
        <p>
          <strong>{label}</strong> {appended}
          <span className="error-message">{errors[label]}</span>
        </p>
      </div>

      { (items || []).reduce((acc, item) => acc || item.closed, false) && (
        <div className="is-closure">
          This event will display as a <strong>closure</strong>
        </div>
      )}

      <div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            {/* current items */}
            {items.map((item, i) => (
              <DraggableRow
                id={item.id}
                isDraggable={true}
                remove={(e) => dispatch({ type: 'remove from list', section, id: item.id })}
                key={`${label} row ${i}`}
                noX={noX}
              >
                <Child
                  id={item.id}
                  index={i}
                  item={{ ...item, value: item.id, label: item.label }}
                  change={change}
                  update={update}
                  current={current}
                  dispatch={dispatch}
                  errors={childErrors[i]}
                />
              </DraggableRow>
            ))}

            {/* empty row if more allowed */}
            { items.length < limit && !noBlank &&
              <DraggableRow
                id={0}
                isDraggable={false}
                remove={() => null}
                key={`empty row`}
                noX={noX}
              >
                <Child
                  id={0}
                  item={{id: 0, label: ''}}
                  change={change}
                  update={update}
                  current={current}
                />
              </DraggableRow>
            }
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

export function getCookie(key) {
  const cookies = document.cookie.split('; ')
  const cookie = cookies.filter(c => c.startsWith(key + '='))
  if (cookie[0]) { return cookie[0].split('=')[1]; }
  return '';
}
