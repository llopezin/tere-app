always ask the user what to do next before closing the request or declaring a task complete
Use pnpm as package manager
Always output plans to an md file and let me know where to find them. Once implemented ask if they can be removed.
Use lucide for icons
Use tanstack router Link component for links
No barrel exports — always import directly from the component file (e.g. `@/components/ui/Button`)
Make a commit after every request with code changes, always lint --fix prior to committing and only commit files related to the request.
After large commits, make sure to run pnpm build and check that the project builds successfully.
After large commits, run a code review over the commit and if any critical issues or improvements create a refactor commit.
This project uses tankstack router, use it for dynamic navigations
When creating queries to api on frontend, always separate the query options from the query function
For now we are not caching any request, so don't use any caching to query options

## Key Files & Context

- `docs/PRD.md`: Feature list and business rules.
- `docs/FRONTEND_AUTH_GUIDE.md`: Authentication integration details.
- `files/*.png`: UI/UX reference.
- `docs/TECH_STACK.md`: Details on stack.
