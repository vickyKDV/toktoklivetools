export function isDatabaseUnavailableError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = error instanceof Error ? error.message : String(error);

  return (
    message.includes("Can't reach database server") ||
    message.includes("Environment variable not found: DATABASE_URL") ||
    message.includes("PrismaClientInitializationError")
  );
}

export function databaseUnavailableMessage() {
  return "Database is not reachable. Start MySQL or configure DATABASE_URL before logging in.";
}
