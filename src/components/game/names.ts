"use client";

/**
 * Detective names, so nobody has to type one to start. First visit: a random
 * name like "Sly Raven"; it's remembered on this device, and changing it in the
 * lobby remembers the new one.
 */
const KEY = "omc-name";

const ADJECTIVES = ["Sly", "Quiet", "Sharp", "Lucky", "Brave", "Swift", "Clever", "Steady", "Bold", "Keen", "Shady", "Witty"];
const ANIMALS = ["Raven", "Fox", "Otter", "Lynx", "Hawk", "Badger", "Heron", "Wolf", "Owl", "Mink", "Crow", "Hare"];

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

export function randomName() {
  return `${pick(ADJECTIVES)} ${pick(ANIMALS)}`;
}

export function rememberName(name: string) {
  try {
    window.localStorage.setItem(KEY, name);
  } catch {}
}

/** This device's detective name, made up (and remembered) the first time. */
export function myName() {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved) return saved;
  } catch {}
  const name = randomName();
  rememberName(name);
  return name;
}
