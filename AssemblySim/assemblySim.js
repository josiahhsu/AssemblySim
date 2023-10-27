const register_names = ["rax","rbx","rcx","rdx","rsi","rbp","rsp","r8","r9","r10","r11","r12","r13"];
const instructions = get_ops();
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

function check_args(args, n, regs)
{
    if (args.length != n)
    {
        error(`Expected ${n} arguments, got ${args.length}`);
        return false;
    }
    
    for (const i of regs)
    {
        if (!is_register(args[i]))
        {
            error(`argument ${i} must be a register.`)
            return false;
        }
    }

    return true;
}

function parse_args(args)
{
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
// The regs parameter is a list of argument positions that must be registers.
function handle_op(op, args, n, regs)
{
    if (!check_args(args, n, regs))
        return false;

    let values = parse_args(args);
    if (!values)
        return false;

    registers[args[n-1].substring(1)] = op(values);
    return true;
}

// Wrapper for making operator functions.
// By default assumes last argument should be a register.
function make_op(f,n,regs=[n-1])
{
    return function(args){ return handle_op(f, args, n, regs); };
}

function get_ops()
{
    let ops = {};

    // D + S
    ops["add"] = make_op( function(x){ return x[1] + x[0]; }, 2);
 
    // D - S
    ops["sub"] = make_op( function(x){ return x[1] - x[0]; }, 2);

    // D * S
    ops["mul"] = make_op( function(x){ return x[1] * x[0]; }, 2);

    // D / S
    ops["div"] = make_op( function(x){ return Math.floor(x[1] / x[0]); }, 2);

    // D++
    ops["inc"] = make_op( function(x){ return x[0] + 1; }, 1);

    // D--
    ops["dec"] = make_op( function(x){ return x[0] - 1; }, 1);

    // -D
    ops["neg"] = make_op( function(x){ return -1*x[0]; }, 1);

    // D & S
    ops["and"] = make_op( function(x){ return x[1] & x[0]; }, 2);

    // D | S
    ops["or"]  = make_op( function(x){ return x[1] | x[0]; }, 2);

    // ~D
    ops["not"] = make_op( function(x){ return ~x[0]; }, 1)

    // D ^ S
    ops["xor"] = make_op( function(x){ return x[1] ^ x[0]; }, 2);

    // D = S
    ops["mov"] = make_op( function(x){ return x[0]; }, 2, [0,1]);

    return ops;
}
