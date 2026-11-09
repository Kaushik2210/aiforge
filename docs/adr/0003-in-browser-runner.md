# ADR 0003: In-browser Python runner

Status: accepted, 2026-11-09

## Decision
Learner Python runs in Pyodide inside a module Web Worker. The page talks to it
through `PyRunner` (`packages/runner`). One Python harness runs each
challenge's own test files, the same way the command-line challenge CI does, so
"passes in CI" and "passes in the browser" are the same claim (a real-Pyodide
test enforces it).

## Guard rails and what they do not do
| Concern | What we do | Limit |
|---|---|---|
| Infinite loops | Main thread kills the worker after 10 s and starts a fresh one | The 10 s budget includes only the run, not the first load |
| Stop button | Same hard kill, on demand | |
| Output floods | Harness keeps at most about 8 KB of output plus PASS/FAIL lines and the last 30 lines | Printing still costs CPU until the time limit |
| `input()` | stdin is empty, so it raises EOFError | |
| Crashes (for example out of memory) | Worker `error` event is caught, worker is replaced | WebAssembly memory is not capped; a huge allocation can still slow the tab before it fails |
| Hidden checks | Counts only, no names or messages | Not a security boundary (see below) |

## Hidden checks are not secret
The site is static and local-first, so hidden tests are shipped to the browser
and anyone can read them. They exist to stop answers that only fit the visible
examples, not to stop a determined learner. Do not use them for anything that
must stay private (graded assessment, certification). If real secrecy is ever
needed, grading must move to a server, which is out of scope for v1.

## Challenge quality gate
Every challenge ships `hidden_tests.py` and at least two `mutants/` (plausible
wrong solutions). CI requires: starter fails, solution passes visible and hidden
tests, and every mutant fails at least one. This caught real weakness: one
mutant (ignoring the `h` argument) passed every visible test and was caught only
by a hidden check.

## Consequences
Pyodide (about 13 MB) is self-hosted and cached after the first run. Monaco's
files still come from a CDN; the plain editor works fully offline.
