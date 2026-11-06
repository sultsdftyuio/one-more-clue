"use client";

/** Sent when something asks the Photographer's camera to load a picture, from anywhere in the room. */
export const CAMERA_EVENT = "omc-camera";

/** Opens a picture in the Photographer's camera. Any open card or panel closes so the camera can be seen. */
export function aimCamera(sceneId: string) {
  window.dispatchEvent(new CustomEvent(CAMERA_EVENT, { detail: sceneId }));
}
