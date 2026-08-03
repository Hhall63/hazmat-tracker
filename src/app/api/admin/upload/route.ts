import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabaseAdminClient'
import { validateUpload } from './validate'

export async function POST(request: Request) {
  const form = await request.formData()
  const file = form.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 })
  }
  const problem = validateUpload(file.type, file.size)
  if (problem) return NextResponse.json({ error: problem }, { status: 400 })

  const client = getSupabaseAdminClient()
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `uploads/${crypto.randomUUID()}.${ext}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error } = await client.storage.from('branding').upload(path, bytes, {
    contentType: file.type,
    upsert: false,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data } = client.storage.from('branding').getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
