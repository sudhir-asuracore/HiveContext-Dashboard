<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# HiveContext Collective Memory Directives

1. **Context Lookup**: Before starting complex architectural tasks, debugging incidents, or configuring environment setups, check for relevant team memories, architectural decisions, and post-mortems using the `search_context` tool on `hivecontext` MCP.
2. **Memory Persistence**: Whenever establishing new codebase conventions, solving non-trivial issues, creating architectural decisions, or updating infrastructure patterns, persist them to the `hivecontext` MCP using appropriate tools:
   - `remember_convention(topic, content)` for team coding rules and patterns.
   - `save_adr(title, decision, context, consequences)` for key design decisions.
   - `log_post_mortem(issue, resolution)` for bug fixes and incident retrospectives.
   - `save_infrastructure_context(component, configuration, dependencies)` for deployment and server specs.
3. **User Confirmation for Git Operations**: ALWAYS ask the user for explicit confirmation before executing `git commit` or `git push`.
