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

## Functions and modules (Day 17)

verifiedOn: 2026-11-12. Fetched 2026-11-12 (docs.python.org/3, rendered as 3.15.2; local runs on Python 3.13.7).
Sources:
- https://docs.python.org/3/tutorial/controlflow.html (4.8 Defining Functions, 4.9 More on Defining Functions)
- https://docs.python.org/3/tutorial/classes.html (9.2 Python Scopes and Namespaces, scope_test example)
- https://docs.python.org/3/tutorial/modules.html (Modules and Packages)
- https://docs.python.org/3/faq/programming.html (arguments vs parameters, call by assignment, lambda-in-loop, aliasing)
- https://docs.python.org/3/library/functools.html (partial, lru_cache, cache)

Documented facts (paraphrased):
- Parameters are the names in a def; arguments are the values passed in a call (FAQ).
- Tutorial: arguments are passed "call by value, where the value is always an object reference"; FAQ says "call by assignment / object reference": no alias between caller and callee names, so rebinding a parameter never affects the caller, mutating a shared mutable object does.
- A call creates a new local symbol table; name lookup: local, enclosing functions (nearest first), module globals, built-ins. Assignment binds in the innermost scope unless `global` or `nonlocal` is declared.
- No `return` (or bare `return`) yields `None`; the REPL hides a lone None, `print()` shows it.
- Defaults are evaluated once, at definition time, in the defining scope. Mutable defaults are shared across calls; idiom is `=None` plus `if x is None: x = []`.
- Keyword args follow positional ones, order is free, no parameter may get two values, unknown names are errors. `*name` collects extra positionals into a tuple, `**name` collects extra keywords into a dict (`*` before `**`); params after `*args` are keyword-only.
- `/` ends positional-only params; bare `*` starts keyword-only params. Call-site `*seq` and `**mapping` unpack.
- `lambda` is limited to one expression and is sugar for a def; it can read enclosing variables. `list.sort(key=lambda ...)` is the doc example.
- Docstring: first body statement string literal; first line short summary, ending with a period; blank line before details. Annotations are optional metadata in `__annotations__` and do not affect behaviour.
- FAQ lambda-in-loop: the loop variable lives in the outer scope and is read when the lambda is called, not defined; fix by saving it as a default argument (`n=x`).
- Modules: top-level code runs only the first time the module name is imported. Forms: `import m`, `from m import n`, `from m import *`, `import m as a`. Running as a script sets `__name__ == "__main__"`, so a guard keeps demo code from running on import.
- Search order: built-in modules first, then `sys.path` (script directory, PYTHONPATH, install defaults). Compiled bytecode is cached in `__pycache__` as `name.version.pyc`.
- Packages: directories with `__init__.py` (runs init code, may set `__all__`); relative imports use leading dots.
- functools: `partial` pre-fills arguments and returns a new callable; `lru_cache` memoizes, default maxsize 128, arguments must be hashable, `cache_info()` and `cache_clear()` exist, `@cache` equals `lru_cache(maxsize=None)`.

Confirmed local outputs (Python 3.13.7):
- `def f(x, acc=[])`; `print(f(1), f(2), f(3))` -> `[1, 2, 3] [1, 2, 3] [1, 2, 3]` (one shared list, printed after all three calls). Separate prints give `[1]`, `[1, 2]`, `[1, 2, 3]`.
- `acc=None` fix: `g(1), g(2)` -> `[1] [2]`. Default bound at def: `i=5; def h(arg=i); i=6; h()` -> `5`.
- `p(1,2,a=3,b=4)` with `(*args, **kwargs)` -> `((1, 2), {'a': 3, 'b': 4})`.
- `def ko(*, k)`; `ko(1)` -> `TypeError: ko() takes 0 positional arguments but 1 was given`.
- `def po(a, /)`; `po(a=1)` -> `TypeError: po() got some positional-only arguments passed as keyword arguments: 'a'`.
- `dup(0, a=0)` -> `TypeError: dup() got multiple values for argument 'a'`.
- `fs=[lambda: i for i in range(3)]; [f() for f in fs]` -> `[2, 2, 2]`; with `lambda i=i: i` -> `[0, 1, 2]`.
- nonlocal counter closure: three calls -> `1 2 3`.
- `total += 1` in a function without `global` -> `UnboundLocalError: cannot access local variable 'total' where it is not associated with a value`; with `global total` it works (`1`).
- `print(nothing())` -> `None`. `mutate(a)` appends to caller list (`[1, 99]`); `rebind(a)` (`l = [0]`) leaves it `[1, 99]`.
- `sorted(["bb","a","ccc"], key=lambda s: len(s))` -> `['a', 'bb', 'ccc']`; doc pairs sorted by name -> `[(4, 'four'), (1, 'one'), (3, 'three'), (2, 'two')]`.
- `partial(add, 10)(5)` -> `15`. `lru_cache(maxsize=None)` fib(30) -> `832040`, `CacheInfo(hits=28, misses=31, maxsize=None, currsize=31)`. Unhashable arg `[1]` -> `TypeError: unhashable type: 'list'`.
- Module re-import: `import demo` twice printed "demo executing" once; `"demo" in sys.modules` True and same object; `importlib.import_module("demo")` also cached; `importlib.reload(demo)` re-ran it.

Caveats:
- Error message wording is CPython-version specific (the UnboundLocalError text is 3.11+ style); assert on exception type in tests, not message text.
- Docs example output for `__annotations__` shows a different key order than 3.13 (3.13 prints declared order `h, e, return`); do not assert dict order. TODO-VERIFY behaviour on Python 3.14+ (deferred annotations).
- Tutorial statement on `sys.modules` was not found on the Modules page (page summary said not mentioned); `sys.modules` caching is confirmed by local run only. TODO-VERIFY against the import system reference (docs.python.org/3/reference/import.html).
- Pyodide's Python version may differ from 3.13; re-check messages there.
