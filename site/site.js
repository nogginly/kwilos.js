/* Don't use sloppy JS. */ "use strict";

// The theme toggle switches between light and dark, starting from the
// theme in use, and remembers the choice where storage is available.
document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const root = document.documentElement
  const dark = root.dataset.theme
    ? root.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches
  root.dataset.theme = dark ? 'light' : 'dark'
  try {
    localStorage.setItem('kwilos-theme', root.dataset.theme)
  } catch { }
})

// Each sample's tabs show its Preview or its Source. The arrow keys move
// between tabs, as for other tab controls.
for (const tabs of document.querySelectorAll('.tabs')) {
  const buttons = [...tabs.querySelectorAll('[role="tab"]')]

  const select = (chosen) => {
    for (const button of buttons) {
      const selected = button === chosen
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = selected ? 0 : -1
      document.getElementById(button.getAttribute('aria-controls')).hidden = !selected
    }
  }

  for (const button of buttons) {
    button.addEventListener('click', () => select(button))
    button.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key]
      if (!step) return
      const next = buttons[(buttons.indexOf(button) + step + buttons.length) % buttons.length]
      select(next)
      next.focus()
    })
  }
}
