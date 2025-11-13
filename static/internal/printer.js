function my_printer(verbose, vstr) {
  return(function (int, txt) {
    if (verbose >= int) {
      console.log(vstr + txt);
    }
  })
}


function is_numeric(X) {
  if (X === null) { return(false); }
  if (X === undefined) { return(false); }
  if  ( (typeof X == "number") && (Number.isFinite(X)) && !(isNaN(X)) ) {
      return(true);
  }
  return(false);
}
function is_positive_numeric(X) {
  if (X === null) { return(false); }
  if (X === undefined) { return(false); }
  if (is_numeric(X)) {
     if (X > 0) { return(true); }
  }
  return(false);
}
const exports = {"my_printer":my_printer, "is_numeric":is_numeric, "is_positive_numeric":is_positive_numeric};
module.exports = exports;
module.export = exports;

