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

## Architecture rules
- All backend access goes through `api()` in `src/lib/api` (one adapter: mock or live, never mixed); UI never calls fetch directly — keeps backend swap a single-module change.
- Live endpoint paths live only in `src/lib/api/config.ts` and are placeholders until a backend spec exists — avoids scattered assumed URLs.
- Job/pipeline status is rendered only from backend data; the UI never estimates progress or marks jobs complete.
- Data hooks live in `src/lib/queries.ts` (React Query, client-side) because API config is stored in browser localStorage.
- CVE list limits, rule grouping, rule-state display labels and counts live in browser-safe `src/lib/soc-display.ts`; these presentation transforms preserve backend records and identifiers, and counts use the full rules response rather than capped activity lists.
