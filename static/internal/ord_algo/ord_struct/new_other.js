//  new_other.js
//
//   Alan Lenarcic 2026-07-05
//
// If a new price level is being filled, but it is not a "best price", we will have to both insert the price into
//   a market list while determine whether it modifies totals.  For NumAll or MultipleSpread or Exponential it
//   will not change the critical price (crit_pi) and cause a move, but it might change quantities if the new
//   price level is already in range. 
import { MarketExchangeBook, TotalCurrentState, OneSideState, OneSideCombinedBook, Kalgo, str_kalgo, make_print_n} from "../ord_struct.js";
const TotalCurrentState_new_market_other_price = function(xb, bs01, new_pi, new_q) {
  // xb: MarketExchangeBook input
  // bs01: buy=0,sell=1,
  // new_pi: index of new price
  // new_q: new quantity to go into the price
  const nk = this.nk; let ik;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s;
  const np = dxb.m.np;
  const kalgo = ocs.kalgo;
  if ((new_pi < 0) || (new_pi >= np)) {
    console.log("ERROR new_market_other_price(" + ((bs01==0) ? "b" :"s") + 
     ", error because new_pi=" + new_pi + ", np=" + np);
    return(-5030);
  }
  const stt = ("new_market_other_price(" + str_kalgo(kalgo) + "," + ((bs01==0) ? "b" : "s") + 
    ",p0i=" + dxb.m.p0i + ":\$" + dxb.m.v_p[dxb.m.p0i] + 
    ",npi=" + new_pi + ":\$" + dxb.m.v_p[new_pi] + "): ");
  if (dxb.m.v_q[new_pi] > 0.0) {
    console.log(stt +"new_market_other_price: issue, quantity at new_pi=" + 
      new_pi + "/" + np + " already non zero!");
    return(-5031);
  }
  if (dxb.m.p0i >= np) {
    console.log(stt +" ISSUE p0i=" + p0i + ", np=" + np + ", but you said other with new_pi=" + new_pi + ".");
    return(-3233);
  }
  if (dxb.m.p_wi >= np) {
    console.log(stt +": ISSUE m.p_wi =" + dxb.m.p_qi + ", why?");
    return(-3432);
  }
  if (dxb.m.v_q[new_pi] > 0.0) {
    console.log(stt +"new_market_other_price --- p_wi=" + dxb.m.p_wi + 
       " but quantity at " + new_pi + " is already " + dxb.m.v_q[new_pi] + ". ");
    return(-34563);
  }
  const nr = dxb.vr.length;
  let above_pi = np;
  let below_pi = np;
  if ((new_pi == 0) || (dxb.m.p_wi > new_pi)) {
    above_pi = dxb.m.p_wi;
  } else if ((new_pi - dxb.m.p_wi) > (dxb.m.p0i - new_pi)) {
    above_pi = new_pi + 1; 
    // Faster to search empties as when saturated is more common
    while ((dxb.m.v_q[above_pi] == 0.0) && (above_pi < np)) {
      above_pi += 1;
    }
    if (above_pi < np) {
      below_pi = dxb.m.v_nxt[above_pi];
    }
  } else { 
    below_pi = new_pi - 1; 
    // Faster to search empties as when saturated is more common
    while ((below_pi > 0) && (dxb.m.v_q[below_pi] == 0.0)) {
      below_pi -= 1;
    }
    if ((below_pi < np) && (dxb.m.v_q[below_pi] > 0.0)) {
      above_pi = dxb.m.v_prv[below_pi];
    } else {
      below_pi = np;
    }
  }
  if (above_pi >= dxb.m.np) {
    console.log(stt +" ERROR  above_pi = " + above_pi + ".");
    console.log(stt +" ERROR, should not call if we cannot find above_pi.");
    return(-302);
  }
  if ((above_pi >= dxb.m.np) && (below_pi >= np)) {
    dxb.m.p_wi = new_pi;
  } else if (below_pi >= np) {
    // We are deleting market worst apparently
    dxb.m.v_nxt[above_pi] = new_pi;
    dxb.m.p_wi = new_pi;
  } else {
    dxb.m.v_nxt[above_pi] = new_pi;
    dxb.m.v_prv[below_pi] = new_pi;
  }
  dxb.m.tot_q += new_q;
  dxb.m.tot_pq += new_q * dxb.m.v_p[new_pi];
  dxb.m.nocc += 1;
  dxb.m.v_prv[new_pi] = above_pi;
  dxb.m.v_nxt[new_pi] = below_pi; 
  dxb.m.v_q[new_pi] = new_q;

  let nlbd = 0.0; let dcay = 1.0;
  if (kalgo === Kalgo.ExpDecay) {
    //Actually in this case exponential decay is quite easy can do this here
    // DONT NEED-- self.delete_market_best_other_price_exp_decay(&self, &xb, sdbs, del_pi);
    //  DO IT LIVE
    for (ik=0;ik<nk;ik++) {
      nlbd = (-1.0) *  ocs.v_1ls[ik].fd;
      dcay =  Math.exp(nlbd * Math.abs((dxb.m.v_p[dxb.m.p0i] - dxb.m.v_p[new_pi])));
      ocs.v_1ls[ik].m_csumq += new_q * dcay; 
      ocs.v_1ls[ik].m_csumpq += new_q * dxb.m.v_p[new_pi] * dcay; 
      ocs.v_1ls[ik].m_nocc = dxb.m.nocc;
      if (ocs.v_1ls[ik].m_worstpi == above_pi) {
          ocs.v_1ls[ik].m_worstpi = new_pi; 
      }
    }
    return(30042);
  }
  // Regardless of kalgo, we add quantity to values lists if within current window
  for (ik=0;ik<nk;ik++) {
    if (ocs.v_1ls[ik].crit_pi <= new_pi) {
      ocs.v_1ls[ik].m_csumq += new_q;
      ocs.v_1ls[ik].m_csumpq += new_q * dxb.m.v_p[new_pi];
      ocs.v_1ls[ik].m_nocc += 1;
      if (ocs.v_1ls[ik].m_worstpi == above_pi) {
        ocs.v_1ls[ik].m_worstpi = new_pi;
      }
    }
  }
  if ([Kalgo.NumAll,Kalgo.NumPennies,Kalgo.PctDepth,Kalgo.MultipleSpread].includes(kalgo)) {
    // Early return no more work to do.
    return(50043);
  }
  let nupd = 0; let old_crit=-1.0; let crit_mpi = -1.0;
  if (!([Kalgo.NumFilled,Kalgo.NumShares,Kalgo.TotalDollars].includes(kalgo))) {
    console.log(stt + "ERROR at stage we have kalgo = " + str_kalgo(kalgo) + ", but that is not NF/NS/TD");
    return(-304032);
  }
  for (ik=0;ik<nk;ik++) {
    const old_crit = ocs.v_1ls[ik].crit_pi;
    const crit_pi = ( (kalgo === Kalgo.NumFilled) ? ocs.crit_move_in_num_filled(dxb,ik) :
                (kalgo === Kalgo.NumShares) ? ocs.crit_move_in_num_shares(dxb,ik) :
                (kalgo === Kalgo.TotalDollars) ? ocs.crit_move_in_total_dollars(dxb,ik) :
                -1.0);

    if ((crit_pi < np) && (old_crit < crit_pi)) {
      nupd += 1;
      ocs.v_1ls[ik].move_in_to_crit(xb, crit_pi, bs01, ik);
    }
  }
  if ((ocs.m_wworstpi <= new_pi) && (kalgo === Kalgo.NumFilled)) {
    ocs.fresh_w_all_window(dxb);
  }
  return(54000 + nupd);
}

export {
  TotalCurrentState_new_market_other_price
}
