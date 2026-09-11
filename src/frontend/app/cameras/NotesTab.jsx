import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faComment,
  faPenToSquare,
  faPlus,
} from '@fortawesome/pro-regular-svg-icons';
import { getCookie } from '../shared/helpers.js';

export default function NotesTab({ cameraId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState('');
  const loadNotes = async () => {
    if (!cameraId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/cameras/${cameraId}/notes/`);
      if (!response.ok) {
        throw new Error(`Failed to load notes: ${response.status}`);
      }
      const data = await response.json();
      setNotes(data);
    } catch (error) {
      console.error('Failed to load notes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [cameraId]);

  const handleStartEdit = (note) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const handleSaveEdit = async (id) => {
    try {
      const response = await fetch(`/api/cameras/${cameraId}/notes/${id}/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ content: editContent }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update note: ${response.status}`);
      }

      await loadNotes();
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update note:', error);
      alert(error.message);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const handleAddSubmit = async () => {
    if (!newNoteContent.trim()) return;

    try {
      const response = await fetch(`/api/cameras/${cameraId}/notes/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ content: newNoteContent }),
      });

      if (!response.ok) {
        throw new Error(`Failed to add note: ${response.status}`);
      }

      await loadNotes();
      setNewNoteContent('');
      setIsAdding(false);
    } catch (error) {
      console.error('Failed to add note:', error);
      alert(error.message);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const weekday = date.toLocaleDateString('en-US', { weekday: 'short' });
    const rest = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${weekday} ${rest}`;
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
          {loading && <p className="notes-loading">Loading notes...</p>}

          {!loading && notes.length === 0 && (
            <p className="notes-empty">No notes yet.</p>
          )}

          {notes.map((note) => {
            const isEditing = editingId === note.id;

            return (
              <div key={note.id} className="note-item">
                <div className="note-item-header">
                  <div className="author-info">
                    <FontAwesomeIcon icon={faComment} className="note-icon" />
                    <span className="author-name">
                      {note.author_name || 'Unknown'}
                    </span>
                  </div>
                  <span className="updated-time">
                    Updated {formatDate(note.updated)}
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