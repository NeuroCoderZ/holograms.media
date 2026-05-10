# TODO — History Sidebar glassmorphism

- [ ] Update `css/_history_sidebar.css`:
  - [ ] Add `.history-sidebar.is-open` styles
  - [ ] Set default state to “slightly visible”
  - [ ] Keep hover behavior consistent
- [ ] Update `js/ui/uiManager.js`:
  - [ ] Extend `initHistorySidebar()` with open/close logic:
    - [ ] Desktop: mouse enter/leave
    - [ ] Touch/pen: swipe right-to-close, left-to-open (within visible area)
- [ ] Verify: history sidebar appears and does not break other glassmorphism blur
