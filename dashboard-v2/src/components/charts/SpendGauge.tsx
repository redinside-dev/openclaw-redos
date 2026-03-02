import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

interface SpendGaugeProps {
  spent: number
  limit: number
  label?: string
}

export default function SpendGauge({ spent, limit, label = 'Daily Spend' }: SpendGaugeProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const pct = limit > 0 ? Math.min(spent / limit, 1) : 0

  useEffect(() => {
    if (!svgRef.current) return
    const el = svgRef.current
    d3.select(el).selectAll('*').remove()

    const W = 200
    const H = 130
    const cx = W / 2
    const cy = H - 10
    const outerR = 90
    const innerR = 65
    const startAngle = -Math.PI * 0.85
    const endAngle = Math.PI * 0.85

    const svg = d3.select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')
      .attr('height', '100%')

    // Background arc
    const bgArc = d3.arc<unknown>()
      .innerRadius(innerR)
      .outerRadius(outerR)
      .startAngle(startAngle)
      .endAngle(endAngle)
      .cornerRadius(4)

    svg.append('path')
      .attr('d', bgArc(null as unknown as d3.DefaultArcObject) ?? '')
      .attr('fill', '#1e2645')
      .attr('transform', `translate(${cx},${cy})`)

    // Color segments
    const segments = [
      { from: 0,   to: 0.7,  color: '#00ff88' },
      { from: 0.7, to: 0.9,  color: '#ffaa00' },
      { from: 0.9, to: 1.0,  color: '#ff3366' },
    ]

    segments.forEach(seg => {
      const segStart = startAngle + seg.from * (endAngle - startAngle)
      const segEnd   = startAngle + Math.min(seg.to, pct) * (endAngle - startAngle)
      if (segEnd <= segStart) return

      const arc = d3.arc<unknown>()
        .innerRadius(innerR)
        .outerRadius(outerR)
        .startAngle(segStart)
        .endAngle(segEnd)
        .cornerRadius(4)

      svg.append('path')
        .attr('d', arc(null as unknown as d3.DefaultArcObject) ?? '')
        .attr('fill', seg.color)
        .attr('transform', `translate(${cx},${cy})`)
        .attr('opacity', 0.9)
    })

    // Needle
    const needleAngle = startAngle + pct * (endAngle - startAngle)
    const needleLen = outerR - 6
    const nx = cx + needleLen * Math.sin(needleAngle)
    const ny = cy - needleLen * Math.cos(needleAngle)

    svg.append('line')
      .attr('x1', cx).attr('y1', cy)
      .attr('x2', nx).attr('y2', ny)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .attr('stroke-linecap', 'round')
      .attr('opacity', 0.9)

    svg.append('circle')
      .attr('cx', cx).attr('cy', cy)
      .attr('r', 5)
      .attr('fill', '#fff')

    // Cost text
    const color = pct < 0.7 ? '#00ff88' : pct < 0.9 ? '#ffaa00' : '#ff3366'
    svg.append('text')
      .attr('x', cx).attr('y', cy - 28)
      .attr('text-anchor', 'middle')
      .attr('font-size', '18')
      .attr('font-weight', 'bold')
      .attr('fill', color)
      .text(`$${spent.toFixed(4)}`)

    svg.append('text')
      .attr('x', cx).attr('y', cy - 12)
      .attr('text-anchor', 'middle')
      .attr('font-size', '10')
      .attr('fill', '#9ca3af')
      .text(`of $${limit.toFixed(2)} limit`)

    // Min / Max labels
    svg.append('text')
      .attr('x', cx - outerR + 4).attr('y', cy + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8')
      .attr('fill', '#6b7280')
      .text('$0')

    svg.append('text')
      .attr('x', cx + outerR - 4).attr('y', cy + 4)
      .attr('text-anchor', 'middle')
      .attr('font-size', '8')
      .attr('fill', '#6b7280')
      .text(`$${limit.toFixed(2)}`)

    // Percentage label
    svg.append('text')
      .attr('x', cx).attr('y', cy + 16)
      .attr('text-anchor', 'middle')
      .attr('font-size', '11')
      .attr('fill', color)
      .attr('font-weight', '600')
      .text(`${(pct * 100).toFixed(1)}%`)

  }, [spent, limit, pct])

  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-gray-400 mb-1 font-medium">{label}</div>
      <svg ref={svgRef} style={{ width: '100%', maxWidth: 220, height: 140 }} />
    </div>
  )
}
