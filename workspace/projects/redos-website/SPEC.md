# RedOS Company Website Specification

## Project Overview
RedOS is an AI-powered development company that operates at scale. This website will serve as the public face of RedOS, showcasing our capabilities, team, and projects to potential clients and partners.

## Technical Stack
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS
- **Deployment:** Vercel (CI/CD pipeline)
- **Type Checking:** TypeScript
- **Animations:** Framer Motion
- **Icons:** Lucide React

## Pages & Structure

### 1. Homepage (`/`)
**Hero Section:**
- Title: "AI-Powered Development at Scale"
- Subtitle: "RedOS delivers intelligent, scalable software solutions powered by cutting-edge AI technology."
- Call-to-Action: "Explore Our Work" button
- Background: Dynamic gradient with subtle animations

**Projects Showcase:**
- Grid layout of recent projects
- Each project card includes: name, tech stack, brief description, and "View Details" link
- Filterable by technology/industry

**Team Section:**
- Grid of 8 team members (our AI agents)
- Each agent card includes: name, role, expertise area, and GitHub profile link
- Hover effects with additional info

**GitHub Integration:**
- "View on GitHub" button linking to RedOS GitHub organization
- Live stats: stars, forks, recent commits
- Featured repositories carousel

**Contact Section:**
- Simple contact form
- Social media links
- Company information

### 2. Projects Page (`/projects`)
- Detailed project listings
- Advanced filtering and search
- Project case studies with metrics

### 3. Team Page (`/team`)
- Individual agent profiles
- Expertise matrices
- Collaboration examples

### 4. About Page (`/about`)
- Company mission and values
- Technology philosophy
- Client testimonials (when available)

## Design System

### Color Palette
- Primary: #6366f1 (Purple)
- Secondary: #22d3ee (Cyan)
- Accent: #ec4899 (Pink)
- Background: #0f172a (Dark Blue)
- Text: #f1f5f9 (Light Gray)

### Typography
- Headings: Inter (Google Fonts)
- Body: Inter
- Code: JetBrains Mono

### Components
- Navigation: Sticky header with mobile menu
- Buttons: Primary, Secondary, Ghost variants
- Cards: Project and team member cards with hover states
- Forms: Accessible form components
- Loading states: Skeleton loaders

## Content Requirements

### Hero Section Content
```
Title: AI-Powered Development at Scale
Subtitle: RedOS delivers intelligent, scalable software solutions powered by cutting-edge AI technology.
CTA: Explore Our Work
```

### Team Members (8 AI Agents)
1. **OPS** - System Operations & DevOps
2. **ENG** - Software Engineering & Development
3. **ZEN** - Research & Analysis
4. **FINANCE** - Financial Operations
5. **INFOSEC** - Security & Compliance
6. **RESEARCH** - Deep Technology Research
7. **DESIGN** - User Experience & Interface
8. **DATA** - Data Science & Analytics

### GitHub Integration
- Link: `https://github.com/redos-company`
- Display: Repository stats, recent activity
- Featured repos: Core projects, frameworks, tools

## Development Guidelines

### Code Standards
- ESLint configuration with Prettier
- TypeScript strict mode enabled
- Component naming: PascalCase for components, camelCase for hooks
- CSS: Utility-first with Tailwind, custom classes prefixed with `rs-`

### Performance
- Image optimization with Next.js Image component
- Lazy loading for below-fold content
- Code splitting by route
- PWA capabilities (optional)

### SEO
- Meta tags for all pages
- Open Graph and Twitter Card support
- Structured data for projects and team
- Sitemap generation

### Accessibility
- WCAG 2.1 AA compliance
- Keyboard navigation support
- Screen reader compatibility
- High contrast mode support

## Deployment Configuration

### Vercel Setup
- Automatic deployments from main branch
- Preview deployments for pull requests
- Environment variables: production vs staging
- Custom domain: `redos.company` or `redos.dev`

### CI/CD Pipeline
- Automated testing on pull requests
- Lighthouse performance checks
- Accessibility audits
- Security scanning

## Success Metrics

### User Engagement
- Time on site
- Pages per session
- Contact form submissions
- GitHub click-through rate

### Performance
- Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1)
- Page load speed < 3s
- Mobile performance score > 90

### Conversion
- Contact form completion rate
- GitHub profile visits
- Project exploration depth

## Timeline

### Phase 1: Foundation (Week 1)
- Project setup with Next.js + TypeScript
- Basic routing and layout
- Hero section implementation

### Phase 2: Content (Week 2)
- Projects showcase
- Team section
- GitHub integration

### Phase 3: Polish (Week 3)
- Animations and interactions
- Responsive design refinement
- Performance optimization

### Phase 4: Launch (Week 4)
- SEO and accessibility final checks
- Deployment to Vercel
- Monitoring setup

## Maintenance

### Regular Updates
- Project showcase updates
- Team member highlights
- Blog/news section (future phase)
- Performance monitoring

### Content Management
- Simple markdown-based content system
- GitHub Actions for content updates
- Version-controlled content changes

---

**Note:** This specification will serve as the foundation for development. As the project progresses, this document should be updated to reflect actual implementation decisions and any deviations from the original plan.