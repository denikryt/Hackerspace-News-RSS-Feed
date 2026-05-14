import { renderCalendarPageTsx } from "./tsxPageRuntime.js";

// Calendar uses the same JS wrapper pattern as the other page renderers so the
// plain Node render flow keeps a stable import surface.
export function renderCalendarPage(model) {
  return renderCalendarPageTsx(model);
}
