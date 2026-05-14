export const USERNAME_PATTERN = /^[A-Za-z0-9_.-]+$/;
export const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

export const USERNAME_MESSAGE =
  "Must be A-Z, a-z, 0-9, underscores(_), dots(.), hyphens(-) only";
export const USERNAME_LENGTH_MESSAGE =
  "Must be 3-50 characters.";

export const PASSWORD_MESSAGE =
  "Must be minimum 8 characters and include uppercase, lowercase, number.";
