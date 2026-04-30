import { NextResponse } from 'next/server'

export async function GET() {
  const res = await fetch('https://api.hubapi.com/crm/v3/pipelines/deals', {
    headers: { Authorization: `Bearer ${process.env.HUBSPOT_TOKEN}` },
  })
  const data = await res.json()

  const stages = data.results?.flatMap((pipeline) =>
    pipeline.stages.map((s) => ({
      pipeline: pipeline.label,
      pipeline_id: pipeline.id,
      stage_label: s.label,
      stage_id: s.id,
    }))
  )

  return NextResponse.json(stages)
}
