import { browser } from "$app/environment";

export const dispatch = (type: string, data?: any) => {
  const event = new Event(type, data);
  if (browser) {
    window.dispatchEvent(event);
  }
}