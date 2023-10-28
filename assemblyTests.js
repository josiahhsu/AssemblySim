function run_all()
{
    run_tests([result_tests(), error_tests()]);
}

function run_tests(test_suites)
{
    debug = true;

    let failures = [];
    for (const s of test_suites)
    {
        const test_function = s[0];
        const tests = s[1];
        for (const t of tests)
        {
            if (!test_function(t))
                failures.push(t[0])
        }
    }
    if (failures.length == 0)
    {
        alert("All tests passed!")
    }
    else
    {
        alert(`${failures.length} failed tests: ${failures}`)
        for (const f of failures)
            console.log(f);
    }
    debug = false;
}

/* 
 * Test suite functions
 * Each function returns a test suite consistion of a 
 * test function and the tests to run it on.
 */

function result_tests()
{
    function f(params)
    {
        const name = params[0];
        const code = params[1];
        const expected = params[2];
        console.log(`Running test [${name}]`);
        const result = get_parse_result(code);
        if (result != expected)
        {
            console.log(`FAILED: expected ${expected}, got ${result}`);
            return false;
        }
        console.log(`Passed!`);
        return true;
    }

    const tests = [
        // instructions
        ["Add immediate", "add $8 %rax", "8"],
        ["Add register", "add $8 %rsi\n add %rsi %rax", "8"],
        ["Sub immediate", "sub $8 %rax", "-8"],
        ["Sub register", "add $8 %rsi\n sub %rsi %rax", "-8"],
        ["Mul immediate", "add $1 %rax\n mul $8 %rax", "8"],
        ["Mul register", "add $1 %rax\n add $8 %rsi\n mul %rsi %rax", "8"],
        ["Div immediate", "add $10 %rax\n div $2 %rax", "5"],
        ["Div register", "add $10 %rax\n add $2 %rsi\n div %rsi %rax", "5"],
        ["Integer division", "add $11 %rax\n div $2 %rax", "5"],
        ["Increment", "inc %rax", "1"],
        ["Decrement", "dec %rax", "-1"],
        ["Negate", "add $1 %rax\n neg %rax", "-1"],
        ["Not", "not %rax", "-1"],
        ["Left arithmetic shift", "add $1 %rax\n sal $1 %rax", "2"],
        ["Left logical shift", "add $1 %rax\n shl $1 %rax", "2"],
        ["Right arithmetic shift 1", "add $2 %rax\n sar $1 %rax", "1"],
        ["Right arithmetic shift 2", "not %rax\n sar $1 %rax", String((~0)>>1)],
        ["Right logical shift 1", "add $2 %rax\n shr $1 %rax", "1"],
        ["Right logical shift 2", "not %rax\n shr $1 %rax", String((~0)>>>1)],
        ["And", "add $7 %rax\n and $1 %rax", "1"],
        ["Or", "add $6 %rax\n or $1 %rax", "7"],
        ["Xor", "add $123791 %rax\n xor %rax %rax", "0"],
        ["Mov", "add $8 %rsi\n mov %rsi %rax", "8"],
        ["Push-pop", "push $30\n pop %rax", "30", "30"],
    ];

    return [f, tests];
}

function error_tests()
{
    function f(params)
    {
        const name = params[0];
        const code = params[1]
        console.log(`Running test [${name}]`);
        const result = get_parse_result(code);
        if (result != "ERROR")
        {
            console.log(`FAILED: expected error, got ${result}`);
            return false;
        }
        console.log(`Passed!`);
        return true;
    }

    const tests = [
        ["Bad instruction", "dad $8 %rax"],
        ["No operands", "add"],
        ["Not enough operands", "add $1"],
        ["Too many operands", "add $1 %rax %rax"],
        ["Invalid operands", "add 1 %rax"],
        ["Invalid immediate", "add $one %rax"],
        ["Negative immediate", "add $-1 %rax"],
        ["Floating point immediate", "add $0.1 %rax"],
        ["Invalid register", "add $1 %foo"],
    ];

    return [f, tests];
}
