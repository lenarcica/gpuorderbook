// del_other.js
//
//   Alan Lenarcic
//   2026-07-05
//   Code to deal with
//
//
// Note only limited set is affected
//
// use crate::ord_struct::crit_upd::{crit_move_out_num_filled, crit_move_out_num_shares,
//               crit_move_out_total_dollars
//               };

// Methodology: create a "new_market_kalgo_best_price"
//   It will call appropriate crit_move_in after updating new price quantity.
//
import { MarketExchangeBook, TotalCurrentState, OneSideState, OneSideCombinedBook, Kalgo, str_kalgo } from "../ord_struct.js";
const TotalCurrentState_delete_market_other_price = function(xb, bs01, del_pi) {
  // xb -- MarketExchangeBook
  // bs01 buy=0,sell=1
  // del_pi - index of deletable price
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ? 0.0 :
                   ((xb.s.m.v_p[xb.s.m.p0i] < xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i])) );
  let ik = 0;
  const nk = this.nk 
  const ocs = (bs01==0) ? this.b : this.s; 
  const dxb = (bs01==0) ? xb.b : xb.s;
  const kalgo = ocs.kalgo;
  const np = dxb.m.np;
  const stt = "delete_market_other_price(" + str_kalgo(kalgo) + ",bs01=" + bs01 + ",np=" + np + ",dpi=" + del_pi + "): ";
  if (del_pi >= np) {
    console.log(stt + " issue del_pi given = " + del_pi + ", np=" + dxb.m.np + ". \n");
    return(-5030);
  }
  if (dxb.m.v_q[del_pi] <= 0.0) {
    console.log(stt + " issue, quantity at del_pi=" + del_pi + " already zero!");
    return(-5031);
  }
  const above_pi = dxb.m.v_prv[del_pi];
  const below_pi = dxb.m.v_nxt[del_pi];
  const old_q = dxb.m.v_q[del_pi];
  if (below_pi >= dxb.m.np) {
    // We are deleting market worst apparently
    dxb.m.v_nxt[above_pi] = dxb.m.np;
    dxb.m.p_wi = above_pi;
  } else {
    dxb.m.v_nxt[above_pi] = below_pi;
    dxb.m.v_prv[below_pi] = above_pi;
  }
  dxb.m.tot_q -= old_q;
  dxb.m.tot_pq -= old_q * dxb.m.v_p[del_pi];
  dxb.m.nocc -= 1;
  dxb.m.v_prv[del_pi] = dxb.m.np;
  dxb.m.v_nxt[del_pi] = dxb.m.np;
  dxb.m.v_q[del_pi] = 0.0;

  let nlbd = 0.0; let dcay = 0.0;
  if (kalgo === Kalgo.ExpDecay)  {
    //Actually in this case exponential decay is quite easy can do this here
    // DONT NEED-- self.delete_market_best_other_price_exp_decay(&self, &xb, sdbs, del_pi);
    //  DO IT LIVE
    for (ik=0;ik<nk;ik++) {
      nlbd = (-1.0) * ocs.v_1ls[ik].fd; 
      dcay =  Math.exp(nlbd * Math.abs((dxb.m.v_p[dxb.m.p0i] - dxb.m.v_p[del_pi])));
      ocs.v_1ls[ik].m_csumq -= old_q * dcay; 
      ocs.v_1ls[ik].m_csumpq -= old_q * dxb.m.v_p[del_pi] * dcay; 
      ocs.v_1ls[ik].m_nocc -= 1;
      if (ocs.v_1ls[ik].m_worstpi == del_pi) {
           ocs.v_1ls[ik].m_worstpi = dxb.m.p_wi;
      }
    }
    return(30042);
  }
   
  // Regardless of kalgo, we delete quantity from values lists
  for (ik=0;ik<nk;ik++) {
      if (ocs.v_1ls[ik].crit_pi <= del_pi) {
        ocs.v_1ls[ik].m_csumq -= old_q; 
        ocs.v_1ls[ik].m_csumpq -= old_q * dxb.m.v_p[del_pi];
        ocs.v_1ls[ik].m_nocc -= 1;
        if (ocs.v_1ls[ik].m_worstpi == del_pi) {
           ocs.v_1ls[ik].m_worstpi = above_pi;
        }
      }
  }
  if ([Kalgo.NumAll, Kalgo.MultipleSpread,Kalgo.PctDepth,Kalgo.ExpDecay, Kalgo.NumPennies].includes(kalgo)) {
    // Nothing left to do in this case, but others will be harder.
    return(30043);
  }
  for (ik=0;ik<nk;ik++) {
    if (ocs.v_1ls[ik].crit_pi > del_pi) {
      // Still no work in this case!
    } else {
      const crit_mpi = ( (kalgo === Kalgo.NumFilled) ? ocs.crit_move_out_num_filled(dxb,ik) : 
                   (kalgo === Kalgo.NumShares) ? ocs.crit_move_out_num_shares(dxb,ik) :
                   (kalgo === Kalgo.TotalDollars) ? ocs.crit_move_out_total_dollars(dxb,ik) :
                   np );
      if (crit_mpi >= np) {
        if ([Kalgo.NumFilled,Kalgo.NumShares, Kalgo.TotalDollars].includes(kalgo)) {
        }  else {
          console.log(stt + " Error we got crit_mpi and should not have been here for this algo. = " + kalgo + ":" + str_kalgo(kalgo));
        }
      } else {
        ocs.v_1ls[ik].move_out_to_crit(xb, crit_mpi, bs01, ik);
        ocs.v_1ls[ik].crit_pi = crit_mpi;
      }
    }
    if ((ocs.m_wworstpi <= del_pi) && (ocs.kalgo === Kalgo.NumFilled)) {
      // weight window worked
      ocs.fresh_w_all_window(dxb);
    }
  }
  return(1034);
}

export {
  TotalCurrentState_delete_market_other_price
}
