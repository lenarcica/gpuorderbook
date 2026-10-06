///~////////////////////////////////////////////////////////////////////////////////////
/// ord_new.js
///
///   Javscript conversion of Rust Code
///   Alan Lenarcic 2026-07-05
///  Here we focus on Operations on the TotalCurrentState object and its children
///
///  We are looking at what happens when a new order is added to a yet-empty price level
///
///  A new order can occur and set a new market best price, or it can be located further
///  down in the existing orderbook
///
///  We operate these all as traits on the TotalCurrentState object, which attempts
///  to store the mathematical state associated with a market represetned by MarektExchangeBook
///
///  The new order will have quantity newq and occur at price (at integer location
///  newpi/newp0i)
///
///  Readers Note: The calculations here are tightly nested and operate based upon
///    our notation.  Rather than obfuscate within further hidden functions, we are trying
///    to make sure that the associated calculations are stated clearly, albeit as
///    an unnattractive mixture of many steps
///
///  In general when a new point and a new quantity is added we must update all of our totals
///     in categories m_csumq, m_csumpq, m_worstpi, m_nocc, (for single whole market m)
///                   vr_csumq, vr_csumpq, vr_worstpi, vr_nocc    (for all (ir=0;ir<nr;ir++))
///     This must be done for every ik, for ik in 0..LENGTH[v_1ls]
///     
///  To do this.e identify where the new "crit_pi", which is likely greater than or equal
///    to the former crit_pi.  So for "new orders", we are almost always shifting upwards.
/// 
///
///
///
import { MarketExchangeBook, TotalCurrentState, OneSideState, OneSideCombinedBook, Kalgo, str_kalgo, make_print_n} from "../ord_struct.js";
///  new_market_best_price implementation 
///
/// A new market_best_price creates a large shift in the entire orderbook
///   newp0i stands for index location of the new best price (p0i)
///   It will have quantity newq, and side sdbs.
///
/// The rest is mathematics designed to deal with the large effect on the state of our Order
///  totals that happens when we shift the best price up the price list.
/// Methodology: create a "new_market_best_price_$kgo"
///   It will call appropriate crit_move_in after updating new price quantity.
//
const bigmult = function(unit) {
    // Determine multiplier to divide object from, assuming unit
    if (unit == 0) { return(1000000000); 
    } else if (unit <= 1) { return(Math.pow(10,9+unit)) 
    } else if (unit <= 3) { return(60*Math.pow(10,7+unit))
    } else if (unit <= 5) { return(3600*Math.pow(10,5+unit))
    } else if (unit <= 7) { return(3600*24*Math.pow(10,3+unit))
    }
}
const TotalCurrentState_new_market_best_price = function(xb, bs01, newp0i, newq) {
  // xb: MarketExchangeBook input
  // bs01: buy=0,sell=1,
  // newp0i: index of new price
  // new_q: new quantity to go into the price
  const nk = this.nk; let ik = 0;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s;
  const np = dxb.m.np;  const kalgo = this.b.kalgo;
  if (kalgo == Kalgo.ExpDecay) {
    return(this.new_market_best_price_exp_decay(xb, sdbs, newp0i, newq));
    // This is exception, all values get shifted by a multiplier in different order
  }
  const verbose = this.verbose;
  const oldp0i = (bs01==0) ? xb.b.m.p0i : xb.s.m.p0i; 
  const stt = ("new_market_best_price(" + str_kalgo(kalgo) + "," + ((bs01==0) ? "b":"s") + 
    ",op0i=" + oldp0i + ":\$" + ((oldp0i < np) ? dxb.m.v_p[oldp0i] : -1.0) + 
    ",np0i=" + newp0i + ":\$" + ((newp0i <np) ? dxb.m.v_p[newp0i] : -1.0) + 
    ",nq=" + newq + "): "); 
  const PRINT_N = make_print_n(this.verbose_ob, stt);
  if (oldp0i >= np) {
    // In this case, Market had no quantities at all, there are no criterions yet
    //
    // We will have a different algorithm for completely empty data.
    // Determinable, unlikely most are made.  Registrants converted from (All Quantty)
    return(this.completely_new_market_best_price(xb, sdbs, newp0i, newq));
  }

  PRINT_N(3, ":: first call");
  // Gather New/Old statistics and update the Market Exchange book:w
  //
  //We don't need let oldq = dxb.m.v_q[newp0i]; This is zero obviously.
  dxb.m.v_prv[oldp0i] = newp0i;
  dxb.m.v_nxt[newp0i] = oldp0i;
  dxb.m.v_q[newp0i] = newq;
  dxb.m.tot_q += newq;
  dxb.m.tot_pq += newq * dxb.m.v_p[newp0i]; dxb.m.p0i = newp0i;
  dxb.m.nocc += 1;
  for (ik=0;ik<nk;ik++) {
    ocs.v_1ls[ik].m_csumq += newq; ocs.v_1ls[ik].m_csumpq += newq * dxb.m.v_p[newp0i];
    ocs.v_1ls[ik].m_nocc += 1;
  }
  // update "crit_pi for each v_1ls[ik].
  //  This will be price point we shift upwards towards
  if (kalgo == "ExpDecay") {
    PRINT_N(-6, " ERROR how do we get here with kalgo = " + kalgo + ".");
    return(-304032);
  }
  for (ik=0;ik<nk;ik++) {
    // Macro to cast same expect statement
    ocs.v_1ls[ik].crit_pi = ( (kalgo === Kalgo.NumFilled) ? ocs.crit_move_in_num_filled(dxb,ik) :
                              (kalgo === Kalgo.NumAll) ? ocs.crit_move_in_num_all(dxb,ik) : 
                              (kalgo === Kalgo.NumPennies) ? ocs.crit_move_in_num_pennies(dxb,ik) : 
                              (kalgo === Kalgo.NumShares) ? ocs.crit_move_in_num_shares(dxb,ik) : 
                              (kalgo === Kalgo.TotalDollars) ? ocs.crit_move_in_total_dollars(dxb,ik) : 
                              (kalgo === Kalgo.MultipleSpread) ? ocs.crit_move_in_multiple_spread(spread, dxb,ik) : 
                              (kalgo === Kalgo.PctDepth) ? ocs.crit_move_in_pct_depth(dxb,ik) : 
                              (kalgo === Kalgo.ExpDecay) ? -1.0 : -1.0);
    ocs.v_1ls[ik].move_in_to_crit(xb, ocs.v_1ls[ik].crit_pi,bs01, ik);
  }
  // In terms of weights on a new price shift update whole window
  ocs.fresh_w_all_window(dxb);
  return(1);
}

// When Expoential decay algorithm is implemented, there is a shift of all
// Previous quantity.  Mathematically, it is relatively easy to "shift right"
// As shift calculation  "newq + exp(-lambda t) * OLDQ " is likely mathematcially stable 
//
// Note, this does not work with deletions, as exp(lambda t) being positive produces worse
// effects
const TotalCurrentState_new_market_best_price_exp_decay = function(xb, bs01, newp0i, newq) {
  // xb: MarketExchangeBook input
  // bs01: buy=0,sell=1,
  // newp0i: index of new price
  // new_q: new quantity to go into the price
  const nk = this.nk; let ik=0;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s;
  const np = dxb.m.np;  const kalgo = ocs.kalgo;
  const nr = dxb.vr.length; const oldp0i = dxb.m.p0i; let ir = 0;
  let onrpi = -1.0; let dcay = 1.0;
  const PRINT_N = ((this.verbose_ob.verbose>0) ?
    make_print_n(this.verbose_ob, 
      ("new_market_best_price_exp_decay(" + ((bs01==0) ? "b":"s") + 
      ",op0i=" + oldp0i + ":\$" + ((oldp0i < np) ? dxb.m.v_p[oldp0i] : -1.0) + 
      ",np0i=" + newp0i + ":\$" + ((newp0i <np) ? dxb.m.v_p[newp0i] : -1.0) + 
      ",nq=" + newq + "): ")) : 
    console.log);
  if (this.b.kalgo != Kalgo.ExpDecay) {
    PRINT_N(-6, "( buy kalgo = " + kalgo + ", or " + str_kalgo(kalgo) + "), why? ", this.b.kalgo);
    return(-104);
  }
  //let oldq = dxb.m.v_q[newp0i]; This is zero obviously
  // Test if completely new market
  if (oldp0i >= np) {
    // In this case, Market had no quantities at all, there are no criterions yet
    dxb.m.v_q[newp0i] = newq;
    dxb.m.p0i = newp0i; dxb.m.p_wi = newp0i;
    dxb.m.nocc = 1;
    for (ik=0;ik<nk;ik++) {
      for (ir=0;ir<nr;ir++) {
        onrpi = dxb.vr[ir].p0i;
        ocs.v_1ls[ik].vr_csumq[ir] = 0.0;
        ocs.v_1ls[ik].vr_csumpq[ir] = 0.0;
        while ((onrpi < np) && (onrpi >= newp0i)) {
          ocs.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[onrpi];
          ocs.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
          onrpi = dxb.vr[ir].v_nxt[onrpi];
        }
        while (onrpi < np) {
          dcay = Math.exp(-1.0*Math.abs(ocs.v_1ls[ik].fd * (dxb.m.v_p[newp0i]-dxb.vr[ir].v_p[onrpi])));
          ocs.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[onrpi] *  dcay;
          ocs.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi] * dcay;
          onrpi = dxb.vr[ir].v_nxt[onrpi];
        }
      }
      ocs.v_1ls[ik].m_csumq = newq;
      ocs.v_1ls[ik].m_csumpq = newq * dxb.m.v_p[newp0i];
      ocs.v_1ls[ik].m_worstpi = newp0i;
      ocs.v_1ls[ik].m_nocc = 1;
    }
    // Success for Exponential New;
    return(102);
  } 
  // Update Market Exchange book
  dxb.m.v_prv[dxb.m.p0i] = newp0i;
  dxb.m.v_nxt[newp0i] = dxb.m.p0i;
  dxb.m.v_q[newp0i] = newq;
  dxb.m.tot_q += newq;
  dxb.m.tot_pq += newq * dxb.m.v_p[newp0i]; 
  dxb.m.nocc += 1;
  dxb.m.p0i = newp0i;

  // related values tweak and update
  // Exponetial shifts have a challenge
  //   "related" values that are better than oldp0i were weighted 1.0
  // We now have to add a weight to values that were not expoentially weighted
  let st_csumq_ir = 0.0; let st_csumpq_ir = 0.0; 
  let stonrpi = -1;  let csumq_ir = 0; let csumpq_ir = 0;
  for (ir=0;ir<nr;ir++) {
    if (dxb.vr[ir].p0i > oldp0i) {
      st_csumq_ir = 0.0;
      st_csumpq_ir = 0.0;
      onrpi = dxb.vr[ir].p0i;
      while ((onrpi < np) && (onrpi >= newp0i)) {
        st_csumq_ir += dxb.vr[ir].v_q[onrpi];
        st_csumpq_ir += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
        onrpi = dxb.vr[ir].v_nxt[onrpi];
      }
      stonrpi = onrpi;
      for (ik=0;ik<nk;ik++) {
        onrpi = stonrpi;
        csumq_ir = st_csumq_ir;
        csumpq_ir = st_csumpq_ir;
        while (onrpi < np) {
          dcay = Math.exp(-1.0*Math.abs(ocs.v_1ls[ik].fd * (dxb.m.v_p[newp0i] - dxb.m.v_p[onrpi])));
          csumq_ir += dcay * dxb.vr[ir].v_q[onrpi];
          csumpq_ir += dcay * dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
          onrpi = dxb.vr[ir].v_nxt[onrpi];
        } 
        ocs.v_1ls[ik].vr_csumq[ir] = csumq_ir;
        ocs.v_1ls[ik].vr_csumpq[ir] = csumpq_ir;
      }
    } else {
      for (ik=0;ik<nk;ik++) {
        dcay = Math.exp(Math.abs(-ocs.v_1ls[ik].fd * (dxb.m.v_p[newp0i] - dxb.m.v_p[oldp0i])));
        ocs.v_1ls[ik].vr_csumq[ir] *= dcay;
        ocs.v_1ls[ik].vr_csumpq[ir] *= dcay;
      }
    }
  }
  for (ik=0;ik<nk;ik++) {
    // In this case we just have to descale existing sums.
    // Typically multiplying by a < 1 results in small loss in numerical accuracy.
    // It is only when we multiply by a > 1 that we see effects of floating point loss.
    dcay = Math.exp(-1.0*Math.abs(ocs.v_1ls[ik].fd * (dxb.m.v_p[newp0i] - dxb.m.v_p[oldp0i])));
    ocs.v_1ls[ik].m_csumq = newq + ocs.v_1ls[ik].m_csumq * dcay;
    ocs.v_1ls[ik].m_csumpq = (newq * dxb.m.v_p[newp0i]) + ocs.v_1ls[ik].m_csumpq * dcay;
    ocs.v_1ls[ik].m_nocc = dxb.m.nocc;
  }
  // Even easier just had to scale by decay update.
  return(103);
}

 /// new_related_price
 ///
 /// A new price to related market does not shift market p0i
 /// The result is that we merely have to add a single quantity to our related total
const TotalCurrentState_new_related_price = function(xb, ir, bs01, newp0i, newq) {
  // xb: MarketExchangeBook input
  // ir: Index of related exchange.
  // bs01: buy=0,sell=1,
  // newp0i: index of new price
  // new_q: new quantity to go into the price
  const nk = this.nk; let ik=0;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s; const oldrp0i = dxb.vr[ir].p0i;
  const np = dxb.np;  const kalgo = ocs.kalgo;
  const nr = this.nr;
  const nrp = (nr > 0) ? dxb.vr[ir].v_p.length: 0;
  const mp0i = dxb.m.p0i; let dcay = 1.0;
  const PRINT_N = ((this.verbose_ob.verbose > 0) ?
    make_print_n(this.verbose_ob,
      ("new_related_price(" + str_kalgo(kalgo) + "," + ((bs01==0) ? "b":"s") + 
      ",orp0i=" + oldrp0i + ":\$" + ((oldrp0i < np) ? dxb.vr[ir].v_p[oldrp0i] : -1.0) + 
      ",np0i=" + newp0i + ":\$" + ((newp0i <np) ? dxb.m.v_p[newp0i] : -1.0) + 
      ",nq=" + newq + "): ")
    ) : console.log); 
  if (this.nr <= 0) {
    PRINT_N(-10, " --- Error, nr is zero, why are we running?");
    return(-13043);
  }
  if (oldrp0i >= nrp) {
    // No quantity exists yet for this related party;
    dxb.vr[ir].tot_q = newq;
    dxb.vr[ir].tot_pq = newq * dxb.vr[ir].v_p[newp0i];
    dxb.vr[ir].p0i = newp0i;
    dxb.vr[ir].nocc = 1;
    dxb.vr[ir].p_wi = newp0i;
  } else if (oldrp0i < newp0i) {
    dxb.vr[ir].v_prv[oldrp0i] = newp0i;
    dxb.vr[ir].v_nxt[newp0i] = dxb.vr[ir].p0i;
    dxb.vr[ir].v_q[newp0i] = newq;
    dxb.vr[ir].tot_q += newq;
    dxb.vr[ir].tot_pq += newq * dxb.vr[ir].v_p[newp0i]; dxb.vr[ir].p0i = newp0i;
    dxb.vr[ir].nocc += 1;
  } else {

  }
  if (kalgo === Kalgo.ExpDecay) {
    if ((mp0i >= nrp) || (newp0i >= mp0i)) {
      for (ik=0;ik<nk;ik++) {
        ocs.v_1ls[ik].vr_csumq[ir] += newq;
        ocs.v_1ls[ik].vr_csumpq[ir] += newq * dxb.vr[ir].v_p[newp0i];
      }
    } else {
      for (ik=0;ik<nk;ik++) {
        dcay= Math.exp(-1.0*Math.abs(ocs.v_1ls[ik].fd * (dxb.m.v_p[mp0i] - dxb.vr[ir].v_p[newp0i])));
        ocs.v_1ls[ik].vr_csumq[ir] += newq * dcay; 
        ocs.v_1ls[ik].vr_csumpq[ir] += newq * dxb.vr[ir].v_p[newp0i] * dcay;
      }
    }    
    return(303);
  }
  for (ik=0;ik<nk;ik++) {
    if (ocs.v_1ls[ik].m_worstpi >= np) {
      ocs.v_1ls[ik].vr_csumq[ir] = dxb.vr[ir].tot_q;
      ocs.v_1ls[ik].vr_csumpq[ir] = dxb.vr[ir].tot_pq;
      ocs.v_1ls[ik].vr_nocc[ir] += 1;
      if (ocs.v_1ls[ik].vr_worstpi[ir] >= newp0i) {
        ocs.v_1ls[ik].vr_worstpi[ir] = newp0i;
      }
    } else if (newp0i >= ocs.v_1ls[ik].m_worstpi) {
      ocs.v_1ls[ik].vr_csumq[ir] += newq;
      ocs.v_1ls[ik].vr_csumpq[ir] += newq * dxb.m.v_p[newp0i];
      ocs.v_1ls[ik].vr_nocc[ir] += 1;
      if (ocs.v_1ls[ik].vr_worstpi[ir] >= newp0i) {
        ocs.v_1ls[ik].vr_worstpi[ir] = newp0i;
      }
    }
  }
  return(405);
}

// completely_new_market_best_price
//
// In this case we are starting from an empty market with no existing Best Price (p0i)
// We have to insert this new price and use it to completely total all related/market values
//
// It is always possible we had related values in xb.vr[i].v_q, and hence there is still new
// totals we have to consider doing.
const TotalCurrentState_completely_new_market_best_price = function(xb, bs01, newp0i, newq) {
  // xb: MarketExchangeBook input
  // bs01: buy=0,sell=1,
  // new_p0i: index of new price
  // new_q: new quantity to go into the price
  const nk = this.nk; let ik=0;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s; 
  const oldp0i = dxb.m.p0i;
  const np = dxb.m.np;  const kalgo = ocs.kalgo;
  const nr = dxb.vr.length; let ir = 0;
  const nrp = (nr > 0) ? dxb.vr[ir].v_p.length : 0;
  if (oldp0i < np) {
    console.log("completely_new_market_best_price(" + ((bs01==0) ? "b":"s") + 
      ") ERROR oldp0i is already " + oldp0i + ":\$" + dxb.m.v_p[oldp0i] + 
      " so while you gave newp0i=" + newp0i + " This is error!");
    return(-60304);
  }
  if (newp0i > np) {
    console.log("completely_new_market_best_price(" + ((bs01==0) ? "b":"s") + 
      ") ERROR newp0i is " + newp0i + " but np=" + np + " ERROR ");
    return(-60305);
  }
  // PRINT_N is just error message if verbose is bad
  const pr_str = ((this.verbose_ob.verbose<= 0) ? "" :
      ("completely_new_market_best_price(" + str_kalgo(kalgo) + "," + 
      ((bs01==0) ? "b":"s") + 
      ",np0i=" + newp0i + ":\$" + ((newp0i <np) ? dxb.m.v_p[newp0i] : -1.0) + 
      ",nq=" + newq + "): ") );
  const PRINT_N = ((this.verbose_ob.verbose>0) ?
    make_print_n(this.verbose_ob, pr_str) : (x,y)=>0);
  //if (typeof(PRINT_N) != 'function') {
  //  console.log("ERROR " + pr_str + " PRINT_N was not generated correctly."); debugger;
  //}
  // Note, simpler JS borrowing rules mean we can just work on dxb now
  dxb.m.p0i = newp0i; dxb.m.p_wi = newp0i; dxb.m.nocc = 1;
  dxb.m.v_q[newp0i] = newq; dxb.m.tot_q = newq;
  const newpq = newq * dxb.m.v_p[newp0i];
  dxb.m.tot_pq = newpq;
  for (ik=0;ik<nk;ik++) {
    ocs.v_1ls[ik].m_nocc = 1;
    ocs.v_1ls[ik].m_worstpi = newp0i;
    ocs.v_1ls[ik].m_csumq = newq;
    ocs.v_1ls[ik].m_csumpq = newpq;
    ocs.v_1ls[ik].crit_pi = newp0i;
    const init_crit_pi = ocs.v_1ls[ik].crit_pi;
    //console.log("completely_new_market, about to try a moveout?"); debugger;
    ocs.v_1ls[ik].crit_pi = this.crit_move_out(xb,bs01,ik);
    if ((kalgo == Kalgo.NumFilled) && (dxb.m.nocc < ocs.v_1ls[ik].d) && (ocs.v_1ls[ik].crit_pi != 0)) {
      PRINT_N(-6, "ERROR  completely new market best price Error on ik=" + ik + "/" + nk + ": crit_move out still errors on Kalgo =" + str_kalgo(kalgo));
      console.log(" ---- Error: Go work on this!");
      debugger;
    }
  }
  let r_csumq_st = 0.0; let r_csumpq_st = 0.0;
  let r_onpi_st = 0;  let r_worstpi_st = -1;  let r_nocc_st = 0;
  let bestp = 0;  let r_onpi = 0; let lbd = 0; let dcay = 0;
  for (ir=0;ir<nr;ir++) {
    r_csumq_st = 0.0; r_csumpq_st = 0.0;
    r_onpi_st = dxb.vr[ir].p0i;
    r_worstpi_st = np;
    r_nocc_st = 0;
    while ((r_onpi_st < np) && (r_onpi_st >= newp0i)) {
      r_csumq_st += dxb.vr[ir].v_q[r_onpi_st];
      r_csumpq_st += dxb.vr[ir].v_q[r_onpi_st] * dxb.vr[ir].v_p[r_onpi_st];
      r_nocc_st += 1; r_worstpi_st = r_onpi_st;
      r_onpi_st = dxb.vr[ir].v_nxt[r_onpi_st];
    }
    if (ocs.kalgo === Kalgo.ExpDecay) {
      bestp = dxb.m.v_p[newp0i];
      for (ik=0;ik<nk;ik++) {
        //ocs.v_1ls[ik].vr_nocc[ir] = r_nocc_st;
        //ocs.v_1ls[ik].vr_worstpi[ir] = r_worstpi_st;
        ocs.v_1ls[ik].vr_csumq[ir] = r_csumq_st;
        ocs.v_1ls[ik].vr_csumpq[ir] = r_csumpq_st;
        r_onpi = r_onpi_st;
        lbd = ocs.v_1ls[ik].fd;
        while (r_onpi < np) { 
          dcay = Math.exp(-1.0*Math.abs( lbd * ( bestp - (dxb.vr[ir].v_p[r_onpi]))));
          ocs.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[r_onpi] * dcay;
          ocs.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[r_onpi] * dxb.vr[ir].v_p[r_onpi] * dcay;
          //ocs.v_1ls[ik].vr_worstpi[ir] = r_onpi;
          //ocs.v_1ls[ik].vr_nocc[ir] += 1;
          if (r_onpi <= dxb.vr[ir].v_nxt[r_onpi]) {
            r_onpi = np;
          } else {
            r_onpi = dxb.vr[ir].v_nxt[r_onpi]; 
          }
        } 
        ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
        ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
      }
    } else {
      for (ik=0;ik<nk;ik++) {
        ocs.v_1ls[ik].vr_nocc[ir] = r_nocc_st;
        ocs.v_1ls[ik].vr_csumq[ir] = r_csumq_st;
        ocs.v_1ls[ik].vr_csumpq[ir] = r_csumpq_st;
        ocs.v_1ls[ik].vr_worstpi[ir] = r_worstpi_st;
        r_onpi = r_onpi_st;
        while ((r_onpi < np) && (r_onpi >= ocs.v_1ls[ik].crit_pi)) {
          ocs.v_1ls[ik].vr_nocc[ir] += 1;
          ocs.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[r_onpi];
          ocs.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[r_onpi] * dxb.vr[ir].v_p[r_onpi];
          ocs.v_1ls[ik].vr_worstpi[ir] = r_onpi;
          r_onpi = dxb.vr[ir].v_nxt[r_onpi]; 
        } 
      }
    }
  }
  ocs.fresh_w_all_window(dxb);
  return(1);
}


// completely_new_market_best_price
//
// In this case we are starting from an empty market with no existing Best Price (p0i)
// We have to insert this new price and use it to completely total all related/market values
//
// It is always possible we had related values in xb.vr[i].v_q, and hence there is still new
// totals we have to consider doing.
const TotalCurrentState_update_tcs_r_ir = function(xb, ir, bs01, newrpi, newrq) {
  // xb: MarketExchangeBook input
  // ir: Index of the update for tcs_r_ir
  // bs01: buy=0,sell=1,
  // new_p0i: index of new price
  // new_q: new quantity to go into the price
  //
  //
  const nk = this.nk; let ik=0;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s; 
  const nr = dxb.vr.length; 
  const np = dxb.m.np;  const kalgo = ocs.kalgo;
  if (ir >= nr) {
    console.log("update_tcs_r_ir(" + str_kalgo(kalgo) + "," + ((bs==0) ? "b" : "s") + 
      ", ir=" + ir + "/" + nr + ", newrpi=" + newrpi + ") ERROR ir is a fail!");
    return(-403023);
  }
  const oldrpi = dxb.vr[ir].p0i;
  const nrp = (nr > 0) ? dxb.vr[ir].v_p.length : 0; const newrp = (newrpi < dxb.m.v_p.length) ? dxb.m.v_p[newrpi] : -300;
  const mp0i = dxb.m.p0i; const mp0 = (mp0i < np) ? dxb.m.v_p[mp0i] : 0.0;

  if (ir >= nr) {
    console.log("update_tcs_r_ir(" + str_kalgo(kalgo) + "," + ((bs==0) ? "b" : "s") + 
      ", ir=" + ir + "/" + nr + ", newrpi=" + newrpi + "/" + nrp + ") ERROR newrpi is a fail!");
    return(-304032);
  }

  if ((this.verbose_ob === undefined) || (this.verbose_ob === null)) {
    console.log("update_tcs_r_ir, error, verbose ob is an undefined?");  debugger;
  } else if (typeof(this.verbose_ob) != 'object') {
    console.log("update_tcs_r_ir, error, verbose object is not an object."); debugger;
  } else if (typeof(this.verbose_ob.verbose) != 'number') {
    console.log("update_tcs_r_ir, error, the verbose_ob.verbose is not number."); debugger;
  } else if (!('s' in this.verbose_ob)) { 
    console.log("update_tcs_r_ir, error, the verbose_ob.s is not extant."); debugger;
  } else if (!(Array.isArray(this.verbose_ob.s))) {
    console.log("update_tcs_r_ir: Error, the verbose_ob.s is not an array."); debugger;
  }
  const PRINT_N = (this.verbose_ob.verbose > 0 ? 
    make_print_n(this.verbose_ob,
      ("update_tcs_r_ir(" + str_kalgo(kalgo) + "," + ((bs01==0) ? "b":"s") + 
       ",mp0i=" + mp0i + "/" + np + "," + 
       ",newrpi=" + newrpi + ":\$" + ((newrpi <nrp) ? dxb.vr[ir].v_p[newrpi] : -1.0) + 
       ",nq=" + newrq + "): ")
    ) : (x,y)=>0);
  if (typeof(PRINT_N) != 'function') {
    console.log("update_tcs_r_ir: Error, we did not activate a print_n."); debugger;
  }
    // Note, it can be hard to calculate spread/midpoint after taking on dxb/ocs parts.
  const p0i_exists = ( ((kalgo === Kalgo.MultipleSpread) && (xb.s.m.p0i < xb.s.m.np) && (xb.b.m.p0i < xb.b.m.np)) ?  true :
                       ((bs01==0) && (xb.b.m.p0i < xb.b.m.np)) ? true  :
                       ((bs01==1) && (xb.s.m.p0i < xb.s.m.np)) ? true :
                       false);
  if (newrpi >= nrp) {
    PRINT_N(-6, " ERROR, newrpi = " + newrpi + " but nrp = " + nrp);
    return(-5030430);
  }
  const oldq = dxb.vr[ir].v_q[newrpi];
  const delta_q = newrq - oldq;
  if (delta_q == 0.0) {
    return(104363);
  }
  let abovep = dxb.vr[ir].v_prv[newrpi]; let belowp = dxb.vr[ir].v_nxt[newrpi];
  if (dxb.vr[ir].v_q[newrpi] <= 0.0) {
    if (dxb.vr[ir].p0i >= np) {
    } else {
      if (dxb.vr[ir].p_wi < newrpi) {
        if (dxb.vr[ir].p0i < newrpi) {
          abovep = np; belowp = dxb.vr[ir].p0i;
        } else {
          belowp = dxb.vr[ir].p_wi;
          while (dxb.vr[ir].v_prv[belowp] < newrpi) {
            belowp = dxb.vr[ir].v_prv[belowp];
          }
          abovep = dxb.vr[ir].v_prv[belowp];
        }
      } else {
        abovep = dxb.vr[ir].p_wi;
        belowp = np;
      }
    }
  } 
  if ( (newrq == 0.0) && (dxb.vr[ir].v_q[newrpi] > 0.0) &&
       (abovep >= np) && (belowp >= np) ) {
    dxb.vr[ir].v_q[newrpi] = 0.0; 
    dxb.vr[ir].p_wi = np; 
    dxb.vr[ir].p0i = np;
    dxb.vr[ir].nocc = 0; dxb.vr[ir].tot_q = 0.0;
    dxb.vr[ir].tot_pq = 0.0; 
    for (ik=0;ik<nk;ik++) {
       ocs.v_1ls[ik].vr_csumq[ir] = 0.0;
       ocs.v_1ls[ik].vr_csumpq[ir] = 0.0;
       ocs.v_1ls[ik].vr_worstpi[ir] = np;
       ocs.v_1ls[ik].vr_nocc[ir] = 0;
    }
    return(3043);
  } 

  if ((dxb.vr[ir].v_q[newrpi] <= 0.0) && (newrq > 0.0)) {
    if (dxb.vr[ir].p0i >= dxb.vr[ir].np) {
      dxb.vr[ir].p0i = newrpi; dxb.vr[ir].p_wi = newrpi;
    } else { 
      dxb.vr[ir].v_prv[newrpi] = abovep;
      if (belowp < np) { 
        dxb.vr[ir].v_prv[belowp] = newrpi;
        dxb.vr[ir].v_nxt[newrpi] = belowp;
      } else {
        dxb.vr[ir].p_wi = newrpi;
      }
      if (abovep < np) {
        dxb.vr[ir].v_nxt[abovep] = newrpi;
      } else {
        dxb.vr[ir].p0i = newrpi;
      }
    }
    dxb.vr[ir].v_q[newrpi] = newrq;
    dxb.vr[ir].nocc += 1;
  } else if ((newrq == 0.0) && dxb.vr[ir].v_q[newrpi] > 0.0) {
    if (belowp < np) {
      dxb.vr[ir].v_prv[belowp] = abovep;
    }
    if (abovep < np) {
      dxb.vr[ir].v_nxt[abovep] = belowp;
    }
    if (dxb.vr[ir].p_wi == newrpi) { dxb.vr[ir].p_wi = abovep; }
    if (dxb.vr[ir].p0i == newrpi) { dxb.vr[ir].p0i = belowp; }
    dxb.vr[ir].nocc -= 1; 
    dxb.vr[ir].v_prv[newrpi] = np; dxb.vr[ir].v_nxt[newrpi] = np;
    dxb.vr[ir].v_q[newrpi] = 0.0;
  } else {
    dxb.vr[ir].v_q[newrpi] = newrq;
  }
  dxb.vr[ir].tot_q += delta_q;
  dxb.vr[ir].tot_pq += delta_q * dxb.m.v_p[newrpi];

  let dcay = 1.0;
  if (newrpi >= dxb.m.np) {
    PRINT_N(-2, ": issue, np is apparently " + np + " and newrpi is " + newrpi + ".");
    if ((dxb.m.p0i >= dxb.m.np) || (newrpi >= dxb.m.p0i)) {
      for (ik=0;ik<nk;ik++) {
        ocs.v_1ls[ik].vr_csumq[ir] += delta_q; 
        ocs.v_1ls[ik].vr_csumpq[ir] += delta_q * dxb.m.v_p[newrpi];
        ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
        ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
      }
    } else {
      for (ik=0;ik<ocs.v_1ls.length;ik++) {
        dcay = Math.exp(-1.0*Math.abs((ocs.v_1ls[ik].fd) *
            (mp0-newrp)));
        ocs.v_1ls[ik].vr_csumq[ir] += dcay * delta_q;
        ocs.v_1ls[ik].vr_csumpq[ir] += dcay * delta_q * dxb.m.v_p[newrpi];
        ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
        ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
      }
    }
    return(104);
  }
  if (p0i_exists == false) { 
    // Either guarantee all ik are in.
    for (ik=0;ik<nk;ik++) {
      ocs.v_1ls[ik].vr_csumq[ir] = dxb.vr[ir].tot_q;
      ocs.v_1ls[ik].vr_csumpq[ir] = dxb.vr[ir].tot_pq;
      ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
      ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
    }
    return(105);
  }
  for (ik=0;ik<nk;ik++) {
    //if (ocs.v_1ls[ik].m_worstpi >= dxb.m.np) ||
    //   (ocs.v_1ls[ik].m_worstpi <= newrpi) || (ocs.v_1ls[ik].crit_pi <= newrpi) ||
    //   (new_rin_condition!(ik, newrpi,ir)) {
    if (ocs.v_1ls[ik].crit_pi == 0) {
      ocs.v_1ls[ik].vr_csumq[ir] = dxb.vr[ir].tot_q;
      ocs.v_1ls[ik].vr_csumpq[ir] = dxb.vr[ir].tot_pq;
      ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
      ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
    } else if (ocs.v_1ls[ik].crit_pi <= newrpi) {
      ocs.v_1ls[ik].vr_csumq[ir] += delta_q; 
      ocs.v_1ls[ik].vr_csumpq[ir] += delta_q * newrp;
      if ((newrq > 0.0) && (oldq == 0.0)) {
        if (ocs.v_1ls[ik].vr_nocc[ir] == 0 || ocs.v_1ls[ik].vr_worstpi[ir] > newrpi)  {
          ocs.v_1ls[ik].vr_worstpi[ir] = newrpi;
        }
        ocs.v_1ls[ik].vr_nocc[ir] += 1; 
      } else if ((newrq == 0.0) && (oldq > 0.0)) {
        ocs.v_1ls[ik].vr_nocc[ir] -= 1;
        if (ocs.v_1ls[ik].vr_worstpi[ir] == newrpi) {
          if ((belowp < np) && (belowp >= ocs.v_1ls[ik].crit_pi)) {
            ocs.v_1ls[ik].vr_worstpi[ir] =  belowp; 
          } else {
            ocs.v_1ls[ik].vr_worstpi[ir] = abovep;   
          }
        }
      }
    }
    if (ocs.v_1ls[ik].crit_pi == newrpi) {
      ocs.v_1ls[ik].vr_atq[ir] += delta_q;
    }
  }
  if ((newrq == 0.0) && (oldq > 0.0)) {
    return(10348);
  } else if ((newrq > 0.0) && (oldq == 0.0)) {
    return(10349);
  }
  return(10343);
}

/****
    macro_rules!new_overload_condition {
      ($newpi:expr, $ik: expr) => {
      match ocs.kalgo {
      Kalgo::NumFilled => { u64::from(ocs.v_1ls[$ik].m_nocc + 1) > u64::from(ocs.v_1ls[$ik].d) },
      Kalgo::NumAll => { (i64::try_from(ocs.v_1ls[$ik].m_worstpi).unwrap() - i64::try_from($newpi).unwrap()).abs() > i64::try_from(ocs.v_1ls[$ik].d).unwrap() },
      Kalgo::NumPennies => { (dxb.m.v_p[ocs.v_1ls[$ik].m_worstpi]-dxb.m.v_p[$newpi]).abs() >= ocs.v_1ls[$ik].fd },
      Kalgo::MultipleSpread => { _spread <= 0.0 || 
                                ((_spread as f64) * ocs.v_1ls[$ik].fd >=
                                (dxb.m.v_p[$newpi]-dxb.m.v_p[ocs.v_1ls[$ik].m_worstpi]).abs()) },
      Kalgo::PctDepth => { ( (ocs.bs == TBS::B) && ((dxb.m.v_p[$newpi]-dxb.m.v_p[ocs.v_1ls[$ik].m_worstpi]) /
                              (dxb.m.v_p[$newpi]) < ocs.v_1ls[$ik].fd)) ||
                            ( (ocs.bs == TBS::S) && ((dxb.m.v_p[ocs.v_1ls[$ik].m_worstpi] - dxb.m.v_p[$newpi]) /
                              (dxb.m.v_p[$newpi]) < ocs.v_1ls[$ik].fd)) }, 
      Kalgo::NumShares => { (ocs.v_1ls[$ik].m_csumq + newq - dxb.m.v_q[ocs.v_1ls[$ik].m_worstpi]) >= (ocs.v_1ls[$ik].d) as f64 },
      Kalgo::TotalDollars => { ((ocs.v_1ls[$ik].m_csumpq + newq * dxb.m.v_p[$newpi] -
        dxb.m.v_q[ocs.v_1ls[$ik].m_worstpi] * dxb.m.v_p[ocs.v_1ls[$ik].m_worstpi]) >= ocs.v_1ls[$ik].fd) },
      Kalgo::ExpDecay => { false } // Condition should never occur
      }
    }
    }
****/
const new_overload_condition = function(kalgo, ocs, dxb, spread, newp0i, ik) {
  return(
    ((kalgo===Kalgo.ExpDecay) ? false :
     (kalgo===Kalgo.NumFilled) ? (  ocs.v_1ls[ik].m_nocc+1 > ocs.v_1ls[ik].d ) :
     (kalgo===Kalgo.NumAll) ? (Math.abs(ocs.v_1ls[ik].m_worstpi - newp0i ) > ocs.v_1ls[ik].d) :
     (kalgo===Kalgo.NumPennies) ? (Math.abs(dxb.m.v_p[ocs.v_1ls[ik].m_worstpi]-dxb.m.v_p[newp0i]) >= ocs.v_1ls[ik].fd) :
     (kalgo===Kalgo.MultipleSpread) ? ((spread<=0.0) || (spread*ocs.v_1ls[ik].fd>=Math.abs(dxb.m.v_p[newp0i]-dxb.m.v_p[ocs.v_1ls[ik].m_worstpi]))) :
     (kalgo===Kalgo.PctDepth) ? (Math.abs( (dxb.m.v_p[ocs.v_1ls[ik].m_worstpi]-dxb.m.v_p[newp0i])) / dxb.m.v_p[newp0i] < ocs.v_1ls[ik].fd) :
     (kalgo===Kalgo.NumShares) ? ((ocs.v_1ls[ik].m_csumq + newq - dxb.m.v_q[ocs.v_1ls[ik].m_worstpi]) >= ocs.v_1ls[ik].d) :
     (kalgo===Kalgo.TotalDollars) ? ((ocs.v_1ls[ik].m_csumpq + (newq * dxb.m.v_p[newp0i]) -
                                dxb.m.v_q[ocs.v_1ls[ik].m_worstpi] * dxb.m.v_p[ocs.v_1ls[ik].m_worstpi]) >= ocs.v_1ls[ik].fd) :
     false
    )
  );
}
// NewBestPrice Update condition: Pop in a New Best overall price
//
//  3 cases
//    - Exponential means we must decay all past events and add the new quantity at level 1.0
//      In this case, we might have to recorect how some registrant data is calculated
//      That case can shifts all values.
//    - NonExponential -- No extant data
//       We just need to add the quantity because no change will be
//    - NonExponential
//       If we are at level we need to remove quantity from vWorstP (and step back vWorstP)
//        until we are back at level given newq added from the new best price
//       We will use the above macro! NewOverloadCondition to determine the excess condition, as 
//         witnessed it behaves weird for each category.
const TotalCurrentState_new_m_best_price = function(xb, bs01, newp0i, newq) {
  // xb: MarketExchangeBook input
  // bs01: buy=0,sell=1,
  // newp0i: index of new price
  // newq: new quantity to go into the price
  //
  const nk = this.nk; let ik=0;
  if ((xb.s === undefined) || (xb.s === null)) {
    console.log("TotalCurrentState_new_m_best_price: error, xb.s."); debugger;
  }
  if ((xb.s.m=== undefined) || (xb.s.m===null)) {
    console.log("TotalCurrentState_new_m_best_price: error, xb.s.m is not defined."); debugger;
  }
  if ((xb.b.m=== undefined) || (xb.b.m===null)) {
    console.log("TotalCurrentState_new_m_best_price: error, xb.b.m is not defined."); debugger;
  }
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s; 
  const nr = dxb.vr.length; let ir = 0;
  const np = dxb.m.np;  const kalgo = ocs.kalgo;
  const oldp0i = dxb.m.p0i; 
  const oldp0 = (oldp0i<np) ? dxb.m.v_p[oldp0i] : 0.0;
  const newp0 = (newp0i<np) ? dxb.m.v_p[newp0i] : 0.0;
  const mp0i = dxb.m.p0i; const mp0 = (mp0i < np) ? dxb.m.v_p[mp0i] : 0.0;

  if (newp0i >= np) {
    console.log("new_m_best_price(" + str_kalgo(kalgo) + "," + ((bs01==0) ? "b" :"s" ) + 
     ") ERROR newp0i = " + newp0i + " but np=" + np);
    return(-304034);
  }
  const PRINT_N = (this.verbose_ob.verbose > 0 ?
    make_print_n(this.verbose_ob, 
      ("new_m_best_price(" + str_kalgo(kalgo) + "," + ((bs01==0) ? "b":"s") + 
       ",oldp0i=" + oldp0i + "/" + np + ":\$" + oldp0 + "," + 
       ",newp0i=" + newp0i + "/" + np + ":\$" + newp0 + ",nq=" + newq + "): ")
    ) : null);
    // Note, it can be hard to calculate spread/midpoint after taking on dxb/ocs parts.

  let dcay = 0.0; let ip = 0; let s_d = 0.0;
  if (kalgo == Kalgo.ExpDecay) {
    for (ik=0;ik<nk;ik++)  {
      dcay = Math.exp(-1.0*Math.abs(ocs.v_1ls[ik].fd * (oldp0-newp0)));
      // Decay existing market book by decayFac, add the new quantity
      ocs.v_1ls[ik].m_csumq = ocs.v_1ls[ik].m_csumq * decay_fac + newq;
      ocs.v_1ls[ik].m_nocc += 1;
      for (ir=0;ir<nr;ir++) {
        if (dxb.vr[ir].p0i > dxb.m.p0i) {
          // We decay only quantities "less than newp0i", and count whole quantities superior
          ip = dxb.m.p0i; s_d = 0.0;
          while ((ip >= newp0i) && (ip <= dxb.vr[ir].np)) {
            s_d += dxb.vr[ir].v_q[ip];
            ip = dxb.vr[ir].v_nxt[ip]; // Fall deeper in book
          }
          ocs.v_1ls[ik].vr_csumq[ir] = (ocs.v_1ls[ik].vr_csumq[ir]*dcay) + s_d;
        }
      }
    }
    dxb.m.p0i = newp0i; 
    return(1);
  }
  // Expo didn't have stop condition so solved above.
  if (nk > 0) {
    if ((ocs.v_1ls[0].m_nocc == 0) || (ocs.v_1ls[0].m_worstpi >= dxb.m.np))  {
      for (ik=0;ik<nk;ik++) {
        ocs.v_1ls[ik].m_csumq = newq; ocs.v_1ls[ik].m_nocc = 1; ocs.v_1ls[ik].m_csumpq = newq * dxb.m.v_p[newp0i];
        ocs.v_1ls[ik].m_worstpi = newp0i;
        // Since no movement back in vWorstP, we assume no change to registrants;
        if (kalgo == Kalgo.ExpDecay) {
          PRINT_N(-6, " Warning ExpDecay here is invalid for m_atq it doesn't exist");
        } else if (ocs.d0fd1 === 0) {
          if (ocs.v_1ls[ik].d == 0) { ocs.v_1ls[ik].m_atq = newq; }
        } else if (ocs.d0fd1 === 1) {
          if (ocs.v_1ls[ik].fd == 0.0) { ocs.v_1ls[ik].m_atq = newq; }
        }
      }
    }
    dxb.m.p0i = newp0i;
    return(102);
  }
  for (ik=0;ik<nk;ik++) {
    // We assume that all fits satisfy this operation: find condition is met, then
    //  if so, decrease the worst price untill we have decreased far enough or don't have
    //  to decrease anymore.
    while (new_overload_condition(kalgo, ocs, dxb, spread, newp0i, ik)) {
      ocs.v_1ls[ik].m_csumq -= dxb.m.v_q[ocs.v_1ls[ik].m_worstpi];
      ocs.v_1ls[ik].m_csumpq -= dxb.m.v_q[ocs.v_1ls[ik].m_worstpi] * dxb.m.v_p[ocs.v_1ls[ik].m_worstpi];
      ocs.v_1ls[ik].m_nocc-=1;
      if (ocs.v_1ls[ik].m_worstpi == dxb.m.p0i) {
        // If Subracting means no place to go. but up to the new best price.
        ocs.v_1ls[ik].m_worstpi = newp0i;
      }
    }
    ocs.v_1ls[ik].m_csumq += newq; ocs.v_1ls[ik].m_csumpq += newq * dxb.m.v_p[newp0i];
    ocs.v_1ls[ik].m_nocc+=1;
    if (kalgo == Kalgo.ExpDecay) {
      PRINT_N(-6, " ERROR, ExpDecay case should not occur here.");
    } else if (ocs.d0fd1 === 0) {
      if (ocs.v_1ls[ik].d == 0) { ocs.v_1ls[ik].m_atq = newq; }
    } else if (ocs.d0fd1 === 1) {
      if (ocs.v_1ls[ik].fd == 0.0) { ocs.v_1ls[ik].m_atq = newq; }
    }
  }
  dxb.m.p0i = newp0i;
  return(103);
}


// This update should be universal for every Algo type.
//
// Occupation Number isn't changed, worst price isn't changed.
// The Decay value at best price is alway 1.0
// This price is always within all sum levels.
const TotalCurrentState_update_mq_at_bestprice = function(xb, bs01, newq) {
  // xb: MarketExchangeBook input
  // bs01: buy=0,sell=1,
  // newq: new quantity to go into the price
  //
  const nk = this.nk; let ik=0;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s; 
  const kalgo = ocs.kalgo;
  for (ik=0;ik<nk;ik++) {
    ocs.v_1ls[ik].m_csumq += newq - dxb.m.v_q[dxb.m.p0i];
    ocs.v_1ls[ik].m_csumpq += (newq - dxb.m.v_q[dxb.m.p0i]) * dxb.m.v_p[dxb.m.p0i];
    if (kalgo == Kalgo.ExpDecay) {
    } else if (ocs.d0fd1 === 0) {
      if (ocs.v_1ls[ik].d==0) { ocs.v_1ls[ik].m_atq = newq; }
    } else if (ocs.d0fd1 === 1) {
      if (ocs.v_1ls[ik].fd == 0.0) { ocs.v_1ls[ik].m_atq = newq; }
    }
  }
  return(104);
}

export {TotalCurrentState_update_mq_at_bestprice,
        TotalCurrentState_new_market_best_price,
        TotalCurrentState_new_m_best_price, new_overload_condition,
        TotalCurrentState_new_market_best_price_exp_decay,
        TotalCurrentState_new_related_price,
        TotalCurrentState_completely_new_market_best_price,
        TotalCurrentState_update_tcs_r_ir
};
