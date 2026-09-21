# Cap Stack Sort V2

Clean playtest repository created on 2026-09-21.

Current baseline:
- 5×6 board (30 cells)
- 3 Next Stacks
- drag/drop + tap/tap controls
- adjacent same-top caps gather one-by-one
- clear threshold 10+; 9 does not clear; 10/13/15 clear the full top run
- buried colors remain and can chain after reveal
- V0.7-style clear: caps fly to SCORE one-by-one at ~0.1 s cadence and shrink on arrival
- base scoring: +10 per cleared cap
- smart early RNG and progression unlocks
- approved current visual direction: warm tabletop, cream physical board, graphite Next tray, approved cap sprite, decorative ArsCorp cap

The V2 build is fully self-contained: its interface, game logic, and cap styling are served from this repository only.
