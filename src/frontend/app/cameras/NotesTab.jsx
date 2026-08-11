import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComment,
  faPenToSquare,
  faPlus,
} from '@fortawesome/pro-regular-svg-icons';

export default function NotesTab({ notes, onAddNote, onUpdateNote }) {
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');

  const handleStartEdit = (note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = (id) => {
    if (onUpdateNote) {
      onUpdateNote(id, editContent);
    }
    setEditingId(null);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleAddSubmit = () => {
    if (!newNoteContent.trim()) return;
    if (onAddNote) {
      onAddNote({
        author: 'Peter Taylor', // Default/current logged-in user
        updatedAt: `Wed ${new Date().toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}`,
        content: newNoteContent,
      });
    }
    setNewNoteContent('');
    setIsAdding(false);
  };

  return (
    <div className="tab-content notes-tab">
      <div className="notes-card">
        {/* Card Header */}
        <div className="notes-card-header">
          <h2 className="notes-title">Camera notes</h2>
          <button
            type="button"
            className="btn-add-entry"
            onClick={() => setIsAdding(!isAdding)}
          >
            <FontAwesomeIcon icon={faPlus} />
            <span>Add entry</span>
          </button>
        </div>

        {/* Inline Form to Add Entry */}
        {isAdding && (
          <div className="add-note-form">
            <textarea
              rows={3}
              placeholder="Enter note details..."
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
            />
            <div className="form-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleAddSubmit}
              >
                Save entry
              </button>
            </div>
          </div>
        )}

        {/* Notes List */}
        <div className="notes-list">
          {notes.map((note) => {
            const isEditing = editingId === note.id;

            return (
              <div key={note.id} className="note-item">
                <div className="note-item-header">
                  <div className="author-info">
                    <FontAwesomeIcon icon={faComment} className="note-icon" />
                    <span className="author-name">{note.author}</span>
                  </div>
                  <span className="updated-time">
                    Updated {note.updatedAt}
                  </span>
                </div>

                {isEditing ? (
                  <div className="edit-note-form">
                    <textarea
                      rows={4}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                    <div className="form-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => handleSaveEdit(note.id)}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="note-content">{note.content}</p>
                    <button
                      type="button"
                      className="btn-edit-note"
                      onClick={() => handleStartEdit(note)}
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                      <span>Edit</span>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}