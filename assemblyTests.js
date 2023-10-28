function test(name, code, expected)
{
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

function run_tests()
{
    debug = true;

    let tests = get_tests();
    let failures = [];
    for (const t of tests)
    {
        if (!test(t[0], t[1], t[2]))
            failures.push(t[0])
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

function get_tests()
{
    let tests = [
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

        // error checking
        ["Bad instruction", "dad $8 %rax", "ERROR"],
        ["No operands", "add", "ERROR"],
        ["Not enough operands", "add $1", "ERROR"],
        ["Too many operands", "add $1 %rax %rax", "ERROR"],
        ["Invalid operands", "add 1 %rax", "ERROR"],
        ["Invalid immediate", "add $one %rax", "ERROR"],
        ["Negative immediate", "add $-1 %rax", "ERROR"],
        ["Floating point immediate", "add $0.1 %rax", "ERROR"],
        ["Invalid register", "add $1 %foo", "ERROR"],
    ]

    return tests;
}