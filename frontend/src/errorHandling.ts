export const handleError = (error: unknown, fallbackMessage: string, context: string) => {
  const message = error instanceof Error && error.message.trim() ? error.message : fallbackMessage;
  console.error(`[MakerFlow] ${context}: ${message}`, error);
  return message;
};
