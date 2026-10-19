<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep shared portal navigation and session bookmarks in a single provider and shell, so all content pages have consistent navigation and saved-article state.
- Jobs and editable page text live in database tables (staff-only writes via role checks) and are read publicly through server functions preloaded in the root loader; articles come from the WordPress.com site through the connector gateway and are merged ahead of the built-in sample articles, so the admin panel and WordPress are the only content sources.
- Built-in sample articles and the job seed stay in a browser-safe data module; leaf routes supply their own metadata and render shared browsing components.
- Admin access is role-based (admin manages team, editor manages content); the first account created becomes admin automatically, so never create test accounts against the real backend.
- Keep a route that also serves child pages as a thin layout rendering <Outlet />, and put its own page UI in a sibling *.index.tsx leaf, because TanStack nests same-prefix route files under the parent file.
- Return only serializable values (plain strings, numbers, arrays) from route loaders, never components or functions, because the server serializes loader data for the browser and a function breaks that page's server render.
