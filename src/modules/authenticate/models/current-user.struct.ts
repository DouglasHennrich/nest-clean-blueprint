/**
 * TCurrentUser — the authenticated user attached to req.currentUser
 * after the JWT guard validates the token and resolves the user.
 *
 * Extend this interface in your domain to add user-specific fields.
 */
export interface TCurrentUser {
  id: string;
  [key: string]: unknown;
}
