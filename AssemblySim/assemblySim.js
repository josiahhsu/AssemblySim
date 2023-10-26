const register_names = ["rax","rbx","rcx","rdx","rsi","rbp","rsp","r8","r9","r10","r11","r12","r13"];
const instructions = {"add":add, "sub":sub, "mul":mul, "div":div, "mov":mov, "or":or, "and":and, "xor":xor}
let registers = {};

function init()
{
    // clear all register values
    registers = {};
    for (const r of register_names)
    {
        registers[r] = 0;
    }
}

function error(str)
{
    alert(`ERROR: ${str}`);
}

function parse(code)
{
    init();
    let lines = code.split("\n");
    for (const l of lines)
    {
        if (!parse_line(l))
            return false;
    }

    // convention: return value stored in rax register
    return registers["rax"];
}

function parse_line(line)
{
    line = line.trim();

    // empty line - noop
    if(!line)
        return true;
    
    let tokens = line.split(/\s+/);
    let op = tokens[0];
    if (!(op in instructions))
    {
        error(`Unrecognized instruction: ${op}`);
        return false;
    }
    return instructions[op](tokens.slice(1));
}


/** operand parsing **/

function is_register(reg)
{
    return reg.charAt(0) == '%' && register_names.includes(reg.substring(1));
}

function check_args(args, n)
{
    if (args.length != n)
    {
        error(`Expected ${n} arguments, got ${args.length}`);
        return false;
    }
    
    if (!is_register(args[n - 1]))
    {
        error("Destination is not a register.")
        return false;
    }

    return true;
}

function parse_args(args, n)
{
    if (!check_args(args, n))
        return null;

    let values = [];
    for (const a of args)
    {
        const id = a.charAt(0);
        const value = a.substring(1);
        switch(id)
        {
            case '$':
                // immediate          
                let number = Number(value);
                if (isNaN(number))
                {
                    error(`Invalid immediate value ${a}`);
                    return null;
                }
                values.push(number);
                break;
            case '%':
                // register
                if (!is_register(a))
                {
                    error(`Invalid register ${a}`);
                    return null;
                }
                values.push(registers[value]);
                break;
            default:
                error("Unrecognized operand")
                return null;
        }
    }
    return values;
}

/** operator functions **/

// Generic function for handling an instruction with n arguments.
// The last operand is assumed to be the destination register.
function handle_op(args, n, op)
{
    let values = parse_args(args, n);
    if (!values)
        return false;

    registers[args[n-1].substring(1)] = op(values);
    return true;
}

function add(args)
{
    function f(x){return x[1] + x[0];};
    return handle_op(args, 2, f);
}

function sub(args)
{
    function f(x){return x[1] - x[0];};
    return handle_op(args, 2, f);
}

function mul(args)
{
    function f(x){return x[1] * x[0];};
    return handle_op(args, 2, f);
}

function div(args)
{
    function f(x){return Math.floor(x[1] / x[0]);};
    return handle_op(args, 2, f);
}

function or(args)
{
    function f(x){return x[1] | x[0];};
    return handle_op(args, 2, f);
}

function and(args)
{
    function f(x){return x[1] & x[0];};
    return handle_op(args, 2, f);
}

function xor(args)
{
    function f(x){return x[1] ^ x[0];};
    return handle_op(args, 2, f);
}

function mov(args)
{
    // extra check that both operands are registers
    if (!(is_register(args[0]) && is_register(args[1])))
    {
        error("Movement must be between registers.");
        return false;
    }

    function f(x){return x[0];};
    return handle_op(args, 2, f);
}
