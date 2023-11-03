function run_all()
{
    run_tests([standard_tests(), input_arg_tests(), flag_tests(), cond_tests(), error_tests()]);
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
        "div immediate": ["add $10 %rax\n div $2 %rax", "5"],
        "div register": ["add $10 %rax\n add $2 %rsi\n div %rsi %rax", "5"],
        "div integer": ["add $11 %rax\n div $2 %rax", "5"],
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

    function make_cond_test(tests, f, op)
    {
        tests[`${op}e true`] = f(`${op}e`, 1, "1");
        tests[`${op}e false`] = f(`${op}e`, 0, "0");
        tests[`${op}z true`] = f(`${op}z`, 1, "1");
        tests[`${op}z false`] = f(`${op}z`, 0, "0");
        tests[`${op}ne true`] = f(`${op}ne`, 0, "1");
        tests[`${op}ne false`] = f(`${op}ne`, 1, "0");
        tests[`${op}nz true`] = f(`${op}nz`, 0, "1");
        tests[`${op}nz false`] = f(`${op}nz`, 1, "0");
        tests[`${op}s true`] = f(`${op}s`, 0, "1");
        tests[`${op}s false`] = f(`${op}s`, 2, "0");
        tests[`${op}ns true`] = f(`${op}ns`, 2, "1");
        tests[`${op}ns false`] = f(`${op}ns`, 0, "0");
        tests[`${op}g less`] = f(`${op}g`, 0, "0");
        tests[`${op}g equal`] = f(`${op}g`, 1, "0");
        tests[`${op}g greater`] = f(`${op}g`, 2, "1");
        tests[`${op}nle less`] = f(`${op}nle`, 0, "0");
        tests[`${op}nle equal`] = f(`${op}nle`, 1, "0");
        tests[`${op}nle greater`] = f(`${op}nle`, 2, "1");
        tests[`${op}ge less`] = f(`${op}ge`, 0, "0");
        tests[`${op}ge equal`] = f(`${op}ge`, 1, "1");
        tests[`${op}ge greater`] = f(`${op}ge`, 2, "1");
        tests[`${op}nl less`] = f(`${op}nl`, 0, "0");
        tests[`${op}nl equal`] = f(`${op}nl`, 1, "1");
        tests[`${op}nl greater`] = f(`${op}nl`, 2, "1");
        tests[`${op}l less`] = f(`${op}l`, 0, "1");
        tests[`${op}l equal`] = f(`${op}l`, 1, "0");
        tests[`${op}l greater`] = f(`${op}l`, 2, "0");
        tests[`${op}nge less`] = f(`${op}nge`, 0, "1");
        tests[`${op}nge equal`] = f(`${op}nge`, 1, "0");
        tests[`${op}nge greater`] = f(`${op}nge`, 2, "0");
        tests[`${op}le less`] = f(`${op}le`, 0, "1");
        tests[`${op}le equal`] = f(`${op}le`, 1, "1");
        tests[`${op}le greater`] = f(`${op}le`, 2, "0");
        tests[`${op}ng less`] = f(`${op}ng`, 0, "1");
        tests[`${op}ng equal`] = f(`${op}ng`, 1, "1");
        tests[`${op}ng greater`] = f(`${op}ng`, 2, "0");
    }

    let tests = {};
    function make_set_test(op, value, result)
    {
        // compares the value to 1
        return [`add $${value} %r8\n cmp $1 %r8\n ${op} %rax`, result];
    }
    make_cond_test(tests, make_set_test, "set");

    function make_jump_test(op, value, result)
    {
        return [`add $${value} %r8\n cmp $1 %r8\n ${op} .end\n dec %rax\n .end:\n inc %rax`, result];
    }
    make_cond_test(tests, make_jump_test, "j");

    function make_cmov_test(op, value, result)
    {
        return [`inc %r9\n add $${value} %r8\n cmp %r9 %r8\n ${op} %r9 %rax`, result];
    }
    make_cond_test(tests, make_cmov_test, "cmov");

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
        "Invalid operands": ["add 1 %rax"],
        "Invalid immediate": ["add $one %rax"],
        "Negative immediate": ["add $-1 %rax"],
        "Floating-point immediate": ["add $0.1 %rax"],
        "Invalid register": ["add $1 %foo"],
        "Invalid input argument": ["", {"rdi": "abc"}],
        "Floating-point input argument": ["", {"rdi": "0.1"}],
        "Div by 0": ["div $0 %rax"],
        "Bad label": [".no_colon\ninc %rax"],
        "Unknown label": ["inc %rax\n cmp $5 %rax\n jne .test"],
        "Duplicate label": [".dup:\n .dup:\n inc %rax"],
    };

    return [f, tests];
}

function flag_tests()
{
    function f(params)
    {
        if (get_parse_result(params[0]) == "ERROR")
        {
            console.error("FAILED: error in program execution")
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
