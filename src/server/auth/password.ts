export function assertPasswordPolicy(password: string): string | null {
  if (password.length < 12) return "Parola trebuie să aibă cel puțin 12 caractere.";
  if (password.length > 200) return "Parola este prea lungă.";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return "Parola trebuie să conțină majuscule, minuscule și cifre.";
  }
  return null;
}
