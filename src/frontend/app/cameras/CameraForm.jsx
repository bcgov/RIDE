import { useState } from 'react';

import './CameraForm.scss';

export default function CameraForm({ camera, onSubmit, onCancel }) {
  const [name, setName] = useState(camera?.cam_internet_name || '');
  const [caption, setCaption] = useState(
    camera?.cam_internet_caption || ''
  );

  const handleSubmit = async (event) => {
    event.preventDefault();

    await onSubmit({
      ...(camera || {}),
      cam_internet_name: name,
      cam_internet_caption: caption,
    });
  };

  return (
    <form className="camera-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="camera-name">
          Name
        </label>

        <input
          id="camera-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </div>

      <div>
        <label htmlFor="camera-caption">
          Caption
        </label>

        <input
          id="camera-caption"
          type="text"
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
        />
      </div>

      <div>
        <button type="submit">
          {camera ? 'Update' : 'Create'}
        </button>

        <button
          type="button"
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}