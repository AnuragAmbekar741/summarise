// Set by requireAuth on routes that need a signed-in user.
declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
