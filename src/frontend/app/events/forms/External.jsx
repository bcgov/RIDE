export default function External({ errors, event, dispatch }) {
  return (
    <>
      <div className={`title ${errors['external'] && 'error'}`}>
        <p><strong>Additional details external site</strong> (optional)
        <span className='error-message'>{errors['external']}</span>
        </p>
      </div>
      <div className="input">
        <div style={{ display: 'block' }}>
          <input
            type="text"
            defaultValue={event.external.url}
            onBlur={(e) => dispatch({ type: 'set', value: { url: e.target.value, section: 'external' }})}
            placeholder="https://example.com/"
            style={{marginBottom: '0.5rem'}}
          />
        </div>
      </div>
    </>
  );
}
