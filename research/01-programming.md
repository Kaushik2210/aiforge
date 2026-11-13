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

## Classes and exceptions (Day 18)
verifiedOn: 2026-11-12. Fetched 2026-11-12 (paraphrased; page summaries via fetch tool). Local run: CPython 3.13.7. The docs.python.org/3 pages served as "3.15.2 documentation" at fetch time; the built-in hierarchy listed there includes entries newer than 3.13 (for example ImportCycleError, PythonFinalizationError), so do not teach those as 3.13 facts. TODO-VERIFY version notes if they are mentioned.

Sources
- https://docs.python.org/3/tutorial/classes.html
- https://docs.python.org/3/tutorial/errors.html
- https://docs.python.org/3/reference/datamodel.html
- https://docs.python.org/3/library/exceptions.html (served at /3/builtins/exceptions.html)
- https://docs.python.org/3/library/dataclasses.html
- https://docs.python.org/3/library/functions.html (property entry)

Documented claims
- Instantiation makes an empty object, then `__init__` customizes it. First method parameter, by convention `self`, is the instance passed implicitly.
- Class variables are shared by all instances; instance variables are per instance. The tutorial's Dog example shows a class-level `tricks = []` shared by every dog; fix is `self.tricks = []` in `__init__`.
- A function found on the class is turned into a bound method on instance access; `x.f()` equals `MyClass.f(x)`.
- Inheritance: `Derived(Base)`; lookup walks the base chain; overriding allowed. Cooperative `super()` follows the MRO. `isinstance(obj, C)` is true for instances of C or subclasses; `issubclass(A, B)` tests class inheritance.
- Single leading underscore = non-public by convention only. Two leading underscores (at most one trailing) triggers name mangling to `_classname__name`. Not real privacy.
- Iterators/generators: pointer only (`__iter__`, `__next__`, `StopIteration`, `yield`).
- try clauses order: try, except(s), else, finally. Catch specific exceptions; `Exception` is the broad but still bounded catch; BaseException also covers SystemExit and KeyboardInterrupt.
- Implicit chaining stores the handled exception in `__context__`; `raise X from Y` sets `__cause__`; `from None` suppresses display of the context.
- Custom exceptions derive from Exception (not BaseException), names usually end in "Error".
- ExceptionGroup/`except*`: pointer only. `with` gives predefined clean-up (for example files) on success or failure.
- Data model: `__repr__` is the "official" string (used by repr()); `__str__` is used by str(), print() and default format; if only `__repr__` is defined it serves as the informal string too; default `__str__` calls `__repr__`.
- Defining `__eq__` without `__hash__` sets `__hash__` to None (unhashable). Truthiness: `__bool__`, else `__len__` (zero is false), else always true. `__enter__` value binds to `as`; `__exit__(type, value, tb)` returning true suppresses the exception.
- dataclass generates `__init__`, `__repr__`, `__eq__`; mutable defaults (list, dict, set) raise ValueError, use `field(default_factory=list)`. With eq=True and frozen=False, `__hash__` is set to None.
- `@property` makes a getter; without a setter, assignment fails.
- Hierarchy: BaseException > Exception > {ArithmeticError > ZeroDivisionError, LookupError > {IndexError, KeyError}, OSError > FileNotFoundError, ValueError, TypeError, AttributeError, StopIteration}; KeyboardInterrupt, SystemExit, GeneratorExit sit directly under BaseException.

Confirmed local outputs (3.13.7)
- Dog-style class list: `b.tricks` shows `['roll']` after `a.add('roll')`; `a.tricks is b.tricks` is True.
- Class attr x=1; `c.x = 2` gives c.x 2, C.x 1, new instance 1 (shadowing).
- `Account.deposit(acct, 5)` and `acct.deposit(5)` both mutate: balance 10; `type(acct.deposit).__name__` is `method`.
- A->B->D with `super().__init__()` prints "A init, B init, D init"; instance vars `{'a': 1, 'b': 2}`. isinstance(d, A) True, issubclass(D, A) True, isinstance(A(), D) False.
- `self.__x` stored as `_P__x`; `self._y` stays `_y`.
- Only `__repr__`: print, repr, f-string, list all show repr text. With both: print/f-string use `__str__`, repr and list printing use `__repr__` (`[O-repr]`).
- `__eq__` only: `E.__hash__` is None; `hash(e)` and `{e}` raise TypeError.
- bool: `__len__` 0 gives False; `__bool__` False wins over `__len__` 5; plain object True.
- try/except/else/finally: no error prints try, else, finally; ZeroDivisionError prints try, except, finally. `return` in try still runs finally first ("try", "finally", then "try-ret"); `return` in finally overrides the try return (returns 'finally').
- `raise ValueError from z`: `__cause__` is ZeroDivisionError, `__context__` ZeroDivisionError, `__suppress_context__` True. Plain raise inside except: `__cause__` None, `__context__` ZeroDivisionError, suppress False. `from None`: cause None, context still set, suppress True.
- `except BaseException`/bare `except:` caught KeyboardInterrupt; `except Exception` let it escape. `issubclass(KeyboardInterrupt, Exception)` False.
- Custom NotFound(AppError(Exception)): first matching except wins in written order; subclass first prints NotFound, AppError, then Exception for ValueError.
- `int('x')` raises ValueError; `{}['k']` KeyError with `args == ('k',)`, str is `'k'` (with quotes); ZeroDivisionError for 1/0 and is an ArithmeticError; FileNotFoundError is an OSError (errno 2 on this Windows box, platform dependent); `next(iter([]))` raises StopIteration.
- dataclass: `Pt(1)` repr `Pt(x=1, y=0)`; eq True for same fields; `Pt.__hash__` None. `xs: list = []` raises ValueError at class definition; `default_factory=list` gives separate lists.
- property without setter: assignment raises AttributeError (message "property 'r' of 'T' object has no setter").

Caveats
- Exception message wording is version-specific (the property message and dataclass ValueError text have changed across releases; Pyodide may differ). Tests and checkers should assert exception types, not messages.
- `except` ordering: put subclasses before superclasses, or the subclass handler never runs.
- Tutorial/reference claims above come from fetch-tool page summaries, not verbatim reading; wording is mine. TODO-VERIFY exact phrasing before quoting anything.

## Runner Python version (Day 21 consolidation)

- AIForge's bundled Pyodide runs Python 3.14.2 (`sys.version`, checked 2026-11-13 by loading the
  package in `packages/runner`). Local development used 3.13.7 and CI uses 3.12.
- `pnpm verify` runs every challenge (starter, solution, hidden tests and every mutant) in this
  Pyodide through `packages/runner`, so all challenge content is known to pass on 3.14 as well.
- Confirmed by running it there: `return` inside `finally` emits `SyntaxWarning: 'return' in a
  'finally' block` (this resolves the Day 18 note). The docs (PEP 765) were not re-read for the
  exact version rule; do not quote a version rule beyond "3.14 warns".

## Iterators and generators (Day 21)

verifiedOn 2026-11-13. All pages fetched 2026-11-13 from docs.python.org/3 (the live docs
were the 3.15.2 build; local runs below on CPython 3.13.7). Paraphrased, not quoted.

Sources:
- https://docs.python.org/3/tutorial/classes.html (9.8 Iterators, 9.9 Generators, 9.10 Generator Expressions)
- https://docs.python.org/3/glossary.html (iterable, iterator, generator, generator iterator)
- https://docs.python.org/3/library/stdtypes.html (Iterator Types, Generator types, Ranges)
- https://docs.python.org/3/library/itertools.html and /library/functions.html
- https://docs.python.org/3/reference/expressions.html (6.2.8 Yield expressions)
- https://docs.python.org/3/library/exceptions.html (StopIteration)
- https://docs.python.org/3/whatsnew/3.3.html (PEP 380)

Docs facts (verified):
- `for` calls `iter()` on the container; the iterator's `__next__()` hands out items and raises
  `StopIteration` at the end, which ends the loop. A class makes itself iterable by defining
  `__iter__` returning an object with `__next__`; if the class has `__next__`, `__iter__` may return `self`.
- Generators are written like functions with `yield`; each `next()` resumes where it left off,
  with locals and execution state saved. `__iter__`/`__next__` are created automatically and
  `StopIteration` is raised on termination. Tutorial: anything a generator does a class-based iterator can do.
- Generator expressions: like list comprehensions with parentheses; meant for immediate use by
  an enclosing function, and tend to use less memory than the equivalent list comprehension. Sole-argument calls need no extra parentheses.
  Tutorial examples: `sum(i*i for i in range(10))` -> 285; `sum(x*y for x,y in zip(xvec, yvec))` -> 260.
- Glossary: iterable = can return members one at a time (sequences, dict, files, classes with
  `__iter__`/`__getitem__`); `iter()` on an iterable gives an iterator good for a single pass.
  Iterator = stream of data; once exhausted, further `__next__` keep raising `StopIteration`.
  Iterators must have `__iter__` returning themselves, so every iterator is iterable; the notable
  exception is multi-pass code. A container yields a fresh iterator each time; an iterator
  returns the same exhausted object, so it looks like an empty container. Glossary says CPython
  does not consistently enforce the `__iter__` requirement.
- Glossary has NO entry for lazy (checked); do not cite it. Generator informally means generator
  function or generator iterator. Generator iterator = made by a generator function or generator expression.
- stdtypes: container `__iter__` returns an iterator; iterator `__iter__` returns itself;
  after `StopIteration`, an iterator must keep raising it (otherwise it is considered broken).
- Yield expressions (language ref): calling a generator function returns a generator and runs
  nothing until a generator method is called; also documents `send()`, `throw()`, `close()`
  (pointers only for Day 21). `yield from` added in 3.3 (PEP 380): delegate to a subiterator;
  for simple iterables it is shorthand for `for x in it: yield x`; subgenerator `return` value
  becomes the expression's value.
- `StopIteration.value` carries a generator's return value (3.3). A `StopIteration` raised inside a
  generator becomes `RuntimeError` (opt-in 3.5, default 3.7, PEP 479).
- Built-ins: `next(it, default)` returns default when exhausted. `zip`, `map`, `filter`,
  `enumerate` return iterators and are lazy. `zip` stops at the shortest. `range` is an
  immutable sequence (stdtypes). `map(..., strict=)` is new in 3.14; `zip(strict=)` is 3.10 per
  my memory (TODO-VERIFY, not re-read).
- itertools: building blocks forming an "iterator algebra"; `count(start=0, step=1)` infinite;
  `islice` has no negative values, and consuming it advances an iterator input by max(start, stop);
  `takewhile` consumes (and loses) the first failing element; `chain(*iterables)`.
  `batched(iterable, n, *, strict=False)`: Added in 3.12; `strict` added in 3.13. Tuples of
  length n, last may be shorter; input consumed lazily.

Confirmed outputs (Python 3.13.7):
- Generator list twice: `[0, 1, 4]` then `[]`. List twice: same both times.
- `iter(list) is list` -> False; `iter(gen) is gen` -> True.
- `next(exhausted_gen)` -> `StopIteration` (empty args, value None); `next(g, 'dflt')` -> 'dflt'.
- Calling a generator function prints nothing; the body prints only at first `next()`.
- `return 'done'` in a generator -> `StopIteration.value == 'done'`; `list()` ignores it.
- Genexp with print side effect: nothing printed at creation, prints during consumption;
  list comprehension prints at creation. `sum(x*x for x in range(5))` -> 30.
- `islice(count(), 5)` -> [0,1,2,3,4]; `count(10,5)` first 3 -> [10,15,20].
- islice on an iterator/generator consumes it: two `islice(g,3)` give [0,1,2] then [3,4,5].
- `zip(a, b)` with a=iter([1,2,3]), b=iter('xy') -> [(1,'x'),(2,'y')]; `list(a)` afterwards is
  `[]` (a lost 3 while zip discovered b was empty). Swapped as `zip(b, a)` leaves `[3]`.
- `map` object: `iter(m) is m` True; second `list(m)` -> `[]`.
- `range(3)` re-iterable; `iter(range(3)) is range(3)` False; `type(iter(range(3)))` is `range_iterator`.
- `yield from`: `[0, 1, 2, 'a', 9]` with subgenerator return value 'ret' captured.
- Late binding: `[lambda: i for i in range(3)]` called later -> `[2, 2, 2]` (only if natural).
- `raise StopIteration` in generator -> `RuntimeError: generator raised StopIteration`,
  `__cause__` is the StopIteration. Message wording is version-specific; assert on type not text.
- Generator function validating args: `pos_gen(-1)` creates fine, ValueError only at first `next()`.
  A plain wrapper that validates then returns an inner generator raises immediately.
- `batched('ABCDEFG', 3)` -> ABC, DEF, G tuples; `batched([], 2)` -> empty.
  `batched('abc', 0)` raises `ValueError` AT CALL TIME ("n must be at least one"), not at first
  next (the docs' pseudo-code is a generator, which would suggest lazy; real C impl is eager).
  `strict=True` with a short last batch raises ValueError while iterating ("batched(): incomplete batch").
- Memory: list of 1,000,000 ints is megabytes (getsizeof counts only the list's pointer array);
  generator object is a few hundred bytes; ratio ~4e4. Say "orders of magnitude" only; no exact numbers.
  Caveat: getsizeof is shallow.
