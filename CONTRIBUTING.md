# Contributing to Cultivate

Thank you for contributing to Cultivate.

This repository supports our beta-stage product validation. At this stage, our priority is external reliability: stable workflows, clear reporting, and maintainable issue handling without requiring direct team support.

## How to Contribute

We welcome:
- Bug reports
- Suggestions and usability feedback
- Documentation fixes
- Pull requests for approved changes

Please use the GitHub Issue templates when opening a bug report or suggestion. This helps us triage consistently and maintain an auditable record of external feedback.

## Beta Triage Process

All incoming issues are reviewed using the following severity taxonomy:

| Severity | Definition | Beta Gate |
|---|---|---|
| Critical | System unusable, crash, or data loss | Must be resolved before beta validation |
| High | Core workflow blocked with no workaround | Must be resolved before beta validation |
| Medium | Degraded experience but workaround exists | Document and triage; resolve before GA |
| Low | Minor UI or non-blocking issue | Log in backlog; does not block beta |

## Triage SLA

During beta validation, our team follows this triage SLA:

- **Acknowledgement:** within 24 hours
- **Severity classification:** within 48 hours
- **Resolution or formal deferral decision:** within 5 business days

A triage response will normally include:
1. Reproduction status
2. Severity label
3. Immediate action or next step
4. Resolution target or formal deferral reason

## External Reporting Expectations

When reporting an issue, please include:
- Steps to reproduce
- Expected result
- Actual result
- Environment details
- Screenshots or logs if available

Incomplete reports may be tagged as `needs-info` until clarified.

## Pull Requests

Before opening a pull request:
- Link the related issue when possible
- Keep the change scoped
- Describe what changed and how it was tested
- Note any user-facing impact

All pull requests should use the provided PR template.

## Code of Conduct

By participating in this project, you agree to follow our [Code of Conduct](./CODE_OF_CONDUCT.md).
