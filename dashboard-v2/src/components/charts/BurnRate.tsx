import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

interface DailyBurn {
  date: string
  cost_usd: number
}

interface BurnRateProps {
  data: DailyBurn[]
  targetUsd?: number
}

export default function BurnRate({ data, targetUsd = 1.0 }: BurnRateProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return
    const el = svgRef.current
    d3.select(el).selectAll('*').remove()

    const margin = { top: 16, right: 20, bottom: 36, left: 52 }
    const W = 460
    const H = 200

    const svg = d3.select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')

    const innerW = W - margin.left - margin.right
    const innerH = H - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    if (!data || data.length === 0) {
      g.append('text')
        .attr('x', innerW / 2).attr('y', innerH / 2)
        .attr('text-anchor', 'middle')
        .attr('fill', '#4b5563')
        .attr('font-size', '12')
        .text('No burn rate data')
      return
    }

    const parsed = data.map(d => ({
      date: new Date(d.date),
      cost: d.cost_usd,
    })).sort((a, b) => a.date.getTime() - b.date.getTime())

    const x = d3.scaleTime()
      .domain(d3.extent(parsed, d => d.date) as [Date, Date])
      .range([0, innerW])

    const maxCost = Math.max(d3.max(parsed, d => d.cost) ?? 0, targetUsd * 1.2)
    const y = d3.scaleLinear()
      .domain([0, maxCost])
      .nice()
      .range([innerH, 0])

    // Grid lines
    g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(() => ''))
      .call(g2 => g2.select('.domain').remove())
      .call(g2 => g2.selectAll('.tick line')
        .attr('stroke', '#1e2645')
        .attr('stroke-dasharray', '4,4'))

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat('%m/%d') as (d: Date | d3.NumberValue) => string))
      .call(g2 => g2.select('.domain').attr('stroke', '#1e2645'))
      .call(g2 => g2.selectAll('.tick line').attr('stroke', '#1e2645'))
      .call(g2 => g2.selectAll('.tick text').attr('fill', '#6b7280').attr('font-size', '9'))

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat(d => `$${(d as number).toFixed(2)}`))
      .call(g2 => g2.select('.domain').attr('stroke', '#1e2645'))
      .call(g2 => g2.selectAll('.tick line').attr('stroke', '#1e2645'))
      .call(g2 => g2.selectAll('.tick text').attr('fill', '#6b7280').attr('font-size', '9'))

    // Target line
    if (targetUsd > 0) {
      g.append('line')
        .attr('x1', 0).attr('x2', innerW)
        .attr('y1', y(targetUsd)).attr('y2', y(targetUsd))
        .attr('stroke', '#ff3366')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.8)

      g.append('text')
        .attr('x', innerW + 2).attr('y', y(targetUsd) + 4)
        .attr('font-size', '9')
        .attr('fill', '#ff3366')
        .text(`$${targetUsd}`)
    }

    // Area
    const area = d3.area<{ date: Date; cost: number }>()
      .x(d => x(d.date))
      .y0(innerH)
      .y1(d => y(d.cost))
      .curve(d3.curveMonotoneX)

    // Gradient
    const gradId = 'burnGrad'
    const defs = svg.append('defs')
    const grad = defs.append('linearGradient')
      .attr('id', gradId)
      .attr('x1', '0').attr('y1', '0')
      .attr('x2', '0').attr('y2', '1')

    grad.append('stop').attr('offset', '0%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.3)
    grad.append('stop').attr('offset', '100%').attr('stop-color', '#00d4ff').attr('stop-opacity', 0.02)

    g.append('path')
      .datum(parsed)
      .attr('d', area)
      .attr('fill', `url(#${gradId})`)

    // Line
    const line = d3.line<{ date: Date; cost: number }>()
      .x(d => x(d.date))
      .y(d => y(d.cost))
      .curve(d3.curveMonotoneX)

    g.append('path')
      .datum(parsed)
      .attr('d', line)
      .attr('fill', 'none')
      .attr('stroke', '#00d4ff')
      .attr('stroke-width', 2)
      .attr('opacity', 0.9)

    // Dots for last point
    const last = parsed[parsed.length - 1]
    if (last) {
      g.append('circle')
        .attr('cx', x(last.date)).attr('cy', y(last.cost))
        .attr('r', 4)
        .attr('fill', '#00d4ff')
        .attr('stroke', '#0a0e1a')
        .attr('stroke-width', 2)
    }

  }, [data, targetUsd])

  return (
    <svg ref={svgRef} style={{ width: '100%', maxWidth: 480, height: 200 }} />
  )
}
