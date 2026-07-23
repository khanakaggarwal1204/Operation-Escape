import {
    create_rectangle,
    create_circle,
    create_triangle,
    create_text,
    create_sprite,
    create_audio,
    play_audio,
    update_position,
    update_color,
    update_rotation,
    update_scale,
    query_position,
    query_color,
    query_pointer_position,
    input_key_down,
    input_left_mouse_down,
    set_dimensions,
    set_fps,
    get_loop_count,
    update_loop,
    build_game
} from "arcade_2d";

// ================================================================
//  OPERATION ESCAPE - ILLUSTRATED FRONTEND EDITION
//  The three playable locations use illustrated room backgrounds and
//  a four-direction detective walk cycle. Puzzle logic and clickable
//  interactions remain code-driven.
//  Scene 1: Title screen (goofy detective corkboard menu)
//  Scene 2: Room Select (mysterious hallway with 4 doors)
//  Scene 3: Room 1 - The Detective's Study (puzzle-gated escape room)
//  Scene 4: Room 2 - The Blackwood Library (FULL REBUILD: a slow,
//           cinematic "case file" briefing followed by a free-roam
//           murder-scene investigation with a Detective Notebook.
//           No cartoon character animation - deliberately still,
//           atmospheric, and serious.)
//
//  IMPORTANT - how scene switching works in this API:
//  arcade_2d has no "delete gameobject" function, so every object
//  for every scene is created once, up front. Switching scenes
//  does NOT create/destroy anything - it just shoves the previous
//  scene's objects far off-screen and fades them to alpha 0, then
//  brings the new scene's objects back on-screen at full alpha.
//  See hide_scene() / show_scene() / change_scene() below.
//
//  Because there is also no update_text(), all dialogue AND all
//  puzzle UI (tiles, options, digits, and the typed-answer letters)
//  are fixed, pre-made text objects whose CONTENT never changes -
//  only their position/color/alpha is toggled at runtime. Every
//  gameobject in this file is created exactly once, up front,
//  during the "ASSEMBLE ALL SCENES" section below - none are ever
//  created inside update_loop. Room 2's typewriter effect uses this
//  same trick: every "how many words have been typed so far" stage
//  of every line is a separate pre-made text object, and only one
//  of them is ever shown at a time.
//
//  NOTE: Source Academy's language does not support JS object
//  literals ({ key: value }) or dot-notation property access on
//  them. All "records" in this file (doors, candles, room state,
//  puzzle tiles, characters, clues, etc.) are plain arrays accessed
//  by index, with named index constants used where it helps
//  readability (see ST_* and CH_* below).
// ================================================================

const SCREEN_WIDTH = 800;
const SCREEN_HEIGHT = 600;
set_dimensions([SCREEN_WIDTH, SCREEN_HEIGHT]);

const FPS = 30;
set_fps(FPS);

const OFFSCREEN_X = 6000; // far enough that it can never be hovered/seen

// Pinned to the asset commit so the Source Academy version keeps
// working even if the repository branch changes later.
const ILLUSTRATED_ASSET_ROOT =
    "https://raw.githubusercontent.com/khanakaggarwal1204/Operation-Escape/" +
    "a3692c0a8e0523c3e7f1bc788e8bfabbdc99e015/assets/illustrated/";
const ROOM1_BACKGROUND_URL = ILLUSTRATED_ASSET_ROOT + "room1.png";
const ROOM2_BACKGROUND_URL = ILLUSTRATED_ASSET_ROOT + "room2.png";
const ROOM3_BACKGROUND_URL = ILLUSTRATED_ASSET_ROOT + "room3.png";

const DETECTIVE_FRAME_URLS = [
    [ILLUSTRATED_ASSET_ROOT + "detective_down_0.png",
     ILLUSTRATED_ASSET_ROOT + "detective_down_1.png",
     ILLUSTRATED_ASSET_ROOT + "detective_down_2.png"],
    [ILLUSTRATED_ASSET_ROOT + "detective_left_0.png",
     ILLUSTRATED_ASSET_ROOT + "detective_left_1.png",
     ILLUSTRATED_ASSET_ROOT + "detective_left_2.png"],
    [ILLUSTRATED_ASSET_ROOT + "detective_right_0.png",
     ILLUSTRATED_ASSET_ROOT + "detective_right_1.png",
     ILLUSTRATED_ASSET_ROOT + "detective_right_2.png"],
    [ILLUSTRATED_ASSET_ROOT + "detective_up_0.png",
     ILLUSTRATED_ASSET_ROOT + "detective_up_1.png",
     ILLUSTRATED_ASSET_ROOT + "detective_up_2.png"]
];

const DETECTIVE_DOWN = 0;
const DETECTIVE_LEFT = 1;
const DETECTIVE_RIGHT = 2;
const DETECTIVE_UP = 3;
const DETECTIVE_SCALE = 0.72;

// ----------------------------------------------------------------
//  generic creation helpers - every helper takes a "list" as its
//  first argument. Pass a scene's entry list to register the new
//  object with that scene (so it can be hidden/shown later), or
//  pass undefined for a one-off object that never needs hiding.
// ----------------------------------------------------------------
function reg(list, obj) {
    if (list !== undefined) {
        const col = query_color(obj);
        list[array_length(list)] = [obj, col[0], col[1], col[2], col[3]];
    }
    return obj;
}

function make_rect(list, x, y, w, h, r, g, b, a) {
    const rect = create_rectangle(w, h);
    update_position(rect, [x, y]);
    update_color(rect, [r, g, b, a]);
    return reg(list, rect);
}

function make_circle(list, x, y, radius, r, g, b, a) {
    const circ = create_circle(radius);
    update_position(circ, [x, y]);
    update_color(circ, [r, g, b, a]);
    return reg(list, circ);
}

function make_triangle(list, x, y, w, h, r, g, b, a) {
    const tri = create_triangle(w, h);
    update_position(tri, [x, y]);
    update_color(tri, [r, g, b, a]);
    return reg(list, tri);
}

function make_text(list, x, y, text, scale, r, g, b, a) {
    const t = create_text(text);
    update_position(t, [x, y]);
    update_scale(t, [scale, scale]);
    update_color(t, [r, g, b, a]);
    return reg(list, t);
}

function make_sprite(list, x, y, url, scale_x, scale_y, alpha) {
    const sprite = create_sprite(url);
    update_position(sprite, [x, y]);
    update_scale(sprite, [scale_x, scale_y]);
    update_color(sprite, [255, 255, 255, alpha]);
    return reg(list, sprite);
}

function make_scene_background(list, url) {
    return make_sprite(list, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2,
        url, 1, 1, 255);
}

function hide_entries_permanently(list) {
    for (let i = 0; i < array_length(list); i = i + 1) {
        const obj = list[i][0];
        update_position(obj, [OFFSCREEN_X, -OFFSCREEN_X]);
        set_alpha(obj, 0);
    }
    return undefined;
}

// ----------------------------------------------------------------
// STYLIZED NOIR ART KIT
//
// A high-contrast side-view stage: hard-edged vector silhouettes,
// warm interiors, mechanical rails, and red/orange investigation UI.
// Decorative shapes are kept separate from puzzle hitboxes.
// ----------------------------------------------------------------
const CUTOUT_INK = [11, 16, 22];
const CUTOUT_CREAM = [235, 222, 198];
const CUTOUT_TAN = [190, 162, 139];
const CUTOUT_BROWN = [91, 59, 52];
const CUTOUT_TEAL = [39, 74, 77];
const CUTOUT_BLUE = [44, 82, 107];
const CUTOUT_RED = [218, 41, 25];
const CUTOUT_YELLOW = [255, 171, 25];
const CUTOUT_GREEN = [68, 111, 58];
const CUTOUT_PURPLE = [80, 45, 68];

function make_cutout_rect(list, x, y, w, h, r, g, b, a, tilt) {
    const shadow = make_rect(list, x + 5, y + 6, w + 8, h + 8, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], a);
    const paper = make_rect(list, x, y, w, h, r, g, b, a);
    update_rotation(shadow, tilt);
    update_rotation(paper, tilt);
    return paper;
}

function make_cutout_circle(list, x, y, radius, r, g, b, a) {
    make_circle(list, x + 4, y + 5, radius + 4, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], a);
    return make_circle(list, x, y, radius, r, g, b, a);
}

function draw_paper_speckles(list, count, min_x, max_x, min_y, max_y, r, g, b) {
    for (let i = 0; i < count; i = i + 1) {
        const x = min_x + math_random() * (max_x - min_x);
        const y = min_y + math_random() * (max_y - min_y);
        make_circle(list, x, y, 1 + math_random() * 1.5, r, g, b, 35);
    }
    return undefined;
}

// The room is presented like a cutaway theatre set. Dark engineering
// bands and repeating rail sleepers frame the playable space.
function draw_stage_frame(list) {
    make_rect(list, SCREEN_WIDTH / 2, 22, SCREEN_WIDTH, 44,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, SCREEN_WIDTH / 2, 48, SCREEN_WIDTH, 9, 61, 67, 75, 255);
    make_rect(list, SCREEN_WIDTH / 2, 557, SCREEN_WIDTH, 12, 64, 72, 82, 255);
    make_rect(list, SCREEN_WIDTH / 2, 584, SCREEN_WIDTH, 32,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, 8, SCREEN_HEIGHT / 2, 16, SCREEN_HEIGHT,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, SCREEN_WIDTH - 8, SCREEN_HEIGHT / 2, 16, SCREEN_HEIGHT,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);

    for (let i = 0; i < 13; i = i + 1) {
        const sx = 28 + i * 63;
        make_rect(list, sx, 48, 39, 5, 123, 126, 132, 255);
        make_rect(list, sx, 557, 39, 6, 123, 126, 132, 255);
        make_circle(list, sx - 18, 22, 2.5, 122, 126, 133, 255);
        make_circle(list, sx + 18, 22, 2.5, 122, 126, 133, 255);
    }
    return undefined;
}

// A thin rotated rectangle stretched between two points - used for
// the red "conspiracy yarn" strings on the title-screen corkboard.
function make_string(list, x1, y1, x2, y2, r, g, b, a, thickness) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = math_sqrt(dx * dx + dy * dy);
    const angle = math_atan2(dy, dx);
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const line = make_rect(list, mx, my, length, thickness, r, g, b, a);
    update_rotation(line, angle);
    return line;
}

// Reads an object's current color and re-applies it with a new
// alpha only - used constantly by Room 2's typewriter/notebook code
// so we never accidentally clobber a stored r/g/b while fading.
function set_alpha(obj, a) {
    const c = query_color(obj);
    update_color(obj, [c[0], c[1], c[2], a]);
}

function pointer_in_rect(x, y, width, height) {
    const pointer = query_pointer_position();
    return pointer[0] >= x - width / 2 &&
        pointer[0] <= x + width / 2 &&
        pointer[1] >= y - height / 2 &&
        pointer[1] <= y + height / 2;
}

function pointer_in_circle(x, y, radius) {
    const pointer = query_pointer_position();
    const dx = pointer[0] - x;
    const dy = pointer[1] - y;
    return dx * dx + dy * dy <= radius * radius;
}

// A shared, visible mouse button. Keyboard shortcuts remain available,
// but every required action now has an on-screen point-and-click path.
// Record: [box, label, base RGB, hover RGB, shadow, x, y, width, height]
function make_mouse_button(list, x, y, w, h, label, scale, alpha) {
    const opacity = alpha;
    const box = make_rect(list, x + 4, y + 5, w + 8, h + 8, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], opacity);
    const face = make_rect(list, x, y, w, h, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], opacity);
    const text = make_text(list, x, y, label, scale, 255, 255, 255, opacity);
    return [face, text, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], box, x, y, w, h];
}

function update_mouse_button(button) {
    const hovered = pointer_in_rect(button[9], button[10], button[11], button[12]);
    update_color(button[0], hovered
        ? [button[5], button[6], button[7], 255]
        : [button[2], button[3], button[4], 255]);
    return hovered;
}

function mouse_button_clicked(button, clicked) {
    return update_mouse_button(button) && clicked;
}

function set_mouse_button_alpha(button, alpha) {
    set_alpha(button[0], alpha);
    set_alpha(button[1], alpha);
    set_alpha(button[8], alpha);
    return undefined;
}

// ----------------------------------------------------------------
//  scene manager - hide_scene / show_scene / change_scene
// ----------------------------------------------------------------
function hide_scene(list) {
    for (let i = 0; i < array_length(list); i = i + 1) {
        const e = list[i];
        const obj = e[0];
        const pos = query_position(obj);
        update_position(obj, [pos[0] + OFFSCREEN_X, pos[1]]);
        update_color(obj, [e[1], e[2], e[3], 0]);
    }
    return undefined;
}

function show_scene(list) {
    for (let i = 0; i < array_length(list); i = i + 1) {
        const e = list[i];
        const obj = e[0];
        const pos = query_position(obj);
        update_position(obj, [pos[0] - OFFSCREEN_X, pos[1]]);
        update_color(obj, [e[1], e[2], e[3], e[4]]);
    }
    return undefined;
}

let current_scene = "landing"; // "landing" | "room_select" | "room1" | "room2" | "room3"

let landing_entries = [];
let room_select_entries = [];
let room1_entries = [];
let room2_entries = [];
let room3_entries = [];

function scene_entries(name) {
    if (name === "landing") { return landing_entries; }
    if (name === "room_select") { return room_select_entries; }
    if (name === "room1") { return room1_entries; }
    if (name === "room2") { return room2_entries; }
    return room3_entries;
}

function change_scene(new_scene) {
    if (new_scene === current_scene) {
        return undefined;
    }
    hide_scene(scene_entries(current_scene));
    show_scene(scene_entries(new_scene));
    current_scene = new_scene;
    return undefined;
}

// ================================================================
//  SHARED INPUT EDGE-TRIGGER HELPERS
// ================================================================
let confirm_prev = false;
let esc_prev = false;
let mouse_prev = false;

function confirm_pressed_this_frame() {
    const down = input_key_down("Enter") || input_key_down(" ");
    const pressed = down && !confirm_prev;
    confirm_prev = down;
    return pressed;
}

function escape_pressed_this_frame() {
    const down = input_key_down("Escape");
    const pressed = down && !esc_prev;
    esc_prev = down;
    return pressed;
}

function mouse_clicked_this_frame() {
    const down = input_left_mouse_down();
    const clicked = down && !mouse_prev;
    mouse_prev = down;
    return clicked;
}

let digit_prev = [false, false, false, false, false, false, false, false, false, false];
const DIGIT_KEYS = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];

function pressed_digit_this_frame() {
    let result = -1;
    for (let d = 0; d < 10; d = d + 1) {
        const down = input_key_down(DIGIT_KEYS[d]);
        const pressed = down && !digit_prev[d];
        digit_prev[d] = down;
        if (pressed && result === -1) {
            result = d;
        }
    }
    return result;
}

// ================================================================
//  SCENE 1: LANDING / TITLE SCREEN
// ================================================================

function draw_room(list) {
    make_rect(list, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, SCREEN_WIDTH / 2, 225, 750, 350, 178, 160, 146, 255);
    make_rect(list, SCREEN_WIDTH / 2, 470, 750, 140, 69, 48, 47, 255);
    make_rect(list, SCREEN_WIDTH / 2, 397, 750, 12, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);

    for (let row = 0; row < 4; row = row + 1) {
        make_rect(list, SCREEN_WIDTH / 2, 92 + row * 82, 748, 2, 126, 108, 100, 110);
    }
    for (let beam = 0; beam < 8; beam = beam + 1) {
        make_rect(list, 70 + beam * 95, 470, 3, 140, 116, 84, 73, 150);
    }
    make_triangle(list, 180, 230, 280, 320, 242, 221, 193, 28);
    make_triangle(list, 650, 230, 280, 320, 242, 221, 193, 22);
    draw_stage_frame(list);

    return undefined;
}

function draw_landing_door_prop(list) {
    const door_x = SCREEN_WIDTH / 2;
    const door_top = 150;
    const door_height = 300;
    const door_width = 200;
    const door_y = door_top + door_height / 2;

    const parts = [];
    let n = 0;
    const track_part = (obj, x, y) => {
        parts[n] = [obj, x, y];
        n = n + 1;
        return obj;
    };

    track_part(make_rect(list, door_x + 7, door_y + 8, door_width + 38, door_height + 28, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255), door_x + 7, door_y + 8);
    track_part(make_rect(list, door_x, door_y, door_width + 24, door_height + 18, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255), door_x, door_y);
    track_part(make_rect(list, door_x, door_y, door_width, door_height, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255), door_x, door_y);
    track_part(make_rect(list, door_x, door_y - 60, door_width - 40, 100, 173, 48, 43, 255), door_x, door_y - 60);
    track_part(make_rect(list, door_x, door_y + 60, door_width - 40, 100, 173, 48, 43, 255), door_x, door_y + 60);

    const brace_1 = make_rect(list, door_x, door_y, door_width - 10, 12, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(brace_1, math_PI / 6);
    track_part(brace_1, door_x, door_y);

    const brace_2 = make_rect(list, door_x, door_y, door_width - 10, 12, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(brace_2, -math_PI / 6);
    track_part(brace_2, door_x, door_y);

    track_part(make_rect(list, door_x, door_y + door_height / 2 - 40, 50, 60, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255),
          door_x, door_y + door_height / 2 - 40);

    track_part(make_circle(list, door_x, door_y + door_height / 2 - 55, 8, 5, 5, 5, 255),
          door_x, door_y + door_height / 2 - 55);
    track_part(make_triangle(list, door_x, door_y + door_height / 2 - 40, 10, 16, 5, 5, 5, 255),
          door_x, door_y + door_height / 2 - 40);

    return parts;
}

function draw_one_candle(list, x, y, phase) {
    const glow = make_circle(list, x, y - 70, 45, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 55);
    make_rect(list, x, y + 20, 30, 14, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, x, y - 20, 18, 82, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    const flame_outer = make_triangle(list, x, y - 68, 18, 26, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    const flame_inner = make_triangle(list, x, y - 74, 9, 14, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    return [flame_outer, flame_inner, glow, phase];
}

function draw_candles(list) {
    const candle_1 = draw_one_candle(list, 130, 400, 0);
    const candle_2 = draw_one_candle(list, 670, 400, 3.1);
    return [candle_1, candle_2];
}

function draw_table(list) {
    const table_x = SCREEN_WIDTH / 2;
    const table_y = 470;

    make_rect(list, table_x - 70, table_y + 45, 18, 76, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, table_x + 70, table_y + 45, 18, 76, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_cutout_rect(list, table_x, table_y, 210, 30, CUTOUT_BROWN[0], CUTOUT_BROWN[1], CUTOUT_BROWN[2], 255, -0.01);

    return undefined;
}

function draw_key(list) {
    const key_x = SCREEN_WIDTH / 2;
    const key_y = 445;

    const parts = [];
    let n = 0;
    const track_part = (obj, x, y) => {
        parts[n] = [obj, x, y];
        n = n + 1;
        return obj;
    };

    track_part(make_circle(list, key_x, key_y, 40, 255, 230, 100, 70), key_x, key_y);
    track_part(make_circle(list, key_x - 25, key_y, 14, 210, 175, 60, 255), key_x - 25, key_y);
    track_part(make_circle(list, key_x - 25, key_y, 6, 60, 45, 15, 255), key_x - 25, key_y);
    track_part(make_rect(list, key_x + 5, key_y, 45, 6, 210, 175, 60, 255), key_x + 5, key_y);
    track_part(make_rect(list, key_x + 22, key_y + 8, 6, 12, 210, 175, 60, 255), key_x + 22, key_y + 8);
    track_part(make_rect(list, key_x + 32, key_y + 6, 6, 8, 210, 175, 60, 255), key_x + 32, key_y + 6);

    return parts;
}

function create_dust(list, count, min_y, max_y) {
    const dust = [];

    for (let i = 0; i < count; i = i + 1) {
        const base_y = min_y + math_random() * (max_y - min_y);
        const phase = math_random() * 1000;
        const speed = 12 + math_random() * 18;
        const start_x = math_random() * SCREEN_WIDTH;
        const radius = 2 + math_random() * 2;

        const speck = make_circle(list, start_x, base_y, radius, 210, 205, 190, 90);
        dust[i] = [speck, base_y, phase, speed, start_x];
    }

    return dust;
}

function animate_candles(candles, t) {
    for (let i = 0; i < array_length(candles); i = i + 1) {
        const c = candles[i];
        const flame_outer = c[0];
        const flame_inner = c[1];
        const glow = c[2];
        const phase = c[3];

        const flicker = 0.85 + 0.12 * math_sin(t * 9 + phase) + 0.05 * math_sin(t * 23 + phase * 1.7);
        update_scale(flame_outer, [flicker, flicker]);
        update_scale(flame_inner, [flicker * 1.05, flicker * 0.95]);

        const glow_pulse = 0.85 + 0.15 * math_sin(t * 5 + phase);
        update_scale(glow, [glow_pulse, glow_pulse]);
    }
    return undefined;
}

function animate_key(key_parts, t) {
    const float_offset = 8 * math_sin(t * 1.3);
    for (let i = 0; i < array_length(key_parts); i = i + 1) {
        const part = key_parts[i];
        update_position(part[0], [part[1], part[2] + float_offset]);
    }
    return undefined;
}

function animate_dust(dust, t) {
    for (let i = 0; i < array_length(dust); i = i + 1) {
        const d = dust[i];
        const speck = d[0];
        const base_y = d[1];
        const phase = d[2];
        const speed = d[3];
        const start_x = d[4];

        const x = (start_x + t * speed) % SCREEN_WIDTH;
        const y = base_y + 12 * math_sin(t * 0.6 + phase);

        update_position(speck, [x, y]);
    }
    return undefined;
}

function animate_landing_door_prop(door_parts, loop_count) {
    const period_frames = 10 * FPS;
    const shake_frames = math_round(0.5 * FPS);
    const cycle_pos = loop_count % period_frames;

    const shake_x = cycle_pos < shake_frames
        ? 6 * (1 - cycle_pos / shake_frames) * math_sin(cycle_pos * 3.2)
        : 0;

    for (let i = 0; i < array_length(door_parts); i = i + 1) {
        const part = door_parts[i];
        update_position(part[0], [part[1] + shake_x, part[2]]);
    }
    return undefined;
}

function draw_dim_backdrop(list) {
    make_rect(list, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, 3, 5, 8, 168);
    return undefined;
}

function draw_corkboard(list) {
    const cx = SCREEN_WIDTH / 2;
    const cy = 300;

    make_rect(list, cx + 7, cy + 8, 638, 468, 0, 0, 0, 220);
    make_rect(list, cx, cy, 630, 460, 34, 8, 14, 255);
    make_rect(list, cx, cy - 205, 630, 50, 117, 6, 10, 255);
    make_rect(list, cx, cy - 178, 630, 5, CUTOUT_YELLOW[0], 92, 12, 255);
    make_rect(list, cx, cy + 205, 630, 5, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);

    for (let i = 0; i < 10; i = i + 1) {
        const slot_x = cx - 270 + i * 60;
        make_rect(list, slot_x, cy - 220, 34, 8, 185, 188, 190, 255);
        make_rect(list, slot_x, cy + 220, 34, 8, 185, 188, 190, 255);
    }

    return undefined;
}

function draw_clue_corner(list, x, y, tilt) {
    make_rect(list, x + 4, y + 5, 78, 63, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const card = make_rect(list, x, y, 70, 55, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    update_rotation(card, tilt);
    const mark = make_text(list, x, y, "?", 1.1, 40, 40, 45, 255);
    update_rotation(mark, tilt);
    make_circle(list, x, y - 24, 6, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    return [card, mark];
}

function draw_clues(list) {
    const cx = SCREEN_WIDTH / 2;
    const cy = 300;

    const tl = draw_clue_corner(list, cx - 250, cy - 175, -0.18);
    const tr = draw_clue_corner(list, cx + 250, cy - 175, 0.18);
    const bl = draw_clue_corner(list, cx - 250, cy + 195, 0.12);
    const br = draw_clue_corner(list, cx + 250, cy + 195, -0.12);

    const center = [cx, cy + 15];
    make_string(list, cx - 250, cy - 175, center[0], center[1], 200, 30, 30, 220, 3);
    make_string(list, cx + 250, cy - 175, center[0], center[1], 200, 30, 30, 220, 3);
    make_string(list, cx - 250, cy + 195, center[0], center[1], 200, 30, 30, 220, 3);
    make_string(list, cx + 250, cy + 195, center[0], center[1], 200, 30, 30, 220, 3);

    return [tl, tr, bl, br];
}

function draw_title(list) {
    const x = SCREEN_WIDTH / 2;
    const y = 95;
    make_rect(list, x + 4, y + 5, 470, 70, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, x, y, 460, 62, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    make_rect(list, x, y + 28, 460, 6, CUTOUT_YELLOW[0], 93, 10, 255);
    const shadow = make_text(list, x + 4, y + 5, "OPERATION ESCAPE", 1.75, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const title = make_text(list, x, y, "OPERATION ESCAPE", 1.75, 255, 255, 255, 255);
    make_text(list, x, y + 47, "A NOIR INVESTIGATION", 0.52, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    return [title, shadow, x, y];
}

function draw_button(list, label, x, y, index, base_tilt) {
    const paper_colors = [CUTOUT_RED, [177, 29, 19], [112, 20, 25]];
    const paper = paper_colors[index];
    const glow = make_rect(list, x + 5, y + 6, 250, 74, 0, 0, 0, 255);
    const box = make_rect(list, x, y, 230, 60, paper[0], paper[1], paper[2], 255);
    const text = make_text(list, x, y, label, 1.4, 255, 255, 255, 255);
    const pin = make_circle(list, x - 100, y, 7, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);

    update_rotation(box, base_tilt);
    update_rotation(text, base_tilt);
    update_rotation(glow, base_tilt);

    return [box, glow, text, pin, 1.4, base_tilt, index, x, y, 230, 60];
}

function draw_menu_buttons(list) {
    const play = draw_button(list, "PLAY", SCREEN_WIDTH / 2, 250, 0, -0.05);
    const settings = draw_button(list, "SETTINGS", SCREEN_WIDTH / 2, 330, 1, 0.06);
    const exit_button = draw_button(list, "EXIT", SCREEN_WIDTH / 2, 410, 2, -0.04);
    return [play, settings, exit_button];
}

function draw_magnifier(list) {
    const rim = make_circle(list, 120, 60, 25, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const lens = make_circle(list, 120, 60, 18, 170, 224, 232, 180);
    const handle = make_rect(list, 120, 60, 13, 38, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    return [lens, rim, handle];
}

function draw_menu(list) {
    draw_dim_backdrop(list);
    draw_corkboard(list);
    const clues = draw_clues(list);
    const title_parts = draw_title(list);
    const buttons = draw_menu_buttons(list);
    const magnifier = draw_magnifier(list);
    return [buttons, title_parts, magnifier, clues];
}

let landing_selected_index = 0;
let key_w_prev = false;
let key_s_prev = false;

const select_sound = create_audio("https://labs.phaser.io/assets/audio/SoundEffects/key.wav", 0.6);

function update_landing_keyboard() {
    const w_down = input_key_down("w");
    const s_down = input_key_down("s");
    const previous = landing_selected_index;

    if (w_down && !key_w_prev) {
        landing_selected_index = (landing_selected_index + 2) % 3;
    }
    if (s_down && !key_s_prev) {
        landing_selected_index = (landing_selected_index + 1) % 3;
    }

    if (landing_selected_index !== previous) {
        play_audio(select_sound);
    }

    key_w_prev = w_down;
    key_s_prev = s_down;
    return undefined;
}

function update_landing_mouse_hover(buttons) {
    for (let i = 0; i < array_length(buttons); i = i + 1) {
        const btn = buttons[i];
        const box = btn[0];
        const index = btn[6];
        if (pointer_in_rect(btn[7], btn[8], btn[9], btn[10]) && index !== landing_selected_index) {
            landing_selected_index = index;
            play_audio(select_sound);
        }
    }
    return undefined;
}

function handle_landing_confirm(buttons, confirmed_by_key, clicked) {
    let confirmed_index = -1;

    if (confirmed_by_key) {
        confirmed_index = landing_selected_index;
    }

    if (clicked) {
        for (let i = 0; i < array_length(buttons); i = i + 1) {
            if (pointer_in_rect(buttons[i][7], buttons[i][8], buttons[i][9], buttons[i][10])) {
                confirmed_index = buttons[i][6];
            }
        }
    }

    if (confirmed_index === 0) {
        selected_character_index = 0;
        spawn_selected_character();
        change_scene("room_select");
        sync_room_select_visuals(hallway_doors);
    }
    return undefined;
}

function animate_menu_buttons(buttons, t) {
    const idle_colors = [CUTOUT_RED, [177, 29, 19], [112, 20, 25]];
    for (let i = 0; i < array_length(buttons); i = i + 1) {
        const btn = buttons[i];
        const box = btn[0];
        const glow = btn[1];
        const text = btn[2];
        const pin = btn[3];
        const base_scale = btn[4];
        const base_tilt = btn[5];
        const index = btn[6];

        if (index === landing_selected_index) {
            const pulse = 1 + 0.08 * math_sin(t * 7);
            const straighten = base_tilt * (1 - 0.9);

            update_scale(box, [pulse, pulse]);
            update_scale(text, [base_scale * pulse, base_scale * pulse]);
            update_rotation(box, straighten + 0.03 * math_sin(t * 4));
            update_rotation(text, straighten + 0.03 * math_sin(t * 4));
            update_color(box, [CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255]);
            update_color(text, [CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255]);

            const glow_pulse = 1.05 + 0.15 * math_sin(t * 7);
            update_rotation(glow, straighten);
            update_scale(glow, [glow_pulse, glow_pulse]);
            update_color(glow, [CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255]);

            update_scale(pin, [1.3, 1.3]);
            update_color(pin, [255, 60, 60, 255]);
        } else {
            const idle_wobble = base_tilt + 0.02 * math_sin(t * 1.5 + index * 2);

            update_scale(box, [1, 1]);
            update_scale(text, [base_scale, base_scale]);
            update_rotation(box, idle_wobble);
            update_rotation(text, idle_wobble);
            const idle = idle_colors[index];
            update_color(box, [idle[0], idle[1], idle[2], 255]);
            update_color(text, [255, 255, 255, 255]);

            update_rotation(glow, idle_wobble);
            update_scale(glow, [1, 1]);
            update_color(glow, [CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255]);

            update_scale(pin, [1, 1]);
            update_color(pin, [190, 30, 30, 255]);
        }
    }
    return undefined;
}

function animate_title(title_parts, t) {
    const title = title_parts[0];
    const shadow = title_parts[1];
    const x = title_parts[2];
    const y = title_parts[3];

    const bounce = 6 * math_sin(t * 2.2);
    const wiggle = 0.03 * math_sin(t * 3);
    update_position(title, [x, y + bounce]);
    update_rotation(title, wiggle);
    update_color(title, [255, 255, 255, 255]);

    update_position(shadow, [x + 4, y + 4 + bounce]);
    update_rotation(shadow, wiggle);

    return undefined;
}

function animate_magnifier(magnifier, t) {
    const lens = magnifier[0];
    const rim = magnifier[1];
    const handle = magnifier[2];

    const x = SCREEN_WIDTH / 2 + 320 * math_sin(t * 0.35);
    const y = 55 + 12 * math_sin(t * 0.9);
    const tilt = 0.4 * math_sin(t * 0.7);

    update_position(lens, [x, y]);
    update_position(rim, [x, y]);

    const handle_x = x + 26 * math_cos(tilt);
    const handle_y = y + 26 * math_sin(tilt);
    update_position(handle, [handle_x, handle_y]);
    update_rotation(handle, tilt);
    update_rotation(lens, tilt);
    update_rotation(rim, tilt);

    return undefined;
}

function animate_clues(clues, t) {
    for (let i = 0; i < array_length(clues); i = i + 1) {
        const clue = clues[i];
        const card = clue[0];
        const mark = clue[1];
        const sway = 0.02 * math_sin(t * 1.2 + i * 1.7);
        update_rotation(card, sway);
        update_rotation(mark, sway);
    }
    return undefined;
}

// ================================================================
//  SCENE 1.5: CHARACTER SELECTION
// ================================================================

const CHAR_PREVIEW_X = SCREEN_WIDTH / 2;
const CHAR_PREVIEW_Y = 280;

const CH_NAME = 0;
const CH_DESC = 1;
const CH_ALL_PARTS = 2;
const CH_SHADOW = 3;
const CH_BODY = 4;
const CH_HEAD = 5;
const CH_EYE_L = 6;
const CH_EYE_R = 7;
const CH_HAT = 8;
const CH_COAT_FLAPS = 9;
const CH_ACCESSORIES = 10;
const CH_SPRITE = 11;

let characters = [];
let char_select_index = 0;
let selected_character_index = 0;

function add_character_part(parts, obj, r, g, b, x, y) {
    parts[array_length(parts)] = [obj, r, g, b, x, y];
    return obj;
}

function create_character_sprite(list, imageName, displayName, description) {
    // Self-contained hard-edged vector detective. Long limbs, sharp shoulders,
    // a profile-like face and a dramatic hat replace the old round mascot.
    let coat = CUTOUT_BLUE;
    let hat = CUTOUT_RED;
    let accent = CUTOUT_YELLOW;
    if (imageName === "GHOST_HUNTER.png") {
        coat = CUTOUT_PURPLE;
        hat = [56, 60, 76];
        accent = [153, 224, 229];
    } else if (imageName === "ARCHAEOLOGIST.png") {
        coat = [196, 128, 66];
        hat = CUTOUT_BROWN;
        accent = CUTOUT_GREEN;
    } else if (imageName === "SHADOW_INVESTIGATOR.png") {
        coat = [52, 59, 72];
        hat = CUTOUT_INK;
        accent = CUTOUT_RED;
    } else if (imageName === "ROBOT_INVESTIGATOR.png") {
        coat = [144, 164, 179];
        hat = CUTOUT_YELLOW;
        accent = [82, 210, 220];
    }

    const parts = [];
    const x = CHAR_PREVIEW_X;
    const y = CHAR_PREVIEW_Y;

    const shadow = make_circle(list, x + 4, y + 137, 54, 0, 0, 0, 145);
    update_scale(shadow, [1.65, 0.24]);
    add_character_part(parts, shadow, 0, 0, 0, x + 4, y + 137);

    // Long offset legs and pointed shoes.
    const left_leg_outline = make_rect(list, x - 23, y + 88, 29, 112,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(left_leg_outline, -0.08);
    add_character_part(parts, left_leg_outline, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x - 23, y + 88);
    const left_leg = make_rect(list, x - 23, y + 86, 19, 108, coat[0], coat[1], coat[2], 255);
    update_rotation(left_leg, -0.08);
    add_character_part(parts, left_leg, coat[0], coat[1], coat[2], x - 23, y + 86);

    const right_leg_outline = make_rect(list, x + 21, y + 88, 29, 112,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(right_leg_outline, 0.06);
    add_character_part(parts, right_leg_outline, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x + 21, y + 88);
    const right_leg = make_rect(list, x + 21, y + 86, 19, 108, coat[0], coat[1], coat[2], 255);
    update_rotation(right_leg, 0.06);
    add_character_part(parts, right_leg, coat[0], coat[1], coat[2], x + 21, y + 86);

    const left_shoe = make_triangle(list, x - 37, y + 142, 58, 24,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(left_shoe, -math_PI / 2);
    add_character_part(parts, left_shoe, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x - 37, y + 142);
    const right_shoe = make_triangle(list, x + 38, y + 142, 58, 24,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(right_shoe, math_PI / 2);
    add_character_part(parts, right_shoe, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x + 38, y + 142);

    // Angular coat with exaggerated shoulders and long sleeves.
    add_character_part(parts, make_triangle(list, x, y + 24, 146, 158,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255),
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x, y + 24);
    const body = add_character_part(parts, make_triangle(list, x, y + 21, 132, 146,
        coat[0], coat[1], coat[2], 255),
        coat[0], coat[1], coat[2], x, y + 21);

    const left_arm_outline = make_rect(list, x - 69, y + 24, 27, 112,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(left_arm_outline, 0.34);
    add_character_part(parts, left_arm_outline, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x - 69, y + 24);
    const left_arm = make_rect(list, x - 67, y + 22, 19, 104, coat[0], coat[1], coat[2], 255);
    update_rotation(left_arm, 0.34);
    add_character_part(parts, left_arm, coat[0], coat[1], coat[2], x - 67, y + 22);

    const right_arm_outline = make_rect(list, x + 67, y + 22, 27, 112,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(right_arm_outline, -0.42);
    add_character_part(parts, right_arm_outline, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x + 67, y + 22);
    const right_arm = make_rect(list, x + 65, y + 20, 19, 104, coat[0], coat[1], coat[2], 255);
    update_rotation(right_arm, -0.42);
    add_character_part(parts, right_arm, coat[0], coat[1], coat[2], x + 65, y + 20);

    add_character_part(parts, make_triangle(list, x - 48, y - 31, 48, 52,
        coat[0], coat[1], coat[2], 255),
        coat[0], coat[1], coat[2], x - 48, y - 31);
    add_character_part(parts, make_triangle(list, x + 48, y - 31, 48, 52,
        coat[0], coat[1], coat[2], 255),
        coat[0], coat[1], coat[2], x + 48, y - 31);

    // Narrow profile face, sharp collar and tie.
    add_character_part(parts, make_triangle(list, x + 4, y - 72, 88, 86,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255),
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x + 4, y - 72);
    const head = add_character_part(parts, make_triangle(list, x + 4, y - 75, 76, 76,
        178, 218, 224, 255),
        178, 218, 224, x + 4, y - 75);
    add_character_part(parts, make_triangle(list, x + 35, y - 71, 42, 28,
        178, 218, 224, 255),
        178, 218, 224, x + 35, y - 71);

    add_character_part(parts, make_rect(list, x - 14, y - 82, 18, 7, 255, 255, 255, 255),
        255, 255, 255, x - 14, y - 82);
    add_character_part(parts, make_rect(list, x + 8, y - 82, 18, 7, 255, 255, 255, 255),
        255, 255, 255, x + 8, y - 82);
    const eye_l = add_character_part(parts, make_rect(list, x - 10, y - 82, 5, 8,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255),
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x - 10, y - 82);
    const eye_r = add_character_part(parts, make_rect(list, x + 12, y - 82, 5, 8,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255),
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x + 12, y - 82);
    add_character_part(parts, make_rect(list, x + 12, y - 50, 30, 5,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255),
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x + 12, y - 50);

    add_character_part(parts, make_triangle(list, x - 18, y - 20, 38, 48,
        CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255),
        CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], x - 18, y - 20);
    add_character_part(parts, make_triangle(list, x + 18, y - 20, 38, 48,
        CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255),
        CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], x + 18, y - 20);
    add_character_part(parts, make_triangle(list, x, y + 9, 22, 62,
        accent[0], accent[1], accent[2], 255),
        accent[0], accent[1], accent[2], x, y + 9);

    // Wide asymmetrical hat silhouette.
    const hat_outline = make_rect(list, x - 5, y - 124, 160, 22,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(hat_outline, -0.09);
    add_character_part(parts, hat_outline, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x - 5, y - 124);
    const hat_obj = make_rect(list, x - 7, y - 127, 148, 14, hat[0], hat[1], hat[2], 255);
    update_rotation(hat_obj, -0.09);
    add_character_part(parts, hat_obj, hat[0], hat[1], hat[2], x - 7, y - 127);
    add_character_part(parts, make_triangle(list, x - 8, y - 151, 96, 62,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255),
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], x - 8, y - 151);
    add_character_part(parts, make_triangle(list, x - 9, y - 151, 84, 52,
        hat[0], hat[1], hat[2], 255),
        hat[0], hat[1], hat[2], x - 9, y - 151);
    add_character_part(parts, make_rect(list, x - 5, y - 141, 74, 11,
        accent[0], accent[1], accent[2], 255),
        accent[0], accent[1], accent[2], x - 5, y - 141);

    const record = [];
    record[CH_NAME] = displayName;
    record[CH_DESC] = description;
    record[CH_SPRITE] = parts[0][0];
    record[CH_ALL_PARTS] = parts;
    record[CH_SHADOW] = shadow;
    record[CH_BODY] = body;
    record[CH_HEAD] = head;
    record[CH_EYE_L] = eye_l;
    record[CH_EYE_R] = eye_r;
    record[CH_HAT] = hat_obj;
    record[CH_COAT_FLAPS] = [];
    record[CH_ACCESSORIES] = [];

    return record;
}

function create_classic_detective(list) {
    return create_character_sprite(list, "CLASSIC_DETECTIVE.png", "Classic Detective", "A sharp-eyed sleuth with a trusty coat and magnifying glass.");
}

function create_ghost_hunter(list) {
    return create_character_sprite(list, "GHOST_HUNTER.png", "Ghost Hunter", "Cloaked in shadow, armed with a lantern and silver cross.");
}

function create_archaeologist(list) {
    return create_character_sprite(list, "ARCHAEOLOGIST.png", "Archaeologist", "A seasoned explorer with a satchel full of secrets.");
}

function create_shadow_investigator(list) {
    return create_character_sprite(list, "SHADOW_INVESTIGATOR.png", "Shadow Investigator", "A hooded figure who moves unseen and speaks little.");
}

function create_robot_detective(list) {
    return create_character_sprite(list, "ROBOT_INVESTIGATOR.png", "Robot Detective", "A robotic sleuth with advanced scanning capabilities.");
}

let char_name_texts = [];
let char_desc_texts = [];
let char_left_arrow = null;
let char_right_arrow = null;
let char_select_button = null;
let char_back_button = null;

function draw_char_select_background(list) {
    make_rect(list, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, SCREEN_WIDTH / 2, 275, 640, 390, 38, 7, 13, 255);
    make_circle(list, SCREEN_WIDTH / 2, 275, 185, 120, 8, 21, 255);
    make_triangle(list, 255, 280, 280, 380, CUTOUT_RED[0], 20, 21, 70);
    make_triangle(list, 545, 280, 280, 380, 11, 68, 72, 80);
    make_rect(list, SCREEN_WIDTH / 2, 438, 640, 7, CUTOUT_YELLOW[0], 102, 12, 255);
    draw_stage_frame(list);
    return undefined;
}

function draw_char_select_ui(list) {
    make_cutout_rect(list, SCREEN_WIDTH / 2, 55, 430, 58, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255, 0.01);
    make_text(list, SCREEN_WIDTH / 2, 55, "CHOOSE YOUR DETECTIVE", 1.3, 255, 255, 255, 255);
    char_back_button = make_mouse_button(list, 120, 550, 170, 48, "BACK", 0.65, 255);
    char_select_button = make_mouse_button(list, SCREEN_WIDTH / 2, 550, 230, 52, "SELECT DETECTIVE", 0.65, 255);
    make_text(list, 665, 550, "Click arrows to browse", 0.47, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);

    for (let i = 0; i < array_length(characters); i = i + 1) {
        const record = characters[i];
        char_name_texts[i] = make_text(list, SCREEN_WIDTH / 2, 455, record[CH_NAME], 1.1, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
        char_desc_texts[i] = make_text(list, SCREEN_WIDTH / 2, 490, record[CH_DESC], 0.65, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
    }

    make_cutout_circle(list, 90, CHAR_PREVIEW_Y, 38, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    char_left_arrow = make_triangle(list, 90, CHAR_PREVIEW_Y, 40, 60, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    update_rotation(char_left_arrow, -math_PI / 2);
    make_cutout_circle(list, SCREEN_WIDTH - 90, CHAR_PREVIEW_Y, 38, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    char_right_arrow = make_triangle(list, SCREEN_WIDTH - 90, CHAR_PREVIEW_Y, 40, 60, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    update_rotation(char_right_arrow, math_PI / 2);

    return undefined;
}

function set_all_parts_alpha(all_parts, alpha) {
    for (let i = 0; i < array_length(all_parts); i = i + 1) {
        const p = all_parts[i];
        update_color(p[0], [p[1], p[2], p[3], alpha]);
    }
    return undefined;
}

function sync_char_select_visuals() {
    for (let i = 0; i < array_length(characters); i = i + 1) {
        const on = i === char_select_index;
        set_all_parts_alpha(characters[i][CH_ALL_PARTS], on ? 255 : 0);
        update_color(char_name_texts[i], [CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], on ? 255 : 0]);
        update_color(char_desc_texts[i], [CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], on ? 255 : 0]);
    }
    return undefined;
}

function next_character() {
    char_select_index = (char_select_index + 1) % array_length(characters);
    sync_char_select_visuals();
    return undefined;
}

function previous_character() {
    char_select_index = (char_select_index + array_length(characters) - 1) % array_length(characters);
    sync_char_select_visuals();
    return undefined;
}

function select_character() {
    selected_character_index = char_select_index;
    spawn_selected_character();
    start_char_select_fade();
    return undefined;
}

let char_left_prev = false;
let char_right_prev = false;

function update_char_select_input(confirmed, clicked) {
    const left_down = input_key_down("ArrowLeft");
    const right_down = input_key_down("ArrowRight");

    if (left_down && !char_left_prev) { previous_character(); }
    if (right_down && !char_right_prev) { next_character(); }
    char_left_prev = left_down;
    char_right_prev = right_down;

    if (clicked) {
        if (pointer_in_circle(90, CHAR_PREVIEW_Y, 55)) { previous_character(); }
        if (pointer_in_circle(SCREEN_WIDTH - 90, CHAR_PREVIEW_Y, 55)) { next_character(); }
        if (pointer_in_rect(char_select_button[9], char_select_button[10], char_select_button[11], char_select_button[12])) { select_character(); }
        if (pointer_in_rect(char_back_button[9], char_back_button[10], char_back_button[11], char_back_button[12])) { change_scene("landing"); }
    }
    update_mouse_button(char_select_button);
    update_mouse_button(char_back_button);

    if (confirmed) {
        select_character();
    }

    return undefined;
}

function animate_char_select_arrows(t) {
    const pulse_l = 1 + 0.08 * math_sin(t * 3);
    const pulse_r = 1 + 0.08 * math_sin(t * 3 + math_PI);
    update_scale(char_left_arrow, [pulse_l, pulse_l]);
    update_scale(char_right_arrow, [pulse_r, pulse_r]);
    return undefined;
}

function animate_character(record, t, loop_count) {
    const bobY = 4 * math_sin(t * 1.6);
    const parts = record[CH_ALL_PARTS];
    for (let i = 0; i < array_length(parts); i = i + 1) {
        const p = parts[i];
        update_position(p[0], [p[4], p[5] + bobY]);
    }

    const period_frames = 4 * FPS;
    const blink_frames = math_round(0.12 * FPS);
    const cycle_pos = loop_count % period_frames;
    const blink_scale_y = (cycle_pos < blink_frames) ? 0.1 : 1;
    update_scale(record[CH_EYE_L], [1, blink_scale_y]);
    update_scale(record[CH_EYE_R], [1, blink_scale_y]);

    return undefined;
}

let char_select_fade_rect = null;
let char_select_fade_state = "none";
let char_select_fade_timer = 0;
const CHAR_SELECT_FADE_FRAMES = math_round(0.5 * FPS);

function start_char_select_fade() {
    char_select_fade_state = "out";
    char_select_fade_timer = 0;
    return undefined;
}

function update_char_select_fade() {
    if (char_select_fade_state === "out") {
        char_select_fade_timer = char_select_fade_timer + 1;
        const p = math_min(1, char_select_fade_timer / CHAR_SELECT_FADE_FRAMES);
        update_color(char_select_fade_rect, [0, 0, 0, 255 * p]);
        if (p >= 1) {
            change_scene("room_select");
            sync_room_select_visuals(hallway_doors);
            char_select_fade_state = "in";
            char_select_fade_timer = 0;
        }
    } else if (char_select_fade_state === "in") {
        char_select_fade_timer = char_select_fade_timer + 1;
        const p = math_min(1, char_select_fade_timer / CHAR_SELECT_FADE_FRAMES);
        update_color(char_select_fade_rect, [0, 0, 0, 255 * (1 - p)]);
        if (p >= 1) {
            char_select_fade_state = "none";
        }
    }
    return undefined;
}

const CHAR_BODY_COLORS = [[44, 82, 107], [80, 45, 68], [151, 83, 41], [24, 30, 39], [126, 151, 164]];
const CHAR_HAT_COLORS = [[218, 41, 25], [46, 31, 55], [91, 59, 52], [11, 16, 22], [255, 171, 25]];
const CHAR_ACCESSORY_COLORS = [[255, 200, 100], [180, 200, 255], [255, 170, 60], [150, 80, 190], [0, 200, 255]];

let room1_character_accessory_objs = [];

function draw_room1_character_accessories(list) {
    for (let i = 0; i < array_length(CHAR_ACCESSORY_COLORS); i = i + 1) {
        const c = CHAR_ACCESSORY_COLORS[i];
        room1_character_accessory_objs[i] = make_circle(list, room1_player_x + 20, room1_player_y + 5, 8, c[0], c[1], c[2], 0);
    }
    return undefined;
}

function spawn_selected_character() {
    // The story has one fixed illustrated detective. The old vector
    // puppet is retained only because several legacy movement arrays
    // reference it; it stays invisible beneath the sprite animation.
    for (let p = 0; p < array_length(room1_player_parts); p = p + 1) {
        set_alpha(room1_player_parts[p][0], 0);
    }

    for (let i = 0; i < array_length(room1_character_accessory_objs); i = i + 1) {
        update_color(room1_character_accessory_objs[i], [0, 0, 0, 0]);
    }

    return undefined;
}

function update_character_accessory_position(offset_x, offset_y) {
    for (let i = 0; i < array_length(room1_character_accessory_objs); i = i + 1) {
        update_position(room1_character_accessory_objs[i], [room1_player_x + offset_x, room1_player_y + offset_y]);
    }
    return undefined;
}

function animate_character_accessory(t) {
    const obj = room1_character_accessory_objs[selected_character_index];
    const pulse = 1 + 0.15 * math_sin(t * 3);
    update_scale(obj, [pulse, pulse]);
    return undefined;
}

// ================================================================
//  SCENE 2: ROOM SELECT (mysterious hallway, 4 doors)
// ================================================================

function draw_hallway(list) {
    make_rect(list, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, SCREEN_WIDTH / 2, 260, 770, 420, 78, 70, 68, 255);
    make_rect(list, SCREEN_WIDTH / 2, 515, 770, 90, 81, 55, 48, 255);
    for (let plank = 0; plank < 9; plank = plank + 1) {
        make_rect(list, 20 + plank * 90, 515, 3, 90, 139, 96, 70, 190);
    }

    make_rect(list, SCREEN_WIDTH / 2, 82, 770, 42, 112, 7, 13, 255);
    make_rect(list, SCREEN_WIDTH / 2, 105, 770, 5, CUTOUT_YELLOW[0], 92, 12, 255);
    make_text(list, SCREEN_WIDTH / 2, 82, "VALE MANOR  /  INVESTIGATION MAP", 0.68, 255, 255, 255, 255);

    make_triangle(list, 80, 300, 170, 440, 26, 31, 36, 255);
    make_triangle(list, SCREEN_WIDTH - 80, 300, 170, 440, 26, 31, 36, 255);
    make_triangle(list, 230, 285, 260, 390, 245, 225, 190, 18);
    make_triangle(list, 585, 285, 260, 390, 245, 225, 190, 14);

    for (let row = 0; row < 4; row = row + 1) {
        make_rect(list, SCREEN_WIDTH / 2, 130 + row * 82, 770, 3,
            CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 105);
    }
    draw_stage_frame(list);

    return undefined;
}

function draw_torch(list, x, y, phase) {
    const bracket = make_rect(list, x, y + 10, 18, 28, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const glow = make_circle(list, x, y - 34, 44, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 65);
    const flame_outer = make_triangle(list, x, y - 32, 20, 30, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    const flame_inner = make_triangle(list, x, y - 38, 10, 16, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    return [flame_outer, flame_inner, glow, phase];
}

function create_fog(list, count) {
    const fog = [];
    for (let i = 0; i < count; i = i + 1) {
        const base_y = 505 + math_random() * 40;
        const start_x = math_random() * SCREEN_WIDTH;
        const speed = 6 + math_random() * 10;
        const width = 160 + math_random() * 140;
        const puff = make_rect(list, start_x, base_y, width, 30, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 45);
        fog[i] = [puff, base_y, speed, start_x];
    }
    return fog;
}

function create_light_rays(list, count) {
    const rays = [];
    for (let i = 0; i < count; i = i + 1) {
        const x = 120 + i * (SCREEN_WIDTH - 240) / (count - 1 === 0 ? 1 : count - 1);
        const ray = make_triangle(list, x, 130, 50, 260, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 30);
        rays[i] = [ray, x, math_random() * 10];
    }
    return rays;
}

function draw_lock(list, x, y) {
    const shackle = make_circle(list, x, y - 10, 10, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const body = make_rect(list, x, y, 25, 20, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    const keyhole = make_circle(list, x, y + 1, 3, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    return [shackle, body, keyhole];
}

function draw_door(list, x, y, state, index, label) {
    const parts = [];
    let n = 0;
    const track_part = (obj, px, py) => {
        parts[n] = [obj, px, py];
        n = n + 1;
        return obj;
    };

    const frame_box = track_part(make_rect(list, x + 5, y + 6, 142, 232, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255), x + 5, y + 6);
    track_part(make_rect(list, x, y, 130, 220, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255), x, y);

    if (state === "secret") {
        track_part(make_rect(list, x, y, 116, 200, CUTOUT_GREEN[0], CUTOUT_GREEN[1], CUTOUT_GREEN[2], 255), x, y);
        for (let shelf = 0; shelf < 4; shelf = shelf + 1) {
            track_part(make_rect(list, x, y - 80 + shelf * 55, 110, 8, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255), x, y - 80 + shelf * 55);
        }
        for (let book = 0; book < 6; book = book + 1) {
            const bx = x - 45 + book * 18;
            const bcol_r = 110 + math_random() * 120;
            const bcol_g = 55 + math_random() * 100;
            const bcol_b = 45 + math_random() * 90;
            track_part(make_rect(list, bx, y - 60, 14, 45, bcol_r, bcol_g, bcol_b, 255), bx, y - 60);
        }
    } else {
        const door_color = index === 0 ? CUTOUT_RED : (index === 1 ? CUTOUT_BLUE : CUTOUT_PURPLE);
        track_part(make_rect(list, x, y, 110, 200, door_color[0], door_color[1], door_color[2], 255), x, y);
        track_part(make_rect(list, x, y - 45, 80, 60, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255), x, y - 45);
        track_part(make_rect(list, x, y + 45, 80, 60, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255), x, y + 45);
        track_part(make_circle(list, x + 35, y, 6, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255), x + 35, y);
    }

    const label_obj = make_text(list, x, y + 130, label, 0.75, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);

    let lock_parts = [];
    if (state === "locked") {
        lock_parts = draw_lock(list, x, y);
        make_text(list, x, y + 150, "LOCKED", 0.6, 220, 90, 80, 255);
    }

    const unlocked_glow = make_circle(list, x, y, 80, 255, 220, 120, 0);
    const status_text = null;

    return [parts, x, y, state, index, frame_box, label_obj, lock_parts, unlocked_glow, status_text];
}

function draw_room_select_doors(list) {
    const y = 320;
    const spacing = 175;
    const start_x = SCREEN_WIDTH / 2 - spacing * 1.5;

    const door1 = draw_door(list, start_x, y, "unlocked", 0, "ROOM 1");
    const door2 = draw_door(list, start_x + spacing, y, "locked", 1, "ROOM 2");
    const door3 = draw_door(list, start_x + spacing * 2, y, "locked", 2, "ROOM 3");
    const door4 = draw_door(list, start_x + spacing * 3, y, "secret", 3, "");

    return [door1, door2, door3, door4];
}

let room_status_unlocked_texts = [];
let room_status_completed_texts = [];

function draw_room_status_labels(list, doors) {
    for (let i = 0; i < array_length(doors); i = i + 1) {
        const door = doors[i];
        const x = door[1];
        const y = door[2];
        room_status_unlocked_texts[i] = make_text(list, x, y + 150, "Unlocked", 0.6, 140, 230, 140, 0);
        room_status_completed_texts[i] = make_text(list, x, y + 150, "Completed \u2713", 0.6, 255, 210, 90, 0);
    }
    return undefined;
}

let room2_unlock_banner = null;
let room2_unlock_banner_until = -1;
let room_select_back_button = null;

function draw_room2_unlock_banner(list, doors) {
    const door2 = doors[1];
    room2_unlock_banner = make_text(list, door2[1], door2[2] - 165, "Room 2 Unlocked!", 0.7, 140, 230, 140, 0);
    return undefined;
}

function draw_room_select(list) {
    draw_hallway(list);

    const rays = create_light_rays(list, 3);
    const fog = create_fog(list, 5);
    const dust = create_dust(list, 12, 120, 480);

    const torch_1 = draw_torch(list, 90, 250, 0);
    const torch_2 = draw_torch(list, SCREEN_WIDTH - 90, 250, 2.4);
    const torches = [torch_1, torch_2];

    const doors = draw_room_select_doors(list);
    draw_room_status_labels(list, doors);
    draw_room2_unlock_banner(list, doors);

    make_text(list, SCREEN_WIDTH / 2, 500, "Click an unlocked door to enter", 0.58, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    room_select_back_button = make_mouse_button(list, SCREEN_WIDTH / 2, 552, 200, 48, "BACK TO MENU", 0.6, 255);

    return [doors, torches, fog, rays, dust];
}

function animate_hallway(torches, fog, rays, t) {
    for (let i = 0; i < array_length(torches); i = i + 1) {
        const c = torches[i];
        const flame_outer = c[0];
        const flame_inner = c[1];
        const glow = c[2];
        const phase = c[3];

        const flicker = 0.85 + 0.12 * math_sin(t * 10 + phase) + 0.06 * math_sin(t * 21 + phase * 1.5);
        update_scale(flame_outer, [flicker, flicker]);
        update_scale(flame_inner, [flicker * 1.05, flicker * 0.95]);
        update_scale(glow, [0.85 + 0.15 * math_sin(t * 6 + phase), 0.85 + 0.15 * math_sin(t * 6 + phase)]);
    }

    for (let i = 0; i < array_length(fog); i = i + 1) {
        const f = fog[i];
        const puff = f[0];
        const base_y = f[1];
        const speed = f[2];
        const start_x = f[3];
        const x = (start_x + t * speed) % (SCREEN_WIDTH + 200) - 100;
        update_position(puff, [x, base_y]);
    }

    for (let i = 0; i < array_length(rays); i = i + 1) {
        const r = rays[i];
        const ray = r[0];
        const base_x = r[1];
        const phase = r[2];
        const drift = 10 * math_sin(t * 0.2 + phase);
        const alpha = 18 + 12 * math_sin(t * 0.5 + phase);
        update_position(ray, [base_x + drift, 130]);
        update_color(ray, [255, 250, 210, alpha]);
    }

    return undefined;
}

function update_room2_unlock_banner(loop_count) {
    if (room2_unlock_banner === null) {
        return undefined;
    }
    if (loop_count < room2_unlock_banner_until) {
        const pulse = 200 + 55 * math_sin(loop_count / FPS * 4);
        update_color(room2_unlock_banner, [140, 230, 140, pulse]);
    } else {
        update_color(room2_unlock_banner, [140, 230, 140, 0]);
    }
    return undefined;
}

let deny_flash_until = [-1, -1, -1, -1];

let room_completed = [false, false, false, false];
let room_unlocked = [true, false, false, false];

let pending_room2_announcement = false;

function complete_room(index) {
    room_completed[index] = true;
    if (index === 0) {
        unlock_room2();
    }
    return undefined;
}

function unlock_room2() {
    room_unlocked[1] = true;
    pending_room2_announcement = true;
    return undefined;
}

function sync_room_select_visuals(doors) {
    for (let i = 0; i < array_length(doors); i = i + 1) {
        const door = doors[i];
        const lock_parts = door[7];
        const unlocked = room_unlocked[i];
        const completed = room_completed[i];

        for (let p = 0; p < array_length(lock_parts); p = p + 1) {
            update_color(lock_parts[p], [
                p === 1 ? 210 : 40,
                p === 1 ? 175 : (p === 0 ? 40 : 30),
                p === 1 ? 60 : (p === 0 ? 45 : 15),
                unlocked ? 0 : 255
            ]);
        }

        update_color(room_status_unlocked_texts[i], [140, 230, 140, unlocked && !completed && i !== 0 ? 255 : 0]);
        update_color(room_status_completed_texts[i], [255, 210, 90, completed ? 255 : 0]);
    }
    return undefined;
}

let door_unlock_flash_until = -1;

function animate_door(door, t, loop_count, hovered) {
    const parts = door[0];
    const state = door[3];
    const index = door[4];
    const frame_box = door[5];
    const unlocked_glow = door[8];

    const period_frames = 7 * FPS;
    const stagger = index * 45;
    const cycle_pos = (loop_count + stagger) % period_frames;
    const creak_frames = math_round(0.4 * FPS);
    const creak = cycle_pos < creak_frames
        ? 0.06 * (1 - cycle_pos / creak_frames) * math_sin(cycle_pos * 3)
        : 0;

    for (let i = 0; i < array_length(parts); i = i + 1) {
        update_rotation(parts[i][0], creak);
    }

    const denied = loop_count < deny_flash_until[index];

    if (denied) {
        const shake = 5 * math_sin(loop_count * 3);
        update_position(frame_box, [door[1] + shake, door[2]]);
        update_color(frame_box, [220, 60, 50, 255]);
    } else if (hovered) {
        update_position(frame_box, [door[1], door[2]]);
        update_color(frame_box, [90, 80, 60, 255]);
    } else {
        update_position(frame_box, [door[1], door[2]]);
        update_color(frame_box, [45, 40, 46, 255]);
    }

    if (index === 1 && loop_count < door_unlock_flash_until) {
        const glow_pulse = 1 + 0.25 * math_sin(t * 6);
        const glow_alpha = 90 + 60 * math_sin(t * 6);
        update_scale(unlocked_glow, [glow_pulse, glow_pulse]);
        update_color(unlocked_glow, [255, 220, 120, glow_alpha]);
    } else if (room_unlocked[index] && index !== 0) {
        const glow_alpha = 35 + 15 * math_sin(t * 2 + index);
        update_scale(unlocked_glow, [1, 1]);
        update_color(unlocked_glow, [255, 220, 120, glow_alpha]);
    } else {
        update_color(unlocked_glow, [255, 220, 120, 0]);
    }

    return undefined;
}

let room_a_prev = false;
let room_d_prev = false;
let room_selected_index = 0;

function update_room_selection_keyboard() {
    const a_down = input_key_down("a") || input_key_down("ArrowLeft");
    const d_down = input_key_down("d") || input_key_down("ArrowRight");

    if (a_down && !room_a_prev) {
        room_selected_index = (room_selected_index + 3) % 4;
    }
    if (d_down && !room_d_prev) {
        room_selected_index = (room_selected_index + 1) % 4;
    }

    room_a_prev = a_down;
    room_d_prev = d_down;
    return undefined;
}

function update_room_selection_mouse(doors) {
    for (let i = 0; i < array_length(doors); i = i + 1) {
        const door = doors[i];
        if (pointer_in_rect(door[1], door[2], 142, 232)) {
            room_selected_index = door[4];
        }
    }
    return undefined;
}

function handle_room_selection(doors, confirmed_by_key, clicked, loop_count) {
    let confirmed_index = -1;

    if (confirmed_by_key) {
        confirmed_index = room_selected_index;
    }
    if (clicked) {
        for (let i = 0; i < array_length(doors); i = i + 1) {
            if (pointer_in_rect(doors[i][1], doors[i][2], 142, 232)) {
                confirmed_index = doors[i][4];
            }
        }
    }

    if (confirmed_index === -1) {
        return undefined;
    }

    const door = doors[confirmed_index];
    const state = door[3];
    const effectively_unlocked = state === "unlocked" || room_unlocked[confirmed_index];

    if (effectively_unlocked) {
        if (confirmed_index === 0) {
            enter_room1();
        } else if (confirmed_index === 1) {
            enter_room2();
        }
    } else if (state === "locked") {
        deny_flash_until[confirmed_index] = loop_count + math_round(0.5 * FPS);
    }

    return undefined;
}

// ================================================================
//  SCENE 3: ROOM 1 - THE DETECTIVE'S STUDY (puzzle-gated escape room)
// ================================================================

const ST_DESK = 0;
const ST_PAINTING = 1;
const ST_SWITCH = 2;
const ST_BOOKSHELF = 3;
const ST_SAFE = 4;
const ST_CHEST_OPEN = 5;
const ST_KEY = 6;
const ST_DOOR = 7;
let room1_state = [false, false, false, false, false, false, false, false];

let player_has_room1_key = false;

let room1_player_x = 400;
let room1_player_y = 500;
const PLAYER_RADIUS = 14;
const PLAYER_SPEED = 3.4;

const ROOM1_MIN_X = 65;
const ROOM1_MAX_X = 735;
const ROOM1_MIN_Y = 235;
const ROOM1_MAX_Y = 575;

let room1_blocking_rects = [];
let room1_player_parts = [];
let room1_detective_frames = [];
let room2_detective_frames = [];
let room1_detective_direction = DETECTIVE_DOWN;
let room2_detective_direction = DETECTIVE_DOWN;
let room1_detective_moving = false;
let room2_detective_moving = false;

function build_detective_frames(list) {
    const frames = [];
    for (let direction = 0; direction < 4; direction = direction + 1) {
        const row = [];
        for (let frame = 0; frame < 3; frame = frame + 1) {
            row[frame] = make_sprite(list, -500, -500,
                DETECTIVE_FRAME_URLS[direction][frame],
                DETECTIVE_SCALE, DETECTIVE_SCALE, 0);
        }
        frames[direction] = row;
    }
    return frames;
}

function update_detective_frames(frames, x, y, direction, moving, loop_count) {
    const cycle = math_floor(loop_count / 5) % 4;
    const active_frame = moving
        ? (cycle === 0 ? 0 : (cycle === 2 ? 2 : 1))
        : 1;

    for (let d = 0; d < 4; d = d + 1) {
        for (let f = 0; f < 3; f = f + 1) {
            const sprite = frames[d][f];
            update_position(sprite, [x, y - 12]);
            set_alpha(sprite, d === direction && f === active_frame ? 255 : 0);
        }
    }
    return undefined;
}

function direction_from_delta(dx, dy, current_direction) {
    if (dx < 0) { return DETECTIVE_LEFT; }
    if (dx > 0) { return DETECTIVE_RIGHT; }
    if (dy < 0) { return DETECTIVE_UP; }
    if (dy > 0) { return DETECTIVE_DOWN; }
    return current_direction;
}

let room1_interactables = [];
let room1_nearest_name = "";
let room1_nearest_prompt = "Click to Inspect";

function always_visible() { return true; }

function painting_visible() { return !room1_state[ST_PAINTING]; }

function switch_visible() { return room1_state[ST_PAINTING]; }

function chest_visible() { return room1_state[ST_BOOKSHELF] && !room1_state[ST_SAFE]; }

function key_visible() { return room1_state[ST_CHEST_OPEN] && !room1_state[ST_KEY]; }

let room1_dialogue_texts = [];
let room1_dialogue_timer = 0;
const DIALOGUE_FRAMES = 220;
let room1_dialogue_box = null;
let room1_dialogue_continue = null;

let room1_switch_sprite = null;
let room1_switch_glow = null;
let room1_switch_lever = null;
let room1_chest_parts = [];
let room1_chest_lid = null;
const ROOM1_CHEST_X = 235;
const ROOM1_CHEST_Y = 280;
const ROOM1_CHEST_LID_Y = 252;
let room1_key_parts = [];
let room1_key_glow = null;
let room1_lock_parts = [];
let room1_lock_label = null;
let room1_door_frame = null;
let room1_prompt_text = null;
let room1_prompt_bg = null;

let room1_painting_parts = [];
let room1_bookshelf_parts = [];
let room1_drawer1 = null;

let painting_move_start = -1;
let bookshelf_move_start = -1;
let drawer_open_start = -1;
let chest_open_start = -1;
let key_spawn_start = -1;
let switch_toggle_start = -1;

const REVEAL_ANIM_FRAMES = math_round(0.6 * FPS);

function ease_out(p) {
    return math_sin(p * math_PI / 2);
}

function anim_progress(start_frame, loop_count) {
    if (start_frame < 0) {
        return 0;
    }
    const elapsed = loop_count - start_frame;
    if (elapsed <= 0) {
        return 0;
    }
    if (elapsed >= REVEAL_ANIM_FRAMES) {
        return 1;
    }
    return ease_out(elapsed / REVEAL_ANIM_FRAMES);
}

let room_shake_until = -1;
const ROOM_SHAKE_FRAMES = math_round(0.4 * FPS);

function trigger_room_shake(loop_count) {
    room_shake_until = loop_count + ROOM_SHAKE_FRAMES;
    return undefined;
}

function current_room_shake_offset(loop_count) {
    if (loop_count >= room_shake_until) {
        return [0, 0];
    }
    const remaining = room_shake_until - loop_count;
    const power = remaining / ROOM_SHAKE_FRAMES;
    return [6 * power * math_sin(loop_count * 3.3), 4 * power * math_sin(loop_count * 2.1)];
}

const mechanism_sound = create_audio("https://labs.phaser.io/assets/audio/SoundEffects/key.wav", 0.7);
const chest_sound = create_audio("https://labs.phaser.io/assets/audio/SoundEffects/key.wav", 0.7);

let interact_prev = false;

function interact_pressed_this_frame() {
    const down = input_key_down("e");
    const pressed = down && !interact_prev;
    interact_prev = down;
    return pressed;
}

let active_puzzle = "";
let puzzle_sequence = [];
let puzzle_feedback = "";
let puzzle_feedback_timer = 0;
const PUZZLE_FEEDBACK_FRAMES = math_round(1 * FPS);

let puzzle_backdrop = null;
let puzzle_border_outer = null;
let puzzle_box = null;
let puzzle_msg_success = null;
let puzzle_msg_fail = null;

let puzzle_headers = [];

const DESK_TILE_LABELS = ["S", "C", "E", "A"];
const DESK_CORRECT = [1, 3, 0, 2];
let desk_tiles = [];
let desk_number_labels = [];

const PAINTING_OPTIONS = ["MOON", "NOON", "SOON"];
const PAINTING_CORRECT = 0;
let painting_options = [];
let painting_number_labels = [];

const BOOKSHELF_TILE_LABELS = ["SUSPECT", "MOTIVE", "EVIDENCE", "VERDICT"];
const BOOKSHELF_CORRECT = [1, 2, 0, 3];
let bookshelf_tiles = [];
let bookshelf_number_labels = [];

const SAFE_CORRECT = [1, 3, 4];
let safe_dots = [];
let safe_digit_buttons = [];

const TILE_DEFAULT = [235, 222, 198];
const TILE_SELECTED = [218, 41, 25];
const TILE_HOVER = [255, 171, 25];
const DOT_EMPTY = [65, 70, 78];
const DOT_FILLED = [218, 41, 25];
const PANEL_BG = [45, 8, 15];
const PANEL_BORDER = [255, 112, 18];
const BUTTON_WOOD = [218, 41, 25];
const BUTTON_WOOD_HOVER = [255, 171, 25];

function set_color(entry, a) {
    update_color(entry[0], [entry[1], entry[2], entry[3], a]);
}

let puzzle_typed_letters = [];
let puzzle_input_box = null;
let puzzle_input_label = null;

let letter_prev = [];
for (let li = 0; li < 26; li = li + 1) {
    letter_prev[li] = false;
}
const LETTER_KEYS = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"];
const UPPER_LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

let backspace_prev = false;
let puzzle_enter_prev = false;

const DESK_ANSWER_LETTERS = ["C", "A", "S", "E"];
const PAINTING_ANSWER_LETTERS = ["M", "O", "O", "N"];

let puzzle_submit_box = null;
let puzzle_submit_text = null;
let puzzle_cancel_box = null;
let puzzle_cancel_text = null;

const TYPED_MAX = 10;
const INPUT_CHAR_SPACING = 34;
let puzzle_letter_objs = [];
let puzzle_underscore_obj = null;

function letter_index_of(letter) {
    for (let li = 0; li < 26; li = li + 1) {
        if (UPPER_LETTERS[li] === letter) {
            return li;
        }
    }
    return 0;
}

function draw_input_box(list, cx, cy) {
    puzzle_input_label = make_text(list, cx, cy + 70, "Your Answer:", 0.75, 225, 210, 235, 0);
    puzzle_input_box = make_rect(list, cx, cy + 108, 420, 56, 245, 232, 205, 0);
    return undefined;
}

function draw_puzzle_input_letters(list, cx, cy) {
    const y = cy + 108;
    puzzle_underscore_obj = make_text(list, cx, y, "_", 0.9, 40, 35, 30, 0);
    for (let slot = 0; slot < TYPED_MAX; slot = slot + 1) {
        const row = [];
        for (let li = 0; li < 26; li = li + 1) {
            row[li] = make_text(list, cx, y, UPPER_LETTERS[li], 0.9, 40, 35, 30, 0);
        }
        puzzle_letter_objs[slot] = row;
    }
    return undefined;
}

function draw_puzzle_ui(list) {
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;

    puzzle_backdrop = make_rect(list, cx, cy, SCREEN_WIDTH, SCREEN_HEIGHT, 2, 3, 5, 0);
    puzzle_border_outer = make_rect(list, cx, cy, 700, 440, PANEL_BORDER[0], PANEL_BORDER[1], PANEL_BORDER[2], 0);
    puzzle_box = make_rect(list, cx, cy, 680, 420, PANEL_BG[0], PANEL_BG[1], PANEL_BG[2], 0);
    make_rect(list, cx, cy - 178, 680, 8, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 0);

    puzzle_msg_success = make_text(list, cx, cy + 155, "Correct!", 1.0, 110, 220, 120, 0);
    puzzle_msg_fail = make_text(list, cx, cy + 155, "Incorrect. Try again.", 0.85, 230, 90, 80, 0);

    draw_input_box(list, cx, cy);
    draw_puzzle_input_letters(list, cx, cy);

    puzzle_submit_box = make_rect(list, cx - 115, cy + 195, 190, 58, BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2], 0);
    puzzle_submit_text = make_text(list, cx - 115, cy + 195, "SUBMIT", 0.8, 235, 220, 190, 0);
    puzzle_cancel_box = make_rect(list, cx + 115, cy + 195, 190, 58, BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2], 0);
    puzzle_cancel_text = make_text(list, cx + 115, cy + 195, "CANCEL", 0.8, 235, 220, 190, 0);

    const desk_title = make_text(list, cx, cy - 155, "THE DESK - A RIDDLE GUARDS THE DRAWER", 0.95, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
    const desk_instr = make_text(list, cx, cy - 112, "\"Every detective keeps one open until the truth is found.\"", 0.66, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
    const desk_instr_2 = make_text(list, cx, cy - 82, "Click the letters to spell the answer.", 0.66, 255, 255, 255, 0);
    puzzle_headers[array_length(puzzle_headers)] = ["desk", desk_title, desk_instr, desk_instr_2];

    for (let i = 0; i < 4; i = i + 1) {
        const tx = cx - 210 + i * 140;
        const tile = make_text(list, tx, cy - 20, DESK_TILE_LABELS[i], 2.2, TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2], 0);
        desk_tiles[i] = [tile, TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2]];
        const num = make_text(list, tx, cy + 45, stringify(i + 1), 0.7, 190, 175, 210, 0);
        desk_number_labels[i] = [num, 190, 175, 210];
    }

    const painting_title = make_text(list, cx, cy - 155, "THE PAINTING - DECODE THE CIPHER", 0.95, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
    const painting_instr = make_text(list, cx, cy - 112, "A = 1, B = 2, C = 3 ...", 0.68, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
    const painting_instr_2 = make_text(list, cx, cy - 82, "Decode 13 - 15 - 15 - 14 and click the word.", 0.66, 255, 255, 255, 0);
    puzzle_headers[array_length(puzzle_headers)] = ["painting", painting_title, painting_instr, painting_instr_2];

    for (let i = 0; i < 3; i = i + 1) {
        const ox = cx - 210 + i * 210;
        const opt = make_text(list, ox, cy - 20, PAINTING_OPTIONS[i], 1.15, TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2], 0);
        painting_options[i] = [opt, TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2]];
        const num = make_text(list, ox, cy + 45, stringify(i + 1), 0.7, 190, 175, 210, 0);
        painting_number_labels[i] = [num, 190, 175, 210];
    }

    const bookshelf_title = make_text(list, cx, cy - 155, "THE BOOKSHELF - ORDER OF INVESTIGATION", 0.95, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
    const bookshelf_instr = make_text(list, cx, cy - 112, "Build the case: reason, proof, culprit, ruling.", 0.68, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
    const bookshelf_instr_2 = make_text(list, cx, cy - 82, "Click the four cards in that order.", 0.68, 255, 255, 255, 0);
    puzzle_headers[array_length(puzzle_headers)] = ["bookshelf", bookshelf_title, bookshelf_instr, bookshelf_instr_2];

    for (let i = 0; i < 4; i = i + 1) {
        const tx = cx - 210 + i * 140;
        const tile = make_text(list, tx, cy - 20, BOOKSHELF_TILE_LABELS[i], 0.86, TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2], 0);
        bookshelf_tiles[i] = [tile, TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2]];
        const num = make_text(list, tx, cy + 45, stringify(i + 1), 0.7, 190, 175, 210, 0);
        bookshelf_number_labels[i] = [num, 190, 175, 210];
    }

    const safe_title = make_text(list, cx, cy - 155, "THE TREASURE CHEST - THREE DIGIT CODE", 0.95, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
    const safe_instr = make_text(list, cx, cy - 112, "Count: candles / solved puzzles / letters in MOON.", 0.68, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
    const safe_instr_2 = make_text(list, cx, cy - 82, "Click the three digits in that order.", 0.68, 255, 255, 255, 0);
    puzzle_headers[array_length(puzzle_headers)] = ["safe", safe_title, safe_instr, safe_instr_2];

    for (let i = 0; i < 3; i = i + 1) {
        const dx = cx - 80 + i * 80;
        const dot = make_circle(list, dx, cy - 20, 19, DOT_EMPTY[0], DOT_EMPTY[1], DOT_EMPTY[2], 0);
        safe_dots[i] = [dot, DOT_EMPTY[0], DOT_EMPTY[1], DOT_EMPTY[2]];
    }
    for (let digit = 0; digit < 10; digit = digit + 1) {
        const bx = cx - 225 + digit * 50;
        safe_digit_buttons[digit] = make_mouse_button(list, bx, cy + 45, 42, 42, stringify(digit), 0.62, 0);
    }

    return undefined;
}

function hide_typed_input_display() {
    update_color(puzzle_underscore_obj, [40, 35, 30, 0]);
    for (let slot = 0; slot < TYPED_MAX; slot = slot + 1) {
        for (let li = 0; li < 26; li = li + 1) {
            update_color(puzzle_letter_objs[slot][li], [40, 35, 30, 0]);
        }
    }
    return undefined;
}

function hide_all_puzzle_ui() {
    set_color([puzzle_backdrop, 4, 3, 6], 0);
    set_color([puzzle_border_outer, PANEL_BORDER[0], PANEL_BORDER[1], PANEL_BORDER[2]], 0);
    set_color([puzzle_box, PANEL_BG[0], PANEL_BG[1], PANEL_BG[2]], 0);
    set_color([puzzle_msg_success, 110, 220, 120], 0);
    set_color([puzzle_msg_fail, 230, 90, 80], 0);
    set_color([puzzle_input_label, 225, 210, 235], 0);
    set_color([puzzle_input_box, 245, 232, 205], 0);
    set_color([puzzle_submit_box, BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2]], 0);
    set_color([puzzle_submit_text, 235, 220, 190], 0);
    set_color([puzzle_cancel_box, BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2]], 0);
    set_color([puzzle_cancel_text, 235, 220, 190], 0);

    hide_typed_input_display();

    for (let i = 0; i < array_length(puzzle_headers); i = i + 1) {
        const h = puzzle_headers[i];
        set_color([h[1], 230, 190, 90], 0);
        set_color([h[2], CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2]], 0);
        set_color([h[3], 255, 255, 255], 0);
    }
    for (let i = 0; i < 4; i = i + 1) {
        set_color(desk_tiles[i], 0);
        set_color(desk_number_labels[i], 0);
        set_color(bookshelf_tiles[i], 0);
        set_color(bookshelf_number_labels[i], 0);
    }
    for (let i = 0; i < 3; i = i + 1) {
        set_color(painting_options[i], 0);
        set_color(painting_number_labels[i], 0);
        set_color(safe_dots[i], 0);
    }
    for (let digit = 0; digit < 10; digit = digit + 1) {
        set_mouse_button_alpha(safe_digit_buttons[digit], 0);
    }
    return undefined;
}

function show_puzzle_group(name) {
    set_color([puzzle_backdrop, 4, 3, 6], 195);
    set_color([puzzle_border_outer, PANEL_BORDER[0], PANEL_BORDER[1], PANEL_BORDER[2]], 255);
    set_color([puzzle_box, PANEL_BG[0], PANEL_BG[1], PANEL_BG[2]], 255);
    const typing_enabled = name === "desk" || name === "painting";
    set_color([puzzle_input_label, 225, 210, 235], typing_enabled ? 255 : 0);
    set_color([puzzle_input_box, 245, 232, 205], typing_enabled ? 255 : 0);
    set_color([puzzle_submit_box, BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2]], 255);
    set_color([puzzle_submit_text, 235, 220, 190], 255);
    set_color([puzzle_cancel_box, BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2]], 255);
    set_color([puzzle_cancel_text, 235, 220, 190], 255);

    for (let i = 0; i < array_length(puzzle_headers); i = i + 1) {
        const h = puzzle_headers[i];
        const on = h[0] === name;
        set_color([h[1], 230, 190, 90], on ? 255 : 0);
        set_color([h[2], CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2]], on ? 255 : 0);
        set_color([h[3], 255, 255, 255], on ? 255 : 0);
    }

    if (name === "desk") {
        for (let i = 0; i < 4; i = i + 1) {
            desk_tiles[i][1] = TILE_DEFAULT[0]; desk_tiles[i][2] = TILE_DEFAULT[1]; desk_tiles[i][3] = TILE_DEFAULT[2];
            set_color(desk_tiles[i], 255);
            set_color(desk_number_labels[i], 255);
        }
    } else if (name === "painting") {
        for (let i = 0; i < 3; i = i + 1) {
            painting_options[i][1] = TILE_DEFAULT[0]; painting_options[i][2] = TILE_DEFAULT[1]; painting_options[i][3] = TILE_DEFAULT[2];
            set_color(painting_options[i], 255);
            set_color(painting_number_labels[i], 255);
        }
    } else if (name === "bookshelf") {
        for (let i = 0; i < 4; i = i + 1) {
            bookshelf_tiles[i][1] = TILE_DEFAULT[0]; bookshelf_tiles[i][2] = TILE_DEFAULT[1]; bookshelf_tiles[i][3] = TILE_DEFAULT[2];
            set_color(bookshelf_tiles[i], 255);
            set_color(bookshelf_number_labels[i], 255);
        }
    } else if (name === "safe") {
        for (let i = 0; i < 3; i = i + 1) {
            safe_dots[i][1] = DOT_EMPTY[0]; safe_dots[i][2] = DOT_EMPTY[1]; safe_dots[i][3] = DOT_EMPTY[2];
            set_color(safe_dots[i], 255);
        }
        for (let digit = 0; digit < 10; digit = digit + 1) {
            set_mouse_button_alpha(safe_digit_buttons[digit], 255);
        }
    }
    return undefined;
}

function start_puzzle(name) {
    active_puzzle = name;
    puzzle_sequence = [];
    puzzle_typed_letters = [];
    puzzle_feedback = "";
    puzzle_feedback_timer = 0;
    show_puzzle_group(name);
    update_puzzle_input();
    return undefined;
}

function close_puzzle() {
    active_puzzle = "";
    puzzle_sequence = [];
    puzzle_typed_letters = [];
    puzzle_feedback = "";
    hide_all_puzzle_ui();
    return undefined;
}

function arrays_equal(a, b) {
    if (array_length(a) !== array_length(b)) {
        return false;
    }
    let equal = true;
    for (let i = 0; i < array_length(a); i = i + 1) {
        if (a[i] !== b[i]) {
            equal = false;
        }
    }
    return equal;
}

function remove_last(arr) {
    const result = [];
    for (let i = 0; i < array_length(arr) - 1; i = i + 1) {
        result[i] = arr[i];
    }
    return result;
}

function letters_to_string(arr) {
    let s = "";
    for (let i = 0; i < array_length(arr); i = i + 1) {
        s = s + arr[i];
    }
    return s;
}

function update_puzzle_input() {
    hide_typed_input_display();
    if (active_puzzle === "bookshelf" || active_puzzle === "safe") {
        return undefined;
    }

    const n = array_length(puzzle_typed_letters);
    const cx = SCREEN_WIDTH / 2;
    const cy = SCREEN_HEIGHT / 2;
    const y = cy + 108;

    if (n === 0) {
        update_position(puzzle_underscore_obj, [cx, y]);
        update_color(puzzle_underscore_obj, [40, 35, 30, 255]);
        return undefined;
    }

    const start_x = cx - (n - 1) * INPUT_CHAR_SPACING / 2;
    for (let i = 0; i < n; i = i + 1) {
        const li = letter_index_of(puzzle_typed_letters[i]);
        const obj = puzzle_letter_objs[i][li];
        update_position(obj, [start_x + i * INPUT_CHAR_SPACING, y]);
        update_color(obj, [40, 35, 30, 255]);
    }
    return undefined;
}

function select_desk_tile(tile_index) {
    puzzle_sequence[array_length(puzzle_sequence)] = tile_index;
    desk_tiles[tile_index][1] = TILE_SELECTED[0];
    desk_tiles[tile_index][2] = TILE_SELECTED[1];
    desk_tiles[tile_index][3] = TILE_SELECTED[2];
    set_color(desk_tiles[tile_index], 255);
    return undefined;
}

function select_painting_option(opt_index) {
    puzzle_sequence = [opt_index];
    painting_options[opt_index][1] = TILE_SELECTED[0];
    painting_options[opt_index][2] = TILE_SELECTED[1];
    painting_options[opt_index][3] = TILE_SELECTED[2];
    set_color(painting_options[opt_index], 255);
    return undefined;
}

function select_bookshelf_tile(tile_index) {
    puzzle_sequence[array_length(puzzle_sequence)] = tile_index;
    bookshelf_tiles[tile_index][1] = TILE_SELECTED[0];
    bookshelf_tiles[tile_index][2] = TILE_SELECTED[1];
    bookshelf_tiles[tile_index][3] = TILE_SELECTED[2];
    set_color(bookshelf_tiles[tile_index], 255);
    return undefined;
}

function select_safe_digit(digit) {
    const dot_index = array_length(puzzle_sequence);
    if (dot_index < 3) {
        puzzle_sequence[dot_index] = digit;
        safe_dots[dot_index][1] = DOT_FILLED[0];
        safe_dots[dot_index][2] = DOT_FILLED[1];
        safe_dots[dot_index][3] = DOT_FILLED[2];
        set_color(safe_dots[dot_index], 255);
    }
    return undefined;
}

function apply_digit_input(digit) {
    if (active_puzzle === "desk") {
        if (digit >= 1 && digit <= 4) {
            select_desk_tile(digit - 1);
        }
    } else if (active_puzzle === "painting") {
        if (digit >= 1 && digit <= 3) {
            select_painting_option(digit - 1);
        }
    } else if (active_puzzle === "bookshelf") {
        if (digit >= 1 && digit <= 4) {
            select_bookshelf_tile(digit - 1);
        }
    } else if (active_puzzle === "safe") {
        select_safe_digit(digit);
    }
    return undefined;
}

function check_answer(name) {
    let correct = false;

    if (name === "desk") {
        correct = arrays_equal(puzzle_sequence, DESK_CORRECT) || arrays_equal(puzzle_typed_letters, DESK_ANSWER_LETTERS);
    } else if (name === "painting") {
        correct = puzzle_sequence[0] === PAINTING_CORRECT || arrays_equal(puzzle_typed_letters, PAINTING_ANSWER_LETTERS);
    } else if (name === "bookshelf") {
        correct = arrays_equal(puzzle_sequence, BOOKSHELF_CORRECT);
    } else if (name === "safe") {
        correct = arrays_equal(puzzle_sequence, SAFE_CORRECT);
    }

    if (correct) {
        puzzle_feedback = "success";
        set_color([puzzle_msg_success, 110, 220, 120], 255);
        update_scale(puzzle_msg_success, [1.0, 1.0]);
    } else {
        puzzle_feedback = "fail";
        set_color([puzzle_msg_fail, 230, 90, 80], 255);
    }
    puzzle_feedback_timer = PUZZLE_FEEDBACK_FRAMES;
    return undefined;
}

function submit_puzzle() {
    if (active_puzzle === "" || puzzle_feedback_timer > 0) {
        return undefined;
    }
    check_answer(active_puzzle);
    return undefined;
}

function give_reward(name, loop_count) {
    if (name === "desk") {
        room1_state[ST_DESK] = true;
        drawer_open_start = loop_count;
        unlock_next_object("painting");
    } else if (name === "painting") {
        reveal_switch(loop_count);
    } else if (name === "bookshelf") {
        slide_bookshelf(loop_count);
    } else if (name === "safe") {
        open_treasure(loop_count);
    }
    return undefined;
}

function unlock_next_object(name) {
    if (name === "painting") {
    } else if (name === "switch") {
    } else if (name === "safe") {
    }
    return undefined;
}

function reveal_switch(loop_count) {
    room1_state[ST_PAINTING] = true;
    painting_move_start = loop_count;
    draw_dialogue("painting_solved");
    unlock_next_object("switch");
    return undefined;
}

function toggle_switch(loop_count) {
    room1_state[ST_SWITCH] = true;
    switch_toggle_start = loop_count;
    play_audio(mechanism_sound);
    trigger_room_shake(loop_count);
    draw_dialogue("switch_flip");
    return undefined;
}

function slide_bookshelf(loop_count) {
    room1_state[ST_BOOKSHELF] = true;
    bookshelf_move_start = loop_count;
    draw_dialogue("bookshelf_solved");
    spawn_treasure_chest();
    return undefined;
}

function spawn_treasure_chest() {
    return undefined;
}

function open_treasure(loop_count) {
    room1_state[ST_SAFE] = true;
    chest_open_start = loop_count;
    play_audio(chest_sound);
    draw_dialogue("chest_unlocked");
    spawn_room_key(loop_count);
    return undefined;
}

function spawn_room_key(loop_count) {
    key_spawn_start = loop_count;
    room1_state[ST_CHEST_OPEN] = true;
    return undefined;
}

const KEY_REWARD_FRAMES = math_round(2.5 * FPS);

function key_reward_active(loop_count) {
    return key_spawn_start >= 0 && loop_count < key_spawn_start + KEY_REWARD_FRAMES;
}

function play_key_animation(t, loop_count) {
    if (key_spawn_start < 0) {
        return undefined;
    }

    const elapsed = loop_count - key_spawn_start;
    const p = math_min(1, math_max(0, elapsed / KEY_REWARD_FRAMES));

    const rise = -18 * ease_out(math_min(1, p * 1.6));
    const scale_pop = 1 + 0.6 * math_max(0, 1 - math_min(1, elapsed / (FPS * 0.5)));

    for (let i = 0; i < array_length(room1_key_parts); i = i + 1) {
        const part = room1_key_parts[i];
        update_scale(part, [scale_pop, scale_pop]);
    }
    update_position(room1_key_glow, [ROOM1_CHEST_X, ROOM1_CHEST_Y + rise]);

    const glow_pulse = 1.3 + 0.5 * math_sin(t * 6);
    const glow_alpha = key_reward_active(loop_count) ? 220 : (90 + 60 * math_sin(t * 2.5));
    update_scale(room1_key_glow, [glow_pulse, glow_pulse]);
    update_color(room1_key_glow, [255, 235, 140, glow_alpha]);

    if (elapsed >= 0 && elapsed < math_round(0.25 * FPS)) {
        const flash_p = 1 - elapsed / math_round(0.25 * FPS);
        update_color(room1_fade_rect, [255, 240, 180, 160 * flash_p]);
    } else if (elapsed >= math_round(0.25 * FPS) && elapsed < math_round(0.3 * FPS) && door_fade_state === "none") {
        update_color(room1_fade_rect, [0, 0, 0, 0]);
    }

    if (key_reward_active(loop_count)) {
        const banner_p = math_min(1, elapsed / (FPS * 0.3));
        update_color(room1_key_banner, [255, 225, 120, 255 * banner_p]);
        update_scale(room1_key_banner, [1 + 0.15 * math_sin(t * 8), 1 + 0.15 * math_sin(t * 8)]);

        for (let i = 0; i < array_length(room1_key_sparkles); i = i + 1) {
            const s = room1_key_sparkles[i];
            const spark = s[0];
            const angle = s[1] + t * 2;
            const radius = 30 + 20 * p;
            const sx = ROOM1_CHEST_X + radius * math_cos(angle);
            const sy = ROOM1_CHEST_Y + rise + radius * math_sin(angle);
            update_position(spark, [sx, sy]);
            update_color(spark, [255, 230, 140, 200 * (1 - p * 0.3)]);
            update_scale(spark, [0.6 + 0.4 * math_sin(t * 5 + i), 0.6 + 0.4 * math_sin(t * 5 + i)]);
        }
    } else {
        update_color(room1_key_banner, [255, 225, 120, 0]);
        for (let i = 0; i < array_length(room1_key_sparkles); i = i + 1) {
            update_color(room1_key_sparkles[i][0], [255, 230, 140, 0]);
        }
    }

    return undefined;
}

let inventory = [];

function collect_key() {
    room1_state[ST_KEY] = true;
    player_has_room1_key = true;
    inventory[array_length(inventory)] = "Room 1 Master Key";
    draw_dialogue("key_pickup");
    return undefined;
}

function pickup_room_key() {
    return collect_key();
}

function unlock_exit() {
    room1_state[ST_DOOR] = true;
    sync_room1_visuals();
    complete_room1();
    return undefined;
}

function unlock_exit_door() {
    return unlock_exit();
}

function complete_room1() {
    complete_room(0);
    return undefined;
}

function handle_puzzle_keyboard() {
    for (let li = 0; li < 26; li = li + 1) {
        const down = input_key_down(LETTER_KEYS[li]);
        const pressed = down && !letter_prev[li];
        letter_prev[li] = down;
        if (pressed && array_length(puzzle_typed_letters) < TYPED_MAX) {
            puzzle_typed_letters[array_length(puzzle_typed_letters)] = UPPER_LETTERS[li];
            update_puzzle_input();
        }
    }

    const back_down = input_key_down("Backspace");
    const back_pressed = back_down && !backspace_prev;
    backspace_prev = back_down;
    if (back_pressed && array_length(puzzle_typed_letters) > 0) {
        puzzle_typed_letters = remove_last(puzzle_typed_letters);
        update_puzzle_input();
    }

    const enter_down = input_key_down("Enter");
    const enter_pressed = enter_down && !puzzle_enter_prev;
    puzzle_enter_prev = enter_down;
    if (enter_pressed) {
        submit_puzzle();
    }

    const digit = pressed_digit_this_frame();
    if (digit !== -1) {
        apply_digit_input(digit);
    }

    return undefined;
}

function handle_puzzle_mouse(clicked) {
    if (active_puzzle === "desk") {
        for (let i = 0; i < 4; i = i + 1) {
            const obj = desk_tiles[i][0];
            const tx = SCREEN_WIDTH / 2 - 210 + i * 140;
            if (pointer_in_rect(tx, SCREEN_HEIGHT / 2 - 20, 100, 100)) {
                update_color(obj, [TILE_HOVER[0], TILE_HOVER[1], TILE_HOVER[2], 255]);
                if (clicked) { select_desk_tile(i); }
            } else {
                set_color(desk_tiles[i], 255);
            }
        }
    } else if (active_puzzle === "painting") {
        for (let i = 0; i < 3; i = i + 1) {
            const obj = painting_options[i][0];
            const ox = SCREEN_WIDTH / 2 - 210 + i * 210;
            if (pointer_in_rect(ox, SCREEN_HEIGHT / 2 - 20, 175, 85)) {
                update_color(obj, [TILE_HOVER[0], TILE_HOVER[1], TILE_HOVER[2], 255]);
                if (clicked) { select_painting_option(i); }
            } else {
                set_color(painting_options[i], 255);
            }
        }
    } else if (active_puzzle === "bookshelf") {
        for (let i = 0; i < 4; i = i + 1) {
            const obj = bookshelf_tiles[i][0];
            const tx = SCREEN_WIDTH / 2 - 210 + i * 140;
            if (pointer_in_rect(tx, SCREEN_HEIGHT / 2 - 20, 130, 85)) {
                update_color(obj, [TILE_HOVER[0], TILE_HOVER[1], TILE_HOVER[2], 255]);
                if (clicked) { select_bookshelf_tile(i); }
            } else {
                set_color(bookshelf_tiles[i], 255);
            }
        }
    } else if (active_puzzle === "safe") {
        for (let digit = 0; digit < 10; digit = digit + 1) {
            if (mouse_button_clicked(safe_digit_buttons[digit], clicked)) {
                select_safe_digit(digit);
            }
        }
    }

    const submit_hover = pointer_in_rect(SCREEN_WIDTH / 2 - 115, SCREEN_HEIGHT / 2 + 195, 190, 58);
    update_color(puzzle_submit_box, submit_hover
        ? [BUTTON_WOOD_HOVER[0], BUTTON_WOOD_HOVER[1], BUTTON_WOOD_HOVER[2], 255]
        : [BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2], 255]);
    if (submit_hover && clicked) {
        submit_puzzle();
    }

    const cancel_hover = pointer_in_rect(SCREEN_WIDTH / 2 + 115, SCREEN_HEIGHT / 2 + 195, 190, 58);
    update_color(puzzle_cancel_box, cancel_hover
        ? [BUTTON_WOOD_HOVER[0], BUTTON_WOOD_HOVER[1], BUTTON_WOOD_HOVER[2], 255]
        : [BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2], 255]);
    if (cancel_hover && clicked) {
        close_puzzle();
    }

    return undefined;
}

function draw_puzzle(loop_count, escaped, clicked) {
    if (active_puzzle === "") {
        return undefined;
    }

    if (escaped) {
        close_puzzle();
        return undefined;
    }

    if (puzzle_feedback_timer > 0) {
        if (puzzle_feedback === "success") {
            const progress = 1 - (puzzle_feedback_timer / PUZZLE_FEEDBACK_FRAMES);
            const pulse = 1 + 0.35 * math_sin(progress * math_PI);
            update_scale(puzzle_msg_success, [1.0 * pulse, 1.0 * pulse]);
        }

        puzzle_feedback_timer = puzzle_feedback_timer - 1;
        if (puzzle_feedback_timer === 0) {
            if (puzzle_feedback === "success") {
                const solved_name = active_puzzle;
                set_color([puzzle_msg_success, 110, 220, 120], 0);
                close_puzzle();
                give_reward(solved_name, loop_count);
            } else {
                set_color([puzzle_msg_fail, 230, 90, 80], 0);
                puzzle_feedback = "";
                puzzle_sequence = [];
                puzzle_typed_letters = [];
                update_puzzle_input();
                show_puzzle_group(active_puzzle);
            }
        }
        return undefined;
    }

    handle_puzzle_keyboard();
    handle_puzzle_mouse(clicked);

    return undefined;
}

function draw_room1_layout(list) {
    make_rect(list, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, SCREEN_WIDTH / 2, 215, 770, 330, 181, 165, 149, 255);
    for (let row = 0; row < 3; row = row + 1) {
        make_rect(list, SCREEN_WIDTH / 2, 100 + row * 105, 770, 3, 126, 110, 104, 110);
    }

    make_rect(list, SCREEN_WIDTH / 2, 480, 770, 210, 116, 80, 65, 255);
    for (let plank = 0; plank < 9; plank = plank + 1) {
        make_rect(list, 20 + plank * 90, 480, 3, 210, 154, 112, 83, 180);
    }

    make_rect(list, SCREEN_WIDTH / 2, 370, 770, 12, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    make_triangle(list, 225, 220, 300, 330, 255, 238, 205, 24);
    make_triangle(list, 640, 220, 300, 330, 255, 238, 205, 18);
    draw_stage_frame(list);
    make_rect(list, 132, 45, 230, 42, 112, 7, 13, 255);
    make_rect(list, 132, 64, 230, 4, CUTOUT_YELLOW[0], 90, 8, 255);
    make_text(list, 132, 45, "ROOM 1  /  STUDY", 0.58, 255, 255, 255, 255);

    return undefined;
}

function draw_furniture(list) {
    const painting_parts = [];
    const bookshelf_parts = [];

    const track = (arr, obj, x, y) => {
        arr[array_length(arr)] = [obj, x, y];
        return obj;
    };

    make_rect(list, 195, 446, 164, 84, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, 190, 440, 150, 70, CUTOUT_BROWN[0], CUTOUT_BROWN[1], CUTOUT_BROWN[2], 255);
    make_rect(list, 190, 415, 158, 12, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    make_rect(list, 130, 468, 14, 55, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, 250, 468, 14, 55, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    room1_drawer1 = make_rect(list, 190, 462, 110, 18, 148, 84, 55, 255);
    make_circle(list, 190, 462, 4, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    room1_blocking_rects[array_length(room1_blocking_rects)] = [190, 445, 150, 90, "furniture"];

    track(bookshelf_parts, make_rect(list, 115, 425, 107, 202, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255), 115, 425);
    track(bookshelf_parts, make_rect(list, 110, 420, 95, 190, CUTOUT_GREEN[0], CUTOUT_GREEN[1], CUTOUT_GREEN[2], 255), 110, 420);
    for (let shelf = 0; shelf < 4; shelf = shelf + 1) {
        track(bookshelf_parts, make_rect(list, 110, 350 + shelf * 45, 88, 7, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255), 110, 350 + shelf * 45);
    }
    for (let book = 0; book < 8; book = book + 1) {
        const bx = 75 + book * 11;
        const shelf_row = book % 4;
        const by = 335 + shelf_row * 45;
        const br = 100 + math_random() * 140;
        const bg = 45 + math_random() * 140;
        const bb = 35 + math_random() * 120;
        track(bookshelf_parts, make_rect(list, bx, by, 9, 34, br, bg, bb, 255), bx, by);
    }
    room1_blocking_rects[array_length(room1_blocking_rects)] = [110, 420, 95, 190, "furniture"];

    const chest_body = make_rect(list, 175, 445, 74, 55, 74, 48, 26, 0);
    const chest_band = make_rect(list, 175, 445, 74, 8, 200, 170, 70, 0);
    room1_chest_lid = make_rect(list, 175, 415, 78, 26, 90, 60, 33, 0);
    const chest_lock = make_circle(list, 175, 420, 8, 200, 170, 70, 0);
    room1_chest_parts = [chest_body, chest_band, room1_chest_lid, chest_lock];

    track(painting_parts, make_rect(list, 435, 201, 142, 112, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255), 435, 201);
    track(painting_parts, make_rect(list, 430, 195, 130, 100, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255), 430, 195);
    track(painting_parts, make_rect(list, 430, 195, 110, 82, CUTOUT_BLUE[0], CUTOUT_BLUE[1], CUTOUT_BLUE[2], 255), 430, 195);
    track(painting_parts, make_triangle(list, 430, 220, 46, 34, CUTOUT_GREEN[0], CUTOUT_GREEN[1], CUTOUT_GREEN[2], 255), 430, 220);
    track(painting_parts, make_circle(list, 460, 175, 14, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255), 460, 175);

    make_rect(list, 620, 190, 138, 158, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const window_glass = make_rect(list, 620, 190, 112, 132, 130, 190, 211, 255);
    make_rect(list, 620, 190, 7, 132, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, 620, 190, 112, 7, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const curtain = make_rect(list, 565, 195, 38, 166, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    update_position(curtain, [565, 195]);

    const door_x = 735;
    const door_y = 460;
    room1_door_frame = make_rect(list, door_x, door_y, 136, 226, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, door_x, door_y, 110, 200, CUTOUT_PURPLE[0], CUTOUT_PURPLE[1], CUTOUT_PURPLE[2], 255);
    make_rect(list, door_x, door_y - 45, 78, 58, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    make_rect(list, door_x, door_y + 45, 78, 58, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    make_circle(list, door_x - 32, door_y, 6, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    room1_lock_parts = draw_lock(list, door_x, door_y);
    room1_lock_label = make_text(list, door_x, door_y + 128, "LOCKED", 0.6, 220, 90, 80, 255);
    room1_blocking_rects[array_length(room1_blocking_rects)] = [door_x, door_y, 130, 220, "door"];

    make_rect(list, 435, 526, 232, 122, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, 430, 520, 220, 110, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    make_rect(list, 430, 520, 190, 80, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    make_rect(list, 430, 520, 150, 50, CUTOUT_GREEN[0], CUTOUT_GREEN[1], CUTOUT_GREEN[2], 255);

    room1_painting_parts = painting_parts;
    room1_bookshelf_parts = bookshelf_parts;

    return [window_glass, curtain];
}

function draw_illustrated_room1_overlays(list) {
    // The illustrated background contains the permanent furniture.
    // These few objects remain code-driven because they change state.
    const chest_body = make_rect(list, ROOM1_CHEST_X, ROOM1_CHEST_Y + 8,
        74, 44, 112, 76, 40, 0);
    const chest_band = make_rect(list, ROOM1_CHEST_X, ROOM1_CHEST_Y + 8,
        74, 7, 198, 158, 72, 0);
    room1_chest_lid = make_rect(list, ROOM1_CHEST_X, ROOM1_CHEST_LID_Y,
        78, 24, 128, 88, 48, 0);
    const chest_lock = make_circle(list, ROOM1_CHEST_X,
        ROOM1_CHEST_Y + 3, 7, 204, 172, 76, 0);
    room1_chest_parts = [chest_body, chest_band, room1_chest_lid, chest_lock];

    room1_lock_parts = draw_lock(list, 744, 455);
    room1_lock_label = make_text(list, 724, 505, "LOCKED", 0.48,
        116, 74, 60, 255);
    return undefined;
}

function make_interactable(list, name, x, y, range, ring_radius, visible_fn, prompt_label) {
    const ring = make_circle(list, x, y, ring_radius, 255, 235, 150, 0);
    room1_interactables[array_length(room1_interactables)] = [name, x, y, range, ring, visible_fn, prompt_label, ring_radius];
    return ring;
}

let room1_key_banner = null;
let room1_key_sparkles = [];
let room1_back_button = null;

function draw_objects(list) {
    const candle = draw_one_candle(list, 195, 405, 1.4);

    const dust = create_dust(list, 14, 200, 550);

    make_interactable(list, "desk", 220, 430, 120, 72, always_visible, "Click to Inspect");
    make_interactable(list, "bookshelf", 205, 205, 155, 80, always_visible, "Click to Inspect");
    make_interactable(list, "painting", 415, 165, 150, 70, painting_visible, "Click to Inspect");
    make_interactable(list, "window", 575, 165, 150, 75, always_visible, "Click to Inspect");
    make_interactable(list, "curtain", 575, 165, 110, 40, always_visible, "Click to Inspect");
    make_interactable(list, "carpet", 455, 420, 150, 115, always_visible, "Click to Inspect");
    make_interactable(list, "door", 735, 460, 100, 70, always_visible, "Click to Unlock Door");

    room1_switch_glow = make_circle(list, 415, 165, 18, 255, 240, 140, 0);
    room1_switch_sprite = make_circle(list, 415, 165, 9, 90, 84, 74, 0);
    room1_switch_lever = make_rect(list, 415, 160, 5, 16, 190, 158, 82, 0);
    make_interactable(list, "switch", 415, 165, 90, 22, switch_visible, "Click to Toggle Switch");

    make_interactable(list, "chest", ROOM1_CHEST_X, ROOM1_CHEST_Y,
        95, 35, chest_visible, "Click to Open Chest");

    room1_key_glow = make_circle(list, ROOM1_CHEST_X, ROOM1_CHEST_Y,
        20, 255, 240, 150, 0);
    const key_body = make_circle(list, ROOM1_CHEST_X, ROOM1_CHEST_Y,
        9, 230, 195, 90, 0);
    const key_shaft = make_rect(list, ROOM1_CHEST_X + 12,
        ROOM1_CHEST_Y, 16, 4, 230, 195, 90, 0);
    const key_tooth = make_rect(list, ROOM1_CHEST_X + 19,
        ROOM1_CHEST_Y + 4, 4, 6, 230, 195, 90, 0);
    room1_key_parts = [key_body, key_shaft, key_tooth];
    make_interactable(list, "key", ROOM1_CHEST_X, ROOM1_CHEST_Y,
        90, 28, key_visible, "Click to Pick Up Key");

    room1_key_banner = make_text(list, SCREEN_WIDTH / 2, 260, "ROOM KEY FOUND!", 1.3, 255, 225, 120, 0);
    for (let i = 0; i < 10; i = i + 1) {
        const spark = make_circle(list, ROOM1_CHEST_X,
            ROOM1_CHEST_Y, 3, 255, 230, 140, 0);
        room1_key_sparkles[i] = [spark, (i / 10) * math_PI * 2];
    }

    const shadow = make_circle(list, room1_player_x, room1_player_y + 22, 13, 0, 0, 0, 120);
    update_scale(shadow, [1.6, 0.25]);
    const body_outline = make_triangle(list, room1_player_x + 1, room1_player_y, 42, 48,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const left_leg = make_rect(list, room1_player_x - 6, room1_player_y + 17, 7, 25,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(left_leg, -0.12);
    const right_leg = make_rect(list, room1_player_x + 6, room1_player_y + 17, 7, 25,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(right_leg, 0.12);
    const coat_tail_left = make_triangle(list, room1_player_x - 8, room1_player_y + 15, 18, 30,
        CUTOUT_BLUE[0], CUTOUT_BLUE[1], CUTOUT_BLUE[2], 255);
    const coat_tail_right = make_triangle(list, room1_player_x + 8, room1_player_y + 15, 18, 30,
        CUTOUT_BLUE[0], CUTOUT_BLUE[1], CUTOUT_BLUE[2], 255);
    const body = make_triangle(list, room1_player_x, room1_player_y - 1, 34, 40,
        CUTOUT_BLUE[0], CUTOUT_BLUE[1], CUTOUT_BLUE[2], 255);
    const head_outline = make_triangle(list, room1_player_x + 2, room1_player_y - 24, 27, 27,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const head = make_triangle(list, room1_player_x + 2, room1_player_y - 25, 21, 22,
        178, 218, 224, 255);
    const eye = make_rect(list, room1_player_x, room1_player_y - 27, 5, 2,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const hat_outline = make_rect(list, room1_player_x, room1_player_y - 36, 42, 10,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(hat_outline, -0.09);
    const hat = make_rect(list, room1_player_x - 1, room1_player_y - 37, 36, 6,
        CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    update_rotation(hat, -0.09);
    const hat_crown = make_triangle(list, room1_player_x - 3, room1_player_y - 44, 24, 22,
        CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    room1_player_parts = [
        [body, 0, 0],
        [head, 2, -25],
        [hat, -1, -37],
        [shadow, 0, 22],
        [body_outline, 1, 0],
        [left_leg, -6, 17],
        [right_leg, 6, 17],
        [coat_tail_left, -8, 15],
        [coat_tail_right, 8, 15],
        [head_outline, 2, -24],
        [eye, 0, -27],
        [hat_outline, 0, -36],
        [hat_crown, -3, -44]
    ];

    room1_dialogue_box = make_rect(list, SCREEN_WIDTH / 2, 495, 650, 150, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 0);

    const lines = [
        ["window", "Window", "Moonlight spills through the grimy glass, falling squarely", "on the painting across the room."],
        ["curtain", "Curtain", "You pull the curtain aside - just old,", "faded fabric."],
        ["carpet", "Carpet", "A faded carpet, threadbare with age.", "Nothing underneath."],
        ["door_locked", "Door", "The door is locked.", ""],
        ["painting_solved", "Painting", "You hear a clicking sound behind the painting...", "The frame slides aside on its own."],
        ["switch_flip", "Switch", "A hidden mechanism has been activated.", "Something shifts elsewhere in the room."],
        ["switch_already", "Switch", "The switch has already been thrown.", ""],
        ["desk_locked", "Desk", "The desk drawer won't budge - maybe it's", "puzzle-locked."],
        ["painting_locked", "Painting", "The frame won't move yet. Perhaps a clue", "is needed first."],
        ["bookshelf_locked", "Bookshelf", "The shelf won't slide - something else", "must be triggered first."],
        ["bookshelf_solved", "Bookshelf", "The bookshelf slides open, revealing a hidden", "compartment - and an old treasure chest."],
        ["safe_locked", "Chest", "A heavy old chest. It needs a code.", ""],
        ["chest_unlocked", "Chest", "The lock suddenly clicks open...", "The lid creaks wide - something golden glints inside."],
        ["key_pickup", "Key", "You obtained the Room 1 Master Key.", "The exit door creaks - it should open now."],
        ["door_complete", "Room 1 Complete", "The door swings open into darkness beyond.", ""]
    ];
    for (let i = 0; i < array_length(lines); i = i + 1) {
        const key = lines[i][0];
        const title = lines[i][1];
        const line1 = lines[i][2];
        const line2 = lines[i][3];
        const title_obj = make_text(list, SCREEN_WIDTH / 2, 440, title, 0.8, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
        const line1_obj = make_text(list, SCREEN_WIDTH / 2, 478, line1, 0.68, 255, 255, 255, 0);
        const line2_obj = make_text(list, SCREEN_WIDTH / 2, 506, line2, 0.68, 255, 255, 255, 0);
        room1_dialogue_texts[array_length(room1_dialogue_texts)] = [key, title_obj, line1_obj, line2_obj];
    }

    room1_dialogue_continue = make_text(list, SCREEN_WIDTH / 2, 548, "Click anywhere to continue", 0.5, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);

    room1_prompt_bg = make_rect(list, 0, 0, 230, 34, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 0);
    room1_prompt_text = make_text(list, 0, 0, "CLICK TO INSPECT", 0.6, 255, 255, 255, 0);

    make_text(list, SCREEN_WIDTH / 2, 582, "Click glowing objects to investigate.", 0.66, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 235);
    room1_back_button = make_mouse_button(list, 705, 45, 150, 42, "HALLWAY", 0.56, 255);

    return [candle, dust];
}

function sync_room1_visuals() {
    const lock_alpha = room1_state[ST_DOOR] ? 0 : 255;
    for (let i = 0; i < array_length(room1_lock_parts); i = i + 1) {
        update_color(room1_lock_parts[i], [
            i === 1 ? 210 : 40,
            i === 1 ? 175 : (i === 0 ? 40 : 30),
            i === 1 ? 60 : (i === 0 ? 45 : 15),
            lock_alpha
        ]);
    }
    update_color(room1_lock_label, [220, 90, 80, lock_alpha]);

    return undefined;
}

function enter_room1() {
    door_fade_state = "none";
    change_scene("room1");
    close_dialogue();
    close_puzzle();
    sync_room1_visuals();
    return undefined;
}

function collides_with_furniture(x, y) {
    let blocked = false;
    for (let i = 0; i < array_length(room1_blocking_rects); i = i + 1) {
        const r = room1_blocking_rects[i];
        const is_door = r[4] === "door";
        const skip = is_door && room1_state[ST_DOOR];
        if (!skip) {
            const half_w = r[2] / 2 + PLAYER_RADIUS;
            const half_h = r[3] / 2 + PLAYER_RADIUS;
            if (x > r[0] - half_w && x < r[0] + half_w && y > r[1] - half_h && y < r[1] + half_h) {
                blocked = true;
            }
        }
    }
    return blocked;
}

function update_room1_movement() {
    let dx = 0;
    let dy = 0;
    if (input_key_down("a") || input_key_down("ArrowLeft")) { dx = dx - PLAYER_SPEED; }
    if (input_key_down("d") || input_key_down("ArrowRight")) { dx = dx + PLAYER_SPEED; }
    if (input_key_down("w") || input_key_down("ArrowUp")) { dy = dy - PLAYER_SPEED; }
    if (input_key_down("s") || input_key_down("ArrowDown")) { dy = dy + PLAYER_SPEED; }

    room1_detective_direction =
        direction_from_delta(dx, dy, room1_detective_direction);
    room1_detective_moving = dx !== 0 || dy !== 0;

    let new_x = room1_player_x + dx;
    if (!collides_with_furniture(new_x, room1_player_y) && new_x - PLAYER_RADIUS > ROOM1_MIN_X && new_x + PLAYER_RADIUS < ROOM1_MAX_X) {
        room1_player_x = new_x;
    }

    let new_y = room1_player_y + dy;
    if (!collides_with_furniture(room1_player_x, new_y) && new_y - PLAYER_RADIUS > ROOM1_MIN_Y && new_y + PLAYER_RADIUS < ROOM1_MAX_Y) {
        room1_player_y = new_y;
    }

    for (let i = 0; i < array_length(room1_player_parts); i = i + 1) {
        const part = room1_player_parts[i];
        update_position(part[0], [room1_player_x + part[1], room1_player_y + part[2]]);
    }

    return undefined;
}

function update_room1_highlights(t) {
    let nearest_name = "";
    let nearest_prompt = "Click to Inspect";
    let nearest_x = 0;
    let nearest_y = 0;
    let nearest_dist = 999999;

    for (let i = 0; i < array_length(room1_interactables); i = i + 1) {
        const entry = room1_interactables[i];
        const name = entry[0];
        const x = entry[1];
        const y = entry[2];
        const range = entry[3];
        const ring = entry[4];
        const visible_fn = entry[5];
        const prompt_label = entry[6];

        if (visible_fn()) {
            const dx = room1_player_x - x;
            const dy = room1_player_y - y;
            const dist = math_sqrt(dx * dx + dy * dy);
            const hovered = pointer_in_circle(x, y, entry[7]);

            if (dist < range || hovered) {
                const pulse = 90 + 70 * math_sin(t * 5);
                update_color(ring, [CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], hovered ? 220 : pulse]);
                if (hovered || dist < nearest_dist) {
                    nearest_dist = dist;
                    nearest_name = name;
                    nearest_prompt = prompt_label;
                    nearest_x = x;
                    nearest_y = y;
                }
            } else {
                update_color(ring, [255, 235, 150, 0]);
            }
        } else {
            update_color(ring, [255, 235, 150, 0]);
        }
    }

    room1_nearest_name = nearest_name;
    room1_nearest_prompt = nearest_prompt;

    if (nearest_name !== "") {
        update_position(room1_prompt_text, [nearest_x, nearest_y - 60]);
        update_position(room1_prompt_bg, [nearest_x, nearest_y - 60]);
        update_color(room1_prompt_text, [255, 230, 120, 255]);
        update_color(room1_prompt_bg, [15, 12, 15, 170]);
    } else {
        update_color(room1_prompt_text, [255, 230, 120, 0]);
        update_color(room1_prompt_bg, [15, 12, 15, 0]);
    }

    return undefined;
}

function handle_room1_mouse_actions(clicked, loop_count) {
    if (mouse_button_clicked(room1_back_button, clicked)) {
        change_scene("room_select");
        sync_room_select_visuals(hallway_doors);
        return true;
    }
    if (!clicked) {
        return false;
    }
    // Later interactables are the revealed/topmost versions of objects
    // at the same location (switch over painting, key over chest).
    for (let i = array_length(room1_interactables) - 1; i >= 0; i = i - 1) {
        const entry = room1_interactables[i];
        if (entry[5]() && pointer_in_circle(entry[1], entry[2], entry[7])) {
            search_object(entry[0], loop_count);
            return true;
        }
    }
    return false;
}

function draw_dialogue(key) {
    for (let i = 0; i < array_length(room1_dialogue_texts); i = i + 1) {
        const entry = room1_dialogue_texts[i];
        const is_match = entry[0] === key;
        const alpha = is_match ? 255 : 0;
        update_color(entry[1], [255, 225, 140, alpha]);
        update_color(entry[2], [240, 232, 215, alpha]);
        update_color(entry[3], [240, 232, 215, alpha]);
    }
    update_color(room1_dialogue_box, [15, 12, 15, 220]);
    update_color(room1_dialogue_continue, [200, 195, 180, 255]);
    room1_dialogue_timer = DIALOGUE_FRAMES;
    return undefined;
}

function close_dialogue() {
    for (let i = 0; i < array_length(room1_dialogue_texts); i = i + 1) {
        const entry = room1_dialogue_texts[i];
        update_color(entry[1], [255, 225, 140, 0]);
        update_color(entry[2], [240, 232, 215, 0]);
        update_color(entry[3], [240, 232, 215, 0]);
    }
    update_color(room1_dialogue_box, [15, 12, 15, 0]);
    update_color(room1_dialogue_continue, [200, 195, 180, 0]);
    room1_dialogue_timer = 0;
    return undefined;
}

function update_room1_dialogue_timer(confirmed, clicked) {
    if (room1_dialogue_timer > 0) {
        if (confirmed || clicked) {
            close_dialogue();
            return undefined;
        }
        room1_dialogue_timer = room1_dialogue_timer - 1;
        if (room1_dialogue_timer === 0) {
            close_dialogue();
        }
    }
    return undefined;
}

function search_object(name, loop_count) {
    if (name === "desk") {
        if (!room1_state[ST_DESK]) {
            start_puzzle("desk");
        }
    } else if (name === "painting") {
        if (!room1_state[ST_DESK]) {
            draw_dialogue("painting_locked");
        } else if (!room1_state[ST_PAINTING]) {
            start_puzzle("painting");
        }
    } else if (name === "switch") {
        if (!room1_state[ST_SWITCH]) {
            toggle_switch(loop_count);
        } else {
            draw_dialogue("switch_already");
        }
    } else if (name === "chest") {
        if (!room1_state[ST_SWITCH]) {
            draw_dialogue("bookshelf_locked");
        } else if (!room1_state[ST_BOOKSHELF]) {
            draw_dialogue("bookshelf_locked");
        } else if (!room1_state[ST_SAFE]) {
            start_puzzle("safe");
        }
    } else if (name === "bookshelf") {
        if (!room1_state[ST_SWITCH]) {
            draw_dialogue("bookshelf_locked");
        } else if (!room1_state[ST_BOOKSHELF]) {
            start_puzzle("bookshelf");
        }
    } else if (name === "key") {
        if (room1_state[ST_CHEST_OPEN] && !room1_state[ST_KEY]) {
            pickup_room_key();
            unlock_exit_door();
        }
    } else if (name === "door") {
        if (room1_state[ST_DOOR]) {
            draw_dialogue("door_complete");
            start_door_fade();
        } else if (player_has_room1_key) {
            unlock_exit_door();
            draw_dialogue("door_complete");
            start_door_fade();
        } else {
            draw_dialogue("door_locked");
        }
    } else if (name === "window") {
        draw_dialogue("window");
    } else if (name === "curtain") {
        draw_dialogue("curtain");
    } else if (name === "carpet") {
        draw_dialogue("carpet");
    }
    return undefined;
}

function check_door_walkthrough() {
    if (room1_state[ST_DOOR] && door_fade_state === "none" && room1_door_walked_once) {
        const dx = room1_player_x - 735;
        const dy = room1_player_y - 460;
        const dist = math_sqrt(dx * dx + dy * dy);
        if (dist < 45) {
            change_scene("room_select");
        }
    }
    return undefined;
}
let room1_door_walked_once = false;

let room1_fade_rect = null;
let door_fade_state = "none";
let door_fade_timer = 0;
const DOOR_FADE_FRAMES = math_round(0.6 * FPS);

let room1_complete_title = null;
let room1_complete_lines = [];
const ROOM1_COMPLETE_HOLD_FRAMES = math_round(2.2 * FPS);

function show_room1_complete_screen() {
    update_color(room1_complete_title, [255, 220, 130, 255]);
    for (let i = 0; i < array_length(room1_complete_lines); i = i + 1) {
        update_color(room1_complete_lines[i], [220, 235, 210, 255]);
    }
    return undefined;
}

function hide_room1_complete_screen() {
    update_color(room1_complete_title, [255, 220, 130, 0]);
    for (let i = 0; i < array_length(room1_complete_lines); i = i + 1) {
        update_color(room1_complete_lines[i], [220, 235, 210, 0]);
    }
    return undefined;
}

function start_door_fade() {
    door_fade_state = "fading_out";
    door_fade_timer = 0;
    room1_door_walked_once = true;
    return undefined;
}

function play_door_animation() {
    return start_door_fade();
}

function transition_to_hallway() {
    change_scene("room_select");
    sync_room_select_visuals(hallway_doors);

    if (pending_room2_announcement) {
        door_unlock_flash_until = get_loop_count() + math_round(1.2 * FPS);
        room2_unlock_banner_until = get_loop_count() + math_round(2.5 * FPS);
        pending_room2_announcement = false;
    }
    return undefined;
}

function update_door_fade() {
    if (door_fade_state === "fading_out") {
        door_fade_timer = door_fade_timer + 1;
        const p = math_min(1, door_fade_timer / DOOR_FADE_FRAMES);
        update_color(room1_fade_rect, [0, 0, 0, 255 * p]);
        if (p >= 1) {
            transition_to_hallway();
            show_room1_complete_screen();
            door_fade_state = "holding";
            door_fade_timer = 0;
        }
    } else if (door_fade_state === "holding") {
        door_fade_timer = door_fade_timer + 1;
        if (door_fade_timer >= ROOM1_COMPLETE_HOLD_FRAMES) {
            hide_room1_complete_screen();
            door_fade_state = "fading_in";
            door_fade_timer = 0;
        }
    } else if (door_fade_state === "fading_in") {
        door_fade_timer = door_fade_timer + 1;
        const p = math_min(1, door_fade_timer / DOOR_FADE_FRAMES);
        update_color(room1_fade_rect, [0, 0, 0, 255 * (1 - p)]);
        if (p >= 1) {
            door_fade_state = "none";
        }
    }
    return undefined;
}

function animate_room(candle, dust, window_glass, curtain, t, loop_count) {
    animate_candles([candle], t);
    animate_dust(dust, t);

    // Permanent furniture is baked into the illustrated background.
    // Only puzzle-state overlays remain animated.
    const painting_p = anim_progress(painting_move_start, loop_count);
    update_color(room1_switch_sprite, [90, 84, 74, 255 * painting_p]);
    if (painting_p > 0) {
        const glow_pulse = 0.9 + 0.3 * math_sin(t * 3);
        const glow_alpha = (60 + 40 * math_sin(t * 3)) * painting_p;
        update_scale(room1_switch_glow, [glow_pulse, glow_pulse]);
        update_color(room1_switch_glow, [255, 240, 140, glow_alpha]);
    }

    const switch_p = anim_progress(switch_toggle_start, loop_count);
    update_color(room1_switch_lever, [190, 158, 82, 255 * painting_p]);
    update_rotation(room1_switch_lever, -0.9 * switch_p);
    update_position(room1_switch_lever, [415, 160 - 4 * switch_p]);

    const bookshelf_p = anim_progress(bookshelf_move_start, loop_count);
    const chest_open_p = anim_progress(chest_open_start, loop_count);
    for (let i = 0; i < array_length(room1_chest_parts); i = i + 1) {
        const part = room1_chest_parts[i];
        const base_col = part === room1_chest_lid
            ? [128, 88, 48]
            : (part === room1_chest_parts[1] ? [198, 158, 72] : [112, 76, 40]);
        update_color(part, [base_col[0], base_col[1], base_col[2], 255 * bookshelf_p]);
    }
    update_rotation(room1_chest_lid, -0.9 * chest_open_p);
    update_position(room1_chest_lid, [ROOM1_CHEST_X,
        ROOM1_CHEST_LID_Y - 8 * chest_open_p]);

    play_key_animation(t, loop_count);

    return undefined;
}

// ================================================================
//  SCENE 4: ROOM 2 - THE BLACKWOOD LIBRARY (FULL REBUILD)
//
//  Design goals: less animation, more atmosphere. Room 2 opens with
//  a slow, cinematic "case file" briefing - a black screen with
//  white typewriter text, page by page - before the player is ever
//  allowed to move. Only afterward does the screen fade into a
//  still, abandoned library crime scene that the player can freely
//  explore. Walking near an object shows "Press E to Inspect";
//  inspecting the seven real clues fills in a Detective Notebook
//  shown in the corner of the screen. No suspect interrogation yet
//  - that is intentionally left for later, per the brief.
// ================================================================

const R2_CX = SCREEN_WIDTH / 2;

// ---------------- typewriter text engine ----------------
//
// A "page" is an array of line-defs: [x, y, words[], scale, r, g, b]
// For each line we pre-build one text object per "number of words
// revealed so far" (1..N). Only one of those is ever shown at once,
// and because create_text auto-centers on its given position, every
// stage of the same line sits in exactly the same spot.

function words_join(words, count) {
    let s = "";
    for (let i = 0; i < count; i = i + 1) {
        if (i === 0) {
            s = words[i];
        } else {
            s = s + " " + words[i];
        }
    }
    return s;
}

function build_typed_line(list, x, y, words, scale, r, g, b) {
    const steps = [];
    for (let k = 0; k < array_length(words); k = k + 1) {
        steps[k] = make_text(list, x, y, words_join(words, k + 1), scale, r, g, b, 0);
    }
    return steps;
}

function build_typed_page(list, line_defs) {
    const lines = [];
    for (let i = 0; i < array_length(line_defs); i = i + 1) {
        const d = line_defs[i];
        lines[i] = build_typed_line(list, d[0], d[1], d[2], d[3], d[4], d[5], d[6]);
    }
    return lines;
}

// ---------------- case file page content ----------------

const R2_PAGE0 = [
    [R2_CX, 210, ["CASE", "FILE", "001"], 1.6, 235, 195, 110],
    [R2_CX, 270, ["BLACKWOOD", "LIBRARY"], 1.05, 230, 226, 218],
    [R2_CX, 320, ["11:47", "PM"], 0.8, 190, 188, 182],
    [R2_CX, 400, ["CONFIDENTIAL"], 0.85, 205, 70, 65]
];

const R2_PAGE1 = [
    [R2_CX, 170, ["VICTIM"], 1.0, 235, 195, 110],
    [R2_CX, 230, ["Professor", "Arthur", "Blackwood,", "Age", "67"], 0.68, 230, 226, 218],
    [R2_CX, 268, ["Historian,", "Archaeologist,", "Researcher"], 0.6, 220, 216, 208],
    [R2_CX, 300, ["of", "Ancient", "Civilizations."], 0.6, 220, 216, 208],
    [R2_CX, 370, ["Status:", "Found", "dead", "inside", "the", "library."], 0.68, 220, 110, 100]
];

const R2_PAGE2 = [
    [R2_CX, 150, ["CASE", "SUMMARY"], 1.0, 235, 195, 110],
    [R2_CX, 205, ["Professor", "Blackwood", "was", "found", "dead"], 0.62, 225, 221, 213],
    [R2_CX, 235, ["inside", "his", "private", "library."], 0.62, 225, 221, 213],
    [R2_CX, 275, ["The", "room", "was", "locked.", "No", "forced", "entry."], 0.62, 225, 221, 213],
    [R2_CX, 315, ["Several", "research", "documents", "are", "missing."], 0.62, 225, 221, 213],
    [R2_CX, 355, ["Four", "people", "were", "inside", "the", "mansion."], 0.62, 225, 221, 213],
    [R2_CX, 405, ["One", "of", "them", "is", "lying."], 0.72, 220, 110, 100]
];

const R2_PAGE3 = [
    [R2_CX, 135, ["PRIMARY", "SUSPECTS"], 0.95, 235, 195, 110],
    [R2_CX, 185, ["1.", "Emily", "Carter", "-", "Research", "Assistant"], 0.58, 225, 221, 213],
    [R2_CX, 213, ["Claims", "she", "never", "entered", "the", "library."], 0.52, 190, 186, 180],
    [R2_CX, 253, ["2.", "James", "Holloway", "-", "Personal", "Butler"], 0.58, 225, 221, 213],
    [R2_CX, 281, ["Claims", "he", "only", "served", "tea."], 0.52, 190, 186, 180],
    [R2_CX, 321, ["3.", "Daniel", "Reed", "-", "Graduate", "Student"], 0.58, 225, 221, 213],
    [R2_CX, 349, ["Recently", "failed", "by", "the", "professor."], 0.52, 190, 186, 180],
    [R2_CX, 389, ["4.", "Dr.", "Victor", "Graves", "-", "Academic", "Rival"], 0.58, 225, 221, 213],
    [R2_CX, 417, ["Last", "seen", "arguing", "with", "the", "professor."], 0.52, 190, 186, 180]
];

const R2_PAGE4 = [
    [R2_CX, 160, ["KNOWN", "EVIDENCE"], 0.95, 235, 195, 110],
    [R2_CX, 215, ["Broken", "teacup", "-", "Torn", "manuscript"], 0.6, 225, 221, 213],
    [R2_CX, 250, ["Blood", "near", "the", "fireplace"], 0.6, 225, 221, 213],
    [R2_CX, 285, ["Missing", "book", "-", "Stopped", "clock"], 0.6, 225, 221, 213],
    [R2_CX, 320, ["Strange", "handwritten", "symbol"], 0.6, 225, 221, 213],
    [R2_CX, 355, ["Burnt", "document"], 0.6, 225, 221, 213],
    [R2_CX, 410, ["Not", "every", "clue", "is", "important."], 0.56, 190, 186, 180]
];

const R2_PAGE5 = [
    [R2_CX, 180, ["OBJECTIVE"], 1.0, 235, 195, 110],
    [R2_CX, 240, ["Search", "the", "library.", "Inspect", "everything."], 0.64, 225, 221, 213],
    [R2_CX, 275, ["Collect", "evidence.", "Compare", "statements."], 0.64, 225, 221, 213],
    [R2_CX, 310, ["Eliminate", "contradictions."], 0.64, 225, 221, 213],
    [R2_CX, 360, ["Find", "the", "murderer."], 0.85, 220, 110, 100]
];

const R2_PAGE6 = [
    [R2_CX, 285, ["GOOD", "LUCK,"], 1.4, 235, 195, 110],
    [R2_CX, 345, ["DETECTIVE."], 1.4, 235, 195, 110]
];

const R2_INTRO_PAGE_DEFS = [R2_PAGE0, R2_PAGE1, R2_PAGE2, R2_PAGE3, R2_PAGE4, R2_PAGE5, R2_PAGE6];

let room2_intro_runtime = [];
let room2_intro_backdrop = null;
let room2_intro_cursor = null;
let room2_intro_ambient_dust = [];

let room2_intro_page = 0;
let room2_intro_line = 0;
let room2_intro_word = 0;
let room2_intro_next_step_frame = -1;
let room2_intro_phase = "typing"; // typing | line_pause | page_hold | page_fade | final_fade | done
let room2_intro_phase_start = 0;
let room2_intro_visible_objs = [];

let room2_intro_played = false;
let room2_investigation_enabled = false;

const R2_WORD_FRAMES = math_round(0.16 * FPS);
const R2_LINE_PAUSE_FRAMES = math_round(0.35 * FPS);
const R2_PAGE_HOLD_FRAMES = math_round(1.3 * FPS);
const R2_PAGE_FADE_FRAMES = math_round(0.5 * FPS);
const R2_FINAL_FADE_FRAMES = math_round(1.1 * FPS);

function start_room2_intro(loop_count) {
    room2_intro_page = 0;
    room2_intro_line = 0;
    room2_intro_word = 0;
    room2_intro_visible_objs = [];
    room2_intro_phase = "typing";
    room2_intro_phase_start = loop_count;
    room2_intro_next_step_frame = loop_count;
    set_alpha(room2_intro_backdrop, 255);
    room2_investigation_enabled = false;
    return undefined;
}

function advance_room2_intro_step(loop_count) {
    const lines = room2_intro_runtime[room2_intro_page];
    const steps = lines[room2_intro_line];
    const total_words = array_length(steps);

    if (room2_intro_word > 0) {
        set_alpha(steps[room2_intro_word - 1], 0);
    }
    set_alpha(steps[room2_intro_word], 255);
    room2_intro_word = room2_intro_word + 1;

    if (room2_intro_word >= total_words) {
        room2_intro_visible_objs[array_length(room2_intro_visible_objs)] = steps[total_words - 1];
        room2_intro_line = room2_intro_line + 1;
        room2_intro_word = 0;

        if (room2_intro_line >= array_length(lines)) {
            room2_intro_phase = "page_hold";
            room2_intro_phase_start = loop_count;
        } else {
            room2_intro_phase = "line_pause";
            room2_intro_phase_start = loop_count;
        }
    } else {
        room2_intro_next_step_frame = loop_count + R2_WORD_FRAMES;
    }
    return undefined;
}

function update_room2_intro(loop_count, t) {
    if (room2_intro_phase === "done") {
        return undefined;
    }

    const showing_text = room2_intro_phase === "typing" || room2_intro_phase === "line_pause" || room2_intro_phase === "page_hold";
    const cursor_on = showing_text && ((loop_count % 30) < 15);
    set_alpha(room2_intro_cursor, cursor_on ? 220 : 0);

    animate_dust(room2_intro_ambient_dust, t);

    if (room2_intro_phase === "typing") {
        if (loop_count >= room2_intro_next_step_frame) {
            advance_room2_intro_step(loop_count);
        }
    } else if (room2_intro_phase === "line_pause") {
        if (loop_count - room2_intro_phase_start >= R2_LINE_PAUSE_FRAMES) {
            room2_intro_phase = "typing";
            room2_intro_next_step_frame = loop_count;
        }
    } else if (room2_intro_phase === "page_hold") {
        if (loop_count - room2_intro_phase_start >= R2_PAGE_HOLD_FRAMES) {
            room2_intro_phase = "page_fade";
            room2_intro_phase_start = loop_count;
        }
    } else if (room2_intro_phase === "page_fade") {
        const elapsed = loop_count - room2_intro_phase_start;
        const p = math_min(1, elapsed / R2_PAGE_FADE_FRAMES);
        for (let i = 0; i < array_length(room2_intro_visible_objs); i = i + 1) {
            set_alpha(room2_intro_visible_objs[i], 255 * (1 - p));
        }
        if (p >= 1) {
            if (room2_intro_page >= array_length(room2_intro_runtime) - 1) {
                room2_intro_phase = "final_fade";
                room2_intro_phase_start = loop_count;
            } else {
                room2_intro_page = room2_intro_page + 1;
                room2_intro_line = 0;
                room2_intro_word = 0;
                room2_intro_visible_objs = [];
                room2_intro_phase = "typing";
                room2_intro_phase_start = loop_count;
                room2_intro_next_step_frame = loop_count;
            }
        }
    } else if (room2_intro_phase === "final_fade") {
        const elapsed = loop_count - room2_intro_phase_start;
        const p = math_min(1, elapsed / R2_FINAL_FADE_FRAMES);
        set_alpha(room2_intro_backdrop, 255 * (1 - p));
        for (let i = 0; i < array_length(room2_intro_ambient_dust); i = i + 1) {
            set_alpha(room2_intro_ambient_dust[i][0], 90 * (1 - p));
        }
        if (p >= 1) {
            room2_intro_phase = "done";
            room2_investigation_enabled = true;
        }
    }
    return undefined;
}

// ---------------- detective notebook ----------------

const R2_CLUE_TEACUP = 0;
const R2_CLUE_CLOCK = 1;
const R2_CLUE_BOOKSHELF = 2;
const R2_CLUE_BURNT = 3;
const R2_CLUE_DESK = 4;
const R2_CLUE_FOOTPRINTS = 5;
const R2_CLUE_PAINTING = 6;
const R2_CLUE_DRAWER = 7;
const R2_CLUE_GLASSES = 8;
const R2_CLUE_MANUSCRIPT = 9;

const R2_CLUE_LABELS = [
    "Broken Teacup",
    "Grandfather Clock",
    "Missing Book",
    "Burnt Letter",
    "Desk Note",
    "Wet Footprints",
    "Hidden Key",
    "Professor's Diary",
    "Broken Glasses",
    "Ancient Manuscript"
];

let room2_clue_found = [false, false, false, false, false, false, false, false, false, false];
let room2_clue_found_at = [-1, -1, -1, -1, -1, -1, -1, -1, -1, -1];
let room2_notebook_rows = [];
const R2_CLUE_POP_FRAMES = math_round(0.5 * FPS);

// -- investigation mechanics: the painting hides a key, the key
// opens a locked drawer holding the diary, and once all clues are
// collected an "INVESTIGATION COMPLETE" banner appears. --
let room2_key_found = false;
let room2_drawer_open = false;
let room2_investigation_complete_shown = false;
let room2_complete_title = null;
let room2_complete_subtitle = null;
let room2_drawer_lock_icon = null;
let room2_drawer_diary_icon = null;
let room2_key_icon = null;

function all_room2_clues_found() {
    let all_found = true;
    for (let i = 0; i < array_length(room2_clue_found); i = i + 1) {
        if (!room2_clue_found[i]) {
            all_found = false;
        }
    }
    return all_found;
}

function check_room2_investigation_complete() {
    if (!room2_investigation_complete_shown && all_room2_clues_found()) {
        room2_investigation_complete_shown = true;
        set_alpha(room2_complete_title, 255);
        set_alpha(room2_complete_subtitle, 255);
    }
    return undefined;
}

function draw_room2_complete_banner(list) {
    room2_complete_title = make_text(list, R2_CX, 300, "INVESTIGATION COMPLETE", 1.1, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
    room2_complete_subtitle = make_text(list, R2_CX, 335, "Review your notebook. Choose the murderer.", 0.6, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
    return undefined;
}

function animate_room2_complete_banner(t) {
    if (room2_investigation_complete_shown) {
        const pulse = 1 + 0.06 * math_sin(t * 3);
        update_scale(room2_complete_title, [pulse, pulse]);
    }
    return undefined;
}

function draw_room2_notebook(list) {
    const panel_x = SCREEN_WIDTH - 135;
    const panel_top = 55;

    make_rect(list, panel_x + 5, 200, 240, 310, 0, 0, 0, 220);
    make_rect(list, panel_x, 195, 230, 300, 24, 10, 17, 235);
    make_rect(list, panel_x, panel_top, 220, 9, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    make_text(list, panel_x, panel_top - 16, "DETECTIVE NOTEBOOK", 0.5, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);

    for (let i = 0; i < array_length(R2_CLUE_LABELS); i = i + 1) {
        const row_y = panel_top + 22 + i * 26;
        const row = make_text(list, panel_x, row_y, "\u2713 " + R2_CLUE_LABELS[i], 0.44, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
        room2_notebook_rows[i] = row;
    }
    return undefined;
}

function mark_clue_found(idx, loop_count) {
    if (!room2_clue_found[idx]) {
        room2_clue_found[idx] = true;
        room2_clue_found_at[idx] = loop_count;
        set_alpha(room2_notebook_rows[idx], 255);
        check_room2_investigation_complete();
    }
    return undefined;
}

function sync_room2_notebook() {
    for (let i = 0; i < array_length(room2_notebook_rows); i = i + 1) {
        set_alpha(room2_notebook_rows[i], room2_clue_found[i] ? 255 : 0);
    }
    return undefined;
}

function animate_room2_notebook(loop_count) {
    for (let i = 0; i < array_length(room2_notebook_rows); i = i + 1) {
        if (room2_clue_found_at[i] >= 0) {
            const elapsed = loop_count - room2_clue_found_at[i];
            if (elapsed >= 0 && elapsed < R2_CLUE_POP_FRAMES) {
                const p = elapsed / R2_CLUE_POP_FRAMES;
                const pop = 1 + 0.35 * math_sin(p * math_PI);
                update_scale(room2_notebook_rows[i], [pop, pop]);
            } else {
                update_scale(room2_notebook_rows[i], [1, 1]);
            }
        }
    }
    return undefined;
}

// ---------------- library scene visuals ----------------

function draw_room2_layout(list) {
    make_rect(list, R2_CX, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, R2_CX, 205, 770, 310, 151, 137, 126, 255);
    for (let row = 0; row < 3; row = row + 1) {
        make_rect(list, R2_CX, 95 + row * 95, 770, 3, 104, 91, 86, 130);
    }
    make_rect(list, R2_CX, 480, 770, 210, 93, 61, 51, 255);
    for (let plank = 0; plank < 9; plank = plank + 1) {
        make_rect(list, 20 + plank * 90, 480, 3, 210, 145, 99, 72, 185);
    }
    make_rect(list, R2_CX, 365, 770, 12, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    make_triangle(list, 220, 210, 290, 320, 245, 227, 198, 22);
    make_triangle(list, 650, 210, 290, 320, 245, 227, 198, 18);
    draw_stage_frame(list);
    make_rect(list, 142, 45, 250, 42, 112, 7, 13, 255);
    make_rect(list, 142, 64, 250, 4, CUTOUT_YELLOW[0], 90, 8, 255);
    make_text(list, 142, 45, "ROOM 2  /  LIBRARY", 0.58, 255, 255, 255, 255);
    return undefined;
}

let room2_rain_drops = [];

function draw_room2_windows(list) {
    const wx = 460;
    const wy = 180;
    make_rect(list, wx + 5, wy + 6, 160, 180, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, wx, wy, 150, 170, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    make_rect(list, wx, wy, 126, 146, 92, 143, 184, 255);
    make_rect(list, wx, wy, 8, 146, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, wx, wy, 126, 8, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);

    for (let i = 0; i < 10; i = i + 1) {
        const rx = wx - 55 + math_random() * 110;
        const top = wy - 65;
        const bottom = wy + 65;
        const drop = make_rect(list, rx, top, 2, 14, 170, 190, 210, 140);
        room2_rain_drops[i] = [drop, rx, top, bottom];
    }
    return undefined;
}

function animate_room2_rain(t) {
    for (let i = 0; i < array_length(room2_rain_drops); i = i + 1) {
        const d = room2_rain_drops[i];
        const drop = d[0];
        const rx = d[1];
        const top = d[2];
        const bottom = d[3];
        const span = bottom - top;
        const y = top + ((t * 260 + i * 37) % span);
        update_position(drop, [rx, y]);
    }
    return undefined;
}

let room2_fire_flames = [];

function draw_room2_fireplace(list) {
    const fx = 100;
    const fy = 430;
    make_rect(list, fx + 5, fy + 6, 170, 200, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, fx, fy, 160, 190, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    make_rect(list, fx, fy - 80, 190, 18, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    make_rect(list, fx, fy + 20, 120, 130, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const flame1 = make_triangle(list, fx - 20, fy + 60, 25, 44, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    const flame2 = make_triangle(list, fx + 15, fy + 65, 20, 38, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    const flame3 = make_triangle(list, fx, fy + 55, 30, 52, 242, 112, 44, 255);
    const glow = make_circle(list, fx, fy + 40, 70, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 70);
    room2_fire_flames = [flame1, flame2, flame3, glow];

    // the burnt document clue, half-consumed in the ashes
    make_rect(list, fx + 20, fy + 90, 30, 20, 40, 32, 24, 255);
    make_triangle(list, fx + 15, fy + 88, 18, 14, 25, 18, 12, 255);

    return undefined;
}

function animate_room2_fire(t) {
    for (let i = 0; i < 3; i = i + 1) {
        const flick = 0.85 + 0.15 * math_sin(t * 11 + i * 2) + 0.05 * math_sin(t * 27 + i);
        update_scale(room2_fire_flames[i], [flick, flick]);
    }
    const glow_pulse = 0.85 + 0.15 * math_sin(t * 6);
    update_scale(room2_fire_flames[3], [glow_pulse, glow_pulse]);
    return undefined;
}

function draw_room2_glasses(list) {
    const gx = 180;
    const gy = 545;
    make_circle(list, gx - 10, gy, 9, 40, 40, 45, 160);
    make_circle(list, gx + 12, gy + 3, 9, 40, 40, 45, 160);
    make_rect(list, gx + 1, gy + 1, 12, 2, 40, 40, 45, 160);
    const crack = make_rect(list, gx - 10, gy, 2, 11, 210, 210, 215, 190);
    update_rotation(crack, 0.6);
    return undefined;
}

function draw_room2_desk(list) {
    const dx = 650;
    const dy = 545;

    make_rect(list, dx + 4, dy + 5, 100, 65, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, dx, dy, 90, 55, CUTOUT_PURPLE[0], CUTOUT_PURPLE[1], CUTOUT_PURPLE[2], 255);
    make_rect(list, dx, dy - 22, 90, 9, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);

    // the handwritten note on the desk
    make_rect(list, dx - 12, dy - 6, 34, 24, 228, 218, 195, 255);
    make_rect(list, dx - 20, dy - 2, 18, 2, 90, 80, 60, 220);
    make_rect(list, dx - 20, dy + 3, 18, 2, 90, 80, 60, 220);
    make_rect(list, dx - 20, dy + 8, 12, 2, 90, 80, 60, 220);

    // the locked drawer sits just below the desk
    const drawer_x = dx + 20;
    const drawer_y = dy + 40;
    make_rect(list, drawer_x, drawer_y, 60, 22, 55, 36, 20, 255);
    make_circle(list, drawer_x, drawer_y, 3, 20, 15, 10, 255);

    room2_drawer_lock_icon = make_circle(list, drawer_x, drawer_y - 17, 7, 210, 175, 60, 255);
    room2_drawer_diary_icon = make_rect(list, drawer_x, drawer_y - 17, 16, 12, 130, 40, 40, 0);

    return undefined;
}

let room2_teacup_parts = [];

function draw_room2_table(list) {
    const tx = 420;
    const ty = 470;
    make_rect(list, tx, ty + 45, 18, 75, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, tx - 140, ty + 45, 18, 75, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_cutout_rect(list, tx - 70, ty, 250, 30, CUTOUT_BROWN[0], CUTOUT_BROWN[1], CUTOUT_BROWN[2], 255, 0.008);

    // torn manuscript pages
    make_rect(list, tx - 100, ty - 20, 40, 30, 225, 215, 190, 255);
    const tear = make_triangle(list, tx - 85, ty - 30, 16, 12, 225, 215, 190, 255);
    update_rotation(tear, 0.6);
    make_rect(list, tx - 55, ty - 18, 34, 26, 220, 208, 182, 255);

    // teacup, cracked, faintly still steaming
    const cup_body = make_circle(list, tx + 40, ty - 18, 12, 235, 232, 225, 255);
    const crack = make_rect(list, tx + 40, ty - 18, 2, 16, 40, 40, 45, 255);
    update_rotation(crack, 0.5);
    const steam = make_rect(list, tx + 40, ty - 52, 4, 18, 220, 225, 230, 60);
    room2_teacup_parts = [cup_body, crack, steam];

    return undefined;
}

function animate_room2_teacup(t) {
    const steam = room2_teacup_parts[2];
    const sway = 3 * math_sin(t * 1.5);
    const alpha = 40 + 25 * math_sin(t * 1.2);
    update_position(steam, [420 + 40 + sway, 470 - 18 - 34]);
    update_color(steam, [220, 225, 230, alpha]);
    return undefined;
}

let room2_clock_hands = [];

function draw_room2_clock(list) {
    const cx = 600;
    const cy = 380;
    make_rect(list, cx + 4, cy + 5, 60, 270, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, cx, cy, 50, 260, CUTOUT_GREEN[0], CUTOUT_GREEN[1], CUTOUT_GREEN[2], 255);
    make_rect(list, cx, cy - 130, 60, 14, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    make_cutout_circle(list, cx, cy - 80, 28, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);

    const hour_hand = make_rect(list, cx - 4, cy - 88, 4, 16, 30, 25, 20, 255);
    update_rotation(hour_hand, -2.6);
    const minute_hand = make_rect(list, cx, cy - 92, 3, 22, 30, 25, 20, 255);
    update_rotation(minute_hand, 0.9);
    room2_clock_hands = [hour_hand, minute_hand];

    make_circle(list, cx, cy - 80, 3, 20, 15, 10, 255);
    make_rect(list, cx, cy + 60, 46, 40, 45, 32, 22, 255);
    return undefined;
}

let room2_bookshelf_symbol = null;
let room2_symbol_reveal_start = -1;
const R2_SYMBOL_POP_FRAMES = math_round(0.8 * FPS);

function draw_room2_bookshelves(list) {
    // left "recently moved" bookshelf, hiding a symbol just beside it
    room2_bookshelf_symbol = make_text(list, 195, 230, "\u2020", 1.1, 150, 40, 40, 60);

    make_rect(list, 265, 255, 132, 372, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, 260, 250, 120, 360, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    for (let shelf = 0; shelf < 6; shelf = shelf + 1) {
        make_rect(list, 260, 90 + shelf * 60, 108, 7, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    }
    for (let book = 0; book < 10; book = book + 1) {
        const bx = 213 + book * 10.5;
        const shelf_row = book % 6;
        const by = 75 + shelf_row * 60;
        const br = 100 + math_random() * 140;
        const bg = 45 + math_random() * 140;
        const bb = 35 + math_random() * 120;
        make_rect(list, bx, by, 8, 32, br, bg, bb, 255);
    }

    // right, undisturbed tall bookshelf
    make_rect(list, 735, 255, 142, 392, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, 730, 250, 130, 380, CUTOUT_BLUE[0], CUTOUT_BLUE[1], CUTOUT_BLUE[2], 255);
    for (let shelf = 0; shelf < 6; shelf = shelf + 1) {
        make_rect(list, 730, 90 + shelf * 62, 118, 7, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    }
    for (let book = 0; book < 11; book = book + 1) {
        const bx = 680 + book * 10.5;
        const shelf_row = book % 6;
        const by = 75 + shelf_row * 62;
        const br = 100 + math_random() * 140;
        const bg = 45 + math_random() * 140;
        const bb = 35 + math_random() * 120;
        make_rect(list, bx, by, 8, 34, br, bg, bb, 255);
    }
    return undefined;
}

function animate_room2_symbol(loop_count) {
    if (room2_symbol_reveal_start < 0) {
        update_color(room2_bookshelf_symbol, [150, 40, 40, 60]);
        return undefined;
    }
    const elapsed = loop_count - room2_symbol_reveal_start;
    if (elapsed < R2_SYMBOL_POP_FRAMES) {
        const p = elapsed / R2_SYMBOL_POP_FRAMES;
        const flash = 60 + 195 * math_sin(p * math_PI);
        update_color(room2_bookshelf_symbol, [150, 40, 40, flash]);
    } else {
        update_color(room2_bookshelf_symbol, [150, 40, 40, 150]);
    }
    return undefined;
}

function draw_room2_paintings(list) {
    make_rect(list, 104, 145, 100, 80, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, 100, 140, 90, 70, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    make_rect(list, 100, 140, 74, 54, CUTOUT_PURPLE[0], CUTOUT_PURPLE[1], CUTOUT_PURPLE[2], 255);
    make_rect(list, 394, 145, 80, 70, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, 390, 140, 70, 60, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 255);
    make_rect(list, 390, 140, 56, 46, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);

    // the hidden key, tucked behind the first painting's frame -
    // invisible until the compartment is discovered
    room2_key_icon = make_circle(list, 100, 190, 8, 230, 195, 90, 0);
    return undefined;
}

function draw_room2_globe(list) {
    const gx = 560;
    const gy = 545;
    make_rect(list, gx, gy + 28, 14, 30, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_cutout_circle(list, gx, gy, 28, CUTOUT_TEAL[0], CUTOUT_TEAL[1], CUTOUT_TEAL[2], 255);
    make_circle(list, gx - 6, gy - 6, 8, CUTOUT_GREEN[0], CUTOUT_GREEN[1], CUTOUT_GREEN[2], 220);
    return undefined;
}

function draw_room2_ladder(list) {
    const lx = 700;
    const ly = 340;
    const rail1 = make_rect(list, lx - 10, ly, 8, 220, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    const rail2 = make_rect(list, lx + 10, ly, 8, 220, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    update_rotation(rail1, 0.12);
    update_rotation(rail2, 0.12);
    for (let rung = 0; rung < 6; rung = rung + 1) {
        const rung_obj = make_rect(list, lx, ly - 90 + rung * 36, 28, 6, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
        update_rotation(rung_obj, 0.12);
    }
    return undefined;
}

function draw_room2_broken_chair(list) {
    const chx = 330;
    const chy = 500;
    const seat = make_rect(list, chx, chy, 55, 14, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    update_rotation(seat, 0.5);
    const back = make_rect(list, chx - 10, chy - 25, 14, 45, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    update_rotation(back, 1.1);
    make_rect(list, chx + 20, chy + 20, 9, 30, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, chx - 25, chy + 15, 9, 25, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    return undefined;
}

function draw_room2_footprints(list) {
    make_circle(list, 505, 550, 8, 40, 32, 22, 130);
    make_circle(list, 522, 562, 8, 40, 32, 22, 110);
    make_circle(list, 535, 545, 7, 40, 32, 22, 100);
    return undefined;
}

function draw_room2_floor_debris(list) {
    for (let i = 0; i < 6; i = i + 1) {
        const bx = 380 + math_random() * 160;
        const by = 555 + math_random() * 25;
        const rot = math_random() * 1.2 - 0.6;
        const br = 55 + math_random() * 70;
        const bg = 25 + math_random() * 35;
        const bb = 18 + math_random() * 25;
        const book = make_rect(list, bx, by, 26, 8, br, bg, bb, 255);
        update_rotation(book, rot);
    }
    for (let i = 0; i < 5; i = i + 1) {
        const px = 250 + math_random() * 100;
        const py = 560 + math_random() * 22;
        const rot = math_random() * 1.5 - 0.75;
        const paper = make_rect(list, px, py, 16, 12, 225, 215, 195, 220);
        update_rotation(paper, rot);
    }
    return undefined;
}

function draw_room2_evidence_markers(list) {
    const spots = [[180, 545], [420, 500], [120, 520], [260, 410]];
    for (let i = 0; i < array_length(spots); i = i + 1) {
        const s = spots[i];
        make_triangle(list, s[0], s[1] - 30, 20, 18, 245, 210, 40, 220);
        make_text(list, s[0], s[1] - 29, stringify(i + 1), 0.42, 30, 25, 10, 255);
    }
    return undefined;
}

function draw_room2_candles(list) {
    const c1 = draw_one_candle(list, 480, 430, 0.4);
    const c2 = draw_one_candle(list, 780, 520, 2.1);
    return [c1, c2];
}

// ---------------- player (still, noir silhouette - no per-frame
// character animation, deliberately) ----------------

let room2_player_parts = [];
let room2_player_x = 400;
let room2_player_y = 555;

function draw_room2_player(list) {
    const shadow = make_circle(list, room2_player_x, room2_player_y + 22, 13, 0, 0, 0, 120);
    update_scale(shadow, [1.6, 0.25]);
    const body_outline = make_triangle(list, room2_player_x + 1, room2_player_y, 42, 48,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const left_leg = make_rect(list, room2_player_x - 6, room2_player_y + 17, 7, 25,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(left_leg, -0.12);
    const right_leg = make_rect(list, room2_player_x + 6, room2_player_y + 17, 7, 25,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(right_leg, 0.12);
    const coat = make_triangle(list, room2_player_x, room2_player_y + 10, 35, 38,
        CUTOUT_BLUE[0], CUTOUT_BLUE[1], CUTOUT_BLUE[2], 255);
    const body = make_triangle(list, room2_player_x, room2_player_y - 1, 34, 40,
        CUTOUT_BLUE[0], CUTOUT_BLUE[1], CUTOUT_BLUE[2], 255);
    const head_outline = make_triangle(list, room2_player_x + 2, room2_player_y - 24, 27, 27,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const head = make_triangle(list, room2_player_x + 2, room2_player_y - 25, 21, 22,
        178, 218, 224, 255);
    const eye = make_rect(list, room2_player_x, room2_player_y - 27, 5, 2,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    const hat_outline = make_rect(list, room2_player_x, room2_player_y - 36, 42, 10,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    update_rotation(hat_outline, -0.09);
    const hat = make_rect(list, room2_player_x - 1, room2_player_y - 37, 36, 6,
        CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    update_rotation(hat, -0.09);
    const hat_crown = make_triangle(list, room2_player_x - 3, room2_player_y - 44, 24, 22,
        CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    room2_player_parts = [
        [coat, 0, 10],
        [body, 0, 0],
        [head, 2, -25],
        [hat, -1, -37],
        [shadow, 0, 22],
        [body_outline, 1, 0],
        [left_leg, -6, 17],
        [right_leg, 6, 17],
        [head_outline, 2, -24],
        [eye, 0, -27],
        [hat_outline, 0, -36],
        [hat_crown, -3, -44]
    ];
    return undefined;
}

function position_room2_player() {
    for (let i = 0; i < array_length(room2_player_parts); i = i + 1) {
        const part = room2_player_parts[i];
        update_position(part[0], [room2_player_x + part[1], room2_player_y + part[2]]);
    }
    return undefined;
}

// ---------------- movement + collision ----------------

let room2_blocking_rects = [
    [65, 430, 110, 260],
    [390, 420, 310, 115],
    [215, 190, 190, 230],
    [655, 190, 195, 230],
    [625, 485, 175, 125],
    [750, 480, 75, 120]
];

const ROOM2_MIN_X = 65;
const ROOM2_MAX_X = 760;
const ROOM2_MIN_Y = 340;
const ROOM2_MAX_Y = 585;

// Furniture collision boxes only need a small buffer, not the full
// player radius on every side - using PLAYER_RADIUS here (as Room 1
// does) made the corridors around the bookshelves/table/fireplace so
// thin that the player could get visually stuck trying to reach the
// painting, clock, or drawer. A smaller dedicated pad keeps furniture
// solid without pinching off the walkway.
const ROOM2_COLLISION_PAD = 4;

function room2_collides(x, y) {
    let blocked = false;
    for (let i = 0; i < array_length(room2_blocking_rects); i = i + 1) {
        const r = room2_blocking_rects[i];
        const half_w = r[2] / 2 + ROOM2_COLLISION_PAD;
        const half_h = r[3] / 2 + ROOM2_COLLISION_PAD;
        if (x > r[0] - half_w && x < r[0] + half_w && y > r[1] - half_h && y < r[1] + half_h) {
            blocked = true;
        }
    }
    return blocked;
}

function update_room2_movement() {
    let dx = 0;
    let dy = 0;
    if (input_key_down("a") || input_key_down("ArrowLeft")) { dx = dx - PLAYER_SPEED; }
    if (input_key_down("d") || input_key_down("ArrowRight")) { dx = dx + PLAYER_SPEED; }
    if (input_key_down("w") || input_key_down("ArrowUp")) { dy = dy - PLAYER_SPEED; }
    if (input_key_down("s") || input_key_down("ArrowDown")) { dy = dy + PLAYER_SPEED; }

    room2_detective_direction =
        direction_from_delta(dx, dy, room2_detective_direction);
    room2_detective_moving = dx !== 0 || dy !== 0;

    const new_x = room2_player_x + dx;
    if (!room2_collides(new_x, room2_player_y) && new_x - PLAYER_RADIUS > ROOM2_MIN_X && new_x + PLAYER_RADIUS < ROOM2_MAX_X) {
        room2_player_x = new_x;
    }
    const new_y = room2_player_y + dy;
    if (!room2_collides(room2_player_x, new_y) && new_y - PLAYER_RADIUS > ROOM2_MIN_Y && new_y + PLAYER_RADIUS < ROOM2_MAX_Y) {
        room2_player_y = new_y;
    }
    position_room2_player();
    return undefined;
}

// ---------------- interactables / prompt / dialogue ----------------

let room2_interactables = [];
let room2_nearest_name = "";

function make_room2_interactable(list, name, x, y, range, ring_radius) {
    const ring = make_circle(list, x, y, ring_radius, 255, 235, 150, 0);
    room2_interactables[array_length(room2_interactables)] = [name, x, y, range, ring, ring_radius];
    return ring;
}

let room2_prompt_bg = null;
let room2_prompt_text = null;
let room2_back_button = null;

function draw_room2_prompt(list) {
    room2_prompt_bg = make_rect(list, 0, 0, 220, 30, 15, 12, 15, 0);
    room2_prompt_text = make_text(list, 0, 0, "CLICK TO INSPECT", 0.55, 255, 230, 120, 0);
    return undefined;
}

function update_room2_highlights(t) {
    let nearest_name = "";
    let nearest_x = 0;
    let nearest_y = 0;
    let nearest_dist = 999999;

    for (let i = 0; i < array_length(room2_interactables); i = i + 1) {
        const entry = room2_interactables[i];
        const name = entry[0];
        const x = entry[1];
        const y = entry[2];
        const range = entry[3];
        const ring = entry[4];
        const dx = room2_player_x - x;
        const dy = room2_player_y - y;
        const dist = math_sqrt(dx * dx + dy * dy);
        const hovered = pointer_in_circle(x, y, entry[5]);

        if (dist < range || hovered) {
            const pulse = 90 + 70 * math_sin(t * 5);
            update_color(ring, [CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], hovered ? 220 : pulse]);
            if (hovered || dist < nearest_dist) {
                nearest_dist = dist;
                nearest_name = name;
                nearest_x = x;
                nearest_y = y;
            }
        } else {
            update_color(ring, [255, 235, 150, 0]);
        }
    }

    room2_nearest_name = nearest_name;

    if (nearest_name !== "") {
        update_position(room2_prompt_text, [nearest_x, nearest_y - 55]);
        update_position(room2_prompt_bg, [nearest_x, nearest_y - 55]);
        update_color(room2_prompt_text, [255, 230, 120, 255]);
        update_color(room2_prompt_bg, [15, 12, 15, 170]);
    } else {
        update_color(room2_prompt_text, [255, 230, 120, 0]);
        update_color(room2_prompt_bg, [15, 12, 15, 0]);
    }
    return undefined;
}

function handle_room2_mouse_actions(clicked, loop_count) {
    if (mouse_button_clicked(room2_back_button, clicked)) {
        change_scene("room_select");
        sync_room_select_visuals(hallway_doors);
        return true;
    }
    if (!clicked) {
        return false;
    }
    for (let i = array_length(room2_interactables) - 1; i >= 0; i = i - 1) {
        const entry = room2_interactables[i];
        if (pointer_in_circle(entry[1], entry[2], entry[5])) {
            search_room2_object(entry[0], loop_count);
            return true;
        }
    }
    return false;
}

let room2_dialogue_box = null;
let room2_dialogue_lines = [];
let room2_dialogue_timer = 0;
const R2_DIALOGUE_FRAMES = 190;

function draw_room2_dialogue(list) {
    room2_dialogue_box = make_rect(list, R2_CX, 555, 580, 70, 15, 12, 15, 0);

    const entries = [
        ["teacup", "The tea is still warm. Someone was here minutes ago."],
        ["clock", "Stopped at 9:17 PM - likely the hour of death."],
        ["bookshelf", "A gap on the shelf. A rare book is missing."],
        ["fireplace", "A document, half-burned. Someone tried to destroy evidence."],
        ["desk", "A note in his hand: \"Trust no one.\" Who was he afraid of?"],
        ["footprints", "Wet footprints trail in - toward the window."],
        ["painting_key", "A hidden compartment behind the painting - and an old iron key."],
        ["drawer_locked", "The drawer is locked. It needs a key."],
        ["diary", "\"I finally discovered who betrayed me.\" The last page is torn out."],
        ["glasses", "Broken glasses on the floor. He struggled before he fell."],
        ["manuscript", "This symbol matches the burnt fragment. The document was valuable."],
        ["globe", "An antique globe. It still spins - someone touched it recently."],
        ["ladder", "A tall library ladder, slightly out of place."],
        ["chair", "A chair, knocked over and broken in the struggle."],
        ["window", "Rain streaks down the glass. The latch is undone."]
    ];

    for (let i = 0; i < array_length(entries); i = i + 1) {
        const key = entries[i][0];
        const text = entries[i][1];
        const obj = make_text(list, R2_CX, 555, text, 0.6, 235, 230, 220, 0);
        room2_dialogue_lines[i] = [key, obj];
    }
    return undefined;
}

function show_room2_dialogue(key) {
    for (let i = 0; i < array_length(room2_dialogue_lines); i = i + 1) {
        const entry = room2_dialogue_lines[i];
        set_alpha(entry[1], entry[0] === key ? 255 : 0);
    }
    set_alpha(room2_dialogue_box, 210);
    room2_dialogue_timer = R2_DIALOGUE_FRAMES;
    return undefined;
}

function close_room2_dialogue() {
    for (let i = 0; i < array_length(room2_dialogue_lines); i = i + 1) {
        set_alpha(room2_dialogue_lines[i][1], 0);
    }
    set_alpha(room2_dialogue_box, 0);
    room2_dialogue_timer = 0;
    return undefined;
}

function update_room2_dialogue_timer(confirmed, clicked) {
    if (room2_dialogue_timer > 0) {
        if (confirmed || clicked) {
            close_room2_dialogue();
            return undefined;
        }
        room2_dialogue_timer = room2_dialogue_timer - 1;
        if (room2_dialogue_timer === 0) {
            close_room2_dialogue();
        }
    }
    return undefined;
}

function search_room2_object(name, loop_count) {
    if (name === "teacup") {
        mark_clue_found(R2_CLUE_TEACUP, loop_count);
        show_room2_dialogue("teacup");
    } else if (name === "clock") {
        mark_clue_found(R2_CLUE_CLOCK, loop_count);
        show_room2_dialogue("clock");
    } else if (name === "bookshelf") {
        mark_clue_found(R2_CLUE_BOOKSHELF, loop_count);
        room2_symbol_reveal_start = loop_count;
        show_room2_dialogue("bookshelf");
    } else if (name === "fireplace") {
        mark_clue_found(R2_CLUE_BURNT, loop_count);
        show_room2_dialogue("fireplace");
    } else if (name === "desk") {
        mark_clue_found(R2_CLUE_DESK, loop_count);
        show_room2_dialogue("desk");
    } else if (name === "footprints") {
        mark_clue_found(R2_CLUE_FOOTPRINTS, loop_count);
        show_room2_dialogue("footprints");
    } else if (name === "painting") {
        mark_clue_found(R2_CLUE_PAINTING, loop_count);
        room2_key_found = true;
        set_alpha(room2_key_icon, 255);
        show_room2_dialogue("painting_key");
    } else if (name === "drawer") {
        if (!room2_key_found) {
            show_room2_dialogue("drawer_locked");
        } else if (!room2_drawer_open) {
            room2_drawer_open = true;
            mark_clue_found(R2_CLUE_DRAWER, loop_count);
            set_alpha(room2_drawer_lock_icon, 0);
            set_alpha(room2_drawer_diary_icon, 255);
            show_room2_dialogue("diary");
        } else {
            show_room2_dialogue("diary");
        }
    } else if (name === "glasses") {
        mark_clue_found(R2_CLUE_GLASSES, loop_count);
        show_room2_dialogue("glasses");
    } else if (name === "manuscript") {
        mark_clue_found(R2_CLUE_MANUSCRIPT, loop_count);
        show_room2_dialogue("manuscript");
    } else if (name === "globe") {
        show_room2_dialogue("globe");
    } else if (name === "ladder") {
        show_room2_dialogue("ladder");
    } else if (name === "chair") {
        show_room2_dialogue("chair");
    } else if (name === "window") {
        show_room2_dialogue("window");
    }
    return undefined;
}

// ---------------- assembly ----------------

let room2_legacy_visual_entries = [];

function assemble_room2_scene(list) {
    // Build the legacy objects once so existing state variables remain
    // valid, then keep them permanently off-screen. The illustration
    // replaces their visual layer.
    draw_room2_layout(room2_legacy_visual_entries);
    draw_room2_windows(room2_legacy_visual_entries);
    draw_room2_fireplace(room2_legacy_visual_entries);
    draw_room2_glasses(room2_legacy_visual_entries);
    draw_room2_table(room2_legacy_visual_entries);
    draw_room2_clock(room2_legacy_visual_entries);
    draw_room2_bookshelves(room2_legacy_visual_entries);
    draw_room2_paintings(room2_legacy_visual_entries);
    draw_room2_globe(room2_legacy_visual_entries);
    draw_room2_ladder(room2_legacy_visual_entries);
    draw_room2_broken_chair(room2_legacy_visual_entries);
    draw_room2_footprints(room2_legacy_visual_entries);
    draw_room2_floor_debris(room2_legacy_visual_entries);
    draw_room2_evidence_markers(room2_legacy_visual_entries);
    draw_room2_desk(room2_legacy_visual_entries);
    draw_room2_candles(room2_legacy_visual_entries);
    create_dust(room2_legacy_visual_entries, 14, 200, 560);
    hide_entries_permanently(room2_legacy_visual_entries);

    make_scene_background(list, ROOM2_BACKGROUND_URL);

    make_room2_interactable(list, "teacup", 410, 405, 82, 22);
    make_room2_interactable(list, "manuscript", 342, 396, 82, 30);
    make_room2_interactable(list, "fireplace", 72, 450, 100, 42);
    make_room2_interactable(list, "clock", 525, 195, 110, 38);
    make_room2_interactable(list, "bookshelf", 215, 205, 145, 72);
    make_room2_interactable(list, "glasses", 485, 535, 85, 30);
    make_room2_interactable(list, "footprints", 315, 420, 100, 45);
    make_room2_interactable(list, "globe", 742, 470, 95, 42);
    make_room2_interactable(list, "ladder", 675, 230, 110, 48);
    make_room2_interactable(list, "chair", 270, 520, 90, 42);
    make_room2_interactable(list, "painting", 90, 135, 150, 58);
    make_room2_interactable(list, "window", 400, 150, 165, 72);
    make_room2_interactable(list, "desk", 625, 485, 100, 55);
    make_room2_interactable(list, "drawer", 625, 515, 80, 35);

    make_text(list, R2_CX, 582, "Click objects to collect clues.", 0.66, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 245);

    draw_room2_notebook(list);
    draw_room2_prompt(list);
    draw_room2_dialogue(list);
    draw_room2_complete_banner(list);
    draw_room2_player(list);
    for (let p = 0; p < array_length(room2_player_parts); p = p + 1) {
        set_alpha(room2_player_parts[p][0], 0);
    }
    room2_detective_frames = build_detective_frames(list);
    room2_back_button = make_mouse_button(list, 705, 45, 150, 42, "HALLWAY", 0.56, 255);

    // -- the intro overlay is created LAST so it draws on top of
    // everything above, fully hiding the room until it fades away --
    room2_intro_backdrop = make_rect(list, R2_CX, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    room2_intro_ambient_dust = create_dust(list, 10, 100, 500);

    for (let i = 0; i < array_length(R2_INTRO_PAGE_DEFS); i = i + 1) {
        room2_intro_runtime[i] = build_typed_page(list, R2_INTRO_PAGE_DEFS[i]);
    }

    room2_intro_cursor = make_text(list, R2_CX, 470, "_", 1.0, 225, 222, 215, 0);

    return [[], []];
}

function animate_room2_ambient(candles, dust, t, loop_count) {
    // Rain, fire and permanent props are baked into the illustrated
    // background. The notebook remains a live code-driven overlay.
    animate_room2_notebook(loop_count);
    return undefined;
}

function enter_room2() {
    change_scene("room2");

    room2_player_x = 400;
    room2_player_y = 555;
    position_room2_player();
    close_room2_dialogue();
    sync_room2_notebook();

    if (!room2_intro_played) {
        start_room2_intro(get_loop_count());
        room2_intro_played = true;
    } else {
        room2_intro_phase = "done";
        room2_investigation_enabled = true;
        set_alpha(room2_intro_backdrop, 0);
        set_alpha(room2_intro_cursor, 0);
    }
    return undefined;
}

// ================================================================
//  SCENE 5: ROOM 3 - THE DETECTIVE'S DESK
//  (case-closing investigation: evidence board, suspects, timeline
//  reconstruction, clue-matching, and the final accusation)
// ================================================================

const R3_CX = SCREEN_WIDTH / 2;

// ---------------- suspects ----------------
const SUS_NAME = 0;
const SUS_MOTIVE = 1;
const SUS_ALIBI = 2;
const SUS_EVIDENCE = 3;
const SUS_GUILTY = 4;

// Index 0 = James Holloway, 1 = Daniel Reed, 2 = Dr. Victor Graves (guilty)
const SUSPECTS_DATA = [
    ["James Holloway", "Personal Butler",
     "No clear motive; served Blackwood for 20 years.",
     "Delivered tea at 9:00 PM, then left.",
     "The warm teacup supports his story.", false],
    ["Daniel Reed", "Graduate Student",
     "Blackwood failed his thesis defense.",
     "Claims he stayed in his room all evening.",
     "The muddy prints are smaller than his boots.", false],
    ["Dr. Victor Graves", "Academic Rival",
     "Blackwood found his falsified research.",
     "Claims he left before 9:00 PM.",
     "Clock and burnt letter contradict his alibi.", true]
];
// note: fields shifted by one (title inserted) - use these accessors:
function sus_name(i) { return SUSPECTS_DATA[i][0]; }
function sus_title(i) { return SUSPECTS_DATA[i][1]; }
function sus_motive(i) { return SUSPECTS_DATA[i][2]; }
function sus_alibi(i) { return SUSPECTS_DATA[i][3]; }
function sus_evidence(i) { return SUSPECTS_DATA[i][4]; }
function sus_guilty(i) { return SUSPECTS_DATA[i][5]; }
const GUILTY_SUSPECT_INDEX = 2;

// The evidence board / clue-matching game only deals with clues that
// are actual "evidence pointing at a suspect" - it deliberately
// excludes the two mechanism/progression clues (the hidden key behind
// the painting, and the diary found in the unlocked drawer), since
// those aren't evidence "about" anyone. This list holds the
// R2_CLUE_* indices (into R2_CLUE_LABELS / room2_clue_found) of the
// 8 real evidence clues, in the order they're shown on the board.
const R3_EVIDENCE_CLUE_INDICES = [
    R2_CLUE_TEACUP, R2_CLUE_CLOCK, R2_CLUE_BOOKSHELF, R2_CLUE_BURNT,
    R2_CLUE_DESK, R2_CLUE_FOOTPRINTS, R2_CLUE_GLASSES, R2_CLUE_MANUSCRIPT
];

// Which suspect each entry of R3_EVIDENCE_CLUE_INDICES is evidence
// "about" (0 = Holloway, 1 = Reed, 2 = Graves). Same order as above:
// Teacup, Clock, Missing Book, Burnt Letter, Desk Note, Footprints,
// Glasses, Manuscript.
const CLUE_SUSPECT_MAP = [0, 2, 2, 2, 1, 1, 2, 2];

// ---------------- timeline reconstruction ----------------
// Six events are shown in SHUFFLED display slots 0-5. The player must
// press/click them in the correct chronological order. TIMELINE_CORRECT
// lists the display-slot indices in the order they actually happened.
const TIMELINE_EVENTS_SHUFFLED = [
    "Burnt letter; muddy prints lead to the window",
    "9:00 PM - Holloway brings the tea",
    "A struggle leaves blood by the fireplace",
    "Graves argues with Professor Blackwood",
    "The fraud manuscript is torn from its binding",
    "The clock is struck and stops at 9:17 PM"
];
const TIMELINE_CORRECT = [1, 3, 5, 2, 4, 0];

// ---------------- runtime state ----------------
let room3_phase = "none"; // none|intro|board|timeline|matching|accuse|ending
let room3_transition_state = "none"; // none|fading_out|fading_in
let room3_transition_timer = 0;
const R3_TRANSITION_FRAMES = math_round(0.7 * FPS);
let room3_fade_rect = null;

let all_clues_transition_started = false;

// (all_room2_clues_found() is already defined in the Room 2 section above)

function start_room3_transition(loop_count) {
    room3_transition_state = "fading_out";
    room3_transition_timer = 0;
    return undefined;
}

function update_room3_transition(loop_count) {
    if (room3_transition_state === "fading_out") {
        room3_transition_timer = room3_transition_timer + 1;
        const p = math_min(1, room3_transition_timer / R3_TRANSITION_FRAMES);
        update_color(room3_fade_rect, [0, 0, 0, 255 * p]);
        if (p >= 1) {
            change_scene("room3");
            start_room3_intro(loop_count);
            room3_transition_state = "fading_in";
            room3_transition_timer = 0;
        }
    } else if (room3_transition_state === "fading_in") {
        room3_transition_timer = room3_transition_timer + 1;
        const p = math_min(1, room3_transition_timer / R3_TRANSITION_FRAMES);
        update_color(room3_fade_rect, [0, 0, 0, 255 * (1 - p)]);
        if (p >= 1) {
            room3_transition_state = "none";
        }
    }
    return undefined;
}

// ---------------- typewriter cinematic intro (reuses your engine) --
const R3_PAGE0 = [
    [R3_CX, 230, ["BACK", "AT", "THE", "DESK"], 1.5, 235, 195, 110],
    [R3_CX, 300, ["Every", "clue", "the", "library", "held", "has", "been", "gathered."], 0.62, 225, 221, 213],
    [R3_CX, 340, ["Now", "the", "real", "work", "begins."], 0.7, 220, 216, 208]
];
const R3_PAGE1 = [
    [R3_CX, 220, ["Three", "names", "remain", "on", "the", "board."], 0.75, 235, 195, 110],
    [R3_CX, 270, ["One", "of", "them", "is", "lying."], 0.85, 220, 110, 100],
    [R3_CX, 340, ["The", "evidence", "-", "not", "a", "hunch", "-", "will", "decide", "who."], 0.6, 220, 216, 208]
];
const R3_INTRO_PAGE_DEFS = [R3_PAGE0, R3_PAGE1];

let room3_intro_runtime = [];
let room3_intro_page = 0;
let room3_intro_line = 0;
let room3_intro_word = 0;
let room3_intro_next_step_frame = -1;
let room3_intro_phase = "typing"; // typing|line_pause|page_hold|page_fade|final_fade|done
let room3_intro_phase_start = 0;
let room3_intro_visible_objs = [];
let room3_intro_backdrop = null;
let room3_intro_cursor = null;

function start_room3_intro(loop_count) {
    room3_phase = "intro";
    room3_intro_page = 0;
    room3_intro_line = 0;
    room3_intro_word = 0;
    room3_intro_visible_objs = [];
    room3_intro_phase = "typing";
    room3_intro_phase_start = loop_count;
    room3_intro_next_step_frame = loop_count;
    update_position(room3_intro_backdrop, [R3_CX, SCREEN_HEIGHT / 2]);
    set_alpha(room3_intro_backdrop, 255);
    sync_room3_board_visuals();
    return undefined;
}

function advance_room3_intro_step(loop_count) {
    const lines = room3_intro_runtime[room3_intro_page];
    const steps = lines[room3_intro_line];
    const total_words = array_length(steps);

    if (room3_intro_word > 0) {
        set_alpha(steps[room3_intro_word - 1], 0);
    }
    set_alpha(steps[room3_intro_word], 255);
    room3_intro_word = room3_intro_word + 1;

    if (room3_intro_word >= total_words) {
        room3_intro_visible_objs[array_length(room3_intro_visible_objs)] = steps[total_words - 1];
        room3_intro_line = room3_intro_line + 1;
        room3_intro_word = 0;
        if (room3_intro_line >= array_length(lines)) {
            room3_intro_phase = "page_hold";
            room3_intro_phase_start = loop_count;
        } else {
            room3_intro_phase = "line_pause";
            room3_intro_phase_start = loop_count;
        }
    } else {
        room3_intro_next_step_frame = loop_count + R2_WORD_FRAMES;
    }
    return undefined;
}

function update_room3_intro(loop_count) {
    if (room3_intro_phase === "done") {
        return undefined;
    }

    const showing = room3_intro_phase === "typing" || room3_intro_phase === "line_pause" || room3_intro_phase === "page_hold";
    set_alpha(room3_intro_cursor, showing && ((loop_count % 30) < 15) ? 220 : 0);

    if (room3_intro_phase === "typing") {
        if (loop_count >= room3_intro_next_step_frame) {
            advance_room3_intro_step(loop_count);
        }
    } else if (room3_intro_phase === "line_pause") {
        if (loop_count - room3_intro_phase_start >= R2_LINE_PAUSE_FRAMES) {
            room3_intro_phase = "typing";
            room3_intro_next_step_frame = loop_count;
        }
    } else if (room3_intro_phase === "page_hold") {
        if (loop_count - room3_intro_phase_start >= R2_PAGE_HOLD_FRAMES) {
            room3_intro_phase = "page_fade";
            room3_intro_phase_start = loop_count;
        }
    } else if (room3_intro_phase === "page_fade") {
        const elapsed = loop_count - room3_intro_phase_start;
        const p = math_min(1, elapsed / R2_PAGE_FADE_FRAMES);
        for (let i = 0; i < array_length(room3_intro_visible_objs); i = i + 1) {
            set_alpha(room3_intro_visible_objs[i], 255 * (1 - p));
        }
        if (p >= 1) {
            if (room3_intro_page >= array_length(room3_intro_runtime) - 1) {
                room3_intro_phase = "final_fade";
                room3_intro_phase_start = loop_count;
            } else {
                room3_intro_page = room3_intro_page + 1;
                room3_intro_line = 0;
                room3_intro_word = 0;
                room3_intro_visible_objs = [];
                room3_intro_phase = "typing";
                room3_intro_phase_start = loop_count;
                room3_intro_next_step_frame = loop_count;
            }
        }
    } else if (room3_intro_phase === "final_fade") {
        const elapsed = loop_count - room3_intro_phase_start;
        const p = math_min(1, elapsed / R2_FINAL_FADE_FRAMES);
        set_alpha(room3_intro_backdrop, 255 * (1 - p));
        if (p >= 1) {
            // FIX: this backdrop is a full-screen rect (SCREEN_WIDTH x
            // SCREEN_HEIGHT) that previously only ever got its alpha
            // faded to 0. Its position never changed, so it kept
            // sitting on top of the entire scene at full size for
            // every remaining room3 phase (board/timeline/matching/
            // accusation), geometrically blocking every single click
            // in the room even though it was invisible. Moving it
            // off-screen, same convention used everywhere else in
            // this file, actually removes it from the click path.
            update_position(room3_intro_backdrop, [R3_CX + OFFSCREEN_X, SCREEN_HEIGHT / 2]);
            room3_intro_phase = "done";
            room3_phase = "board";
            sync_room3_suspect_visuals();
            show_room3_board_panel();
            set_mouse_button_alpha(room3_board_continue_button, 255);
        }
    }
    return undefined;
}

// ---------------- evidence board (corkboard of 8 real evidence clues) ----------------
let room3_clue_cards = [];

function draw_room3_background(list) {
    make_rect(list, R3_CX, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT,
        CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    make_rect(list, R3_CX, 285, 770, 460, 34, 7, 13, 255);
    make_rect(list, R3_CX, 92, 770, 54, 112, 7, 13, 255);
    make_rect(list, R3_CX, 121, 770, 6, CUTOUT_YELLOW[0], 92, 12, 255);
    make_circle(list, 245, 340, 220, CUTOUT_RED[0], 12, 20, 40);
    make_circle(list, 580, 330, 210, 15, 68, 73, 34);
    for (let i = 0; i < 10; i = i + 1) {
        const slot_x = 75 + i * 72;
        make_rect(list, slot_x, 145, 38, 8, 185, 188, 190, 220);
        make_rect(list, slot_x, 520, 38, 8, 185, 188, 190, 220);
    }
    draw_stage_frame(list);
    make_rect(list, R3_CX, 45, 300, 42, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    make_text(list, R3_CX, 45, "ROOM 3  /  CASE DESK", 0.58, 255, 255, 255, 255);
    return undefined;
}

let room3_board_backdrop_border = null;
let room3_board_backdrop_bg = null;
let room3_board_title = null;

function draw_room3_board(list) {
    const bx = 190;
    const by = 200;
    room3_board_backdrop_border = make_rect(list, bx + 5, by + 6, 350, 350, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 255);
    room3_board_backdrop_bg = make_rect(list, bx, by, 330, 330, 12, 18, 24, 255);
    room3_board_title = make_text(list, bx, by - 185, "EVIDENCE BOARD", 0.65, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);

    const cols = 2;
    for (let i = 0; i < array_length(R3_EVIDENCE_CLUE_INDICES); i = i + 1) {
        const clue_idx = R3_EVIDENCE_CLUE_INDICES[i];
        const col = i % cols;
        const row = math_floor(i / cols);
        const cx2 = bx - 70 + col * 140;
        const cy2 = by - 135 + row * 90;
        const card = make_rect(list, cx2, cy2, 120, 60, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
        const label = make_text(list, cx2, cy2, R2_CLUE_LABELS[clue_idx], 0.42, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 0);
        make_string(list, bx, by, cx2, cy2, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 0, 3);
        room3_clue_cards[i] = [card, label];
    }
    return undefined;
}

// FIX: same bug as the suspect-panel fix above. bx/by are the same
// coordinates used here as identifiers, but the backdrop objects are
// now tracked so they can be faded AND moved off-screen. Previously
// they had no variable at all, so they stayed alpha 255 forever and
// bled into the matching/accusation screens, half-covering some clue
// cards but not others (the ones past its bottom edge).
function show_room3_board_backdrop() {
    const bx = 190;
    const by = 200;
    update_position(room3_board_backdrop_border, [bx, by]);
    update_position(room3_board_backdrop_bg, [bx, by]);
    update_position(room3_board_title, [bx, by - 185]);
    set_alpha(room3_board_backdrop_border, 255);
    set_alpha(room3_board_backdrop_bg, 255);
    set_alpha(room3_board_title, 255);
    return undefined;
}

function hide_room3_board_backdrop() {
    const bx = 190;
    const by = 200;
    update_position(room3_board_backdrop_border, [bx + OFFSCREEN_X, by]);
    update_position(room3_board_backdrop_bg, [bx + OFFSCREEN_X, by]);
    update_position(room3_board_title, [bx + OFFSCREEN_X, by - 185]);
    set_alpha(room3_board_backdrop_border, 0);
    set_alpha(room3_board_backdrop_bg, 0);
    set_alpha(room3_board_title, 0);
    return undefined;
}

function sync_room3_board_visuals() {
    show_room3_board_backdrop();
    for (let i = 0; i < array_length(room3_clue_cards); i = i + 1) {
        const pair = room3_clue_cards[i];
        set_alpha(pair[0], 255);
        set_alpha(pair[1], 255);
    }
    return undefined;
}

// ---------------- suspect carousel ----------------
let room3_suspect_index = 0;
let room3_suspect_title_texts = [];
let room3_suspect_motive_texts = [];
let room3_suspect_alibi_texts = [];
let room3_suspect_evidence_texts = [];
let room3_suspect_name_texts = [];
let room3_suspect_left_arrow = null;
let room3_suspect_right_arrow = null;
let room3_board_continue_text = null;
let room3_board_continue_button = null;

const R3_PANEL_X = SCREEN_WIDTH - 250;
const R3_PANEL_Y = 220;

// These three were previously created anonymously (not stored in any
// variable), which meant nothing could ever fade or move them. They
// sat at alpha 255 on-screen permanently, silently absorbing clicks
// meant for the matching/accusation UIs drawn in the same screen
// region later. Now tracked so show/hide_room3_board_panel() (below)
// can control them like every other room3 sub-panel.
let room3_suspect_panel_border = null;
let room3_suspect_panel_bg = null;
let room3_suspect_panel_title = null;

function draw_room3_suspect_panel(list) {
    room3_suspect_panel_border = make_rect(list, R3_PANEL_X, R3_PANEL_Y, 420, 320, PANEL_BORDER[0], PANEL_BORDER[1], PANEL_BORDER[2], 255);
    room3_suspect_panel_bg = make_rect(list, R3_PANEL_X, R3_PANEL_Y, 400, 300, PANEL_BG[0], PANEL_BG[1], PANEL_BG[2], 255);
    room3_suspect_panel_title = make_text(list, R3_PANEL_X, R3_PANEL_Y - 130, "SUSPECTS", 0.6, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);

    for (let i = 0; i < array_length(SUSPECTS_DATA); i = i + 1) {
        room3_suspect_name_texts[i] = make_text(list, R3_PANEL_X, R3_PANEL_Y - 85, sus_name(i) + " - " + sus_title(i), 0.62, 255, 255, 255, 0);
        room3_suspect_motive_texts[i] = make_text(list, R3_PANEL_X, R3_PANEL_Y - 40, "Motive: " + sus_motive(i), 0.56, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
        room3_suspect_alibi_texts[i] = make_text(list, R3_PANEL_X, R3_PANEL_Y + 15, "Alibi: " + sus_alibi(i), 0.56, 214, 235, 238, 0);
        room3_suspect_evidence_texts[i] = make_text(list, R3_PANEL_X, R3_PANEL_Y + 80, "Evidence: " + sus_evidence(i), 0.54, 255, 179, 150, 0);
    }

    room3_suspect_left_arrow = make_triangle(list, R3_PANEL_X - 230, R3_PANEL_Y, 26, 40, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    update_rotation(room3_suspect_left_arrow, -math_PI / 2);
    room3_suspect_right_arrow = make_triangle(list, R3_PANEL_X + 230, R3_PANEL_Y, 26, 40, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 255);
    update_rotation(room3_suspect_right_arrow, math_PI / 2);

    room3_board_continue_button = make_mouse_button(list, R3_CX, 550, 280, 52, "BUILD TIMELINE", 0.68, 0);
    room3_board_continue_text = room3_board_continue_button[1];

    return undefined;
}

function sync_room3_suspect_visuals() {
    for (let i = 0; i < array_length(SUSPECTS_DATA); i = i + 1) {
        const on = i === room3_suspect_index;
        set_alpha(room3_suspect_name_texts[i], on ? 255 : 0);
        set_alpha(room3_suspect_motive_texts[i], on ? 255 : 0);
        set_alpha(room3_suspect_alibi_texts[i], on ? 255 : 0);
        set_alpha(room3_suspect_evidence_texts[i], on ? 255 : 0);
    }
    return undefined;
}

// FIX: bring the suspect-carousel panel (background, border, "SUSPECTS"
// title, and browse arrows) back on-screen. Pairs with
// hide_room3_board_panel() below. Follows the same alpha+reposition
// convention as hide_scene()/show_scene() elsewhere in this file.
function show_room3_board_panel() {
    update_position(room3_suspect_panel_border, [R3_PANEL_X, R3_PANEL_Y]);
    update_position(room3_suspect_panel_bg, [R3_PANEL_X, R3_PANEL_Y]);
    update_position(room3_suspect_panel_title, [R3_PANEL_X, R3_PANEL_Y - 130]);
    update_position(room3_suspect_left_arrow, [R3_PANEL_X - 230, R3_PANEL_Y]);
    update_position(room3_suspect_right_arrow, [R3_PANEL_X + 230, R3_PANEL_Y]);
    set_alpha(room3_suspect_panel_border, 255);
    set_alpha(room3_suspect_panel_bg, 255);
    set_alpha(room3_suspect_panel_title, 255);
    set_alpha(room3_suspect_left_arrow, 255);
    set_alpha(room3_suspect_right_arrow, 255);
    return undefined;
}

// FIX: this is the missing piece. Previously the panel background,
// border, and title were anonymous gameobjects that could never be
// hidden at all, and the arrows were never hidden either. They stayed
// on-screen at alpha 255 through the matching and accusation phases,
// visually overlapping those UIs and geometrically blocking clicks on
// any suspect box/clue card that happened to fall under the panel's
// 400x300 hitbox. Moving off-screen (not just fading) matches the
// documented fix pattern used by hide_room3_timeline_ui() etc.
function hide_room3_board_panel() {
    update_position(room3_suspect_panel_border, [R3_PANEL_X + OFFSCREEN_X, R3_PANEL_Y]);
    update_position(room3_suspect_panel_bg, [R3_PANEL_X + OFFSCREEN_X, R3_PANEL_Y]);
    update_position(room3_suspect_panel_title, [R3_PANEL_X + OFFSCREEN_X, R3_PANEL_Y - 130]);
    update_position(room3_suspect_left_arrow, [R3_PANEL_X - 230 + OFFSCREEN_X, R3_PANEL_Y]);
    update_position(room3_suspect_right_arrow, [R3_PANEL_X + 230 + OFFSCREEN_X, R3_PANEL_Y]);
    set_alpha(room3_suspect_panel_border, 0);
    set_alpha(room3_suspect_panel_bg, 0);
    set_alpha(room3_suspect_panel_title, 0);
    set_alpha(room3_suspect_left_arrow, 0);
    set_alpha(room3_suspect_right_arrow, 0);
    return undefined;
}

let r3_left_prev = false;
let r3_right_prev = false;

function update_room3_board(confirmed, clicked) {
    const left_down = input_key_down("ArrowLeft") || input_key_down("a");
    const right_down = input_key_down("ArrowRight") || input_key_down("d");

    if (left_down && !r3_left_prev) {
        room3_suspect_index = (room3_suspect_index + array_length(SUSPECTS_DATA) - 1) % array_length(SUSPECTS_DATA);
        sync_room3_suspect_visuals();
    }
    if (right_down && !r3_right_prev) {
        room3_suspect_index = (room3_suspect_index + 1) % array_length(SUSPECTS_DATA);
        sync_room3_suspect_visuals();
    }
    r3_left_prev = left_down;
    r3_right_prev = right_down;

    if (clicked) {
        if (pointer_in_circle(R3_PANEL_X - 230, R3_PANEL_Y, 42)) {
            room3_suspect_index = (room3_suspect_index + array_length(SUSPECTS_DATA) - 1) % array_length(SUSPECTS_DATA);
            sync_room3_suspect_visuals();
        }
        if (pointer_in_circle(R3_PANEL_X + 230, R3_PANEL_Y, 42)) {
            room3_suspect_index = (room3_suspect_index + 1) % array_length(SUSPECTS_DATA);
            sync_room3_suspect_visuals();
        }
    }

    if (confirmed || mouse_button_clicked(room3_board_continue_button, clicked)) {
        start_room3_timeline();
    }
    return undefined;
}

// ---------------- timeline reconstruction puzzle ----------------
let room3_timeline_tiles = []; // [text_obj, r,g,b]
let room3_timeline_number_labels = [];
let room3_timeline_sequence = [];
let room3_timeline_feedback = "";
let room3_timeline_feedback_timer = 0;
const R3_TIMELINE_FEEDBACK_FRAMES = math_round(1 * FPS);

let room3_timeline_title = null;
let room3_timeline_instr = null;
let room3_timeline_msg_success = null;
let room3_timeline_msg_fail = null;
let room3_timeline_panel_box = null;
let room3_timeline_panel_border = null;
let room3_timeline_hitboxes = [];

function draw_room3_timeline_ui(list) {
    const cx = R3_CX;
    const cy = SCREEN_HEIGHT / 2;

    room3_timeline_panel_border = make_rect(list, cx, cy, 720, 440, PANEL_BORDER[0], PANEL_BORDER[1], PANEL_BORDER[2], 0);
    room3_timeline_panel_box = make_rect(list, cx, cy, 700, 420, PANEL_BG[0], PANEL_BG[1], PANEL_BG[2], 0);

    room3_timeline_title = make_text(list, cx, cy - 175, "RECONSTRUCT THE TIMELINE", 0.85, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
    room3_timeline_instr = make_text(list, cx, cy - 140, "Click the event cards in the order they actually happened.", 0.55, 255, 255, 255, 0);

    for (let i = 0; i < array_length(TIMELINE_EVENTS_SHUFFLED); i = i + 1) {
        const ty = cy - 85 + i * 42;
        room3_timeline_hitboxes[i] = make_rect(list, cx, ty, 620, 34, TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2], 0);
        const tile = make_text(list, cx, ty, stringify(i + 1) + ".  " + TIMELINE_EVENTS_SHUFFLED[i], 0.62, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 0);
        room3_timeline_tiles[i] = [tile, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2]];
    }

    room3_timeline_msg_success = make_text(list, cx, cy + 195, "The order holds together. Clear.", 0.7, 155, 245, 135, 0);
    room3_timeline_msg_fail = make_text(list, cx, cy + 195, "Something doesn't line up. Try again.", 0.7, 255, 155, 140, 0);

    return undefined;
}

function start_room3_timeline() {
    room3_phase = "timeline";
    room3_timeline_sequence = [];
    room3_timeline_feedback = "";
    room3_timeline_feedback_timer = 0;
    sync_room3_suspect_visuals_hidden();
    hide_room3_board_panel();
    show_room3_timeline_ui();
    return undefined;
}

function sync_room3_suspect_visuals_hidden() {
    hide_room3_board_backdrop();
    for (let i = 0; i < array_length(SUSPECTS_DATA); i = i + 1) {
        set_alpha(room3_suspect_name_texts[i], 0);
        set_alpha(room3_suspect_motive_texts[i], 0);
        set_alpha(room3_suspect_alibi_texts[i], 0);
        set_alpha(room3_suspect_evidence_texts[i], 0);
    }
    set_mouse_button_alpha(room3_board_continue_button, 0);
    for (let i = 0; i < array_length(room3_clue_cards); i = i + 1) {
        set_alpha(room3_clue_cards[i][0], 0);
        set_alpha(room3_clue_cards[i][1], 0);
    }
    return undefined;
}

// ROOT CAUSE FIX (final accusation click bug):
// hide_room3_timeline_ui() used to only fade this 700x440 panel (and its
// tiles) to alpha 0. Every other scene transition in this file
// (hide_scene()/show_scene()) ALWAYS pairs an alpha fade with an
// off-screen reposition, precisely because pointer_over_gameobject() is a
// plain geometric hit-test that does not care about alpha. Left in place,
// this invisible panel sat directly on top of the Final Accusation
// suspect cards (which occupy the same screen region) and silently
// absorbed every click meant for them. These two helpers now follow the
// same off-screen/on-screen convention as hide_scene/show_scene.
function timeline_tile_pos(i) {
    const cy = SCREEN_HEIGHT / 2;
    return [R3_CX, cy - 85 + i * 42];
}

function show_room3_timeline_ui() {
    update_position(room3_timeline_panel_border, [R3_CX, SCREEN_HEIGHT / 2]);
    update_position(room3_timeline_panel_box, [R3_CX, SCREEN_HEIGHT / 2]);
    set_alpha(room3_timeline_panel_border, 255);
    set_alpha(room3_timeline_panel_box, 255);
    set_alpha(room3_timeline_title, 255);
    set_alpha(room3_timeline_instr, 255);
    for (let i = 0; i < array_length(room3_timeline_tiles); i = i + 1) {
        update_position(room3_timeline_tiles[i][0], timeline_tile_pos(i));
        update_position(room3_timeline_hitboxes[i], timeline_tile_pos(i));
        update_color(room3_timeline_hitboxes[i], [TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2], 255]);
        room3_timeline_tiles[i][1] = CUTOUT_INK[0];
        room3_timeline_tiles[i][2] = CUTOUT_INK[1];
        room3_timeline_tiles[i][3] = CUTOUT_INK[2];
        set_color(room3_timeline_tiles[i], 255);
    }
    return undefined;
}

function hide_room3_timeline_ui() {
    update_position(room3_timeline_panel_border, [R3_CX + OFFSCREEN_X, SCREEN_HEIGHT / 2]);
    update_position(room3_timeline_panel_box, [R3_CX + OFFSCREEN_X, SCREEN_HEIGHT / 2]);
    set_alpha(room3_timeline_panel_border, 0);
    set_alpha(room3_timeline_panel_box, 0);
    set_alpha(room3_timeline_title, 0);
    set_alpha(room3_timeline_instr, 0);
    set_alpha(room3_timeline_msg_success, 0);
    set_alpha(room3_timeline_msg_fail, 0);
    for (let i = 0; i < array_length(room3_timeline_tiles); i = i + 1) {
        const p = timeline_tile_pos(i);
        update_position(room3_timeline_tiles[i][0], [p[0] + OFFSCREEN_X, p[1]]);
        update_position(room3_timeline_hitboxes[i], [p[0] + OFFSCREEN_X, p[1]]);
        set_alpha(room3_timeline_hitboxes[i], 0);
        set_color(room3_timeline_tiles[i], 0);
    }
    return undefined;
}

function select_timeline_tile(idx) {
    let already = false;
    for (let i = 0; i < array_length(room3_timeline_sequence); i = i + 1) {
        if (room3_timeline_sequence[i] === idx) {
            already = true;
        }
    }
    if (!already) {
        room3_timeline_sequence[array_length(room3_timeline_sequence)] = idx;
        update_color(room3_timeline_hitboxes[idx], [TILE_SELECTED[0], TILE_SELECTED[1], TILE_SELECTED[2], 255]);
    }
    if (array_length(room3_timeline_sequence) === array_length(TIMELINE_CORRECT)) {
        check_room3_timeline();
    }
    return undefined;
}

function check_room3_timeline() {
    const correct = arrays_equal(room3_timeline_sequence, TIMELINE_CORRECT);
    if (correct) {
        room3_timeline_feedback = "success";
        set_alpha(room3_timeline_msg_success, 255);
    } else {
        room3_timeline_feedback = "fail";
        set_alpha(room3_timeline_msg_fail, 255);
    }
    room3_timeline_feedback_timer = R3_TIMELINE_FEEDBACK_FRAMES;
    return undefined;
}

function update_room3_timeline(clicked) {
    if (room3_timeline_feedback_timer > 0) {
        room3_timeline_feedback_timer = room3_timeline_feedback_timer - 1;
        if (room3_timeline_feedback_timer === 0) {
            if (room3_timeline_feedback === "success") {
                set_alpha(room3_timeline_msg_success, 0);
                hide_room3_timeline_ui();
                start_room3_matching();
            } else {
                set_alpha(room3_timeline_msg_fail, 0);
                room3_timeline_feedback = "";
                room3_timeline_sequence = [];
                show_room3_timeline_ui();
            }
        }
        return undefined;
    }

    const digit = pressed_digit_this_frame();
    if (digit >= 1 && digit <= array_length(TIMELINE_EVENTS_SHUFFLED)) {
        select_timeline_tile(digit - 1);
    }

    if (clicked) {
        for (let i = 0; i < array_length(room3_timeline_tiles); i = i + 1) {
            const tile_pos = timeline_tile_pos(i);
            const hovered = pointer_in_rect(tile_pos[0], tile_pos[1], 620, 34);
            let already_selected = false;
            for (let chosen = 0; chosen < array_length(room3_timeline_sequence); chosen = chosen + 1) {
                if (room3_timeline_sequence[chosen] === i) {
                    already_selected = true;
                }
            }
            if (hovered && !already_selected) {
                update_color(room3_timeline_hitboxes[i], [TILE_HOVER[0], TILE_HOVER[1], TILE_HOVER[2], 255]);
            }
            if (hovered) {
                select_timeline_tile(i);
            }
        }
    }
    return undefined;
}

// ---------------- clue matching (link each clue to a suspect) ------
let room3_matching_clue_cards = [];
let room3_matching_suspect_boxes = [];
let room3_matching_assignment = [];
let room3_matching_selected_clue = -1;
let room3_matching_lines = [];
let room3_matching_submit_box = null;
let room3_matching_submit_text = null;
let room3_matching_title = null;
let room3_matching_instr = null;
let room3_matching_msg_success = null;
let room3_matching_msg_fail = null;

// Keyboard-only navigation state (mouse clicks aren't reliable in every
// embed, so this puzzle must be fully completable with WASD + Enter).
// "zone" cycles clue column -> suspect column -> submit button, via A/D.
// W/S move the cursor up/down within whichever zone is active.
let room3_matching_zone = "clue"; // "clue" | "suspect" | "submit"
let room3_matching_cursor_clue = 0;
let room3_matching_cursor_suspect = 0;
let r3_matching_w_prev = false;
let r3_matching_s_prev = false;
let r3_matching_a_prev = false;
let r3_matching_d_prev = false;

function make_default_assignment() {
    const arr = [];
    for (let i = 0; i < array_length(R3_EVIDENCE_CLUE_INDICES); i = i + 1) {
        arr[i] = -1;
    }
    return arr;
}

function draw_room3_matching_ui(list) {
    const cx = R3_CX;
    const cy = SCREEN_HEIGHT / 2;


    room3_matching_title = make_text(list, cx, 90, "LINK EACH CLUE TO A SUSPECT", 0.85, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
    room3_matching_instr = make_text(list, cx, 122, "Click clue - suspect. Repeat, then SUBMIT.", 0.66, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);

    for (let i = 0; i < array_length(R3_EVIDENCE_CLUE_INDICES); i = i + 1) {
        const clue_idx = R3_EVIDENCE_CLUE_INDICES[i];
        const cx2 = 130;
        const cy2 = 165 + i * 44;
        const card = make_rect(list, cx2, cy2, 190, 38, TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2], 0);
        const label = make_text(list, cx2, cy2, R2_CLUE_LABELS[clue_idx], 0.42, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 0);
        room3_matching_clue_cards[i] = [card, label, cx2, cy2];

        const line = make_rect(list, cx2, cy2, 300, 5, CUTOUT_RED[0], CUTOUT_RED[1], CUTOUT_RED[2], 0);
        room3_matching_lines[i] = line;
    }

    for (let i = 0; i < array_length(SUSPECTS_DATA); i = i + 1) {
        const bx = SCREEN_WIDTH - 190;
        const by = 210 + i * 130;
        const box = make_rect(list, bx, by, 260, 90, PANEL_BG[0], PANEL_BG[1], PANEL_BG[2], 0);
        const name = make_text(list, bx, by - 10, sus_name(i), 0.55, 255, 255, 255, 0);
        const title = make_text(list, bx, by + 20, sus_title(i), 0.42, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);
        room3_matching_suspect_boxes[i] = [box, name, title, bx, by];
    }

    room3_matching_submit_box = make_rect(list, cx, 555, 220, 56, BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2], 0);
    room3_matching_submit_text = make_text(list, cx, 555, "SUBMIT", 0.75, 255, 255, 255, 0);

    room3_matching_msg_success = make_text(list, cx, 505, "The connections are consistent. A picture forms.", 0.6, 110, 220, 120, 0);
    room3_matching_msg_fail = make_text(list, cx, 505, "One or more links don't hold up under scrutiny.", 0.6, 230, 90, 80, 0);

    return undefined;
}

function start_room3_matching() {
    room3_phase = "matching";
    room3_matching_assignment = make_default_assignment();
    room3_matching_selected_clue = -1;
    room3_matching_zone = "clue";
    room3_matching_cursor_clue = 0;
    room3_matching_cursor_suspect = 0;
    show_room3_matching_ui();
    return undefined;
}

// Same fix as the timeline UI above: the suspect boxes here sit at
// x:480-740 / y:210-500, which overlaps the Final Accusation suspect
// cards. They must be physically moved off-screen when hidden, not just
// faded, otherwise their invisible hitboxes keep intercepting clicks
// meant for the accusation cards drawn on top of them later.
function show_room3_matching_ui() {
    set_alpha(room3_matching_title, 255);
    set_alpha(room3_matching_instr, 255);
    for (let i = 0; i < array_length(room3_matching_clue_cards); i = i + 1) {
        const c = room3_matching_clue_cards[i];
        update_position(c[0], [c[2], c[3]]);
        set_alpha(c[0], 255);
        set_alpha(c[1], 255);
    }
    for (let i = 0; i < array_length(room3_matching_suspect_boxes); i = i + 1) {
        const b = room3_matching_suspect_boxes[i];
        update_position(b[0], [b[3], b[4]]);
        set_alpha(b[0], 255);
        set_alpha(b[1], 255);
        set_alpha(b[2], 255);
    }
    update_position(room3_matching_submit_box, [R3_CX, 555]);
    set_alpha(room3_matching_submit_box, 255);
    set_alpha(room3_matching_submit_text, 255);
    return undefined;
}

function hide_room3_matching_ui() {
    set_alpha(room3_matching_title, 0);
    set_alpha(room3_matching_instr, 0);
    for (let i = 0; i < array_length(room3_matching_clue_cards); i = i + 1) {
        const c = room3_matching_clue_cards[i];
        update_position(c[0], [c[2] + OFFSCREEN_X, c[3]]);
        set_alpha(c[0], 0);
        set_alpha(c[1], 0);
    }
    for (let i = 0; i < array_length(room3_matching_suspect_boxes); i = i + 1) {
        const b = room3_matching_suspect_boxes[i];
        update_position(b[0], [b[3] + OFFSCREEN_X, b[4]]);
        set_alpha(b[0], 0);
        set_alpha(b[1], 0);
        set_alpha(b[2], 0);
    }
    update_position(room3_matching_submit_box, [R3_CX + OFFSCREEN_X, 555]);
    set_alpha(room3_matching_submit_box, 0);
    set_alpha(room3_matching_submit_text, 0);
    set_alpha(room3_matching_msg_success, 0);
    set_alpha(room3_matching_msg_fail, 0);
    for (let i = 0; i < array_length(room3_matching_lines); i = i + 1) {
        set_alpha(room3_matching_lines[i], 0);
    }
    return undefined;
}

function update_line_between(obj, base_length, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = math_sqrt(dx * dx + dy * dy);
    const angle = math_atan2(dy, dx);
    update_position(obj, [(x1 + x2) / 2, (y1 + y2) / 2]);
    update_rotation(obj, angle);
    update_scale(obj, [length / base_length, 1]);
    return undefined;
}

function refresh_room3_matching_lines() {
    for (let i = 0; i < array_length(room3_matching_assignment); i = i + 1) {
        const suspect_idx = room3_matching_assignment[i];
        const line = room3_matching_lines[i];
        if (suspect_idx === -1) {
            set_alpha(line, 0);
        } else {
            const clue = room3_matching_clue_cards[i];
            const box = room3_matching_suspect_boxes[suspect_idx];
            update_line_between(line, 300, clue[2], clue[3], box[3], box[4]);
            set_alpha(line, 180);
        }
    }
    return undefined;
}

// Recolors clue cards, suspect boxes, and the submit button every frame
// to reflect the current keyboard zone/cursor and the actual selection
// state - this is what makes the cursor visible without a mouse.
function sync_room3_matching_cursor_visuals() {
    for (let i = 0; i < array_length(room3_matching_clue_cards); i = i + 1) {
        const card = room3_matching_clue_cards[i][0];
        let color = TILE_DEFAULT;
        if (i === room3_matching_selected_clue) {
            color = TILE_SELECTED;
        } else if (room3_matching_zone === "clue" && i === room3_matching_cursor_clue) {
            color = TILE_HOVER;
        }
        update_color(card, [color[0], color[1], color[2], 255]);
    }
    for (let i = 0; i < array_length(room3_matching_suspect_boxes); i = i + 1) {
        const box = room3_matching_suspect_boxes[i][0];
        const color = (room3_matching_zone === "suspect" && i === room3_matching_cursor_suspect) ? TILE_HOVER : PANEL_BG;
        update_color(box, [color[0], color[1], color[2], 255]);
    }
    const submit_color = room3_matching_zone === "submit" ? BUTTON_WOOD_HOVER : BUTTON_WOOD;
    update_color(room3_matching_submit_box, [submit_color[0], submit_color[1], submit_color[2], 255]);
    return undefined;
}

function update_room3_matching(clicked, confirmed) {
    const clue_count = array_length(room3_matching_clue_cards);
    const suspect_count = array_length(room3_matching_suspect_boxes);

    const w_down = input_key_down("w") || input_key_down("ArrowUp");
    const s_down = input_key_down("s") || input_key_down("ArrowDown");
    const a_down = input_key_down("a") || input_key_down("ArrowLeft");
    const d_down = input_key_down("d") || input_key_down("ArrowRight");
    const w_pressed = w_down && !r3_matching_w_prev;
    const s_pressed = s_down && !r3_matching_s_prev;
    const a_pressed = a_down && !r3_matching_a_prev;
    const d_pressed = d_down && !r3_matching_d_prev;
    r3_matching_w_prev = w_down;
    r3_matching_s_prev = s_down;
    r3_matching_a_prev = a_down;
    r3_matching_d_prev = d_down;

    if (w_pressed) {
        if (room3_matching_zone === "clue") {
            room3_matching_cursor_clue = (room3_matching_cursor_clue + clue_count - 1) % clue_count;
        } else if (room3_matching_zone === "suspect") {
            room3_matching_cursor_suspect = (room3_matching_cursor_suspect + suspect_count - 1) % suspect_count;
        }
    }
    if (s_pressed) {
        if (room3_matching_zone === "clue") {
            room3_matching_cursor_clue = (room3_matching_cursor_clue + 1) % clue_count;
        } else if (room3_matching_zone === "suspect") {
            room3_matching_cursor_suspect = (room3_matching_cursor_suspect + 1) % suspect_count;
        }
    }
    if (a_pressed) {
        if (room3_matching_zone === "suspect") { room3_matching_zone = "clue"; }
        else if (room3_matching_zone === "submit") { room3_matching_zone = "suspect"; }
    }
    if (d_pressed) {
        if (room3_matching_zone === "clue") { room3_matching_zone = "suspect"; }
        else if (room3_matching_zone === "suspect") { room3_matching_zone = "submit"; }
    }

    if (confirmed) {
        if (room3_matching_zone === "clue") {
            room3_matching_selected_clue = room3_matching_cursor_clue;
            display("Evidence Selected: " + R2_CLUE_LABELS[R3_EVIDENCE_CLUE_INDICES[room3_matching_cursor_clue]]);
        } else if (room3_matching_zone === "suspect" && room3_matching_selected_clue !== -1) {
            room3_matching_assignment[room3_matching_selected_clue] = room3_matching_cursor_suspect;
            refresh_room3_matching_lines();
        } else if (room3_matching_zone === "submit") {
            submit_room3_matching();
        }
    }

    // Mouse still works as a bonus input path alongside the keyboard.
    if (clicked) {
        for (let i = 0; i < clue_count; i = i + 1) {
            if (pointer_in_rect(room3_matching_clue_cards[i][2], room3_matching_clue_cards[i][3], 190, 38)) {
                room3_matching_selected_clue = i;
                room3_matching_zone = "suspect";
                room3_matching_cursor_clue = i;
                display("Evidence Selected: " + R2_CLUE_LABELS[R3_EVIDENCE_CLUE_INDICES[i]]);
            }
        }
        if (room3_matching_selected_clue !== -1) {
            for (let i = 0; i < suspect_count; i = i + 1) {
                if (pointer_in_rect(room3_matching_suspect_boxes[i][3], room3_matching_suspect_boxes[i][4], 260, 90)) {
                    room3_matching_assignment[room3_matching_selected_clue] = i;
                    room3_matching_cursor_suspect = i;
                    refresh_room3_matching_lines();
                }
            }
        }
        if (pointer_in_rect(R3_CX, 555, 220, 56)) {
            submit_room3_matching();
        }
    }

    sync_room3_matching_cursor_visuals();
    return undefined;
}

let room3_matching_feedback_timer = 0;
const R3_MATCHING_FEEDBACK_FRAMES = math_round(1.2 * FPS);
let room3_matching_feedback = "";

function submit_room3_matching() {
    let all_assigned = true;
    for (let i = 0; i < array_length(room3_matching_assignment); i = i + 1) {
        if (room3_matching_assignment[i] === -1) {
            all_assigned = false;
        }
    }
    if (!all_assigned) {
        return undefined;
    }

    const correct = arrays_equal(room3_matching_assignment, CLUE_SUSPECT_MAP);
    room3_matching_feedback = correct ? "success" : "fail";
    set_alpha(correct ? room3_matching_msg_success : room3_matching_msg_fail, 255);
    room3_matching_feedback_timer = R3_MATCHING_FEEDBACK_FRAMES;
    return undefined;
}

function update_room3_matching_feedback() {
    if (room3_matching_feedback_timer > 0) {
        room3_matching_feedback_timer = room3_matching_feedback_timer - 1;
        if (room3_matching_feedback_timer === 0) {
            if (room3_matching_feedback === "success") {
                set_alpha(room3_matching_msg_success, 0);
                hide_room3_matching_ui();
                start_room3_accusation();
            } else {
                set_alpha(room3_matching_msg_fail, 0);
                room3_matching_feedback = "";
            }
        }
    }
    return undefined;
}

// ---------------- final accusation ----------------
let room3_accuse_boxes = [];
let room3_accuse_confirm_box = null;
let room3_accuse_confirm_text = null;
let room3_accuse_title = null;
let room3_accuse_instr = null;
let room3_accuse_selected = -1;

// Keyboard-only navigation: A/D move across the row of suspects, S drops
// down to the confirm button, W goes back up to the suspect row, Enter
// activates whatever is focused. Mouse hover/click still works too.
let room3_accuse_zone = "suspect"; // "suspect" | "confirm"
let room3_accuse_cursor = 0;
let r3_accuse_w_prev = false;
let r3_accuse_s_prev = false;
let r3_accuse_a_prev = false;
let r3_accuse_d_prev = false;

function draw_room3_accuse_ui(list) {
    const cx = R3_CX;
    room3_accuse_title = make_text(list, cx, 130, "WHO KILLED PROFESSOR BLACKWOOD?", 1.0, CUTOUT_YELLOW[0], CUTOUT_YELLOW[1], CUTOUT_YELLOW[2], 0);
    room3_accuse_instr = make_text(list, cx, 170, "Choose a suspect, then click ACCUSE.", 0.68, CUTOUT_CREAM[0], CUTOUT_CREAM[1], CUTOUT_CREAM[2], 0);

    for (let i = 0; i < array_length(SUSPECTS_DATA); i = i + 1) {
        const bx = cx - 260 + i * 260;
        const by = 320;
        const box = make_rect(list, bx, by, 220, 160, TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2], 0);
        const name = make_text(list, bx, by - 20, sus_name(i), 0.6, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 0);
        const title = make_text(list, bx, by + 15, sus_title(i), 0.48, CUTOUT_BROWN[0], CUTOUT_BROWN[1], CUTOUT_BROWN[2], 0);
        room3_accuse_boxes[i] = [box, name, title];
    }

    room3_accuse_confirm_box = make_rect(list, cx, 470, 240, 60, BUTTON_WOOD[0], BUTTON_WOOD[1], BUTTON_WOOD[2], 0);
    room3_accuse_confirm_text = make_text(list, cx, 470, "ACCUSE", 0.8, 255, 255, 255, 0);

    return undefined;
}

function accuse_box_pos(i) {
    return [R3_CX - 260 + i * 260, 320];
}

function start_room3_accusation() {
    room3_phase = "accuse";
    room3_accuse_selected = -1;
    room3_accuse_zone = "suspect";
    room3_accuse_cursor = 0;
    set_alpha(room3_accuse_title, 255);
    set_alpha(room3_accuse_instr, 255);
    for (let i = 0; i < array_length(room3_accuse_boxes); i = i + 1) {
        update_position(room3_accuse_boxes[i][0], accuse_box_pos(i));
        update_color(room3_accuse_boxes[i][0], [TILE_DEFAULT[0], TILE_DEFAULT[1], TILE_DEFAULT[2], 255]);
        set_alpha(room3_accuse_boxes[i][1], 255);
        set_alpha(room3_accuse_boxes[i][2], 255);
    }
    update_position(room3_accuse_confirm_box, [R3_CX, 470]);
    set_alpha(room3_accuse_confirm_box, 255);
    set_alpha(room3_accuse_confirm_text, 255);
    return undefined;
}

function hide_room3_accuse_ui() {
    set_alpha(room3_accuse_title, 0);
    set_alpha(room3_accuse_instr, 0);
    for (let i = 0; i < array_length(room3_accuse_boxes); i = i + 1) {
        const p = accuse_box_pos(i);
        update_position(room3_accuse_boxes[i][0], [p[0] + OFFSCREEN_X, p[1]]);
        set_alpha(room3_accuse_boxes[i][0], 0);
        set_alpha(room3_accuse_boxes[i][1], 0);
        set_alpha(room3_accuse_boxes[i][2], 0);
    }
    update_position(room3_accuse_confirm_box, [R3_CX + OFFSCREEN_X, 470]);
    set_alpha(room3_accuse_confirm_box, 0);
    set_alpha(room3_accuse_confirm_text, 0);
    return undefined;
}

function sync_room3_accuse_cursor_visuals() {
    for (let i = 0; i < array_length(room3_accuse_boxes); i = i + 1) {
        const box = room3_accuse_boxes[i][0];
        let color = TILE_DEFAULT;
        if (i === room3_accuse_selected) {
            color = TILE_SELECTED;
        } else if (room3_accuse_zone === "suspect" && i === room3_accuse_cursor) {
            color = TILE_HOVER;
        }
        update_color(box, [color[0], color[1], color[2], 255]);
    }
    const confirm_color = room3_accuse_zone === "confirm" ? BUTTON_WOOD_HOVER : BUTTON_WOOD;
    update_color(room3_accuse_confirm_box, [confirm_color[0], confirm_color[1], confirm_color[2], 255]);
    return undefined;
}

function update_room3_accuse(clicked, confirmed) {
    const suspect_count = array_length(room3_accuse_boxes);

    const w_down = input_key_down("w") || input_key_down("ArrowUp");
    const s_down = input_key_down("s") || input_key_down("ArrowDown");
    const a_down = input_key_down("a") || input_key_down("ArrowLeft");
    const d_down = input_key_down("d") || input_key_down("ArrowRight");
    const w_pressed = w_down && !r3_accuse_w_prev;
    const s_pressed = s_down && !r3_accuse_s_prev;
    const a_pressed = a_down && !r3_accuse_a_prev;
    const d_pressed = d_down && !r3_accuse_d_prev;
    r3_accuse_w_prev = w_down;
    r3_accuse_s_prev = s_down;
    r3_accuse_a_prev = a_down;
    r3_accuse_d_prev = d_down;

    if (room3_accuse_zone === "suspect") {
        if (a_pressed) { room3_accuse_cursor = (room3_accuse_cursor + suspect_count - 1) % suspect_count; }
        if (d_pressed) { room3_accuse_cursor = (room3_accuse_cursor + 1) % suspect_count; }
        if (s_pressed) { room3_accuse_zone = "confirm"; }
    } else if (room3_accuse_zone === "confirm") {
        if (w_pressed) { room3_accuse_zone = "suspect"; }
    }

    if (confirmed) {
        if (room3_accuse_zone === "suspect") {
            room3_accuse_selected = room3_accuse_cursor;
            display("Selected " + sus_name(room3_accuse_cursor));
        } else if (room3_accuse_zone === "confirm" && room3_accuse_selected !== -1) {
            display("Accusation Submitted: " + sus_name(room3_accuse_selected));
            hide_room3_accuse_ui();
            start_room3_ending(sus_guilty(room3_accuse_selected));
            return undefined;
        }
    }

    // Mouse hover/click still works as a bonus input path.
    const confirm_hover = pointer_in_rect(R3_CX, 470, 240, 60);
    if (confirm_hover) { room3_accuse_zone = "confirm"; }
    for (let i = 0; i < suspect_count; i = i + 1) {
        const p = accuse_box_pos(i);
        if (pointer_in_rect(p[0], p[1], 220, 160)) {
            room3_accuse_zone = "suspect";
            room3_accuse_cursor = i;
        }
    }
    if (clicked) {
        for (let i = 0; i < suspect_count; i = i + 1) {
            const p = accuse_box_pos(i);
            if (pointer_in_rect(p[0], p[1], 220, 160)) {
                room3_accuse_selected = i;
                display("Clicked " + sus_name(i));
            }
        }
        if (confirm_hover && room3_accuse_selected !== -1) {
            display("Accusation Submitted: " + sus_name(room3_accuse_selected));
            hide_room3_accuse_ui();
            start_room3_ending(sus_guilty(room3_accuse_selected));
            return undefined;
        }
    }

    sync_room3_accuse_cursor_visuals();
    return undefined;
}

// ---------------- endings ----------------
const R3_ENDING_CORRECT_PAGE = [
    [R3_CX, 250, ["CASE", "CLOSED."], 1.5, 235, 195, 110],
    [R3_CX, 320, ["The", "evidence", "held.", "Dr.", "Graves", "confesses."], 0.65, 220, 235, 210],
    [R3_CX, 400, ["Justice,", "in", "the", "end,", "came", "from", "the", "clues", "-", "not", "a", "guess."], 0.6, 220, 216, 208]
];
const R3_ENDING_WRONG_PAGE = [
    [R3_CX, 250, ["THE", "WRONG", "NAME."], 1.5, 220, 110, 100],
    [R3_CX, 320, ["The", "accused", "has", "an", "alibi", "after", "all."], 0.65, 220, 235, 210],
    [R3_CX, 400, ["The", "true", "killer", "walks", "free", "-", "for", "now."], 0.6, 220, 216, 208],
    [R3_CX, 450, ["Review", "the", "evidence", "board", "and", "try", "again."], 0.55, 190, 186, 180]
];

let room3_ending_runtime_correct = [];
let room3_ending_runtime_wrong = [];
let room3_ending_backdrop = null;
let room3_ending_phase = "typing";
let room3_ending_which = "correct";
let room3_ending_line = 0;
let room3_ending_word = 0;
let room3_ending_next_step_frame = -1;
let room3_ending_visible_objs = [];
let room3_ending_prompt = null;
let room3_ending_button = null;

function draw_room3_ending_ui(list) {
    room3_ending_backdrop = make_rect(list, R3_CX, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 0);
    room3_ending_runtime_correct = build_typed_page(list, R3_ENDING_CORRECT_PAGE);
    room3_ending_runtime_wrong = build_typed_page(list, R3_ENDING_WRONG_PAGE);
    room3_ending_button = make_mouse_button(list, R3_CX, 540, 310, 54, "RETURN TO EVIDENCE", 0.62, 0);
    room3_ending_prompt = room3_ending_button[1];
    return undefined;
}

function start_room3_ending(is_correct) {
    room3_phase = "ending";
    room3_ending_which = is_correct ? "correct" : "wrong";
    room3_ending_line = 0;
    room3_ending_word = 0;
    room3_ending_visible_objs = [];
    room3_ending_phase = "typing";
    room3_ending_next_step_frame = get_loop_count();
    set_alpha(room3_ending_backdrop, 255);
    set_mouse_button_alpha(room3_ending_button, 0);
    return undefined;
}

function current_ending_lines() {
    return room3_ending_which === "correct" ? room3_ending_runtime_correct : room3_ending_runtime_wrong;
}

function advance_room3_ending_step(loop_count) {
    const lines = current_ending_lines();
    const steps = lines[room3_ending_line];
    const total_words = array_length(steps);

    if (room3_ending_word > 0) {
        set_alpha(steps[room3_ending_word - 1], 0);
    }
    set_alpha(steps[room3_ending_word], 255);
    room3_ending_word = room3_ending_word + 1;

    if (room3_ending_word >= total_words) {
        room3_ending_visible_objs[array_length(room3_ending_visible_objs)] = steps[total_words - 1];
        room3_ending_line = room3_ending_line + 1;
        room3_ending_word = 0;
        if (room3_ending_line >= array_length(lines)) {
            room3_ending_phase = "done";
            set_mouse_button_alpha(room3_ending_button, 255);
        } else {
            room3_ending_next_step_frame = loop_count + R2_LINE_PAUSE_FRAMES;
        }
    } else {
        room3_ending_next_step_frame = loop_count + R2_WORD_FRAMES;
    }
    return undefined;
}

function update_room3_ending(loop_count, confirmed, clicked) {
    if (room3_ending_phase === "typing") {
        if (loop_count >= room3_ending_next_step_frame) {
            advance_room3_ending_step(loop_count);
        }
    } else if (room3_ending_phase === "done") {
        if (confirmed || mouse_button_clicked(room3_ending_button, clicked)) {
            for (let i = 0; i < array_length(room3_ending_visible_objs); i = i + 1) {
                set_alpha(room3_ending_visible_objs[i], 0);
            }
            set_alpha(room3_ending_backdrop, 0);
            set_mouse_button_alpha(room3_ending_button, 0);

            if (room3_ending_which === "correct") {
                // full case solved - stay on a clean board, or route
                // to a scene of your choosing (e.g. change_scene("room_select"))
                room3_phase = "board";
                sync_room3_board_visuals();
                sync_room3_suspect_visuals();
                show_room3_board_panel();
                set_mouse_button_alpha(room3_board_continue_button, 255);
            } else {
                // let the player reconsider - back to the evidence board
                room3_phase = "board";
                sync_room3_board_visuals();
                sync_room3_suspect_visuals();
                show_room3_board_panel();
                set_mouse_button_alpha(room3_board_continue_button, 255);
            }
        }
    }
    return undefined;
}

// ---------------- assembly ----------------
function assemble_room3_scene(list) {
    make_scene_background(list, ROOM3_BACKGROUND_URL);
    draw_room3_board(list);
    draw_room3_suspect_panel(list);
    draw_room3_timeline_ui(list);
    draw_room3_matching_ui(list);
    draw_room3_accuse_ui(list);
    draw_room3_ending_ui(list);

    // intro overlay drawn last so it covers everything until it fades
    room3_intro_backdrop = make_rect(list, R3_CX, SCREEN_HEIGHT / 2, SCREEN_WIDTH, SCREEN_HEIGHT, CUTOUT_INK[0], CUTOUT_INK[1], CUTOUT_INK[2], 255);
    for (let i = 0; i < array_length(R3_INTRO_PAGE_DEFS); i = i + 1) {
        room3_intro_runtime[i] = build_typed_page(list, R3_INTRO_PAGE_DEFS[i]);
    }
    room3_intro_cursor = make_text(list, R3_CX, 400, "_", 1.0, 225, 222, 215, 0);

    hide_room3_timeline_ui();
    hide_room3_matching_ui();
    hide_room3_accuse_ui();

    return undefined;
}

// ================================================================
//  ASSEMBLE ALL SCENES (draw order = back-to-front layering)
// ================================================================

// -- landing scene --
draw_room(landing_entries);
const door_prop_parts = draw_landing_door_prop(landing_entries);
draw_table(landing_entries);
const key_parts = draw_key(landing_entries);
const candle_flames = draw_candles(landing_entries);
const dust_particles = create_dust(landing_entries, 10, 200, 460);
const menu_parts = draw_menu(landing_entries);
const menu_buttons = menu_parts[0];
const title_parts = menu_parts[1];
const magnifier = menu_parts[2];
const clue_parts = menu_parts[3];

// -- room select scene --
const room_select_parts = draw_room_select(room_select_entries);
const hallway_doors = room_select_parts[0];
const hallway_torches = room_select_parts[1];
const hallway_fog = room_select_parts[2];
const hallway_rays = room_select_parts[3];
const hallway_dust = room_select_parts[4];

// -- room 1 scene --
let room1_legacy_visual_entries = [];
draw_room1_layout(room1_legacy_visual_entries);
const room1_window_parts = draw_furniture(room1_legacy_visual_entries);
const room1_window_glass = room1_window_parts[0];
const room1_curtain = room1_window_parts[1];
hide_entries_permanently(room1_legacy_visual_entries);

room1_blocking_rects = [
    [215, 430, 190, 125, "furniture"],
    [78, 475, 120, 155, "furniture"],
    [625, 520, 115, 100, "furniture"],
    [735, 460, 105, 190, "door"]
];

make_scene_background(room1_entries, ROOM1_BACKGROUND_URL);
draw_illustrated_room1_overlays(room1_entries);
const room1_object_parts = draw_objects(room1_entries);
const room1_candle = room1_object_parts[0];
const room1_dust = room1_object_parts[1];
draw_puzzle_ui(room1_entries);
room1_detective_frames = build_detective_frames(room1_entries);

room1_fade_rect = create_rectangle(SCREEN_WIDTH, SCREEN_HEIGHT);
update_position(room1_fade_rect, [SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2]);
update_color(room1_fade_rect, [0, 0, 0, 0]);

room1_complete_title = make_text(undefined, SCREEN_WIDTH / 2, 240, "ROOM 1 COMPLETE", 1.6, 255, 220, 130, 0);
room1_complete_lines[0] = make_text(undefined, SCREEN_WIDTH / 2, 300, "\u2713 Puzzles Solved", 0.8, 220, 235, 210, 0);
room1_complete_lines[1] = make_text(undefined, SCREEN_WIDTH / 2, 335, "\u2713 Key Collected", 0.8, 220, 235, 210, 0);
room1_complete_lines[2] = make_text(undefined, SCREEN_WIDTH / 2, 370, "\u2713 Room Escaped", 0.8, 220, 235, 210, 0);

// -- room 2 scene (The Blackwood Library - full investigation rebuild) --
const room2_bundle = assemble_room2_scene(room2_entries);
const room2_candles = room2_bundle[0];
const room2_dust = room2_bundle[1];

// -- room 3 scene (The Detective's Desk - case-closing investigation) --
assemble_room3_scene(room3_entries);

room3_fade_rect = create_rectangle(SCREEN_WIDTH, SCREEN_HEIGHT);
update_position(room3_fade_rect, [SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2]);
update_color(room3_fade_rect, [0, 0, 0, 0]);

// The story has one fixed protagonist: the detective.
selected_character_index = 0;
spawn_selected_character();

// Only the landing scene starts visible - push the other scenes off
// screen immediately, before the very first frame is drawn.
hide_scene(room_select_entries);
hide_scene(room1_entries);
hide_scene(room2_entries);
hide_scene(room3_entries);
sync_room1_visuals();
sync_room_select_visuals(hallway_doors);
sync_room2_notebook();

// ================================================================
//  MAIN LOOP
// ================================================================
update_loop(game_state => {
    const loop_count = get_loop_count();
    const t = loop_count / FPS;

    const confirmed = confirm_pressed_this_frame();
    const clicked = mouse_clicked_this_frame();
    const escaped = escape_pressed_this_frame();

    update_door_fade();
    update_room3_transition(loop_count);

    if (current_scene === "landing") {
        animate_candles(candle_flames, t);
        animate_key(key_parts, t);
        animate_dust(dust_particles, t);
        animate_landing_door_prop(door_prop_parts, loop_count);

        update_landing_keyboard();
        update_landing_mouse_hover(menu_buttons);
        animate_menu_buttons(menu_buttons, t);
        animate_title(title_parts, t);
        animate_magnifier(magnifier, t);
        animate_clues(clue_parts, t);

        handle_landing_confirm(menu_buttons, confirmed, clicked);

    } else if (current_scene === "room_select") {
        animate_hallway(hallway_torches, hallway_fog, hallway_rays, t);
        animate_dust(hallway_dust, t);
        update_room2_unlock_banner(loop_count);

        update_room_selection_keyboard();
        update_room_selection_mouse(hallway_doors);

        for (let i = 0; i < array_length(hallway_doors); i = i + 1) {
            const is_hovered = i === room_selected_index;
            animate_door(hallway_doors[i], t, loop_count, is_hovered);
        }

        handle_room_selection(hallway_doors, confirmed, clicked, loop_count);

        if (mouse_button_clicked(room_select_back_button, clicked) || escaped) {
            change_scene("landing");
        }

    } else if (current_scene === "room1") {
        if (active_puzzle !== "") {
            room1_detective_moving = false;
            draw_puzzle(loop_count, escaped, clicked);
        } else if (key_reward_active(loop_count)) {
            room1_detective_moving = false;
            update_room1_dialogue_timer(confirmed, clicked);
        } else {
            const interacted = interact_pressed_this_frame();
            const room1_dialogue_was_open = room1_dialogue_timer > 0;

            update_room1_movement();
            update_room1_highlights(t);
            update_room1_dialogue_timer(confirmed, clicked);
            check_door_walkthrough();

            if (interacted && room1_nearest_name !== "") {
                search_object(room1_nearest_name, loop_count);
            }
            handle_room1_mouse_actions(room1_dialogue_was_open ? false : clicked, loop_count);

            if (escaped && door_fade_state === "none") {
                change_scene("room_select");
            }
        }

        const shake = current_room_shake_offset(loop_count);
        for (let i = 0; i < array_length(room1_player_parts); i = i + 1) {
            const part = room1_player_parts[i];
            update_position(part[0], [room1_player_x + part[1] + shake[0], room1_player_y + part[2] + shake[1]]);
        }
        update_character_accessory_position(20 + shake[0], 5 + shake[1]);
        update_detective_frames(room1_detective_frames,
            room1_player_x + shake[0], room1_player_y + shake[1],
            room1_detective_direction, room1_detective_moving, loop_count);

        animate_room(room1_candle, room1_dust, room1_window_glass, room1_curtain, t, loop_count);

    } else if (current_scene === "room2") {
        animate_room2_ambient(room2_candles, room2_dust, t, loop_count);

        if (!room2_investigation_enabled) {
            room2_detective_moving = false;
            update_room2_intro(loop_count, t);
        } else {
            const interacted = interact_pressed_this_frame();
            const room2_dialogue_was_open = room2_dialogue_timer > 0;

            update_room2_movement();
            update_room2_highlights(t);
            update_room2_dialogue_timer(confirmed, clicked);

            if (interacted && room2_nearest_name !== "") {
                search_room2_object(room2_nearest_name, loop_count);
            }
            handle_room2_mouse_actions(room2_dialogue_was_open ? false : clicked, loop_count);

            if (!all_clues_transition_started && all_room2_clues_found() && room3_transition_state === "none") {
                all_clues_transition_started = true;
                start_room3_transition(loop_count);
            }

            if (escaped && room3_transition_state === "none") {
                change_scene("room_select");
                sync_room_select_visuals(hallway_doors);
            }
        }
        update_detective_frames(room2_detective_frames,
            room2_player_x, room2_player_y,
            room2_detective_direction, room2_detective_moving, loop_count);

    } else if (current_scene === "room3") {
        if (room3_phase === "intro") {
            update_room3_intro(loop_count);
        } else if (room3_phase === "board") {
            update_room3_board(confirmed, clicked);
        } else if (room3_phase === "timeline") {
            update_room3_timeline(clicked);
        } else if (room3_phase === "matching") {
            update_room3_matching(clicked, confirmed);
            update_room3_matching_feedback();
        } else if (room3_phase === "accuse") {
            update_room3_accuse(clicked, confirmed);
        } else if (room3_phase === "ending") {
            update_room3_ending(loop_count, confirmed, clicked);
        }
    }

    return undefined;
});

build_game();
