# ALL YOU CAN PLAY

A five-game browser arcade created by RBC Studios.

| Game | Controls | Options |
| --- | --- | --- |
| Snake | Arrow keys or on-screen controls. P pauses. | Three speeds |
| 2048 | Arrow keys, swipe, or on-screen controls. | 3×3, 4×4, and 5×5 boards. One-square moves, animated merges, and one-move undo. |
| Tetris | Left and right to move, up to rotate, down to lower, Space to drop, P to pause. On-screen controls are also available. | Three starting speeds, ghost piece, next piece, and line clears |
| The Lineup | Cross-reference the row, column, and group clues, then check your full lineup. | 8, 12, or 16 suspects, uniquely solvable randomized cases, optional reveals |
| The Password Game | Type a made-up password that satisfies every revealed rule. | 15, 30, or 50 rules with changing challenge details |

The Lineup is an original deduction puzzle inspired by Clues by Sam. The Password Game uses an original rule set inspired by Neal Agarwal's game. The arcade high scores are saved separately by mode in the current browser. Runs start fresh when switching games. Password text is checked locally and is not saved.

In 2048, a move that slides or merges a tile adds exactly one new tile. Its cell is chosen uniformly from the empty cells after the move. The new tile is a 2 with 90% probability and a 4 with 10% probability. Blocked inputs leave the board and score alone.

## Run locally

Keep the files together and open `index.html`. No install or build command is required.

## Publish on GitHub Pages

1. Create a public repository named `all-you-can-play`.
2. Upload the extracted files with `index.html` directly in the repository root. Commit to `main`.
3. Open **Settings → Pages → Deploy from a branch** and select **main** and **/(root)**.
4. Return to the Pages settings and click **Visit site** when deployment is ready.

To publish an update, commit your changed files to the same branch.
