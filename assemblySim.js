const register_names = ["rax","rbx","rcx","rdx","rsi","rdi","rbp","rsp","r8","r9","r10","r11","r12","r13","r14","r15"];
const register_args = ["rdi","rsi","rdx","rcx","r8","r9"];
const flag_names = ["ZF", "SF", "OF"];
const instructions = get_ops();
let stack = [];
let registers = {};
let flags = {};
let ip = 0;
debug = false; // used to disable alerts during testing

function to_number(value)
{
    const n = Number(value);
    return (isNaN(n) || n < 0 || to_32bit(n) != n || Number(value) != n)? NaN : n;
}

function init(input_args)
{
    // initialize register values
    const arg_regs = Object.keys(input_args);
    for (const r of register_names)
    {
        let value = 0;
        if (arg_regs.includes(r))
        {
            value = to_number(input_args[r]);
            if (isNaN(value))
            {
                if(!debug)
                    alert(`Error: Invalid input argument [%${r}]`);
                return false;
            }
        }
        registers[r] = value;
    }

    // clear flag values
    for (const f of flag_names)
    {
        flags[f] = 0;
    }

    // reset stack and instruction pointer
    stack = [];
    ip = 0;

    return true;
}

function error(str)
{
    if (!debug)
        alert(`Error on line ${ip}: ${str}`);
}

function parse(code, input_args = {}, maxIters = 10000)
{
    if (!init(input_args))
        return false;

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

function get_parse_result(code, args)
{
    // if parsing successful, get return value stored in rax register
    if (parse(code, args))
        return String(registers["rax"]);
    return "ERROR"
}

function parse_line(line)
{
    line = line.trim();

    // empty line - no-op
    if(!line)
        return true;

    // comment - no-op
    if(line[0] == "#")
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

function to_32bit(x)
{
    /*
     * This takes advantage of two quirks of JavaScript:
     * 1. Bitwise operations only handle 32-bit operands.
     * 2. Javascript actually stores values as 64-bit floats.
     * The following will convert x to a 32-bit int, ensure those 32 
     * bits are unchanged, and then convert it back to 64 bits,
     * effectively restricting the value of x to a 32-bit range.
     */
    return x | 0;
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
                const n = to_number(value);
                if (isNaN(n))
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

    // calculate raw result
    const raw = op(values);

    // set condition codes
    flag(raw);

    // convert to 32-bit result and store if needed
    if (store)
        registers[args[n-1].substring(1)] = to_32bit(raw);
    
    return true;
}

// Wrappers for making operator functions.
// By default assumes last argument should be a register.
function make_op(f,n,flag,regs,store)
{
    return (args)=>{ return handle_op(f, args, n, flag, regs, store); };
}

function msb(x)
{
    return (x >> 31) & 1;
}

function result_flags(raw)
{
    const result = to_32bit(raw);
    flags["ZF"] = (result == 0)? 1 : 0;
    flags["SF"] = msb(result);
}

/** wrappers for functions based on flags they set **/

function make_arith(f, n, regs=[n-1], store=true)
{
    function arith_flags(raw)
    {
        result_flags(raw);
        /*
         * JavaScript's weird 64-bit storage/32-bit bitwise ops
         * restriction means we can check for overflow simply
         * by seeing if the raw result is within the 32-bit range.
         */ 
        flags["OF"] = (to_32bit(raw) == raw)? 0 : 1;
    }
    return make_op(f, n, arith_flags, regs, store)
}

function make_logic(f, n, regs=[n-1],store=true)
{
    function logic_flags(result)
    {
        result_flags(result);
        flags["OF"] = 0;
    }
    return make_op(f, n, logic_flags, regs, store)
}

function make_none(f,n,regs=[n-1], store=true)
{
    return make_op(f, n, (x,y)=>{}, regs, store)
}

function make_jump(cond)
{
    return make_none((x)=>{ if (cond() == 1) ip = x[0];}, 1, [], false);
}

function get_ops()
{
    const flag_ops = get_flag_ops();

    let ops = {};

    // D + S
    ops["add"] = make_arith( (x)=>{ return x[1] + x[0]; }, 2);
 
    // D - S
    ops["sub"] = make_arith( (x)=>{ return x[1] - x[0]; }, 2);

    // D * S
    ops["mul"] = make_arith( (x)=>{ return x[1] * x[0]; }, 2);

    // D / S
    ops["div"] = make_arith( (x)=>{ return Math.floor(x[1] / x[0]); }, 2);

    // D++
    ops["inc"] = make_arith( (x)=>{ return x[0] + 1; }, 1);
    
    // D--
    ops["dec"] = make_arith( (x)=>{ return x[0] - 1; }, 1);

    // D << S (same for both arithmetic and logical)
    ops["sal"] = make_logic( (x)=>{ return x[1] << x[0]; }, 2);
    ops["shl"] = ops["sal"];

    // D >> S (arithmetic, sign-extend)
    ops["sar"] = make_logic( (x)=>{ return x[1] >> x[0]; }, 2);
    
    // D >> S (logical, zero-fill)
    ops["shr"] = make_logic( (x)=>{ return x[1] >>> x[0]; }, 2);

    // -D
    ops["neg"] = make_logic( (x)=>{ return -1*x[0]; }, 1);

    // D & S
    ops["and"] = make_logic( (x)=>{ return x[1] & x[0]; }, 2);

    // D | S
    ops["or"] = make_logic( (x)=>{ return x[1] | x[0]; }, 2);

    // ~D
    ops["not"] = make_logic( (x)=>{ return ~x[0]; }, 1)

    // D ^ S
    ops["xor"] = make_logic( (x)=>{ return x[1] ^ x[0]; }, 2);

    // D = S
    ops["mov"] = make_none( (x)=>{ return x[0]; }, 2, [0,1]);

    // increments %rsp, then pushes S onto stack at pos %rsp
    ops["push"] = make_none( (x)=>{ stack[++registers["rsp"]] = x[0]; }, 1, [], false);

    // pops stack value at pos %rsp into D, then decrements %rsp
    ops["pop"] = make_none( (x)=>{ return stack[registers["rsp"]--]; }, 1);
    
    // compares flags based on S2 - S1
    ops["cmp"] = make_arith( (x)=>{ return x[1] - x[0]; }, 2, [], false);

    // compares flags based on S2 & S1
    ops["test"] = make_logic( (x)=>{ return x[1] & x[0]; }, 2, [], false);

    // D = ZF
    ops["sete"] = make_none( (x)=>{ return flag_ops["e"](); }, 1);

    // D = ~ZF
    ops["setne"] = make_none( (x)=>{ return flag_ops["ne"](); }, 1);

    // D = SF
    ops["sets"] = make_none( (x)=>{ return flag_ops["s"](); }, 1);

    // D = ~ZF
    ops["setns"] = make_none( (x)=>{ return flag_ops["ns"](); }, 1);

    // D = ~(SF ^ OF) & ~ZF
    ops["setg"] = make_none( (x)=>{ return flag_ops["g"](); }, 1);

    // D = ~(SF ^ OF)
    ops["setge"] = make_none( (x)=>{ return flag_ops["ge"](); }, 1);

    // D = SF ^ OF
    ops["setl"] = make_none( (x)=>{ return flag_ops["l"](); }, 1);

    // D = (SF ^ OF) | ZF
    ops["setle"] = make_none( (x)=>{ return flag_ops["le"](); }, 1);

    // jumps to line specified by operand
    ops["jmp"] = make_jump( ()=>{ return 1; });
    
    // jump condition: ZF
    ops["je"] = make_jump( ()=>{ return flag_ops["e"](); } );

    // jump condition: ~ZF
    ops["jne"] = make_jump( ()=>{ return flag_ops["ne"](); } );

    // jump condition: SF
    ops["js"] = make_jump( ()=>{ return flag_ops["s"](); } );

    // jump condition: ~SF
    ops["jns"] = make_jump( ()=>{ return flag_ops["ns"](); } );

    // jump condition: ~(SF^OF) & ~ZF
    ops["jg"] = make_jump( ()=>{ return flag_ops["g"](); } );

    // jump condition: ~(SF^OF)
    ops["jge"] = make_jump( ()=>{ return flag_ops["ge"](); } );

    // jump condition: (SF^OF)
    ops["jl"] = make_jump( ()=>{ return flag_ops["l"](); } );

    // jump condition: (SF^OF) | ZF
    ops["jle"] = make_jump( ()=>{ return flag_ops["le"](); } );

    return ops;
}

function get_flag_ops()
{    
    function bit(f)
    {
        return f() & 1;
    }

    let ops = {};

    ops["e"] = ()=>{ return bit(()=>{ return flags["ZF"]; })};
    ops["ne"] = ()=>{ return bit(()=>{ return ~flags["ZF"]; })};
    ops["s"] = ()=>{ return bit(()=>{ return flags["SF"]; })};
    ops["ns"] = ()=>{ return bit(()=>{ return ~flags["SF"]; })};
    ops["g"] = ()=>{ return bit(()=>{ return ~(flags["SF"] ^ flags["OF"]) & ~flags["ZF"]; })};
    ops["ge"] = ()=>{ return bit(()=>{ return ~(flags["SF"] ^ flags["OF"]); })};
    ops["l"] = ()=>{ return bit(()=>{ return flags["SF"] ^ flags["OF"]; })};
    ops["le"] = ()=>{ return bit(()=>{ return (flags["SF"] ^ flags["OF"]) | flags["ZF"]; })};

    return ops;
}
