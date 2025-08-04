import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  layout("routes/_layout.tsx", [
    index("routes/_index.tsx"),
    route("about", "routes/about.tsx"),
    route("notes", "routes/notes.tsx"),
    route("notes/new", "routes/notes.new.tsx"),
    route("notes/:id", "routes/notes.$id.tsx"),
    route("notes/:id/edit", "routes/notes.$id.edit.tsx"),
    route("*", "routes/$.tsx"), // Catch-all route for 404
  ])
] satisfies RouteConfig;
