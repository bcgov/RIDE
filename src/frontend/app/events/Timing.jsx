export default function EventTiming() {
  return <>
    <div className="title">
      <h4>Event Timing</h4>
    </div>

    <div className="subtitle">
      <p><strong>Scheduling</strong></p>
      <p>Always in Effect</p>
    </div>

    <div className="subtitle">
      <p><strong>Manage Event Timing By</strong></p>
    </div>

    <div className="input">
      <label>Next Update Time</label>
      <div className="row">
        <input type="datetime-local" name="next update time" />
        <select name="next update timezone">
          <option>PST</option>
          <option>MST</option>
        </select>
      </div>
    </div>

    <div className="input">
      <label>End Time</label>
      <div className="row">
        <input type="datetime-local" name="next update time" />
        <select name="next update timezone">
          <option>PST</option>
          <option>MST</option>
        </select>
      </div>
    </div>
  </>;
}
