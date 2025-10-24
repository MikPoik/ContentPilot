# Directory Tree

Generated on: 2025-10-24T11:36:20.270Z

*Simple mode: Directory structure only*

```
├── 📁 client/
│   └── 📁 src/
│       ├── 📄 App.tsx
│       ├── 📁 components/
│       │   ├── 📄 MemoryTester.tsx
│       │   ├── 📁 chat/
│       │   │   ├── 📄 ai-activity-indicator.tsx
│       │   │   ├── 📄 export-menu.tsx
│       │   │   ├── 📄 instagram-indicator.tsx
│       │   │   ├── 📄 message-input.tsx
│       │   │   ├── 📄 message-list.tsx
│       │   │   ├── 📄 search-citations.tsx
│       │   │   ├── 📄 search-indicator.tsx
│       │   │   ├── 📄 sidebar.tsx
│       │   │   └── 📄 typing-indicator.tsx
│       │   ├── 📁 profile/
│       │   │   ├── 📄 ai-collected-data-card.tsx
│       │   │   ├── 📄 basic-profile-card.tsx
│       │   │   ├── 📄 blog-analysis-card.tsx
│       │   │   ├── 📄 competitor-analysis-card.tsx
│       │   │   ├── 📄 data-usage-info-card.tsx
│       │   │   ├── 📄 editable-array-field.tsx
│       │   │   ├── 📄 editable-text-field.tsx
│       │   │   ├── 📄 hashtag-search-card.tsx
│       │   │   ├── 📄 instagram-analysis-card.tsx
│       │   │   └── 📄 other-profile-data-card.tsx
│       │   ├── 📄 subscription-management.tsx
│       │   └── 📁 ui/
│       │       ├── 📄 accordion.tsx
│       │       ├── 📄 alert-dialog.tsx
│       │       ├── 📄 alert.tsx
│       │       ├── 📄 aspect-ratio.tsx
│       │       ├── 📄 avatar.tsx
│       │       ├── 📄 badge.tsx
│       │       ├── 📄 breadcrumb.tsx
│       │       ├── 📄 button.tsx
│       │       ├── 📄 calendar.tsx
│       │       ├── 📄 card.tsx
│       │       ├── 📄 carousel.tsx
│       │       ├── 📄 chart.tsx
│       │       ├── 📄 checkbox.tsx
│       │       ├── 📄 collapsible.tsx
│       │       ├── 📄 command.tsx
│       │       ├── 📄 context-menu.tsx
│       │       ├── 📄 dialog.tsx
│       │       ├── 📄 drawer.tsx
│       │       ├── 📄 dropdown-menu.tsx
│       │       ├── 📄 form.tsx
│       │       ├── 📄 hover-card.tsx
│       │       ├── 📄 input-otp.tsx
│       │       ├── 📄 input.tsx
│       │       ├── 📄 label.tsx
│       │       ├── 📄 menubar.tsx
│       │       ├── 📄 navigation-menu.tsx
│       │       ├── 📄 pagination.tsx
│       │       ├── 📄 popover.tsx
│       │       ├── 📄 progress.tsx
│       │       ├── 📄 radio-group.tsx
│       │       ├── 📄 resizable.tsx
│       │       ├── 📄 scroll-area.tsx
│       │       ├── 📄 select.tsx
│       │       ├── 📄 separator.tsx
│       │       ├── 📄 sheet.tsx
│       │       ├── 📄 sidebar.tsx
│       │       ├── 📄 skeleton.tsx
│       │       ├── 📄 slider.tsx
│       │       ├── 📄 switch.tsx
│       │       ├── 📄 table.tsx
│       │       ├── 📄 tabs.tsx
│       │       ├── 📄 textarea.tsx
│       │       ├── 📄 theme-toggle.tsx
│       │       ├── 📄 toast.tsx
│       │       ├── 📄 toaster.tsx
│       │       ├── 📄 toggle-group.tsx
│       │       ├── 📄 toggle.tsx
│       │       └── 📄 tooltip.tsx
│       ├── 📁 contexts/
│       │   └── 📄 theme-context.tsx
│       ├── 📁 hooks/
│       │   ├── 📄 use-mobile.tsx
│       │   ├── 📄 use-toast.ts
│       │   └── 📄 useAuth.ts
│       ├── 📄 index.css
│       ├── 📁 lib/
│       │   ├── 📄 authUtils.ts
│       │   ├── 📄 exportUtils.ts
│       │   ├── 📄 queryClient.ts
│       │   └── 📄 utils.ts
│       ├── 📄 main.tsx
│       └── 📁 pages/
│           ├── 📄 chat.tsx
│           ├── 📄 landing.tsx
│           ├── 📄 not-found.tsx
│           └── 📄 profile-settings.tsx
├── 📄 components.json
├── 📄 drizzle.config.ts
├── 📄 package-lock.json
├── 📄 package.json
├── 📄 postcss.config.js
├── 📁 server/
│   ├── 📄 db.ts
│   ├── 📄 index.ts
│   ├── 📄 replitAuth.ts
│   ├── 📁 routes/
│   │   ├── 📄 auth.ts
│   │   ├── 📄 conversations.ts
│   │   ├── 📄 instagram.ts
│   │   ├── 📄 memories.ts
│   │   ├── 📄 messages.ts
│   │   └── 📄 subscriptions.ts
│   ├── 📄 routes.ts
│   ├── 📁 services/
│   │   ├── 📁 ai/
│   │   │   ├── 📄 blog.ts
│   │   │   ├── 📄 chat.ts
│   │   │   ├── 📄 instagram.ts
│   │   │   ├── 📄 intent.ts
│   │   │   ├── 📄 memory-utils.ts
│   │   │   ├── 📄 memory.ts
│   │   │   ├── 📄 profile.ts
│   │   │   ├── 📄 search.ts
│   │   │   ├── 📄 workflow-constants.ts
│   │   │   └── 📄 workflow.ts
│   │   ├── 📄 errors.ts
│   │   ├── 📄 grok.ts
│   │   ├── 📄 hikerapi.ts
│   │   ├── 📄 instagrapi.ts
│   │   ├── 📄 openai.ts
│   │   └── 📄 perplexity.ts
│   ├── 📄 storage.ts
│   └── 📄 vite.ts
├── 📁 shared/
│   └── 📄 schema.ts
├── 📄 tailwind.config.ts
├── 📄 tsconfig.json
└── 📄 vite.config.ts

```
