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


///~///////////////////////////////////////////////////////////////////////
/// Safely subtract one from a BigInt
///
/// In Rust, it can be annoying that we have to create safety checks a lot in terms of a try_from
/// Ideally a macro might save space here, though often we can safely subtract 1 from
/// this value
//macro_rules!um1{
//  ($u0:expr) => { match usize::try_from(if $u0 == 0 {0 as i64} else {($u0 as i64)-1}) {Ok(val)=>val,Err(_e)=>0}}
//}
const um1 = (u0) => (u0==0) ? 0n : u0-1n; 
const ob_got = function(d,listF) {
  let ii = 0;
  if (Object.keys(d).length != listF.length) { return(false); }
  for (ii=0;ii<listF.length;ii++) {
    if (!(Object.keys(d).includes(listF[ii]))) { return(false); }
  }
  return(true);
}
p_exports = {'um1':um1, 'ob_got':ob_got};
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
  } else if (obgot(d, ["i0","v0","n0","srt0"])) {
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
const thresh_ip = function(ab01,v_nop,st_n,ip_u,ptgt) {
  if (ab01 === 0) {
    return( v_nop[st_n[ip_u]] <= ptgt );
  } else {
    return( v_nop[st_n[ip_u]] >= ptgt );
  }
}
const fast_alter_cross = function(ab01, ptgt, st_n, v_nop, out_ob, ip_eq, ip_u) {
  // ab01: above or below 0 or 1
  //let st_n = *st_n; let v_nop = *v_nop;
  const n_n = st_n.length; 
  //let mut t_out_ob.x:Vec<usize> = Vec::with_capatcity(out_ob.x.length);
  let write_i = 0;
  const nx_0 = out_ob.x.length; 
  let on_i = 0;
  for (on_i=0;on_i < nx_0;on_i++) {
    const on_p = v_nop[out_ob.x[on_i]];
    // It is possible if we are already in green territory, we can assume red on t=-1
    const prv_p = ( (outob.x[on_i]>0) ? v_nop[out_ob.x[on_i]-1] :
                  ( (ab01 === 0) ? ((on_p >= ptgt) ? (ptgt-1) : on_p) :
                                   ((on_p <= ptgt) ? (ptgt+1) : on_p)));
    // Our theory is that last line matters only if it is critical since can't assume jump after
    //  all that matters for last move is if its previous stage had a move.
    const nxt_p = ( outob.x[on_i]<(nn_0-1)) ? v_nop[out_ob.x[on_i]+1] : on_p;
    if ((on_p == ptgt)  ||
        ((on_p > ptgt) && ((prv_p<=ptgt) || (nxt_p <= ptgt))) ||
        ((on_p < ptgt) && ((prv_p>=ptgt) || (nxt_p >= ptgt)) ) ) {
      out_ob.x[write_i] = out_ob.x[on_i]; write_i=write_i+1;
    }
  }
  out_ob.x = out_ob.x.filter((x,i)=>i<write_i); // Everyone else is removed as they are no longer valid skips.
  // Next added memvers must be from 
  out_ob.ip_u = out_ob.ip_eq;
  if (out_ob.ip_u > 0) { out_ob.ip_u = out_ob.ip_u-1; };

  // Include zero if still relevant
  if ( ((ab01==0) && (v_nop[0] >= ptgt)) ||
       ((ab01==1) && (v_nop[0] <= ptgt)) ) {
    if (!out_ob.x.includes(0)) {
      out_ob.x.push(0);
    }
  }
  // We will sort st_n the prices differently, ascending for buys, descending for sells.
  for(;(( (out_ob.ip_u) < n_n) && thresh_ip(ab01, v_nop, st_n, out_ob.ip_u, ptgt));out_ob.ip_u++) {
    const on_sti = st_n[out_ob.ip_u];
    if (on_sti === 0) {
      continue; // Already addressed
    }
    const on_p = v_nop[on_sti];
    const prv_p = ( (on_sti>0) ? v_nop[on_sti-1] :
                    ( (ab01===0) ? ((on_p>=ptgt) ? (ptgt-1) : onp) :
                                   ((on_p<=ptgt) ? (ptgt+1) : onp)));
    const prv_sti = on_sti>0 ? on_sti-1 : 0;
    const nxt_p = ( (on_sti>n_n-1) ? v_nop[on_sti+1] : on_p );
    if ( ((prv_p<=ptgt) && (on_p>=ptgt)) ||
         ((prv_p>=ptgt) && (on_p<=ptgt))) {
      if (!(out_ob.x.includes(prv_sti))) {
        out_ob.x.push(prv_sti);
      }
    }
    if ((on_p === ptgt) ||
        ((on_p > ptgt) && (nxt_p<=ptgt)) ||
        ((on_p < ptgt) && (nxt_p>=ptgt))) {
      if (!(out_ob.x.includes(on_sti))) {
        out_ob.x.push(on_sti);
      }
    }
  } 
  return(out_ob.x.length);
}
p_exports.fast_alter_cross=fast_alter_cross;

const example_0 = {
  "v_nop":[10,20,30,40,50,50,40,40,30,10, 40, 40, 50, 10],
  "tm":   [ 0,10,20,30,40,50,60,70,80,90,100,110,120,130],
  "ordsp":[ 1, 1, 5, 5,10,10,10,20,40,40, 40, 50],
  "ordso":[ 0,49, 0,80,20,40,49,49,70,35,100,121],
  "ordsc":[90,51,12,95,25,45,72,72,80,80,129,128]
}
const make_example = function(ab01, ptgt, ex) {
  let st_n = Array(ex.v_nop.length);
  for (let i = 0; i < ex.v_nop.length;i++) { st_n[i] = i; }
  st_n = st_n.sort((a,b) => { let x=(ex.v_nop[a]-ex.v_nop[b]);  return( (x<0)?-1:(x>0)?1:(ex.tm[a]-ex.tm[b])<=0?-1:1 ); });
  const ex_ob = {
    "ab01":ab01, "ptgt":ptgt,
    "v_nop":ex.v_nop, "st_n":st_n,
    "out_b":{
      "x":[], "ip_u":0,"ip_eq":0
    }
  }
  return(ex_ob);
}
p_exports.example_0 =  example_0;
p_exports.make_example = make_example;
/**
em = make_example(0,10,example_0); ab01=em.ab01;ptgt=em.ptgt;st_n=em.st_n;v_nop=em.v_nop; out_ob = em.out_b; n_n=st_n.length;
**/
///~/////////////////////////////////
/// slow_calculate_cross
///
///  This works to identify all distinct crossings of price "ptgt" using the fact
///  We know this data is sorted by price than time using price then time using st_n
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
const slow_calculate_cross = function(ab01, ptgt, st_n, v_nop, 
  out_ob) {
  // out_ob has 3 manipulative fields, x, ip_eq, ip_u
  const n_n = st_n.length; let on_i = 0;
  out_ob.x = [];
  const thresh0 = (ab01==0) ? ((x,y)=>(x<y)) : ((x,y)=>(x>y));
  for (out_ob.ip_eq=0; (out_ob.ip_eq < n_n) && 
    (thresh0(v_nop[st_n[out_ob.ip_eq]],ptgt)); out_ob.ip_eq++) {

  }
  out_ob.ip_u = out_ob.ip_eq;
  const thresh1 = (ab01==0) ? ((x,y)=>(x<=y)) : ((x,y)=>(x>=y));
  for (out_ob.ip_u=0; (out_ob.ip_u < n_n) && 
    (thresh1(v_nop[st_n[out_ob.ip_u]],ptgt)); out_ob.ip_u++) {

  }
  if ( ((ab01===0) && (v_nop[0] >= ptgt)) ||
       ((ab01===1) && (v_nop[0] <= ptgt)) ) {
    out_ob.x.push(0);
  }
  
  const thresh_prev = (ab01==0) ? ((x,y)=>(x>=y)) : ((x,y)=>(x<=y));
  for (on_i=0;on_i<out_ob.ip_eq;on_i++) {
    const on_sti = st_n[on_i];
    const on_p = v_nop[st_n[on_i]];
    const prev_sti = um1(st_n[on_i]);
    const prev_p = (st_n[on_i]===0) ? on_p : v_nop[prev_sti];
    // Note it must be that on_p not inside ptgt; 
    if ((thresh_prev(prev_p,ptgt)) && (!(out_ob.x.contains(prev_sti)))) {
      out_ob.x.push(prev_sti);
    }
    const next_p = st_n[on_sti] + 1 >= n_n ? on_p : v_nop[st_n[on_sti]+1];
    if ( (thresh_prev(next_p,ptgt)) && (!(out_ob.x.contains(on_sti))) ) {
      out_ob.x.push(on_sti);
    }
  }
  for (on_i=out_ob.ip_eq;on_i<out_ob.ip_u;on_i++) {
    const on_sti = st_n[on_i];
    // No matter what, we are on line need to keep
    if (!(out_ob.x.contains(on_sti))) {
      out_ob.x.push(on_sti);
    }
  }
  out_ob.x = out_ob.x.sort();
  return(out_ob.x.length);
}

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
const full_check_jumps = function(onstr, ptgt, v_nop,cross_idx) {
  const np = v_nop.length; let nerr=0;
  const npm1 = um1(np);
  let cm_idx=[]; let it = 0;
  for (it=0;it<npm1;it++) {
    let on_p = v_nop[it]; let nxt_p = v_nop[it+1];
    if (on_p==ptgt) {
      cm_idx.push(it);
    } else if ((on_p<ptgt) && (nxt_p>=ptgt)) { 
      cm_idx.push(it); 
    } else if ((on_p>ptgt) && (nxt_p<=ptgt)) {
      cm_idx.push(it);
    }
  }
  if ((cm_idx.length == 0) && (cross_idx.length == 0)) {
    // Well, all clear
    return(0);
  } else if ((cm_idx.length > 0) && (cross_idx.length == 0)) {
    console.log("full_check_jump->" + onstr + " -- ERROR Found crosses versus Zero cm_idx len=" + 
      cm_idx.length + ", cross_idx len=" + cros_idx.length); nerr = nerr+1;
  }
  let d1 = 0;
  if ((cm_idx.length == um1(cross_idx.length))  && (cm_idx[0] != 0) && (cross_idx[0] == 0)) {
    // Edge case where we stuck an early zero because it is an "edge case check" (but you need
    // side input to know this.
    d1 = 1;
  } else  if (cm_idx.length != cross_idx.length) {
    console.log("full_check_jump->" + onstr + " -- ERROR, cm_idx len=" +cm_idx.length + 
      ", cross_idx len=" + cross_idx.length); nerr = nerr+1;
  }
  const nmin= (cm_idx.length < cross_idx.length) ?  cm_idx.length : cross_idx.length;
  let ix = 0;
  for (ix=0;ix<nmin;ix++) {
    if (cm_idx[ix] != cross_idx[ix+d1]) {
        console.log("full_check_jump->" + onstr + " Error on ix=" + ix + "/" + nmin + ", " +
          ((d1 == 1) ? "cross_idx[0]=0 so jump 1 " : "") + 
          ", we had cm_idx[" + ix + "]=" + cm_idx[ix] +  " but " + 
          "(ix+d1)=("+ix + "+" + d1 + "=" + (ix+d1) + "), [" + (ix + d1) + "] = " + 
          (ix + d1) + ", cross_idx[" + (ix+d1) + "] = " + 
          cross_idx[(ix+d1)]);
        console.log(" --- According to our issues v_nop[cm_idx[" + ix + "]=" + cm_idx[ix] + "]=" + v_nop[cm_idx[ix]] + 
          ", and v_nop[(cm_idx[" + ix + "]+1)=" + (cm_idx[ix] + 1) + "]=" + ((cm_idx[ix]+1<np) ? v_nop[cm_idx[ix]+1] : -1) + "," + 
          " , note ptgt=" + ptgt); 
    } 
  }
  if (nerr == 1) {
    console.log("Weird error must have been on a neq.");
    console.log("  Last cm_idx[" + (cm_idx.length-1) + "] = " + cm_idx[cm_idx.length-1] + ", for v_nop[" + 
      (cm_idx.length-1) + "]=" + v_nop[cm_idx.length-1] + " and v_nop[" + cm_idx[cm_idx.length-1] + "]=" + 
      v_nop[cm_idx[cm_idx.length-1]] + ".");
  }
  console.log("full_check_jump->{} full_check_jump finished with {} errors.", onstr, nerr);
  return(nerr);
}
///~///////////////////////////////////////////////////////////////////////////////////////////////
///  check_jumps()
///
///  TEST UTILITY
///
///  Check our calculated "cross_idx" vector and verifies that the events it calculated really do
///  jump accross the price level ptgt.
const check_jumps = function(onstr, ptgt, v_nop,cross_idx) {
  const np = v_nop.length; const nidx = cross_idx.length;
  let nerr = 0; let ix=0;
  for (ix=0;ix<nidx;ix++) {
    const oncross_idx = cross_idx[ix];
    const next_idx = oncross_idx + 1;
    const on_price = v_nop[cross_idx[ix]];
    if ((ix == 0) && (cross_idx[ix] == 0)) {
      // Edge case, yes, this is technically only good if the data is on "wrong side" at t=0, but
      // we don't really need to check this one.
    } else if (next_idx >= np) {
      console.log("check_jumps: Really awkward error " + onstr + ", next_idx = " + next_idx + " but np=" + 
        np + ", we were ix=" + ix + ", oncross_idx=" + oncross_idx + ", ptgt=" + ptgt);
      nerr = nerr + 1;
    } else {
      const next_price = v_nop[next_idx];
      if ((on_price > ptgt) && (next_price < ptgt)) {
      } else if ((on_price > ptgt) && (next_price == ptgt)) {
      } else if ((on_price == ptgt) && (next_price < ptgt)) {
      } else if ((on_price == ptgt) && (next_price > ptgt)) {
      } else if ((on_price < ptgt) && (next_price > ptgt)) {
      } else if ((on_price < ptgt) && (next_price == ptgt)) {
      } else {
        console.log("check_jumps: ERROR " + onstr + ", we ix=" + ix + ", price location " + oncross_idx+
          ", jump from " +on_price + " to " + next_price +  " but ptgt=" + ptgt);
        nerr = nerr + 1;
      }

    }

  } 
  return(nerr);
}

// Searches for first v_s=1 value, or the beginning of our sells
const find_1 = function(st_v, v_s) {
  let i0 = 0; if (v_s[st_v[i0]] == 1) { return(i0); }
  let i1 = um1(st_v.length); if (v_s[st_v[i1]] == 0) { return(st_v.length); }
  while(i0<i1) {
    if (i0 == i1) { return(i0); }
    const tp  = (Math.round((i0 + i1) / 2) >= i0) ? Math.round((i0+i1)/2) : um1(1);
    if (tp == i1) { if (v_s[st_v[um1(tp)]] == 0) { return(tp); } else { i1 = um1(i1); }
    }  else if (tp == i0) { if (v_s[st_v[tp+1]] == 1) { return(tp+1); } else {i0 = tp+1; }
    }  else if (v_s[st_v[tp]] == 1) { i1 = tp; if (v_s[st_v[um1(tp)]] == 0) { return tp; }
    }  else if (v_s[st_v[tp]] == 0) { i0 = tp;
    }
  }
}
p_exports.find_1= find_1;


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
const verify_cross=function(bs01, out_v, st_v, pdiff, v_s, v_p, v_ot, v_ct,
              v_nop, v_not, eqstate, verbose, timetouch) {
  // -  checking buys(1) or sells(1) or both(2)
  // out_v
  // pdiff our target.
  // v_s,v_p,v_ot, v_ct, side,price,open,close of resting orders
  // v_nop,v_not: price target to rate against, 
  //let v_nop = *v_nop; let v_not = *v_not;
  const n_v = v_p.length; const n_n = v_nop.length; 
  const vstr = ("verify_crosses_" + ((bs01===2) ? "both " : ((bs01==1) ? "sell " : "buy")) + 
    "(n_v=" + n_v + ",n_n=" + n_n + "tt=" + (timetouch ? "touch" : "cross") +")");
  if (verbose >= 1) { console.log(vstr + ": We begin"); }
  if (n_v <= 0) {  return -1; } // No buys to match, return nothing. 
  if (n_n <= 0) {  return -1; } // No NBBO cant do anything. 

  const n_buy = find_1(st_v, v_s);
  if ((bs01==0) && (n_buy <= 0)) { return(0); }
  if ((bs01==1) && (v_s.length-n_buy <= 0)) { return(0); }
  if ((bs01==2)) {
    return( verify_cross(0,out_ob, st_v,pdiff,v_s,v_p,v_ot,v_ot,
              v_nop, v_not, eqstate, verbose, timetouch) + 
            verify_cross(1,out_ob, st_v,pdiff,v_s,v_p,v_ot,v_ot,
              v_nop, v_not, eqstate, verbose, timetouch) );
  }
  //let st_v = sort_v_pt(&v_s, &v_p, &v_ot);
  let ix = 0; 
  // Assume st_v already sorted?
  //let st_v = Array(n_n); for (ix=0;ix<n_n;ix++) { st_v[ix]=ix; }
  //st_v = st_v.sort((a,b)=>{ return( (v_nop[a]==v_nop[b]) ? (v_not[a]-v_not[b]) : (v_nop[a]-v_nop[b])) });

  if (verbose >= 2) {
    console.log(vstr + " --- We are beginning with the vectors we have sorted. ", vstr);
    print_v({'i0':(vstr + ": st_v,"),'v0':st_v,'n0':5}); 
    print_v({'i0':(vstr + ": st_n,"),'v0':st_n,'n0':5});
  }
  //let mut out_v: Vec<u64> = vec![n_n as u64;n_v as usize];
  let on_plev = v_p[st_v[0]] + pdiff;
  let cross_idx = [];
  let on_ix = 0;
  
  let ip_eq = 0; let ip_u = 0;
  const out_ob = {'x':[], ip_eq:0,ip_u:0};
  let nx = ((bs01===0) ? slow_calculate_cross(0, on_plev, st_n, v_nop, out_ob) :
            slow_calculate_cross(1, on_plev, st_n, v_nop, out_ob));
  let sort_cross_idx = resort_out_x(cross_idx);
  if (verbose >= 2) {
    console.log(vstr + " - for first price on_plev=" + on_plev + "=[" + v_p[st_v[0]] + "=st_v[" + 
       st_v[0] + "]]-pdiff=" + pdiff + " we have ip_eq=" + ip_eq + ", ip_u=" + ip_u);
     print_v({'i0':(vstr + ": sort_cross_idx"), 'v0':sort_cross_idx, 'n0':5});
     print_v({'i0':(vstr+": cross_idx"), 'v0':cross_idx, 'n0':5, 'srt0':sort_cross_idx}); 
     print_v({'i0':(vstr + ": v_nop[cidx]"), 'v0':v_nop,'n0':5,'srt0':sort_cross_idx,'othv0':cross_idx}); 
  }

  const n_nm1 = um1(n_n); let i_v = 0;
  for (i_v=0;i_v<n_v;i_v++) {
    const v_on_p = v_p[st_v[i_v]]; const v_on_ct = v_ct[st_v[i_v]]; 
    if (v_s[st_v[i_v]] == 1) { break; }
    const v_on_ot = v_ot[st_v[i_v]];
    if ((v_on_p+pdiff) > on_plev) {
      on_plev = v_on_p + pdiff;
      // Note "update_cross_above(...) will start from zero no matter price target.
      //   It will typically start at "minimum price" however, so it goes up.
      //
      // Fast Alter should be faster that just
      // alters existing solution
      nx = fast_alter_cross(bs01, on_plev, st_n, v_nop, out_ob);
      out_ob.x = out_ob.x.sort();
      on_ix = 0;
      if (verbose >= 2) {
        console.log(vstr + " - for renewed price on_plev=" + on_plev + "=" + v_p[st_v[i_v]] + 
          "[" + st_v[i_v] + "=st_v[" + i_v + "]]- pdiff=" + pdiff + " we have ip_eq=" + ip_eq + ", ip_u=" + ip_u);
        print_v({'i0':(vstr + ": sort_cross_idx"), 'v0':sort_cross_idx, 'n0':5});
        print_v({'i0':(vstr + ": cross_idx"), 'v0':cross_idx, 'n0':5, 'srt0':sort_cross_idx}); 
        print_v({'i0':(vstr + ": v_nop[cidx]"), 'v0':v_nop,'n0':5,'srt0':sort_cross_idx,'othv0':cross_idx}); 
        const nerr = check_jumps((vstr + "[i_v="+i_v+"]"), on_plev, v_nop, out_ob.x);
        const nerr2 = full_check_jumps((vstr + "[i_v=" + i_v + "]"), on_plev, v_nop, cross_idx);
        console.log(vstr + " -- We checked jumps and got " + nerr + " errors for " + nx + " finds, on_plev=" + on_plev + 
          ", n_n=" + n_n + ", nerr2=" + nerr2); 
        if (nerr > 0) { console.log(vstr + " ERROR we know we aren't doing good. ip_eq=" + ip_eq + ", ip_u=" + ip_u); }
      }
    }
    if (verbose >= 3) {
      console.log("\n\n" + vstr + ": on (i_v=" + i_v + "/" + st_v.length + "=st_v=" + st_v[i_v] + "), " + 
         "v_p[" + st_v[i_v] + "]=" + v_p[st_v[i_v]] + ", ot--ct==[" + basic_hms(v_ot[st_v[i_v]]) + "--"+basic_hms(v_ct[st_v[i_v]]) + "]");
        print_v({'i0':("      : sort_cross_idx"), 'v0':sort_cross_idx, 'n0':5});
        print_v({'i0':("      : cross_idx"), 'v0':cross_idx, 'n0':5, 'srt0':sort_cross_idx}); 
        print_v({'i0':("      : v_nop[cidx]"), 'v0':v_nop,'n0':5,'srt0':sort_cross_idx,'othv0':cross_idx}); 

    }
    if (nx == 0) {
      if (verbose >= 2) {
        console.log(vstr + " -- in this case nx=" + nx + ", ip_eq=" + ip_eq + "/" + n_n + ", on_plev=" + on_plev + 
          ", but local price=" + v_p[st_v[i_v]] + " for pdiff=" + pdiff + ", v_nop ranges = [" + v_nop[st_n[0]] + 
          "," + v_nop[st_n[n_nm1]] + "], what do we detect?");
      }
      if (ip_eq >= n_n) {
        // In this case all prices are always less if there is any overlap.  Reject
        if ((v_on_ot <= v_not[um1(n_n)]) && (v_on_ct >= v_not[0])) {
          out_v[st_v[i_v]] = 0;
        } else {
          // Crazy case everyone out of range
          out_v[st_v[i_v]] = n_n;
        }
      } else if ((v_nop[st_n[0]] - pdiff) > on_plev) {
        // In this case all prices are north of issue.  We should keep this point.
        out_v[st_v[i_v]] = n_n;
      } else {
        console.log(vstr + "  ISSUE nx = 0, for v_nop range [" + v_nop[st_n[0]] + "," + v_nop[st_n[n_nm1]] + 
          "], ip_eq=" + ip_eq + "/" + n_n + ", on_plev=" + on_plev + " but pdiff=" + pdiff);
      }
    } else {
       // Note: our logic for determining a "full/partial"touch could be better organized, but
       // there is some complexity as to what counts as a "damning cross" versus a "near miss"
       let i_x = 0; let on_n = 0;
       for (i_x=on_ix;i_x<nx;i_x++) {
         const v_on_not = v_not[cross_idx[i_x]];
         const v_on_not_next = (i_x+1 < nx) ? v_not[cross_idx[i_x+1]] : v_on_not;
         const current_n = cross_idx[i_x];
         const next_n = ((current_n+1) < n_n) ? (current_n+1) : current_n;
         if (v_on_not < v_on_ot) {
           if ((i_x +1 < nx) && (v_on_not_next < v_on_ot)) {
             on_ix = on_ix + 1;
           } else if ((timetouch==false) && (v_on_not_next == v_on_ot)) {
           } else {
             // If we are at last break before v_ot we have to as questions.
             const lastn = ((i_x+1) < sort_cross_idx.length) ? cross_idx[i_x+1] : v_not.length;
             for (on_n=current_n;on_n<lastn;on_n++) {
                const next_n = (on_n+1 < v_not.length) ? (on_n+1) : on_n ;
                if ((v_not[on_n] > v_ct[st_v[i_v]]) || ((timetouch==false) && (v_not[on_n] >= v_on_ct))) { 
                  break;
                } else if ((v_not[next_n] > v_ot[st_v[i_v]]) || ((timetouch==true) && (v_not[next_n] >= v_on_ot))) {
                  if ((v_nop[on_n]-pdiff < v_p[st_v[i_v]]) || ((eqstate==true) && (v_nop[on_n]-pdiff <= v_p[st_v[i_v]]))) {
                    out_v[st_v[i_v]] = on_n; break;
                  }
                }
             }
           }
         } else if ((v_on_not > v_ct[st_v[i_v]]) || ((timetouch==false) && v_on_not == v_ct[st_v[i_v]])) {
           break;
         } else {
           if ((v_nop[current_n] - pdiff < v_on_p) || ((eqstate) && (v_nop[current_n]-pdiff <= v_on_p))) {
             out_v[st_v[i_v]] = current_n;
           } else if ((v_not[next_n] < v_on_ct) || ((timetouch) && (v_not[next_n] <= v_on_ct))) {
              if ((v_nop[next_n]-pdiff < v_on_p) || ((eqstate==true) && (v_nop[next_n]-pdiff <= v_on_p))) {
                out_v[st_v[i_v]] = next_n;
              }
           }
         }
         if (out_v[st_v[i_v]] < n_n) { break; }
       }
       if (out_v[st_v[i_v]] >= n_n) {
         out_v[st_v[i_v]] = n_n;  // We have passed all challenges.
       }
    }
    if (verbose >= 2) {
      console.log(vstr + " -- We reached i_v=" + i_v + "/" + n_v + ", setting out_v[" + st_v[i_v] + "=" + 
        st_v[i_v] + "] = " + out_v[st_v[i_v]]);
    }
  }
  return(1);
}
p_exports.verify_cross= verify_cross;
// The Slow brute force algorithm
//
// We could potentially GPU this algorithm, though many of the price checks it makes are likely
// unnecessary`
const slow_verify_price = function(out_v, pdiff, v_s, v_p, v_ot, v_ct,
              v_nop, v_not, eqstate, verbose, timetouch) {
  //let v_nop = *v_nop; let v_not = *v_not;
  const n_v = v_p.length; const n_n = v_nop.length;
  const vstr = ("slow_verify_price(pdiff=" + pdiff + ",n_v=" + n_v + ",n_n=" + n_n + ")");
  if (verbose >= 1) {
    console.log(vstr + " -- Begin ");
  }
  let iv = 0; let ik=0;
  for (iv=0;iv<n_v;iv++) {
    out_v[iv] = n_n;
    if (v_s[iv] == 0) {
      for (ik=0;ik<n_n;ik++) {
        if ((v_not[ik] > v_ct[iv]) || ((!(timetouch)) && (v_not[ik]>=v_ct[iv]))) {
          break;
        } else if ((ik+1 < n_n) && ( (v_not[ik+1] < v_ot[iv]) || ((!(timetouch)) && (v_not[ik+1] <= v_ot[iv])))) {
        } else if ((v_p[iv] + pdiff > v_nop[ik]) || ((!(!(eqstate))) && (v_p[iv]+pdiff >= v_nop[ik]))) {
          out_v[iv] = ik; break;
        }
      }
    } else {
      for (ik=0;ik<n_n;ik++) {
        if ((v_not[ik] > v_ct[iv]) || ((!(timetouch)) && (v_not[ik]>=v_ct[iv]))) {
          break;
        } else if ((ik+1 < n_n) && ( (v_not[ik+1] < v_ot[iv]) || ((!(timetouch)) && (v_not[ik+1] <= v_ot[iv])))) {
        } else if ((v_p[iv] -pdiff < v_nop[ik]) || ((!(!(eqstate))) && (v_p[iv]-pdiff <= v_nop[ik]))) {
          out_v[iv] = ik; break;
        }
      }
    }     
  }
  return(1);
}
p_exports.slow_verify_price = slow_verify_price;
exports = p_exports;
module.exports = p_exports;
