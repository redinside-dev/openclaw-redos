import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

interface AgentCost {
  name: string
  cost: number
}

interface CostByAgentProps {
  data: AgentCost[]
}

export default function CostByAgent({ data }: CostByAgentProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  const sorted = [...data].sort((a, b) => b.cost - a.cost)

  useEffect(() => {
    if (!svgRef.current || sorted.length === 0) return
    const el = svgRef.current
    d3.select(el).selectAll('*').remove()

    const margin = { top: 8, right: 70, bottom: 8, left: 72 }
    const rowH = 26
    const W = 320
    const H = Math.max(sorted.length * rowH + margin.top + margin.bottom, 60)

    const svg = d3.select(el)
      .attr('viewBox', `0 0 ${W} ${H}`)
      .attr('width', '100%')

    const innerW = W - margin.left - margin.right
    const innerH = H - margin.top - margin.bottom

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`)

    const maxVal = d3.max(sorted, d => d.cost) ?? 1

    const x = d3.scaleLinear().domain([0, maxVal]).range([0, innerW])
    const y = d3.scaleBand()
      .domain(sorted.map(d => d.name))
      .range([0, innerH])
      .padding(0.25)

    // Bars
    g.selectAll('rect.bar')
      .data(sorted)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => y(d.name) ?? 0)
      .attr('width', d => x(d.cost))
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', '#00d4ff')
      .attr('opacity', 0.85)

    // Agent name labels
    g.selectAll('text.label')
      .data(sorted)
      .join('text')
      .attr('class', 'label')
      .attr('x', -6)
      .attr('y', d => (y(d.name) ?? 0) + y.bandwidth() / 2 + 1)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '10')
      .attr('fill', '#9ca3af')
      .text(d => d.name)

    // Cost value labels
    g.selectAll('text.value')
      .data(sorted)
      .join('text')
      .attr('class', 'value')
      .attr('x', d => x(d.cost) + 4)
      .attr('y', d => (y(d.name) ?? 0) + y.bandwidth() / 2 + 1)
      .attr('dominant-baseline', 'middle')
      .attr('font-size', '9')
      .attr('fill', '#00d4ff')
      .attr('font-weight', '600')
      .text(d => `$${d.cost.toFixed(4)}`)

  }, [sorted])

  return (
    <svg ref={svgRef} style={{ width: '100%', maxWidth: 340 }} />
  )
}
