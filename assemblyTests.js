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
        console.log("All tests passed!")
    }
    else
    {
        console.log(`${failures.length} failed tests.`)
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
        ["Add register", "add $8 %rsi\nadd %rsi %rax", "8"],
        ["Sub immediate", "sub $8 %rax", "-8"],
        ["Sub register", "add $8 %rsi\nsub %rsi %rax", "-8"],
        ["Mul immediate", "add $1 %rax\nmul $8 %rax", "8"],
        ["Mul register", "add $1 %rax\nadd $8 %rsi\nmul %rsi %rax", "8"],
        ["Div immediate", "add $10 %rax\ndiv $2 %rax", "5"],
        ["Div register", "add $10 %rax\nadd $2 %rsi\ndiv %rsi %rax", "5"],
        ["Integer division", "add $11 %rax\ndiv $2 %rax", "5"],

        // error checking
        ["Bad instruction", "dad $8 %rax", "ERROR"],
        ["No operands", "add", "ERROR"],
        ["Not enough operands", "add $1", "ERROR"],
        ["Too many operands", "add $1 $1 $1", "ERROR"],
        ["Invalid operands", "add 1 %rax", "ERROR"],
    ]

    return tests;
}