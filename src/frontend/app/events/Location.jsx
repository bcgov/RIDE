export default function Location() {
  return <>
    <div className="title">
      <p><strong>Location</strong></p>
      <button>+ Add end location</button>
    </div>

    <div className="toggleable">
      <div className="toggle">O</div>
      <div className="toggled">
        <div>Highway 97</div>

        <div>
          <input type="checkbox" /> Include alias
          <select>
            <option>Lorem Ipsum Highway</option>
            <option></option>
            <option></option>
          </select>
        </div>

        <div>
          <div>Reference Location</div>
          <div><input type="checkbox" /> 30km South of Quesnel</div>
          <div><input type="checkbox" /> 20km North of Half-mile House</div>
          <div><input type="checkbox" /> 2.4km North of exit 244</div>
          <div><input type="checkbox" /> Other <input type="text" /></div>
        </div>

      </div>
    </div>
  </>;
}
