import {
    create_rectangle,
    create_circle,
    create_triangle,
    create_text,
    create_sprite,
    update_position,
    update_color,
    update_scale,
    pointer_over_gameobject,
    input_left_mouse_down,
    set_dimensions,
    set_fps,
    get_loop_count,
    update_loop,
    build_game
} from "arcade_2d";

// OPERATION ESCAPE
// Non-Room-1 / Non-Room-2 story prototype.
// Source Academy: Source §4, arcade_2d, 800 x 600, 30 FPS.
//
// Room 1 and Room 2 are represented by integration placeholders. When the
// existing room modules are merged, their completion functions should call
// finish_study_module() and finish_library_module() respectively.

const WIDTH = 800;
const HEIGHT = 600;
const FPS = 30;
const OFFSCREEN_X = 6000;
// arcade_2d rasterizes text before scaling it. Values below about 0.8 become
// unreadable on the 800 x 600 canvas, especially when the preview is resized.
const MIN_TEXT_SCALE = 0.72;

// Scene illustrations live in assets/scenes/runtime. Source Academy cannot
// read local files, so the same folder must be present in the GitHub repo.
// The geometric drawing underneath each image remains as a loading fallback.
const SCENE_ART_ENABLED = true;
const SCENE_ART_BASE =
    "https://raw.githubusercontent.com/khanakaggarwal1204/Operation-Escape/main/assets/scenes/runtime/";

set_dimensions([WIDTH, HEIGHT]);
set_fps(FPS);

// ---------------------------------------------------------------------------
// Scene storage and drawing helpers
// ---------------------------------------------------------------------------

let title_entries = [];
let archive_entries = [];
let memory_entries = [];
let kidnapping_entries = [];
let attic_entries = [];
let corridor_entries = [];
let hall_entries = [];
let room_stub_entries = [];
let statue_entries = [];
let lab_entries = [];
let deduction_entries = [];
let safe_entries = [];
let confrontation_entries = [];
let fire_entries = [];
let normal_ending_entries = [];
let hidden_ending_entries = [];

function add_entry(list, obj, x, y, r, g, b, a) {
    update_position(obj, [x, y]);
    update_color(obj, [r, g, b, a]);
    list[array_length(list)] = [obj, x, y, r, g, b, a];
    return obj;
}

function make_rect(list, x, y, w, h, r, g, b, a) {
    return add_entry(list, create_rectangle(w, h), x, y, r, g, b, a);
}

function make_circle(list, x, y, radius, r, g, b, a) {
    return add_entry(list, create_circle(radius), x, y, r, g, b, a);
}

function make_triangle(list, x, y, w, h, r, g, b, a) {
    return add_entry(list, create_triangle(w, h), x, y, r, g, b, a);
}

function make_text(list, x, y, value, size, r, g, b, a) {
    const text = create_text(value);
    const readable_size = size < MIN_TEXT_SCALE ? MIN_TEXT_SCALE : size;
    update_scale(text, [readable_size, readable_size]);
    return add_entry(list, text, x, y, r, g, b, a);
}

function make_scene_art(list, filename, alpha) {
    if (SCENE_ART_ENABLED) {
        const sprite = create_sprite(SCENE_ART_BASE + filename);
        update_scale(sprite, [1, 1]);
        return add_entry(list, sprite, WIDTH / 2, HEIGHT / 2,
                         255, 255, 255, alpha);
    }
    return undefined;
}

function paint(obj, r, g, b, a) {
    update_color(obj, [r, g, b, a]);
    return undefined;
}

function hide_scene(list) {
    for (let i = 0; i < array_length(list); i = i + 1) {
        const entry = list[i];
        update_position(entry[0], [entry[1] + OFFSCREEN_X, entry[2]]);
        update_color(entry[0], [entry[3], entry[4], entry[5], 0]);
    }
    return undefined;
}

function show_scene(list) {
    for (let i = 0; i < array_length(list); i = i + 1) {
        const entry = list[i];
        update_position(entry[0], [entry[1], entry[2]]);
        update_color(entry[0], [entry[3], entry[4], entry[5], entry[6]]);
    }
    return undefined;
}

function scene_entries(name) {
    return name === "title" ? title_entries
         : name === "archives" ? archive_entries
         : name === "memory" ? memory_entries
         : name === "kidnapping" ? kidnapping_entries
         : name === "attic" ? attic_entries
         : name === "corridor" ? corridor_entries
         : name === "hall" ? hall_entries
         : name === "room_stub" ? room_stub_entries
         : name === "statues" ? statue_entries
         : name === "lab" ? lab_entries
         : name === "deduction" ? deduction_entries
         : name === "safe" ? safe_entries
         : name === "confrontation" ? confrontation_entries
         : name === "fire" ? fire_entries
         : name === "ending_normal" ? normal_ending_entries
         : hidden_ending_entries;
}

let current_scene = "title";

function change_scene(name) {
    if (name !== current_scene) {
        hide_scene(scene_entries(current_scene));
        show_scene(scene_entries(name));
        current_scene = name;
    }
    return undefined;
}

// Button record: [box, label, x, y, width, height]
function make_button(list, x, y, w, h, label) {
    const box = make_rect(list, x, y, w, h, 38, 48, 62, 255);
    const text = make_text(list, x, y, label, 0.85, 250, 231, 179, 255);
    return [box, text, x, y, w, h];
}

function button_hover(button, enabled) {
    const hovered = enabled && pointer_over_gameobject(button[0]);
    if (!enabled) {
        paint(button[0], 39, 41, 47, 190);
        paint(button[1], 143, 145, 148, 210);
    } else if (hovered) {
        paint(button[0], 132, 82, 39, 255);
        paint(button[1], 255, 244, 198, 255);
    } else {
        paint(button[0], 38, 48, 62, 255);
        paint(button[1], 250, 231, 179, 255);
    }
    return hovered;
}

function button_clicked(button, clicked, enabled) {
    return clicked && enabled && pointer_over_gameobject(button[0]);
}

function draw_header(list, title, subtitle) {
    make_rect(list, WIDTH / 2, 34, WIDTH, 68, 14, 12, 18, 255);
    make_text(list, WIDTH / 2, 24, title, 1.05, 238, 202, 120, 255);
    make_text(list, WIDTH / 2, 51, subtitle, 0.48, 202, 196, 185, 235);
    return undefined;
}

function draw_footer(list, text) {
    make_rect(list, WIDTH / 2, 579, WIDTH, 42, 12, 10, 14, 245);
    make_text(list, WIDTH / 2, 579, text, 0.48, 205, 198, 185, 230);
    return undefined;
}

// ---------------------------------------------------------------------------
// Persistent story state
// ---------------------------------------------------------------------------

let archive_found = [false, false, false, false];
let archive_count = 0;
let memory_choice = -1;
let archive_deduction_complete = false;
let kidnapping_stage = 0;

let attic_has_wire = false;
let attic_has_pliers = false;
let attic_has_hook = false;
let attic_selected_item = -1; // 0 wire, 1 pliers, 2 hook
let attic_door_open = false;
let attic_message = 0;
let corridor_message = 0;

let study_done = false;
let library_done = false;
let room_stub_mode = 0; // 0 study, 1 library
let photo_examined = false;
let statues_owned = [false, false, false, false]; // owl, stag, serpent, hound
let statue_positions = [-1, -1, -1, -1];
let selected_statue = -1;
let lab_unlocked = false;
let hidden_password_found = false;

const hidden_password = [
    1 + math_floor(math_random() * 9),
    math_floor(math_random() * 10),
    math_floor(math_random() * 10),
    math_floor(math_random() * 10)
];

let lab_found = [false, false, false, false];
let lab_found_count = 0;
let deduction_stage = 0;
let deduction_choice = -1;
let normal_case_complete = false;
let safe_input = [];
let safe_message = 0;
let conspiracy_evidence = false;
let commissioner_identified = false;
let confrontation_stage = 0;

let fire_step = 0;
let fire_start_frame = -1;
let fire_penalty_frames = 0;
let fire_failed = false;

// ---------------------------------------------------------------------------
// Scene 0: Title
// ---------------------------------------------------------------------------

let title_start_button = null;

function build_title_scene() {
    make_rect(title_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 8, 12, 20, 255);
    make_rect(title_entries, WIDTH / 2, 300, 746, 536, 27, 35, 47, 255);
    make_rect(title_entries, WIDTH / 2, 300, 724, 514, 184, 137, 65, 255);
    make_rect(title_entries, WIDTH / 2, 300, 704, 494, 18, 24, 35, 255);
    make_scene_art(title_entries, "title_caseboard.png", 255);

    make_text(title_entries, WIDTH / 2, 82, "OPERATION ESCAPE", 2.15, 255, 215, 112, 255);
    make_text(title_entries, WIDTH / 2, 126, "BLACKWOOD'S LAST CASE", 1.0, 219, 229, 238, 255);
    make_text(title_entries, WIDTH / 2, 161,
              "MEMORY CAN BE ALTERED. THE TRUTH MUST BE REBUILT.",
              0.9, 173, 205, 225, 255);

    // Magnifying glass and evidence thread.
    make_circle(title_entries, 220, 300, 72, 191, 220, 232, 90);
    make_circle(title_entries, 220, 300, 57, 13, 20, 32, 255);
    make_rect(title_entries, 275, 368, 22, 115, 206, 157, 78, 255);
    make_rect(title_entries, 365, 300, 160, 5, 151, 47, 45, 230);
    make_circle(title_entries, 360, 300, 7, 225, 191, 105, 255);

    // Blackwood case-file card.
    make_rect(title_entries, 565, 305, 215, 220, 207, 194, 163, 255);
    make_rect(title_entries, 565, 305, 195, 200, 49, 55, 65, 255);
    make_text(title_entries, 565, 225, "CASE 0017", 0.9, 255, 216, 119, 255);
    make_circle(title_entries, 565, 285, 30, 14, 17, 24, 255);
    make_triangle(title_entries, 565, 350, 76, 100, 14, 17, 24, 255);
    make_text(title_entries, 565, 382, "ELIAS BLACKWOOD", 0.9, 235, 231, 218, 255);
    make_rect(title_entries, 565, 418, 160, 32, 126, 43, 40, 255);
    make_text(title_entries, 565, 418, "CASE CLOSED", 0.85, 255, 224, 192, 255);

    title_start_button = make_button(title_entries, WIDTH / 2, 488, 340, 72, "BEGIN INVESTIGATION");
    make_text(title_entries, WIDTH / 2, 552,
              "CLICK TO INVESTIGATE  |  COLLECT EVIDENCE  |  REBUILD THE TRUTH",
              0.85, 202, 216, 226, 255);
    return undefined;
}

function update_title(clicked) {
    button_hover(title_start_button, true);
    if (button_clicked(title_start_button, clicked, true)) {
        change_scene("archives");
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Scene 1: Police Archives
// ---------------------------------------------------------------------------

let archive_files = [];
let archive_evidence_lines = [];
let archive_status_lines = [];
let archive_memory_button = null;
let archive_leave_button = null;
let archive_locked_message = null;

function build_archive_scene() {
    make_rect(archive_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 22, 25, 31, 255);
    make_scene_art(archive_entries, "police_archives.png", 255);
    draw_header(archive_entries, "POLICE ARCHIVES", "BLACKWOOD CASE - RESTRICTED ACCESS");

    for (let shelf = 0; shelf < 3; shelf = shelf + 1) {
        const sy = 155 + shelf * 125;
        make_rect(archive_entries, 145, sy, 230, 94, 56, 47, 42, 255);
        make_rect(archive_entries, 145, sy + 53, 250, 10, 25, 23, 24, 255);
        for (let file = 0; file < 8; file = file + 1) {
            const col = file % 3;
            make_rect(archive_entries, 55 + file * 25, sy, 17, 70,
                      88 + col * 18, 55 + col * 12, 48 + col * 8, 255);
        }
    }

    make_rect(archive_entries, 510, 307, 490, 430, 18, 17, 22, 245);
    make_text(archive_entries, 510, 105, "FILES BLACKWOOD MARKED BEFORE HIS DEATH", 0.69, 238, 205, 132, 255);

    const labels = [
        "MERCY HOSPITAL - MEMORY LOSS",
        "NORTHGATE DETENTION - CHANGED TESTIMONY",
        "HALDEN LAB - FALSIFIED RESEARCH",
        "ST. ORISON CLINIC - UNEXPLAINED DEATH"
    ];
    for (let i = 0; i < 4; i = i + 1) {
        const y = 140 + i * 60;
        archive_files[i] = make_button(archive_entries, 510, y, 420, 50, labels[i]);
    }

    make_text(archive_entries, 510, 385, "EXTRACTED CONNECTIONS", 0.82, 224, 201, 151, 255);
    const evidence = [
        "Dr. Adrian Vale - consultant",
        "Dr. Adrian Vale - police adviser",
        "Dr. Adrian Vale - research supervisor",
        "Dr. Adrian Vale - project director"
    ];
    for (let i = 0; i < 4; i = i + 1) {
        archive_evidence_lines[i] = make_text(archive_entries, 510, 415 + i * 25,
                                              evidence[i], 0.76, 133, 225, 170, 0);
    }

    const status = [
        "Find the four marked files.",
        "1 / 4 files found",
        "2 / 4 files found",
        "3 / 4 files found",
        "All files found. Deduction is optional."
    ];
    for (let i = 0; i < 5; i = i + 1) {
        archive_status_lines[i] = make_text(archive_entries, 190, 530, status[i], 0.76, 232, 222, 202, i === 0 ? 255 : 0);
    }
    archive_memory_button = make_button(archive_entries, 500, 530, 210, 44, "MEMORY PALACE");
    archive_leave_button = make_button(archive_entries, 675, 530, 120, 44, "LEAVE");
    archive_locked_message = make_text(archive_entries, 510, 505, "More evidence is required.", 0.72, 224, 112, 96, 0);
    draw_footer(archive_entries, "Click each marked file. The same name may connect unrelated incidents.");
    return undefined;
}

function refresh_archive() {
    for (let i = 0; i < 4; i = i + 1) {
        if (archive_found[i]) {
            paint(archive_files[i][0], 43, 88, 69, 255);
            paint(archive_files[i][1], 198, 241, 210, 255);
            paint(archive_evidence_lines[i], 133, 213, 170, 255);
        }
    }
    for (let i = 0; i < 5; i = i + 1) {
        paint(archive_status_lines[i], 221, 211, 190, i === archive_count ? 255 : 0);
    }
    return undefined;
}

function update_archives(clicked) {
    refresh_archive();
    for (let i = 0; i < 4; i = i + 1) {
        if (!archive_found[i]) {
            button_hover(archive_files[i], true);
            if (button_clicked(archive_files[i], clicked, true)) {
                archive_found[i] = true;
                archive_count = archive_count + 1;
            }
        }
    }

    const ready = archive_count === 4;
    button_hover(archive_memory_button, ready);
    button_hover(archive_leave_button, ready);
    if (button_clicked(archive_memory_button, clicked, ready)) {
        change_scene("memory");
    } else if (button_clicked(archive_leave_button, clicked, ready)) {
        change_scene("kidnapping");
    } else if (button_clicked(archive_memory_button, clicked, true) && !ready) {
        paint(archive_locked_message, 210, 100, 90, 255);
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Scene 1B: Memory Palace tutorial
// ---------------------------------------------------------------------------

let memory_name_buttons = [];
let memory_submit_button = null;
let memory_return_button = null;
let memory_result_wrong = null;
let memory_result_correct = null;
let memory_conclusion = null;
let memory_continue_button = null;

function build_memory_scene() {
    make_rect(memory_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 7, 12, 25, 255);
    make_scene_art(memory_entries, "memory_palace.png", 255);
    for (let i = 0; i < 9; i = i + 1) {
        make_circle(memory_entries, 75 + i * 86, 115 + (i % 2) * 360,
                    2 + (i % 3), 112, 170, 225, 110);
    }
    draw_header(memory_entries, "MEMORY PALACE", "FIND THE PERSON WHO CONNECTS EVERY INCIDENT");

    const cases = ["MERCY", "NORTHGATE", "HALDEN", "ST. ORISON"];
    for (let i = 0; i < 4; i = i + 1) {
        const x = 115 + i * 190;
        make_rect(memory_entries, x, 155, 155, 76, 30, 45, 68, 255);
        make_text(memory_entries, x, 145, cases[i], 0.55, 222, 231, 242, 255);
        make_text(memory_entries, x, 172, "VALE", 0.48, 134, 211, 180, 255);
        make_rect(memory_entries, x, 222, 5, 58, 103, 151, 191, 150);
    }

    make_text(memory_entries, WIDTH / 2, 270, "WHO APPEARS MOST OFTEN?", 0.8, 236, 205, 132, 255);
    const names = ["DR. ADRIAN VALE", "DR. ELLIS HARKER", "WARDEN PIKE"];
    for (let i = 0; i < 3; i = i + 1) {
        memory_name_buttons[i] = make_button(memory_entries, WIDTH / 2, 325 + i * 62, 330, 47, names[i]);
    }

    memory_submit_button = make_button(memory_entries, 535, 520, 230, 50, "FORM DEDUCTION");
    memory_return_button = make_button(memory_entries, 265, 520, 190, 50, "RETURN TO FILES");
    memory_result_wrong = make_text(memory_entries, WIDTH / 2, 480,
                                    "The connection is incomplete. Compare all four files.", 0.5, 226, 106, 92, 0);
    memory_result_correct = make_text(memory_entries, WIDTH / 2, 285,
                                      "DEDUCTION COMPLETE", 0.85, 118, 229, 161, 0);
    memory_conclusion = make_text(memory_entries, WIDTH / 2, 365,
                                  "DR. VALE IS CONNECTED TO EVERY ILLEGAL RESEARCH INCIDENT.",
                                  0.68, 235, 222, 184, 0);
    memory_continue_button = make_button(memory_entries, WIDTH / 2, 455, 260, 54, "LEAVE MEMORY PALACE");
    paint(memory_continue_button[0], 62, 48, 42, 0);
    paint(memory_continue_button[1], 240, 222, 178, 0);
    draw_footer(memory_entries, "Select a name, then form a deduction.");
    return undefined;
}

function refresh_memory() {
    for (let i = 0; i < 3; i = i + 1) {
        if (!archive_deduction_complete && memory_choice === i) {
            paint(memory_name_buttons[i][0], 57, 96, 118, 255);
            paint(memory_name_buttons[i][1], 222, 242, 255, 255);
        }
    }
    if (archive_deduction_complete) {
        for (let i = 0; i < 3; i = i + 1) {
            paint(memory_name_buttons[i][0], 42, 40, 44, 0);
            paint(memory_name_buttons[i][1], 120, 115, 110, 0);
        }
        paint(memory_submit_button[0], 62, 48, 42, 0);
        paint(memory_submit_button[1], 240, 222, 178, 0);
        paint(memory_return_button[0], 62, 48, 42, 0);
        paint(memory_return_button[1], 240, 222, 178, 0);
        paint(memory_result_wrong, 226, 106, 92, 0);
        paint(memory_result_correct, 118, 229, 161, 255);
        paint(memory_conclusion, 235, 222, 184, 255);
        paint(memory_continue_button[0], 62, 48, 42, 255);
        paint(memory_continue_button[1], 240, 222, 178, 255);
    }
    return undefined;
}

function update_memory(clicked) {
    refresh_memory();
    if (!archive_deduction_complete) {
        for (let i = 0; i < 3; i = i + 1) {
            button_hover(memory_name_buttons[i], true);
            if (button_clicked(memory_name_buttons[i], clicked, true)) {
                memory_choice = i;
            }
        }
        button_hover(memory_submit_button, memory_choice >= 0);
        button_hover(memory_return_button, true);
        if (button_clicked(memory_return_button, clicked, true)) {
            change_scene("archives");
        } else if (button_clicked(memory_submit_button, clicked, memory_choice >= 0)) {
            if (memory_choice === 0) {
                archive_deduction_complete = true;
            } else {
                paint(memory_result_wrong, 226, 106, 92, 255);
            }
        }
    } else {
        button_hover(memory_continue_button, true);
        if (button_clicked(memory_continue_button, clicked, true)) {
            change_scene("archives");
        }
    }
    refresh_memory();
    return undefined;
}

// ---------------------------------------------------------------------------
// Kidnapping transition
// ---------------------------------------------------------------------------

let kidnapping_lines = [];
let kidnapping_next_button = null;

function build_kidnapping_scene() {
    make_rect(kidnapping_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 8, 8, 11, 255);
    make_scene_art(kidnapping_entries, "police_archives.png", 205);
    make_rect(kidnapping_entries, WIDTH / 2, 410, WIDTH, 250, 15, 13, 17, 255);
    make_circle(kidnapping_entries, 560, 208, 40, 12, 12, 16, 255);
    make_rect(kidnapping_entries, 560, 340, 110, 225, 12, 12, 16, 255);
    make_triangle(kidnapping_entries, 515, 263, 60, 145, 12, 12, 16, 255);

    kidnapping_lines[0] = make_text(kidnapping_entries, WIDTH / 2, 405,
        "COLLEAGUE: You should have left Blackwood's case alone.", 0.68, 235, 224, 203, 255);
    kidnapping_lines[1] = make_text(kidnapping_entries, WIDTH / 2, 405,
        "A sharp blow. The archive shelves disappear into darkness.", 0.68, 220, 213, 205, 0);
    kidnapping_lines[2] = make_text(kidnapping_entries, WIDTH / 2, 405,
        "Somewhere far away, an old clock strikes once.", 0.68, 220, 213, 205, 0);
    kidnapping_next_button = make_button(kidnapping_entries, WIDTH / 2, 505, 220, 54, "CONTINUE");
    return undefined;
}

function update_kidnapping(clicked) {
    for (let i = 0; i < 3; i = i + 1) {
        paint(kidnapping_lines[i], 230, 220, 204, i === kidnapping_stage ? 255 : 0);
    }
    button_hover(kidnapping_next_button, true);
    if (button_clicked(kidnapping_next_button, clicked, true)) {
        if (kidnapping_stage < 2) {
            kidnapping_stage = kidnapping_stage + 1;
        } else {
            change_scene("attic");
        }
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Scene 2: Attic storage room
// ---------------------------------------------------------------------------

let attic_wire_hotspot = null;
let attic_pliers_hotspot = null;
let attic_door_hotspot = null;
let attic_wire_button = null;
let attic_pliers_button = null;
let attic_hook_button = null;
let attic_messages = [];
let attic_leave_button = null;

function build_attic_scene() {
    make_rect(attic_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 25, 21, 20, 255);
    make_scene_art(attic_entries, "attic_storage.png", 255);
    draw_header(attic_entries, "VALE MANOR - ATTIC STORAGE", "OBJECTIVE: ESCAPE THE LOCKED ROOM");

    make_triangle(attic_entries, 145, 80, 300, 160, 39, 32, 28, 255);
    make_rect(attic_entries, 400, 92, 800, 14, 50, 39, 32, 255);
    make_rect(attic_entries, 675, 300, 190, 390, 49, 34, 27, 255);
    make_rect(attic_entries, 675, 300, 156, 350, 64, 43, 31, 255);
    make_rect(attic_entries, 590, 300, 8, 285, 16, 14, 16, 255);
    make_text(attic_entries, 675, 495, "LOCKED FROM OUTSIDE", 0.48, 194, 164, 118, 255);

    make_rect(attic_entries, 210, 395, 220, 130, 74, 57, 42, 255);
    make_rect(attic_entries, 210, 332, 235, 16, 92, 67, 46, 255);
    make_rect(attic_entries, 350, 420, 120, 95, 63, 52, 47, 255);
    make_circle(attic_entries, 120, 280, 53, 41, 38, 37, 255);
    make_rect(attic_entries, 120, 335, 7, 105, 80, 70, 64, 255);

    // Collectible wire and pliers.
    make_circle(attic_entries, 205, 295, 25, 151, 145, 134, 255);
    make_rect(attic_entries, 205, 295, 42, 4, 190, 183, 168, 255);
    attic_wire_hotspot = make_rect(attic_entries, 205, 295, 90, 70, 255, 255, 255, 1);
    make_text(attic_entries, 205, 260, "BENT HANGER", 0.43, 209, 199, 180, 255);

    make_triangle(attic_entries, 365, 373, 35, 48, 159, 64, 54, 255);
    make_triangle(attic_entries, 390, 373, 35, 48, 159, 64, 54, 255);
    make_circle(attic_entries, 378, 392, 10, 72, 68, 66, 255);
    attic_pliers_hotspot = make_rect(attic_entries, 378, 380, 85, 70, 255, 255, 255, 1);
    make_text(attic_entries, 378, 337, "PLIERS", 0.43, 209, 199, 180, 255);

    attic_door_hotspot = make_rect(attic_entries, 590, 300, 50, 290, 255, 255, 255, 1);
    make_text(attic_entries, 590, 142, "CRACK", 0.43, 220, 184, 115, 255);

    // Inventory bar.
    make_rect(attic_entries, WIDTH / 2, 535, WIDTH, 88, 11, 10, 14, 248);
    make_text(attic_entries, 90, 510, "INVENTORY", 0.55, 235, 205, 132, 255);
    attic_wire_button = make_button(attic_entries, 245, 535, 170, 48, "METAL WIRE");
    attic_pliers_button = make_button(attic_entries, 430, 535, 150, 48, "PLIERS");
    attic_hook_button = make_button(attic_entries, 615, 535, 180, 48, "WIRE HOOK");

    const messages = [
        "Find a way to open the old external latch.",
        "Metal wire collected.",
        "Pliers collected.",
        "Select the wire and pliers in the inventory to combine them.",
        "ITEM CREATED: Bent Wire Hook",
        "Select the wire hook, then use it on the crack in the door.",
        "The hook catches the latch. The attic door swings open.",
        "That item cannot open the door.",
        "Those items do not combine."
    ];
    for (let i = 0; i < array_length(messages); i = i + 1) {
        attic_messages[i] = make_text(attic_entries, WIDTH / 2, 475, messages[i], 0.48,
                                      229, 218, 197, i === 0 ? 255 : 0);
    }
    attic_leave_button = make_button(attic_entries, 675, 450, 190, 52, "ENTER CORRIDOR");
    paint(attic_leave_button[0], 62, 48, 42, 0);
    paint(attic_leave_button[1], 240, 222, 178, 0);
    return undefined;
}

function set_attic_message(index) {
    attic_message = index;
    return undefined;
}

function try_combine_attic_items(new_item) {
    if (attic_selected_item < 0) {
        attic_selected_item = new_item;
    } else if ((attic_selected_item === 0 && new_item === 1)
            || (attic_selected_item === 1 && new_item === 0)) {
        attic_has_wire = false;
        attic_has_pliers = false;
        attic_has_hook = true;
        attic_selected_item = 2;
        set_attic_message(4);
    } else if (attic_selected_item === new_item) {
        attic_selected_item = -1;
    } else {
        attic_selected_item = new_item;
        set_attic_message(8);
    }
    return undefined;
}

function refresh_attic() {
    for (let i = 0; i < array_length(attic_messages); i = i + 1) {
        paint(attic_messages[i], 229, 218, 197, i === attic_message ? 255 : 0);
    }

    const wire_visible = attic_has_wire;
    const pliers_visible = attic_has_pliers;
    const hook_visible = attic_has_hook;
    paint(attic_wire_button[0], 62, 48, 42, wire_visible ? 255 : 0);
    paint(attic_wire_button[1], 240, 222, 178, wire_visible ? 255 : 0);
    paint(attic_pliers_button[0], 62, 48, 42, pliers_visible ? 255 : 0);
    paint(attic_pliers_button[1], 240, 222, 178, pliers_visible ? 255 : 0);
    paint(attic_hook_button[0], 62, 48, 42, hook_visible ? 255 : 0);
    paint(attic_hook_button[1], 240, 222, 178, hook_visible ? 255 : 0);

    if (attic_selected_item === 0 && wire_visible) {
        paint(attic_wire_button[0], 49, 102, 112, 255);
    } else if (attic_selected_item === 1 && pliers_visible) {
        paint(attic_pliers_button[0], 49, 102, 112, 255);
    } else if (attic_selected_item === 2 && hook_visible) {
        paint(attic_hook_button[0], 49, 102, 112, 255);
    }

    paint(attic_leave_button[0], 62, 48, 42, attic_door_open ? 255 : 0);
    paint(attic_leave_button[1], 240, 222, 178, attic_door_open ? 255 : 0);
    return undefined;
}

function update_attic(clicked) {
    refresh_attic();
    if (!attic_has_wire && !attic_has_hook && pointer_over_gameobject(attic_wire_hotspot) && clicked) {
        attic_has_wire = true;
        set_attic_message(1);
    }
    if (!attic_has_pliers && !attic_has_hook && pointer_over_gameobject(attic_pliers_hotspot) && clicked) {
        attic_has_pliers = true;
        set_attic_message(2);
    }

    if (attic_has_wire) {
        button_hover(attic_wire_button, true);
        if (button_clicked(attic_wire_button, clicked, true)) {
            try_combine_attic_items(0);
            if (attic_has_wire && attic_has_pliers && attic_selected_item >= 0) {
                set_attic_message(3);
            }
        }
    }
    if (attic_has_pliers) {
        button_hover(attic_pliers_button, true);
        if (button_clicked(attic_pliers_button, clicked, true)) {
            try_combine_attic_items(1);
            if (attic_has_wire && attic_has_pliers && attic_selected_item >= 0) {
                set_attic_message(3);
            }
        }
    }
    if (attic_has_hook) {
        button_hover(attic_hook_button, true);
        if (button_clicked(attic_hook_button, clicked, true)) {
            attic_selected_item = attic_selected_item === 2 ? -1 : 2;
            set_attic_message(attic_selected_item === 2 ? 5 : 4);
        }
    }

    if (!attic_door_open && clicked && pointer_over_gameobject(attic_door_hotspot)) {
        if (attic_selected_item === 2) {
            attic_door_open = true;
            set_attic_message(6);
        } else {
            set_attic_message(7);
        }
    }

    if (attic_door_open) {
        button_hover(attic_leave_button, true);
        if (button_clicked(attic_leave_button, clicked, true)) {
            change_scene("corridor");
        }
    }
    refresh_attic();
    return undefined;
}

// ---------------------------------------------------------------------------
// Attic corridor and staircase transition
// ---------------------------------------------------------------------------

let corridor_locked_door = null;
let corridor_boards = null;
let corridor_portrait = null;
let corridor_stairs_button = null;
let corridor_messages = [];

function build_corridor_scene() {
    make_rect(corridor_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 28, 25, 27, 255);
    make_scene_art(corridor_entries, "attic_corridor.png", 255);
    draw_header(corridor_entries, "ATTIC CORRIDOR", "VALE MANOR - UPPER FLOOR");
    make_rect(corridor_entries, WIDTH / 2, 435, WIDTH, 250, 42, 34, 31, 255);

    for (let i = 0; i < 5; i = i + 1) {
        make_rect(corridor_entries, 80 + i * 165, 205, 110, 245, 51, 39, 34, 255);
        make_circle(corridor_entries, 45 + i * 165, 218, 5, 180, 143, 78, 255);
    }
    corridor_locked_door = make_rect(corridor_entries, 80, 205, 120, 260, 255, 255, 255, 1);

    make_rect(corridor_entries, 400, 210, 170, 120, 63, 51, 45, 255);
    make_circle(corridor_entries, 400, 190, 35, 17, 16, 19, 255);
    make_triangle(corridor_entries, 400, 235, 70, 95, 25, 24, 29, 255);
    corridor_portrait = make_rect(corridor_entries, 400, 210, 180, 130, 255, 255, 255, 1);

    for (let i = 0; i < 4; i = i + 1) {
        const board = make_rect(corridor_entries, 632, 190 + i * 34, 175, 15, 98, 73, 50, 255);
        update_scale(board, [1, 1]);
    }
    corridor_boards = make_rect(corridor_entries, 632, 238, 190, 180, 255, 255, 255, 1);

    make_triangle(corridor_entries, 690, 460, 165, 115, 70, 59, 52, 255);
    make_triangle(corridor_entries, 690, 490, 135, 90, 43, 38, 38, 255);
    corridor_stairs_button = make_button(corridor_entries, 625, 510, 250, 52, "DESCEND TO GRAND HALL");

    const messages = [
        "The manor is silent. Most rooms are sealed or blocked.",
        "Locked. Vale never intended his prisoner to explore this wing.",
        "The eastern corridor has been deliberately boarded shut.",
        "Vale in his university days. Another figure has been cut away."
    ];
    for (let i = 0; i < 4; i = i + 1) {
        corridor_messages[i] = make_text(corridor_entries, WIDTH / 2, 375, messages[i], 0.52,
                                         227, 217, 200, i === 0 ? 255 : 0);
    }
    draw_footer(corridor_entries, "Inspect the inaccessible areas, or follow the staircase down.");
    return undefined;
}

function update_corridor(clicked) {
    for (let i = 0; i < 4; i = i + 1) {
        paint(corridor_messages[i], 227, 217, 200, i === corridor_message ? 255 : 0);
    }
    if (clicked && pointer_over_gameobject(corridor_locked_door)) {
        corridor_message = 1;
    } else if (clicked && pointer_over_gameobject(corridor_boards)) {
        corridor_message = 2;
    } else if (clicked && pointer_over_gameobject(corridor_portrait)) {
        corridor_message = 3;
    }
    button_hover(corridor_stairs_button, true);
    if (button_clicked(corridor_stairs_button, clicked, true)) {
        change_scene("hall");
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Scene 3: Grand hall
// ---------------------------------------------------------------------------

let hall_study_button = null;
let hall_library_button = null;
let hall_statue_button = null;
let hall_lab_button = null;
let hall_photo_button = null;
let hall_exit_button = null;
let hall_messages = [];
let hall_message = 0;
let hall_statue_markers = [];

function build_hall_scene() {
    make_rect(hall_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 35, 30, 31, 255);
    make_scene_art(hall_entries, "grand_hall_flat_v2.png", 255);
    draw_header(hall_entries, "GRAND HALL", "THE CENTRE OF VALE MANOR");
    make_rect(hall_entries, WIDTH / 2, 430, WIDTH, 260, 54, 43, 39, 255);
    make_rect(hall_entries, WIDTH / 2, 330, 260, 230, 44, 36, 38, 255);
    make_triangle(hall_entries, WIDTH / 2, 190, 310, 130, 49, 39, 40, 255);

    // Study and library doors.
    make_rect(hall_entries, 105, 280, 145, 290, 60, 39, 30, 255);
    make_rect(hall_entries, 695, 280, 145, 290, 60, 39, 30, 255);
    hall_study_button = make_button(hall_entries, 105, 455, 180, 50, "VALE'S STUDY");
    hall_library_button = make_button(hall_entries, 695, 455, 180, 50, "LIBRARY 11:45");

    // Photograph.
    make_rect(hall_entries, 400, 160, 230, 110, 108, 82, 52, 255);
    make_rect(hall_entries, 400, 160, 205, 88, 171, 157, 129, 255);
    make_circle(hall_entries, 360, 148, 18, 48, 44, 43, 255);
    make_rect(hall_entries, 360, 180, 38, 48, 48, 44, 43, 255);
    make_circle(hall_entries, 440, 148, 18, 54, 51, 50, 255);
    make_rect(hall_entries, 440, 180, 38, 48, 54, 51, 50, 255);
    hall_photo_button = make_button(hall_entries, 400, 230, 220, 43, "EXAMINE PHOTOGRAPH");

    // Four pedestals.
    for (let i = 0; i < 4; i = i + 1) {
        const x = 265 + i * 90;
        make_rect(hall_entries, x, 415, 62, 92, 92, 82, 70, 255);
        make_rect(hall_entries, x, 365, 74, 18, 122, 106, 83, 255);
        hall_statue_markers[i] = make_circle(hall_entries, x, 350, 10, 225, 194, 111, 0);
    }
    hall_statue_button = make_button(hall_entries, WIDTH / 2, 505, 250, 50, "STATUE PEDESTALS");
    hall_lab_button = make_button(hall_entries, WIDTH / 2, 300, 245, 50, "UNDERGROUND PASSAGE");
    hall_exit_button = make_button(hall_entries, WIDTH / 2, 555, 190, 42, "MAIN ENTRANCE");

    const messages = [
        "Four empty pedestals face a sealed underground entrance.",
        "A younger Vale stands beside a familiar man whose face is obscured.",
        "The main entrance is locked. A heavy brass key should open it.",
        "The statue mechanism is incomplete.",
        "The underground passage is now open.",
        "Both investigation rooms are complete. Arrange the statues."
    ];
    for (let i = 0; i < array_length(messages); i = i + 1) {
        hall_messages[i] = make_text(hall_entries, WIDTH / 2, 88, messages[i], 0.48,
                                     226, 216, 197, i === 0 ? 255 : 0);
    }
    return undefined;
}

function refresh_hall() {
    for (let i = 0; i < array_length(hall_messages); i = i + 1) {
        paint(hall_messages[i], 226, 216, 197, i === hall_message ? 255 : 0);
    }
    for (let i = 0; i < 4; i = i + 1) {
        paint(hall_statue_markers[i], 225, 194, 111, statues_owned[i] ? 255 : 0);
    }
    return undefined;
}

function update_hall(clicked) {
    refresh_hall();
    button_hover(hall_study_button, true);
    button_hover(hall_library_button, study_done);
    button_hover(hall_photo_button, true);
    button_hover(hall_statue_button, study_done && library_done);
    button_hover(hall_lab_button, lab_unlocked);
    button_hover(hall_exit_button, true);

    if (button_clicked(hall_study_button, clicked, true)) {
        room_stub_mode = 0;
        change_scene("room_stub");
    } else if (button_clicked(hall_library_button, clicked, study_done)) {
        room_stub_mode = 1;
        change_scene("room_stub");
    } else if (button_clicked(hall_photo_button, clicked, true)) {
        photo_examined = true;
        hall_message = 1;
    } else if (button_clicked(hall_statue_button, clicked, study_done && library_done)) {
        change_scene("statues");
    } else if (button_clicked(hall_lab_button, clicked, lab_unlocked)) {
        change_scene("lab");
    } else if (button_clicked(hall_exit_button, clicked, true)) {
        hall_message = 2;
    } else if (button_clicked(hall_statue_button, clicked, true)) {
        hall_message = 3;
    }
    return undefined;
}

// Room integration hooks. Existing Room 1 and Room 2 modules should call these.
function finish_study_module() {
    study_done = true;
    statues_owned[0] = true; // Owl
    statues_owned[3] = true; // Hound
    hall_message = 0;
    change_scene("hall");
    return undefined;
}

function finish_library_module() {
    library_done = true;
    statues_owned[1] = true; // Stag
    statues_owned[2] = true; // Serpent
    hall_message = 5;
    change_scene("hall");
    return undefined;
}

// Development placeholders for the two separately implemented room modules.
let room_stub_titles = [];
let room_stub_descriptions = [];
let room_stub_complete_button = null;
let room_stub_return_button = null;
let room_study_art = null;
let room_library_art = null;

function build_room_stub_scene() {
    make_rect(room_stub_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 17, 15, 20, 255);
    room_study_art = make_scene_art(room_stub_entries, "vale_study_room1.png", 255);
    room_library_art = make_scene_art(room_stub_entries, "blackwood_library_room2.png", 0);
    make_rect(room_stub_entries, WIDTH / 2, HEIGHT / 2, 610, 390, 37, 30, 33, 220);
    room_stub_titles[0] = make_text(room_stub_entries, WIDTH / 2, 150,
                                    "VALE'S STUDY - ROOM 1 INTEGRATION", 1.0, 238, 204, 126, 255);
    room_stub_titles[1] = make_text(room_stub_entries, WIDTH / 2, 150,
                                    "THE LIBRARY AT 11:45 - ROOM 2 INTEGRATION", 1.0, 238, 204, 126, 0);
    room_stub_descriptions[0] = make_text(room_stub_entries, WIDTH / 2, 235,
        "Existing module: CASE, MOON, bookshelf order, chest code 134.", 0.6, 222, 215, 199, 255);
    room_stub_descriptions[1] = make_text(room_stub_entries, WIDTH / 2, 235,
        "Existing module: stopped clock, 1145 archive code, Vale's false alibi.", 0.6, 222, 215, 199, 0);
    make_text(room_stub_entries, WIDTH / 2, 300,
        "This page is a merge point, not a replacement for the finished room code.", 0.55, 186, 178, 169, 255);
    room_stub_complete_button = make_button(room_stub_entries, WIDTH / 2, 390, 320, 58, "SIMULATE MODULE COMPLETION");
    room_stub_return_button = make_button(room_stub_entries, WIDTH / 2, 470, 190, 50, "RETURN TO HALL");
    return undefined;
}

function update_room_stub(clicked) {
    if (SCENE_ART_ENABLED) {
        paint(room_study_art, 255, 255, 255, room_stub_mode === 0 ? 255 : 0);
        paint(room_library_art, 255, 255, 255, room_stub_mode === 1 ? 255 : 0);
    }
    for (let i = 0; i < 2; i = i + 1) {
        const alpha = i === room_stub_mode ? 255 : 0;
        paint(room_stub_titles[i], 238, 204, 126, alpha);
        paint(room_stub_descriptions[i], 222, 215, 199, alpha);
    }
    const already_done = room_stub_mode === 0 ? study_done : library_done;
    button_hover(room_stub_complete_button, !already_done);
    button_hover(room_stub_return_button, true);
    if (button_clicked(room_stub_complete_button, clicked, !already_done)) {
        if (room_stub_mode === 0) {
            finish_study_module();
        } else {
            finish_library_module();
        }
    } else if (button_clicked(room_stub_return_button, clicked, true)) {
        change_scene("hall");
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Returning to the hall: four-statue mechanism
// ---------------------------------------------------------------------------

const STATUE_NAMES = ["OWL", "STAG", "SERPENT", "HOUND"];
const CORRECT_STATUE_ORDER = [0, 1, 2, 3];
let statue_choice_buttons = [];
let statue_slot_buttons = [];
let statue_slot_labels = [];
let statue_photo_hint = [];
let statue_messages = [];
let statue_message = 0;
let statue_password_digits = [];
let statue_lab_button = null;
let statue_hall_button = null;

function build_statue_scene() {
    make_rect(statue_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 27, 23, 27, 255);
    make_scene_art(statue_entries, "grand_hall_flat_v2.png", 135);
    draw_header(statue_entries, "THE FOUR STATUES", "PLACE EVERY STATUE TO OPEN THE UNDERGROUND PASSAGE");

    make_rect(statue_entries, WIDTH / 2, 142, 680, 110, 15, 14, 19, 255);
    make_text(statue_entries, WIDTH / 2, 95, "SELECT A STATUE", 0.85, 232, 204, 129, 255);
    for (let i = 0; i < 4; i = i + 1) {
        statue_choice_buttons[i] = make_button(statue_entries, 175 + i * 155, 145, 135, 48, STATUE_NAMES[i]);
    }

    make_text(statue_entries, WIDTH / 2, 225, "PEDESTALS - LEFT TO RIGHT", 0.65, 226, 211, 180, 255);
    for (let slot = 0; slot < 4; slot = slot + 1) {
        const x = 160 + slot * 160;
        make_rect(statue_entries, x, 345, 112, 155, 83, 73, 67, 255);
        make_rect(statue_entries, x, 265, 130, 20, 117, 100, 82, 255);
        statue_slot_buttons[slot] = make_button(statue_entries, x, 430, 130, 44, "PLACE HERE");
        statue_slot_labels[slot] = [];
        for (let statue = 0; statue < 4; statue = statue + 1) {
            statue_slot_labels[slot][statue] = make_text(statue_entries, x, 330,
                STATUE_NAMES[statue], 0.63, 240, 211, 126, 0);
        }
    }

    make_text(statue_entries, WIDTH / 2, 485, "PHOTOGRAPH BACKGROUND", 0.49, 174, 166, 157, 255);
    for (let i = 0; i < 4; i = i + 1) {
        statue_photo_hint[i] = make_text(statue_entries, 250 + i * 100, 510,
            STATUE_NAMES[i], 0.48, 142, 204, 195, 0);
    }

    const messages = [
        "Select a statue, then choose a pedestal.",
        "All four weights engage. The underground passage opens.",
        "The photograph's exact arrangement triggers a second mechanism.",
        "A statue opens its mouth and releases a password slip."
    ];
    for (let i = 0; i < 4; i = i + 1) {
        statue_messages[i] = make_text(statue_entries, WIDTH / 2, 465, messages[i], 0.85,
                                       228, 217, 199, i === 0 ? 255 : 0);
    }

    statue_password_digits = [];
    for (let pos = 0; pos < 4; pos = pos + 1) {
        statue_password_digits[pos] = [];
        for (let digit = 0; digit < 10; digit = digit + 1) {
            statue_password_digits[pos][digit] = make_text(statue_entries, 340 + pos * 40, 530,
                stringify(digit), 0.85, 255, 225, 125, 0);
        }
    }

    statue_hall_button = make_button(statue_entries, 115, 100, 180, 42, "RETURN TO HALL");
    statue_lab_button = make_button(statue_entries, 680, 100, 190, 42, "ENTER LAB");
    return undefined;
}

function statue_is_placed(statue) {
    let found = false;
    for (let i = 0; i < 4; i = i + 1) {
        if (statue_positions[i] === statue) {
            found = true;
        }
    }
    return found;
}

function all_statues_placed() {
    let complete = true;
    for (let i = 0; i < 4; i = i + 1) {
        if (statue_positions[i] < 0) {
            complete = false;
        }
    }
    return complete;
}

function exact_statue_order() {
    let correct = true;
    for (let i = 0; i < 4; i = i + 1) {
        if (statue_positions[i] !== CORRECT_STATUE_ORDER[i]) {
            correct = false;
        }
    }
    return correct;
}

function place_selected_statue(slot) {
    if (selected_statue >= 0) {
        for (let i = 0; i < 4; i = i + 1) {
            if (statue_positions[i] === selected_statue) {
                statue_positions[i] = -1;
            }
        }
        statue_positions[slot] = selected_statue;
        selected_statue = -1;

        if (all_statues_placed()) {
            lab_unlocked = true;
            statue_message = 1;
            if (photo_examined && exact_statue_order()) {
                hidden_password_found = true;
                statue_message = 3;
            } else if (photo_examined) {
                statue_message = 2;
            }
        } else {
            statue_message = 0;
        }
    }
    return undefined;
}

function refresh_statues() {
    for (let i = 0; i < 4; i = i + 1) {
        const selected = selected_statue === i;
        const placed = statue_is_placed(i);
        if (selected) {
            paint(statue_choice_buttons[i][0], 48, 105, 115, 255);
        } else if (placed) {
            paint(statue_choice_buttons[i][0], 52, 74, 61, 255);
        }
        paint(statue_photo_hint[i], 142, 204, 195, photo_examined ? 255 : 0);
    }

    for (let slot = 0; slot < 4; slot = slot + 1) {
        for (let statue = 0; statue < 4; statue = statue + 1) {
            paint(statue_slot_labels[slot][statue], 240, 211, 126,
                  statue_positions[slot] === statue ? 255 : 0);
        }
    }
    for (let i = 0; i < 4; i = i + 1) {
        paint(statue_messages[i], 228, 217, 199, i === statue_message ? 255 : 0);
    }
    for (let pos = 0; pos < 4; pos = pos + 1) {
        for (let digit = 0; digit < 10; digit = digit + 1) {
            paint(statue_password_digits[pos][digit], 255, 225, 125,
                  hidden_password_found && hidden_password[pos] === digit ? 255 : 0);
        }
    }
    return undefined;
}

function update_statues(clicked) {
    refresh_statues();
    for (let i = 0; i < 4; i = i + 1) {
        button_hover(statue_choice_buttons[i], statues_owned[i]);
        if (button_clicked(statue_choice_buttons[i], clicked, statues_owned[i])) {
            selected_statue = i;
        }
    }
    for (let slot = 0; slot < 4; slot = slot + 1) {
        button_hover(statue_slot_buttons[slot], selected_statue >= 0);
        if (button_clicked(statue_slot_buttons[slot], clicked, selected_statue >= 0)) {
            place_selected_statue(slot);
        }
    }
    button_hover(statue_hall_button, true);
    button_hover(statue_lab_button, lab_unlocked);
    if (button_clicked(statue_hall_button, clicked, true)) {
        hall_message = lab_unlocked ? 4 : 0;
        change_scene("hall");
    } else if (button_clicked(statue_lab_button, clicked, lab_unlocked)) {
        change_scene("lab");
    }
    if (current_scene === "statues") {
        refresh_statues();
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Scene 6: Underground laboratory
// ---------------------------------------------------------------------------

let lab_evidence_buttons = [];
let lab_evidence_marks = [];
let lab_status_lines = [];
let lab_deduction_button = null;
let lab_safe_button = null;
let lab_hall_button = null;
let lab_confront_button = null;
let lab_locked_safe_message = null;

function build_lab_scene() {
    make_rect(lab_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 10, 20, 23, 255);
    make_scene_art(lab_entries, "mnemosyne_laboratory.png", 255);
    draw_header(lab_entries, "UNDERGROUND LABORATORY", "PROJECT MNEMOSYNE - AUTHORIZED PERSONNEL ONLY");

    make_rect(lab_entries, 155, 300, 250, 390, 25, 42, 44, 255);
    make_circle(lab_entries, 155, 235, 73, 92, 147, 151, 80);
    make_circle(lab_entries, 155, 235, 49, 17, 31, 34, 255);
    make_rect(lab_entries, 155, 350, 155, 85, 31, 67, 69, 255);
    for (let i = 0; i < 4; i = i + 1) {
        make_circle(lab_entries, 105 + i * 34, 355, 8, 98 + i * 24, 181 - i * 22, 151, 255);
    }

    make_rect(lab_entries, 525, 295, 475, 395, 20, 22, 28, 250);
    make_text(lab_entries, 525, 105, "RECOVER THE RECORDS VALE COULD NOT BURN", 0.67, 236, 202, 125, 255);
    const labels = [
        "EXPERIMENT LOGS",
        "SUBJECT DEATH REPORT",
        "ALTERED POLICE RECORDS",
        "REQUEST TO REMOVE A BODY"
    ];
    for (let i = 0; i < 4; i = i + 1) {
        lab_evidence_buttons[i] = make_button(lab_entries, 525, 160 + i * 66, 390, 49, labels[i]);
        lab_evidence_marks[i] = make_text(lab_entries, 705, 160 + i * 66, "FOUND", 0.4, 121, 227, 163, 0);
    }

    const status = [
        "Four critical records remain in the laboratory.",
        "1 / 4 records recovered",
        "2 / 4 records recovered",
        "3 / 4 records recovered",
        "Evidence set complete - reconstruct Blackwood's death."
    ];
    for (let i = 0; i < 5; i = i + 1) {
        lab_status_lines[i] = make_text(lab_entries, 525, 435, status[i], 0.48,
                                        221, 215, 199, i === 0 ? 255 : 0);
    }
    lab_deduction_button = make_button(lab_entries, 525, 485, 300, 50, "ENTER MEMORY PALACE");
    lab_safe_button = make_button(lab_entries, 675, 545, 190, 44, "LOCKED SAFE");
    lab_hall_button = make_button(lab_entries, 120, 545, 170, 44, "RETURN TO HALL");
    lab_confront_button = make_button(lab_entries, 390, 545, 235, 44, "LEAVE WITH EVIDENCE");
    lab_locked_safe_message = make_text(lab_entries, 525, 515,
        "The safe requires a four-digit password.", 0.43, 217, 111, 91, 0);
    return undefined;
}

function refresh_lab() {
    for (let i = 0; i < 4; i = i + 1) {
        if (lab_found[i]) {
            paint(lab_evidence_buttons[i][0], 43, 82, 68, 255);
            paint(lab_evidence_marks[i], 121, 227, 163, 255);
        }
    }
    for (let i = 0; i < 5; i = i + 1) {
        paint(lab_status_lines[i], 221, 215, 199, i === lab_found_count ? 255 : 0);
    }
    return undefined;
}

function update_lab(clicked) {
    refresh_lab();
    for (let i = 0; i < 4; i = i + 1) {
        if (!lab_found[i]) {
            button_hover(lab_evidence_buttons[i], true);
            if (button_clicked(lab_evidence_buttons[i], clicked, true)) {
                lab_found[i] = true;
                lab_found_count = lab_found_count + 1;
            }
        }
    }
    const deduction_available = lab_found_count === 4
        && (!normal_case_complete || (conspiracy_evidence && !commissioner_identified));
    const can_leave_with_evidence = lab_found_count === 4;
    button_hover(lab_deduction_button, deduction_available);
    button_hover(lab_safe_button, hidden_password_found);
    button_hover(lab_hall_button, true);
    button_hover(lab_confront_button, can_leave_with_evidence);

    if (button_clicked(lab_deduction_button, clicked, deduction_available)) {
        change_scene("deduction");
    } else if (button_clicked(lab_safe_button, clicked, hidden_password_found)) {
        change_scene("safe");
    } else if (button_clicked(lab_safe_button, clicked, true) && !hidden_password_found) {
        paint(lab_locked_safe_message, 217, 111, 91, 255);
    } else if (button_clicked(lab_hall_button, clicked, true)) {
        change_scene("hall");
    } else if (button_clicked(lab_confront_button, clicked, can_leave_with_evidence)) {
        change_scene("confrontation");
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Laboratory Memory Palace deductions
// ---------------------------------------------------------------------------

let deduction_stage_titles = [];
let deduction_evidence_lines = [];
let deduction_option_buttons = [];
let deduction_submit_button = null;
let deduction_wrong_text = null;
let deduction_complete_text = null;
let deduction_conspiracy_text = null;
let deduction_return_button = null;

function build_deduction_scene() {
    make_rect(deduction_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 6, 13, 27, 255);
    make_scene_art(deduction_entries, "memory_palace.png", 175);
    draw_header(deduction_entries, "MEMORY PALACE", "RECONSTRUCT BLACKWOOD'S DEATH AND THE COVER-UP");

    deduction_stage_titles[0] = make_text(deduction_entries, WIDTH / 2, 105,
        "DEDUCTION 1: WHAT HAPPENED TO BLACKWOOD?", 0.78, 235, 204, 129, 255);
    deduction_stage_titles[1] = make_text(deduction_entries, WIDTH / 2, 105,
        "DEDUCTION 2: HOW WAS THE DEATH CONCEALED?", 0.78, 235, 204, 129, 0);
    deduction_stage_titles[2] = make_text(deduction_entries, WIDTH / 2, 105,
        "FINAL DEDUCTION: WHO CREATED PROJECT MNEMOSYNE?", 0.75, 235, 204, 129, 0);
    deduction_stage_titles[3] = make_text(deduction_entries, WIDTH / 2, 105,
        "RECONSTRUCTION COMPLETE", 0.9, 121, 227, 163, 0);

    deduction_evidence_lines[0] = make_text(deduction_entries, WIDTH / 2, 160,
        "11:45 confrontation + experiment log + matching death date", 0.58, 185, 210, 228, 255);
    deduction_evidence_lines[1] = make_text(deduction_entries, WIDTH / 2, 160,
        "Altered police file + body-removal request + unnamed senior official", 0.58, 185, 210, 228, 0);
    deduction_evidence_lines[2] = make_text(deduction_entries, WIDTH / 2, 160,
        "Old photograph + safe correspondence + the Commissioner's identity", 0.58, 185, 210, 228, 0);

    const labels = [
        ["Blackwood left the manor safely.", "Blackwood died during Vale's experiment.", "Blackwood destroyed the laboratory."],
        ["Vale reported the death immediately.", "The death was unrelated to the police.", "A senior police official helped stage an accident."],
        ["Blackwood created the project.", "The Commissioner created and protected the project.", "The institutions acted independently."]
    ];
    deduction_option_buttons[0] = [];
    deduction_option_buttons[1] = [];
    deduction_option_buttons[2] = [];
    for (let stage = 0; stage < 3; stage = stage + 1) {
        for (let i = 0; i < 3; i = i + 1) {
            deduction_option_buttons[stage][i] = make_button(deduction_entries, WIDTH / 2,
                235 + i * 66, 520, 50, labels[stage][i]);
            if (stage > 0) {
                paint(deduction_option_buttons[stage][i][0], 62, 48, 42, 0);
                paint(deduction_option_buttons[stage][i][1], 240, 222, 178, 0);
            }
        }
    }
    deduction_submit_button = make_button(deduction_entries, WIDTH / 2, 455, 230, 50, "CONFIRM DEDUCTION");
    deduction_wrong_text = make_text(deduction_entries, WIDTH / 2, 505,
        "That conclusion is not supported by the evidence.", 0.48, 229, 104, 91, 0);
    deduction_complete_text = make_text(deduction_entries, WIDTH / 2, 265,
        "BLACKWOOD DIED IN VALE'S EXPERIMENT. SOMEONE INSIDE THE POLICE HELPED VALE.",
        0.66, 233, 222, 188, 0);
    deduction_conspiracy_text = make_text(deduction_entries, WIDTH / 2, 315,
        "THE POLICE COMMISSIONER CREATED AND PROTECTED PROJECT MNEMOSYNE.",
        0.68, 133, 225, 170, 0);
    deduction_return_button = make_button(deduction_entries, WIDTH / 2, 400, 250, 54, "RETURN TO LABORATORY");
    paint(deduction_return_button[0], 62, 48, 42, 0);
    paint(deduction_return_button[1], 240, 222, 178, 0);
    draw_footer(deduction_entries, "Every completed deduction becomes evidence for the final case.");
    return undefined;
}

function deduction_display_stage() {
    return deduction_stage < 2
        ? deduction_stage
        : conspiracy_evidence && !commissioner_identified
        ? 2
        : 3;
}

function refresh_deduction() {
    const display = deduction_display_stage();
    for (let stage = 0; stage < 4; stage = stage + 1) {
        paint(deduction_stage_titles[stage], stage === 3 ? 121 : 235,
              stage === 3 ? 227 : 204, stage === 3 ? 163 : 129,
              display === stage ? 255 : 0);
    }
    for (let stage = 0; stage < 3; stage = stage + 1) {
        paint(deduction_evidence_lines[stage], 185, 210, 228,
              display === stage ? 255 : 0);
        for (let i = 0; i < 3; i = i + 1) {
            const visible = display === stage;
            paint(deduction_option_buttons[stage][i][0], 62, 48, 42, visible ? 255 : 0);
            paint(deduction_option_buttons[stage][i][1], 240, 222, 178, visible ? 255 : 0);
            if (visible && deduction_choice === i) {
                paint(deduction_option_buttons[stage][i][0], 48, 101, 116, 255);
            }
        }
    }
    const complete = display === 3;
    paint(deduction_submit_button[0], 62, 48, 42, complete ? 0 : 255);
    paint(deduction_submit_button[1], 240, 222, 178, complete ? 0 : 255);
    paint(deduction_complete_text, 233, 222, 188, complete && normal_case_complete ? 255 : 0);
    paint(deduction_conspiracy_text, 133, 225, 170, complete && commissioner_identified ? 255 : 0);
    paint(deduction_return_button[0], 62, 48, 42, complete ? 255 : 0);
    paint(deduction_return_button[1], 240, 222, 178, complete ? 255 : 0);
    return undefined;
}

function update_deduction(clicked) {
    refresh_deduction();
    const display = deduction_display_stage();
    if (display < 3) {
        for (let i = 0; i < 3; i = i + 1) {
            button_hover(deduction_option_buttons[display][i], true);
            if (button_clicked(deduction_option_buttons[display][i], clicked, true)) {
                deduction_choice = i;
            }
        }
        button_hover(deduction_submit_button, deduction_choice >= 0);
        if (button_clicked(deduction_submit_button, clicked, deduction_choice >= 0)) {
            const correct = display === 0 ? deduction_choice === 1
                          : display === 1 ? deduction_choice === 2
                          : deduction_choice === 1;
            if (correct) {
                if (display < 2) {
                    deduction_stage = deduction_stage + 1;
                } else {
                    commissioner_identified = true;
                }
                deduction_choice = -1;
                paint(deduction_wrong_text, 229, 104, 91, 0);
                if (deduction_stage === 2) {
                    normal_case_complete = true;
                }
            } else {
                paint(deduction_wrong_text, 229, 104, 91, 255);
            }
        }
    } else {
        button_hover(deduction_return_button, true);
        if (button_clicked(deduction_return_button, clicked, true)) {
            change_scene("lab");
        }
    }
    if (current_scene === "deduction") {
        refresh_deduction();
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Hidden laboratory safe
// ---------------------------------------------------------------------------

let safe_digit_buttons = [];
let safe_input_dots = [];
let safe_status_lines = [];
let safe_clear_button = null;
let safe_enter_button = null;
let safe_return_button = null;
let safe_evidence_lines = [];

function build_safe_scene() {
    make_rect(safe_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 12, 17, 21, 255);
    make_scene_art(safe_entries, "mnemosyne_laboratory.png", 150);
    draw_header(safe_entries, "LABORATORY SAFE", "ENTER THE PASSWORD RELEASED BY THE STATUE MECHANISM");
    make_rect(safe_entries, WIDTH / 2, 310, 520, 430, 49, 55, 61, 255);
    make_rect(safe_entries, WIDTH / 2, 310, 475, 385, 24, 28, 34, 255);

    for (let i = 0; i < 4; i = i + 1) {
        safe_input_dots[i] = make_circle(safe_entries, 340 + i * 40, 135, 9, 215, 193, 133, 70);
    }

    for (let digit = 0; digit < 10; digit = digit + 1) {
        const row = math_floor(digit / 3);
        const col = digit % 3;
        const x = digit === 9 ? WIDTH / 2 : 325 + col * 75;
        const y = digit === 9 ? 420 : 215 + row * 68;
        safe_digit_buttons[digit] = make_button(safe_entries, x, y, 62, 50, stringify(digit));
    }
    safe_clear_button = make_button(safe_entries, 285, 480, 145, 48, "CLEAR");
    safe_enter_button = make_button(safe_entries, 515, 480, 145, 48, "ENTER");
    safe_return_button = make_button(safe_entries, WIDTH / 2, 540, 210, 45, "RETURN TO LAB");

    const status = [
        "Enter the four digits from the password slip.",
        "ACCESS DENIED - the code is incorrect.",
        "ACCESS GRANTED - hidden evidence recovered."
    ];
    for (let i = 0; i < 3; i = i + 1) {
        safe_status_lines[i] = make_text(safe_entries, WIDTH / 2, 175, status[i], 0.52,
                                         i === 1 ? 229 : 205,
                                         i === 1 ? 103 : 221,
                                         i === 1 ? 92 : 178,
                                         i === 0 ? 255 : 0);
    }

    const evidence = [
        "Vale / Commissioner correspondence",
        "Human-subject authorizations and payments",
        "Order to stop Blackwood's investigation",
        "Instruction to kidnap the detective"
    ];
    for (let i = 0; i < 4; i = i + 1) {
        safe_evidence_lines[i] = make_text(safe_entries, WIDTH / 2, 245 + i * 42,
                                           evidence[i], 0.57, 133, 225, 170, 0);
    }
    return undefined;
}

function safe_input_matches_password() {
    let matches = array_length(safe_input) === 4;
    if (matches) {
        for (let i = 0; i < 4; i = i + 1) {
            if (safe_input[i] !== hidden_password[i]) {
                matches = false;
            }
        }
    }
    return matches;
}

function refresh_safe() {
    const open = conspiracy_evidence;
    for (let i = 0; i < 4; i = i + 1) {
        paint(safe_input_dots[i], 215, 193, 133, i < array_length(safe_input) && !open ? 255 : 70);
        paint(safe_evidence_lines[i], 133, 225, 170, open ? 255 : 0);
    }
    for (let i = 0; i < 3; i = i + 1) {
        paint(safe_status_lines[i], i === 1 ? 229 : 205,
              i === 1 ? 103 : 221, i === 1 ? 92 : 178,
              safe_message === i ? 255 : 0);
    }
    for (let digit = 0; digit < 10; digit = digit + 1) {
        const alpha = open ? 0 : 255;
        paint(safe_digit_buttons[digit][0], 62, 48, 42, alpha);
        paint(safe_digit_buttons[digit][1], 240, 222, 178, alpha);
    }
    paint(safe_clear_button[0], 62, 48, 42, open ? 0 : 255);
    paint(safe_clear_button[1], 240, 222, 178, open ? 0 : 255);
    paint(safe_enter_button[0], 62, 48, 42, open ? 0 : 255);
    paint(safe_enter_button[1], 240, 222, 178, open ? 0 : 255);
    return undefined;
}

function update_safe(clicked) {
    refresh_safe();
    if (!conspiracy_evidence) {
        for (let digit = 0; digit < 10; digit = digit + 1) {
            button_hover(safe_digit_buttons[digit], array_length(safe_input) < 4);
            if (button_clicked(safe_digit_buttons[digit], clicked, array_length(safe_input) < 4)) {
                safe_input[array_length(safe_input)] = digit;
                safe_message = 0;
            }
        }
        button_hover(safe_clear_button, array_length(safe_input) > 0);
        button_hover(safe_enter_button, array_length(safe_input) === 4);
        if (button_clicked(safe_clear_button, clicked, array_length(safe_input) > 0)) {
            safe_input = [];
            safe_message = 0;
        } else if (button_clicked(safe_enter_button, clicked, array_length(safe_input) === 4)) {
            if (safe_input_matches_password()) {
                conspiracy_evidence = true;
                safe_message = 2;
            } else {
                safe_input = [];
                safe_message = 1;
            }
        }
    }
    button_hover(safe_return_button, true);
    if (button_clicked(safe_return_button, clicked, true)) {
        change_scene("lab");
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Final confrontation
// ---------------------------------------------------------------------------

let confrontation_lines = [];
let confrontation_speakers = [];
let confrontation_next_button = null;
let confrontation_evidence_lines = [];

function build_confrontation_scene() {
    make_rect(confrontation_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 8, 11, 13, 255);
    make_scene_art(confrontation_entries, "mnemosyne_laboratory.png", 255);
    make_rect(confrontation_entries, WIDTH / 2, 260, WIDTH, 400, 17, 30, 31, 150);

    // Vale silhouette and laboratory glow.
    make_circle(confrontation_entries, 585, 180, 46, 33, 33, 37, 255);
    make_rect(confrontation_entries, 585, 340, 145, 285, 33, 33, 37, 255);
    make_triangle(confrontation_entries, 510, 290, 95, 240, 33, 33, 37, 255);
    make_circle(confrontation_entries, 170, 285, 130, 97, 170, 165, 40);
    make_text(confrontation_entries, 585, 85, "DR. ADRIAN VALE", 0.65, 229, 196, 122, 255);

    make_rect(confrontation_entries, WIDTH / 2, 475, 700, 175, 14, 13, 17, 248);
    const speakers = ["VALE", "VALE", "DETECTIVE", "VALE", "DETECTIVE"];
    const lines = [
        "You found Blackwood's little trail. He was always too sentimental.",
        "Memory changes naturally. I merely give that process direction.",
        "You replaced truth with whatever protected you and your allies.",
        "Blackwood's death was an accident. Order always demands sacrifice.",
        "Then the evidence will remember what you tried to erase."
    ];
    for (let i = 0; i < 5; i = i + 1) {
        confrontation_speakers[i] = make_text(confrontation_entries, 135, 430,
                                              speakers[i], 0.68, 238, 203, 126, i === 0 ? 255 : 0);
        confrontation_lines[i] = make_text(confrontation_entries, WIDTH / 2, 485,
                                           lines[i], 0.61, 232, 224, 208, i === 0 ? 255 : 0);
    }
    confrontation_next_button = make_button(confrontation_entries, 650, 545, 190, 45, "CONTINUE");
    confrontation_evidence_lines[0] = make_text(confrontation_entries, 185, 545,
              "VALE'S CRIMES ARE PRESERVED", 0.45, 130, 218, 169, 255);
    confrontation_evidence_lines[1] = make_text(confrontation_entries, 185, 545,
              "THE COMPLETE CONSPIRACY IS UNDERSTOOD", 0.45, 130, 218, 169, 0);
    return undefined;
}

function update_confrontation(clicked) {
    for (let i = 0; i < 5; i = i + 1) {
        paint(confrontation_speakers[i], 238, 203, 126, i === confrontation_stage ? 255 : 0);
        paint(confrontation_lines[i], 232, 224, 208, i === confrontation_stage ? 255 : 0);
    }
    paint(confrontation_evidence_lines[0], 130, 218, 169, commissioner_identified ? 0 : 255);
    paint(confrontation_evidence_lines[1], 130, 218, 169, commissioner_identified ? 255 : 0);
    button_hover(confrontation_next_button, true);
    if (button_clicked(confrontation_next_button, clicked, true)) {
        if (confrontation_stage < 4) {
            confrontation_stage = confrontation_stage + 1;
        } else {
            fire_step = 0;
            fire_start_frame = get_loop_count();
            fire_penalty_frames = 0;
            fire_failed = false;
            change_scene("fire");
        }
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Fire escape sequence
// ---------------------------------------------------------------------------

let fire_bar = null;
let fire_step_titles = [];
let fire_choice_buttons = [];
let fire_wrong_text = null;
let fire_failed_text = null;
let fire_retry_button = null;

function build_fire_scene() {
    make_rect(fire_entries, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 65, 17, 12, 255);
    make_scene_art(fire_entries, "vale_manor_burning.png", 255);
    make_circle(fire_entries, 130, 180, 105, 244, 90, 25, 150);
    make_circle(fire_entries, 680, 235, 135, 234, 69, 22, 135);
    make_triangle(fire_entries, 390, 135, 260, 200, 246, 122, 36, 170);
    draw_header(fire_entries, "THE MANOR IS BURNING", "VALE HAS IGNITED THE UNDERGROUND LABORATORY");

    make_rect(fire_entries, WIDTH / 2, 105, 540, 28, 35, 25, 24, 255);
    fire_bar = make_rect(fire_entries, WIDTH / 2, 105, 520, 16, 220, 61, 37, 255);

    fire_step_titles[0] = make_text(fire_entries, WIDTH / 2, 180,
        "THE LABORATORY FIRE DOOR BLOCKS THE STAIRS.", 0.75, 255, 227, 176, 255);
    fire_step_titles[1] = make_text(fire_entries, WIDTH / 2, 180,
        "THE EVIDENCE CASE LIES BESIDE THE COLLAPSING DESK.", 0.75, 255, 227, 176, 0);
    fire_step_titles[2] = make_text(fire_entries, WIDTH / 2, 180,
        "THE GRAND HALL ENTRANCE IS STILL LOCKED.", 0.75, 255, 227, 176, 0);

    const labels = [
        ["PULL EMERGENCY RELEASE", "SEARCH THE LAB AGAIN", "WAIT FOR VALE"],
        ["TAKE THE EVIDENCE CASE", "LEAVE IT TO BURN", "CONFRONT VALE AGAIN"],
        ["USE THE BRASS MASTER KEY", "BREAK THE STAINED GLASS", "HIDE UNDER THE STAIRS"]
    ];
    fire_choice_buttons[0] = [];
    fire_choice_buttons[1] = [];
    fire_choice_buttons[2] = [];
    for (let step = 0; step < 3; step = step + 1) {
        for (let i = 0; i < 3; i = i + 1) {
            fire_choice_buttons[step][i] = make_button(fire_entries, WIDTH / 2,
                                                       270 + i * 78, 380, 57, labels[step][i]);
            if (step !== 0) {
                paint(fire_choice_buttons[step][i][0], 62, 48, 42, 0);
                paint(fire_choice_buttons[step][i][1], 240, 222, 178, 0);
            }
        }
    }
    fire_wrong_text = make_text(fire_entries, WIDTH / 2, 510,
        "That costs precious time. Choose the route that preserves the evidence.", 0.52, 255, 202, 138, 0);
    fire_failed_text = make_text(fire_entries, WIDTH / 2, 300,
        "SMOKE FILLS THE HALL. THE ESCAPE ROUTE IS LOST.", 0.85, 255, 223, 190, 0);
    fire_retry_button = make_button(fire_entries, WIDTH / 2, 405, 210, 55, "RETRY ESCAPE");
    paint(fire_retry_button[0], 62, 48, 42, 0);
    paint(fire_retry_button[1], 240, 222, 178, 0);
    draw_footer(fire_entries, "Act quickly. Wrong choices reduce the remaining time.");
    return undefined;
}

function refresh_fire(loop_count) {
    const elapsed = loop_count - fire_start_frame + fire_penalty_frames;
    const remaining = math_max(0, 1 - elapsed / (22 * FPS));
    update_scale(fire_bar, [remaining, 1]);
    paint(fire_bar, remaining < 0.3 ? 255 : 220, remaining < 0.3 ? 40 : 61, 37, fire_failed ? 0 : 255);

    if (remaining <= 0 && !fire_failed) {
        fire_failed = true;
    }
    for (let step = 0; step < 3; step = step + 1) {
        paint(fire_step_titles[step], 255, 227, 176,
              !fire_failed && fire_step === step ? 255 : 0);
        for (let i = 0; i < 3; i = i + 1) {
            const visible = !fire_failed && fire_step === step;
            paint(fire_choice_buttons[step][i][0], 62, 48, 42, visible ? 255 : 0);
            paint(fire_choice_buttons[step][i][1], 240, 222, 178, visible ? 255 : 0);
        }
    }
    paint(fire_failed_text, 255, 223, 190, fire_failed ? 255 : 0);
    paint(fire_retry_button[0], 62, 48, 42, fire_failed ? 255 : 0);
    paint(fire_retry_button[1], 240, 222, 178, fire_failed ? 255 : 0);
    return undefined;
}

function update_fire(clicked, loop_count) {
    refresh_fire(loop_count);
    if (fire_failed) {
        button_hover(fire_retry_button, true);
        if (button_clicked(fire_retry_button, clicked, true)) {
            fire_step = 0;
            fire_start_frame = loop_count;
            fire_penalty_frames = 0;
            fire_failed = false;
            paint(fire_wrong_text, 255, 202, 138, 0);
        }
    } else {
        const current_fire_step = fire_step;
        for (let i = 0; i < 3; i = i + 1) {
            button_hover(fire_choice_buttons[current_fire_step][i], true);
            if (button_clicked(fire_choice_buttons[current_fire_step][i], clicked, true)) {
                if (i === 0) {
                    fire_step = fire_step + 1;
                    paint(fire_wrong_text, 255, 202, 138, 0);
                    if (fire_step === 3) {
                        change_scene(commissioner_identified ? "ending_hidden" : "ending_normal");
                    }
                } else {
                    fire_penalty_frames = fire_penalty_frames + 4 * FPS;
                    paint(fire_wrong_text, 255, 202, 138, 255);
                }
            }
        }
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Endings
// ---------------------------------------------------------------------------

let normal_restart_button = null;
let hidden_restart_button = null;

function reset_story_state() {
    archive_found = [false, false, false, false];
    archive_count = 0;
    memory_choice = -1;
    archive_deduction_complete = false;
    kidnapping_stage = 0;

    attic_has_wire = false;
    attic_has_pliers = false;
    attic_has_hook = false;
    attic_selected_item = -1;
    attic_door_open = false;
    attic_message = 0;
    corridor_message = 0;

    study_done = false;
    library_done = false;
    room_stub_mode = 0;
    photo_examined = false;
    statues_owned = [false, false, false, false];
    statue_positions = [-1, -1, -1, -1];
    selected_statue = -1;
    lab_unlocked = false;
    hidden_password_found = false;

    lab_found = [false, false, false, false];
    lab_found_count = 0;
    deduction_stage = 0;
    deduction_choice = -1;
    normal_case_complete = false;
    safe_input = [];
    safe_message = 0;
    conspiracy_evidence = false;
    commissioner_identified = false;
    confrontation_stage = 0;

    fire_step = 0;
    fire_start_frame = -1;
    fire_penalty_frames = 0;
    fire_failed = false;
    return undefined;
}

function draw_burning_manor(list) {
    make_rect(list, WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 12, 10, 15, 255);
    make_circle(list, 180, 430, 150, 240, 71, 26, 120);
    make_circle(list, 620, 430, 170, 233, 89, 23, 120);
    make_rect(list, WIDTH / 2, 400, 480, 280, 43, 31, 31, 255);
    make_triangle(list, WIDTH / 2, 230, 560, 190, 52, 37, 36, 255);
    for (let i = 0; i < 7; i = i + 1) {
        make_triangle(list, 180 + i * 75, 460 - (i % 2) * 35, 52, 115,
                      245, 76 + (i % 3) * 22, 25, 210);
    }
    make_scene_art(list, "vale_manor_burning.png", 255);
    return undefined;
}

function build_normal_ending_scene() {
    draw_burning_manor(normal_ending_entries);
    make_rect(normal_ending_entries, WIDTH / 2, 155, 720, 230, 10, 10, 14, 238);
    make_text(normal_ending_entries, WIDTH / 2, 72, "NORMAL ENDING - THE MAN IN THE FIRE",
              1.05, 241, 204, 126, 255);
    make_text(normal_ending_entries, WIDTH / 2, 122,
              "Vale died in the fire. Blackwood's death was exposed and his case reopened.",
              0.58, 230, 222, 206, 255);
    make_text(normal_ending_entries, WIDTH / 2, 160,
              "But every official record pointing to a more powerful figure had disappeared.",
              0.58, 230, 222, 206, 255);
    make_text(normal_ending_entries, WIDTH / 2, 208,
              "Someone inside the police had already erased every record that pointed higher.",
              0.62, 224, 166, 138, 255);
    normal_restart_button = make_button(normal_ending_entries, WIDTH / 2, 545, 220, 48, "RETURN TO TITLE");
    return undefined;
}

function build_hidden_ending_scene() {
    draw_burning_manor(hidden_ending_entries);
    make_rect(hidden_ending_entries, WIDTH / 2, 165, 730, 250, 8, 13, 18, 242);
    make_text(hidden_ending_entries, WIDTH / 2, 67, "HIDDEN ENDING - THE MAN IN THE PHOTOGRAPH",
              1.0, 241, 204, 126, 255);
    make_text(hidden_ending_entries, WIDTH / 2, 115,
              "Copies reached journalists, prosecutors, and officers Blackwood trusted.",
              0.57, 224, 225, 214, 255);
    make_text(hidden_ending_entries, WIDTH / 2, 150,
              "The Police Commissioner created and protected Project Mnemosyne.",
              0.57, 224, 225, 214, 255);
    make_text(hidden_ending_entries, WIDTH / 2, 185,
              "He was arrested, prosecuted, and later found dead in custody.",
              0.57, 224, 225, 214, 255);
    make_text(hidden_ending_entries, WIDTH / 2, 225,
              "CAUSE OF DEATH: SUICIDE.", 0.72, 225, 151, 128, 255);
    make_text(hidden_ending_entries, WIDTH / 2, 265,
              "This time the truth had been preserved by too many people to erase.",
              0.62, 139, 219, 174, 255);
    hidden_restart_button = make_button(hidden_ending_entries, WIDTH / 2, 545, 220, 48, "RETURN TO TITLE");
    return undefined;
}

function update_ending(clicked, hidden) {
    const button = hidden ? hidden_restart_button : normal_restart_button;
    button_hover(button, true);
    if (button_clicked(button, clicked, true)) {
        reset_story_state();
        change_scene("title");
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Assemble scenes and run the game
// ---------------------------------------------------------------------------

build_title_scene();
build_archive_scene();
build_memory_scene();
build_kidnapping_scene();
build_attic_scene();
build_corridor_scene();
build_hall_scene();
build_room_stub_scene();
build_statue_scene();
build_lab_scene();
build_deduction_scene();
build_safe_scene();
build_confrontation_scene();
build_fire_scene();
build_normal_ending_scene();
build_hidden_ending_scene();

hide_scene(archive_entries);
hide_scene(memory_entries);
hide_scene(kidnapping_entries);
hide_scene(attic_entries);
hide_scene(corridor_entries);
hide_scene(hall_entries);
hide_scene(room_stub_entries);
hide_scene(statue_entries);
hide_scene(lab_entries);
hide_scene(deduction_entries);
hide_scene(safe_entries);
hide_scene(confrontation_entries);
hide_scene(fire_entries);
hide_scene(normal_ending_entries);
hide_scene(hidden_ending_entries);

let mouse_was_down = false;

update_loop(game_state => {
    const mouse_down = input_left_mouse_down();
    const clicked = mouse_down && !mouse_was_down;
    mouse_was_down = mouse_down;
    const loop_count = get_loop_count();

    if (current_scene === "title") {
        update_title(clicked);
    } else if (current_scene === "archives") {
        update_archives(clicked);
    } else if (current_scene === "memory") {
        update_memory(clicked);
    } else if (current_scene === "kidnapping") {
        update_kidnapping(clicked);
    } else if (current_scene === "attic") {
        update_attic(clicked);
    } else if (current_scene === "corridor") {
        update_corridor(clicked);
    } else if (current_scene === "hall") {
        update_hall(clicked);
    } else if (current_scene === "room_stub") {
        update_room_stub(clicked);
    } else if (current_scene === "statues") {
        update_statues(clicked);
    } else if (current_scene === "lab") {
        update_lab(clicked);
    } else if (current_scene === "deduction") {
        update_deduction(clicked);
    } else if (current_scene === "safe") {
        update_safe(clicked);
    } else if (current_scene === "confrontation") {
        update_confrontation(clicked);
    } else if (current_scene === "fire") {
        update_fire(clicked, loop_count);
    } else if (current_scene === "ending_normal") {
        update_ending(clicked, false);
    } else if (current_scene === "ending_hidden") {
        update_ending(clicked, true);
    }

    return game_state;
});

build_game();
