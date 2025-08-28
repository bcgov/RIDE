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
            // style={{width: '4rem'}}
            defaultValue={event.external.url}
            onBlur={(e) => dispatch({ type: 'set', value: { url: e.target.value, section: 'external' }})}
          />
        </div>
      </div>
    </>
  );
}
