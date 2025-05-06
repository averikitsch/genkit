import {
  afterAll,
  beforeAll,
  describe,
  expect,
  afterEach,
  jest,
  test,
} from '@jest/globals';
import { Genkit } from 'genkit';
import {
  Document,
} from 'genkit/retriever';
import { PostgresEngine } from '../src/engine';
import { configurePostgresIndexer } from '../src/index';

import * as dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

const TEST_TABLE = "test_embeddings";
const SCHEMA_NAME = "test_schema";

describe("configurePostgresIndexer Integration Tests", () => {
  let engine: PostgresEngine;
  let mockEmbedder: any;
  let mockAi: Genkit;
  let testDoc: any;
  let indexer: any;

  beforeAll(async () => {
    // Initialize PostgresEngine
    engine = await PostgresEngine.fromEngineArgs({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      port: parseInt(process.env.DB_PORT || '5432')
    });

    // Create test schema and table
    await engine.pool.raw(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA_NAME}`);
    await engine.pool.raw(`DROP TABLE IF EXISTS ${SCHEMA_NAME}.${TEST_TABLE}`);

    // Mock Genkit instance
    mockAi = {
      embedMany: () => [{ embedding: [0.1, 0.2, 0.3] }],
      defineIndexer: () => (config, handler) => ({
        config,
        handler
      })
    } as unknown as Genkit;

    // Mock embedder function
    mockEmbedder = {
      name: 'mock-embedder',
      embedMany: () => [{ embedding: [0.1, 0.2, 0.3] }]
    } as any;

    // Create test document
    testDoc = new Document({
      content: [{ text: 'test content' }],
      metadata: {}
    });

    // Create indexer
    indexer = configurePostgresIndexer(mockAi, {
      tableName: TEST_TABLE,
      engine: engine,
      schemaName: SCHEMA_NAME,
      contentColumn: 'content',
      embeddingColumn: 'embedding',
      idColumn: 'id',
      metadataJsonColumn: 'metadata',
      distanceStrategy: 'cosine',
      embedder: mockEmbedder
    });
  });

  describe("Basic Functionality", () => {
    test('should create indexer with correct configuration', async () => {
      expect(indexer.config.name).toBe(`postgres/${TEST_TABLE}`);
      expect(indexer.config.configSchema).toBeDefined();
    });

    test('should create table with correct schema on first use', async () => {
      // Execute the handler to trigger table creation
      await indexer({ documents: [], options: {} });

      // Verify table exists with correct schema
      const tableInfo = await engine.pool.raw(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = '${SCHEMA_NAME}' 
        AND table_name = '${TEST_TABLE}'
      `);

      expect(tableInfo.rows).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ column_name: 'id', data_type: 'uuid' }),
          expect.objectContaining({ column_name: 'content', data_type: 'text' }),
          expect.objectContaining({ column_name: 'embedding', data_type: 'USER-DEFINED' }),
          expect.objectContaining({ column_name: 'metadata', data_type: 'jsonb' }),
          expect.objectContaining({ column_name: 'created_at', data_type: 'timestamp without time zone' })
        ])
      );
    });
  });

  describe("Document Indexing", () => {
    test('should index single document correctly', async () => {
      const testDoc = new Document({
        content: [{ text: 'Test content' }],
        metadata: { source: 'test', customId: uuidv4() }
      });

      await indexer({ documents: [testDoc], options: {} });

      // Verify document was inserted
      const result = await engine.pool
        .withSchema(SCHEMA_NAME)
        .select('*')
        .from(TEST_TABLE);

      expect(result).toHaveLength(1);
      expect(result[0].content).toBe('Test content');
      expect(result[0].metadata.source).toBe('test');
      expect(result[0].embedding).toBeDefined();
    });

    test('should handle batch indexing with custom batch size', async () => {
      const docs = Array.from({ length: 5 }, (_, i) => 
        new Document({
          content: [{ text: `Content ${i}` }],
          metadata: { batch: i, customId: uuidv4() }
        })
      );

      await indexer({ documents: docs, options: { batchSize: 2 } });

      // Verify all documents were inserted
      const result = await engine.pool
        .withSchema(SCHEMA_NAME)
        .select('*')
        .from(TEST_TABLE)
        .orderBy('content');

      expect(result).toHaveLength(5);
      expect(result.map(r => r.content)).toEqual([
        'Content 0', 'Content 1', 'Content 2', 'Content 3', 'Content 4'
      ]);
    });

    test('should use existing ID from metadata if provided', async () => {
      const testId = uuidv4();
      const testDoc = new Document({
        content: [{ text: 'Test with ID' }],
        metadata: { customId: testId, source: 'id-test' }
      });

      await indexer({ documents: [testDoc], options: {} });

      // Verify document was inserted with correct ID
      const result = await engine.pool
        .withSchema(SCHEMA_NAME)
        .select('id')
        .from(TEST_TABLE)
        .first();

      expect(result.id).toBe(testId);
    });
  });

  describe("Error Handling", () => {
    test('should throw error when engine is not provided', () => {
      expect(() => {
        configurePostgresIndexer(mockAi, {
          tableName: TEST_TABLE,
          // @ts-expect-error - Testing invalid input
          engine: undefined,
          contentColumn: 'content',
          embeddingColumn: 'embedding',
          idColumn: 'id',
          distanceStrategy: 'cosine',
          embedder: mockEmbedder
        });
      }).toThrow();
    });

    test('should handle embedding generation errors', async () => {
      const errorEmbedder = {
        name: 'error-embedder',
        embedMany: () => new Error('Embedding failed')
      } as any;

      const indexer = configurePostgresIndexer(mockAi, {
        tableName: TEST_TABLE,
        engine,
        schemaName: SCHEMA_NAME,
        contentColumn: 'content',
        embeddingColumn: 'embedding',
        idColumn: 'id',
        distanceStrategy: 'cosine',
        embedder: errorEmbedder
      });

      await expect(
        indexer({ documents: [new Document({ content: [{ text: 'Fail me' }] })], options: {} })
      ).rejects.toThrow('Embedding failed');

      await indexer({ documents: [testDoc], options: {} });

      await expect(
        indexer({ documents: [testDoc], options: {} })
      ).rejects.toThrow();
    });

    test('should handle database insertion errors', async () => {
      // Create a table with a constraint that will cause our test to fail
      await engine.pool.raw(`
        CREATE TABLE IF NOT EXISTS ${SCHEMA_NAME}.constraint_test (
          id UUID PRIMARY KEY,
          content TEXT NOT NULL,
          embedding VECTOR(1536),
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW(),
          CONSTRAINT unique_content UNIQUE (content)
        );
      `);

      const indexer = configurePostgresIndexer(mockAi, {
        tableName: 'constraint_test',
        engine,
        schemaName: SCHEMA_NAME,
        contentColumn: 'content',
        embeddingColumn: 'embedding',
        idColumn: 'id',
        metadataJsonColumn: 'metadata',
        distanceStrategy: 'cosine',
        embedder: mockEmbedder
      });

      const testDoc = new Document({
        content: [{ text: 'Duplicate content' }],
        metadata: { source: 'test' }
      });

      // First insert should succeed
      await indexer({ documents: [testDoc], options: {} });

      // Second insert with same content should fail due to constraint
      await expect(
        indexer({ documents: [testDoc], options: {} })
      ).rejects.toThrow();
    });
  });

  afterEach(async () => {
    // Clean up test data after each test
    await engine.pool.raw(`TRUNCATE TABLE ${SCHEMA_NAME}.${TEST_TABLE}`);
    await engine.pool.raw(`DROP TABLE IF EXISTS ${SCHEMA_NAME}.constraint_test`);
  });

  afterAll(async () => {
    // Clean up schema and close connection
    await engine.pool.raw(`DROP SCHEMA IF EXISTS ${SCHEMA_NAME} CASCADE`);
    await engine.closeConnection();
  });
});