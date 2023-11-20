"use strict";
const register_names = ["rax","rbx","rcx","rdx","rsi","rdi","rbp","rsp","r8","r9","r10","r11","r12","r13","r14","r15"];
const register_args = ["rdi","rsi","rdx","rcx","r8","r9"];
const flag_names = ["ZF", "SF", "OF"];
const instructions = get_ops();
let stack = [];
let memory = [];
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
    debug? console.warn(error) : alert(error);
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
    return (to_32bit(n) == n)? n : NaN;
}

function is_noop(line)
{
    // empty lines, comments, and labels treated as no-ops
    return (!line || line[0] == "#" || (line[0] == "." && line[line.length -1] == ":"));
}

/** operand parsing **/

function is_immediate(arg)
{
    const n = to_number(arg.substring(1));
    return arg.charAt(0) == '$' && !isNaN(n);
}

function is_register(arg)
{
    return arg.charAt(0) == '%' && register_names.includes(arg.substring(1));
}

function is_label(arg)
{
    return arg.charAt(0) == '.' && arg in labels;
}

function is_memory(arg)
{
    // immediate memory reference
    const imm = arg.match(/^\d+$/);
    if (imm)
        return !isNaN(to_number(imm[0]));

    // register memory reference
    const tag = arg.match(/^(-?\d*)\((.*)\)/);
    if (!tag || isNaN(to_number(tag[1])))
        return false;

    const values = tag[2].split(',');
    switch(values.length)
    {
        case 1:
        case 2:
            return values.every(is_register)
        case 3:
            return (values[0] == "" || is_register(values[0])) && is_register(values[1]) && /^[1,2,4,8]$/.test(values[2]);
        default:
            return false;
    }
}

function get_arg_type(arg)
{
    if (is_immediate(arg))
        return "I"; // immediate
    else if (is_register(arg))
        return "R"; // register
    else if (is_label(arg))
        return "L"; // label
    else if (is_memory(arg))
        return "M"; // memory
    else
        return "E"; // error
}

function check_type(arg, types)
{
    // check that argument is one of a list of types
    return RegExp(get_arg_type(arg)).test(types);
}

function arg_types_to_names(types)
{
    const typenames = {"I":"Immediate", "R":"Register", "L":"Label", "M":"Memory"};
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
            syntax_error(`Argument ${i} [${arg}] must be one of the following: [${arg_types_to_names(t)}]`);
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

    // do a pass over the code to check syntax
    let label_operations = [];
    const lines = code.split("\n");
    for (ip = 0; ip < lines.length; ip++)
    {
        const line = lines[ip].trim();
        if (/^\..*:/.test(line))
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
    for (const reg of register_names)
    {
        let value = 0;
        if (arg_regs.includes(reg))
        {
            const arg = input_args[reg];
            value = to_number(arg);
            if (isNaN(value))
            {
                input_error(`Invalid input argument [${arg}] for register [%${reg}]`);
                return false;
            }
        }
        registers[reg] = value;
    }

    // clear flag values
    for (const f of flag_names)
    {
        flags[f] = 0;
    }

    // reset stack, memory, and instruction pointer
    stack = [];
    memory = [];
    ip = 0;

    return true;
}

/** parsing functions **/

function parse(code, input_args={}, max_iters=10000)
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
        if (count > max_iters)
        {
            runtime_error(`Program exceeded ${max_iters} iterations. Terminating.`);
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
    return (parse(code, args))? String(registers["rax"]) : "ERROR";
}

function parse_line(line)
{
    line = line.trim();
    if (is_noop(line))
        return true;

    const tokens = line.split(/\s+/);
    return instructions[tokens[0]][0](tokens.slice(1));
}

function load_address(arg)
{
    const pure_imm = arg.match(/^\d+$/);
    if (pure_imm)
        return to_number(pure_imm[0]);

    const tag = arg.match(/^(-?\d)*\((.*)\)/);
    let imm = to_number(tag[1]);
    imm = isNaN(imm)? 0 : imm;

    let b = 0, i = 0, s = 1;
    const values = tag[2].split(',');
    switch(values.length)
    {
        case 3:
            s = to_number(values[2]);
        case 2:
            i = registers[values[1].substring(1)];
        case 1:
            b = (values[0] == "")? 0 : registers[values[0].substring(1)];
            break;
        default:
            return NaN;
    }
    return imm + b + (i * s);
}

function reference_address(arg)
{
    const addr = load_address(arg);
    if (isNaN(addr) || addr < 0)
    {
        runtime_error(`${arg} yielded invalid memory address ${addr}`);
        return NaN;
    }
    return isNaN(memory[addr])? 0 : memory[addr];
}

function evaluate_args(args)
{
    let values = [];
    for (const arg of args)
    {
        const value = arg.substring(1);
        switch(get_arg_type(arg))
        {
            case 'I':
                // immediate
                values.push(to_number(value));
                break;
            case 'R':
                // register
                values.push(registers[value]);
                break;
            case 'L':
                // label
                values.push(labels[arg]);
                break;
            case 'M':
                // memory
                const addr = reference_address(arg);
                if (isNaN(addr))
                    return null;
                values.push(addr);
                break;
            default:
                runtime_error(`Unknown argument type for ${arg}`);
                return null;
        }
    }
    return values;
}

// Generic function for handling an instruction with n arguments.
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
        const result = to_32bit(raw);

        const dest = args[args.length-1];
        switch (get_arg_type(dest))
        {
            case "R":
                registers[dest.substring(1)] = result;
                break;
            case "M":
                memory[load_address(dest)] = result;
                break;
            default:
                runtime_error(`Invalid destination ${dest}`);
                return false;
        }
    }

    // set condition codes
    flag(raw);

    return true;
}

/** Wrappers and helpers for making operator functions. */

function make_op(f, types, flag, store, cond=null)
{
    function op(args)
    {
        return handle_op(f, args, flag, store);
    }
    // if a condition is passed in, wrap it around op
    return [ cond? (args)=>{ return cond()? op(args) : true; } : op, types];
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

function make_none(f, types, store=true, cond=null)
{
    return make_op(f, types, (x)=>{}, store, cond);
}

function get_flag_ops()
{
    function bit(f)
    {
        return f() & 1;
    }

    let ops = {};

    ops["e"] = ()=>{ return bit(()=>{ return flags["ZF"]; })};
    ops["z"] = ops["e"];
    ops["ne"] = ()=>{ return bit(()=>{ return ~flags["ZF"]; })};
    ops["nz"] = ops["ne"];
    ops["s"] = ()=>{ return bit(()=>{ return flags["SF"]; })};
    ops["ns"] = ()=>{ return bit(()=>{ return ~flags["SF"]; })};
    ops["g"] = ()=>{ return bit(()=>{ return ~(flags["SF"] ^ flags["OF"]) & ~flags["ZF"]; })};
    ops["nle"] = ops["g"];
    ops["ge"] = ()=>{ return bit(()=>{ return ~(flags["SF"] ^ flags["OF"]); })};
    ops["nl"] = ops["ge"];
    ops["l"] = ()=>{ return bit(()=>{ return flags["SF"] ^ flags["OF"]; })};
    ops["nge"] = ops["l"];
    ops["le"] = ()=>{ return bit(()=>{ return (flags["SF"] ^ flags["OF"]) | flags["ZF"]; })};
    ops["ng"] = ops["le"];

    return ops;
}

function make_cond_ops(ops, prefix, make_function)
{
    const flag_ops = get_flag_ops();
    const cond_names = Object.keys(flag_ops);
    for (const op of cond_names)
    {
        ops[`${prefix}${op}`] = make_function(flag_ops[op]);
    }
}

/** operator functions **/

function get_ops()
{
    let ops = {};
    const sd = ["IRM", "RM"];
    const s = ["IRM"];
    const d = ["RM"];

    // D + S
    ops["add"] = make_arith( (x)=>{ return x[1] + x[0]; }, sd);

    // D - S
    ops["sub"] = make_arith( (x)=>{ return x[1] - x[0]; }, sd);

    // D * S
    ops["mul"] = make_arith( (x)=>{ return x[1] * x[0]; }, sd);

    // Special case for division:
    // %rdx = %rax % S, %rax = %rax / S
    function div(x)
    {
        registers["rdx"] = registers["rax"] % x[0];
        // ensure quotient isn't floating point
        registers["rax"] = to_32bit(registers["rax"] / x[0]);
    }
    ops["div"] = make_none( div, s, false);

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
    ops["neg"] = make_arith( (x)=>{ return -1*x[0]; }, d);

    // D & S
    ops["and"] = make_logic( (x)=>{ return x[1] & x[0]; }, sd);

    // D | S
    ops["or"] = make_logic( (x)=>{ return x[1] | x[0]; }, sd);

    // ~D
    ops["not"] = make_none( (x)=>{ return ~x[0]; }, d);

    // D ^ S
    ops["xor"] = make_logic( (x)=>{ return x[1] ^ x[0]; }, sd);

    // increments %rsp, then pushes S onto stack at pos %rsp
    ops["push"] = make_none( (x)=>{ stack[++registers["rsp"]] = x[0]; }, s, false);

    // pops stack value at pos %rsp into D, then decrements %rsp
    ops["pop"] = make_none( (x)=>{ return stack[registers["rsp"]--]; }, d);

    // compares flags based on S2 - S1
    ops["cmp"] = make_arith( (x)=>{ return x[1] - x[0]; }, sd, false);

    // compares flags based on S2 & S1
    ops["test"] = make_logic( (x)=>{ return x[1] & x[0]; }, sd, false);

    // set operations
    function make_set(cond)
    {
        return make_none( (x)=>{ return cond(); }, d)
    }
    make_cond_ops(ops, "set", make_set);

    // jump operations
    function make_jump(cond=null)
    {
        return make_none( (x)=>{ ip = x[0]; }, ["IL"], false, cond);
    }
    ops["jmp"] = make_jump();
    make_cond_ops(ops, "j", make_jump);

    // move operations
    function make_move(cond=null)
    {
        return make_none( (x)=>{ return x[0]; }, ["RM", "RM"], true, cond);
    }
    ops["mov"] = make_move();
    make_cond_ops(ops, "cmov", make_move);

    return ops;
}
