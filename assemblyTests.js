function run_all()
{
    run_tests([result_tests(), error_tests(), flag_tests()]);
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
    const msg = (n == 0)? `All tests passed!` : `${n} failed tests: ${failures}`;
    console.log(msg);
    alert(msg);
    debug = false;
}

/* 
 * Test suite functions
 * Each function returns a test suite consisting of a test 
 * function and a dictionary mapping test names to tests. 
 */

function test_equal(actual, expected)
{
    const equal = (actual == expected);
    console.log(equal? `Passed!` : `FAILED: expected ${expected}, got ${actual}`);
    return equal;    
}

function flags_equal(expected)
{
    let equal = true;
    let actual = [];
    for (const f of flag_names)
    {
        // build expected array
        if (flags[f])
            actual.push(f);

        // check if expected flag matches actual flag
        const x = (expected.includes(f));
        if (x != flags[f])
            equal = false;
    }
    console.log(equal? `Passed!` : `FAILED: expected ${expected}, got ${actual}`);
    return equal;
}

function result_tests()
{
    function f(params)
    {
        return test_equal(get_parse_result(params[0]), params[1]);
    }

    const tests = {
        "Add immediate": ["add $8 %rax", "8"],
        "Add register": ["add $8 %rsi\n add %rsi %rax", "8"],
        "Sub immediate": ["sub $8 %rax", "-8"],
        "Sub register": ["add $8 %rsi\n sub %rsi %rax", "-8"],
        "Mul immediate": ["add $1 %rax\n mul $8 %rax", "8"],
        "Mul register": ["add $1 %rax\n add $8 %rsi\n mul %rsi %rax", "8"],
        "Div immediate": ["add $10 %rax\n div $2 %rax", "5"],
        "Div register": ["add $10 %rax\n add $2 %rsi\n div %rsi %rax", "5"],
        "Integer division": ["add $11 %rax\n div $2 %rax", "5"],
        "Increment": ["inc %rax", "1"],
        "Decrement": ["dec %rax", "-1"],
        "Negate": ["add $1 %rax\n neg %rax", "-1"],
        "Not": ["not %rax", "-1"],
        "Left arithmetic shift": ["add $1 %rax\n sal $1 %rax", "2"],
        "Left logical shift": ["add $1 %rax\n shl $1 %rax", "2"],
        "Right arithmetic shift 1": ["add $2 %rax\n sar $1 %rax", "1"],
        "Right arithmetic shift 2": ["not %rax\n sar $1 %rax", String((~0)>>1)],
        "Right logical shift 1": ["add $2 %rax\n shr $1 %rax", "1"],
        "Right logical shift 2": ["not %rax\n shr $1 %rax", String((~0)>>>1)],
        "And": ["add $7 %rax\n and $1 %rax", "1"],
        "Or": ["add $6 %rax\n or $1 %rax", "7"],
        "Xor": ["add $123791 %rax\n xor %rax %rax", "0"],
        "Mov": ["add $8 %rsi\n mov %rsi %rax", "8"],
        "Push-pop": ["push $30\n pop %rax", "30"],
        "jle": ["add $10 %rax\n dec %rax\n cmp %rax $5\n jle $1", "4"],
        "jl": ["add $10 %rax\n dec %rax\n cmp %rax $5\n jl $1", "5"],
        "jge": ["inc %rax\n cmp %rax $5\n jge $0", "6"],
        "jg": ["inc %rax\n cmp %rax $5\n jg $0", "5"],
    };

    return [f, tests];
}

function error_tests()
{
    function f(params)
    {
        return test_equal(get_parse_result(params[0]), "ERROR");
    }

    const tests = {
        "Bad instruction": ["dad $8 %rax"],
        "No operands": ["add"],
        "Not enough operands": ["add $1"],
        "Too many operands": ["add $1 %rax %rax"],
        "Invalid operands": ["add 1 %rax"],
        "Invalid immediate": ["add $one %rax"],
        "Negative immediate": ["add $-1 %rax"],
        "Floating point immediate": ["add $0.1 %rax"],
        "Invalid register": ["add $1 %foo"],
    };

    return [f, tests];
}

function flag_tests()
{
    function f(params)
    {
        if (get_parse_result(params[0]) == "ERROR")
        {
            console.log("FAILED: error in program execution")
            return false;
        }
        return flags_equal(params[1]);
    }

    const tests = {
        "cmp equal": ["cmp $1 $1", ["ZF"]],
        "cmp greater": ["cmp $2 $1", ["SF"]],
        "cmp less": ["cmp $1 $2", [""]],
        "cmp OF": ["add $1 %r10\n shl $31 %r10\n cmp $1 %r10", ["OF"]],
        "test positive": ["test $1 $1", [""]],
        "test zero": ["test $1 $0", ["ZF"]],
        "test negative": ["not %r9\n not %r10\n test %r9 %r10", ["SF"]],
    };

    return [f, tests];
}
