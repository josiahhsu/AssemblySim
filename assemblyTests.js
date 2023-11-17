function run_all()
{
    run_tests([standard_tests(), input_arg_tests(), flag_tests(), cond_tests(), memory_tests(), error_tests()]);
}

function run_tests(test_suites)
{
    debug = true;

    let failures = [];
    for (const s of test_suites)
    {
        const test_function = s[0];
        const tests = s[1];
        for (const t of Object.keys(tests))
        {
            console.log(`Running test: ${t}`);
            if (!test_function(tests[t]))
                failures.push(t);
        }
    }

    const n = failures.length;
    const all_passed = (n == 0);
    const msg = all_passed? `All tests passed!` : `${n} failed tests: ${failures}`;
    all_passed? console.log(msg) : console.error(msg);
    alert(msg);
    debug = false;
}

function print_test_result(pass, expected, actual)
{
    pass? console.log("Passed!") : console.error(`FAILED: expected ${expected}, got ${actual}`);
}

/*
 * Test suite functions
 * Each function returns a test suite consisting of a test
 * function and a dictionary mapping test names to tests.
 */

function test_equal(actual, expected)
{
    const equal = (actual == expected);
    print_test_result(equal, expected, actual);
    return equal;
}

function flags_equal(expected)
{
    let equal = true;
    let actual = [];
    for (const f of flag_names)
    {
        // build expected array
        const set = (flags[f] == 1);
        if (set)
            actual.push(f);

        // check if expected flag matches actual flag
        if (expected.includes(f) != set)
            equal = false;
    }
    print_test_result(equal, expected, actual);
    return equal;
}

function array_equals(a, b)
{
    return a.length == b.length && a.every((v, i) => (v == b[i]));
}

function standard_tests()
{
    function f(params)
    {
        return test_equal(get_parse_result(params[0]), params[1]);
    }

    const tests = {
        "add immediate": ["add $8 %rax", "8"],
        "add register": ["add $8 %rsi\n add %rsi %rax", "8"],
        "sub immediate": ["sub $8 %rax", "-8"],
        "sub register": ["add $8 %rsi\n sub %rsi %rax", "-8"],
        "mul immediate": ["add $1 %rax\n mul $8 %rax", "8"],
        "mul register": ["add $1 %rax\n add $8 %rsi\n mul %rsi %rax", "8"],
        "div pos pos": ["add $20 %rax\n div $8", "2"],
        "div neg pos": ["sub $20 %rax\n div $8", "-2"],
        "div pos neg": ["add $20 %rax\n sub $8 %r8\n div %r8", "-2"],
        "div neg neg": ["sub $20 %rax\n sub $8 %r8\n div %r8", "2"],
        "mod pos pos": ["add $20 %rax\n div $8\n mov %rdx %rax", "4"],
        "mod neg pos": ["sub $20 %rax\n div $8\n mov %rdx %rax", "-4"],
        "mod pos neg": ["add $20 %rax\n sub $8 %r8\n div %r8\n mov %rdx %rax", "4"],
        "mod neg neg": ["sub $20 %rax\n sub $8 %r8\n div %r8\n mov %rdx %rax", "-4"],
        "inc": ["inc %rax", "1"],
        "dec": ["dec %rax", "-1"],
        "neg": ["add $1 %rax\n neg %rax", "-1"],
        "not": ["not %rax", "-1"],
        "sal": ["add $1 %rax\n sal $1 %rax", "2"],
        "shl": ["add $1 %rax\n shl $1 %rax", "2"],
        "sar 1": ["add $2 %rax\n sar $1 %rax", "1"],
        "sar 2": ["not %rax\n sar $1 %rax", String((~0)>>1)],
        "shr 1": ["add $2 %rax\n shr $1 %rax", "1"],
        "shr 2": ["not %rax\n shr $1 %rax", String((~0)>>>1)],
        "and": ["add $7 %rax\n and $1 %rax", "1"],
        "or": ["add $6 %rax\n or $1 %rax", "7"],
        "xor": ["add $123791 %rax\n xor %rax %rax", "0"],
        "mov": ["add $8 %rsi\n mov %rsi %rax", "8"],
        "push-pop": ["push $30\n pop %rax", "30"],
        "jmp": ["jmp $2\n add $100 %rax\n add $5 %rax", "5"],
        "general comment": ["#this is a comment", "0"],
        "commented instruction": ["#add $15 %rax\n add $7 %rax", "7"],
        "labeled jump": [".test:\n inc %rax\n cmp $5 %rax\n jne .test", "5"],
    };

    return [f, tests];
}

function cond_tests()
{
    function f(params)
    {
        return test_equal(get_parse_result(params[0]), params[1]);
    }

    /*
     * Generates all conditional tests for a given op.
     * template(suffix, value) is a function that generates code for an instruction.
     * The instruction in the template will change depending on the provided suffix.
     * Template tests will compare the passed-in value to 1.
     */
    function make_cond_test(tests, template, op)
    {
        tests[`${op}e true`] = [template(`e`, 1), "1"];
        tests[`${op}e false`] = [template(`e`, 0), "0"];
        tests[`${op}z true`] = [template(`z`, 1), "1"];
        tests[`${op}z false`] = [template(`z`, 0), "0"];
        tests[`${op}ne true`] = [template(`ne`, 0), "1"];
        tests[`${op}ne false`] = [template(`ne`, 1), "0"];
        tests[`${op}nz true`] = [template(`nz`, 0), "1"];
        tests[`${op}nz false`] = [template(`nz`, 1), "0"];
        tests[`${op}s true`] = [template(`s`, 0), "1"];
        tests[`${op}s false`] = [template(`s`, 2), "0"];
        tests[`${op}ns true`] = [template(`ns`, 2), "1"];
        tests[`${op}ns false`] = [template(`ns`, 0), "0"];
        tests[`${op}g less`] = [template(`g`, 0), "0"];
        tests[`${op}g equal`] = [template(`g`, 1), "0"];
        tests[`${op}g greater`] = [template(`g`, 2), "1"];
        tests[`${op}nle less`] = [template(`nle`, 0), "0"];
        tests[`${op}nle equal`] = [template(`nle`, 1), "0"];
        tests[`${op}nle greater`] = [template(`nle`, 2), "1"];
        tests[`${op}ge less`] = [template(`ge`, 0), "0"];
        tests[`${op}ge equal`] = [template(`ge`, 1), "1"];
        tests[`${op}ge greater`] = [template(`ge`, 2), "1"];
        tests[`${op}nl less`] = [template(`nl`, 0), "0"];
        tests[`${op}nl equal`] = [template(`nl`, 1), "1"];
        tests[`${op}nl greater`] = [template(`nl`, 2), "1"];
        tests[`${op}l less`] = [template(`l`, 0), "1"];
        tests[`${op}l equal`] = [template(`l`, 1), "0"];
        tests[`${op}l greater`] = [template(`l`, 2), "0"];
        tests[`${op}nge less`] = [template(`nge`, 0), "1"];
        tests[`${op}nge equal`] = [template(`nge`, 1), "0"];
        tests[`${op}nge greater`] = [template(`nge`, 2), "0"];
        tests[`${op}le less`] = [template(`le`, 0), "1"];
        tests[`${op}le equal`] = [template(`le`, 1), "1"];
        tests[`${op}le greater`] = [template(`le`, 2), "0"];
        tests[`${op}ng less`] = [template(`ng`, 0), "1"];
        tests[`${op}ng equal`] = [template(`ng`, 1), "1"];
        tests[`${op}ng greater`] = [template(`ng`, 2), "0"];
    };

    let tests = {};
    function set_template(suffix, value)
    {
        // compares the value to 1
        return `add $${value} %r8\n cmp $1 %r8\n set${suffix} %rax`;
    }
    make_cond_test(tests, set_template, "set");

    function jump_template(suffix, value)
    {
        return `add $${value} %r8\n cmp $1 %r8\n j${suffix} .end\n dec %rax\n .end:\n inc %rax`;
    }
    make_cond_test(tests, jump_template, "j");

    function cmov_template(suffix, value)
    {
        return `inc %r9\n add $${value} %r8\n cmp %r9 %r8\n cmov${suffix} %r9 %rax`;
    }
    make_cond_test(tests, cmov_template, "cmov");

    tests["jg OF"] = ["add $1 %r10\n shl $31 %r10\n cmp $1 %r10\n jg $5\n add $1 %rax\n add $10 %rax", "11"];
    tests["jl OF"] = ["add $1 %r10\n shl $31 %r10\n cmp $1 %r10\n jl $5\n add $1 %rax\n add $10 %rax", "10"];

    return [f, tests];
}

function error_tests()
{
    function f(params)
    {
        return test_equal(get_parse_result(params[0], params[1]), "ERROR");
    }

    const tests = {
        "Bad instruction": ["dad $8 %rax"],
        "No operands": ["add"],
        "Not enough operands": ["add $1"],
        "Too many operands": ["add $1 %rax %rax"],
        "Invalid immediate": ["add $one %rax"],
        "Floating-point immediate": ["add $0.1 %rax"],
        "Invalid register": ["add $1 %foo"],
        "Invalid input argument": ["", {"rdi": "abc"}],
        "Floating-point input argument": ["", {"rdi": "0.1"}],
        "Div by 0": ["div $0 %rax"],
        "Bad label": [".no_colon\ninc %rax"],
        "Unknown label": ["inc %rax\n cmp $5 %rax\n jne .test"],
        "Duplicate label": [".dup:\n .dup:\n inc %rax"],
        "Bad memory form 1": ["inc ()"],
        "Bad memory form 2": ["inc 1()"],
        "Bad memory form 3": ["inc 1(,)"],
        "Bad memory form 4": ["inc 1(,,)"],
        "Bad memory form 5": ["inc 5.1(%r10)"],
        "Bad memory form 6": ["inc $1(%r10)"],
        "Bad memory form 7": ["inc 1(%r10,%r10,%r10)"],
        "Bad memory form 8": ["inc --1(%r10,%r10)"],
        "Bad memory form 9": ["inc (8)"],
        "Bad memory form 10": ["inc (%r10,8)"],
        "Bad memory form 11": ["inc (%r10,%r10,7)"],
        "Bad memory form 12": ["inc (%r10,%r10,-1)"],
        "Bad memory form 13": ["inc (%r10,%r10,)"],
        "Bad memory form 14": ["inc (%r10,%r10,44)"],
        "Bad memory form 15": ["inc (%r10,4,%r10)"],
        "Bad memory form 16": ["inc (4,%r10,%r10)"],
        "Bad memory form 17": ["inc (%r10,  %r10,   1)"],
        "Bad memory form 18": ["inc ((%r10))"],
        "Bad memory form 19": ["inc (%r10"],
        "Bad memory form 20": ["inc (%r10,,4)"],
        "Bad memory form 21": ["inc a(%r10)"],
        "Bad memory form 22": ["inc %r10(%r10)"],
    };

    return [f, tests];
}

function flag_tests()
{
    function f(params)
    {
        if (get_parse_result(params[0]) == "ERROR")
        {
            console.error("FAILED: error in program execution");
            return false;
        }
        return flags_equal(params[1]);
    }

    const tests = {
        "cmp equal": ["inc %r8\n cmp $1 %r8", ["ZF"]],
        "cmp greater": ["inc %r8\n cmp $2 %r8", ["SF"]],
        "cmp less": ["add $2 %r8\n cmp $1 %r8", [""]],
        "cmp OF negative": ["add $1 %r10\n shl $31 %r10\n cmp $1 %r10", ["OF"]],
        "cmp OF positive": ["add $1 %r8\n shl $31 %r8\n not %r8\n not %r9\n not %r10\n and %r8 %r10\n cmp %r9 %r10", ["SF", "OF"]],
        "test positive": ["inc %r8\n test $1 %r8", [""]],
        "test zero": ["test $1 %r8", ["ZF"]],
        "test negative": ["not %r9\n not %r10\n test %r9 %r10", ["SF"]],
    };

    return [f, tests];
}

function input_arg_tests()
{
    function f(params)
    {
        return test_equal(get_parse_result(params[0], params[1]), params[2]);
    }

    const tests = {
        "one param": ["mov %rdi %rax", {"rdi": 17}, "17"],
        "ignored param": ["inc %rax", {"rdi": 9}, "1"],
        "out-of-order param": ["mov %r8 %rax", {"r8": 17}, "17"],
        "all params": ["or %rdi %rax\n or %rsi %rax\n or %rdx %rax\n or %rcx %rax\n or %r8 %rax\n or %r9 %rax", {"rdi": 1, "rsi": 2, "rdx": 4, "rcx": 8, "r8": 16, "r9": 32}, "63"],
    };

    return [f, tests];
}

function memory_tests()
{
    function f(params)
    {
        if (get_parse_result(params[0]) == "ERROR")
        {
            console.error("FAILED: error in program execution");
            return false;
        }

        const equal = array_equals(memory, params[1]);
        print_test_result(equal, params[1], memory);
        return equal;
    }

    function make_mem(values)
    {
        let mem = [];
        for (var i = 0; i < values.length; i++)
        {
            mem[values[i][0]] = values[i][1];
        }
        return mem;
    }

    const tests = {
        "Imm": ["add $1 2", make_mem([[2, 1]])],
        "(b)": ["add $2 %r8\n add $1 (%r8)", make_mem([[2, 1]])],
        "Imm(b)": ["add $2 %r8\n add $1 2(%r8)", make_mem([[4, 1]])],
        "(b,i)": ["add $2 %r8\n add $2 %r9\n add $1 (%r8,%r9)", make_mem([[4, 1]])],
        "Imm(b,i)": ["add $2 %r8\n add $2 %r9\n add $1 2(%r8,%r9)", make_mem([[6, 1]])],
        "(,i,s)": ["add $2 %r8\n add $1 (,%r8,2)", make_mem([[4, 1]])],
        "Imm(,i,s)": ["add $2 %r8\n add $1 2(,%r8,2)", make_mem([[6, 1]])],
        "(b,i,s)": ["add $2 %r8\n add $2 %r9\n add $1 (%r8,%r9,2)", make_mem([[6, 1]])],
        "Imm(b,i,s)": ["add $2 %r8\n add $2 %r9\n add $1 2(%r8,%r9,2)", make_mem([[8, 1]])],
        "Multiple references": ["add $8 8\n add $6 14", make_mem([[8,8], [14,6]])],
    };

    return [f, tests];
}
