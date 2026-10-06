//import { Kalgo, TotalCurrentState, MarketExchangeBook } from '../ord_struct.js';
import { MarketExchangeBook, TotalCurrentState, OneSideState, OneSideCombinedBook, Kalgo, str_kalgo, und_str_kalgo } from "../ord_struct.js";
//use crate::ord_struct::Kalgo;
//use crate::ord_struct::{TBS, TPQ, TQ, TPi};
//
const TotalCurrentState_delete_market_best_price = function(xb, bs01)  {
   const oldp0i = (bs01==0) ? xb.b.m.p0i : xb.s.m.p0i;
   const np = (bs01 == 0) ? xb.b.m.np : xb.s.m.np;
   const nr = xb.nr;
   //let nr = if sdbs==TBS::B { xb.b.vr.length } else { xb.s.vr.length };
   if (oldp0i >= np) {
     console.log("delete_market_best_price( ERROR bs01=" + bs01 + ", oldp0i=" + oldp0i + " but np =  " + np);
     return(-5);
   }
   const oldq = (bs01 == 0) ? (xb.b.m.v_q[oldp0i]) : xb.s.m.v_q[oldp0i];
   const below_pi = (bs01 == 0) ? xb.b.m.v_nxt[oldp0i] : xb.s.m.v_nxt[oldp0i]; 
   if (below_pi >= np) { 
      // In this case, Market had no quantities at all, there are no criterions yet
      // Determinable, unlikely most are made.  Registrants converted from (All Quantty)
      console.log("delete_market_best_price -- We should Completely Delete Market but we were called!");
      return(-34323);
   }
   const below_q = (bs01===0) ? xb.b.m.v_q[below_pi] : xb.s.m.v_q[below_pi];
   const kalgo = (bs01===0) ? this.b.kalgo : this.s.kalgo;
   // from here we assume below_pi < np;
   if (kalgo === Kalgo.ExpDecay) {
     //Note, market should not be completely killing. 
     return(this.delete_market_best_price_exp_decay( xb, bs01));
     // This is exception, all values get shifted by a multiplier in different order
   }
   const nk = this.nk;
   const stt = ("delete_market_best_price(" + str_kalgo(kalgo) + "," + 
    ((bs01===0) ? "b" : "s") + ",o_p0i=" + oldp0i + "/" + np + ":\$" + 
    ((bs01===0) ? xb.b.m.v_p[oldp0i] : xb.s.m.v_p[oldp0i]) + "): ");
 
   let ik = 0; let ir = 0;
   // Note some of this was wasteful and silly.  The critical issue in Rust is that
   //   at this stage we needed either xb.b or xb.s and we needed to return ownership to make
   //   later calls.
   if (bs01 == 0) {
      xb.b.m.v_prv[below_pi] = xb.b.m.np;
      xb.b.m.tot_q -= oldq;
      xb.b.m.tot_pq -= oldq * xb.b.m.v_p[oldp0i];
      xb.b.m.p0i = below_pi; 
      xb.b.m.v_nxt[oldp0i] = xb.b.m.np;
      xb.b.m.nocc -= 1;
      xb.b.m.v_q[oldp0i] = 0.0;
      for (ik=0;ik<nk;ik++)  {
        if (this.b.v_1ls[ik ].m_worstpi > below_pi) {
           for (ir=0;ir<nr;ir++) {
             if ( (xb.b.vr[ir].p0i < xb.b.vr[ir].np) && (xb.b.vr[ir].p0i >= below_pi) ) {
                if (this.b.v_1ls[ik].vr_worstpi[ir] >= xb.b.vr[ir].np) {
                   this.b.v_1ls[ik].vr_worstpi[ir] = xb.b.vr[ir].p0i;
                   this.b.v_1ls[ik].vr_nocc[ir] = 1; 
                   this.b.v_1ls[ik].vr_csumq[ir] = xb.b.vr[ir].v_q[xb.b.vr[ir].p0i];   
                   this.b.v_1ls[ik].vr_csumpq[ir] = xb.b.vr[ir].v_q[xb.b.vr[ir].p0i] *
                                                  xb.b.vr[ir].v_p[xb.b.vr[ir].p0i];
                } 
                if (this.b.v_1ls[ik].vr_worstpi[ir] >= below_pi) {
                  while ((xb.b.vr[ir].v_nxt[this.b.v_1ls[ik].vr_worstpi[ir]] < xb.b.vr[ir].np) &&
                    xb.b.vr[ir].v_nxt[this.b.v_1ls[ik].vr_worstpi[ir]] >= below_pi) {
                    this.b.v_1ls[ik].vr_worstpi[ir] = xb.b.vr[ir].v_nxt[this.b.v_1ls[ik].vr_worstpi[ir]];
                    this.b.v_1ls[ik].vr_nocc[ir] += 1;
                    this.b.v_1ls[ik].vr_csumq[ir] += xb.b.vr[ir].v_q[this.b.v_1ls[ik].vr_worstpi[ir]];
                    this.b.v_1ls[ik].vr_csumpq[ir] += xb.b.vr[ir].v_q[this.b.v_1ls[ik].vr_worstpi[ir]] *
                                                         xb.b.vr[ir].v_p[this.b.v_1ls[ik].vr_worstpi[ir]];
                  }
                } else if (this.b.v_1ls[ik].vr_worstpi[ir] < below_pi) {
                  while (this.b.v_1ls[ik].vr_worstpi[ir] < below_pi) {
                    this.b.v_1ls[ik].vr_nocc[ir] -= 1;
                    this.b.v_1ls[ik].vr_csumq[ir] -= xb.b.vr[ir].v_q[this.b.v_1ls[ik].vr_worstpi[ir]];
                    this.b.v_1ls[ik].vr_csumpq[ir] -= xb.b.vr[ir].v_q[this.b.v_1ls[ik].vr_worstpi[ir]] *
                                                         xb.b.vr[ir].v_p[this.b.v_1ls[ik].vr_worstpi[ir]];
                    this.b.v_1ls[ik].vr_worstpi[ir] = xb.b.vr[ir].v_prv[this.b.v_1ls[ik].vr_worstpi[ir]];
                  }
                }
             }
           }
           this.b.v_1ls[ik ].m_worstpi = below_pi; this.b.v_1ls[ik].crit_pi = below_pi;
           this.b.v_1ls[ik].m_csumq = below_q; this.b.v_1ls[ik].m_nocc = 1;
           this.b.v_1ls[ik].m_csumpq = below_q * xb.b.m.v_p[below_pi]; 
           if (this.b.v_1ls[ik].crit_pi == oldp0i) { this.b.v_1ls[ik].crit_pi = below_pi; }
        } else {
          this.b.v_1ls[ik ].m_csumq -= oldq; this.b.v_1ls[ik ].m_csumpq -= oldq * xb.b.m.v_p[oldp0i];
          this.b.v_1ls[ik ].m_nocc -= 1;
        }
      }
    } else {
      xb.s.m.v_prv[below_pi] = xb.s.m.np;
      xb.s.m.tot_q -= oldq;
      xb.s.m.tot_pq -= oldq * xb.s.m.v_p[oldp0i];
      xb.s.m.p0i = below_pi; 
      xb.s.m.v_nxt[oldp0i] = xb.s.m.np;
      xb.s.m.nocc -= 1;
      xb.s.m.v_q[oldp0i] = 0.0;
      for (ik=0;ik<nk;ik++) {
        // In case we have to do a big jump down, and "m_worstpi > below_pi
        //    we will reset every "crit_pi" to equal below_pi and resum data as we adjust the critical
        // pi.  This is not as big a problem if we already have data summed below this level.
        //
        if (this.s.v_1ls[ik ].m_worstpi > below_pi) {
           this.s.v_1ls[ik].crit_pi = below_pi;
           for (ir=0;ir<nr;ir++) {
             if ((xb.s.vr[ir].p0i < xb.s.vr[ir].np) && (xb.s.vr[ir].p0i >= below_pi)) {
                if (this.s.v_1ls[ik].vr_worstpi[ir] >= xb.s.vr[ir].np) {
                   this.s.v_1ls[ik].vr_worstpi[ir] = xb.s.vr[ir].p0i;
                   this.s.v_1ls[ik].vr_nocc[ir] = 1; 
                   this.s.v_1ls[ik].vr_csumq[ir] = xb.s.vr[ir].v_q[xb.s.vr[ir].p0i];   
                   this.s.v_1ls[ik].vr_csumpq[ir] = xb.s.vr[ir].v_q[xb.s.vr[ir].p0i] *
                                                  xb.s.vr[ir].v_p[xb.s.vr[ir].p0i];
                } 
                if (this.s.v_1ls[ik].vr_worstpi[ir] >= below_pi) {
                  while ((xb.s.vr[ir].v_nxt[this.s.v_1ls[ik].vr_worstpi[ir]] < xb.s.vr[ir].np) &&
                    (xb.s.vr[ir].v_nxt[this.s.v_1ls[ik].vr_worstpi[ir]] >= below_pi)) {
                    this.s.v_1ls[ik].vr_worstpi[ir] = xb.s.vr[ir].v_nxt[this.s.v_1ls[ik].vr_worstpi[ir]];
                    this.s.v_1ls[ik].vr_nocc[ir] += 1;
                    this.s.v_1ls[ik].vr_csumq[ir] += xb.s.vr[ir].v_q[this.s.v_1ls[ik].vr_worstpi[ir]];
                    this.s.v_1ls[ik].vr_csumpq[ir] += xb.s.vr[ir].v_q[this.s.v_1ls[ik].vr_worstpi[ir]] *
                                                         xb.s.vr[ir].v_p[this.s.v_1ls[ik].vr_worstpi[ir]];
                  }
                } else if (this.s.v_1ls[ik].vr_worstpi[ir] < below_pi) {
                  while (this.s.v_1ls[ik].vr_worstpi[ir] < below_pi) {
                    this.s.v_1ls[ik].vr_nocc[ir] -= 1;
                    this.s.v_1ls[ik].vr_csumq[ir] -= xb.s.vr[ir].v_q[this.s.v_1ls[ik].vr_worstpi[ir]];
                    this.s.v_1ls[ik].vr_csumpq[ir] -= xb.s.vr[ir].v_q[this.s.v_1ls[ik].vr_worstpi[ir]] *
                                                         xb.s.vr[ir].v_p[this.s.v_1ls[ik].vr_worstpi[ir]];
                    this.s.v_1ls[ik].vr_worstpi[ir] = xb.s.vr[ir].v_prv[this.s.v_1ls[ik].vr_worstpi[ir]];
                  }
                }
             }
           }
           this.s.v_1ls[ik ].m_worstpi = below_pi;
           this.s.v_1ls[ik].m_csumq = below_q; this.s.v_1ls[ik].m_nocc = 1;
           this.s.v_1ls[ik].m_csumpq = below_q * xb.s.m.v_p[below_pi]; 
           if (this.s.v_1ls[ik].crit_pi == oldp0i) { this.s.v_1ls[ik].crit_pi = below_pi; }
        } else {
          this.s.v_1ls[ik ].m_csumq -= oldq; this.s.v_1ls[ik ].m_csumpq -= oldq * xb.s.m.v_p[oldp0i];
          this.s.v_1ls[ik ].m_nocc -= 1;
        }
      }
    }
    let spread = 0.0;
    if ((xb.s.m.p0i < xb.s.m.np) && (xb.b.m.p0i < xb.b.m.np)) {
        spread = xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i];
    } 
    spread = (spread < 0.0) ? 0.0 : spread;
    
    //let ocs.&mut OneSideState = if sdbs==TBS::B { &mut (this.b) } else { &mut (this.s) };
    //let dxb: &mut OneSideCombinedBook = if sdbs == TBS::B { &mut (xb.b) } else { &mut (xb.s) };
    let old_crit = 0; let crit_pi = 0;
    const ocs = (bs01 == 0) ? this.b : this.s;
    const dxb = (bs01 == 0) ? xb.b : xb.s; // Here we need to convert from xb to dxb;
    for (ik=0;ik<nk;ik++)  {
      old_crit = (bs01 == 0) ? this.b.v_1ls[ik].crit_pi : this.s.v_1ls[ik].crit_pi;
      switch (kalgo) {
        case Kalgo.NumFilled : 
            crit_pi = ocs.crit_move_out_num_filled(dxb, ik); break;
        case Kalgo.NumAll :
            crit_pi = ocs.crit_move_out_num_all(dxb, ik); break;
        case Kalgo.NumPennies :
            crit_pi =  ocs.crit_move_out_num_pennies(dxb, ik); break;
        case Kalgo.NumShares :
            crit_pi = ocs.crit_move_out_num_shares(dxb, ik); break;
        case Kalgo.MultipleSpread :
            crit_pi = ocs.crit_move_out_multiplespread(dxb, ik); break; 
        case Kalgo.TotalDollars :
            crit_pi =  ocs.crit_move_out_total_dollars(dxb, ik); break;
        case Kalgo.PctDepth :
            crit_pi =  ocs.crit_move_out_pct_depth(dxb, ik); break;
        case Kalgo.ExpDecay : 
            console.log(stt+" ExpDecay on Delete Item, actually This shouldn't get called!");
        default :
            console.log(stt+" del_best.js Error This Kalgo is invalid " + kalgo);
      }
      //if ((ik==1) && (bs01 == 0) && (crit_pi == 1)) {
      //  console.log("ERROR state in del_best.js;  We called ocs.crit_move_out_num_filled with old_crit=" + old_crit);
      //  debugger;
      //}
      // Ideally this just alters small compoinents of this.b or this.s
      if (old_crit > crit_pi) {
        if (bs01==0) {
           this.b.v_1ls[ik].move_out_to_crit(xb, crit_pi, bs01, ik);
           this.b.v_1ls[ik].crit_pi = crit_pi;
        } else {
           this.s.v_1ls[ik].move_out_to_crit(xb, crit_pi, bs01, ik);
           this.s.v_1ls[ik].crit_pi = crit_pi;
        }
      }
    }

    // On Delete, everyone shifts
    this.fresh_w_all_window(xb, bs01);
    return(1043);
}

const TotalCurrentState_completely_kill_market = function(xb, bs01) {
    // By removing last remaining price level, the Related orders get to max out and fill whole
    //  Universe Best buy is essentially zero (so all related orders are higher)
    //  and Best Sell is essetially infinite.
    const ocs = (bs01 == 0) ? this.b : this.s;
    let ik = 0; let ir = 0;
    const dxb = (bs01 == 0) ? xb.b : xb.s;
    dxb.m.v_q[dxb.m.p0i] = 0.0;
    dxb.m.v_prv[dxb.m.p0i] = dxb.m.np;
    dxb.m.v_nxt[dxb.m.p0i] = dxb.m.np;
    dxb.m.tot_q = 0.0; dxb.m.tot_pq = 0.0;
    dxb.m.p_wi = dxb.m.np; dxb.m.nocc = 0;
    dxb.m.p0i = dxb.m.np;
    for (ik=0;ik<ocs.v_1ls.length;ik++) {
      for (ir=0;ir < dxb.vr.length;ir++) { 
        ocs.v_1ls[ik].vr_csumq[ir] = dxb.vr[ir].tot_q;
        ocs.v_1ls[ik].vr_csumpq[ir] = dxb.vr[ir].tot_pq;
        ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
        ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
      }
      ocs.v_1ls[ik].m_csumq = 0.0;
      ocs.v_1ls[ik].m_csumpq = 0.0;
      ocs.v_1ls[ik].m_worstpi = dxb.m.np;
      ocs.v_1ls[ik].m_nocc = 0;
      ocs.v_1ls[ik].crit_pi = 0;
    }
    return(20030);
}

const TotalCurrentState_delete_market_best_price_exp_decay = function(xb, bs01) {
    if (((bs01===0) ? this.b.kalgo : this.s.kalgo) != Kalgo.ExpDecay) {
      console.log("Hey, how the heck did this get called delete_market_best_price_exp_decay," + 
        " but this.b.kalgo=" + this.b.kalgo + " or " + str_kalgo(this.b.kalgo));
      return(-10);
    }
    const ocs = (bs01 == 0) ? this.b : this.s;
    let ik = 0; let ir = 0; const np = xb.b.v_p.length;
    const dxb = (bs01 == 0) ? xb.b : xb.s;

    const oldp0i = dxb.m.p0i; const newp0i = dxb.m.v_nxt[oldp0i];
    if (newp0i >= dxb.m.np) {
      // In this case, Market had no quantities at all, there are no criterions yet
      // Determinable, unlikely most are made.  Registrants converted from (All Quantty)
      // Nothing should be required after we do this right.
      return this.completely_kill_market(xb, bs01);
    }
    dxb.m.v_prv[newp0i] = dxb.m.np;
    dxb.m.tot_q -= dxb.m.v_q[oldp0i];
    dxb.m.tot_pq -= dxb.m.v_q[oldp0i] * dxb.m.v_p[oldp0i];
    dxb.m.nocc -= 1;
    dxb.m.v_nxt[oldp0i] = dxb.m.np;
    dxb.m.p0i = newp0i;
    const oldq = dxb.m.v_q[oldp0i];
    const oldpq = dxb.m.v_q[oldp0i] * dxb.m.v_p[oldp0i];
    dxb.m.v_q[oldp0i] = 0.0;
    let irw = 0; let ex_factor = 0.0;
    let ttldq; let ttldpq;
    let ttlq; let ttlpq; let onrpi = 0;
    for (ik=0;ik<ocs.v_1ls.length;ik++) {
      exp_factor = Math.exp(Math.abs(ocs.v_1ls[ik].fd * ( dxb.m.v_p[oldp0i] - dxb.m.v_p[newp0i])));
      if (exp_factor > 2.0) {
        // Expansion can result in numerical Errors, here we stop at doubling?
        ocs.ewrite_ik_best_price_exp_decay(dxb, ik);
        irw += 1;
      } else {
        let lbd = ocs.v_1ls[ik].fd;
        for (ir=0;ir<dxb.vr.length;ir++) {
          ir = ir;
          ttlq = 0.0; 
          ttlpq = 0.0; 
          onrpi = dxb.vr[ir].p0i;  
          // old R sum = sum q[R > oldp0i] + sum q[r > new[0i] * decayold[t] + sum decaynew[t] * decay[new-oldt] * q[r <= oldp0i] 
          // new R sum = 
          while (( onrpi < dxb.m.np) && (onrpi >= oldp0i)) {
            ttlq += dxb.vr[ir].v_q[onrpi];
            ttlpq += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
            onrpi = dxb.vr[ir].v_nxt[onrpi]; 
          }
          tldq = ttlq;
          ttldpq = ttlpq;
          while ((onrpi < dxb.m.np) && (onrpi >= newp0i)) {
            ttlq += dxb.vr[ir].v_q[onrpi] * (-lbd *(dxb.m.v_p[oldp0i]-dxb.vr[ir].v_p[onrpi]).abs()).exp();
            ttlpq += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi] * 
              (-lbd * (dxb.m.v_p[oldp0i] - dxb.vr[ir].v_p[onrpi]).abs()).exp();
            ttldq += dxb.vr[ir].v_q[onrpi];
            ttldpq += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
            onrpi = dxb.vr[ir].v_nxt[onrpi]; 
          }
          // Yeah, this calculation seems very risky but here we are.
          ocs.v_1ls[ik].vr_csumq[ir] = ttldq + exp_factor * 
             ( ocs.v_1ls[ik].vr_csumq[ir] - ttlq );
          ocs.v_1ls[ik].vr_csumpq[ir] = ttldpq + exp_factor * 
             ( ocs.v_1ls[ik].vr_csumpq[ir] - ttlpq );
          ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
          ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
        }
        ocs.v_1ls[ik].m_csumq = exp_factor * ( ocs.v_1ls[ik].m_csumq - oldq);
        ocs.v_1ls[ik].m_csumpq = exp_factor * ( ocs.v_1ls[ik].m_csumpq - oldpq);
        ocs.v_1ls[ik].m_nocc = dxb.m.nocc;
        ocs.v_1ls[ik].m_worstpi = dxb.m.p_wi;
      }
    }
    return(7700 + irw);
}


const TotalCurrentState_rewrite_best_price_exp_decay = function(xb, bs01) {
    const ocs = (bs01 == 0) ? this.b : this.s;
    const nk = this.nk;
    let ik = 0; let ir = 0; let decay_f = 1.0; 
    const dxb = (bs01 == 0) ? xb.b : xb.s; let lbd = 0;
    const nr = dxb.vr.length; const np = (bs01 === 0) ? xb.b.m.np : xb.s.m.np; 
    console.log("--- THEORY, I don't think we call this!!!! TCS rewrite_best_price_exp_decay, bs01 supplied is " + bs01);
    console.log("---\n---\\n---\n---");
    //console.log(" escaping to debugger.");
    //debugger;
    if (dxb.m.p0i >= np) {
      for (ik=0;ik<ocs.v_1ls.length;ik++) {
        for (ir=0;ir<nr;ir++) {
          ocs.v_1ls[ik].vr_csumq[ir] = dxb.vr[ir].tot_q;
          ocs.v_1ls[ik].vr_csumq[ir] = dxb.vr[ir].tot_pq;
          ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
          ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
        }
      }
      return(300032);
    }
    if (dxb.vr.length <= 0) {
      return(230323);
    }

    for (ir=0;ir<nr;ir++)  {
      ocs.v_1ls[0].vr_csumq[ir] = 0.0;
      ocs.v_1ls[0].vr_csumpq[ir] = 0.0;
      ocs.v_1ls[0].vr_nocc[ir] = 0;
      let onrpi = dxb.vr[ir].p0i;
      while ((onrpi < np) && (onrpi >= dxb.m.p0i)) {
        ocs.v_1ls[0].vr_csumq[ir] += dxb.vr[ir].v_q[onrpi];
        ocs.v_1ls[0].vr_csumpq[ir] += dxb.vr[ir].v_q[onrpi] *
                                         dxb.vr[ir].v_p[onrpi];        
        ocs.v_1ls[0].vr_nocc[ir] +=1;
        ocs.v_1ls[0].vr_worstpi[ir] = onrpi;
        onrpi = dxb.vr[ir].v_nxt[onrpi];
      }
      if (ocs.v_1ls.length > 1) {
        for (ik=1;ik<nk;ik++) {
          ocs.v_1ls[ik].vr_csumq[ir] = ocs.v_1ls[ik].vr_csumq[0];   
          ocs.v_1ls[ik].vr_csumpq[ir] = ocs.v_1ls[ik].vr_csumpq[0];   
          ocs.v_1ls[ik].vr_nocc[ir] = ocs.v_1ls[ik].vr_nocc[0];   
          ocs.v_1ls[ik].vr_worstpi[ir] = ocs.v_1ls[ik].vr_worstpi[0];   
        }
      }
      while (onrpi < np) {
        for (ik=0;ik<nk;ik++) {
          const lbd = ocs.v_1ls[ik].fd;
          const decay_f = Math.exp(-lbd * Math.abs(dxb.m.v_p[dxb.m.p0i] - dxb.m.v_p[onrpi])); 
          ocs.v_1ls[ik].vr_csumq[ir] += decay_f * dxb.vr[ir].v_q[onrpi];
          ocs.v_1ls[ik].vr_csumpq[ir] += decay_f * dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi];
          ocs.v_1ls[ik].vr_nocc[ir] += 1;
          ocs.v_1ls[ik].vr_worstpi[ir] = onrpi;
        }
        onrpi = (dxb.vr[ir].v_nxt[onrpi] >= onrpi) ? np : dxb.vr[ir].v_nxt[onrpi];
      }
    }
    let onmpi = dxb.m.p0i;
    for (ik=0;ik<nk;ik++) {
      ocs.v_1ls[ik].m_csumq = dxb.m.v_q[onmpi]; 
      ocs.v_1ls[ik].m_csumpq = dxb.m.v_q[onmpi]*dxb.m.v_p[onmpi]; 
      ocs.v_1ls[ik].m_nocc = 1;
      ocs.v_1ls[ik].m_worstpi = onmpi;
    }
    onmpi = dxb.m.v_nxt[onmpi];
    while ((onmpi < np) && (onmpi >= 0)) {
      for (ik=0;ik<nk;ik++) {
        const lbd = ocs.v_1ls[ik].fd;
        const decay_f = Math.exp(-lbd* Math.abs(dxb.m.v_p[dxb.m.p0i] - dxb.m.v_p[onmpi]));
        ocs.v_1ls[ik].m_csumq += dxb.m.v_q[onmpi] * decay_f;
        ocs.v_1ls[ik].m_csumpq += dxb.m.v_q[onmpi] * dxb.m.v_p[onmpi] * decay_f;
        ocs.v_1ls[ik].m_nocc += 1;
        ocs.v_1ls[ik].m_worstpi = onmpi;
      }
      onmpi = dxb.m.v_nxt[onmpi];
    }
    // We win but we got it!!!! 
    return(304032);
}

const TotalCurrentState_rewrite_ik_best_price_exp_decay = function(xb, bs01, ik) {
    const ocs = (bs01 == 0) ? this.b : this.s;
    let ir = 0; const np = xb.b.m.np;  let onrpi = 0;
    const dxb = (bs01 == 0) ? xb.b : xb.s; let lbd = 0;
    const nr = dxb.vr.length; let dcay = 1.0; let onmpi = dxb.m.p0i;
    if (dxb.m.p0i >= np) {
      for (ir in 0..dxb.vr.length) {
          ocs.v_1ls[ik].vr_csumq[ir] = dxb.vr[ir].tot_q;
          ocs.v_1ls[ik].vr_csumpq[ir] = dxb.vr[ir].tot_pq;
          ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
          ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
      }
      return(300032);
    }
    const bpi = dxb.m.p0i;
    let bp = dxb.m.v_p[bpi];
    let nlbd = (-1.0) * ocs.v_1ls[ik].fd;
    ocs.v_1ls[ik].m_csumq = dxb.m.v_q[onmpi]; 
    ocs.v_1ls[ik].m_csumpq = dxb.m.v_q[onmpi] * bp;
    ocs.v_1ls[ik].m_nocc = dxb.m.nocc; ocs.v_1ls[ik].m_worstpi = dxb.m.p_wi;
    onmpi = dxb.m.v_nxt[onmpi];
    while (onmpi < np) {
      dcay = Math.exp(nlbd * Math.abs( bp - dxb.m.v_p[onmpi]));
      ocs.v_1ls[ik].m_csumq += dcay * dxb.m.v_q[onmpi];
      ocs.v_1ls[ik].m_csumpq += dcay * dxb.m.v_q[onmpi] * dxb.m.v_p[onmpi];
      onmpi = dxb.m.v_nxt[onmpi];
    }
    ocs.v_1ls[ik].m_nocc = dxb.m.nocc;
    ocs.v_1ls[ik].m_worstpi = dxb.m.p_wi;
    if (dxb.vr.length <= 0) {
      return(230323);
    }
    // Lets refresh everything to start before lambda configures
    for (ir=0;ir<dxb.vr.length;ir++) {
      ocs.v_1ls[ik].vr_csumq[ir] = 0.0;
      ocs.v_1ls[ik].vr_csumpq[ir] = 0.0;
      onrpi = dxb.vr[ir].p0i;
      while ((onrpi < dxb.m.np) && (onrpi >= dxb.m.p0i)) {
        ocs.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[onrpi];
        ocs.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[onrpi] *
                                         dxb.vr[ir].v_p[onrpi];        
        onrpi = dxb.vr[ir].v_nxt[onrpi];
      }
    }
    lbd = ocs.v_1ls[ik].fd;
    for (ir=0;ir<dxb.vr.length;ir++) {
      if (dxb.vr[ir].nocc == 0) {
      } else {
        onrpi = ocs.v_1ls[ik].vr_worstpi[ir]; 
        while ((onrpi < np) && (onrpi < dxb.m.p0i)) {
          dcay = Math.exp(-1.0*Math.abs(lbd * (bp - dxb.m.v_p[onrpi]))); 
          ocs.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[onrpi] * dcay;
          ocs.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi] * dcay;
          onrpi = dxb.vr[ir].v_prv[onrpi];
        }
        ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
        ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
      }
    }
    // We win but we got it!!!! 
    return(304032);
  }


const OneSideState_rewrite_ik_best_price_exp_decay = function(dxb, ik) {
    let ocs = this;  let ir=0; let onmpi = 0; let onrpi = 0;
    const np = dxb.m.np; let decay_f = 0.0;
    const bs01 = dxb.bs01;
    if (dxb.m.p0i >= np) {
      for (ir =0; ir < nr; ir++) {
        ocs.v_1ls[ik].vr_csumq[ir] = dxb.vr[ir].tot_q;
        ocs.v_1ls[ik].vr_csumpq[ir] = dxb.vr[ir].tot_pq;
        ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
        ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
      }
      return(300032);
    }
    const nlbd = (-1.0) * ocs.v_1ls[ik].fd;
    const bpi = dxb.m.p0i;
    const bp = dxb.m.v_p[bpi];
    let dcay = 1.0;
    ocs.v_1ls[ik].m_csumq = dxb.m.v_q[bpi];
    ocs.v_1ls[ik].m_csumpq = dxb.m.v_q[bpi] * bp;
    onmpi = dxb.m.v_nxt[bpi];
    while (onmpi < np) {
      dcay = Math.exp(nlbd * Math.abs( bp - dxb.m.v_p[onmpi])); 
      ocs.v_1ls[ik].m_csumq += dxb.m.v_q[onmpi] * dcay;
      ocs.v_1ls[ik].m_csumpq += dxb.m.v_q[onmpi] * dxb.m.v_p[onmpi] * dcay;
      onmpi = dxb.m.v_nxt[onmpi];
    }
    ocs.v_1ls[ik].m_nocc = dxb.m.nocc;
    ocs.v_1ls[ik].m_worstpi = dxb.m.p_wi;
    if (dxb.vr.length <= 0) {
      return(230323);
    }
    // Lets refresh everything to start before lambda configures
    for (ir=0;ir < nr;ir++)  {
      ocs.v_1ls[ik].vr_csumq[ir] = 0.0;
      ocs.v_1ls[ik].vr_csumpq[ir] = 0.0;
      onrpi = dxb.vr[ir].p0i;
      while ((onrpi < dxb.m.np) && (onrpi >= dxb.m.p0i)) {
        ocs.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[onrpi];
        ocs.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[onrpi] *
                                          dxb.vr[ir].v_p[onrpi];        
        onrpi = dxb.vr[ir].v_nxt[onrpi];
      }
    }
    for (ir=0;ir<nr;ir++) {
      if (dxb.vr[ir].nocc == 0) {
      } else {
        onrpi = dxb.vr[ir].p_wi;
        while ((onrpi < dxb.m.np) && (onrpi < dxb.m.p0i))  {
          dcay = Math.exp(nlbd * Math.abs((bp - dxb.m.v_p[onrpi]))); 
          ocs.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[onrpi] * dcay;
          ocs.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi] * dcay;
          onrpi = dxb.vr[ir].v_prv[onrpi];
        }
        ocs.v_1ls[ik].vr_nocc[ir] = dxb.vr[ir].nocc;
        ocs.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].p_wi;
      }
    }
    // We win but we got it!!!! 
    return(304032);
}

export {
  TotalCurrentState_delete_market_best_price,
  TotalCurrentState_completely_kill_market,
  TotalCurrentState_delete_market_best_price_exp_decay,
  TotalCurrentState_rewrite_best_price_exp_decay,
  TotalCurrentState_rewrite_ik_best_price_exp_decay,
  OneSideState_rewrite_ik_best_price_exp_decay
  
};
