# Redos Website Specification

## Overview
Modern AI-powered development company website built with Next.js and deployed on Vercel. Showcases our 8-agent team and development capabilities.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Performance**: Image optimization, static generation where possible
- **SEO**: Meta tags, structured data

## Pages

### 1. Home (`/`)
**Hero Section**: "AI-Powered Development at Scale"
- Compelling headline
- Brief description of services
- Call-to-action buttons

**Projects Showcase**:
- Grid of recent projects
- Each project: title, tech stack, brief description
- Filterable by technology/industry

**Team Section**:
- 8 agent cards
- Each card: name, role, avatar, skills
- Brief description of team capabilities

**GitHub Integration**:
- Link to company GitHub repository
- Recent commits/updates
- Open source contributions

### 2. About (`/about`)
- Company story
- Mission and values
- Team bios with photos

### 3. Projects (`/projects`)
- Detailed project portfolio
- Case studies
- Client testimonials

### 4. Contact (`/contact`)
- Contact form
- Team contact info
- Office locations

## Design System

### Color Palette
- Primary: Blue (#3B82F6)
- Secondary: Purple (#8B5CF6)
- Accent: Green (#10B981)
- Neutral: Gray scale (#F3F4F6, #6B7280, #111827)

### Typography
- Headings: Inter (bold)
- Body: Inter (regular)
- Code: JetBrains Mono

### Components
- Navigation header with logo
- Hero section with gradient background
- Project cards with hover effects
- Team member cards with hover animations
- Responsive grid layouts
- Smooth scroll animations

## Content Requirements

### Hero Text
"AI-Powered Development at Scale"

### Team Members (8 agents)
1. **Agent Name** - Role - Key Skills
2. **Agent Name** - Role - Key Skills
3. **Agent Name** - Role - Key Skills
4. **Agent Name** - Role - Key Skills
5. **Agent Name** - Role - Key Skills
6. **Agent Name** - Role - Key Skills
7. **Agent Name** - Role - Key Skills
8. **Agent Name** - Role - Key Skills

### GitHub Integration
- Repository link: `https://github.com/redos-company`
- Recent activity feed
- Star count display

## Development Guidelines

### File Structure
```
redos-website/
├── app/
│   ├── (app router files)
├── components/
├── lib/
├── public/
└── types/
```

### Performance Targets
- **Lighthouse Score**: 90+ across all metrics
- **Page Load Time**: <2 seconds
- **First Contentful Paint**: <1.5 seconds
- **Accessibility**: WCAG 2.1 AA compliance

### SEO Requirements
- Meta tags for all pages
- Open Graph images
- Structured data for projects
- Sitemap generation
- Robots.txt configuration

## Deployment

### Vercel Configuration
- Environment variables for API keys
- Custom domain setup
- SSL certificates
- Build optimization settings

### CI/CD Pipeline
- Automatic deployments on push to main
- Preview deployments for pull requests
- Automated testing

## Timeline

### Phase 1: Foundation (Week 1)
- Project setup
- Basic layout
- Navigation
- Hero section

### Phase 2: Content (Week 2)
- Team section
- Projects showcase
- About page

### Phase 3: Polish (Week 3)
- Styling refinements
- Animations
- Responsive design
- Performance optimization

### Phase 4: Launch (Week 4)
- Final testing
- SEO optimization
- Deployment
- Monitoring setup

## Success Metrics
- Page load speed
- User engagement
- Lead generation
- Search engine rankings
- Mobile responsiveness