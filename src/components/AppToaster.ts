import { Toaster, Position } from '@blueprintjs/core';

/** Global toaster instance for app-wide notifications */
export const AppToaster = Toaster.create({
  position: Position.TOP,
  maxToasts: 3,
});
