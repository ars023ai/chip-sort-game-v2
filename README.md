# Cap Stack Sort · 2.0

A complete static bottle-cap puzzle with an endless game and a separate Creator Studio. The approved warm tabletop, molded board and graphite Next tray are retained. The same composition is cropped into a large portrait game on phones.

## Play

- 5 columns × 6 rows; 3 Next stacks.
- Drag a stack to an empty cell, or tap a stack and then the cell. Keyboard 1–3 selects a Next stack; Tab and Enter navigate the board.
- Orthogonally connected matching tops gather one cap at a time. A group of 10+ clears in full. Buried colors remain and can start another reaction.
- Every cleared cap earns 10 points. BEST persists locally. A full board ends the game only after all reactions finish.
- The timer starts on the first move and freezes while paused, while the tab is hidden, and after Game Over. Settings pause active animations too.
- Completed moves are saved locally. Reopening offers to continue. Closing during an animation returns to the previous completed move. Creator scenes use separate storage and never affect game records.

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
| 16 · Red Bull | 8,000 |

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
- Change animation speed to 0.5×, 1×, 1.5× or 2×.
- Clean capture has full-tabletop, portrait and board-close-up compositions. Esc returns to the editor. Recording is done with the user's screen recorder.
- Save up to 30 scenes in the browser, export/import portable JSON, or copy a link with the complete scene. Imports validate sizes, cap IDs, score and the trigger.

## Run and verify

No build step or npm packages are needed to play. Serve the repository with any static HTTP server. Node 22+ is used only for development checks; jsdom is a development dependency for deterministic DOM lifecycle tests.

```
npm ci
npm test
npm run build
npm run simulate
```

`dist/` contains only the twelve production files. GitHub Pages publishes this folder after all regression tests pass. Tests cover thresholds, buried layers, adjacency, progression and intro persistence, rescue probabilities, 300 scene variations, JSON links, storage validation, pause/resume, cancellation during placement/merge/clear, editor undo, Super Score isolation, and the frozen Game Over timer.

Version: 2.0.0 · October 13, 2026.
