# Spec Self-Review

After writing the shape down, read it once with fresh eyes before handing it
off. Fix what you find inline — no second review pass, just fix and move on.

- **Placeholders** — any "TBD", "TODO", or section left vague? Fill it or cut
  it. A placeholder in a spec becomes a guess in the implementation.
- **Internal consistency** — do any two parts contradict each other? Does the
  shape still match the goal you opened with, or did it drift while you worked?
- **Scope** — is this focused enough for one implementation pass, or is it
  quietly two projects? If two, name the split rather than hiding it.
- **Ambiguity** — could any line be read two ways? If so, pick one reading and
  make it explicit. The reader will not ask which you meant; they will guess.

This review catches what fresh questions cannot: a spec can be internally wrong
even when every answer that built it was right. The questions test your
understanding of the request; this tests the document against itself.
