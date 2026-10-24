import { BODY_CLASSES } from "../common/constants";

export function toggleBodyClass(className: string): void {
  document.body.classList.toggle(className);
}

export function resetBodyClasses(): void {
  document.body.classList.remove(BODY_CLASSES.SIDEBAR_COLLAPSED);
}
