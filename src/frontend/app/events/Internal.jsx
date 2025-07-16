export default function InternalNotes () {
  return <>
    <div className="title">
      <p><strong>Internal Notes</strong></p>
      <button>Add Entry</button>
      <button>Edit</button>
    </div>

    <div className="table">
      <div className="description header">Description</div>
      <div className="created header">Created</div>
      <div className="updated header">Updated</div>

      <div className="description">Please review this delay</div>
      <div className="created">3/6/25 10:00 AM</div>
      <div className="updated">4/6/25 3:00 PM</div>
      <div className="attribution">dkachman</div>

      <div className="description">I just created this delay</div>
      <div className="created">1/6/25 10:00 AM</div>
      <div className="updated">2/6/25 3:00 PM</div>
      <div className="attribution">dkachman</div>
    </div>
  </>;
}