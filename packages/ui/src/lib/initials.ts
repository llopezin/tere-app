/** "María", "García" → "MG" */
export function initialsOf(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`;
}
