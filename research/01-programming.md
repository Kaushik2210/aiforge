## Python basics (Day 15)

verifiedOn: 2026-11-12. All pages fetched 2026-11-12 from docs.python.org/3 (page header showed "Python 3.15.2 documentation"). Local confirmation run on Python 3.13.7. Paraphrased; no quotes beyond one short phrase.

### Sources
1. https://docs.python.org/3/tutorial/introduction.html
2. https://docs.python.org/3/tutorial/controlflow.html
3. https://docs.python.org/3/tutorial/datastructures.html
4. https://docs.python.org/3/reference/datamodel.html (3.1 Objects, values and types)
5. https://docs.python.org/3/library/stdtypes.html (Truth Value Testing)
6. https://docs.python.org/3/tutorial/floatingpoint.html
7. https://docs.python.org/3/library/functions.html (round)
8. https://docs.python.org/3/whatsnew/3.7.html

### Numbers and strings (1)
- `/` always gives a float; `//` floors; `%` is the remainder; floored quotient * divisor + remainder == dividend.
- `**` is power; it binds tighter than unary minus, so `-3**2` is `-9`.
- int mixed with float gives float (the int is converted).
- Strings are immutable (item assignment raises TypeError). Lists are mutable; `b = a` copies nothing, `a[:]` is a shallow copy.
- Slices are lenient: out-of-range bounds are clipped. A single out-of-range index raises IndexError.
- Negative indices count from the right (`-1` is last). Slice start is included, end excluded; `s[:i] + s[i:] == s`.
- The tutorial does NOT teach f-strings (only links to the reference). TODO-VERIFY f-string spec page before writing f-string quiz items.

### Control flow (2)
- Mutating a collection while iterating over it is risky; iterate over a copy (`.copy()`, `[:]`) or build a new collection.
- `range(stop)` excludes stop; `range(start, stop, step)` allows negative step; range is a lazy iterable, not a list.
- `break` leaves the innermost loop; `continue` skips to the next iteration.
- Loop `else` runs only if the loop finished without `break` (return or exception also skip it).

### Data structures (3)
- In-place list methods (`sort`, `append`, ...) return `None`; `sorted()` returns a new list. `pop()` returns the item and raises IndexError when empty.
- Lists are slow as queues; use `collections.deque`.
- Tuples are immutable but may contain mutables; one-item tuple needs a trailing comma.
- Empty `{}` is a dict; use `set()` for an empty set. Set ops: `- | & ^`.
- Dict keys must be immutable/hashable; `d[k]` raises KeyError, `d.get(k, default)` does not.
- Sequences compare lexicographically; a prefix is smaller. `(1,2,3) == (1.0,2.0,3.0)` is True. Incompatible types with `<` raise TypeError.

### Identity, mutability, truthiness (4, 5)
- `is` compares identity (`id()`), `==` compares value. Every object has identity, type, value; identity never changes.
- Immutable: numbers, strings, tuples. Mutable: lists, dicts (sets also mutable; TODO-VERIFY set named on datamodel page, it is on stdtypes).
- Two separate `[]` are never identical. Whether `a = 1; b = 1` share an object is implementation-dependent; never rely on it.
- Falsy: `None`, `False`, zero of any numeric type (`0`, `0.0`, `0j`, `Decimal(0)`, `Fraction(0,1)`), and empty `''`, `()`, `[]`, `{}`, `set()`, `range(0)`. The docs call the list "most of" the false objects; the general rule is `__bool__` returns False or `__len__` returns 0.

### Floats and round (6, 7)
- Floats are binary fractions; 0.1/0.2/0.3 have no exact form, so `0.1 + 0.2 != 0.3`. Use `math.isclose`, or `decimal.Decimal` (from strings) / `fractions.Fraction` for exactness.
- `round(x)` returns int; `round(x, n)` keeps the type. Ties go to the even choice. `round(2.675, 2)` gives `2.67` because of binary representation, which the docs say is not a bug.

### Dict order (8)
- Insertion order became an official language guarantee in Python 3.7 (CPython 3.6 had it only as an implementation detail).

### Locally confirmed outputs (Python 3.13.7)
- `round(0.5)=0`, `round(1.5)=2`, `round(2.5)=2`, `round(-0.5)=0`, `round(2.675,2)=2.67`, `type(round(2.5))=int`, `type(round(2.5,0))=float`
- `0.1+0.2 -> 0.30000000000000004`; `== 0.3` False; `math.isclose(0.1+0.2,0.3)` True
- `-7//2=-4`, `-7%3=2`, `7//-2=-4`, `7%-3=-2`, `7/2=3.5`, `6/3=2.0`, `2**-1=0.5`, `7.0//2=3.0`, `10//3.0=3.0`, `True+True=2`
- `'abc'[5:]=''`, `[1,2,3][5:]=[]`, `'abc'[1:99]='bc'`; `'abc'[5]` IndexError "string index out of range"
- falsy: `[] '' 0 0.0 None {} set() range(0) () 0j` all False; `'0'` and `[0]` True
- `[3,1,2].sort()` is None; `(1,)` is a tuple; `[1,2]<[1,3]` True; `(1,2)<(1,2,0)` True; `'a'<'B'` False
- removing while iterating `[1,2,3,4]` (remove evens) leaves `[1, 3]` here, but the skip behaviour is not documented guaranteed (use as a demo only).
- `range(5,0,-2) -> [5,3,1]`; `range(2,10,3) -> [2,5,8]`; `print(range(0))` shows `range(0, 0)`
- dict `{'b':1,'a':2}` plus `'c'` lists as `['b','a','c']`
