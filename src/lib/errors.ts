// Maps common Supabase/Postgres error shapes to plain-language messages.
// Falls back to the original message when nothing matches, so nothing is ever hidden.

interface ErrorLike {
  message?: string;
  code?: string;
}

const CONSTRAINT_MESSAGES: Record<string, string> = {
  students_center_phone_unique: "A student with this phone number already exists in your center.",
  batches_center_name_unique: "A batch with this name already exists in your center.",
};

const CODE_MESSAGES: Record<string, string> = {
  "23503": "This is still linked to other records and can't be removed.",
  "23502": "Please fill in all required fields.",
  "23514": "That value isn't allowed for this field.",
  "42501": "You don't have permission to do that.",
};

export function friendlyError(error: ErrorLike | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  const message = error.message ?? "";

  if (error.code === "23505" || /duplicate key value violates unique constraint/i.test(message)) {
    const constraint = Object.keys(CONSTRAINT_MESSAGES).find((name) => message.includes(name));
    return constraint ? CONSTRAINT_MESSAGES[constraint] : "This already exists — please use a different value.";
  }
  if (error.code && CODE_MESSAGES[error.code]) return CODE_MESSAGES[error.code];

  return message || fallback;
}
