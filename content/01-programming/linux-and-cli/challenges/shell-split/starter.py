def shell_split(line):
    """Split a command line into a list of arguments using POSIX sh quoting rules.

    This is a SUBSET of what a shell does. It only does the quoting and the
    splitting. It does no expansion at all: no $VAR, no ${...}, no `...`, no ~,
    no * ? [ globbing, no brace expansion, no redirection, no pipes, no ; & | and
    no comments. A "#" is an ordinary character here (a real shell treats a "#"
    at the start of a word as the start of a comment, this function does not).

    line  a str. Anything else raises TypeError.

    Rules, from left to right:
    - Separators: unquoted space, tab and newline. A run of them counts as one
      separator, and leading or trailing ones are ignored. Other whitespace such
      as "\\r", "\\x0b" or a non-breaking space is an ordinary character.
    - Single quotes: everything up to the next single quote is literal. That
      includes backslashes, $, double quotes, spaces and newlines.
    - Double quotes: everything up to the closing double quote is literal except
      the backslash. Inside double quotes a backslash escapes ONLY these five
      characters:  \\  "  $  `  and newline. "\\\\" gives one backslash, "\\"" gives a
      double quote, "\\$" gives a dollar sign, "\\`" gives a backtick, and a
      backslash followed by a newline is removed completely (line continuation).
      A backslash before any other character stays, and so does that character:
      "a\\qb" gives a\\qb.
    - Unquoted backslash: it escapes the next character, which is kept literally
      (so "a\\ b" is one argument "a b"). A backslash followed by a newline is
      removed completely: it does not separate arguments and it does not start
      one ("a\\<newline>b" gives "ab"; "a \\<newline> b" gives "a" and "b").
    - Adjacent pieces join into ONE argument: "a"'b'c gives abc.
    - A quoted empty string ('' or "") is a real, empty argument: a '' b gives
      ["a", "", "b"]. Quotes that only surround nothing next to other text, such
      as a'' , add nothing: ["a"].
    - Quotes and backslashes are removed from the result.
    - Simplifications compared with a real shell: an unquoted newline is a plain
      separator (a shell would end the command), and "$'...'" is not special
      (bash and POSIX 2024 give it a meaning). Here $ is always an ordinary character.

    Errors (ValueError):
    - an unterminated single or double quote: the message must contain the word
      "quote" (any capitalisation). A double-quoted string that ends right after a
      backslash is also unterminated.
    - an unquoted backslash as the very last character of the line: the message
      must contain the word "backslash".

    Examples (shown with Python string literals):
        shell_split("a  b")             -> ["a", "b"]
        shell_split("grep -r 'a b' .")  -> ["grep", "-r", "a b", "."]
        shell_split('say "hi $USER"')   -> ["say", "hi $USER"]
        shell_split("a\\\\ b")            -> ["a b"]
        shell_split("''")               -> [""]
        shell_split("'oops")            -> raises ValueError
    """
    # TODO: walk the string one character at a time. Keep a list of finished
    # arguments, a list of characters for the current one, and a flag that says
    # "an argument has started" (so that '' can make an empty argument).
    raise NotImplementedError("implement shell_split")
