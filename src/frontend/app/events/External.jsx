export default function External({ event, dispatch }) {
  return (
    <>
      <div className="title">
        <p><strong>Additional details external site</strong> (optional)</p>
      </div>
      <div className="input">
        <div style={{ display: 'block' }}>
          <input
            type="text"
            defaultValue={event.external.url}
            onBlur={(e) => dispatch({ type: 'set', value: { url: e.target.value, section: 'external' }})}
            placeholder="https://example.com/"
          />
        </div>
      </div>
    </>
  );
}
