# LAFRYHI AI Radar v1.1.0

Release date: July 30, 2026  
Release name: **Bright Premium Experience**

## Stable release

This is the first stable LAFRYHI AI Radar release. It was promoted from `v1.1.0-rc2` after successful Cloud Run production deployment and verification.

The release combines the Bright Brand Integration with a complete, reproducible Git snapshot containing the application source, services, tests, fixtures, build configuration, deployment manifests, public assets, and supporting documentation.

## Release highlights

- **Bright Brand Integration** — Introduces a bright, joyful, premium visual experience built around clean white and light blue-gray surfaces.
- **Approved Brand Kit** — Applies the approved LAFRYHI AI Radar palette, logo, typography direction, and visual language as the source of truth.
- **Homepage redesign** — Delivers a brighter hero, clearer hierarchy, premium radar presentation, prominent calls to action, and more generous whitespace.
- **Dashboard redesign** — Improves scanability with light surfaces, clearer blue headings, stronger section separation, and accessible status accents.
- **Decision Brief redesign** — Presents recommendations, scores, confidence, evidence, and next actions in a clearer, more actionable card system.
- **Pricing redesign** — Uses elegant light plan cards with prominent blue and yellow treatment for the Pro offering.
- **Responsive improvements** — Refines navigation, content grids, cards, forms, pricing, and footer behavior across desktop, tablet, and mobile layouts.
- **Accessibility improvements** — Strengthens contrast, keyboard focus visibility, form clarity, readable status treatments, and reduced-motion support.
- **Performance preserved** — Keeps the experience lightweight and avoids unnecessary runtime dependencies.
- **Business logic unchanged** — Preserves existing APIs, authentication, billing behavior, workflows, and product functionality.

## Release scope and compatibility

This visual integration release does not change application business logic, APIs, authentication behavior, or billing behavior.

## Temporary dependency-risk acceptance

The production acceptance review identified 12 npm audit high-severity entries that originate from one `brace-expansion` advisory; they are not 12 independent vulnerabilities. There are zero critical vulnerabilities.

No user-controlled glob or brace pattern reaches the affected dependency in this application. Propagation through Firestore and `google-gax` was assessed as likely unreachable at runtime. A compatible patch or minor remediation is not currently available, so the finding is temporarily accepted and must be re-audited when compatible upstream releases become available.
