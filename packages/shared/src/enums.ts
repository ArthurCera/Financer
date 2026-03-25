/**
 * Shared enumerations used by both frontend and backend.
 * Keep this file free of any runtime logic — pure type definitions only.
 */

export enum UserRole {
  SuperAdmin = 'superadmin',
  Admin = 'admin',
  User = 'user',
}

export enum ChatRole {
  User = 'user',
  Assistant = 'assistant',
}
