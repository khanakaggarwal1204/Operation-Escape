# Scene art map

The game uses 800 x 600 runtime PNGs from `assets/scenes/runtime`. High-resolution
masters are kept one directory above them. Interactive controls, dialogue panels,
evidence markers and puzzle highlights are drawn by `arcade_2d` over the images.

| Game state | Runtime image | Notes |
| --- | --- | --- |
| Title | `title_caseboard.png` | Blank case board leaves room for the title and start button. |
| Police Archives | `police_archives.png` | Four coloured files match the tutorial evidence set. |
| Archive kidnapping | `police_archives.png` | Reused with a dark overlay and attacker silhouette. |
| Memory Palace tutorial | `memory_palace.png` | Blank cards are filled by the code UI. |
| Attic storage | `attic_storage.png` | Door crack, hanger and pliers align with click hotspots. |
| Attic corridor | `attic_corridor.png` | Locked door, damaged portrait, boards and staircase remain inspectable. |
| Grand Hall | `grand_hall_flat_v2.png` | Hub for Room 1, Room 2, statues, laboratory and exit. |
| Room 1: Vale's Study | `vale_study_room1.png` | Supports the CASE/MOON, bookshelf and chest-code puzzles. |
| Room 2: Library at 11:45 | `blackwood_library_room2.png` | Includes stopped clock, archive cabinet and case evidence. |
| Statue mechanism | `grand_hall_flat_v2.png` | Reused under the four-slot puzzle overlay. |
| Underground Laboratory | `mnemosyne_laboratory.png` | Evidence records, memory chair, wall safe and emergency exit. |
| Laboratory deductions | `memory_palace.png` | Reused under the optional deduction interface. |
| Safe and confrontation | `mnemosyne_laboratory.png` | Reused with safe/dialogue overlays. |
| Fire escape and endings | `vale_manor_burning.png` | Reused for the timed escape and both endings. |

## Source Academy loading

`src/operation_escape_story.js` loads images through `create_sprite` from the
repository's raw GitHub URL. Upload `assets/scenes/runtime` together with the
source file. If the repository or branch changes, update `SCENE_ART_BASE` near
the top of the source file.

`room_stub_mode === 0` displays the Room 1 image and `room_stub_mode === 1`
displays Room 2. The current completion hooks remain `finish_study_module()` and
`finish_library_module()` when the full room puzzle modules are merged.
