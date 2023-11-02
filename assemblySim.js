const register_names = ["rax","rbx","rcx","rdx","rsi","rdi","rbp","rsp","r8","r9","r10","r11","r12","r13","r14","r15"];
const register_args = ["rdi","rsi","rdx","rcx","r8","r9"];
const flag_names = ["ZF", "SF", "OF"];
const instructions = get_ops();
let stack = [];
let labels = {};
let registers = {};
let flags = {};
let ip = 0;
let debug = false; // used to print errors instead of alerting during testing

function syntax_error(str)
{
    error("Syntax", str);
}

function runtime_error(str)
{
    error("Runtime", str);
}

function input_error(str)
{
    error("Input", str, false);
}

function error(type, str, line_num=true)
{
    const error = `${type} error${line_num? ` on line ${ip}`:""}: ${str}`;
    (debug)? console.log(error) : alert(error);
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

function to_number(value)
{
    const n = Number(value);
    return (isNaN(n) || n < 0 || to_32bit(n) != n || Number(value) != n)? NaN : n;
}

function is_noop(line)
{
    // empty lines, comments, and labels treated as no-ops
    return (!line || line[0] == "#" || (line[0] == "." && line[line.length -1] == ":"));
}

/** operand parsing **/

function is_immediate(arg)
{
    return arg.charAt(0) == '$';
}

function is_register(arg)
{
    return arg.charAt(0) == '%' && register_names.includes(arg.substring(1));
}

function is_label(arg)
{
    return arg.charAt(0) == '.' && arg in labels;
}

function check_type(arg, types)
{
    // check that argument is one of a list of types 
    for (const c of types)
    {
        switch(c)
        {
            case "I":
                if (is_immediate(arg))
                    return true;
                break;
            case "R":
                if (is_register(arg))
                    return true;
                break;
            case "L":
                if (is_label(arg))
                    return true;
                break;
            default:
                return false;
        }
    }
    return false;
}

function types_to_names(types)
{
    const typenames = {"I":"Immediate", "R":"Register", "L":"Label"};
    return types.split("").map((x)=>{return typenames[x];}).join(", ");
}

function check_args(args, types)
{
    const n = types.length;
    if (args.length != n)
    {
        syntax_error(`Expected ${n} arguments, found ${args.length}`);
        return false;
    }
    
    for (var i = 0; i < n; i++)
    {
        const t = types[i];
        const arg = args[i];
        if (!check_type(arg, t))
        {
            syntax_error(`Argument ${i} [${arg}] must be one of the following: [${types_to_names(t)}]`);
            return false;
        }
    }

    return true;
}

function check_line(line)
{
    // check that instructions are valid
    const tokens = line.split(/\s+/);
    const op = tokens[0];
    if (!(op in instructions))
    {
        syntax_error(`Unrecognized instruction [${op}]`);
        return false;
    }

    // check that arguments for selected instruction are valid
    return check_args(tokens.slice(1), instructions[op][1]);
}

function prepass(code)
{
    labels = {};
    label_operations = []

    // do a pass over the code to check syntax 
    const lines = code.split("\n");
    for (ip = 0; ip < lines.length; ip++)
    {
        const line = lines[ip].trim();
        if (/\..*:/.test(line))
        {        
            // if line is a valid label, record its position
            const label = line.substring(0, line.length-1);
            if (/\s/.test(label))
            {
                syntax_error(`Label [${label}] must not have spaces`);
                return false;
            }
            else if (label in labels)
            {
                syntax_error(`Label [${label}] defined multiple times`);
                return false;
            }
            labels[label] = ip;
            continue;
        }
        else if (/\.\w+/.test(line))
        {
            // defer checking label ops until all labels registered
            label_operations.push([line, ip]);
            continue;
        }

        if (is_noop(line))
            continue;

        if (!check_line(line))
            return false;
    }

    // check label ops now that all labels are registered
    for (const lo of label_operations)
    {
        ip = lo[1];
        if (!check_line(lo[0]))
            return false;
    }

    return true;
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
            const arg = input_args[r];
            value = to_number(arg);
            if (isNaN(value))
            {
                input_error(`Invalid input argument [${arg}] for register [%${r}]`);
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

/** parsing functions **/

function parse(code, input_args = {}, maxIters = 10000)
{
    if (!prepass(code))
        return false;

    if (!init(input_args))
        return false;

    let count = 0;
    const lines = code.split("\n");
    const len = lines.length;
    while (ip < len)
    {
        if (count > maxIters)
        {
            runtime_error(`Program exceeded ${maxIters} iterations. Terminating.`);
            return false;
        }

        // store current instruction pointer value
        const current = ip;
        
        if (!parse_line(lines[ip]))
            return false;
        
        // control instruction error handling
        if (ip < 0 || ip >= len)
        {
            runtime_error(`Invalid jump destination [${ip}]`)
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
    if (is_noop(line))
        return true;

    const tokens = line.split(/\s+/);
    return instructions[tokens[0]][0](tokens.slice(1));
}

function evaluate_args(args)
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
                    runtime_error(`Immediate value [${a}] is not a positive 32-bit integer`);
                    return null;
                }
                values.push(n);
                break;
            case '%':
                // register
                values.push(registers[value]);
                break;
            case '.':
                // label
                values.push(labels[a]);
                break;
            default:
                runtime_error(`Invalid operand form [${a}]`);
                return null;
        }
    }
    return values;
}

// Generic function for handling an instruction with n arguments.
// The types parameter is a list of types that the arguments must match.
// The flag parameter is a function that dictates how condition codes should be set.
function handle_op(op, args, flag, store)
{
    const values = evaluate_args(args);
    if (!values)
        return false;

    // calculate raw result
    const raw = op(values);
    
    // convert to 32-bit result and store if needed
    if (store)
    {
        // verify that operation yielded valid result before storing
        if (isNaN(raw))
        {
            runtime_error(`Operation with arguments [${values.join(", ")}] resulted in NaN`);
            return false;
        }
        registers[args[args.length-1].substring(1)] = to_32bit(raw);
    }

    // set condition codes
    flag(raw);
    
    return true;
}

// Wrappers for making operator functions.
// By default assumes last argument should be a register.
function make_op(f,types,flag,store)
{
    return [(args)=>{ return handle_op(f, args, flag, store); }, types];
}

/** flag handling **/

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

function make_arith(f, types, store=true)
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
    return make_op(f, types, arith_flags, store);
}

function make_logic(f, types, store=true)
{
    function logic_flags(result)
    {
        result_flags(result);
        flags["OF"] = 0;
    }
    return make_op(f, types, logic_flags, store);
}

function make_none(f, types, store=true)
{
    return make_op(f, types, (x)=>{}, store);
}

function make_jump(cond, types=["IL"])
{
    return make_none((x)=>{ if (cond() == 1) ip = x[0];}, types, false);
}

/** operator functions **/

function get_ops()
{
    const flag_ops = get_flag_ops();

    let ops = {};
    const sd = ["IR", "R"];
    const d = ["R"];

    // D + S
    ops["add"] = make_arith( (x)=>{ return x[1] + x[0]; }, sd);
 
    // D - S
    ops["sub"] = make_arith( (x)=>{ return x[1] - x[0]; }, sd);

    // D * S
    ops["mul"] = make_arith( (x)=>{ return x[1] * x[0]; }, sd);

    // D / S
    ops["div"] = make_arith( (x)=>{ return Math.floor(x[1] / x[0]); }, sd);

    // D++
    ops["inc"] = make_arith( (x)=>{ return x[0] + 1; }, d);
    
    // D--
    ops["dec"] = make_arith( (x)=>{ return x[0] - 1; }, d);

    // D << S (same for both arithmetic and logical)
    ops["sal"] = make_logic( (x)=>{ return x[1] << x[0]; }, sd);
    ops["shl"] = ops["sal"];

    // D >> S (arithmetic, sign-extend)
    ops["sar"] = make_logic( (x)=>{ return x[1] >> x[0]; }, sd);
    
    // D >> S (logical, zero-fill)
    ops["shr"] = make_logic( (x)=>{ return x[1] >>> x[0]; }, sd);

    // -D
    ops["neg"] = make_logic( (x)=>{ return -1*x[0]; }, d);

    // D & S
    ops["and"] = make_logic( (x)=>{ return x[1] & x[0]; }, sd);

    // D | S
    ops["or"] = make_logic( (x)=>{ return x[1] | x[0]; }, sd);

    // ~D
    ops["not"] = make_logic( (x)=>{ return ~x[0]; }, d)

    // D ^ S
    ops["xor"] = make_logic( (x)=>{ return x[1] ^ x[0]; }, sd);

    // D = S
    ops["mov"] = make_none( (x)=>{ return x[0]; }, ["R","R"]);

    // increments %rsp, then pushes S onto stack at pos %rsp
    ops["push"] = make_none( (x)=>{ stack[++registers["rsp"]] = x[0]; }, ["IR"], false);

    // pops stack value at pos %rsp into D, then decrements %rsp
    ops["pop"] = make_none( (x)=>{ return stack[registers["rsp"]--]; }, d);
    
    // compares flags based on S2 - S1
    ops["cmp"] = make_arith( (x)=>{ return x[1] - x[0]; }, sd, false);

    // compares flags based on S2 & S1
    ops["test"] = make_logic( (x)=>{ return x[1] & x[0]; }, sd, false);

    // D = ZF
    ops["sete"] = make_none( (x)=>{ return flag_ops["e"](); }, d);

    // D = ~ZF
    ops["setne"] = make_none( (x)=>{ return flag_ops["ne"](); }, d);

    // D = SF
    ops["sets"] = make_none( (x)=>{ return flag_ops["s"](); }, d);

    // D = ~ZF
    ops["setns"] = make_none( (x)=>{ return flag_ops["ns"](); }, d);

    // D = ~(SF ^ OF) & ~ZF
    ops["setg"] = make_none( (x)=>{ return flag_ops["g"](); }, d);

    // D = ~(SF ^ OF)
    ops["setge"] = make_none( (x)=>{ return flag_ops["ge"](); }, d);

    // D = SF ^ OF
    ops["setl"] = make_none( (x)=>{ return flag_ops["l"](); }, d);

    // D = (SF ^ OF) | ZF
    ops["setle"] = make_none( (x)=>{ return flag_ops["le"](); }, d);

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
