## 2025-12-20 - Global Keyboard Shortcuts
**Learning:** Adding a simple keyboard shortcut like Command+K for search significantly improves the "power user" feel of an app, but it must be accompanied by `aria-keyshortcuts` for screen reader users to be truly accessible.
**Action:** Always pair visual shortcut hints (like "⌘K") with actual `aria-keyshortcuts` attributes on the target element.