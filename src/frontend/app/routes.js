import { index, layout, prefix, route } from "@react-router/dev/routes";

export default [
  layout("./layout.jsx", [
    index("home/home.jsx"),
    route("cameras", "./cameras/layout.jsx", [
      index("./cameras/home.jsx"),
      route("test", "./cameras/test.jsx"),
    ]),
    route("events", "./events/layout.jsx", [
      index("./events/home.jsx"),
      route("test", "./events/test.jsx"),
    ]),
    route("users", "./users/layout.jsx", [
      index("./users/home.jsx"),
      route("test", "./users/test.jsx"),
    ]),
    route("segments", "./segments/layout.jsx", [
      index("./segments/home.jsx"),
      route("test", "./segments/test.jsx"),
    ]),
  ]),
];
