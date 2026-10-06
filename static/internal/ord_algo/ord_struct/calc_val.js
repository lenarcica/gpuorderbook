import { Kalgo, str_kalgo,und_str_kalgo, TotalCurrentState, MarketExchangeBook, make_print_n} from '../ord_struct.js';

//
/////////////////////////////////////////////////////////////////////////////////////////////////
/// calc_val.js
///
/// Functions that backcheck/verify power
///
/// Fast orderbook calculations are only good if their steps can be backchecked and verified.
///
/// Code here should not run during production algorithms, but is designed to provide
///   a "backcheck" of a number and verify that the in-place calculation replicates the
///   result of calculating the value from the totality of the order structure.
///
/// Back checking with a completely alternate method, can however, create a lot of challenging
///  code in its own right, given that we must implement a backcheck of Kalgos of type:
///   :: NumFilled/NumAll/NumPennies/TotalDollars/MultipleSpread/ExpDecay/PctDepth
///
/// Of the above, the "oddest man out" is the ExpDecay calculation.  Calculating this value 
///  from scratch requires an exponential decay kernel that is positive on all prices
///  from p0i .. 0 that have v_q > 0.
///
/// After false starts, we determine a simplified method, using some Rust Macros,
///   which can try to generalize the standard format of a "slow" calculation.
///
/// 1. "calc_barrier_ALGO": Calculate the "barrier_pi" which is a Price level index, somewhere
///   from 0 to p0i, which, for a given "ik" determines the "smallest" price that is still
///   within a calculation barrier.
/// 2. Use the barrier_pi to calculate a "ManualCalc" which includes a total_q, total_pq,
///    worstpi, and nocc for every value.  (we don't quite know how to check "atq" and that's
///    manual)
/// 3. Run  "check_algo_ALGO" which runs this against all Buy/Sell Market/Related elements
///
///  Later false starts on the manual slow calculation can be ignored, but we explored
///   doing some calculations by inputting a "$crit_cond".  But that critical condition
///   can be too complicated, and it was more elegant to slightly rewrite the "calc_barrier"
///   functions by hand without macros.  This is because the search for a critical "barrier_pi"
///   can have many different strategies.
///   

class ManualCalc {
  total_q = 0; total_pq = 0; worstpi = -1; nocc = 0; barrier_pi = 0;
  constructor({in_total_q, in_total_pq, in_worstpi, in_nocc, in_barrier_pi}) {
    this.total_q = in_total_q; this.total_pq = in_total_pq;
    this.worstpi = in_worstpi; this.nocc = in_nocc; this.barrier_pi = in_barrier_pi;
  }
}
/// I. calc_barrier_ALGO (all except ExpDecay have a barrier_pi)
///
/// Note these are different in each case, so rather than building with macro we
///   conducted small manual changes that are relevant to a given barrier definition.
/// If "barrier_pi == 0", then this means there is effectively no barrier and all prices pi >= 0
/// can be considered part of a total.
const calc_barrier_algo = function(kalgo, xb, tcs, bs01, ik) {
  if (typeof(bs01) == 'string') {
    bs01 = (bs01 == 'B') ? 0  : (bs01=='b') ? 0 : (bs01==0) ? 0 : bs01;
    bs01 = (bs01 == 'S') ? 1 : (bs01=='s') ? 1 : (bs01==1) ? 1 : bs01;
  }
  switch (kalgo) {
     case Kalgo.NumFilled : 
     return(calc_barrier_num_filled(xb,tcs,bs01,ik));
     case Kalgo.NumShares :
     return(calc_barrier_num_shares(xb,tcs,bs01,ik));
     case Kalgo.TotalDollars :
     return(calc_barrier_total_dollars(xb,tcs,bs01,ik));
     case Kalgo.NumAll :
     return(calc_barrier_num_all(xb,tcs,bs01,ik));
     case Kalgo.NumPennies :
     return(calc_barrier_num_pennies(xb,tcs,bs01,ik));
     case Kalgo.MultipleSpread :
     return(calc_barrier_multiple_spread(xb,tcs,bs01,ik));
     case Kalgo.PctDepth :
     return(calc_barrier_pct_depth(xb,tcs,bs01,ik));
     default:
      console.log("calc_barrier_algo: given kalgo = " + str_kalgo(kalgo) + " for int kalgo = " + kalgo);
      return(0);
  }
  return(0);
}
const calc_barrier_num_filled = function(xb, tcs, bs01,ik) {
   const dcs = (bs01==0) ? tcs.b : tcs.s;
   const dxb = (bs01==0) ? xb.b : xb.s;
   let onmpi = dxb.m.p0i; let t_m_nocc = 0;
   while (onmpi < dxb.m.np) {
     t_m_nocc += 1;
     if (t_m_nocc >= dcs.v_1ls[ik].d) { return(onmpi); }
     onmpi = dxb.m.v_nxt[onmpi];
   } 
   return(0);
}


const calc_barrier_num_shares = function(xb, tcs, bs01,ik)  {
   const dcs = (bs01==0) ? tcs.b : tcs.s;
   const dxb = (bs01==0) ? xb.b : xb.s;
   let onmpi = dxb.m.p0i; let t_m_nocc = 0;
   let mtotal_q = 0.0;
   while (onmpi < dxb.m.np) {
     mtotal_q += dxb.m.v_q[onmpi];
     if (mtotal_q >= (dcs.v_1ls[ik].d)) { return(onmpi); }
     onmpi = dxb.m.v_nxt[onmpi];
   } 
   return(0);
}


const calc_barrier_total_dollars = function(xb, tcs, bs01,ik) {
   const dcs = (bs01==0) ? tcs.b : tcs.s;
   const dxb = (bs01==0) ? xb.b : xb.s;
   let onmpi = dxb.m.p0i; 
   let mtotal_pq = 0.0;
   while (onmpi < dxb.m.np) {
     mtotal_pq += dxb.m.v_q[onmpi] * dxb.m.v_p[onmpi];
     if (mtotal_pq >= dcs.v_1ls[ik].fd) { return(onmpi); }
     onmpi = dxb.m.v_nxt[onmpi];
   } 
   return(0);
}


const calc_barrier_num_all = function(xb, tcs, bs01, ik) {
   const dcs = (bs01==0) ? tcs.b : tcs.s;
   const dxb = (bs01==0) ? xb.b : xb.s;
   let onmpi = dxb.m.p0i; 
   if (onmpi >= dxb.m.np) { return(0); }
   let di64 = dcs.v_1ls[ik].d;
   if (onmpi < di64) { return(0); }
   let tgti = onmpi - di64 + 1;
   return(tgti);
}

const calc_barrier_num_pennies = function(xb, tcs, bs01, ik) {
   const dcs = (bs01==0) ? tcs.b : tcs.s;
   const dxb = (bs01==0) ? xb.b : xb.s;
   let onmpi = 0;  const mp0i = dxb.m.p0i; const mp0 = dxb.m.v_p[mp0i];
   if (mp0i >= dxb.m.np) { return(0); }
   while ((onmpi < dxb.m.p0i) && (Math.abs(mp0 - dxb.m.v_p[onmpi]) > dcs.v_1ls[ik].fd)) {
      onmpi += 1;
   }
   return(onmpi);
}

const calc_barrier_multiple_spread = function(xb, tcs, bs01, ik)  {
   const dcs = (bs01==0) ? tcs.b : tcs.s;
   const dxb = (bs01==0) ? xb.b : xb.s;
   if (xb.b.m.p0i >= xb.b.m.np) { return(0); }
   if (xb.s.m.p0i >= xb.s.m.np) { return(0); }
   const spread =  xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i];
   if (spread <= 0.0)  { return(0); }
   const cond = spread * dcs.v_1ls[ik].fd;
   let onmpi = 0;
   while (Math.abs(dxb.m.v_p[dxb.m.p0i] - dxb.m.v_p[onmpi]) > cond) {
     onmpi += 1;
   }
   return(onmpi);
}

const calc_barrier_pct_depth = function(xb, tcs, bs01, ik) {
   const dcs = (bs01==0) ? tcs.b : tcs.s;
   const dxb = (bs01==0) ? xb.b : xb.s;
   const p0i = dxb.m.p0i;
   if (p0i >= dxb.m.np) { return(0); }
   const cond = dxb.m.v_p[ p0i ] * dcs.v_1ls[ik].fd;
   let onmpi = 0;
   while ( (onmpi < p0i)  && (Math.abs(dxb.m.v_p[p0i] - dxb.m.v_p[onmpi]) > cond)) {
      onmpi += 1;
   }
   return(onmpi);
}
const calc_mc_ir_barrier = function(xb,
  bs01, ir, barrier_pi) {
  const dxb = (bs01==0) ? xb.b : xb.s;
  if ((typeof(dxb) != 'object') || (!('vr' in dxb))) {
    console.log("calc_mc_ir_barrier: Error, dxb does not have vr?");  debugger;
  }
  let onrpi = dxb.vr[ir].p0i;
  let rtotal_q = 0.0; let rtotal_pq = 0.0;
  let wrpi = dxb.vr[ir].np; let t_r_nocc = 0;

  if (onrpi >= dxb.m.np) {
    return(new ManualCalc({"in_total_q":0.0, "in_total_pq":0.0, "in_worstpi":dxb.vr[ir].np, 
     "in_nocc":0, "in_barrier_pi": dxb.m.np}));
  }
  const on_barrier_pi = ((barrier_pi == 0) || (barrier_pi >= dxb.m.np))  ? 0 : barrier_pi;
  if (onrpi < on_barrier_pi) {
    return(new ManualCalc({"in_total_q":0.0, "in_total_pq":0.0, "in_worstpi":dxb.vr[ir].np, 
     "in_nocc":0, "in_barrier_pi": dxb.m.np}));
  }
  // Do Case up to and including Best p0i Price
  while ( (onrpi < dxb.m.np) && (onrpi >= on_barrier_pi) ) {
      if (dxb.vr[ir].v_q[onrpi] > 0.0) {
        rtotal_q += dxb.vr[ir].v_q[onrpi];
        rtotal_pq += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
        wrpi = onrpi + 0; t_r_nocc += 1;
      } else {
         console.log("calc_mc_ir_barrier --- ERROR issue, we were sent to onrpi=" + onrpi + 
           ", p0i=" + dxb.vr[ir].p0i + " for ir=" + ir + "/" + 
           dxb.vr.length + " but q=" + dxb.vr[ir].v_q[onrpi] + ".");
      }
      onrpi = dxb.vr[ir].v_nxt[onrpi]; 
  } 
  if ((dxb.vr[ir].p0i < dxb.m.np) && (wrpi >= dxb.m.np)) {
    console.log("calc_mc_ir_barrier: ERROR, here we are, np=" + dxb.m.np + ", p0i=" + 
      dxb.vr[ir].p0i + ", but wrpi is " + wrpi);
    console.log("INSPECT ERROR");
    debugger;
  }
  return(new ManualCalc({"in_total_q":rtotal_q, "in_total_pq":rtotal_pq, 
    "in_worstpi":wrpi, "in_nocc":t_r_nocc, "in_barrier_pi":barrier_pi}));
}

const calc_mc_m_exp_decay= function(xb, tcs, bs01, ik) {

  const dxb = (bs01==0) ? xb.b : xb.s;
  const dcs = (bs01==0) ? tcs.b : tcs.s;
  let onmpi = dxb.m.p0i;

  let wmpi = dxb.m.np;
  // While these are all trivial to calculate, not all are needed in every algo
  let mtotal_q = 0.0; let mtotal_pq = 0.0; let t_m_nocc = 0;
  
  let decay_fac = 0.0;

  if (onmpi >= dxb.m.np) {
    return(new ManualCalc({"in_total_q":0.0, "in_total_pq":0.0, "in_worstpi":dxb.m.np, "in_nocc":0,
      "in_barrier_pi":0}));
  }
  while (onmpi < dxb.m.np) {
    decay_fac = Math.exp(- dcs.v_1ls[ik].fd * Math.abs( dxb.m.v_p[dxb.m.p0i] - dxb.m.v_p[onmpi]));
    mtotal_q += dxb.m.v_q[onmpi] * decay_fac;
    mtotal_pq += dxb.m.v_q[onmpi] * dxb.m.v_p[onmpi] * decay_fac;
    t_m_nocc += 1;
    wmpi = onmpi;
    onmpi = dxb.m.v_nxt[onmpi];
  }
  return(new ManualCalc({"in_total_q":mtotal_q, "in_total_pq":mtotal_pq, "in_worstpi":wmpi, 
    "in_nocc":t_m_nocc, "in_barrier_pi":0}));
}


const calc_mc_ir_exp_decay = function(xb, tcs, bs01, ir, ik) {

  const dxb = (bs01==0) ? xb.b : xb.s;
  const dcs = (bs01==0) ? tcs.b : tcs.s;
  let onrpi = dxb.vr[ir].p0i;

  let wrpi = dxb.m.np;
  // While these are all trivial to calculate, not all are needed in every algo
  let rtotal_q = 0.0; let rtotal_pq = 0.0; let t_r_nocc = 0;
  // Do Case up to and including Best p0i Price
  if (onrpi >= dxb.m.np) {
    return(new ManualCalc({"in_total_q":0.0, "in_total_pq":0.0, "in_worstpi":dxb.m.np, "in_nocc":0, "in_barrier_pi":0}));
  }
  if (dxb.m.p0i >= dxb.m.np) {
      while (onrpi < dxb.m.np) {
        rtotal_q += dxb.vr[ir].v_q[onrpi];
        rtotal_pq += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
        wrpi = onrpi; t_r_nocc += 1;
        onrpi = dxb.vr[ir].v_nxt[onrpi];
      } 
      return(new ManualCalc({"in_total_q":rtotal_q, "in_total_pq":rtotal_pq, "in_worstpi":wrpi, 
        "in_nocc":t_r_nocc, "in_barrier_pi":0}));
    }
    while ((onrpi < dxb.m.np) && (onrpi >= dxb.m.p0i)) {
      rtotal_q += dxb.vr[ir].v_q[onrpi];
      rtotal_pq += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
      wrpi = onrpi;
      onrpi = dxb.vr[ir].v_nxt[onrpi]; t_r_nocc += 1;
    } 

    while (onrpi < dxb.m.np) {
      let decay_fac = Math.exp(- dcs.v_1ls[ik].fd * Math.abs( dxb.m.v_p[dxb.m.p0i] - dxb.vr[ir].v_p[onrpi])); 
      rtotal_q += dxb.vr[ir].v_q[onrpi] * decay_fac;
      rtotal_pq += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi] * decay_fac;
      t_r_nocc += 1;
      wrpi = onrpi;
      onrpi = dxb.vr[ir].v_nxt[onrpi];
    }
    return(new ManualCalc({"in_total_q":rtotal_q, "in_total_pq":rtotal_pq, "in_worstpi":wrpi, "in_nocc":t_r_nocc, "in_barrier_pi":0}));
}

// calc_mc_m_algo calculates the material
const calc_mc_m_algo = function(kalgo, xb, tcs, bs01, ik) {
  const barrier_pi = calc_barrier_algo(kalgo, xb, tcs, bs01, ik);
  const dxb = (bs01==0) ? xb.b : xb.s;
  let onmpi = dxb.m.p0i;
  let mtotal_q = 0.0; let mtotal_pq = 0.0;
  let wmpi = dxb.m.np; let t_m_nocc = 0;

  if (onmpi >= dxb.m.np) {
    return(new ManualCalc({"in_total_q":mtotal_q, 
      "in_total_pq":mtotal_pq, "in_worstpi": dxb.m.np, 
      "in_nocc": t_m_nocc, "in_barrier_pi":barrier_pi}));
  }
  const on_barrier_pi = (barrier_pi >= dxb.m.np) ? 0 : barrier_pi;
  if (kalgo = Kalgo.ExpDecay) {
    return(calc_mc_m_exp_decay(xb,tcs,bs01,ik));
  }
  // Do Case up to and including Best p0i Price
  while ((onmpi < dxb.m.np) && (onmpi >= on_barrier_pi)) {
    mtotal_q += dxb.m.v_q[onmpi];
    mtotal_pq += dxb.m.v_q[onmpi] * dxb.m.v_p[onmpi];
    wmpi = onmpi; t_m_nocc += 1;
    onmpi = dxb.m.v_nxt[onmpi]; 
  } 
  if (wmpi >= dxb.m.np) {
    console.log("calc_mc_m_algo(" + ((bs01==0) ? "b":"s") + ", mp0i=" +
     dxb.m.p0i + "/" + dxb.m.np + ") but wmpi is " + wmpi);
    console.log("INSPECT ERROR");
    debugger;
  }
  return(new ManualCalc({"in_total_q":total_q, "in_total_pq":total_pq, "in_worst_pi":wmpi, "in_nocc":t_m_nocc,
        "in_barrier_pi":barrier_pi}));
}
const calc_mc_ir_algo = function(kalgo, xb, tcs, bs01, ik, ir) {
  const barrier_pi = calc_barrier_algo(kalgo, xb, tcs, bs01, ik);
  const dxb = (bs01==0) ? xb.b : xb.s;
  let onrpi = dxb.vr[ir].p0i;
  let rtotal_q = 0.0; let rtotal_pq = 0.0;
  let wrpi = dxb.vr[ir].np; let t_r_nocc = 0;
  const on_barrier_pi = (barrier_pi >= dxb.m.np) ? 0 : barrier_pi;
  if (onrpi >= dxb.vr[ir].np) {
    return(new ManualCalc({"in_total_q":rtotal_q, "in_total_pq":rtotal_pq, "in_worstpi":dxb.vr[ir].np, "in_nocc":t_r_nocc,
      "in_barrier_pi":barrier_pi}));
  }
  if (kalgo = Kalgo.ExpDecay) {
    return(calc_mc_ir_exp_decay(xb,tcs,bs01,ik,ir));
  }
  // Do Case up to and including Best p0i Price
  while ((onrpi < dxb.vr[ir].np) && (onrpi >= barrier_pi)) {
    rtotal_q += dxb.vr[ir].v_q[onrpi];
    rtotal_pq += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
    wrpi = onmpi; t_r_nocc += 1;
    onrpi = dxb.vr[ir].v_nxt[onrpi]; 
  } 
  return(new ManualCalc({"in_total_q":rtotal_q, "in_total_pq":rtotal_pq, "in_worstpi":wrpi, "in_nocc":t_r_nocc,
    "in_barrier_pi":barrier_pi}));
}
// m_barrier
const calc_mc_m_barrier = function(xb, bs01, barrier_pi) {
  const dxb = (bs01==0) ? xb.b : xb.s;
  let onmpi = dxb.m.p0i;
  let mtotal_q = 0.0; let mtotal_pq = 0.0;
  let wmpi = dxb.m.np; let t_m_nocc = 0;
  const on_barrier_pi = (barrier_pi >= dxb.m.np) ? 0 : barrier_pi;

  if (onmpi >= dxb.m.np) {
    return(new ManualCalc({"in_total_q":mtotal_q, "in_total_pq":mtotal_pq, "in_worstpi":dxb.m.np, "in_nocc":t_m_nocc,
      "in_barrier_pi":barrier_pi}));
  }
  // Do Case up to and including Best p0i Price
  while ((onmpi < dxb.m.np) && (onmpi >= barrier_pi)) {
    mtotal_q += dxb.m.v_q[onmpi];
    mtotal_pq += dxb.m.v_q[onmpi] * dxb.m.v_p[onmpi];
    wmpi = onmpi; t_m_nocc += 1;
    onmpi = dxb.m.v_nxt[onmpi]; 
  } 
  return(new ManualCalc({"in_total_q":mtotal_q, "in_total_pq":mtotal_pq, "in_worstpi":wmpi, "in_nocc":t_m_nocc,
    "in_barrier_pi":barrier_pi}));
}



// Print the Exchange Book after we have error.
const print_xb = function(xb, bs01, str_print_event) {
  const sdbs = (bs01==0) ? "B" : "S";
  const PRINT_N = make_print_n(xb.verbose_ob,"");
  PRINT_N(0, "-----------------------------------------------------------");
  PRINT_N(0, " Print Event, print_xb(" + str_print_event + ")");
  PRINT_N(0, "--- xb: Side = " + sdbs); 
  const dxb = (bs01==0) ? xb.b : xb.s;
  let stp0i = dxb.m.np - 1;
  let gothit=0;
  let ir = 0;
  while ( (stp0i < dxb.m.np) && (gothit == 0)) {
     if (dxb.m.v_q[stp0i] > 0.0) { 
       gothit = 1;
     }
     for (ir=0; ir < dxb.vr.length;ir++) { 
       if (dxb.vr[ir].v_q[stp0i] > 0.0) { gothit = 1; } 
     }
     if (gothit == 1) { break;} 
     else if (stp0i == 0) { stp0i = dxb.m.np; 
     } else { stp0i -= 1; }
  }
  if (gothit == 0) {
    PRINT_N(0,"xb side=" + sdbs + " --- BLANK no data yet. "); 
    return(1);
  }
  let onpi = stp0i;
  let nm =-1; let mq = 0.0;
  const nr = (dxb.vr === null) || (dxb.vr == undefined) ? 0 : dxb.vr.length;
  let v_qr = (nr > 0) ? Array(nr).fill(0.0) : null; 
  let prstr = "";
  while (onpi < dxb.m.np) {
    let t_q = dxb.m.v_q[onpi];
    for (ir=0;ir < dxb.length;ir++) { t_q += dxb.vr[ir].v_q[onpi] };
    if (t_q > 0.0) {
      if (dxb.m.v_q[onpi] > 0.0) { nm += 1; mq += dxb.m.v_q[onpi]; }
      if (nr > 0) { for (ir = 0; ir < nr;ir++) { v_qr[ir] += dxb.vr[ir].v_q[onpi]; } }
      prstr = (nm + ",onpi=" + onpi + "/" + dxb.m.np + "=\$" + dxb.m.v_p[onpi] +
                  ": m:" + dxb.m.v_q[onpi] + "(" + mq + ")"); 
      prstr = prstr + ", vr_" + dxb.vr.length + "[";
      if (nr > 0) {
        for (ir=0;ir<nr;ir++) { 
          prstr = prstr + dxb.vr[ir].v_q[onpi] + "(" + v_qr[ir] + ")"; 
          if (ir < dxb.vr.length-1) { prstr = prstr + ",";}
        }
      }
      prstr = prstr + ("] -- m[prv=" + dxb.m.v_prv[onpi] + ",nxt=" + dxb.m.v_nxt[onpi] + "]");
      if (dxb.vr.length > 0) {
        prstr = (prstr + ", vr[0][prv=" + dxb.vr[0].v_prv[onpi] + 
                        ",nxt=" + dxb.vr[0].v_nxt[onpi] + "]");
      } 
      PRINT_N(0,prstr);
    } else {
      PRINT_N(0,"--,onpi=" + onpi + "/" + dxb.m.np + "=" + dxb.m.v_p[onpi] + ": -------------");
    }
    if (onpi == 0) { onpi = dxb.m.np; } else { onpi-= 1; } 
  }

}
const check_mc_m_algo = function(kalgo, xb, tcs, ii_n, ii_side, nn, on_bs01, old_p0i, strtu) {
  let onside = "B"; let bs01 = 0; let nerr = 0; let ii = 0;
  const nr = xb.b.vr.length;
  let onfd;  let onfdstr = ""; let ik = 0; let ir = 0;
  const bnp = xb.b.np;  const snp = xb.s.np;
  const nk = tcs.b.v_1ls.length;
  const bbpi = xb.b.m.p0i;
  const bbp =  (bbpi < bnp) ? xb.b.m.v_p[bbpi] : -1.0;
  const bp0i_str = bbpi >= bnp ? ("NO bp0i/" + bnp) : "bp0i=" + bbpi + "/" + bnp + "($" + bbp + ",mq=" + xb.b.m.v_q[bbpi] + ")";
  const sbpi = xb.s.m.p0i;
  const sbp =  (sbpi < snp) ? xb.s.m.v_p[sbpi] : -1.0;
  if ((sbpi < snp) && (isNaN(xb.s.m.v_q[sbpi]))) {
    console.log("check_mc_m_algo, we see error just because xb.s.m.v_q[" + sbpi + "] is NaN!");  nerr +=1;
  }
  const sp0i_str = sbpi >= snp ? ("NO sp0i/" + snp) : "sp0i=" + sbpi + "/" + snp + "($" + sbp + ",mq=" + xb.s.m.v_q[sbpi] + ")";
  const spread = ((bbp >= 0.0) && (sbp >= 0.0) && (sbp > bbp)) ? (sbp - bbp) : 0.0;
  const verbose = tcs.verbose_ob.verbose;

  const old_p0i_str = ((on_bs01 == 0) ? (
                       (old_p0i < bnp) ? ("old_bp0i=" + old_p0i +"/" + bnp + "($" + xb.b.m.v_p[old_p0i] +")") :
                                         "NO old_bp0i/" + bnp ) : (
                       (old_p0i < snp) ? ("old_sp0i=" + old_p0i +"/" + snp + "($" + xb.s.m.v_p[old_p0i] +")") :
                                         "NO old_bp0i/" + snp ) );
           
 
  if (bnp != xb.b.m.v_p.length) {
    console.log("check_mc: ERROR xb.b.m.v_p.length = " + xb.b.m.v_p.length + ", bnp=" + bnp + ": ERROR"); debugger;
  }
  if (snp != xb.s.m.v_p.length) {
    console.log("check_mc: ERROR xb.s.m.v_p.length = " + xb.s.m.v_p.length + ", snp=" + snp + ": ERROR"); debugger;
  }
  if (nr >= 1) {
    if (xb.b.vr[0].np != bnp) {
      console.log("check_mc, vr[0] has different np in b in m and vr!"); debugger;
    } else if (xb.s.vr[0].np != snp) {
      console.log("check_mc, vr[0] has different np in s in m and vr!"); debugger;
    }
  }
  let mcr = null;
  let irstr = "";
  //console.log("check_mc: look at print.");
  if ((tcs.verbose_ob === undefined) || (tcs.verbose_ob===null) || (tcs.verbose_ob === false)) {
    console.log("check_mc: Error, tcs verbose ob is an error."); debugger;
  } else if (typeof(tcs.verbose_ob) != 'object') {
    console.log("check_mc: Error, tcs.verbose_ob does not appear to be an object."); debugger;
  }
  const pr_str = ("check_mc_m_algo(ii_n=" + ii_n + "/" + nn + "," +  
    ((on_bs01 == 0) ? ("ii_b=") : ("ii_s=")) + ("" + ii_side) + "," + str_kalgo(kalgo) + "," + strtu + "):");
  const PRINT_N = make_print_n(tcs.verbose_ob, pr_str);
  const PRINT_E = make_print_n(tcs.verbose_ob, "- EEE -: ");
  if ((PRINT_N === null) || (typeof(PRINT_N) != 'function')) { 
    console.log("check_mc_m_algo, error on the print algo."); console.log("pr_str=" + pr_str); debugger; 
  }
  if (tcs.verbose_ob >= 1) {
    console.log("================================================================");
    console.log("--- check_mc_m_algo, starting, v_ls.length=" + tcs.b.v_1ls.length + ", bnp = " + bnp + ", snp=" +snp);
  }
  for (ik = 0; ik < nk; ik++) {
    if ((tcs.b.v_1ls[ik].m_worstpi === undefined) || (tcs.b.v_1ls[ik].m_worstpi === null)) {
      PRINT_N(-6, " ERROR: ik=" + ik + "/" + nk + ": we have b.m_worstpi here is " + tcs.b.v_1ls[ik].m_worstpi);
      return(1);
    }
  }

  for (ik = 0; ik < nk; ik++) {
    if ((tcs.s.v_1ls[ik].m_worstpi === undefined) || (tcs.s.v_1ls[ik].m_worstpi === null)) {
      PRINT_N(-6, " ERROR: ik=" + ik + "/" + nk + ": we have s.m_worstpi here is " + tcs.b.v_1ls[ik].m_worstpi);
      return(1);
    }
  }
  bs01 = 0; onside = 'B';
  for (ik=0;ik < nk;ik++) {
    onfd =  (tcs.b.d0fd1 === 0) ? tcs.b.v_1ls[ik].d : tcs.b.v_1ls[ik].fd;
    onfdstr = (tcs.b.d0fd1 === 0) ? ("d="+onfd) : ("fd="+onfd);
    irstr = "(ik=" + ik + "/" + nk + ":" + onfdstr + "," + bp0i_str + ",nerr=" + nerr+ ")";
    const barrier_pi = calc_barrier_algo(kalgo, xb, tcs, bs01, ik); 
    if (barrier_pi < 0) {
      PRINT_N(-6, " ERROR, ik=" + ik +"/" + nk + ": barrier_pi was calced at " + barrier_pi);
    }
    const barrier_p = (((barrier_pi >=0) && (barrier_pi < bnp)) ? xb.b.m.v_p[barrier_pi] : -1.0);
    const barrier_str = ("barrier price " + ((barrier_pi>=bnp) ? (" is bnp=" + bnp) : ("= " + barrier_pi + "($" + barrier_p + ")")));
    const crit_pi = tcs.b.v_1ls[ik].crit_pi;
    const crit_p = ((crit_pi >= 0) && (crit_pi < bnp)) ? xb.b.m.v_p[crit_pi] : -1.0;
    const crit_str = (("tcs.b.v_1ls[ik="+ik+"/" + nk +"].crit_pi") + 
                      ((crit_pi >= bnp) ? (" is bnp=" + bnp) : ("=" + crit_pi + "($" + crit_p + ")")));
    PRINT_N(4, " -- on ik="+ik+"/" + tcs.b.v_1ls.length + " -- working further (nerr=" + nerr + ").");
    if ( ( (barrier_pi >= bnp)  && (tcs.b.v_1ls[ik].crit_pi < bnp)) ||
         ( (barrier_pi < bnp) && (tcs.b.v_1ls[ik].crit_pi >= bnp))) {
      nerr++;
      PRINT_N(-6, irstr + 
         "-- ERROR -- barrier issue #1 -- (nerr=" + nerr + ", bnp=" + bnp + ", ik=" + ik + "/" + nk + ")");
      PRINT_E(-6, " Incompatible: " + onfdstr + ": " + barrier_str);
      PRINT_E(-6, "  Meanwhile " + crit_str);
      PRINT_E(-6, bp0i_str + ","  + 
              " this move: bs01=" + on_bs01 + ".");
      if (on_bs01 ==0) {
         PRINT_E(-6," OLD: " + old_p0i_str);
      }
      PRINT_E(-6, "calc: barrier_pi=" + barrier_pi + "(\$" + barrier_p + ") " + 
                ", crit_pi=" + tcs.b.v_1ls[ik].crit_pi + 
                "(\$" + crit_p + ")");
      nerr++; return(nerr);
    } else if (barrier_pi != tcs.b.v_1ls[ik].crit_pi) {
       nerr+=1;
       PRINT_N(-6, irstr + 
         "-- ERROR -- barrier issue #2 -- " + bp0i_str + ", on_bs01=" + on_bs01 + ", ik=" + ik + "/" + nk + ".");
       PRINT_E(-6, " Incompatible: " + onfdstr + ": " + barrier_str);
       PRINT_E(-6, " Confirming: xb.b.m.p0i=" + xb.b.m.p0i + "/" + xb.b.m.np + "=$" + ((xb.b.m.p0i<bnp) ? xb.b.m.v_p[xb.b.m.p0i] : "NOTEXIST"));
       PRINT_E(-6, " Meanwhile " + crit_str);
       PRINT_E(-6, " However " + barrier_str + " for ik=" + ik + "/" + nk + ": " + str_kalgo(kalgo));
       PRINT_E(-6, " Reminder on FD: " + onfdstr);
       PRINT_E(-6, " NOTE : " + old_p0i_str);
       if (kalgo === Kalgo.PctDepth) {
           PRINT_E(-6, "(mp-bp).abs/mp=" + 
                Math.abs(bbp - xb.b.m.v_p[barrier_pi]) / (bbp),
                ". abs(mp-cp)/mp=" + 
                Math.abs(bbp - xb.b.m.v_p[tcs.b.v_1ls[ik].crit_pi]) / (bbp) );
       } else if (kalgo === Kalgo.MultipleSpread) {
           PRINT_E(-6, "(mp-bp)/sp = " +  
             (bbp - xb.b.m.v_p[barrier_pi]) / spread,
              ", (mp-cp)/mp=" + 
              (bbp - xb.b.m.v_p[tcs.b.v_1ls[ik].crit_pi]) / spread);
       }
       PRINT_E(-6, "early error, barrier based.");
       debugger;
       return(nerr);
    } 
    if (nr > 0) {
         for (ir=0;ir<nr;ir++) {
           mcr = calc_mc_ir_barrier(xb, 0, ir, barrier_pi);
           irstr = "(ik=" + ik + "/" + nk + ":" + onfdstr + ",ir=" + ir + "/" + nr + "," + bp0i_str + ",nerr=" + nerr+"): ";
           if ((!(isNaN(mcr.total_q))) && (isNaN(tcs.b.v_1ls[ik].vr_csumq[ir]))) {
             nerr +=1;
             PRINT_N(-6, irstr + " We detect nans in vr_csumq, while mcr.total_q = " + mcr.total_q);
           }
           if (((isNaN(mcr.total_q))) && (!(isNaN(tcs.b.v_1ls[ik].vr_csumq[ir])))) {
             nerr +=1;
             PRINT_N(-6, irstr + " We detect non nans in vr_csumq = "+tcs.b.v_1ls[ik].vr_csumq[ir]+ ", while mcr.total_q = " + mcr.total_q);
           }
           if (Math.abs(tcs.b.v_1ls[ik].vr_csumq[ir] - mcr.total_q) >= 0.001) {
              nerr += 1;
              PRINT_N(-6, irstr + 
                "ERROR alert because mcr.total_q=" + mcr.total_q + 
                ", however vr_csumq=" + tcs.b.v_1ls[ik].vr_csumq[ir] + "," + bp0i_str);
              PRINT_N(-6, " NOTE ir=" + ir + "/" + nr + ", ik=" + ik + "/" + nk);
              const DRange = xb.b.vr[ir].v_q.filter((x,ix)=>(ix<=xb.b.vr[ir].p0i) && (ix>=barrier_pi));
              PRINT_E(-6, " Note that xb.b.vr["+ir + "].v_q for rbp0i=" + 
                xb.b.vr[ir].p0i + " to barrier=" + barrier_pi + " (" + bp0i_str + ") is [" +
                ((DRange.length == 0) ? "EMPTY" : DRange.join(",")) +
                 "]");  
              PRINT_E(-6, "on_bs01=" + on_bs01 + ", " + old_p0i_str);
                "\$" + ((on_bs01==0) ? xb.b.m.v_p[old_p0i] : -1.0) + 
              PRINT_E(-6, "barrier_pi=" + barrier_pi + "(\$" + barrier_p + "), " + 
                "crit_pi=" + tcs.b.v_1ls[ik].crit_pi + "(\$" + crit_p + ")");
           } 
           if (Math.abs(tcs.b.v_1ls[ik].vr_csumpq[ir] - mcr.total_pq) >= 0.001) {
              nerr += 1;
              PRINT_N(-6, irstr + "," + bp0i_str + 
                ", total_pq=" + mcr.total_pq + ", vr_csumpq=" + 
                tcs.b.v_1ls[ik].vr_csumpq[ir]);
           } 
           if (tcs.b.v_1ls[ik].vr_nocc[ir] != mcr.nocc) {
              nerr += 1;
              PRINT_N(-6, irstr + " mcr.nocc=" + mcr.nocc + ", vr_nocc=" + tcs.b.v_1ls[ik].vr_nocc[ir]);
           } 
           if ((tcs.b.v_1ls[ik].vr_worstpi[ir] >= xb.b.m.v_p.length) && 
               (xb.b.vr[ir].p0i < xb.b.m.v_p.length) && (xb.b.vr[ir].p0i >= barrier_pi)) {
              nerr += 1;
              PRINT_N(-6, "ERROR --- worstpi versus p0i error.");
              PRINT_N(-6, irstr + "ERROR worstpi null but p0i bad:::  worst pi issue, xb.b.vr[" + ir + "].p0i = " + xb.b.vr[ir].p0i);
              PRINT_E(-6, " --- worstpi Error tcs.b.v_1ls[ik=" + ik + "].vr_worstpi[ir=" + ir + "] = " + 
                tcs.b.v_1ls[ik].vr_worstpi[ir]);
              PRINT_E(-5, " --- Note we still believe mcr.worstpi = " + mcr.worstpi);
           }
           if (tcs.b.v_1ls[ik].vr_worstpi[ir] != mcr.worstpi) {
              nerr += 1;
              PRINT_N(-6, irstr + " worstpi=" + mcr.worspi + 
                ", vr_worstpi=" + tcs.b.v_1ls[ik].vr_worstpi[ir]);
              if (nerr >= 1) { console.log("Error in Worstpi"); return(nerr); }
           } 
           let lastfill = bnp;  let nextfill = bnp;
           for (ii=0;ii<bnp;ii++) {
             if (xb.b.vr[ir].v_q[ii] == 0.0) {
               if ((nextfill < bnp) && (nextfill != ii)) {
                 nerr+=1; PRINT_N(-6,irstr + " on ii=" + ii + ", xb.b.vr[ir=" + 
                   ir + "].v_q=" + xb.b.vr[ir].v_q[ii] + ", nextfill=" + nextfill + 
                   ", np=" + bnp + "");
               } 
               lastfill = ii;
               nextfill = xb.b.vr[ir].v_prv[ii];
             } else {
               if (ii == nextfill) {
                 nerr+=1;  PRINT_N(-6, irstr + "on ii=" + ii + ", xb.b.vr[ir=" + 
                  ir + "].v_q= " + xb.b.vr[ir].v_q + " nextfill =" + nextfill + ", bnp = " + bnp);
               } 
             }         
             if (nerr >= 100) {
               PRINT_N(-6, irstr + " We have too many errors."); return(nerr);
             }
           }
           if (nerr >= 100) {
             PRINT_N(-6, irstr + " --- Too many errors = " + nerr +"."); return(nerr);
           }
         }
         mcr = calc_mc_m_barrier(xb, 0, barrier_pi);
         //barrier_p = (barrier_pi < bnp) ? xb.b.m.v_p[barrier_pi] : -1.0;
         //crit_p = (tcs.b.v_1ls[ik].crit_pi < bnp) ? xb.b.m.v_p[tcs.b.v_1ls[ik].crit_pi] : -1.0;
         irstr = "(ik=" + ik + "/" + nk + ":fd=" + onfd + ",m," + bp0i_str + ",nerr=" + nerr + "): ";
         if ((isNaN(tcs.b.v_1ls[ik].m_csumq)) && (!(isNaN(mcr.total_q)))) {
           nerr +=1;
           PRINT_N(-6, irstr + " Error, m_csumq is NaN but mcr.total_q = " + mcr.total_q);
         }
         if ((!(isNaN(tcs.b.v_1ls[ik].m_csumq))) && ((isNaN(mcr.total_q)))) {
           nerr +=1;
           PRINT_N(-6, irstr + " Error, m_csumq " + tcs.b.v_1ls[ik].m_csumq + ", is NaN but mcr.total_q = " + mcr.total_q);
         }
         if (Math.abs(tcs.b.v_1ls[ik].m_csumq - mcr.total_q) >= 0.001) {
           nerr += 1;
           PRINT_N(-6, irstr  + " nerr=" + nerr + ": total_q=" + mcr.total_q);
           PRINT_E(-6, "m_csumq=" + tcs.b.v_1ls[ik].m_csumq + ". mp0i=" + bbpi + "/" + bnp + 
              "\$" + bbp + ".");
           PRINT_E(-6, "on_bs01=" + on_bs01 + ", " + old_p0i_str + 
              ", barrier_pi=" + 
              barrier_pi + "\$" + barrier_p + ", crit_pi=" + 
              tcs.b.v_1ls[ik].crit_pi + "\$" + crit_p + ".");
         } 
         if (Math.abs(tcs.b.v_1ls[ik].m_csumpq - mcr.total_pq) >= 0.001) {
           nerr += 1;
           PRINT_N(-6, irstr + " ERROR " + nerr + " total_pq=" + mcr.total_pq + 
             ", tcs.m_csumpq=" + tcs.b.v_1ls[ik].m_csumpq + ".");
         } 
         if (tcs.b.v_1ls[ik].m_nocc != mcr.nocc) {
           nerr += 1;
           PRINT_N(-6, irstr + " mcr.nocc=" + mcr.nocc + ", tcs.m_nocc=" + 
              tcs.b.v_1ls[ik].m_nocc);
           PRINT_E(-6, "note " + bp0i_str + ", with " + onfdstr + "," + 
              " for ik=" + ik + "/" + nk);
         } 
         if (tcs.b.v_1ls[ik].m_worstpi != mcr.worstpi) {
           nerr += 1;
           PRINT_N(-6, irstr + " mcr.worstpi=" + mcr.worstpi + ", tcs.m_worstpi=" + 
             tcs.b.v_1ls[ik].m_worstpi + ", p0i=" + bbpi + ", barrier_pi=" + barrier_pi + 
             ", crit_pi=" + tcs.b.v_1ls[ik].crit_pi + ".");
           PRINT_E(-6, "note " + bp0i_str +  ", with " + onfdstr + "," + 
              " for ik=" + ik + "/" + nk);
           PRINT_N(-5, " Early Error"); return(nerr);
         } 
         if (nerr >= 100) {
           PRINT_N(-6, irstr + " -- we hit max errors = " + nerr); return(nerr);
         }
       }
       if ((xb.b.m.nocc > 0) && (bbpi >= xb.b.m.np)) {
         nerr += 1;
         PRINT_N(-6, irstr + "xb.b.m.nocc = " + xb.b.m.nocc + ", but " + bp0i_str);
       } else if ( (xb.b.m.nocc == 1) && (xb.b.m.v_nxt[bbpi] != xb.b.m.np) ) {
         nerr += 1;
         PRINT_N(-6,irstr + " xb.b.m.nocc==" + xb.b.m.nocc + ", but " + bp0i_str);
       } else if ( (xb.b.m.nocc != 1) && (xb.b.m.p0i < xb.b.m.np) && (xb.b.m.v_nxt[xb.b.m.p0i] == xb.b.m.np)) {
         nerr += 1;
         PRINT_N(-6,irstr + " b nocc poorly configured = " + xb.b.m.nocc + ", but p0i = " + 
           xb.b.m.p0i + "/" + xb.b.m.np + " but nxt = " + xb.b.m.v_nxt[xb.b.m.p0i] );
       }
       if ( (xb.b.m.p_wi < xb.b.m.np) && (xb.b.m.p0i >= xb.b.m.np) ) {
         nerr+=1;
         PRINT_N(-6,irstr + "(m,b) p_wi poorly configured = p_wi=" + xb.b.m.p_wi + ", nocc=" + 
           xb.b.m.nocc + ", but p0i = " + xb.b.m.p0i + "/np=" + xb.b.m.np + " but prv p_wi = " +
           xb.b.m.v_prv[xb.b.m.p_wi]);
       } else if ( (xb.b.m.p_wi >= xb.b.m.np) && (xb.b.m.p0i < xb.b.m.np) ) {
         nerr+=1;
         PRINT_N(-6,irstr + "(m,b) p_wi poorly configured = p_wi=" + xb.b.m.p_wi + 
           ", nocc=" + xb.b.m.nocc + ", but p0i = " + xb.b.m.p0i + "/np=" + xb.b.m.np + 
           " but nxy p0i = " + xb.b.m.v_nxt[xb.b.m.p0i]); 
       }
       if (nerr >= 100) {
         PRINT_N(-6, irstr + "(m,b): We seem to have too many errors in B."); return(nerr);
       }
       PRINT_N(3, irstr + " -- We complete this ik=" + ik + "/" + nk + " loop.");
    }
    PRINT_N(3, " Success: Buy passes ik checks with " + nerr + " errors. manually calculating tot_q, nocc, etc.");
    let tot_q = 0.0;
    for (ii=0;ii<bnp;ii++) {
       tot_q += xb.b.m.v_q[ii];
    }
    let nocc = 0;
    for (ii =0;ii<bnp;ii++) { 
      if (xb.b.m.v_q[ii] > 0.0) { 
        nocc+=1 
      }
    };
    if (tot_q != xb.b.m.tot_q) {
      nerr+=1; PRINT_N(-6,irstr + ", calced tot_q = " + tot_q + 
        ", but xb.b.m.tot_q = " + xb.b.m.tot_q);
    }
    if (nocc != xb.b.m.nocc) {
       nerr+=1; PRINT_N(-6,irstr + "(m,b), calced nocc = " + nocc + 
       ", but xb.b.m.nocc: = " + xb.b.m.nocc);
    }
    let lastfill = xb.b.m.np;  let nextfill = xb.b.m.np;
    for (ii=0;ii<bnp;ii++) {
      if ( xb.b.m.v_q[ii] > 0.0 )  {
        if ((nextfill < xb.b.m.np) && (nextfill != ii)) {
          nerr+=1;  PRINT_N(-6,irstr + "(m,b) NETWORK ERROR on ii="+ii+"/" + bnp + ", xb.b.m.v_q="+xb.b.m.v_q[ii]+
            ", nextfill="+nextfill+", np=" + xb.b.m.np);
        } 
        lastfill = ii;
        nextfill = xb.b.m.v_prv[ii];
      } else {
        if (ii == nextfill) {
          nerr+=1;  PRINT_N(-6,irstr + "(m,b) NETWORK ERROR on ii=" + ii + "/" + bnp + ", xb.b.m.v_q=" + xb.b.m.v_q[ii] + 
            ", nextfill=" + nextfill + ", np=" + xb.b.m.np);
        } 
      }
      if (nerr >= 100) {
        PRINT_N(-6, irstr + "(m,b) goes over error limit"); return(nerr);
      }
    }
    PRINT_N(3, " Success: Buy, we checked Network fills nerr="+nerr);
    for (ir=0;ir<nr;ir++) {
      irstr = "check_mc_" + und_str_kalgo(kalgo) + "(ik=" + ik + "/" + nk + ":" + onfdstr + ",ir=" + ir + "/" + nr + "," + bp0i_str + "): ";
      if ( (xb.b.vr[ir].p0i < xb.b.vr[ir].np) && (xb.b.vr[ir].v_q[xb.b.vr[ir].p0i] == 0.0) ) {
         nerr+=1;
         PRINT_N(-6,irstr + " somehow p0i=" + xb.b.vr[ir].p0i + "/" + xb.b.vr[ir].np + 
           " but v_q[" + xb.b.vr[ir].p0i + " = " + xb.b.vr[ir].v_q[xb.b.vr[ir].p0i] + ".");
      }
    }
    for (ir=0;ir<nr;ir++) {
      irstr = "check_mc_" + und_str_kalgo(kalgo) + "(ik=" + ik + "/" + nk + ":" + onfdstr + ",ir=" + ir + "/" + nr + "," + sp0i_str + "): ";
      if ((xb.s.vr[ir].p0i < xb.s.vr[ir].np) && (xb.s.vr[ir].v_q[xb.s.vr[ir].p0i] == 0.0) ) {
        nerr+=1;
        PRINT_N(-6,irstr + ", somehow p0i=" + xb.s.vr[ir].p0i + "/" + xb.s.vr[ir].np + 
          " + xb but v_q[" + xb.s.vr[ir].p0i + "] = " + xb.s.vr[ir].v_q[xb.s.vr[ir].p0i] + ".");
      }
    }
    PRINT_N(3, "check_mc_" + und_str_kalgo(kalgo) + ", B Check, done with ir quantity checks.  Total Errors = " + nerr);
    if (nerr > 0) {
      PRINT_N(3, "check_mc_" + und_str_kalgo(kalgo) + ", B Check complete, we had " + nerr + " buy errs.");
    }
    if (nerr >= 100) {
      PRINT_N(-6, " --- At Finish Buys: We quit with nerr = " + nerr );
    }
    onside = "S"; bs01 = 1;
    for (ik=0;ik<nk;ik++) {
      onfd = (tcs.b.d0fd1 === 0) ? tcs.b.v_1ls[ik].d : tcs.b.v_1ls[ik].fd;
      irstr = "check_mc_"+und_str_kalgo(kalgo) +"(ik="+ik+":"+onfdstr +",m," + sp0i_str + ") ERROR: ";
      const barrier_pi = calc_barrier_algo(kalgo, xb, tcs, bs01, ik); 
      const barrier_p = (barrier_pi < bnp) ? xb.s.m.v_p[barrier_pi] : -1.0 ;
      const crit_p = (tcs.s.v_1ls[ik].crit_pi < bnp) ? xb.s.m.v_p[ tcs.s.v_1ls[ik].crit_pi] : -1.0;
      if (nr > 0) {
        if (barrier_pi != tcs.s.v_1ls[ik].crit_pi) {
          nerr+=1;
          PRINT_N(-6,irstr + " (nerr=" + nerr + "): m.p0i=" + xb.s.m.p0i + "/" + xb.s.m.np + 
            "=\$"+xb.s.m.v_p[xb.s.m.p0i] + ",  barrier_pi=" + barrier_pi + "=\$" + barrier_p + 
            ", crit_pi=" + (tcs.s.v_1ls[ik].crit_pi) + "=\$" + xb.s.m.v_p[tcs.s.v_1ls[ik].crit_pi] + ".");
          if (kalgo === Kalgo.PctDepth) {
            console.log(" --- (mp-bp).abs/mp={}, (mp-cp).abs/mp={}  ",
                Math.abs(xb.s.m.v_p[xb.s.m.p0i] - xb.s.m.v_p[barrier_pi]) / (xb.s.m.v_p[xb.s.m.p0i]),
              ", abs(mc-cp)/mp=" + 
                Math.abs(xb.s.m.v_p[xb.s.m.p0i] - xb.s.m.v_p[tcs.s.v_1ls[ik].crit_pi]) / (xb.s.m.v_p[xb.s.m.p0i]) );
          } else if (kalgo === Kalgo.MultipleSpread) {
            console.log(" --- (mp-bp)/sp = {}, (mp-cp)/mp={} ",
               (xb.s.m.v_p[xb.s.m.p0i] - xb.s.m.v_p[barrier_pi]) / spread,
               ", (mp-cp)/sp={} ",
               (xb.s.m.v_p[xb.s.m.p0i] - xb.s.m.v_p[tcs.s.v_1ls[ik].crit_pi]) / spread);
          }
        }
        for (ir=0;ir<nr;ir++) {
          irstr = "check_mc_"+und_str_kalgo(kalgo) +"(ik="+ik+":"+onfdstr+"," + ir + "/" + nr + "," + sp0i_str + ") ERROR: ";
          mcr = calc_mc_ir_barrier(xb, 1, ir, barrier_pi);
          if (Math.abs(tcs.s.v_1ls[ik].vr_csumq[ir] - mcr.total_q) >= 0.001) {
              nerr += 1;
              PRINT_N(-6,irstr + " ERROR (nerr=" + nerr + "): vr[" + ir + "].p0i=" + 
                xb.s.vr[ir].p0i + "=\$" + xb.s.vr[ir].v_p[xb.s.vr[ir].p0i] + ", mcr.total_q=" + 
                mcr.total_q + ", vr_csumq=" + tcs.s.v_1ls[ik].vr_csumq[ir] + ". barrier_pi=" + barrier_pi + 
                ", crit_pi=" + tcs.s.v_1ls[ik].crit_pi);
          } 
          if (Math.abs(tcs.s.v_1ls[ik].vr_csumpq[ir] - mcr.total_pq) >= 0.001) {
             nerr += 1;
             PRINT_N(-6,irstr + ": total_pq=" + mcr.total_pq+", vr_csumpq=" + 
               tcs.s.v_1ls[ik].vr_csumpq[ir] + ". barrier_pi=" + barrier_pi + ", crit_pi=" + tcs.s.v_1ls[ik].crit_pi);
          } 
          if (tcs.s.v_1ls[ik].vr_nocc[ir] != mcr.nocc) {
             nerr += 1;
             PRINT_N(-6,irstr + "  nocc=" + mcr.nocc + ", vr_nocc=" + tcs.s.v_1ls[ik].vr_nocc[ir] + ".");
          } 
          if (tcs.s.v_1ls[ik].vr_worstpi[ir] != mcr.worstpi) {
            nerr += 1;
            PRINT_N(-6,irstr + " worstpi=" + mcr.worstpi + ", vr_worstpi=" + tcs.s.v_1ls[ik].vr_worstpi[ir]);
          } 
          lastfill = xb.s.vr[ir].np;  nextfill = xb.s.vr[ir].np;
          for (ii=0;ir<nr;ir++) {
            if (xb.s.vr[ir].v_q[ii] == 0.0) {
              if ( (nextfill < xb.s.vr[ir].np) && (nextfill != ii) ) {
                nerr+=1;  PRINT_N(-6,irstr + " on ii="+ii+", xb.s.vr[ir="+ir +"].v_q=" + 
                xb.s.vr[ir].v_q[ii] + ", nextfill="+nextfill+", np=" + xb.s.vr[ir].np);
              } 
              lastfill = ii;
              nextfill = xb.s.vr[ir].v_prv[ii];
            } else {
              if (ii == nextfill) {
                nerr+=1;  PRINT_N(-6,irstr + " on ii=" + ii + ", xb.vr[ir=" + ir + "].m.v_q=" + xb.s.vr[ir].v_q[ii] + 
                  ", nextfill=" + nextfill + ", np=" + xb.s.vr[ir].np);
              } 
            }         
         }
       }
       mcr = calc_mc_m_barrier(xb, 1, barrier_pi);
       irstr = "check_mc_"+und_str_kalgo(kalgo)+"(ik="+ik+":" + onfdstr + ",m," + sp0i_str + ") ERROR: ";
       if (Math.abs(tcs.s.v_1ls[ik].m_csumq - mcr.total_q) >= 0.001) {
          nerr += 1;
          PRINT_N(-6,irstr + " total_q=" + mcr.total_q + ", m_csumq=" + tcs.s.v_1ls[ik].m_csumq + 
            ". mp0i=" + sbpi + "=\$" + sbp + ", on_bs01=" + on_s + ", old_p0i=" + 
            (on_bs01 == 1 ? old_p0i : xb.s.m.np) + ":\$" + 
            (on_bs01 == 1 ? xb.s.m.v_p[old_p0i] : -1.0)  + ", barrier_pi = " + barrier_pi + 
            "crit_pi=" + crit_pi +" =\$" + tcs.s.v_1ls[ik].crit_pi);
       } 
       if (Math.abs(tcs.s.v_1ls[ik].m_csumpq - mcr.total_pq) >= 0.001) {
          nerr += 1;
          PRINT_N(-6,irstr + " mp0i=" + sbpi + ":\$" + sbp +", on_bs01=" + on_bs01 + 
            ", old_p0i=" + ((on_bs01==1) ? old_p0i : -1.0 ) + ":\$" +
            ((on_bs01==1) ? xb.s.m_vp[old_p0i] : -1.0) + ") total_pq=" + mcr.total_pq + 
            ", m_csumpq=" + tcs.s.v_1ls[ik]/m_csumpq + ".");
       } 
       if (tcs.s.v_1ls[ik].m_nocc != mcr.nocc) {
         nerr += 1;
         PRINT_N(-6,irstr + " nocc=" + mcr.nocc + ", m_nocc=" + tcs.s.v_1ls[ik].m_nocc + ".");
       } 
       if (tcs.s.v_1ls[ik].m_worstpi != mcr.worstpi) {
         nerr += 1;
         PRINT_N(-6,irstr + " mcr.worstpi=" + mcr.worstpi + ", tcs.worstpi=" + tcs.s.v_1ls[ik].m_worstpo + 
           ". mp0i=" + xb.s.m.p0i + ", barrier_pi=" + barrier_pi +", crit_pi=" + tcs.s.v_1ls[ik].crit_pi + ".");
       } 
     }
   }

  if (tcs.verbose_ob.verbose >= 4) {
    PRINT_N(4, "check_mc_" + und_str_kalgo(kalgo) + " Success on Sell ik Checks: " + sp0i_str); 
  }
  irstr = "check_mc_"+und_str_kalgo(kalgo)+"(" +onfdstr + ",m," + sp0i_str + ") ERROR: ";
  if ((xb.s.m.nocc > 0) && (sbpi >= xb.s.m.np)) {
     nerr += 1;
     PRINT_N(-6,irstr + " s nocc = " + xb.s.m.nocc+", but " + sp0i_str +".");
  } else if ( (xb.s.m.nocc == 1) && (xb.s.m.v_nxt[sbpi] != xb.s.m.np) ) {
     nerr += 1;
     PRINT_N(-6,irstr + " nocc = " + xb.s.m.nocc + ", but " + sp0i_str + ", " + 
       "nxt = " + xb.s.m.v_nxt[sbpi] + "=\$" + xb.s.m.v_p[xb.s.m.v_nxt[sbpi]]);
  } else if ( (xb.s.m.nocc != 1) && (sbpi < xb.s.m.np) && (xb.s.m.v_nxt[sbpi] == xb.s.m.np) ) {
     nerr += 1;
     PRINT_N(-6,irstr + " s nocc poorly configured = " + xb.s.m.nocc + ", but " + sp0i_str + 
       ", but nxt = " + xb.s.m.v_nxt[sbpi]);
  }
  irstr = "check_mc_" + und_str_kalgo(kalgo) +"(m," + sp0i_str + ") :";
  if ( (xb.s.m.p_wi < xb.s.m.np) && (sbpi >= xb.s.m.np) ) {
      nerr+=1;
      PRINT_N(-6,irstr + "(m,s) p_wi poorly configured = p_wi=" + xb.s.m.p0i + ", nocc=" + xb.s.m.nocc + 
        ", but p0i = " + xb.s.m.p0i + "/np=" + xb.s.m.np + " but prv p_wi = " + 
        xb.s.m.v_prv[xb.s.m.p_wi]);
  } else if ( (xb.s.m.p_wi >= xb.s.m.np) && (xb.s.m.p0i < xb.s.m.np) ) {
      nerr+=1;
      PRINT_N(-6,irstr + "(m,s) p_wi poorly configured = p_wi=" + xb.s.m.p0i + ", nocc=" + xb.s.m.nocc + 
        ", but p0i = " + xb.s.m.p0i + "/np=" + xb.s.m.np + " but prv p_wi = " + 
        xb.s.m.v_prv[xb.s.m.p_wi]);
  }
  if (nerr > 0) {
     PRINT_N(-1, "-------------------------------------------------------------------------------");
     PRINT_N(-1, "ERROR check_mc_" + und_str_kalgo(kalgo) + " we have fail, nerr=" + nerr + 
       ": [ii_n=" + ii_n + "/" + nn + "," + 
       ((on_bs01==0) ? "ii_b=":"ii_s=") + ii_side +"]");
     PRINT_N(-1,"Buys");
     print_xb(xb,0, (" calc_mc_m_algo errors = " + nerr));
     PRINT_N(-1, "Sells");
     print_xb(xb,1, (" calc_mc_algo errors = " + nerr));
  }
  return(nerr);
}   

export {ManualCalc,
  calc_barrier_algo,
  calc_barrier_num_filled,
  calc_barrier_num_all,
  calc_barrier_num_shares,
  calc_barrier_multiple_spread,
  calc_barrier_num_pennies,
  calc_barrier_pct_depth,
  calc_barrier_total_dollars,
  calc_mc_ir_barrier,
  check_mc_m_algo,
  calc_mc_ir_exp_decay,
  calc_mc_m_exp_decay,
  calc_mc_m_algo,
  calc_mc_ir_algo,
  calc_mc_m_barrier,
  print_xb
}
