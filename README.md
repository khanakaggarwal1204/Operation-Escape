# Operation Escape

This repository contains the character artwork, a complete illustrated scene
pack, and a Source Academy prototype for the Operation Escape story flow.

## Run the prototype

1. Open Source Academy.
2. Select **Source §4**.
3. Enable the `arcade_2d` module.
4. Copy the contents of [`src/operation_escape_story.js`](src/operation_escape_story.js)
   into the editor and run it.

The code loads its 800 x 600 scene art from
[`assets/scenes/runtime`](assets/scenes/runtime). These files must be committed
to the repository before the raw GitHub URLs used by Source Academy will work.
Until then, the built-in geometric scene drawings remain as a fallback.

The prototype uses an 800 x 600 canvas and mouse-only point-and-click controls.

## Implemented scenes

- Title screen;
- Police Archives investigation;
- Optional Memory Palace tutorial;
- Kidnapping transition;
- Attic item collection and fixed item combination;
- Attic corridor transition;
- Grand Hall hub;
- Room 1 and Room 2 integration placeholders;
- Four-statue placement mechanism;
- Random password slip for the hidden route;
- Underground Laboratory investigation;
- Optional laboratory deductions;
- Hidden safe and Commissioner deduction;
- Vale confrontation;
- Timed fire escape;
- Normal and hidden endings.

The illustrated backgrounds include the Room 1 study and Room 2 library.
See [`docs/scene-art-map.md`](docs/scene-art-map.md) for reuse and overlay rules.

## Progress model

The prototype deliberately keeps three forms of progress separate:

1. **Exploration:** controlled by keys, doors and physical mechanisms;
2. **Evidence:** controlled by files and records the player collects;
3. **Cognition:** controlled by optional Memory Palace deductions.

Memory Palace deductions do not block the normal route. A player can collect
the physical laboratory evidence and reach the normal ending without completing
every deduction. The hidden ending requires the player to open the safe and then
connect the photograph, correspondence and Commissioner inside the Memory Palace.

See [`docs/room-integration.md`](docs/room-integration.md) for the two merge hooks.
