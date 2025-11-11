@echo off
echo ==========================================
echo Creating COMPLETE preptor_backend structure
echo ==========================================
echo.

REM ===== Main Directories =====
mkdir src
mkdir prisma
mkdir prisma\migrations
mkdir tests
mkdir tests\unit
mkdir tests\integration
mkdir tests\e2e
mkdir docs

REM ===== Config Files =====
mkdir src\config
type nul > src\config\database.js
type nul > src\config\jwt.js
type nul > src\config\roles.js
type nul > src\config\permissions.js
type nul > src\config\index.js

REM ===== Shared Middleware =====
mkdir src\shared
mkdir src\shared\middleware
type nul > src\shared\middleware\auth.js
type nul > src\shared\middleware\rbac.js
type nul > src\shared\middleware\tenant.js
type nul > src\shared\middleware\validator.js
type nul > src\shared\middleware\errorHandler.js
type nul > src\shared\middleware\index.js

REM ===== Shared Utils =====
mkdir src\shared\utils
type nul > src\shared\utils\response.js
type nul > src\shared\utils\errors.js
type nul > src\shared\utils\context.js
type nul > src\shared\utils\index.js

REM ===== Shared Constants =====
mkdir src\shared\constants
type nul > src\shared\constants\roles.js
type nul > src\shared\constants\permissions.js
type nul > src\shared\constants\index.js

REM ===== Modules Directory =====
mkdir src\modules

REM ===== Auth Module =====
mkdir src\modules\auth
type nul > src\modules\auth\auth.routes.js
type nul > src\modules\auth\auth.controller.js
type nul > src\modules\auth\auth.service.js
type nul > src\modules\auth\auth.repository.js
type nul > src\modules\auth\index.js

REM ===== User Module =====
mkdir src\modules\user
type nul > src\modules\user\user.routes.js
type nul > src\modules\user\user.controller.js
type nul > src\modules\user\user.service.js
type nul > src\modules\user\user.repository.js
type nul > src\modules\user\index.js

REM ===== Content Module =====
mkdir src\modules\content
type nul > src\modules\content\content.routes.js
type nul > src\modules\content\content.controller.js
type nul > src\modules\content\content.service.js
type nul > src\modules\content\content.repository.js
type nul > src\modules\content\index.js

REM ===== Test Module =====
mkdir src\modules\test
type nul > src\modules\test\test.routes.js
type nul > src\modules\test\test.controller.js
type nul > src\modules\test\test.service.js
type nul > src\modules\test\test.repository.js
type nul > src\modules\test\index.js

REM ===== Planner Module =====
mkdir src\modules\planner
type nul > src\modules\planner\planner.routes.js
type nul > src\modules\planner\planner.controller.js
type nul > src\modules\planner\planner.service.js
type nul > src\modules\planner\planner.repository.js
type nul > src\modules\planner\index.js

REM ===== Analytics Module =====
mkdir src\modules\analytics
type nul > src\modules\analytics\analytics.routes.js
type nul > src\modules\analytics\analytics.controller.js
type nul > src\modules\analytics\analytics.service.js
type nul > src\modules\analytics\analytics.repository.js
type nul > src\modules\analytics\index.js

REM ===== Payment Module =====
mkdir src\modules\payment
type nul > src\modules\payment\payment.routes.js
type nul > src\modules\payment\payment.controller.js
type nul > src\modules\payment\payment.service.js
type nul > src\modules\payment\payment.repository.js
type nul > src\modules\payment\index.js

REM ===== Notification Module =====
mkdir src\modules\notification
type nul > src\modules\notification\notification.routes.js
type nul > src\modules\notification\notification.controller.js
type nul > src\modules\notification\notification.service.js
type nul > src\modules\notification\notification.repository.js
type nul > src\modules\notification\index.js

REM ===== Institute Module =====
mkdir src\modules\institute
type nul > src\modules\institute\institute.routes.js
type nul > src\modules\institute\institute.controller.js
type nul > src\modules\institute\institute.service.js
type nul > src\modules\institute\institute.repository.js
type nul > src\modules\institute\index.js

REM ===== Mentor Module =====
mkdir src\modules\mentor
type nul > src\modules\mentor\mentor.routes.js
type nul > src\modules\mentor\mentor.controller.js
type nul > src\modules\mentor\mentor.service.js
type nul > src\modules\mentor\mentor.repository.js
type nul > src\modules\mentor\index.js

REM ===== Admin Module =====
mkdir src\modules\admin
type nul > src\modules\admin\admin.routes.js
type nul > src\modules\admin\admin.controller.js
type nul > src\modules\admin\admin.service.js
type nul > src\modules\admin\admin.repository.js
type nul > src\modules\admin\index.js

REM ===== AI Integration Module =====
mkdir src\modules\ai-integration
type nul > src\modules\ai-integration\ai.routes.js
type nul > src\modules\ai-integration\ai.controller.js
type nul > src\modules\ai-integration\ai.service.js
type nul > src\modules\ai-integration\ai.repository.js
type nul > src\modules\ai-integration\index.js

REM ===== Main App Files =====
type nul > src\app.js
type nul > src\server.js

REM ===== Prisma Files =====
type nul > prisma\schema.prisma

REM ===== Root Files =====
type nul > .env
type nul > .env.example
type nul > .gitignore
type nul > README.md

echo.
echo ==========================================
echo ✓ STRUCTURE CREATED SUCCESSFULLY!
echo ==========================================
echo.
echo Created:
echo   - src/config (5 files)
echo   - src/shared/middleware (6 files)
echo   - src/shared/utils (4 files)
echo   - src/shared/constants (3 files)
echo   - src/modules/auth (5 files)
echo   - src/modules/user (5 files)
echo   - src/modules/content (5 files)
echo   - src/modules/test (5 files)
echo   - src/modules/planner (5 files)
echo   - src/modules/analytics (5 files)
echo   - src/modules/payment (5 files)
echo   - src/modules/notification (5 files)
echo   - src/modules/institute (5 files)
echo   - src/modules/mentor (5 files)
echo   - src/modules/admin (5 files)
echo   - src/modules/ai-integration (5 files)
echo   - prisma/schema.prisma
echo   - src/app.js and src/server.js
echo   - Root files (.env, .env.example, .gitignore, README.md)
echo.
echo Total: 12 modules x 5 files = 60+ files created!
echo.
echo Next steps:
echo   1. Run: npm install (install dependencies)
echo   2. Fill in .env file
echo   3. Start coding in src/modules/auth first!
echo.
pause
```

---

## 📂 **WHERE TO SAVE THIS FILE**

**Save as:** `create-structure.bat`

**Location:** `D:\preptor_backend\create-structure.bat`
```
D:\preptor_backend\
├── node_modules\         (already exists)
├── package.json          (already exists)
├── package-lock.json     (already exists)
└── create-structure.bat  ← SAVE HERE
```

---

## ▶️ **HOW TO RUN**

1. **Navigate to:** `D:\preptor_backend`
2. **Double-click:** `create-structure.bat`
3. **Wait:** 2-3 seconds
4. **Done!** All files and folders created

---

## ✅ **WHAT IT CREATES**
```
D:\preptor_backend\
├── src\
│   ├── config\
│   │   ├── database.js
│   │   ├── jwt.js
│   │   ├── roles.js
│   │   ├── permissions.js
│   │   └── index.js
│   │
│   ├── shared\
│   │   ├── middleware\
│   │   │   ├── auth.js
│   │   │   ├── rbac.js
│   │   │   ├── tenant.js
│   │   │   ├── validator.js
│   │   │   ├── errorHandler.js
│   │   │   └── index.js
│   │   │
│   │   ├── utils\
│   │   │   ├── response.js
│   │   │   ├── errors.js
│   │   │   ├── context.js
│   │   │   └── index.js
│   │   │
│   │   └── constants\
│   │       ├── roles.js
│   │       ├── permissions.js
│   │       └── index.js
│   │
│   ├── modules\
│   │   ├── auth\
│   │   │   ├── auth.routes.js
│   │   │   ├── auth.controller.js
│   │   │   ├── auth.service.js
│   │   │   ├── auth.repository.js
│   │   │   └── index.js
│   │   │
│   │   ├── user\ (5 files)
│   │   ├── content\ (5 files)
│   │   ├── test\ (5 files)
│   │   ├── planner\ (5 files)
│   │   ├── analytics\ (5 files)
│   │   ├── payment\ (5 files)
│   │   ├── notification\ (5 files)
│   │   ├── institute\ (5 files)
│   │   ├── mentor\ (5 files)
│   │   ├── admin\ (5 files)
│   │   └── ai-integration\ (5 files)
│   │
│   ├── app.js
│   └── server.js
│
├── prisma\
│   ├── schema.prisma
│   └── migrations\
│
├── tests\
│   ├── unit\
│   ├── integration\
│   └── e2e\
│
├── docs\
├── .env
├── .env.example
├── .gitignore
└── README.md