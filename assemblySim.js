const register_names = ["rax","rbx","rcx","rdx","rsi","rdi","rbp","rsp","r8","r9","r10","r11","r12","r13","r14","r15"];
const flag_names = ["ZF", "SF", "OF"];
const instructions = get_ops();
let stack = [];
let registers = {};
let flags = {};
let ip = 0;
debug = false; // used to disable alerts during testing

function init()
{
    // clear register values
    for (const r of register_names)
    {
        registers[r] = 0;
    }

    // clear flag values
    for (const f of flag_names)
    {
        flags[f] = false;
    }

    // reset stack and instruction pointer
    stack = [];
    ip = 0;
}

function error(str)
{
    if (!debug)
        alert(`Error on line ${ip}: ${str}`);
}

function parse(code, maxIters = 10000)
{
    init();
    let count = 0;
    const lines = code.split("\n");
    const len = lines.length;
    while (ip < len)
    {
        if (count > maxIters)
        {
            error(`Program exceeded ${maxIters} iterations. Terminating.`);
            return false;
        }

        // store current instruction pointer value
        const current = ip;
        
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

        count++;
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
    
    const tokens = line.split(/\s+/);
    const op = tokens[0];
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
function to_32bit(x)
{
    return x & ~0;
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
                // immediate - value must be a positive 32-bit integer
                const n = Number.parseInt(value);
                if (isNaN(n) || n < 0 || to_32bit(n) != n || Number(value) != n)
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
// The flag parameter is a function that dictates how condition codes should be set.
// The regs parameter is a list of argument positions that must be registers.
function handle_op(op, args, n, flag, regs, store)
{
    if (!check_args(args, n, regs))
        return false;

    const values = parse_args(args);
    if (!values)
        return false;

    // limit result to 32-bit value
    const ret = to_32bit(op(values));

    // set condition codes
    flag(values, ret);

    // store if needed
    if (store)
        registers[args[n-1].substring(1)] = ret;
    
    return true;
}

// Wrappers for making operator functions.
// By default assumes last argument should be a register.
function make_op(f,n,flag,regs,store)
{
    return function(args){ return handle_op(f, args, n, flag, regs, store); };
}

function msb(x)
{
    return (x >> 31) & 1;
}

function result_flags(ret)
{
    flags["ZF"] = (ret == 0);
    flags["SF"] = (msb(ret) == 1);
}

/** wrappers for functions based on flags they set **/

function make_arith(f, n, regs=[n-1], store=true)
{
    function arith_flags(operands, result)
    {
        result_flags(result);
        // msb of both operands differs from msb of result
        const o1 = operands[0];
        const o2 = (operands.length == 2)? operands[1] : o1;
        const m1 = msb(o1);
        const m2 = msb(o2);
        flags["OF"] = (m1 == m2) && (m1 != m2)
    }
    return make_op(f, n, arith_flags, regs, store)
}

function make_logic(f, n, regs=[n-1],store=true)
{
    function logic_flags(operands, result)
    {
        result_flags(result);
        flags["OF"] = false;
    }
    return make_op(f, n, logic_flags, regs, store)
}

function make_none(f,n,regs=[n-1], store=true)
{
    return make_op(f, n, function(x,y){}, regs, store)
}

function make_jump(cond)
{
    return make_none(function(x){ if (cond()) ip = x[0];}, 1, [], false);
}

function get_ops()
{
    let ops = {};

    // D + S
    ops["add"] = make_arith( function(x){ return x[1] + x[0]; }, 2);
 
    // D - S
    ops["sub"] = make_arith( function(x){ return x[1] - x[0]; }, 2);

    // D * S
    ops["mul"] = make_arith( function(x){ return x[1] * x[0]; }, 2);

    // D / S
    ops["div"] = make_arith( function(x){ return Math.floor(x[1] / x[0]); }, 2);

    // D++
    ops["inc"] = make_arith( function(x){ return x[0] + 1; }, 1);
    
    // D--
    ops["dec"] = make_arith( function(x){ return x[0] - 1; }, 1);

    // D << S (same for both arithmetic and logical)
    ops["sal"] = make_logic( function(x){ return x[1] << x[0]; }, 2);
    ops["shl"] = ops["sal"];

    // D >> S (arithmetic, sign-extend)
    ops["sar"] = make_logic( function(x){ return x[1] >> x[0]; }, 2);
    
    // D >> S (logical, zero-fill)
    ops["shr"] = make_logic( function(x){ return x[1] >>> x[0]; }, 2);

    // -D
    ops["neg"] = make_logic( function(x){ return -1*x[0]; }, 1);

    // D & S
    ops["and"] = make_logic( function(x){ return x[1] & x[0]; }, 2);

    // D | S
    ops["or"] = make_logic( function(x){ return x[1] | x[0]; }, 2);

    // ~D
    ops["not"] = make_logic( function(x){ return ~x[0]; }, 1)

    // D ^ S
    ops["xor"] = make_logic( function(x){ return x[1] ^ x[0]; }, 2);

    // D = S
    ops["mov"] = make_none( function(x){ return x[0]; }, 2, [0,1]);

    // increments %rsp, then pushes S onto stack at pos %rsp
    ops["push"] = make_none( function(x){ stack[++registers["rsp"]] = x[0]; }, 1, [], false);

    // pops stack value at pos %rsp into D, then decrements %rsp
    ops["pop"] = make_none( function(x){ return stack[registers["rsp"]--]; }, 1);
    
    // compares flags based on S2 - S1
    ops["cmp"] = make_arith( function(x){ return x[1] - x[0]; }, 2, [], false);

    // compares flags based on S2 & S1
    ops["test"] = make_arith( function(x){ return x[1] & x[0]; }, 2, [], false);

    // jumps to line specified by operand
    ops["jmp"] = make_jump( function(){ return true; });
    
    // jump condition: ZF
    ops["je"] = make_jump( function(){ return flags["ZF"]; } );

    // jump condition: ~ZF
    ops["jne"] = make_jump( function(){ return !flags["ZF"]; } );

    // jump condition: SF
    ops["js"] = make_jump( function(){ return flags["SF"]; } );

    // jump condition: ~SF
    ops["jns"] = make_jump( function(){ return !flags["SF"]; } );

    // jump condition: ~(SF^OF) & ~ZF
    ops["jg"] = make_jump( function(){ return flags["SF"] == flags["OF"] && !flags["ZF"]; } );

    // jump condition: ~(SF^OF)
    ops["jge"] = make_jump( function(){ return flags["SF"] == flags["OF"]; } );

    // jump condition: (SF^OF)
    ops["jl"] = make_jump( function(){ return flags["SF"] != flags["OF"]; } );

    // jump condition: (SF^OF) | ZF
    ops["jle"] = make_jump( function(){ return flags["SF"] != flags["OF"] || flags["ZF"]; } );

    return ops;
}
