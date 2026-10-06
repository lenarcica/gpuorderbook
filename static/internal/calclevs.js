//////////////////////////////////////////////////////////////////////////
// calclevs.js
//
// Alan Lenarcic
//
const ALGOS = {
  "NUM_LEVS":0,
  "NUM_OCC_LEVS":1,
  "NUM_PENNIES":2,
  "TOTAL_SHARES":3,
  "TOTAL_DOLLARS":4,
  "PCT_LEVEL":5,
  "MULT_SPREAD":6
}

function blank_mkt(u_prices,dir) {
  return({ "prices":u_prices, "dir": dir > 0 ? 1 : -1;
    "qty": Array.from({ length: u_prices.length }, () => 0n),
    "next": Array.from({length:u_prices.length }, ()=>-1),
    "prev": Array.from({length:u_prices.length }, ()=>-1),
   })
}

