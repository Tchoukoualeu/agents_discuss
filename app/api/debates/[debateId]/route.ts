import { NextResponse } from 'next/server'
import { z } from 'zod'

import { getMongoDb } from '#/server/db/mongo'

const deviceSchema = z.object({ deviceId: z.string().min(1) })

export async function GET(
  req: Request,
  { params }: { params: Promise<{ debateId: string }> },
) {
  const { debateId } = await params
  const url = new URL(req.url)
  const { deviceId } = deviceSchema.parse({
    deviceId: url.searchParams.get('deviceId'),
  })
  const db = await getMongoDb()
  const debate = await db
    .collection('debates')
    .findOne({ deviceId, debateId }, { projection: { _id: 0 } })
  if (!debate) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(debate)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ debateId: string }> },
) {
  const { debateId } = await params
  const url = new URL(req.url)
  const { deviceId } = deviceSchema.parse({
    deviceId: url.searchParams.get('deviceId'),
  })
  const db = await getMongoDb()
  const res = await db
    .collection('debates')
    .deleteOne({ deviceId, debateId })
  return NextResponse.json({ deleted: res.deletedCount === 1 })
}

