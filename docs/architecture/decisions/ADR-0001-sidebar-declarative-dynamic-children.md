# ADR-0001: Sidebar dynamic children as a declarative model

Date: 2025-10-14

## Status
Proposed

## Context
The sidebar currently exposes an imperative `refreshBasePath` prop used by the container to force reloading children for a dynamic branch after RTK Query refetches. While RTK tags + invalidations already handle data freshness, the view still requires this glue to visually update.

## Decision
Move the sidebar to a declarative model for dynamic children:
- The container passes either
  - a `dynamicChildrenMap: Record<BasePath, Array<{ id: string; label: string }>>`, or
  - a `dataVersionMap: Record<BasePath, number>` (e.g., the query's `fulfilledTimeStamp`).
- The `SidebarMenu` component rebuilds a branch when the respective map changes for its base path.
- Remove `refreshBasePath` imperative trigger from the container once the declarative input is in place.

## Consequences
- Pros:
  - Purely data-driven UI; fewer imperative links between data and view.
  - RTK Query invalidations remain the only source of refresh truth.
- Cons:
  - Small prop/API change for `SidebarMenu`.
  - Requires a short refactor in the container and the menu component.

## Alternatives Considered
- Keep the imperative `refreshBasePath` (current short-term fix). Works but is less idiomatic and scatters refresh logic.

## Rollout Plan
1) Introduce the declarative prop(s) with backward compatibility (keep `refreshBasePath` during transition).
2) Migrate the container to supply the declarative data.
3) Remove `refreshBasePath` and related code after validation.
