# Room 1 and Room 2 integration

`src/operation_escape_story.js` currently shows a development placeholder when
the player enters Vale's Study or the Library at 11:45. These placeholders make
the rest of the story independently testable while the existing room code is
kept unchanged.

The placeholders now use the final illustrated Room 1 and Room 2 backgrounds,
so the completed puzzle code can preserve the same scene composition. Only the
temporary completion button and explanatory copy need to be replaced.

When the existing rooms are merged into the same Source Academy program:

- Enter the Room 1 scene from the Grand Hall's **Vale's Study** door.
- Call `finish_study_module()` when Room 1 is complete.
- Enter the Room 2 scene from the Grand Hall's **Library 11:45** door.
- Call `finish_library_module()` when Room 2 is complete.

The completion hooks award the story items expected by the new outline:

| Room module | Awarded statues | Result |
| --- | --- | --- |
| Vale's Study | Owl and Hound | Unlocks the Library route |
| Library at 11:45 | Stag and Serpent | Enables the statue mechanism |

The Grand Hall, statue puzzle, laboratory, confrontation and endings do not need
to know the internal puzzle state of either room. They only read these completion
flags and awarded items.

The placeholder button labelled **Simulate Module Completion** must be removed
after the actual room scenes are connected.
