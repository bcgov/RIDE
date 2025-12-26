/* global ol */
'use strict';

const routeStyle = new ol.style.Style({
  stroke: new ol.style.Stroke({
    color: 'rgba(50, 100, 255, 0.8)',
    width: 6,
  }),
});

const textStyle = (text) => {
  return new ol.style.Text({
    textAlign: 'center',
    font: '12px BC Sans',
    text: text,
    textBaseline: 'middle',
    fill: new ol.style.Fill({color: 'rgba(255, 255, 255, 0.9)'}),
    stroke: new ol.style.Stroke({color: 'rgba(0, 0, 0, 0.5)', width: 4}),
    offsetY: 1,
  });
}

const pointStyle = new ol.style.Style({
  image: new ol.style.Circle({
    stroke: new ol.style.Stroke({
      color: 'rgba(100, 64, 10, 0.5)',
      width: 2,
    }),
    fill: new ol.style.Fill({ color: 'rgba(230, 148, 24, 1)' }),
    radius: 10,
  }),
});

class MapWidget {
  constructor(options) {
    this.map = null;
    this.interactions = {draw: null, modify: null};
    this.typeChoices = false;
    this.route = null;

    // Default options
    this.options = {
      default_lat: 50,
      default_lon: -119,
      default_zoom: 12,
      srid: 'EPSG:3857',
    };
    // Altering using user-provided options
    for (const property in options) {
      if (Object.hasOwn(options, property)) {
        this.options[property] = options[property];
      }
    }

    this.map = new ol.Map({
      target: this.options.map_id,
      layers: [this.options.base_layer],
      view: new ol.View({ zoom: this.options.default_zoom, }),
    });
    this.featureCollection = new ol.Collection();
    this.featureOverlay = new ol.layer.Vector({
      map: this.map,
      source: new ol.source.Vector({
        features: this.featureCollection,
        useSpatialIndex: false // improve performance
      }),
      updateWhileAnimating: true, // optional, for instant visual feedback
      updateWhileInteracting: true, // optional, for instant visual feedback
    });

    this.featureCollection.on('add', (event) => {
      event.element.on('change', () => { this.serializeFeatures(); });
    });

    const initial_value = document.getElementById(this.options.id).value;
    if (initial_value) {
      const parsed = JSON.parse(initial_value);
      document.getElementById(this.options.id).value = JSON.stringify(parsed, null, 2);

      parsed.geometries.forEach((g, ii) => {
        if (g.type === 'LineString') {
          this.route = new ol.Feature({geometry: new ol.geom.LineString(g.coordinates)});
          this.route.setStyle(routeStyle);
          this.route.getGeometry().transform('EPSG:4326', this.options.srid);
          this.featureOverlay.getSource().addFeature(this.route);
        } else {
          const point = new ol.Feature({geometry: new ol.geom.Point(g.coordinates)});
          point.setStyle(pointStyle.clone());
          point.getStyle().setText(textStyle(ii + 1));
          point.getGeometry().transform('EPSG:4326', this.options.srid);
          this.featureOverlay.getSource().addFeature(point);
        }
      });
      this.serializeFeatures();
      this.refit();
    } else {
      this.map.getView().setCenter(this.defaultCenter());
    }

    this.updateMapStyle();
    this.createInteractions();
    this.map.on('click', this.clickHandler);
    this.map.on('contextmenu', this.rightClickHandler);

    window.m = this.map;
    window.c = this.featureCollection;
    window.w = this;
  }


  refit() {
    const extent = ol.extent.createEmpty();
    this.featureCollection.forEach((feature) => {
        ol.extent.extend(extent, feature.getGeometry().getExtent());
    });

    // Center/zoom the map
    this.map.getView().fit(extent, {minResolution: 1, padding: [40, 40, 40, 40]});
  }


  /* For the current set of points in the feature overlay, get a route if there
   * are at least two points and add it to the map (or update the current
   * route).  Then ensure all the points are snapped to vertices on the route
   * and update the number on each point.
   *
   * Points must be matched to vertices on the route so that the modify
   * interaction grabs both point and line on a click.  Without an exact match,
   * the points cannot be moved and the drag operation creates a new point every
   * time.
   */
  updateRoute() {
    let points = this.featureCollection.getArray();
    if (this.route) {
      points = points.slice(0, -1);
    }

    if (points.length < 2) { // not enough points for a route
      if (this.route) {
        this.featureCollection.remove(this.route);
        this.route = null;
      }
      return;
    }

    /* get flattened list of coordinates for router querystring:
     *
     * [[x1, y1], [x2, y2], ...] becomes [x1, y1, x2, y2, ...]
     */
    const nums = points.reduce((all, point) => {
      const pair = point.getGeometry().clone().transform(this.options.srid, 'EPSG:4326').getCoordinates();
      all.push(pair[0], pair[1]);
      return all;
    }, []);

    fetch(
      `https://router.api.gov.bc.ca/directions.json?points=${nums.join('%2C')}&partition%5B%5D=isTruckRoute&partition%5B%5D=&&criteria=fastest&snapDistance=4000&vehicleType=truck&truckRouteMultiplier=3&enable%5B%5D=tl&enable%5B%5D=gdf&enable%5B%5D=ldf&enable%5B%5D=tc&enable%5B%5D=tr&apikey=6097f62f6a8144edae53c59fc7c12351`
    ).then((response) => {
      response.json().then((data) => {
        const route = data.route.map(
          (point) => ol.proj.transform(point, 'EPSG:4326', this.options.srid)
        );

        if (route.length === 0) {
          if (this.route) { // remove previous route if exists
            this.featureCollection.remove(this.route);
            this.route = null;
          }
          return;
        }

        // snap points to route vertices so that modify interaction works
        points[0].getGeometry().setCoordinates(route[0]);
        points[0].getStyle().getText().setText(1);
        // intermediate points need to find the nearest vertex
        for (let ii = 1; ii < points.length - 1; ++ii) {
          const final = nearest(route, points[ii].getGeometry().getCoordinates());
          points[ii].getGeometry().setCoordinates(final);
          points[ii].getStyle().getText().setText(ii + 1);
        }
        points[points.length - 1].getGeometry().setCoordinates(route[route.length - 1]);
        points[points.length - 1].getStyle().getText().setText(points.length);

        if (this.route) {
          this.route.getGeometry().setCoordinates(route);
        } else {
          this.route = new ol.Feature({geometry: new ol.geom.LineString(route)})
          this.featureCollection.push(this.route);
          this.route.setStyle(routeStyle);
        }
      });
    });
  }


  /* Add interactions for dragging a route line to add a new point or move one
   */
  createInteractions() {
      this.interactions.modify = new ol.interaction.Modify({
          features: this.featureCollection,
      });

      this.interactions.modify.on('modifyend', (event) => {
        const route = this.route.getGeometry().getCoordinates();
        const newPoint = event.mapBrowserEvent.coordinate;
        const newPointIndex = find(newPoint, route);
        const points = this.featureCollection.getArray();

        if (!this.route || // no route yet
          match(newPoint, points[0].getGeometry().getCoordinates()) || // first point moved
          match(newPoint, points[points.length - 2].getGeometry().getCoordinates()) // last point moved
        ) {
          this.updateRoute();
          this.serializeFeatures();
          return;
        }

        // find the place to insert the new point in the list of existing points
        // by iterating through the route vertices, and checking the current
        // point; when matched, increment pointIndex to test further route
        // vertices against the next point
        let pointIndex = 1;
        for (let ii = 1; ii < newPointIndex; ++ii) {
          if (match(points[pointIndex].getGeometry().getCoordinates(), route[ii])) {
            ++pointIndex;
          }
        }

        const point = new ol.Feature({geometry: new ol.geom.Point(newPoint)});
        point.setStyle(pointStyle.clone());
        point.getStyle().setText(textStyle(1));
        this.featureCollection.insertAt(pointIndex, point);

        this.updateRoute();
        this.serializeFeatures();
      });

      this.map.addInteraction(this.interactions.modify);
  }


  /* Fetch the GeoBC style and apply it, including overrides
   */
  updateMapStyle() {
    fetch('https://www.arcgis.com/sharing/rest/content/items/b1624fea73bd46c681fab55be53d96ae/resources/styles/root.json', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }).then((response) => {
      response.json().then((glStyle) => {
        glStyle.metadata['ol:webfonts'] = '/fonts/{font-family}/{fontweight}{-fontstyle}.css';
        for (const layer of glStyle.layers) {
          overrides.merge(layer, overrides[layer.id] || {});
        }
        olms.applyStyle(this.options.base_layer, glStyle, 'esri');
      });
    });
  }


  /* Return the default coordinates, in the map's SRID.
   */
  defaultCenter() {
    const center = [this.options.default_lon, this.options.default_lat];
    if (this.options.srid) {
      return ol.proj.transform(center, 'EPSG:4326', this.options.srid);
    }
    return center;
  }


  /* Clicking on the map adds a point if the event doesn't intersect a feature.
  */
  clickHandler = (event) => {
    const feature = this.map.getFeaturesAtPixel(event.pixel, {
      hitTolerance: 20,
      layerFilter: (layer) => layer === this.featureOverlay,
    })[0];
    const coords = this.map.getCoordinateFromPixel(event.pixel);
    if (!feature) {
      const point = new ol.Feature({geometry: new ol.geom.Point(coords)});
      point.setStyle(pointStyle.clone());
      point.getStyle().setText(textStyle(1));
      if (this.route) {
        this.featureCollection.insertAt(this.featureCollection.getLength() - 1, point);
      } else {
        this.featureCollection.push(point)
      }
      this.updateRoute();
    }
  }


  /* Right clicking on a point removes it
  */
  rightClickHandler = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const feature = this.map.getFeaturesAtPixel(event.pixel, {
      hitTolerance: 20,
      layerFilter: (layer) => layer === this.featureOverlay,
    })[0];

    this.featureCollection.remove(feature);
    this.updateRoute();
    this.serializeFeatures();
  }


  /* Dump the geometries of the features into a JSON serialized geometry
   * collection ready to submit as part of the form.
   */
  serializeFeatures() {
    // get an array of the feature geometries in 4326
    const geometries = this.featureCollection.getArray().map((feature) => {
      return feature.getGeometry().clone().transform(this.options.srid, 'EPSG:4326');
    });
    const geometry = new ol.geom.GeometryCollection(geometries);
    const jsonFormat = new ol.format.GeoJSON();
    // format the geometry array as indented JSON
    const formatted = JSON.stringify(JSON.parse(jsonFormat.writeGeometry(geometry)), null, 2);
    document.getElementById(this.options.id).value = formatted;
  }
}


// compare points, returning true if every element matches
const match = (a, b) => a[0] === b[0] && a[1] === b[1];


/* for a given set of coordinates, return the index of the supplied coordinate
 * if found, -1 otherwise.
 */
const find = (coord, coords) => {
  for(let ii = 0; ii < coords.length; ++ii) {
    if (match(coord, coords[ii])) { return ii; }
  }
  return -1;
}


/* For a given set of points, find the point nearest to the 'from' point.
 */
const nearest = (points, from) => {
  let least = Infinity;
  return points.reduce((closest, point) => {
    const dx = point[0] - from[0];
    const dy = point[1] - from[1];
    const distance = (dx * dx) + (dy * dy);
    if (distance < least) {
      least = distance;
      closest = point;
    }
    return closest;
  }, null);
}

