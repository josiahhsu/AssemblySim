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

    function make_set_test(op, value, result)
    {
        // compares the value to 1
        return [`add $${value} %r8\n cmp $1 %r8\n ${op} %rax`, result];
    }

    function make_jump_test(op, value, result)
    {
        return [`add $${value} %r8\n cmp $1 %r8\n ${op} .end\n dec %rax\n .end:\n inc %rax`, result];
    }

    function make_cmov_test(op, value, result)
    {
        return [`inc %r9\n add $${value} %r8\n cmp %r9 %r8\n ${op} %r9 %rax`, result];
    }


    const tests = {
        // sets
        "sete true": make_set_test("sete", 1, "1"),
        "sete false": make_set_test("sete", 0, "0"),
        "setne true": make_set_test("setne", 0, "1"),
        "setne false": make_set_test("setne", 1, "0"),
        "sets true": make_set_test("sets", 0, "1"),
        "sets false": make_set_test("sets", 2, "0"),
        "setns true": make_set_test("setns", 2, "1"),
        "setns false": make_set_test("setns", 0, "0"),
        "setg less": make_set_test("setg", 0, "0"),
        "setg equal": make_set_test("setg", 1, "0"),
        "setg greater": make_set_test("setg", 2, "1"),
        "setge less": make_set_test("setge", 0, "0"),
        "setge equal": make_set_test("setge", 1, "1"),
        "setge greater": make_set_test("setge", 2, "1"),
        "setl less": make_set_test("setl", 0, "1"),
        "setl equal": make_set_test("setl", 1, "0"),
        "setl greater": make_set_test("setl", 2, "0"),
        "setle less": make_set_test("setle", 0, "1"),
        "setle equal": make_set_test("setle", 1, "1"),
        "setle greater": make_set_test("setle", 2, "0"),

        // jumps
        "je true": make_jump_test("je", 1, "1"),
        "je false": make_jump_test("je", 0, "0"),
        "jne true": make_jump_test("jne", 0, "1"),
        "jne false": make_jump_test("jne", 1, "0"),
        "js true": make_jump_test("js", 0, "1"),
        "js false": make_jump_test("js", 2, "0"),
        "jns true": make_jump_test("jns", 2, "1"),
        "jns false": make_jump_test("jns", 0, "0"),
        "jg equal": make_jump_test("jg", 1, "0"),
        "jg greater": make_jump_test("jg", 2, "1"),
        "jge less": make_jump_test("jge", 0, "0"),
        "jge equal": make_jump_test("jge", 1, "1"),
        "jge greater": make_jump_test("jge", 2, "1"),
        "jl less": make_jump_test("jl", 0, "1"),
        "jl equal": make_jump_test("jl", 1, "0"),
        "jl greater": make_jump_test("jl", 2, "0"),
        "jle less": make_jump_test("jle", 0, "1"),
        "jle equal": make_jump_test("jle", 1, "1"),
        "jle greater": make_jump_test("jle", 2, "0"),

        "jg OF": ["add $1 %r10\n shl $31 %r10\n cmp $1 %r10\n jg $5\n add $1 %rax\n add $10 %rax", "11"],
        "jl OF": ["add $1 %r10\n shl $31 %r10\n cmp $1 %r10\n jl $5\n add $1 %rax\n add $10 %rax", "10"],

        // conditional moves
        "cmove true": make_cmov_test("cmove", 1, "1"),
        "cmove false": make_cmov_test("cmove", 0, "0"),
        "cmovne true": make_cmov_test("cmovne", 0, "1"),
        "cmovne false": make_cmov_test("cmovne", 1, "0"),
        "cmovs true": make_cmov_test("cmovs", 0, "1"),
        "cmovs false": make_cmov_test("cmovs", 2, "0"),
        "cmovns true": make_cmov_test("cmovns", 2, "1"),
        "cmovns false": make_cmov_test("cmovns", 0, "0"),
        "cmovg equal": make_cmov_test("cmovg", 1, "0"),
        "cmovg greater": make_cmov_test("cmovg", 2, "1"),
        "cmovge less": make_cmov_test("cmovge", 0, "0"),
        "cmovge equal": make_cmov_test("cmovge", 1, "1"),
        "cmovge greater": make_cmov_test("cmovge", 2, "1"),
        "cmovl less": make_cmov_test("cmovl", 0, "1"),
        "cmovl equal": make_cmov_test("cmovl", 1, "0"),
        "cmovl greater": make_cmov_test("cmovl", 2, "0"),
        "cmovle less": make_cmov_test("cmovle", 0, "1"),
        "cmovle equal": make_cmov_test("cmovle", 1, "1"),
        "cmovle greater": make_cmov_test("cmovle", 2, "0"),
    };

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
