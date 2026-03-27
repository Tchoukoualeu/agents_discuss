import { MongoClient } from 'mongodb'
import { getServerEnv } from '../env'

const { MONGODB_URI, MONGODB_DB } = getServerEnv()

declare global {
  // eslint-disable-next-line no-var
  var __debateforge_mongoClient: MongoClient | undefined
}

function getMongoClient() {
  if (!globalThis.__debateforge_mongoClient) {
    globalThis.__debateforge_mongoClient = new MongoClient(MONGODB_URI)
  }
  return globalThis.__debateforge_mongoClient
}

export async function getMongoDb() {
  const client = getMongoClient()
  await client.connect()
  return client.db(MONGODB_DB ?? 'debateforge')
}

