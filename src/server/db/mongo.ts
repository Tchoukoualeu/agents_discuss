import { MongoClient } from 'mongodb'
import { getServerEnv } from '../env'

declare global {
  // eslint-disable-next-line no-var
  var __debateforge_mongoClient: MongoClient | undefined
}

function getMongoClient(uri: string) {
  if (!globalThis.__debateforge_mongoClient) {
    globalThis.__debateforge_mongoClient = new MongoClient(uri)
  }
  return globalThis.__debateforge_mongoClient
}

export async function getMongoDb() {
  const { MONGODB_URI, MONGODB_DB } = getServerEnv()
  const client = getMongoClient(MONGODB_URI)
  await client.connect()
  return client.db(MONGODB_DB ?? 'debateforge')
}

