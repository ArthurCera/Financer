import { NotFoundError } from '../types';
import { ICacheService } from '../interfaces/ICacheService';

/**
 * Verify that an entity exists and belongs to the requesting user.
 * Throws NotFoundError if missing or owned by a different user.
 *
 * Security note: intentionally returns NotFoundError (not ForbiddenError)
 * when the entity belongs to another user. This prevents ID enumeration
 * attacks — callers cannot distinguish "does not exist" from "not yours".
 */
export async function findOwnedOrThrow<T extends { userId: string }>(
  repo: { findById(id: string): Promise<T | null> },
  id: string,
  userId: string,
  entityName: string,
): Promise<T> {
  const entity = await repo.findById(id);
  if (!entity || entity.userId !== userId) {
    throw new NotFoundError(entityName, id);
  }
  return entity;
}

/**
 * Build a partial update object from request data, including only defined fields.
 */
export function buildPartial<T>(data: Partial<T>, keys: (keyof T)[]): Partial<T> {
  const partial: Partial<T> = {};
  for (const key of keys) {
    if (data[key] !== undefined) {
      partial[key] = data[key];
    }
  }
  return partial;
}

/**
 * Invalidate dashboard cache for a user (best-effort).
 * Call after any expense/budget/income mutation.
 */
export async function invalidateDashboardCache(
  cache: ICacheService,
  userId: string,
): Promise<void> {
  try {
    await cache.deletePattern(`dashboard:${userId}:*`);
  } catch {
    // Cache invalidation is best-effort — don't block the mutation
  }
}
