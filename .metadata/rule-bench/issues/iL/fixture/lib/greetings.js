import { capitalize } from './helpers.js';

/**
 * Greets a person.
 * @param {string} name - display name; capitalized on output.
 * @returns {string} greeting line
 */
export function greet(name) {
  return `Hello, ${capitalize(name)}!`;
}

/**
 * Says goodbye to a person.
 * @param {string} name - display name; capitalized on output.
 * @returns {string} farewell line
 */
export function farewell(name) {
  return `Goodbye, ${capitalize(name)}.`;
}
