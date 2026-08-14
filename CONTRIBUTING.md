# Contributing to HiveContext

Thank you for your interest in contributing to HiveContext!

## Development Setup

1. Fork the repository and create a new feature branch.
2. Ensure you have the required prerequisites:
   - For **HiveContext-Dashboard**: Node.js 18+, npm
   - For **HiveContext-MCP**: Python 3.12+, AWS SAM CLI, Docker
3. Set up your local `.env.local` or `.env` using the provided `.env.example` templates.
4. Verify your changes build cleanly before submitting a Pull Request:
   - Dashboard: `npm run lint && npm run build`
   - MCP: `sam validate --lint`

## Pull Request Guidelines

- Keep pull requests focused on a single topic or bug fix.
- Follow existing code formatting and styling conventions.
- Provide a clear PR description explaining what changes were made and why.
