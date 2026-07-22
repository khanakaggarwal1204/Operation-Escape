import fs from "node:fs";
import vm from "node:vm";

const sourcePath = new URL("../src/operation_escape_story.js", import.meta.url);
const source = fs.readFileSync(sourcePath, "utf8").replace(
    /import\s*\{[\s\S]*?\}\s*from\s*"arcade_2d";\s*/,
    ""
);

function gameObject(kind, value) {
    return { kind, value, position: [0, 0], color: [255, 255, 255, 255], scale: [1, 1] };
}

const context = vm.createContext({
    array_length: value => value.length,
    stringify: value => String(value),
    math_floor: Math.floor,
    math_random: () => 0.314159,
    math_max: Math.max,
    create_rectangle: (w, h) => gameObject("rectangle", [w, h]),
    create_circle: radius => gameObject("circle", radius),
    create_triangle: (w, h) => gameObject("triangle", [w, h]),
    create_text: value => gameObject("text", value),
    create_sprite: value => gameObject("sprite", value),
    update_position: (obj, value) => { obj.position = value; },
    update_color: (obj, value) => { obj.color = value; },
    update_scale: (obj, value) => { obj.scale = value; },
    pointer_over_gameobject: () => false,
    input_left_mouse_down: () => false,
    set_dimensions: () => undefined,
    set_fps: () => undefined,
    get_loop_count: () => 0,
    update_loop: callback => { context.gameLoop = callback; },
    build_game: () => undefined,
    console
});

vm.runInContext(source, context, { filename: "operation_escape_story.js" });

function read(expression) {
    return vm.runInContext(expression, context);
}

function run(statement) {
    return vm.runInContext(statement, context);
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message);
    }
}

assert(read("current_scene") === "title", "Game should begin at the title scene.");

run("archive_count = 4; change_scene('archives');");
assert(read("archive_count") === 4, "Archive evidence state should be independent of deductions.");
assert(read("archive_deduction_complete") === false, "Archive deduction should remain optional.");
assert(read("archive_entries[0][0].color[0] === archive_entries[0][3]"),
       "Scene restore should use the stored red channel.");
assert(read("archive_entries[0][0].color[3] === archive_entries[0][6]"),
       "Scene restore should use the stored alpha channel.");
run("change_scene('attic');");
assert(read("attic_entries[0][0].color[3] > 0"), "Attic background should be visible.");
assert(read("archive_entries[0][0].color[3] === 0"), "Previous scene should be hidden.");

run("change_scene('hall'); finish_study_module();");
assert(read("study_done") === true, "Study integration hook did not complete.");
assert(read("statues_owned[0] && statues_owned[3]"), "Study statues were not awarded.");
run("finish_library_module();");
assert(read("library_done") === true, "Library integration hook did not complete.");
assert(read("statues_owned[1] && statues_owned[2]"), "Library statues were not awarded.");

run("photo_examined = false; statue_positions = [1, 0, 2, 3]; lab_unlocked = all_statues_placed();");
assert(read("lab_unlocked") === true, "Any complete statue order should open the laboratory.");
assert(read("exact_statue_order()") === false, "Wrong statue order was treated as exact.");

run("photo_examined = true; statue_positions = [0, 1, 2, 3]; selected_statue = 3; place_selected_statue(3);");
assert(read("hidden_password_found") === true, "Exact photographed order should reveal the password.");

run("lab_found = [true, true, true, true]; lab_found_count = 4; normal_case_complete = false;");
assert(read("lab_found_count === 4 && !normal_case_complete"),
       "Physical evidence should be sufficient even without cognition progress.");

run("conspiracy_evidence = true; deduction_stage = 2; commissioner_identified = false;");
assert(read("deduction_display_stage()") === 2,
       "Safe documents should unlock the optional Commissioner deduction.");
run("commissioner_identified = true;");
assert(read("deduction_display_stage()") === 3,
       "Commissioner deduction should complete the hidden-route cognition state.");

run("reset_story_state();");
assert(read("study_done") === false && read("commissioner_identified") === false,
       "Reset should clear persistent story progress.");

console.log("Operation Escape story validation passed.");
