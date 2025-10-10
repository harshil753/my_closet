<!--
Sync Impact Report:
Version change: 0.0.0 → 1.0.0
Modified principles: N/A (new constitution)
Added sections: Code Quality Standards, Development Workflow
Removed sections: N/A
Templates requiring updates: ✅ plan-template.md, ✅ spec-template.md, ✅ tasks-template.md
Follow-up TODOs: None
-->

# My Closet Constitution

## Core Principles

### I. Simplicity First
Every component, feature, and architectural decision MUST prioritize simplicity and readability. Code should be immediately understandable by developers with 1-2 years of full-stack experience. Avoid over-engineering, complex abstractions, and unnecessary patterns. When in doubt, choose the simpler solution.

### II. Minimal File Structure
Use the absolute minimum number of files necessary to deliver functionality. Prefer single-purpose files with clear responsibilities over complex multi-file architectures. Each file should have a single, obvious purpose that can be understood at a glance.

### III. Clean Code Standards
All code MUST include helpful comments explaining the "why" behind complex logic. Use descriptive variable and function names. Follow consistent formatting and indentation. Code should read like well-written prose, making the developer's intent crystal clear.

### IV. Up-to-Date Dependencies
All packages MUST be maintained at their latest stable versions. Regular dependency updates are mandatory to ensure security, performance, and access to latest features. No legacy or deprecated packages are permitted.

### V. User-Friendly Design
Every user interface element MUST be intuitive and require no explanation. Navigation should be obvious, forms should be self-explanatory, and error messages should guide users toward resolution. Test all user flows with actual users before deployment.

## Code Quality Standards

### Documentation Requirements
- Every function with complex logic MUST have a comment explaining its purpose
- All API endpoints MUST have clear parameter and response documentation
- Database schemas MUST include field descriptions and constraints
- Configuration files MUST have inline comments explaining each setting

### Testing Standards
- All critical user paths MUST have integration tests
- Business logic MUST have unit tests with clear test names
- Error conditions MUST be tested and handled gracefully
- Tests MUST be readable and explain the expected behavior

### Performance Requirements
- Page load times MUST be under 2 seconds on standard connections
- Database queries MUST be optimized and use appropriate indexes
- Images and assets MUST be optimized for web delivery
- API responses MUST be under 500ms for standard operations

## Development Workflow

### Code Review Process
- All code changes MUST be reviewed by at least one other developer
- Reviewers MUST verify code readability and comment quality
- Complex logic MUST be explained in PR descriptions
- Breaking changes MUST include migration documentation

### Deployment Standards
- All deployments MUST be automated and repeatable
- Environment configurations MUST be clearly documented
- Rollback procedures MUST be tested and documented
- Monitoring and logging MUST be in place before deployment

### Maintenance Requirements
- Dependencies MUST be updated monthly
- Security vulnerabilities MUST be addressed within 48 hours
- Performance regressions MUST be identified and fixed within one sprint
- Code quality metrics MUST be tracked and improved over time

## Governance

This constitution supersedes all other development practices and coding standards. All team members MUST follow these principles without exception. Amendments require team consensus and MUST be documented with clear rationale.

**Version**: 1.0.0 | **Ratified**: 2025-01-27 | **Last Amended**: 2025-01-27