/** `plural(1, "paciente", "pacientes")` → "1 paciente"; any other count takes the plural. */
export function plural(count: number, singular: string, pluralForm: string) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}
