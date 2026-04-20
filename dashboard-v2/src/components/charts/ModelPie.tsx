import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

interface PieSlice {
  name: string
  value: number
  color?: string
}

interface ModelPieProps {
  data: PieSlice[]
}

const MODEL_COLORS: Record<string, string> = {
  'haiku':           '#00d4ff',
  'sonnet':          '#00ff88',
  'opus':            '#ffaa00',
  '9router':         '#a78bfa',
  'ollama':          '#6b7280',
  'free-unlimited':  '#a78bfa',
  'heartbeat-cheap': '#6366f1',
  'gpt':             '#f59e0b',
  'default':         '#3a4468',
}

function getModelColor(name: string, idx: number): string {
  const lower = name.toLowerCase()
  for (const [key, color] of Object.entries(MODEL_COLORS)) {
    if (lower.includes(key)) return color
  }
  const fallbacks = ['#00d4ff', '#00ff88', '#ffaa00', '#ff3366', '#a78bfa', '#6366f1', '#f59e0b']
  return fallbacks[idx % fallbacks.length]
}

export default function ModelPie({ data }: ModelPieProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const enriched = data.map((d, i) => ({
    ...d,
    color: d.color ?? getModelColor(d.name, i),
  }))

  useEffect(() => {
    if (!svgRef.current || enriched.length === 0) return
    const el = svgRef.current
    d3.select(el).selectAll('*').remove()

    const W = 260
    const H = 180
    const R = 70
    const cx = W / 2 - 20
    const cy = H / 2

    const svg = d3.select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')

    const pie = d3.pie<typeof enriched[0]>()
      .value(d => d.value)
      .sort(null)

    const arc = d3.arc<d3.PieArcDatum<typeof enriched[0]>>()
      .innerRadius(R * 0.55)
      .outerRadius(R)

    const arcs = pie(enriched)
    const total = enriched.reduce((s, d) => s + d.value, 0)

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`)

    // Slices
    g.selectAll('path')
      .data(arcs)
      .join('path')
      .attr('d', arc)
      .attr('fill', d => d.data.color!)
      .attr('stroke', '#0a0e1a')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9)

    // Center label
    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '-0.1em')
      .attr('font-size', '10')
      .attr('fill', '#9ca3af')
      .text('TOTAL')

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '1.1em')
      .attr('font-size', '11')
      .attr('font-weight', 'bold')
      .attr('fill', '#fff')
      .text(`$${total.toFixed(4)}`)

    // Legend (right side)
    const legendX = cx + R + 24
    const legendStartY = cy - (enriched.length * 14) / 2

    enriched.forEach((d, i) => {
      const ly = legendStartY + i * 16
      svg.append('rect')
        .attr('x', legendX).attr('y', ly - 5)
        .attr('width', 8).attr('height', 8)
        .attr('rx', 2)
        .attr('fill', d.color!)

      svg.append('text')
        .attr('x', legendX + 12).attr('y', ly + 2)
        .attr('font-size', '9')
        .attr('fill', '#9ca3af')
        .text(d.name.length > 14 ? d.name.slice(0, 14) + '…' : d.name)

      const pct = total > 0 ? (d.value / total * 100).toFixed(0) : '0'
      svg.append('text')
        .attr('x', W - 4).attr('y', ly + 2)
        .attr('text-anchor', 'end')
        .attr('font-size', '9')
        .attr('fill', d.color!)
        .attr('font-weight', '600')
        .text(`${pct}%`)
    })

  }, [enriched])

  return (
    <svg ref={svgRef} style={{ width: '100%', maxWidth: 280, height: 190 }} />
  )
}
