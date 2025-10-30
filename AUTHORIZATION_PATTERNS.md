# Multi-Tenant Authorization Patterns

## Overview

This document explains how to implement role-based access control (RBAC) and multi-tenant data isolation using the `org_id` field and `userType` enum.

## User Types & Hierarchy

```
SUPER_ADMIN (Level 5)
    ↓
ADMIN (Level 4)
    ↓
INSTITUTE (Level 3) ← org_id = their own user ID
    ↓
MENTOR (Level 2) ← org_id = institute ID
    ↓
STUDENT (Level 1) ← org_id = institute ID OR NULL (independent)
```

## Authorization Middleware

### Extract User Context from JWT

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    // Attach user context to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      userType: decoded.userType,
      orgId: decoded.orgId, // Add this to JWT payload during login
    };

    next();
  });
}

module.exports = { authenticateToken };
```

### Role-Based Access Control (RBAC)

```javascript
// middleware/authorize.js
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.userType)) {
      return res.status(403).json({
        error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
}

// Usage in routes:
// app.get('/admin/users', authenticateToken, requireRole('ADMIN', 'SUPER_ADMIN'), getUsers);
// app.post('/mentor/assign', authenticateToken, requireRole('MENTOR', 'INSTITUTE'), assignStudent);

module.exports = { requireRole };
```

## Multi-Tenant Query Patterns

### Pattern 1: Student Queries (Own Data + Org Data)

```javascript
// Students can see:
// 1. Their own data
// 2. Org-wide data if they belong to an institute

async function getStudentTests(req, res) {
  const { userId, orgId } = req.user;

  const tests = await prisma.testAttempt.findMany({
    where: {
      OR: [
        { userId }, // Own tests
        { orgId: orgId || undefined }, // Org tests if enrolled
      ],
    },
  });

  res.json(tests);
}
```

### Pattern 2: Mentor Queries (Students in Same Org)

```javascript
// Mentors can see data for students in their organization

async function getMentorStudents(req, res) {
  const { userId, orgId, userType } = req.user;

  if (userType !== 'MENTOR') {
    return res.status(403).json({ error: 'Mentors only' });
  }

  if (!orgId) {
    return res.status(400).json({ error: 'Mentor must belong to an organization' });
  }

  const students = await prisma.user.findMany({
    where: {
      orgId, // Same organization
      userType: 'STUDENT',
      isActive: true,
    },
    include: {
      // Include related data
      testAttempts: true,
      analytics: true,
    },
  });

  res.json(students);
}
```

### Pattern 3: Institute Admin Queries (All Org Data)

```javascript
// Institute admins can see all data for their organization

async function getInstituteAnalytics(req, res) {
  const { userId, userType } = req.user;

  if (userType !== 'INSTITUTE') {
    return res.status(403).json({ error: 'Institute admins only' });
  }

  // For institutes, orgId = their own userId
  const orgId = userId;

  const analytics = await prisma.$queryRaw`
    SELECT
      COUNT(DISTINCT u.id) as total_students,
      COUNT(DISTINCT m.id) as total_mentors,
      COUNT(ta.id) as total_test_attempts,
      AVG(ta.score) as avg_score
    FROM auth.users u
    LEFT JOIN auth.users m ON m.org_id = ${orgId} AND m.user_type = 'MENTOR'
    LEFT JOIN tests.test_attempts ta ON ta.user_id = u.id
    WHERE u.org_id = ${orgId} AND u.user_type = 'STUDENT'
  `;

  res.json(analytics[0]);
}
```

### Pattern 4: Platform Admin Queries (Global Access)

```javascript
// Platform admins can see all data across all organizations

async function getGlobalStats(req, res) {
  const { userType } = req.user;

  if (!['ADMIN', 'SUPER_ADMIN'].includes(userType)) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const stats = await prisma.user.groupBy({
    by: ['userType', 'orgId'],
    _count: { id: true },
    where: { isActive: true },
  });

  res.json(stats);
}
```

## Common Authorization Scenarios

### Scenario 1: Creating a Student Account

```javascript
async function createStudent(req, res) {
  const { email, password, orgId } = req.body;
  const { userType, userId } = req.user;

  // Authorization logic:
  // 1. Anyone can create independent student (orgId = null)
  // 2. Institute admin can create student for their org
  // 3. Platform admin can create student for any org

  if (orgId) {
    // Enrolling in an organization
    if (userType === 'INSTITUTE') {
      // Institute can only enroll students in their own org
      if (orgId !== userId) {
        return res.status(403).json({
          error: 'Institutes can only enroll students in their own organization',
        });
      }
    } else if (!['ADMIN', 'SUPER_ADMIN'].includes(userType)) {
      return res.status(403).json({
        error: 'Only institute admins can enroll students',
      });
    }
  }

  // Create student
  const student = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash: await hashPassword(password),
      userType: 'STUDENT',
      orgId: orgId || null,
    },
  });

  res.status(201).json(student);
}
```

### Scenario 2: Assigning Mentor to Student

```javascript
async function assignMentor(req, res) {
  const { studentId, mentorId } = req.body;
  const { userType, userId, orgId } = req.user;

  // Fetch student and mentor
  const [student, mentor] = await Promise.all([
    prisma.user.findUnique({ where: { id: studentId } }),
    prisma.user.findUnique({ where: { id: mentorId } }),
  ]);

  // Validation
  if (!student || !mentor) {
    return res.status(404).json({ error: 'Student or mentor not found' });
  }

  if (mentor.userType !== 'MENTOR') {
    return res.status(400).json({ error: 'User is not a mentor' });
  }

  // Authorization: Same org only
  if (userType === 'INSTITUTE') {
    // Institute can only assign within their org
    if (student.orgId !== userId || mentor.orgId !== userId) {
      return res.status(403).json({
        error: 'Student and mentor must belong to your organization',
      });
    }
  } else if (userType === 'MENTOR') {
    // Mentor can only assign themselves
    if (mentorId !== userId || mentor.orgId !== student.orgId) {
      return res.status(403).json({
        error: 'Mentors can only assign themselves to students in their org',
      });
    }
  } else if (!['ADMIN', 'SUPER_ADMIN'].includes(userType)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  // Create assignment (in separate table - to be created)
  // This is just an example - you'd implement this in your tests/learning schema
  const assignment = await prisma.mentorAssignment.create({
    data: { studentId, mentorId, assignedAt: new Date() },
  });

  res.json(assignment);
}
```

### Scenario 3: Viewing Test Results

```javascript
async function getTestAttempt(req, res) {
  const { attemptId } = req.params;
  const { userId, userType, orgId } = req.user;

  const attempt = await prisma.testAttempt.findUnique({
    where: { id: attemptId },
    include: { user: true },
  });

  if (!attempt) {
    return res.status(404).json({ error: 'Test attempt not found' });
  }

  // Authorization matrix:
  const canView =
    // 1. Student viewing own attempt
    attempt.userId === userId ||
    // 2. Mentor viewing student in same org
    (userType === 'MENTOR' && attempt.user.orgId === orgId) ||
    // 3. Institute viewing student in their org
    (userType === 'INSTITUTE' && attempt.user.orgId === userId) ||
    // 4. Platform admin
    ['ADMIN', 'SUPER_ADMIN'].includes(userType);

  if (!canView) {
    return res.status(403).json({
      error: 'You do not have permission to view this test attempt',
    });
  }

  res.json(attempt);
}
```

## Helper Functions

### Check User Permissions

```javascript
// utils/permissions.js
function canAccessUser(requester, targetUserId, targetOrgId) {
  // Super admin can access anyone
  if (requester.userType === 'SUPER_ADMIN') return true;

  // Admin can access anyone
  if (requester.userType === 'ADMIN') return true;

  // Institute can access users in their org
  if (requester.userType === 'INSTITUTE') {
    return targetOrgId === requester.userId;
  }

  // Mentor can access students in same org
  if (requester.userType === 'MENTOR') {
    return targetOrgId === requester.orgId;
  }

  // Student can only access self
  if (requester.userType === 'STUDENT') {
    return targetUserId === requester.userId;
  }

  return false;
}

function isSameOrg(user1, user2) {
  return user1.orgId && user1.orgId === user2.orgId;
}

function isOrgAdmin(user, orgId) {
  return (
    user.userType === 'INSTITUTE' && user.userId === orgId ||
    ['ADMIN', 'SUPER_ADMIN'].includes(user.userType)
  );
}

module.exports = { canAccessUser, isSameOrg, isOrgAdmin };
```

## Prisma Client Extensions (Advanced)

### Add User Context to All Queries

```javascript
// lib/prisma-with-context.js
const { PrismaClient } = require('@prisma/client');

function createPrismaWithContext(userContext) {
  const prisma = new PrismaClient();

  // Automatically filter queries based on user context
  return prisma.$extends({
    query: {
      user: {
        async findMany({ args, query }) {
          // Apply tenant isolation for non-admins
          if (!['ADMIN', 'SUPER_ADMIN'].includes(userContext.userType)) {
            args.where = {
              ...args.where,
              OR: [
                { id: userContext.userId },
                { orgId: userContext.orgId },
              ],
            };
          }
          return query(args);
        },
      },
    },
  });
}

// Usage in request handler:
app.get('/users', authenticateToken, async (req, res) => {
  const prisma = createPrismaWithContext(req.user);
  const users = await prisma.user.findMany(); // Automatically filtered!
  res.json(users);
});
```

## Testing Authorization

```javascript
// tests/authorization.test.js
const request = require('supertest');
const app = require('../app');

describe('Authorization Tests', () => {
  let studentToken, mentorToken, instituteToken, adminToken;

  beforeAll(async () => {
    // Create test users and get tokens
    // ... setup code
  });

  test('Student cannot view other student data', async () => {
    const res = await request(app)
      .get('/api/users/other-student-id')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  test('Mentor can view students in same org', async () => {
    const res = await request(app)
      .get('/api/students')
      .set('Authorization', `Bearer ${mentorToken}`);

    expect(res.status).toBe(200);
    expect(res.body.every(s => s.orgId === mentorOrgId)).toBe(true);
  });

  test('Institute cannot view students from other org', async () => {
    const res = await request(app)
      .get('/api/users/student-from-different-org')
      .set('Authorization', `Bearer ${instituteToken}`);

    expect(res.status).toBe(403);
  });

  test('Admin can view all users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
  });
});
```

## Best Practices

1. **Always validate orgId consistency**
   - Before any data access, verify user's orgId matches target resource

2. **Use Prisma middleware for automatic filtering**
   - Implement query-level filters for tenant isolation

3. **Test authorization thoroughly**
   - Write tests for each user type × each resource combination

4. **Log authorization failures**
   - Track 403 errors for security monitoring

5. **Never trust client-sent orgId**
   - Always use orgId from JWT (server-verified)

6. **Handle independent users (orgId = null)**
   - Independent students should only see their own data

7. **Implement rate limiting per org**
   - Prevent abuse by limiting requests per organization

---

**Related Files:**
- `prisma/schema.prisma` - Database schema
- `AUTHENTICATION_SETUP.md` - Setup guide
- `middleware/auth.js` - Authentication middleware
- `middleware/authorize.js` - Authorization middleware

**Schema Version:** 1.0.0 (MVP)
**Last Updated:** 2025-10-29
