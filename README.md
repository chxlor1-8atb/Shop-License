# Web Development Project - ระบบจัดการใบอนุญาติร้านค้า

## 🎯 MANDATORY RULES: Full-Stack Parallel Execution

**ABSOLUTE RULE:** ALL operations MUST be concurrent/parallel in a SINGLE message:
- ✅ Frontend + Backend + Database simultaneously
- ✅ Multiple components in parallel
- ✅ API routes + Server functions together
- ✅ Tests generation in parallel
- ✅ Vercel configuration in parallel

---

## 🛠️ Technology Stack

### Frontend & Backend (Full-Stack Vercel)
- **Framework:** Next.js 15 + App Router + React Server Components
- **Language:** TypeScript 5.4
- **Styling:** Tailwind CSS 3.4 + shadcn/ui
- **State:** React Context + Server Actions
- **Database:** Vercel Postgres (Neon) + Drizzle ORM
- **Auth:** NextAuth.js v5 (Auth.js)
- **File Storage:** Vercel Blob
- **Analytics:** Vercel Analytics + Speed Insights
- **AI Integration:** Vercel AI SDK (for Gemini/Claude integration)

### Development Tools
- **IDE:** Google Antigravity (Gemini 3 + Claude Sonnet 4.5)
- **Package Manager:** pnpm (faster than npm)
- **Deployment:** Vercel (auto-deploy from Git)
- **Preview:** Vercel Preview Deployments
- **Monitoring:** Vercel Logs + Real User Monitoring

---

## 📁 Project Structure (Next.js App Router)

```
project/
├── app/                       # Next.js App Router
│   ├── (auth)/               # Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/          # Protected routes
│   │   ├── layout.tsx        # Dashboard layout
│   │   └── page.tsx          # Dashboard home
│   ├── api/                  # API Routes (Vercel Functions)
│   │   ├── auth/[...nextauth]/
│   │   └── users/
│   ├── layout.tsx            # Root layout
│   ├── page.tsx              # Home page
│   └── globals.css           # Global styles
│
├── components/               # React Components
│   ├── ui/                   # shadcn/ui components
│   ├── features/             # Feature-specific components
│   └── shared/               # Shared components
│
├── lib/                      # Utilities & Configs
│   ├── db/                   # Database client & schema
│   │   ├── schema.ts         # Drizzle schema
│   │   └── index.ts          # DB client
│   ├── actions/              # Server Actions
│   ├── auth.ts               # NextAuth config
│   └── utils.ts              # Helper functions
│
├── public/                   # Static assets
├── tests/                    # Tests (Jest + Playwright)
│   ├── unit/
│   └── e2e/
│
├── .env.local                # Local environment variables
├── next.config.ts            # Next.js config
├── tailwind.config.ts        # Tailwind config
├── drizzle.config.ts         # Drizzle config
└── vercel.json               # Vercel deployment config
```

---

## 🚀 Development Commands

```bash
# Development
pnpm dev                 # Start dev server (port 3000)
pnpm build              # Production build (Vercel optimized)
pnpm start              # Start production server locally
pnpm lint               # ESLint check
pnpm format             # Prettier format

# Database (Drizzle)
pnpm db:push            # Push schema to database
pnpm db:studio          # Open Drizzle Studio (like Prisma Studio)
pnpm db:generate        # Generate migrations
pnpm db:migrate         # Run migrations

# Testing
pnpm test               # Run all tests
pnpm test:unit          # Unit tests (Jest)
pnpm test:e2e           # E2E tests (Playwright)
pnpm test:watch         # Watch mode

# Vercel
pnpm vercel             # Deploy to preview
pnpm vercel --prod      # Deploy to production
pnpm vercel env pull    # Pull environment variables
```

---

## 📝 Code Standards & Conventions

### File Naming Conventions
- **Pages:** `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`
- **Components:** PascalCase → `UserProfile.tsx`
- **Server Actions:** camelCase → `createUser.ts`
- **API Routes:** kebab-case → `route.ts` in `/api/users/route.ts`

### Next.js App Router Patterns

#### Server Component (Default)
```typescript
// app/dashboard/page.tsx
import { getUsers } from '@/lib/actions/users';

export default async function DashboardPage() {
  const users = await getUsers(); // Direct DB query, no API call
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <UserList users={users} />
    </div>
  );
}
```

#### Client Component
```typescript
// components/features/UserForm.tsx
'use client';

import { useState } from 'react';
import { createUser } from '@/lib/actions/users';
import { Button } from '@/components/ui/button';

export function UserForm() {
  const [loading, setLoading] = useState(false);
  
  async function handleSubmit(formData: FormData) {
    setLoading(true);
    await createUser(formData); // Call server action
    setLoading(false);
  }
  
  return (
    <form action={handleSubmit}>
      <input name="name" required />
      <Button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create User'}
      </Button>
    </form>
  );
}
```

#### Server Action
```typescript
// lib/actions/users.ts
'use server';

import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { revalidatePath } from 'next/cache';

export async function createUser(formData: FormData) {
  const name = formData.get('name') as string;
  
  await db.insert(users).values({ name });
  
  revalidatePath('/dashboard'); // Refresh cache
  
  return { success: true };
}
```

#### API Route (Vercel Function)
```typescript
// app/api/users/route.ts
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';

export async function GET() {
  const allUsers = await db.select().from(users);
  
  return NextResponse.json({
    success: true,
    data: allUsers
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  
  const newUser = await db.insert(users).values(body).returning();
  
  return NextResponse.json({
    success: true,
    data: newUser[0]
  }, { status: 201 });
}
```

---

## 🗄️ Database Configuration (Vercel Postgres + Drizzle)

### Schema Definition
```typescript
// lib/db/schema.ts
import { pgTable, serial, varchar, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').defaultNow()
});
```

### Database Client
```typescript
// lib/db/index.ts
import { drizzle } from 'drizzle-orm/vercel-postgres';
import { sql } from '@vercel/postgres';
import * as schema from './schema';

export const db = drizzle(sql, { schema });
```

### Environment Variables (.env.local)
```bash
# Vercel Postgres
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"

# OAuth (optional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

---

## 🔐 Authentication (NextAuth.js v5)

### Auth Configuration
```typescript
// lib/auth.ts
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
```

### Protected Route
```typescript
// app/dashboard/page.tsx
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }
  
  return <div>Welcome, {session.user.name}!</div>;
}
```

---

## 🎨 UI/UX Guidelines (Tailwind + shadcn/ui)

### Design System
- **Colors:** Use CSS variables from `globals.css`
- **Components:** shadcn/ui as base, customize with Tailwind
- **Icons:** lucide-react (built into shadcn/ui)
- **Fonts:** Geist Sans + Geist Mono (Vercel's fonts)

### Example Component
```typescript
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StatsCard({ title, value }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
      </CardContent>
    </Card>
  );
}
```

### Responsive Design
- Mobile-first with Tailwind breakpoints
- Test at: 375px (mobile), 768px (tablet), 1440px (desktop)
- Use `md:`, `lg:`, `xl:` prefixes

---

## 🧪 Testing Strategy

### Unit Tests (Jest + React Testing Library)
```typescript
// tests/unit/UserForm.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { UserForm } from '@/components/features/UserForm';

describe('UserForm', () => {
  it('should submit form data', async () => {
    render(<UserForm />);
    
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'John' } });
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    // Assert submission
  });
});
```

### E2E Tests (Playwright)
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test('user can login', async ({ page }) => {
  await page.goto('/login');
  
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  
  await expect(page).toHaveURL('/dashboard');
});
```

---

## 🚀 Vercel Deployment Configuration

### vercel.json
```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["sin1"],
  "functions": {
    "app/api/**/*.ts": {
      "memory": 1024,
      "maxDuration": 10
    }
  },
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "/api/:path*"
    }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

### next.config.ts
```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default config;
```

---

## 🤖 Antigravity-Specific Instructions

### For AI Agents (Gemini 3 + Claude Sonnet 4.5):

#### 1. **Read This File First**
- Understand Next.js App Router patterns
- Know the difference between Server/Client components
- Follow Vercel deployment best practices

#### 2. **Parallel Execution Pattern**
When creating a feature, execute ALL in ONE message:

```typescript
// Example: "Create blog post feature"

[Parallel Execution - Single Message]:

// 1. Database Schema
- Write("lib/db/schema.ts", addPostsTable)

// 2. Server Actions
- Write("lib/actions/posts.ts", createPost + getPosts + deletePost)

// 3. Pages (Server Components)
- Write("app/blog/page.tsx", blogListingPage)
- Write("app/blog/[slug]/page.tsx", blogDetailPage)

// 4. Components (Client Components)
- Write("components/features/PostForm.tsx", postFormComponent)
- Write("components/features/PostCard.tsx", postCardComponent)

// 5. API Routes (if needed for external access)
- Write("app/api/posts/route.ts", postsAPIRoute)

// 6. Tests
- Write("tests/unit/PostForm.test.tsx", unitTests)
- Write("tests/e2e/blog.spec.ts", e2eTests)

// 7. Types
- Write("types/post.ts", postTypes)
```

#### 3. **Use Browser Agent for Testing**
After creating UI components:
- Take screenshots at different breakpoints
- Test form interactions
- Verify responsive design
- Check dark mode (if enabled)

#### 4. **Vercel Preview Deployment**
After code changes:
```bash
# Agent should suggest:
"Run: pnpm vercel
Preview URL will be generated for testing before production"
```

---

## 📊 Performance Best Practices

### Next.js Optimizations
- ✅ Use Server Components by default (faster, smaller bundle)
- ✅ Add `loading.tsx` for instant loading states
- ✅ Use `next/image` for automatic image optimization
- ✅ Enable ISR (Incremental Static Regeneration) where possible
- ✅ Use Route Handlers for API endpoints
- ✅ Implement `error.tsx` for graceful error handling

### Vercel-Specific
- ✅ Edge Functions for low-latency responses
- ✅ Vercel KV (Redis) for caching
- ✅ Vercel Blob for file uploads
- ✅ Edge Config for feature flags

### Code Splitting
```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/HeavyChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false, // Client-side only
});
```

---

## 🔒 Security Checklist

### Environment Variables
- ✅ Never commit `.env.local`
- ✅ Use Vercel Dashboard for production secrets
- ✅ Prefix client-side vars with `NEXT_PUBLIC_`

### API Security
- ✅ Validate all inputs with Zod
- ✅ Use CSRF tokens (built into NextAuth)
- ✅ Rate limiting (Vercel Edge Middleware)
- ✅ CORS configuration in headers

### Authentication
- ✅ HTTP-only cookies for tokens
- ✅ Secure session management via NextAuth
- ✅ Role-based access control

---

## 🎯 Development Workflow

### Feature Development Checklist
- [ ] Create database schema (if needed)
- [ ] Write server actions
- [ ] Build server components (pages)
- [ ] Add client components (interactive parts)
- [ ] Create API routes (if external access needed)
- [ ] Write unit tests
- [ ] Write E2E tests
- [ ] Test with Antigravity Browser Agent
- [ ] Deploy to Vercel Preview
- [ ] Review preview deployment
- [ ] Merge to main → Auto-deploy to production

### Git Workflow
```bash
# Branch naming
feature/user-authentication
fix/login-redirect
refactor/api-structure

# Commit messages (Conventional Commits)
feat: add user profile page
fix: resolve database connection timeout
perf: optimize image loading
```

---

## 📚 Key Resources

### Documentation
- **Next.js:** https://nextjs.org/docs
- **Vercel:** https://vercel.com/docs
- **Drizzle ORM:** https://orm.drizzle.team
- **NextAuth.js:** https://authjs.dev
- **shadcn/ui:** https://ui.shadcn.com
- **Tailwind CSS:** https://tailwindcss.com

### Antigravity Integration
- Use **Gemini 3** for code generation
- Use **Claude Sonnet 4.5** for complex logic
- Use **Browser Agent** for UI testing
- Use **Terminal Agent** for running commands

---

## 🎯 Success Metrics

### Development
- Feature completion: 60% faster with parallel execution
- Zero manual configuration (Vercel handles it)
- Instant preview deployments

### Performance
- First Contentful Paint: < 1.2s
- Time to Interactive: < 2.5s
- Lighthouse Score: > 95
- Core Web Vitals: All green

### Deployment
- Build time: < 2 minutes
- Deploy time: < 30 seconds
- Zero-downtime deployments
- Automatic rollbacks on error

---

## 💡 Pro Tips

### 1. Use Server Components First
```typescript
// ✅ GOOD: Server Component (default)
async function UserList() {
  const users = await db.select().from(users);
  return <div>{users.map(...)}</div>;
}

// ❌ AVOID: Client Component for static data
'use client';
function UserList() {
  const [users, setUsers] = useState([]);
  useEffect(() => { fetchUsers(); }, []);
  // ...unnecessary client-side fetching
}
```

### 2. Optimize Images
```typescript
import Image from 'next/image';

// ✅ GOOD: Next.js Image
<Image 
  src="/hero.jpg" 
  alt="Hero" 
  width={1200} 
  height={600}
  priority // LCP optimization
/>

// ❌ AVOID: Regular img tag
<img src="/hero.jpg" alt="Hero" />
```

### 3. Use Server Actions for Mutations
```typescript
// ✅ GOOD: Server Action
'use server';
export async function createPost(formData: FormData) {
  await db.insert(posts).values({...});
  revalidatePath('/blog');
}

// ❌ AVOID: API Route for simple mutations
// No need for /api/posts route when Server Actions work
```

---

**Last Updated:** 2026-01-02
**Platform:** Antigravity IDE + Vercel
**Version:** 1.0.0
**Maintainer:** [chaiwat]
