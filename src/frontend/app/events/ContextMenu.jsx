import './ContextMenu.css';

export default function ContextMenu({ ref, options }) {
  return (
    <div
      ref={ref}
      className={`context-menu ${options.length > 0 && 'open'}`}
      onClick={() => null}
    >
      {options.map((option, ii) => (
        <div className='context-option' onClick={option.action} key={'option-' + ii}>
          {option.label}
        </div>
      ))}
    </div>
  );
};
