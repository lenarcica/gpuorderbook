function my_printer(verbose, vstr) {
  return(function (int, txt) {
    if (verbose >= int) {
      console.log(vstr + txt);
    }
  })
}


// verbose_ob = {'s':[],'verbose':2}; verbose=2; PRINT_N=make_print_n(verbose_ob, 'BASIC:');
// Slightly more advanced printer, here we require an object input, but we will
//   create function that adjusts complete string
// Print to console, and also save whole dialog string, maybe for later study, or
//  output into other analytics.
const example_verbose_ob={'s':[],'verbose':0};
const make_print_n = function(verbose_ob, stt) {
   const verbose = verbose_ob.verbose;
   if ((verbose_ob === undefined) || (verbose_ob === null) || (verbose_ob === false)) {
     console.log("make_print_n: It does not make sense, verbose_ob is weird: check.");
     return(null);
   }
   if (typeof(verbose_ob) != 'object') {
     console.log("make_print_n: error, verbose_ob is not an object."); return(null);
   } 
   if (typeof(stt) !== 'string') {
     console.log("make_print_n, error typeof(stt) = " + typeof(stt)); debugger;
   }
   if ((verbose === null)  || (verbose === undefined)) {
     console.log("make_print_n: Error  verbose is some invalid type!."); debugger;
   }
   if (!('s' in verbose_ob)) {
     console.log("make_print_n: Error, verbose_ob has no s array.");
   } else if (!(Array.isArray(verbose_ob.s))) {
     console.log("make_print_n: Error verbose_ob.s is not an array.");
   }
   const new_print = (verbose, verbose_ob,stt) => (n,xstr) => {
     if (typeof(stt) !== 'string') {
       console.log("make_print_n->new_print: Error, stt is not a string."); debugger;
     }
     if (typeof(xstr) !== 'string') {
       console.log("make_print_n->new_print: Error, xstr is not a string."); debugger;
     } 
     if (typeof(n) != 'number') {
       console.log("make_print_n->new_print: Error, n is not a number."); debugger;
     }
     const st_out = stt + xstr;
     if (!(Array.isArray(verbose_ob.s))) {
       console.log("make_print_n->new_print: ERROR verbose_ob.s is not an array");
       debugger;
     }
     try {
       if (n == -6) {
         verbose_ob.s.push(("ERROR --- " + st_out));
         console.log("ERROR --- " + st_out);
       } else if (n <= verbose) {
         verbose_ob.s.push(st_out);
         console.log(st_out);
       }
     } catch {
       console.log("make_print_n->new_print Error occured on attempt to print."); debugger;
     }
   }
   const out_print = new_print(verbose, verbose_ob,stt);
   return(out_print);
}

function is_numeric(X) {
  if (X === null) { return(false); }
  if (X === undefined) { return(false); }
  if ( (typeof X) == "object" ) { return(false); }
  if  ( ((typeof X) == "number") && (Number.isFinite(X)) && !(isNaN(X)) ) {
      return(true);
  }
  return(false);
}
function is_positive_numeric(X) {
  if (X === null) { return(false); }
  if (X === undefined) { return(false); }
  if (typeof(X) == 'object') { return(false); }
  if (is_numeric(X)) {
     if (X > 0) { return(true); }
  }
  return(false);
}
const exports = {"my_printer":my_printer, "is_numeric":is_numeric, "is_positive_numeric":is_positive_numeric,
  "make_print_n":make_print_n};
module.exports = exports;
module.export = exports;

