# Accessibility

This document defines the accessibility standards for MultiTree.

Accessibility is a core quality requirement. Every feature should be usable by as many people as possible, regardless of ability or device.

Accessibility should be considered during design, development, and testing—not added afterward.

---

# Principles

Every interface should be:

- perceivable
- operable
- understandable
- robust
- consistent

Accessibility should never be sacrificed for visual design.

---

# General Rules

Always:

- use semantic HTML
- support keyboard navigation
- maintain logical focus order
- provide visible focus indicators
- ensure sufficient color contrast
- use descriptive labels
- write accessible error messages
- test interactive components without a mouse

Avoid accessibility regressions when modifying existing features.

---

# Semantic HTML

Prefer native HTML elements.

Use:

- `button` for actions
- `a` for navigation
- `form` for forms
- `label` for form fields
- `nav`
- `main`
- `header`
- `footer`
- `section`
- `article`

Avoid replacing semantic elements with generic `div` elements unless necessary.

---

# Keyboard Accessibility

Every interactive feature must be usable with a keyboard.

Users should be able to:

- navigate using Tab
- move backward with Shift+Tab
- activate buttons using Enter or Space
- close dialogs with Escape where appropriate
- navigate menus and lists using keyboard controls where expected

No feature should require a mouse.

---

# Focus Management

Focus should always remain predictable.

Always:

- move focus into opened dialogs
- return focus after closing dialogs
- preserve focus during navigation when appropriate
- avoid unexpected focus jumps

Never trap keyboard focus unless intentionally implementing a modal.

---

# Forms

Every form should:

- use labels for every field
- clearly indicate required fields
- validate input consistently
- associate validation messages with the correct field
- preserve entered values after validation failures where appropriate

Do not rely solely on placeholder text as a field label.

---

# Error Messages

Validation errors should:

- clearly explain the problem
- explain how to fix it
- appear near the affected field
- remain readable by assistive technologies

Avoid vague messages.

---

# Buttons and Links

Buttons should:

- have descriptive text
- have appropriate touch targets
- provide visible hover and focus states
- indicate disabled states clearly

Links should clearly describe their destination.

Avoid generic text such as:

- Click here
- Read more
- Learn more

unless additional context is provided.

---

# Images

Every meaningful image should include appropriate alternative text.

Decorative images should use empty alternative text.

Do not repeat surrounding text in image descriptions.

---

# Icons

Icons alone should not communicate essential information.

When icons perform actions:

- provide accessible labels
- provide tooltips when appropriate

Avoid relying on color alone to communicate meaning.

---

# Color

Never rely solely on color to communicate:

- status
- errors
- warnings
- success
- required fields

Provide additional visual indicators.

Maintain sufficient color contrast for text and interactive elements.

---

# Typography

Text should:

- remain readable at different zoom levels
- avoid excessively small font sizes
- maintain adequate line spacing
- avoid fixed-height containers that clip content

---

# Responsive Design

Accessibility applies across all screen sizes.

Verify:

- mobile
- tablet
- desktop

Content should remain usable without horizontal scrolling except where appropriate.

---

# Dialogs

Dialogs should:

- receive keyboard focus when opened
- trap focus while open
- close with Escape where appropriate
- restore previous focus when closed
- expose proper accessibility attributes

Dashboard management dialogs use the shared `ManagementModal`. It focuses the
labelled dialog container on open, contains forward and reverse Tab navigation,
honors Escape only for the topmost open modal, and restores the previously
focused element on close. New management overlays must reuse this primitive;
non-dialog popovers may use the keyboard hook without enabling its dialog-focus
option.

---

# Tables

Tables should:

- use semantic table elements
- provide column headers
- remain readable on smaller screens
- avoid unnecessary complexity

Use tables only for tabular data.

---

# Notifications

Status messages should:

- be noticeable
- remain readable
- avoid disappearing too quickly
- be announced to assistive technologies when appropriate

Do not rely solely on animations.

---

# Loading States

Loading indicators should:

- communicate progress clearly
- avoid excessive animation
- indicate when content becomes available

Skeleton loaders should not replace proper loading announcements where accessibility requires them.

---

# Animations

Animations should:

- support reduced-motion preferences
- avoid excessive movement
- never interfere with usability

Essential functionality must not depend on animations.

---

# Public Pages

Public linktrees and mini-websites should:

- remain fully keyboard accessible
- expose meaningful page titles
- include descriptive metadata
- preserve accessible navigation
- provide accessible media controls where applicable

Accessibility should be preserved across all templates and variations.

---

# Dashboard

Business and platform dashboards should:

- support full keyboard navigation
- expose accessible forms
- provide consistent navigation
- maintain readable data tables
- clearly identify validation and application errors

---

# Testing

Accessibility should be verified during development.

Check:

- keyboard navigation
- focus order
- screen reader compatibility where practical
- color contrast
- responsive layouts
- form validation
- dialog behavior

Accessibility testing should be part of feature verification.

---

# Accessibility Checklist

Before completing a feature, verify:

- Semantic HTML is used appropriately.
- Keyboard navigation works correctly.
- Focus behavior is predictable.
- Interactive elements have accessible names.
- Forms have proper labels.
- Error messages are accessible.
- Images have appropriate alternative text.
- Color is not the only means of communication.
- Contrast remains readable.
- Dialogs manage focus correctly.
- Responsive layouts remain accessible.
- Animations respect reduced-motion preferences.
- Public pages remain accessible.
- Dashboard interfaces remain accessible.

Accessibility is a quality requirement, not an optional enhancement.
