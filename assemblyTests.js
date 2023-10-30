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
        const set = (flags[f] == 1);
        if (set)
            actual.push(f);

        // check if expected flag matches actual flag
        if (expected.includes(f) != set)
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
        "sete": ["cmp $1 $1\n sete %rax", "1"],
        "setne": ["cmp $1 $1\n setne %rax", "0"],
        "sets": ["cmp $2 $1\n sets %rax", "1"],
        "setns": ["cmp $2 $1\n setns %rax", "0"],
        "setg greater": ["cmp $1 $2\n setg %rax", "1"],
        "setg equal": ["cmp $1 $1\n setg %rax", "0"],
        "setg less": ["cmp $1 $0\n setg %rax", "0"],
        "setge greater": ["cmp $1 $2\n setge %rax", "1"],
        "setge equal": ["cmp $1 $1\n setge %rax", "1"],
        "setge less": ["cmp $1 $0\n setge %rax", "0"],
        "setl greater": ["cmp $1 $2\n setl %rax", "0"],
        "setl equal": ["cmp $1 $1\n setl %rax", "0"],
        "setl less": ["cmp $1 $0\n setl %rax", "1"],
        "setg greater": ["cmp $1 $2\n setle %rax", "0"],
        "setg equal": ["cmp $1 $1\n setle %rax", "1"],
        "setg less": ["cmp $1 $0\n setle %rax", "1"],
        "jmp": ["jmp $2\n add $100 %rax\n add $5 %rax", "5"],
        "je": ["cmp $1 $1\n je $3\n add $10 %rax\n cmp $1 $2\n je $6\n add $1 %rax\n add $200 %rax", "201"],
        "jne": ["cmp $1 $1\n jne $3\n add $10 %rax\n cmp $1 $2\n jne $6\n add $1 %rax\n add $200 %rax", "210"],
        "js": ["cmp $2 $1\n js $3\n add $10 %rax\n cmp $1 $2\n js $6\n add $1 %rax\n add $200 %rax", "201"],
        "jns": ["cmp $2 $1\n jns $3\n add $10 %rax\n cmp $1 $2\n jns $6\n add $1 %rax\n add $200 %rax", "210"],
        "jg": ["cmp $0 $1\n jg $3\n add $100 %rax\n cmp $1 $1\n jg $6\n add $10 %rax\n cmp $2 $1\n jg $9\n add $1 %rax\n add $3000 %rax", "3011"],
        "jg OF": ["add $1 %r10\n shl $31 %r10\n cmp $1 %r10\n jg $5\n add $1 %rax\n add $10 %rax", "11"],
        "jge": ["cmp $0 $1\n jge $3\n add $100 %rax\n cmp $1 $1\n jge $6\n add $10 %rax\n cmp $2 $1\n jge $9\n add $1 %rax\n add $3000 %rax", "3001"],
        "jl": ["cmp $0 $1\n jl $3\n add $100 %rax\n cmp $1 $1\n jl $6\n add $10 %rax\n cmp $2 $1\n jl $9\n add $1 %rax\n add $3000 %rax", "3110"],
        "jl OF": ["add $1 %r10\n shl $31 %r10\n cmp $1 %r10\n jl $5\n add $1 %rax\n add $10 %rax", "10"],
        "jle": ["cmp $0 $1\n jle $3\n add $100 %rax\n cmp $1 $1\n jle $6\n add $10 %rax\n cmp $2 $1\n jle $9\n add $1 %rax\n add $3000 %rax", "3100"],
        "general comment": ["//this is a comment", "0"],
        "commented instruction": ["//add $15 %rax\n add $7 %rax", "7"],
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
        "cmp OF negative": ["add $1 %r10\n shl $31 %r10\n cmp $1 %r10", ["OF"]],
        "cmp OF positive": ["add $1 %r8\n shl $31 %r8\n not %r8\n not %r9\n not %r10\n and %r8 %r10\n cmp %r9 %r10", ["SF", "OF"]],
        "test positive": ["test $1 $1", [""]],
        "test zero": ["test $1 $0", ["ZF"]],
        "test negative": ["not %r9\n not %r10\n test %r9 %r10", ["SF"]],
    };

    return [f, tests];
}
