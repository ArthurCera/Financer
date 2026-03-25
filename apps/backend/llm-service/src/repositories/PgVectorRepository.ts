import { injectable, inject } from 'tsyringe';
import { IVectorRepository, VectorSearchResult, sql } from '@financer/backend-shared';

@injectable()
export class PgVectorRepository implements IVectorRepository {
  constructor(@inject('db') private readonly db: any) {}

  async upsert(id: string, embedding: number[], metadata: Record<string, unknown>): Promise<void> {
    const vectorStr = `[${embedding.join(',')}]`;
    const userId = metadata['userId'] as string;
    const role = metadata['role'] as string;
    const content = metadata['content'] as string;

    await this.db.execute(
      sql`INSERT INTO llm_chats (id, user_id, role, content, embedding)
          VALUES (${id}, ${userId}, ${role}, ${content}, ${vectorStr}::vector)
          ON CONFLICT (id) DO UPDATE SET embedding = ${vectorStr}::vector`,
    );
  }

  async similaritySearch(
    embedding: number[],
    topK: number,
    filter?: Record<string, unknown>,
  ): Promise<VectorSearchResult[]> {
    const vectorStr = `[${embedding.join(',')}]`;
    const userId = filter?.['userId'] as string | undefined;

    let rows: { id: string; score: number; metadata: string }[];

    if (userId) {
      rows = await this.db.execute(
        sql`SELECT
              id,
              content,
              role,
              1 - (embedding <=> ${vectorStr}::vector) AS score
            FROM llm_chats
            WHERE user_id = ${userId} AND embedding IS NOT NULL
            ORDER BY embedding <=> ${vectorStr}::vector
            LIMIT ${topK}`,
      );
    } else {
      rows = await this.db.execute(
        sql`SELECT
              id,
              content,
              role,
              1 - (embedding <=> ${vectorStr}::vector) AS score
            FROM llm_chats
            WHERE embedding IS NOT NULL
            ORDER BY embedding <=> ${vectorStr}::vector
            LIMIT ${topK}`,
      );
    }

    return (rows as any[]).map((row) => ({
      id: row.id as string,
      score: parseFloat(String(row.score)),
      metadata: {
        content: row.content,
        role: row.role,
      },
    }));
  }

  async delete(id: string): Promise<void> {
    await this.db.execute(sql`DELETE FROM llm_chats WHERE id = ${id}`);
  }
}
