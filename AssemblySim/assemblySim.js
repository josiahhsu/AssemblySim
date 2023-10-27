const register_names = ["rax","rbx","rcx","rdx","rsi","rdi","rbp","rsp","r8","r9","r10","r11","r12","r13","r14","r15"];
const instructions = get_ops();
let stack = [];
let registers = {};
let ip = 0;

function init()
{
    // clear register values and the stack
    registers = {};
    stack = [];
    ip = 0;
    for (const r of register_names)
    {
        registers[r] = 0;
    }
}

function error(str)
{
    alert(`Error on line ${ip}: ${str}`);
}

function parse(code)
{
    init();
    let lines = code.split("\n");
    const len = lines.length;
    while (ip < len)
    {
        // store current instruction pointer value
        let current = ip;
        
        if (!parse_line(lines[ip]))
            return false;
        
        // control instruction error handling
        if (ip < 0 || ip >= len)
        {
            error(`Invalid jump destination [${ip}]`)
            return false;
        }

        // if instruction didn't modify the instruction pointer, increment it
        if (current == ip)
            ip++;
    }
    return true;
}

function get_parse_result(code)
{
    // if parsing successful, get return value stored in rax register
    if (parse(code))
        return String(registers["rax"]);
    return "ERROR"
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
        error(`Unrecognized instruction [${op}]`);
        return false;
    }
    return instructions[op](tokens.slice(1));
}

/** operand parsing **/

function is_register(reg)
{
    return reg.charAt(0) == '%' && register_names.includes(reg.substring(1));
}

// JavaScript bitwise operations only handle 32-bit operands
function is_32bit(x)
{
    return (x & ~0) == x;
}

function check_args(args, n, regs)
{
    if (args.length != n)
    {
        error(`Expected ${n} arguments, found ${args.length}`);
        return false;
    }
    
    for (const i of regs)
    {
        if (!is_register(args[i]))
        {
            error(`Argument ${i} must be a register.`)
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
                // immediate - value must be a positive 32-bit number
                let n = Number.parseInt(value);
                if (isNaN(n) || n < 0 || !is_32bit(n))
                {
                    error(`Immediate value [${a}] is not a positive 32-bit integer`);
                    return null;
                }
                values.push(n);
                break;
            case '%':
                // register - must be a valid register name
                if (!is_register(a))
                {
                    error(`Invalid register [${a}]`);
                    return null;
                }
                values.push(registers[value]);
                break;
            default:
                error(`Invalid operand form [${a}]`);
                return null;
        }
    }
    return values;
}

/** operator functions **/

// Generic function for handling an instruction with n arguments.
// The regs parameter is a list of argument positions that must be registers.
function handle_op(op, args, n, regs, store)
{
    if (!check_args(args, n, regs))
        return false;

    let values = parse_args(args);
    if (!values)
        return false;

    // limit result to 32-bit value
    const ret = op(values) & ~0;
    if (store)
        registers[args[n-1].substring(1)] = ret;
    return true;
}

// Wrapper for making operator functions.
// By default assumes last argument should be a register.
function make_op(f,n,regs=[n-1],store=true)
{
    return function(args){ return handle_op(f, args, n, regs, store); };
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

    // D << S (same for both arithmetic and logical)
    ops["sal"] = make_op( function(x){ return x[1] << x[0]; }, 2);
    ops["shl"] = ops["sal"];

    // D >> S (arithmetic, sign-extend)
    ops["sar"] = make_op( function(x){ return x[1] >> x[0]; }, 2);
    
    // D >> S (logical, zero-fill)
    ops["shr"] = make_op( function(x){ return x[1] >>> x[0]; }, 2);

    // D--
    ops["dec"] = make_op( function(x){ return x[0] - 1; }, 1);

    // -D
    ops["neg"] = make_op( function(x){ return -1*x[0]; }, 1);

    // D & S
    ops["and"] = make_op( function(x){ return x[1] & x[0]; }, 2);

    // D | S
    ops["or"] = make_op( function(x){ return x[1] | x[0]; }, 2);

    // ~D
    ops["not"] = make_op( function(x){ return ~x[0]; }, 1)

    // D ^ S
    ops["xor"] = make_op( function(x){ return x[1] ^ x[0]; }, 2);

    // D = S
    ops["mov"] = make_op( function(x){ return x[0]; }, 2, [0,1]);

    // increments %rsp, then pushes S onto stack at pos %rsp
    ops["push"] = make_op( function(x){ stack[++registers["rsp"]] = x[0]; }, 1, [], false);

    // pops stack value at pos %rsp into D, then decrements %rsp
    ops["pop"] = make_op( function(x){ return stack[registers["rsp"]--]; }, 1);
    
    // jumps to line specified by operand
    ops["jmp"] = make_op( function(x){ ip = x[0]; }, 1, [], false);

    return ops;
}
