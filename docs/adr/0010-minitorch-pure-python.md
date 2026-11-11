# ADR 0010: minitorch is pure Python

Status: accepted, 2026-11-11

## Decision
minitorch (the teaching tensor and autograd library) uses only the Python standard
library. The README had said "pure-NumPy"; that is changed.

## Why
- Runs in the self-hosted Pyodide with no extra package download, offline, in
  the same worker as every other challenge.
- Every operation is a few readable lines, which is the point of the library.
- Learners can open `tensor.py` and read the whole thing.

## Costs
- Slow: matmul is plain loops. Fine for lesson-sized examples, not for training real models.
  Lessons say so and point to PyTorch for real work.
- NumPy is used only as a test oracle when it happens to be installed.

## How it is checked
Every operation against numerical gradients; 30 random expressions against NumPy; learning
tests; and the whole suite inside real Pyodide (`packages/runner`). A mutation run (12 injected
bugs: transposes, signs, accumulation, broadcasting, stability, momentum) found one unapplied
pattern and no survivors among the 11 that applied.

## Not done
- Batched matmul, indexing/slicing, concatenation, dropout, Adam, convolution.
- A minitorch challenge in the lesson format (Day 14+ content).
