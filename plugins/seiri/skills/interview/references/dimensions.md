# Interview Dimensions

Clarity is not one axis. Read the request along these, and each round aim the
next questions at whichever is least clear — not the one that is easiest to ask
about.

| Dimension | What it pins down | Weak when (observable) |
|-----------|-------------------|------------------------|
| Goal | what actually happens, and to what | you cannot state the objective in one sentence; the core nouns and verbs keep shifting |
| Constraints | the boundaries and non-goals | you cannot name what is out of scope, or which existing behaviour must not change |
| Success | how anyone would know it worked | you cannot write a check that would fail on the wrong outcome |
| Context (brownfield only) | how it joins the system already here | you cannot say where it attaches, or which existing pattern it extends or diverges from |

The "weak when" column is the whole point: it is how you tell which dimension
is weakest without scoring anything. A dimension is weak when its row is true
right now.

## Question shapes by dimension

Aim the shape at the weak dimension. Examples describe behaviour, not a
specific stack — keep them language-neutral.

- **Goal** — "What exactly happens when someone does this the first time?"
  Turn a vague verb like "manage" or "handle" into a concrete first action.
- **Constraints** — "What is out of bounds here? What must keep working,
  untouched?" Surface the invariant other code depends on.
- **Success** — "If I showed you the finished thing, what would make you say
  'yes, that's it'?" Push until the answer is something a check could fail on.
- **Context (brownfield)** — cite the repo first: "I found <pattern> at
  <path>. Does this extend that, or deliberately diverge?" Never ask the user
  what the code already answers.

## Aiming each round

- Pick the single weakest dimension. Ask its shape. In one line, say why that
  dimension is the bottleneck right now — that line is for the user, not you.
- A question exposes an ASSUMPTION; it does not collect a feature list. "What
  are you taking for granted here?" beats "what else should it do?".
- When the scope has several independent parts, track each part's clarity on
  its own. One part being sharp must not hide a sibling's fog — a request with
  four subsystems is not done because one of them is clear.
