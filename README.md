# Cap Stack Sort · 2.2

A static bottle-cap puzzle with an endless game and a separate Creator Studio. The approved warm tabletop, molded board and graphite Next tray are retained. The same composition is cropped into a large portrait game on phones.

## Player entry and navigation

The web game opens a real loading screen, checks the stylesheet, modules and board/cap images, then opens the main menu. Failed loads show a retry action without clearing saved records. There are no external fonts or runtime packages.

- Play / Continue / New game, best score and the saved round summary.
- How to play, settings, optional first-clear coaching, privacy and support.
- Menu and Pause buttons remain at least 44 pixels high. Returning to the menu freezes the round, including an active animation. Continue resumes it; abandoning a round requires a confirmation.
- The first introduction uses two five-cap matching stacks so the player can make a real ten-cap clear. It can be skipped or repeated from settings. Subsequent games use the ordinary generator.
- The board fits portrait and landscape viewports. The layout reserves space for phone controls, notch insets and first-game coaching. Small screens have readable HUD labels and count badges.
- English remains the only language. No account or network connection is required after this page has loaded; reopening offline is not supported.

`?preview=phone`, `?preview=small`, `?preview=tablet` and `?preview=landscape` frame the actual game container at 390×844, 320×568, 768×1024 and 844×390 for browser inspection. These routes use the same resize and layout code as normal play. They are not device emulation or physical-device testing.

## Play

- 5 columns × 6 rows; 3 Next stacks.
- Drag a stack to an empty cell, or tap a stack and then the cell. Keyboard 1–3 selects a Next stack; Tab and Enter navigate the board.
- Orthogonally connected matching tops gather one cap at a time. A group of 10+ clears in full. Buried colors remain and can start another reaction.
- Every cleared cap earns 10 points. BEST persists locally. A full board ends the game only after all reactions finish.
- The timer starts on the first move and freezes while paused, while the tab is hidden, and after Game Over. Settings pause active animations too.
- Completed moves are saved locally. Reopening shows the main menu with Continue. Closing during an animation returns to the previous completed move. Creator scenes use separate storage and never affect game records.

## Endless progression

The first 180 active seconds stay at four brands, with large monochrome stacks of 4–6 caps. After warmup, difficulty follows cleared caps. A captured warmup baseline avoids a sudden change in the generator at 3:00. Lower stack sizes and more mixed blocks become more common gradually. Colors always occupy contiguous blocks; at most three brands appear in an ordinary Next stack.

| Active brands | Score threshold |
| --- | ---: |
| 4 | Start |
| 5 | 600 |
| 6 | 1,400 |
| 7 / 8 | 2,300 / 2,600 |
| 9 / 10 | 3,500 / 3,800 |
| 11 / 12 | 4,700 / 5,000 |
| 13 / 14 | 5,900 / 6,200 |
| 15 | 7,100 |
| 16 · RED RULL | 8,000 |

Every new brand gets exactly three guaranteed monochrome stacks. All three must be played before another brand can open. Ordinary mixed generation excludes a brand until its introduction is finished. The final thresholds are difficult milestones, not promised completion scores.

With five or fewer empty cells, the generator selects a useful exposed top on about 70% of draws; incidental random matches can add slightly to that figure. Weights favor large existing top groups. Help does not guarantee a clear or prevent Game Over. After all brands open, mixing increases and useful draws become less common slowly, while the rescue probability remains.

The fixed-seed simulation of 900 games gave median scores of 3,000 / 5,210 / 6,240 and a maximum of 7,620. These are automated placement policies, not human playtest results or proof of an optimal strategy. The current policies did not reach the sixteenth brand. The simulator assumes 5.5 active seconds per move. It shares the actual progression, generator and resolution planner with the game.

## Creator Studio

Open the same page with `?creator=1`. This is a local creative tool, not an authenticated server administrator account.

- Three presets produce 3, 5 or 6 genuine consecutive clears from one placement.
- Generate deterministic variations with a numeric seed.
- Select any live cell or Next slot, add/remove/reorder color layers, copy/paste stacks, and undo changes.
- Choose a trigger Next stack and empty cell. Play, pause, rewind, or repeat the original take without rebuilding it.
- Set a starting score; use ordinary scoring or Super Score at 10×. Neither changes normal BEST.
- Change animation speed to 0.5×, 1×, 1.5× or 2×. The playback clock does not depend on browser frame frequency; a finished take freezes its timer.
- Clean capture has full-tabletop, 9:16 portrait and board-close-up compositions. Esc returns to the editor. Recording is done with the user's screen recorder.
- Save up to 30 scenes in the browser, export/import portable JSON, or copy a link with the complete scene. Imports validate sizes, cap IDs, score and the trigger.

## Run and verify

No build step or npm packages are needed to play. Serve the repository with any static HTTP server. Node 22+ is used only for development checks; jsdom is a development dependency for deterministic DOM lifecycle tests.

```
npm ci
npm test
npm run build
npm run simulate
```

`dist/` contains only the fifteen production files. GitHub Pages publishes this folder after all regression tests pass. Tests cover thresholds, buried layers, adjacency, progression and intro persistence, rescue probabilities, 300 scene variations, JSON links, storage validation, pause/resume, cancellation during placement/merge/clear, editor undo, Super Score isolation, the frozen Game Over timer, home/continue/restart transitions, first-clear coaching, loader failures, nine viewport sizes, safe-area reservations and cap containment.

Version: 2.2.1 · October 17, 2026.

## Publishing editions - 2.2.1

- `npm run build`: ad-free web game and Creator Studio. Russian creator instructions live at `creator-guide.html`; clean capture supports Space to start/repeat a take. Record & download exports the live game cap positions/animations and synthesized game audio through Canvas/MediaRecorder; it requests no screen or microphone access.
- `npm run build:yandex`: `dist-yandex/`, ready to ZIP with index.html at its root. Official /sdk.js loading, SDK init, language detection with English fallback, Game Ready after real loading, Gameplay start/stop, platform pause/resume, and an interstitial request on Play again after Game Over. First request and successive requests are at least 180 seconds apart. The platform may decline ads. Errors preserve the next round; an opened ad suspends game time, animations and sound until it closes. Creator Studio is disabled even with ?creator=1. No login, purchases or cloud saves.
- `mobile/`: Capacitor Android and iOS projects with local resources, branded icons/splash and native lifecycle. See mobile/README.md. GitHub Actions compiles an Android debug APK and unsigned release AAB; it does not sign a production release. iOS compilation/signing requires Xcode and an Apple developer team.

Public web privacy, native privacy and Yandex privacy are separate. The SDK integration has automated mocked tests; actual Yandex draft/debug and advert delivery must be verified in the publisher account. Native device tests and App Store screenshots remain required. Store review is separate from CI.

The publishing kit contains original promotional illustrations and actual browser gameplay screenshots/video, text fields, scene JSON, social assets and Russian guides. Promotional illustrations are not gameplay screenshots. Web reference captures do not prove native-device behavior. Super Score is creator-only and is disabled in standard store footage.

Artwork provenance: the approved cap atlas still contains reference-inspired fictional drink identities. Renaming a mark does not establish rights clearance; obtain permission or commission independent cap identities before asserting commercial rights to all artwork. RED RULL uses the approved original R emblem, not a bull/sun mark.
