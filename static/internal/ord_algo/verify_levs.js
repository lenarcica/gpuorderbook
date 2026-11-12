///~/////////////////////////////////////////////
///  verify_levs.js
///
/// vAlan Lenarcic (2024 in Rust), 2026 translation to JS
//
///  Verify a NBBO sequence against arbitrary ordered series of resting price requests
///
///  Searches for situation where a break occurs and the resting order in question
///  either violateds NBBO sequence or comes within a pre-determined distance 'pdiff' of goal
///
//use itertools::Itertools;
//
const printer = require('../printer.js');
const pretty_num = require('../../internal_lib/pretty_num.js');
const basic_hms = pretty_num.basic_hms;

///~///////////////////////////////////////////////////////////////////////
/// Safely subtract one from a BigInt
///
/// In Rust, it can be annoying that we have to create safety checks a lot in terms of a try_from
/// Ideally a macro might save space here, though often we can safely subtract 1 from
/// this value
//macro_rules!um1{
//  ($u0:expr) => { match usize::try_from(if $u0 == 0 {0 as i64} else {($u0 as i64)-1}) {Ok(val)=>val,Err(_e)=>0}}
//}
const um1 = (u0) => ((typeof(u0)=='bigint') ? ((u0==0n) ? 0n : u0-1n) : (u0==0) ? 0 : u0-1); 
const ixum1 = (u0) => ((typeof(u0)=='bigint') ? ((u0==0n) ? 0 : Number(u0-1)) : ((u0==0) ? 0 : u0-1));
const ob_got = function(d,listF) {
  let ii = 0;
  if (Object.keys(d).length != listF.length) { return(false); }
  for (let ii=0;ii<listF.length;ii++) {
    if (!(Object.keys(d).includes(listF[ii]))) { return(false); }
  }
  return(true);
}
var p_exports = {'um1':um1, 'ob_got':ob_got};
// Macro function takes dictionary d
const print_v = function(d) { 
  if (ob_got(d,["i0","v0","n0"])) { 
    const v0len = d.v0.length; 
    const v0lenm1 = um1(v0len);
    const nwant = (d.n0<0) ? -d.n0 : d.n0;
    if (nwant == 0) {
        console.log(`${d.i0}[len=${v0len}] zero lines print requested`);
    } else if (v0len <= 0) {
        console.log(`${d.i0}[len=${v0len}] -- Has zero lines.`);
    } else if (nwant < (v0len+1)) {
        console.log(`${d.i0}[len=${v0len}]: [${d.v0.filter((x,i)=>i<v0len).join(',')},...,v0[v0lenm1]`);
    } else {
        console.log(`${d.i0}[len=${v0len}]: [${d.v0.join(',')}]`);
    }
    return;
  } else if (ob_got(d, ["i0","v0","n0","srt0"])) {
     const srt_v0 = d.srt.map(i => d.v0[i]);
     print_v({'i0':i0,'v0':srt_v0,'n0':d.n0});
     return;
  } else if (ob_got(d,["i0","v0","n0","srt0","othv0"])) {
     const nwant = (d.n0<0) ? -d.n0 : n0;
     if (d.n0 >= 0) {
       const srt_v0_oth0 = d.srt.map(i => d.v0[d.othv0[i]]);
       print_v({'i0':d.i0, 'v0': srt_v0_oth0, 'n0':n0});
     } else if (n0 < 0) {
       const vst = d.srt.map(i => ("[" + d.othv0[i] + "]" + d.v0[d.othv0[i]]));
       if (nwant < (1+(d.srt0).length)) {
         console.log(`${d.i0}[len=${d.v0.length}]: [${vst.filter((x,i)=>i<nwant).join(',')},...,${vst[d.v0.length-q]}]`);
       } else {
         console.log(`${d.i0}[len=${d.v0.length}]: [${vst.join(',')},`);
       }
     }
  }
  return;
}
p_exports.print_v = print_v;
///~//////////////////////////////////////////////////////////////////////////////////////
///  Algorithm diagram. 
///
///
///    Consider a sequence of prices "NBBOmid[t]" and we look for its intersection
///     of a price level "P
///
///   |
///   |__                 ___               _________      NBBOmid[t]
///   |  |   __       ___|   |            _|         |___/
///   |  |__|  |     |       |           | 
/// -P|        X     X       XXX        XX
///   |        |__   |         |_      _| \
///   |           |__|           |   _|    "X" for all crossings"
///   |                          |__|
///   |
///   |_______________________________________________________
///                         time
///
///
///  In our algoirthm we calculate for a given price level the known crossing points of the target
///  price P
///  We check these finite number of points against all resting orders resting at P.
///  Assuming the NBBOmid[t] "breaks" through we know the order is hit, also if it "rests" on the
///  order, the order "may" have been hit, depending on whether we will accept "instantaneous"
///  touching or not (say an order closes exactly at the point the NBBOmid[t] level reaches it)
///
///  This algorithm should be efficient because "updates" to P+1 are easy.  We first would check
///  whether it is time to dump "existing cross events", or else add maybe a new "dip" that first
///  hits.  Finding the additional points to add can be easy if we have sorted all NBBO mid events
///
///  Note that the "NBBOmid[t]" moves as a right angled step function.  Prices change "immediately"
///  on an update.  But it is possible that NBBOmid can jump 2 or more levels ina  single update.
////   (This would be if NBBO goes from $100.02 from $100.00, skipping $100.01)

//~//////////////////////////////////////////////////////////////
/// fast_alter_cross_above (delicate fix assumption)
///
/// Here we assume that the ability to move up in price levels from lowest price level to highest
/// in v_p vector, which will cover increasing levels of prices in v_nop NBO price.
///
/// We assume that as we move a step up to the next level set, we assume that
/// we can 
///   1. only keep or remove existing crossers
///     Those are previous (+2) for fully under to fully over to (-2) fully over to fully under
///   2.  If we were previous below to equal (+1) we are definitely being removed
///   3.  If we were equal moving to below (-1) we are possibly becoming a (-2)
///   4.  If we were above to equal we are possibly becoming (-2)
///   5.  If we were equal to above we are possibly becoming (+2)
///
///   So some of the previous will go away or become stronger moves.
///   However, there can be none more from the set of v_nop[ik] for ik < previous ip_eq.
///   This is because we know that none of those other values jumped up to previous ptgt
///   And for the new ptgt the next answer can't be that big.
//
const thresh_ip = function(ab01,v_nop,srt_nbbo,ip_u,ptgt) {
  if (ab01 === 0) {
    return( v_nop[srt_nbbo[ip_u]] <= ptgt );
  } else {
    return( v_nop[srt_nbbo[ip_u]] >= ptgt );
  }
}

const make_hit_f = function(input_bs01) {
  if (input_bs01 <= 0.5) {
              return( (p0,p1,ptgt_0) => ( Number.isNaN(p0) ? (Number.isNaN(p1) ? 0 :(p1>ptgt_0 ? 2 :(p1==ptgt_0) ? 1 : 0))
                                 : Number.isNaN(p1) ? (p0<ptgt_0 ? 0 : (p0==ptgt_0) ? -1 : -2 )
                                 :       (p0==ptgt_0) ? (p1>ptgt_0 ? 1 : (p1==ptgt_0) ? 0 :  -1 )
                                 :       (p0<ptgt_0)  ? (p1>ptgt_0 ? 2 : (p1==ptgt_0) ? 1 :   0 )
                                 :                    (p1>ptgt_0 ? 0 : (p1==ptgt_0) ? -1 : -2)))
  }
  return( (p0,p1,ptgt_0) => ( Number.isNaN(p0) ? (Number.isNaN(p1) ? 0 :(p1<ptgt_0 ? 2 :(p1==ptgt_0) ? 1 : 0))
                                 : Number.isNaN(p1) ? (p0>ptgt_0 ? 0 :  (p0==ptgt_0) ? -1 : -2 )
                                 :       (p0==ptgt_0) ? (p1>ptgt_0 ? -1 : (p1==ptgt_0) ? 0 :   1 )
                                 :       (p0<ptgt_0)  ? (p1>ptgt_0 ? -2 : (p1==ptgt_0) ?-1 :   0 )
                                 :                    (p1>ptgt_0 ?  0 : (p1==ptgt_0) ? 1 :   2)));
}
const make_crit_f = function(input_bs01) {
  if (input_bs01<=0.5) {
   return((ptgt_0,nbbop) => ((!Number.isNaN(nbbop)) && (ptgt_0>=nbbop)));
  } 
  return(((ptgt_0,nbbop)=>((!Number.isNaN(nbbop)) && (ptgt_0<=nbbop))));
}
const remake_prev_ob = function(out_ob) {
      return({'x':[...out_ob.prev_x],'ip_u':out_ob.prev_ip_u + 0, 'ip_eq':out_ob.prev_ip_eq, 'ptgt':out_ob.prev_ptgt});
}
/*
 ptgt = on_plev; ab01 = bs01;  
  //fast_alter_cross = my_this.verify_levs.fast_alter_cross;
  hit_f = make_hit_f(bs01,ptgt); crit_f = make_crit_f(bs01,ptgt);
  n_n = srt_nbbo.length; nm1 = ixum1(n_n); write_i = 0; 
  fa_out_ob = {'x':[...oout_ob.x], 'ip_eq':oout_ob.ip_eq,  'ip_u':oout_ob.ip_u};
  nx_0 = fa_out_ob.x.length;  v_ob = {'s':[], verbose:4};
  fast_alter_cross(v_ob, bs01, ptgt, srt_nbbo, v_nop, fa_out_ob);
  n_n = srt_nbbo.length;  nm1 = ixum1(n_n); write_i = 0; nx_0 = fa_out_ob.x.length
  hit_f = make_hit_f(Number(bs01)+0.0);  crit_f = make_crit_f(Number(bs01)+0.0);
 */
const fast_alter_cross = function(v_ob, bs01, ptgt, srt_nbbo, v_nop, fa_out_ob) {
  // bs01: above or below 0 or 1
  const PRINT_N = ((DEBUG) ? printer.make_print_n(v_ob,"fast_alter_cross():") : (n,x)=>(0));
  const n_n = srt_nbbo.length;  
  if (n_n <= 1) { return(-1); }
  const nm1 = ixum1(n_n); let write_i = 0; const nx_0 = fa_out_ob.x.length;
  //let mut t_out_ob.x:Vec<usize> = Vec::with_capatcity(out_ob.x.length);

  const hit_f = make_hit_f(Number(bs01)+0.0); const crit_f = make_crit_f(Number(bs01)+0.0);
  if (DEBUG) {
    fa_out_ob.prev_x = [...fa_out_ob.x];
    fa_out_ob.prev_ip_u = fa_out_ob.ip_u + 0; fa_out_ob.prev_ptgt = fa_out_ob.ptgt;
    fa_out_ob.prev_ip_eq = fa_out_ob.ip_eq + 0;
  }
  let new_x = [];
  for (let on_i=0;on_i < nx_0;on_i++) {
    const ii = fa_out_ob.x[on_i];
    const on_p = v_nop[ii];
    // It is possible if we are already in green territory, we can assume red on t=-1
    // Our theory is that last line matters only if it is critical since can't assume jump after
    //  all that matters for last move is if its previous stage had a move.

    //const hitpp = (ii<=1) ? crit_f(ptgt, on_p) : hit_f(v_nop[ii-2], v_nop[ii-1], ptgt);
    const hitp = (ii==0) ? crit_f(ptgt, on_p) : hit_f(v_nop[ii-1], on_p, ptgt);
    const hitn = (ii<nm1) ? hit_f(on_p,v_nop[ii+1], ptgt) : crit_f(ptgt, on_p);

    //if ((ii>=2) && (hitpp != 0)) {
    //  if (!(new_x.includes(ii-1))) {
    //    new_x.x.push(ii-1)
    //  }
    // }
    if (hitp != 0) {
      if (!(new_x.includes(ii))) {
        new_x.push(ii)
      }
    }
    if ((ii < nm1) && (hitn != 0)) {
      if (!(new_x.includes(ii+1))) {
        new_x.push(ii+1);
      }
    }
  }
  //fa_out_ob.x = fa_out_ob.x.filter((x,i)=>i<write_i); // Everyone else is removed as they are no longer valid skips.
  fa_out_ob.x = [...new_x];
  // Next added members must be from 
  fa_out_ob.ip_u = fa_out_ob.ip_eq;
  if (fa_out_ob.ip_u > 0) { fa_out_ob.ip_u = fa_out_ob.ip_u-1; };

  // Include zero if still relevant
  const v_nop0 = v_nop[0] + 0;
  if (crit_f(ptgt, v_nop0)) {
    if (!fa_out_ob.x.includes(0)) {
      fa_out_ob.x.push(0);
    }
  }

  const thresh_lim = ((bs01==0) ? ((ip_u, n_n, v_nop, srt_nbbo, ptgt) => 
                                    (ip_u < n_n) && (v_nop[srt_nbbo[ip_u]] <= ptgt))
                                : ((ip_u, n_n, v_nop, srt_nbbo, ptgt) =>
                                    (ip_u < n_n) && (v_nop[srt_nbbo[ip_u]] >= ptgt)));
  // We will sort srt_nbbo the prices differently, ascending for buys, descending for sells.
  //
  // fa_out_ob = out_ob;  thresh_ip(bs01, v_nop, srt_nbbo, fa_out_ob.ip_u, ptgt)
  for(;thresh_lim(fa_out_ob.ip_u, n_n, v_nop, srt_nbbo, ptgt);fa_out_ob.ip_u++) {
    const on_sti = srt_nbbo[fa_out_ob.ip_u];
    const on_p = v_nop[on_sti];
    const hit_p = ((on_sti>0) ? hit_f(v_nop[on_sti-1],on_p, ptgt) : crit_f(ptgt, on_p));
    const hit_n = ((on_sti<nm1) ? hit_f(on_p, v_nop[on_sti+1], ptgt) : crit_f(ptgt, on_p));
    if (hit_p != 0) {
        const prv_sti = (on_sti>0) ? on_sti-1 : 0;
        if (!(fa_out_ob.x.includes(on_sti))) {
          fa_out_ob.x.push(on_sti);
        }
    } 
    if ((hit_n != 0) && (on_sti < nm1)) {
        const nxt_sti = on_sti+1;
        if (!(fa_out_ob.x.includes(nxt_sti))) {
          fa_out_ob.x.push(nxt_sti);
        }
    }
    if (((bs01==0) && (on_p < ptgt)) ||
        ((bs01==0) && (on_p > ptgt)) ) {
      fa_out_ob.ip_eq = fa_out_ob.ip_u;
    }
  } 
  if (thresh_lim(fa_out_ob.ip_u, n_n, v_nop, srt_nbbo, ptgt)) {
    console.log("ERROR: fa_out_ob error, we were supposed to increase ip_u, but ip_u=" + fa_out_ob.ip_u +", " + 
                ", ptgt = " + ptgt); debugger;
  }
  DEBUG && PRINT_N(3, ": end with ip_u=" + fa_out_ob.ip_u + ",v_nop[" + (fa_out_ob.ip_u < n_n?srt_nbbo[fa_out_ob.ip_u]:-99) + "]=" + 
    (fa_out_ob.ip_u<n_n?v_nop[srt_nbbo[fa_out_ob.ip_u]]:Number('nan')) + " relative to ptgt=" + ptgt);
  DEBUG && PRINT_N(3, ": at end fa_out_ob.x=[" + (fa_out_ob.x.length>10?fa_out_ob.x.filter((x,ix)=>(ix<10)):fa_out_ob.x) + 
                                        (fa_out_ob.x.length>10?",...":"") + "]");
  fa_out_ob.ptgt = ptgt;
  if (((bs01 == 0) && (ptgt >= v_nop0)) ||
      ((bs01 == 1) && (ptgt <= v_nop0))) {
    if (!(fa_out_ob.x.includes(0))) {
      console.log("ERROR fa_out_ob.x does not include zero but it really should include zero! ERROR 3943923"); debugger;
    } 
  }
  return(fa_out_ob.x.length);
}
p_exports.fast_alter_cross=fast_alter_cross;

const example_0 = {
  "v_nop":[10,20,30,40,50,50,40,40,30,10, 40, 40, 50, 10],
  "v_not":[ 0,10,20,30,40,50,60,70,80,90,100,110,120,130],
  "ordsp":[ 1, 1, 5, 5,10,10,10,20,40,40, 40, 50],
  "ordso":[ 0,49, 0,80,20,40,49,49,70,35,100,121],
  "ordsc":[90,51,12,95,25,45,72,72,80,80,129,128]
}
const make_example = function(ab01, ptgt, ex) {
  let srt_nbbo = Array(ex.v_nop.length);
  for (let i = 0; i < ex.v_nop.length;i++) { srt_nbbo[i] = i; }
  srt_nbbo = srt_nbbo.sort((a,b) => { let x=(ex.v_nop[a]-ex.v_nop[b]);  return( (x<0)?-1:(x>0)?1:(ex.v_not[a]-ex.v_not[b])<=0?-1:1 ); });
  const ex_ob = {
    "ab01":ab01, "ptgt":ptgt, 'v_not':ex.v_not,
    "v_nop":ex.v_nop, "srt_nbbo":srt_nbbo,
    "out_b":{
      "x":[], "ip_u":0,"ip_eq":0
    }
  }
  return(ex_ob);
}
p_exports.example_0 =  example_0;
p_exports.make_example = make_example;
/**
em = make_example(0,10,example_0); ab01=em.ab01;ptgt=em.ptgt;srt_nbbo=em.srt_nbbo;v_nop=em.v_nop; out_ob = em.out_b; n_n=srt_nbbo.length;
**/
///~/////////////////////////////////
/// slow_calculate_cross
///
///  This works to identify all distinct crossings of price "ptgt" using the fact
///  We know this data is sorted by price than time using price then time using srt_nbbo
///  But that it is sorted by time (then we assume no two prices can occur at same time)
///
///  We assume that the number of prices less than ptgt is a small subset of all prices.
///  However, we could always start at minimum price and jump to a higher price above the ptgt at
///  anytime.
///
///  Thus we have to walk all prices up to "ip_u"  (but this number is hopefully
///  Small.)  By update, this number is likely close to a previous estimate.
///
///  For every price point, we look at tick before and after.
///  If we can tell we just jumped from higher prices to inside, we push onto out_ob.x.the index
///  where we know next time is a cross.  This is a "-2" event (outside to inside).
///  If the previous was "equal" to ptgt, we push the event, but only push a -1 (on border to
///  inside).
///
///  For "above=0" we are looking at buy orders walking upwards from a low price up to the next potential cross.
//   For "below=1" We are looking at sell orders walking down from the top;
const thresh_slow = function(ab01,p0,ptgt) {
  if (ab01===0) {
    return(p9 < ptgt);
  } else {
    return(p0 > ptgt);
  }
}
const slow_calculate_cross = function(ab01, ptgt, srt_nbbo, v_nop, 
  out_ob) {
  // out_ob has 3 manipulative fields, x, ip_eq, ip_u
  const crit_f = make_crit_f(ab01); 
  const hit_f = make_hit_f(ab01);

  const n_n = srt_nbbo.length; let on_i = 0;
  out_ob.x = [];
  const thresh0 = (ab01==0) ? ((x,y)=>(x<y)) : ((x,y)=>(x>y));
  for (out_ob.ip_eq=0; (out_ob.ip_eq < n_n) && 
    (thresh0(v_nop[srt_nbbo[out_ob.ip_eq]],ptgt)); out_ob.ip_eq++) {

  }
  out_ob.ip_u = out_ob.ip_eq;
  const thresh1 = (ab01==0) ? ((x,y)=>(x<=y)) : ((x,y)=>(x>=y));
  for (out_ob.ip_u=0; (out_ob.ip_u < n_n) && 
    (thresh1(v_nop[srt_nbbo[out_ob.ip_u]],ptgt)); out_ob.ip_u++) {
  }
  if ( (!Number.isNaN(v_nop[0])) ) {  
    if (((ab01===0) && (v_nop[0] >= ptgt)) ||
        ((ab01===1) && (v_nop[0] <= ptgt)) ) {
       out_ob.x.push(0);
    }
  }
  
  const thresh_prev = (ab01==0) ? ((x,y)=>(x>=y)) : ((x,y)=>(x<=y));
  for (on_i=0;on_i<out_ob.ip_eq;on_i++) {
    const on_sti = srt_nbbo[on_i];
    const on_p = v_nop[srt_nbbo[on_i]];
    if (on_sti == 0) {
    } else {
      const prev_sti = on_sti-1;
      const prev_p = v_nop[prev_sti];
      // Note it must be that on_p not inside ptgt; 
      //if ((thresh_prev(prev_p,ptgt)) && (!(out_ob.x.includes(prev_sti)))) {
      if ((hit_f(prev_p, on_p) != 0)  && (!(out_ob.x.includes(on_sti)))) {
        out_ob.x.push(on_sti);
      }
      if (on_sti < n_n-1) {
        const next_p = v_nop[on_sti + 1]; 
        if((hit_f(on_p,next_p) != 0) && (!(out_ob.x.includes(on_sti+1)))) {
          out_ob.x.push(on_sti+1);
        }
      }
    }
  }
  for (on_i=out_ob.ip_eq;on_i<out_ob.ip_u;on_i++) {
    const on_sti = srt_nbbo[on_i];
    // No matter what, we are on line need to keep
    if (!(out_ob.x.includes(on_sti))) {
      out_ob.x.push(on_sti);
    }
  }
  out_ob.x = out_ob.x.sort((a,b)=>(a-b));
  out_ob.ptgt = ptgt;
  return(out_ob.x.length);
}
p_exports.slow_calculate_cross = slow_calculate_cross;

///~//////////////////////////////////////////////////////////////////////////////////////////////
///  full_check_jumps
///
///  "Lazy Complete Search algorithm"
///
///  Checks for jumps the slowest possible way, sweeping completely thru price levels.
///  The result of check should only capture the moment when we "jump" from one zone to another.
///
///  Note, there is an edge case, depending on side for whether the it=0th or first moment counts
///  as a checkable event.  In general, we are hoping never to have to reject on it=0 since
///  that is when time window opens and most order messages don't exist (and hopefully they don't
///  open in violation)
///
///  This is a slow and most complete check, walking the entire v_nop price time series for all
///  times this series crosses ptgt (or lands on it exactly)
const full_check_jumps = function(verbose_ob, onstr, bs01, ptgt, v_nop,cross_idx) {
  const PRINT_N = printer.make_print_n(verbose_ob, "full_check_jumps(" + (bs01==0?"B":"S") + ",tgt=" + ptgt + ")::: ");
  const np = v_nop.length; let n_err=0;
  const npm1 = ixum1(np);
 
  const crit_f = make_crit_f(Number(bs01)+0); 
  const hit_f  = make_hit_f(Number(bs01)+0); 

  if (DEBUG) {
  if (crit_f(20,21) && (bs01==0)) {
    PRINT_N(4,":: Error crit_f did not work. Wut? ERROR 9349323"); debugger;
  }
  if (crit_f(21,20) && (bs01==1)) {
    PRINT_N(4,":: Error crit_f did not work. Wut? ERROR 9349323"); debugger;
  }
  }
  PRINT_N(4, ":: crit_f, hit_f are defined.");
  let cm_idx=[]; 
  for (let it=0;it<np;it++) {
    const on_p = v_nop[it]; 
    if (it == 0) {
      if (crit_f(ptgt, on_p) == true) {
        cm_idx.push(0);
      }
    } else {
      const prev_p = v_nop[it-1];
      const hit_c = hit_f(prev_p, on_p, ptgt);
      if (hit_c != 0) {
        cm_idx.push(it);
      }
    }
  }
  PRINT_N(4, ":: completed manual check with cm_idx.length=" + cm_idx.length + ":[" + cm_idx.join(",") + "].");
  if ((cm_idx.length == 0) && (cross_idx.length == 0)) {
    // Well, all clear
    return(0);
  } 
  if ((cm_idx.length==0) && (cross_idx.length > 0)) {
    PRINT_N(-6, "full_check_jump: Automatic Errors, cm_idx len 0, cross_idx.length=" + cross_idx.length);
    for (let ix = 0; ix < cross_idx.length; ix++) {
      const ii = cross_idx[ii];  const on_p = v_nop[ii];
      if (ii == 0) {
        console.log("  Error ii=0, on_p=" + on_p + " but ptgt=" + ptgt + ",bs01=" + bs01);
      } else {
        const prev_p = v_nop[ii-1];
        console.log(" --- error cross_idx[ix=" + ix + "]=" + ii + ",[prev_p,on_p]=[" + prev_p + "," + on_p + "], ptgt=" + ptgt);
      } 
    }
    n_err += cross_idx.length;
  } else if ((cm_idx.length > 0) && (cross_idx.length==0)) {
    console.log("full_check_jump: Auto Errors, cm_idx len=" + cm_idx.length + ", cross_idx.length=0");
    for (let ix = 0; ix < cm_idx.length; ix++) {
      const ii = cm_idx[ii]; const on_p = v_nop[ii];
      if (ii == 0) {
        console.log(" EE For ii=0, on_p=" + on_p + " versus ptgt=" + ptgt + ",bs01=" + bs01 + ", cm_idx says stay!");
      } else {
        const prev_p = v_nop[ii-1];
        console.log(" EE For ii=" + ii + ", [prev_p,on_p]=[" + prev_p + "," + on_p + "], ptgt=" + ptgt + ", cm_idx says stay!");
      }
    }
    n_err += cm_idx.length;
  } else {
    PRINT_N(4, ": check compare cm_idx.length=" + cm_idx.length + ", vs fast version length=" + cross_idx.length+ "."); //debugger;
    for (let ix = 0; ix < cm_idx.length; ix++) {
      const ii = cm_idx[ix];  const on_p = v_nop[ii];
      if (!cross_idx.includes(ii)) {
        if (ii == 0) {
          console.log(" ERROR cm_idx[ix=" + ix + "]=" + ii + " not in cross_idx.  on_p=" + on_p + ", ptgt=" + ptgt + ",bs01=" + bs01);
          console.log("  ---- Note crit_f(on_p=" + (on_p) + "=" + crit_f(ptgt, on_p) + ", are we sure cm_idx[" + ix + "] = " + cm_idx[ix] + ", should be here?");
          n_err++;
        } else {
          const prev_p = v_nop[ii-1];
          console.log(" ERROR cm_idx[ix=" + ix + "]=" + ii + ", [prev_p,on_p]=[" + prev_p + "," + on_p + "], ptgt=" + ptgt + " but not in cross_idx");
          n_err++;
        }
      }
    }
    PRINT_N(4, ": Half way through checked cm_idx with n_err=" + n_err + ", checking cross_idx.");
    for (let ix = 0; ix < cross_idx.length; ix++) {
      const ii = cross_idx[ix];  const on_p = v_nop[ii];
      if (!cm_idx.includes(ii)) {
        if (ii == 0) {
          console.log(" ERROR cross_idx[ix=" + ix + "]=" + ii + " not in cm_idx.  on_p=" + on_p + ", ptgt=" + ptgt + ",bs01=" + bs01);
          n_err++;
        } else {
          const prev_p = v_nop[ii-1];
          console.log(" ERROR cross_idx[ix=" + ix + "]=" + ii + ", [prev_p,on_p]=[" + prev_p + "," + on_p + "], ptgt=" + ptgt + " but not in cm_idx");
          n_err++;
        }
      }
    }
  }
  PRINT_N(4, " end check with n_err = " + n_err);
  if (n_err > 0) {
    console.log("full_check_jump->" + onstr + ": We found total " + n_err + " errors versus ptgt=" + ptgt +".");
    if (cm_idx.length > 0) {
      console.log("  note cm_idx[len=" + cm_idx.length + "]=[" + 
        cm_idx.map((x,ix)=>("{i:" + x + ",pp:" + ((x>0)?v_nop[x-1]:v_nop[0]) + ",np:" + (v_nop[x]) +
                         ",t:" + v_not[x] + ",hf:"+ ((x==0)?crit_f(ptgt, v_nop[0]):hit_f(v_nop[x-1],v_nop[x],ptgt)) +"}")).join(",") +
         "]");
    }
    if (cross_idx.length > 0) {
      console.log("  note cross_idx[len=" + cross_idx.length + "]=[" + 
        cross_idx.map((x,ix)=>("{i:" + x + ",pp:" + ((x>0)?v_nop[x-1]:v_nop[0]) + ",np:" + (v_nop[x]) +
                         ",t:" + v_not[x] + ",hf:" + ((x==0)?crit_f(ptgt, v_nop[0]):hit_f(v_nop[x-1],v_nop[x],ptgt)) +"}")).join(",") +
         "]");
    }
    console.log("  INVESTIGATE debugger 9483092."); //debugger;
  }
  return(n_err);
}
///~///////////////////////////////////////////////////////////////////////////////////////////////
///  check_jumps()
///
///  TEST UTILITY
///
///  Check our calculated "cross_idx" vector and verifies that the events it calculated really do
///  jump accross the price level ptgt.
const check_jumps = function(verbose_ob, onstr, bs01, ptgt, v_nop,cross_idx) {
  const PRINT_N = printer.make_print_n(verbose_ob, "check_jumps()::");
  const np = v_nop.length; const nidx = cross_idx.length;
  if (nidx <= 0) { return(0); }
  let nerr = 0; let ix=0;
  const crit_f = make_crit_f(bs01); const hit_f = make_hit_f(bs01);
  /*
   bs01 =0;  
   */

  for (ix=0;ix<nidx;ix++) {
    const oncross_idx = cross_idx[ix];
    const on_p = v_nop[oncross_idx];
    if (oncross_idx == 0) {
      if (crit_f(ptgt, on_p)) {
      } else {
        PRINT_N(-6, " ERROR[" + onstr + "]: oni=0, on_p=" + on_p + " but not critical!");
        nerr = nerr+1;
      }
    } else {
      const prev_p = v_nop[oncross_idx-1];
      const hitc = hit_f(prev_p, on_p, ptgt);
      if (hitc != 0) {
      } else {
        PRINT_N(-6, " ERROR " + onstr + ", we cidx[ix=" + ix + "]=" + oncross_idx + 
          ", [pp,onp]=[" + prev_p + "," + on_p + "], but ptgt=" + ptgt + ", hitc=" + hitc);
        nerr = nerr + 1;
      }
    }
  } 
  return(nerr);
}

// Searches for first v_s=1 value, or the beginning of our sells
const find_1 = function(srt_v, v_s) {
  let i0 = 0; if (v_s[srt_v[i0]] == 1) { return(i0); }
  let i1 = ixum1(srt_v.length); if (v_s[srt_v[i1]] == 0) { return(srt_v.length); }
  while(i0<i1) {
    if (i0 == i1) { return(i0); }
    const tp  = (Math.round((i0 + i1) / 2) >= i0) ? Math.round((i0+i1)/2) : ixum1(1);
    if (tp == i1) { if (v_s[srt_v[ixum1(tp)]] == 0) { return(tp); } else { i1 = ixum1(i1); }
    }  else if (tp == i0) { if (v_s[srt_v[tp+1]] == 1) { return(tp+1); } else {i0 = tp+1; }
    }  else if (v_s[srt_v[tp]] == 1) { i1 = tp; if (v_s[srt_v[um1(tp)]] == 0) { return(tp); }
    }  else if (v_s[srt_v[tp]] == 0) { i0 = tp;
    }
  }
  return(tp);
}
p_exports.find_1= find_1;

const make_st_v=function(v_nop, v_not) {
  const n_n = v_nop.length;
  let st_v = Array(n_n); for (let ix=0;ix<n_n;ix++) { st_v[ix]=ix; }
  st_v = st_v.sort((a,b)=>{ return( (v_nop[a]==v_nop[b]) ? (v_not[a]-v_not[b]) : (v_nop[a]-v_nop[b])) });
  return(st_v);
}
const make_srt_n=function(v_nop, v_not) {
  const n_n = v_nop.length;
  let srt_nbbo = Array(n_n).fill(0.0);
  for (let i = 0; i < n_n;i++) { srt_nbbo[i] = i; }
  srt_nbbo = srt_nbbo.sort((a,b) => { const x=(v_nop[a]-ex.v_nop[b]);  return( (x<0)?-1:(x>0)?1:(v_not[a]-v_not[b])<=0?-1:1 ); });
  return(srt_nbbo);
}

const make_srt_nbbo=function(bs01, v_nop, v_not) {
  const n_n = v_nop.length;
  let srt_nbbo = Array(n_n).fill(0.0);
  for (let i = 0; i < n_n;i++) { srt_nbbo[i] = i; }
  const srt_f = function(a,b) { 
    if (Number.isNaN(Number(v_nop[a])) && (Number.isNaN(Number(v_nop[b])))) {
      return(Number(v_not[a]-v_not[b]));
    } else if (Number.isNaN(Number(v_nop[a]))) {
      return(1);
    } else if (Number.isNaN(Number(v_nop[b]))) {
      return(-1);
    } else if (Number(v_nop[a]) == Number(v_nop[b])) {
      if (typeof(v_not[a])=='bigint') { return(Number(v_not[a]-v_not[b])) }
      return(v_not[a]-v_not[b]);
    } else {
      return((bs01==0) ? v_nop[a]-v_nop[b] : (v_nop[b]-v_nop[a]));
    }
  };
  srt_nbbo = srt_nbbo.sort(srt_f);
  return(srt_nbbo);
}
const make_srt_v_basic=function(bs01, v_p, v_ot) {
  return(make_srt_nbbo(bs01, v_p, v_ot));
}

const make_srt_v_side=function(bs01, v_s, v_p, v_ot) {
  const n_n = v_s.length;
  let srt_v = Array(n_n).fill(0.0);
  for (let i =0; i < n_n; i++) { srt_v[i] = i; }
  const srt_f = function(a,b) {
    if (v_s[a] != v_s[b]) {
      if (type(v_s[a]) == 'number') { return(v_s[a]-v_s[b]); }
      if ((v_s[a] == 'b') || (v_s[a] == 'B')) { return(-1); }
      if ((v_s[b] == 'b') || (v_s[b] == 'B')) { return(1); }
      if ((v_s[a] == 's') || (v_s[a] == 'S')) { return(1); }
      return(-1);
    } else if (Number.isNaN(Number(v_p[a])) && (Number.isNaN(Number(v_p[b])))) {
      return(Number(v_ot[a]-v_ot[b]));
    } else if (Number.isNaN(Number(v_p[a]))) {
      return(1);
    } else if (Number.isNaN(Number(v_p[b]))) {
      return(-1);
    } else if (v_p[a] == v_p[b]) {
      return(Number(v_ot[a]-v_ot[b]));
    } else {
      return((bs01==0) ? Number(v_p[a]-v_p[b]) : Number(v_p[b]-v_p[a]));
    }
  } 
  srt_v = srt_v.sort(srt_f);
  return(srt_v);
}
p_exports.make_st_v = make_st_v;
p_exports.make_srt_n = make_srt_n;
p_exports.make_srt_nbbo = make_srt_nbbo;
p_exports.make_srt_v_basic = make_srt_v_basic;
p_exports.make_srt_v_side = make_srt_v_side;
p_exports.make_srt_v = make_srt_v_side;

const resort_out_x = function(out_x) {
  let out_idx = Array(out_x.length).fill(0);
  for (let ii = 0; ii < out_x.length; ii++) { out_idx[ii] = ii;}
  //let mut out_idx:Vec<usize> = (0_usize..(out_x.len() as usize)).collect();
  out_idx = out_idx.sort((ix,iy) => (out_x[ix]-out_x[iy]));
  return(out_idx);
}
p_exports.resort_out_x = resort_out_x;

///~////////////////////////////////////////////////////
/// Our methodology to verify that every order at price v_p[i], with open and close times
/// is satisfactory against a price level + delta of v_nop-pdiff for every price in v_no[
///
/// What we do is figure out a vector of all known "Next stop is a switch" points.
/// We generate this with slow_calculate_cross_above()/fast_alter_cross_above() 
///
/// This gives us a logical list of all points, which, if the open/close times overlap one of
/// these switch points, then we can make a determination if the
///
/// Note if "eqstate==True" then any points "barely touching" are rejectable.
/// This makes it easy to say that if a touch point even exists, then we reject.
/// We have a little hard time if eqstate==False and we can tell we just start to sit beside
/// the price.  Even so, we can determine by cross_type whether this spot eventually jumps
/// back to clear (positive jump is next), or jumps to danger zone (negative jump comes next) and
/// if the time of that jump is also within the open_time/close_time interval
///
/// The resulting return vector "out_v" will be 0 if we never rejected the point, and 1 if we found
/// one or more reasons to reject a point (once we find at least one reason we are done).
///
/// Mathematically we need to calculate for every resting order v_p[i],
///    lasting from v_ot[i] to v_ct[i], is there a price event v_nop[j] occuring at v_not[j]
///    with v_ot[i] <= v_not[j] <= v_ct[i],
///    Such that v_nop[j] - pdiff  < v_p[i];
///
///  This is typically a n_v={Length v_p} times n_n {Length v_nop} search.
///     But this result would take too much time and energy for large vectors.
///
///  Inputs
///    pdiff: A price difference.  We want to know if there is a cross between v_nop[j]-pdiff and
///    v_p[], v_ot[], v_ct[]: Vectors for resting messages at price p, open ot, close ct.
///    v_nop, v_not: The continuous NBB or NBO price sequence we use as barrier price
///    verbose: Whether to print details
///    "eqstate":  We could use a "Kissing cutoff" (if eqstate==True) or a "breakthrough cuttoff"
///        So our condition of "<" or "<=" as a rejector.  Typically we will need a full
///        break through.  But because there is a potential for v_nop to "bounce and touch"
///        We have to consider tighter criteria
///
///
/*
 pdiff = -0.01;  nbbo = my_this.data.nbbo; bs01 = 0; 
 v_not = nbbo['time'];  v_nop = nbbo['nbo']; eqstate=false; timetouch= 10;
 ords = my_this.data.buys;  srt_nbbo = my_this.verify_levs.make_srt_nbbo(bs01, v_nop, v_not);
 srt_f = ((bs01 == 0) ? ((a,b)=>(a-b)) : ((a,b) => (b-a)));
 nq = ords.price.length; u_p = [...new Set(ords.price)].sort(srt_f);
 v_s = Array(nq).fill(0.0); v_p = ords.price; verbose = 4; bs01 = 0;
 v_ot = ords.open;  v_ct = ords.close; tmax = my_this.orig.tmax;
 out_v = Array(nq).fill(-1);
 srt_v = my_this.verify_levs.make_srt_v_side(bs01, v_s,v_p,v_ot);
 verify_cross = my_this.verify_levs.verify_cross;
 rej_crit = 10; verbose_ob = {'s':[], 'verbose':verbose};
 verify_cross(bs01, rej_crit, out_v,  srt_v, v_s, v_p, v_ot, v_ct,
              srt_nbbo, v_nop, v_not, tmax, eqstate, verbose_ob, timetouch); 
 n_n = srt_nbbo.length; 
 cnt_in = 0; cnt_ov = 0;  cnt_neg = 0;
 for (let ii = 0; ii < out_v.length; ii++) {
   if (out_v[ii] < 0) { cnt_neg++
   } else if (out_v[ii] == n_n) { cnt_ov++;
   } else if (out_v[ii] < n_n) { cnt_in++;
   } 
 }
 out_v2 = Array(nq).fill(0);
 my_this.verify_levs.slow_verify_price(out_v2, rej_crit, v_s, v_p, v_ot, v_ct,
              v_nop, v_not, tmax, eqstate, verbose_ob, timetouch) 

out_3 = my_this.verfiy_levs.validate_out_v(bs01, pdiff, out_v, out_v2, srt_v, v_s, v_p, v_ot, v_ct,
         srt_nbbo, v_nop, v_not, tmax, eqstate, verbose_ob, timetouch);

 */
const verify_cross=function(bs01, pdiff, out_v, srt_v, v_s, v_p, v_ot, v_ct,
         srt_nbbo, v_nop, v_not, tmax, eqstate, verbose_ob, timetouch, force_time, origmult) {
  // -  checking buys(1) or sells(1) or both(2)
  // out_v
  // pdiff our target.
  // v_s,v_p,v_ot, v_ct, side,price,open,close of resting orders
  // v_nop,v_not: price target to rate against, 
  //let v_nop = *v_nop; let v_not = *v_not;
  const n_v = out_v.length; const n_n = v_nop.length; 
  const vstr = ("verify_crosses_" + ((bs01===2) ? "both " : ((bs01==1) ? "sell " : "buy")) + 
    "(pd=" + pdiff + ",v=" + n_v + ",n=" + n_n + ",tt=" + (timetouch ? "touch" : "cross") +"): ");
  const v_ob = {'s':verbose_ob.s, 'verbose': verbose_ob.verbose + (DEBUG) ? 5 : 0};
  const verbose = verbose_ob.verbose;
  const PRINT_N = printer.make_print_n(v_ob, vstr);
  PRINT_N(1, ": We begin");
  if (typeof(timetouch) != typeof(v_ot[0])) {
    PRINT_N(-6, " we have typeof(timetouch)=" + typeof(timetouch) + ", but v_ot is of type " + typeof(v_ot)); 
  }
  if (typeof(v_ot[0]) != typeof(v_ct[0])) {
    PRINT_N(-6, " Error, v_ot is type " + typeof(v_ot[0]) + " and v_ct is type  " + typeof(v_ct[0]));
  }
  if (typeof(v_not[0]) != typeof(v_ct[0])) {
    PRINT_N(-6, " Error v_not is type " + typeof(v_not[0]) + " and v_ct is type " + typeof(v_ot[0]));
  }
  //if (n_v <= 0) {  return(-1); } // No buys to match, return nothing. 
  if (out_v.length <= 0) {  return(-1); } // No buys to match, return nothing. 
  if (n_n <= 0) {  return(-1); } // No NBBO cant do anything. 

  const n_buy = find_1(srt_nbbo, v_s);
  if ((bs01==0) && (n_buy <= 0)) { return(0); }
  if ((bs01==1) && (v_s.length-n_buy <= 0)) { return(0); }
  if ((bs01==2)) {
    return( verify_cross(0,out_ob, srt_v, pdiff,v_s,v_p,v_ot,v_ot,
              v_nop, v_not, eqstate, v_ob, timetouch) + 
            verify_cross(1,out_ob, srt_v, pdiff,v_s,v_p,v_ot,v_ot,
              v_nop, v_not, eqstate, v_ob, timetouch)  );
  }
  PRINT_N(1, " --- working further to check crosses.");
  let ix = 0; 
  // crit bad price.
  const cbp = ((eqstate == true)
                  ? (bs01==0 ? (qp,np) => (Number.isNaN(np) ? false : (qp + pdiff >=np))
                             : (qp,np) => (Number.sNaN(np) ? false : (qp - pdiff <=np)))
                  : (bs01==0 ? (qp,np) => (Number.isNaN(np) ? false : (qp + pdiff >np))
                             :  (qp,np) => (Number.isNaN(np) ? false : (qp - pdiff <np)))
                  );
  // time criterion
  const tmc = ((((typeof(timetouch)=='bigint') && (timetouch==0n)) || (timetouch=0)) 
               ? ((ot,ct,nto,nct) => ((ot<=nct) && (ct>=nto)))
               : ((ot,ct,nto, nct) => (timetouch <= (((nct>ct)?ct:nct) - ((nto>ot)?nto:ot)))  )); 

  if (v_ob.verbose >= 2) {
    PRINT_N(2, " --- We are beginning with the vectors we have sorted. ", vstr);
    print_v({'i0':(vstr + ": srt_v,"),'v0':srt_v.filter((x,ix)=>(ix<10)),'n0':5}); 
    print_v({'i0':(vstr + ": srt_nbbo,"),'v0':srt_nbbo.filter((x,ix)=>(ix<10)),'n0':5});
  }
  if (v_nop.length == 1) {
    PRINT_N(1, " --  We have only a single nbbo might as well do slow algorithm.");
    return(slow_verify_price(out_v, pdiff, v_s, v_p, v_ot, v_ct,
              v_nop, v_not, tmax, eqstate, v_ob, timetouch));
  }
  //let mut out_v: Vec<u64> = vec![n_n as u64;n_v as usize];
  let on_plev = v_p[srt_v[0]] + pdiff;
  let cross_idx = [];
  let on_ix = 0;
  
  const out_ob = {'x':[], ip_eq:0,ip_u:0};
  DEBUG && PRINT_N(1, " First slow_calculate_cross: begin.");
  let nx = ((bs01===0) ? slow_calculate_cross(0, on_plev, srt_nbbo, v_nop, out_ob) :
            slow_calculate_cross(1, on_plev, srt_nbbo, v_nop, out_ob));
  let cnt_calc_cross = 1;
  DEBUG && PRINT_N(1, "slow_calculate_cross done: We have that nx = " + nx);
  let sort_cross_idx = resort_out_x(out_ob.x);
  //if ((cross_idx.length > 0) && (sort_cross_idx.length <= 0)) {
  //  PRINT_N(1, " ERROR cross_idx is length " + cross_idx.length + " , but sort_cross_idx.length is " + sort_cross_idx.length);
  //}
  DEBUG && PRINT_N(2, " - for first price on_plev=" + on_plev + "=[" + v_p[srt_v[0]] + "=srt_v[" + 
    srt_v[0] + "]]-pdiff=" + pdiff + " we have ip_eq=" + out_ob.ip_eq + ", ip_u=" + out_ob.ip_u);
     //(out_ob.x.length > 0 ? print_v({'i0':(vstr + ": sort_cross_idx"), 'v0':sort_cross_idx, 'n0':5}) : console.log("oobX 0LEN"));
     //(out_ob.x.length > 0 ? print_v({'i0':(vstr+": out_ob.x"), 'v0':out_ob.x, 'n0':5, 'srt0':sort_cross_idx}) : console.log("oobX 0LEN")); 
     //(out_ob.x.length > 0 ? print_v({'i0':(vstr + ": v_nop[cidx]"), 'v0':v_nop,'n0':5,'srt0':sort_cross_idx,'othv0':out_ob.x}) : console.log("oobX 0LEN")); 
  DEBUG && PRINT_N(2, ": BEFORE LOOP:::  After slow done. on_plev = " + on_plev + ", Begining the other values. BEGIN LOOP");
  const n_nm1 = um1(n_n); let i_v = 0;
  let cnt_bad = 0;
  for (i_v=0;i_v<n_v;i_v++) {
    // For loop, we have to label each member of all n_v members of out_v
    //  We will have to loop over prices.
    out_v[srt_v[i_v]] = -1;
    const v_on_p = v_p[srt_v[i_v]]; const v_on_ct = v_ct[srt_v[i_v]]; const v_on_ot = v_ot[srt_v[i_v]];
    DEBUG && PRINT_N(3, ":: LOOP: i_v=" + i_v + "/" + n_v + ": nx = " + nx + ", v_on_p=" + v_on_p + ", v_on_ct=" + v_on_ct);
    if ((v_s !== null) && (v_s[srt_v[i_v]] != bs01)) { break; }
    DEBUG && PRINT_N(3, ":: ----: i_v=" + i_v + "/" + n_v + ": v_on_ot selected at " + v_on_ot + 
      ", v_on_p=" + v_on_p + " pdiff=" + pdiff + ", on_plev=" + on_plev + " out_b.x=[" + out_ob.x.join(",") + "]");
    const on_p_crit = v_on_p + ((bs01==0) ? 1 :-1) * pdiff;
    if ((on_p_crit) != on_plev) {
      DEBUG && PRINT_N(4, ":: ----: i_v=" + i_v + "/" + n_v + ":$" + v_on_p + ", on_p_crit="+on_p_crit+" are greater than on_plev.  We will run fast_alter_cross.");
      on_plev = on_p_crit; 
      // Note "update_cross_above(...) will start from zero no matter price target.
      //   It will typically start at "minimum price" however, so it goes up.
      //
      // Fast Alter should be faster that just
      // alters existing solution
      DEBUG && PRINT_N(4, ":: ----:  We are running fast_alter now: on_plev=" + on_plev + ", i_v=" + i_v + "/" + n_v); 
      //if (i_v == 3) { debugger; }
      if (DEBUG) {
        try {
          nx = fast_alter_cross(v_ob, bs01, on_p_crit, srt_nbbo, v_nop, out_ob);
          if (nx ==0) {
            if ((bs01 ==0) && (v_on_p + pdiff > v_nop)) {
              PRINT_N(-6, " Still on buys we have a violation achieved."); debugger;
            }
          }
        } catch {
          PRINT_N(-6, ":: fast_alter_cross failed again. -93023."); debugger;
        }
      } else {
        nx = fast_alter_cross(v_ob, bs01, on_p_crit, srt_nbbo, v_nop, out_ob);
      }
      if ((out_ob.x !== null) && (out_ob.x.length > 1)) { out_ob.x = (out_ob.x.sort((a,b)=>(a-b))); }
      cnt_calc_cross += 1; 
      DEBUG && PRINT_N(4,":: ----: We have updated fast_alter cross[ip_u:" + out_ob.ip_u + ",ip_eq:" + out_ob.ip_eq + "] = [" +
        (out_ob.x.filter((x,ix)=>(ix < 10)).join(",")) + (out_ob.x.length>10?",...":"") + "]");
      on_ix = 0;
      if ((DEBUG) && (v_ob.verbose >= 2)) {
        PRINT_N(1, ":: ----: i_v=" + i_v + "/" + n_v + "$" + v_on_p + ": Doing check on Jumps: on_plev=" + on_plev+".");
        if ((out_ob.x === undefined) || (out_ob.x === null)) {
          PRINT_N(-6, " ERROR out_ob.x is null! debugger 669323"); debugger;
        } else if (out_ob.x.length > 10) {
          PRINT_N(3, ":: ----: out_ob.x[len=" + out_ob.x.length +"] = [" + out_ob.x.filter((x,ix)=>(ix<10)) + ",...]");
        } else if (out_ob.x.length > 0) {
          PRINT_N(3, ":: ----: out_ob.x[len=" + out_ob.x.length +"] = [" + out_ob.x.filter((x,ix)=>(ix<10)) + "]");
        } else {
          PRINT_N(3, ":: ----: out_ob.x[len=0]");
        }
        //if (out_ob.x.length > 0) {
        //  print_v({'i0':(vstr + ": out_ob.x"), 'v0':out_ob.x, 'n0':5});
        //}
        PRINT_N(3, ":: ----: run check_jumps(..., len=" + out_ob.x.length + ") ");
        const nerr = ((out_ob.x.length<=0) ? 0 : check_jumps(v_ob, (vstr + "[i_v="+i_v+"]"), bs01, on_plev, v_nop, out_ob.x));
        PRINT_N(3, ":: ----: run full_check_jumps(...,nn=" + v_nop.length +", out_ob.x.len=" + out_ob.x.length + ")");
        const nerr2 = full_check_jumps(v_ob, (bs01==0?"B":"S"), bs01, on_plev, v_nop, out_ob.x);
        PRINT_N(1, " -- We checked jumps and got " + nerr + " errors for " + nx + " finds, on_plev=" + on_plev + 
          ", n_n=" + n_n + ", nerr2=" + nerr2); 
        if (nerr2 > 0) {  PRINT_N(-6, " ERROR we know we aren't doing good. ip_eq=" + out_ob.ip_eq + ", ip_u=" + out_ob.ip_u); 
          const oout_ob = remake_prev_ob(out_ob);
          PRINT_N(1,  " note we moved from ptgt = " + out_ob.prev_ptgt + " to " + out_ob.ptgt +".");
          PRINT_N(-6, "  Start investigate debug 943023");
          debugger; 
        }
        if ((nerr == 0) && (nerr2==0)) { PRINT_N(2, "Pass Check Jumps. (i_v=" + i_v + "/" + n_v + ")"); }
      }
    } else {
      DEBUG && PRINT_N(2, " -- Skipp fast_alter"); 
      if (out_ob.x.length == 0) {
        DEBUG && PRINT_N(4, ":: ----: i_v=" + i_v + "/" + n_v + ": no fast_alter_cross. But length of x is zero.");
      } else if (out_ob.x.length > 10) {
        DEBUG && PRINT_N(4, " -- we did not run fast_alter_cross, out_ob.x=[" + out_ob.x.filter((x,ix)=>ix<10).join(",") + ",...]");
      } else {
        DEBUG && PRINT_N(4, " -- we did not run fast_alter_cross, out_ob.x=[" + out_ob.x.filter((x,ix)=>ix<10).join(",") + "]");
      }
    }
    if ((DEBUG) &&  (nx != out_ob.x.length)) {
      PRINT_N(-6, "ERROR DEBUG: Fast algo bad data, nx = " + nx + " does not equal out_ob.x.length = " + out_ob.x.length +": debugger 39432.");
      debugger; 
    }
    DEBUG && PRINT_N(4, " --- Survived fast alter.");
    if ((DEBUG) && (v_ob.verbose >= 3)) {
       if ((out_ob == null) || (out_ob == undefined) || (out_ob.x == undefined) || (out_ob.x == null)) {
         PRINT_N(-6, " Error, something is wrong about out_ob x. after fast alter.");
       }
       let hms_ot = "NOTFOUND"; let hms_ct = "NOTFOUND"
        const nv = srt_v.length;  const on_v = srt_v[i_v];
       try {
        hms_ot = basic_hms(BigInt(Math.floor(origmult*v_ot[on_v]))); hms_ct = basic_hms(BigInt(Math.floor(origmult*v_ct[on_v])));
        PRINT_N(3, "\n\n: on (i_v=" + i_v + "/" + nv + "=srt_v=" + on_v + "), " + 
          "v_p[" + on_v + "]=" + v_p[on_v] + ", ot--ct==[" + hms_ot + "--"+ hms_ct + "]");
        if ((out_ob.x == null) || (out_ob.x.length <= 0)) {
          PRINT_N(3, " Error, out_ob.x is of zero length");
        } else {
           PRINT_N(3, " out_ob.x is now [" + (out_ob.x.filter((x,ix)=>(ix<10))) + "" + (out_ob.x.length > 10 ? ",..." : "") + "]");
        }
       } catch {
         PRINT_N(-6, " -- failed to get hms_ot or something.");  debugger;
       }
        //print_v({'i0':("      : out_ob.x"), 'v0':out_ob.x, 'n0':5});
    }
    if (nx == 0) {
      DEBUG && PRINT_N(2, ":: ----:" + i_v + "/" + n_v + ": Note that an out_ob.x len 0 case has occured.");
      const v_nop0 = v_nop[0]+0;
      if (cbp(v_on_p,v_nop0)) {
        DEBUG && PRINT_N(-6, ":: ----: out_ob.x.len=0: ISSUE v_on_p=" + v_on_p + ", v_nop0 = " + v_nop0 +".  We say critical hit?: debugger 432932");
        debugger;
        const v_not0 = v_not[0]; const v_not1 = (v_nop.length > 1) ? v_not[1] : tmax;
        if ((v_on_ot <= v_not1) && (v_on_ct >= v_not0) && (tmc(v_on_ot, v_on_ct, v_not0, v_not1))) {
          out_v[srt_v[i_v]] = 0; cnt_bad++; continue;
        }
      } else if (out_ob.ip_eq >= n_n) {
        // In this case all prices are always less if there is any overlap.  Reject, fails on first nbbo
        if ((v_on_ot <= tmax) && (v_on_ct >= v_not[0])) {
          let imin = 0; // Seek first nbbo time overlapping v_on_ot;
          if ((force_time==true) && (n_n > 1)) {
            let i_m = 0;  let i_M = n_n-1;
            while((i_M-i_m) > 1) {
              const i_mid = ((Math.floor((i_M+i_m)/2) <= i_m) ? i_m+1 : Math.floor((i_M+i_m)/2));
              if (v_not[i_mid] > v_on_ot) { i_M = i_mid; 
              } else if (v_not[i_mid] == v_on_ot) { i_M=i_mid; i_m=i_mid;
              } else { i_m = i_mid; }
              if ((v_not[i_mid] > v_on_ot) && (i_mid>0) && (v_not[i_mid-1] <= v_on_ot)) { i_m=i_mid-1; i_M=i_mid; }
            } 
            imin = i_m;
          }
          out_v[srt_v[i_v]] = imin;
        } else {
          cnt_bad++;
          // Crazy case everyone out of range
          out_v[srt_v[i_v]] = n_n;
        }
      } else if ((v_nop[srt_nbbo[0]] - pdiff) > on_plev) {
        // In this case all prices are north of issue.  We should keep this point.
        cnt_bad++;
        out_v[srt_v[i_v]] = n_n;
      } else {
        DEBUG && PRINT_N(2, "  ISSUE nx = 0, for v_nop range [" + v_nop[srt_nbbo[0]] + "," + v_nop[srt_nbbo[n_nm1]] + 
          "], ip_eq=" + out_ob.ip_eq + "/" + n_n + ", on_plev=" + on_plev + " but pdiff=" + pdiff);
      }
    } else {
       // Note: our logic for determining a "full/partial"touch could be better organized, but
       // there is some complexity as to what counts as a "damning cross" versus a "near miss"
       let i_x = 0; let on_n = 0;
       DEBUG && PRINT_N(3, ":: ----:" + i_v + "/" + n_v + ": Performing logic based upon hit_f:[nx=" + nx + "]");
       for (i_x=on_ix;i_x<nx;i_x++) {
         const current_n = out_ob.x[i_x];
         const critical_price_on = cbp( v_on_p, v_nop[current_n]);
         if (critical_price_on) {
           const v_on_not = v_not[out_ob.x[i_x]];
           const v_on_not_next = (i_x+1 < nx) ? v_not[out_ob.x[i_x+1]] : tmax;
           if (tmc(v_on_ot, v_on_ct, v_on_not, v_on_not_next)) {
             DEBUG && PRINT_N(3, ":: ----:" + i_v + "/" + n_v + 
               ": Time and Price Critical [i_v=" + i_v + ",$" + v_on_p + "," + v_on_ot + ":" + v_on_ct + "] " + 
               ", versus nbbo[" + current_n + ",$" + v_nop[current_n] + "," + v_on_not + ":" + v_on_not_next + "]");
             let imin = current_n;
             if ((force_time==true) && (n_n - current_n > 1)) {
               let i_m = imin;  let i_M = n_n-1;
               while((i_M-i_m) > 1) {
                 const i_mid = ((Math.floor((i_M+i_m)/2) <= i_m) ? (i_m+1) : Math.floor((i_M+i_m)/2));
                 if (v_not[i_mid] > v_on_ot) { i_M=i_mid;
                 } else if (v_not[i_mid] == v_on_ot) { i_M=i_mid; i_m = i_mid;
                 } else { i_m = i_mid; }
               }
               imin = i_m;
             }
             out_v[srt_v[i_v]] = imin; cnt_bad++; i_x = nx; break;
             if ((bs01 ==0) && (srt_v[i_v] == 10)) { 
               PRINT_N(-6, " Let's debug this issue. srt_v[i_v]=" + srt_v[i_v]);
             }
           }
         } 
         /*
          (crit_on) {
           if (v_on_ct < v_on_not) {
             // No match
           } else if ((v_on_ct == v_on_not) && (tt0)) {
             out_v[srt_v[i_v]] = current_n; break;
           } else if (v_on_ot > v_on_not_next) {

           } else if ((v_on_ot == v_on_not_next && (tt0))) {
             out_v[srt_v[i_v]] = current_n; break;
           } else if (( (v_on_not_next < v_on_ct) - (v_on_ot > v_on_not ? v_on_ot : v_on_not)) > timetouch) {

           }
         } else if (v_on_not < v_on_ot) {
           if ((i_x +1 < nx) && (v_on_not_next < v_on_ot)) {
             on_ix = on_ix + 1;
           } else if ((timetouch==false) && (v_on_not_next == v_on_ot)) {
           } else {
             // If we are at last break before v_ot we have to as questions.
             const lastn = ((i_x+1) < out_ob.x.length) ? out_ob.x[i_x+1] : v_not.length;
             for (on_n=current_n;on_n<lastn;on_n++) {
                const next_n = (on_n+1 < v_not.length) ? (on_n+1) : on_n ;
                if ((v_not[on_n] > v_ct[srt_v[i_v]]) || ((timetouch==false) && (v_not[on_n] >= v_on_ct))) { 
                  break;
                } else if ((v_not[next_n] > v_ot[srt_v[i_v]]) || ((timetouch==true) && (v_not[next_n] >= v_on_ot))) {
                  if ((v_nop[on_n]-pdiff < v_p[srt_v[i_v]]) || ((eqstate==true) && (v_nop[on_n]-pdiff <= v_p[srt_v[i_v]]))) {
                    cnt_bad++;
                    out_v[srt_v[i_v]] = on_n; break;
                  }
                }
             }
           }
         } else if ((v_on_not > v_ct[srt_v[i_v]]) || ((timetouch==false) && v_on_not == v_ct[srt_v[i_v]])) {
           break;
         } else {
           if ((v_nop[current_n] - pdiff < v_on_p) || ((eqstate) && (v_nop[current_n]-pdiff <= v_on_p))) {
             cnt_bad++;
             out_v[srt_v[i_v]] = current_n;
           } else if ((v_not[next_n] < v_on_ct) || ((timetouch) && (v_not[next_n] <= v_on_ct))) {
              if ((v_nop[next_n]-pdiff < v_on_p) || ((eqstate==true) && (v_nop[next_n]-pdiff <= v_on_p))) {
                cnt_bad++;
                out_v[srt_v[i_v]] = next_n;
              }
           }
         }
         */
         if ((out_v[srt_v[i_v]] >= 0) && (out_v[srt_v[i_v]] < n_n)) { break; }
       }
       DEBUG && PRINT_N(3, ":: ----:" + i_v + "/" + n_v + " ready to loop back.");
    }
    if ((DEBUG) && (v_ob.verbose >= 2)) {
      console.log(vstr + " -- We reached i_v=" + i_v + "/" + n_v + ", setting out_v[" + srt_v[i_v] + "=" + 
        srt_v[i_v] + "] = " + out_v[srt_v[i_v]]);
    }
  }
  DEBUG && PRINT_N(2, " We believe successful exit (cnt_calc_cross=" + cnt_calc_cross+"). But cnt_bad="+cnt_bad);
  return(1);
}
p_exports.verify_cross= verify_cross;

const validate_out_v=function(bs01, pdiff, out_v, out_v2, srt_v, v_s, v_p, v_ot, v_ct,
         srt_nbbo, v_nop, v_not, tmax, eqstate, verbose_ob, timetouch) {
  let cnt_error = 0; const n_v = out_v.length; let error_v = [];
  const bsgn = (bs01==0) ? 1 : -1;
  let mx_ct = v_ct[0];  for (let ii = 0; ii < v_ct.length; ii++) { if (v_ct[ii] > mx_ct) { mx_ct=v_ct[ii]}}
  const tt = ((typeof(timetouch)=='bigint') 
                ? (typeof(v_ot)=='bigint') ? timetouch : Number(timetouch)
                : (typeof(v_ot)=='bigint') ? BigInt(timetouch) : Number(timetouch)); 
  const n_n = v_nop.length;  const n_nm1 = (n_n>0) ? n_n-1 : 0;
  const out_crit =  ((eqstate == false) 
                       ? ((bs01 == 0) 
                           ? (vp,nbop) => ((!Number.isNaN(nbop)) && ((vp + pdiff) > nbop))
                           : (vp,nbop) => ((!Number.isNaN(nbop)) && ((vp-pdiff) < nbop)) )
                       : ((bs01 == 0) 
                           ? (vp,nbop) => ((!Number.isNaN(nbop) && ((vp + pdiff) >= nbop))) 
                           : (vp,nbop) => ((!Number.isNaN(nbop) && ((vp-pdiff) <= nbop))) ) );
  const time_crit = ( (((typeof(timetouch)=='bigint') && (timetouch == 0n)) || (timetouch == 0)) 
                      ? (ot,ct,nto,ntc) =>  ((ot<=ntc) && (ct>=nto))
                      : ((ot,ct,nto,ntc) => (tt < ((ntc<ct)?ntc:ct) - ((ot>nto)?ot:nto)) ));
  const len_t_crit = ((ot,ct,nto,ntc) => ((ntc<ct)?ntc:ct) - ((ot>nto)?ot:nto));
  // Note with time
  let in_o = 0; let in_c = 0;
  for (let on_v = 0; on_v < n_v; on_v++) {
     const v_on_p = v_p[on_v];
     let an_error = 0;
     for (in_o = 0; in_o < n_n; in_o++) {
        if (out_crit(v_on_p, v_nop[in_o])) {
          for (in_c=in_o+1; in_c < n_n; in_c++) {
            if (!(out_crit(v_on_p,v_nop[in_c]))) {
              break;
            }
          } 
          const len_tc = len_t_crit(v_ot[on_v],v_ct[on_v], v_not[in_o], (in_c<n_n) ? v_not[in_c] : tmax);
          const bool_tc =  tt <= len_tc; 
          in_o = in_c-1;
          if (bool_tc) { 
            error.push({'i_v':on_v,'i_n':on_n, 'tc':len_tc}); an_error++; break;
          }
        }
     } 
     if ((out_v[on_v] < 0) && (an_error > 0)) {
       console.log("Error on_v=" + on_v + "/" + n_v + ", out_v[" + on_v + "] = " + out_v[on_v] + ", out_v2=" + out_v2[on_v] + " but seem to find cross at " + error_v[error_v.length-1].i_n + ".");
       cnt_error++;
     } else if ((out_v[on_v] >= 0) && (an_error == 0)) {
       console.log("Error on_v=" + on_v + "/" + n_v + ", out_v[" + on_v + "] = " + out_v[on_v] + ", out_v2=" + out_v2[on_v] + " but we didn't find a cross manually.");
      console.log(" EEE[bs01=" + bs01+ "] Note v_p[" + on_v + "] = " + v_p[on_v] + " + " + (bsgn*pdiff) + "=" + (v_p[on_v] + (bsgn*pdiff)) + " versuss nbbo[" + out_v[on_v] + "] = " + 
                   (v_nop[out_v[on_v]]) + " we say out_crit is " + out_crit(v_p[on_v], v_nop[out_v[on_v]]));
      console.log(" EEE note quote is (" + v_ot[on_v] + "," + v_ct[on_v] + ") and first of this nbbo from " + v_not[out_v[on_v]] + ", " + 
                      ((out_v[on_v] < v_nop.length-1) ? v_not[out_v[on_v]+1] : tmax) + "."); 
       cnt_error++;
     }
  }
  if (cnt_error > 0) {
    console.log("We end with a big number of errors." + cnt_error); debugger;
  }
  return(error_v);
}
  // -  checking buys(1) or sells(1) or both(2)
// The Slow brute force algorithm
//
// We could potentially GPU this algorithm, though many of the price checks it makes are likely
// unnecessary`
const slow_verify_price = function(out_v, pdiff, v_s, v_p, v_ot, v_ct,
              v_nop, v_not, tmax, eqstate, verbose, timetouch) {
  //let v_nop = *v_nop; let v_not = *v_not;
  const n_v = v_p.length; const n_n = v_nop.length;
  const vstr = ("slow_verify_price(pdiff=" + pdiff + ",n_v=" + n_v + ",n_n=" + n_n + ")");
  const PRINT_N = printer.make_print_n(verbose_ob, vstr);
  let nbad = 0;
  PRINT_N(1, " -- Begin ");
  let iv = 0; let ik=0;
  for (iv=0;iv<n_v;iv++) {
    out_v[iv] = -1;
  }
  for (iv=0;iv<n_v;iv++) {
    out_v[iv] = n_n;
    if (v_s[iv] == 0) {
      for (ik=0;ik<n_n;ik++) {
        if ((v_not[ik] > v_ct[iv]) || ((!(timetouch)) && (v_not[ik]>=v_ct[iv]))) {
          break;
        } else if ((ik+1 < n_n) && ( (v_not[ik+1] < v_ot[iv]) || ((!(timetouch)) && (v_not[ik+1] <= v_ot[iv])))) {
        } else if ((v_p[iv] + pdiff > v_nop[ik]) || ((!(!(eqstate))) && (v_p[iv]+pdiff >= v_nop[ik]))) {
          out_v[iv] = ik; nbad++; break;
        }
      }
    } else {
      for (ik=0;ik<n_n;ik++) {
        if ((v_not[ik] > v_ct[iv]) || ((!(timetouch)) && (v_not[ik]>=v_ct[iv]))) {
          break;
        } else if ((ik+1 < n_n) && ( (v_not[ik+1] < v_ot[iv]) || ((!(timetouch)) && (v_not[ik+1] <= v_ot[iv])))) {
        } else if ((v_p[iv] -pdiff < v_nop[ik]) || ((!(!(eqstate))) && (v_p[iv]-pdiff <= v_nop[ik]))) {
          out_v[iv] = ik; nbad++; break;
        }
      }
    }     
  }
  PRINT_N(1, " -- Done");
  return(nbad);
}
p_exports.remake_prev_ob = remake_prev_ob;
p_exports.validate_out_v = validate_out_v;
p_exports.basic_hms = basic_hms;
p_exports.make_st_v = make_st_v;
p_exports.slow_verify_price = slow_verify_price;
exports = p_exports;
module.exports = p_exports;
