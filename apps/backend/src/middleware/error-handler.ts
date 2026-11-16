// No constructor parameter property: client-app type-checks this file (via lib/auth.ts) with erasableSyntaxOnly
export class AppError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'AppError';
  }
}
