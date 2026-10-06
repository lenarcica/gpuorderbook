// mod_qty.js
//
//   Alan Lenarcic 2026-07-05
//
// On a modification of quantity, spreads, filled levels and best bid won't change, but depending
//   on modification a critical move in or out can occur.
// Methodology: create a "new_market_best_price_$kgo"
//   It will call appropriate crit_move_in after updating new price quantity.
import { MarketExchangeBook, TotalCurrentState, OneSideState, OneSideCombinedBook, Kalgo, str_kalgo} from "../ord_struct.js";
const TotalCurrentState_mod_qty_at_price = function(xb, bs01, mod_pi, mod_q) {
  // xb: MarketExchangeBook
  // bs01: Buy 0 or Sell 1 indicator
  // mod_pi: Price Index of modified quantity
  // mod_q: Quantity to modify to.
  const nk = this.nk; let ik;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s;
  const np = dxb.m.np;
  const kalgo = ocs.kalgo;
  if (mod_pi >= np) {
    console.log("mod_qty_at_price(" + str_kalgo(kalgo) + "): ERROR bs01=" + bs01 + ", with mod_pi=" + mod_pi + 
      " but np only = " + np);
    return(-5030);
  }
  const stt = ("mod_qty_at_price(" + str_kalgo(kalgo) + "," + ((bs01==0) ? "b" : "s") + 
               ",mpi=" + mod_pi + ":\$" + dxb.m.v_p[mod_pi] + "," + 
               dxb.m.v_q[mod_pi] + " to " + mod_q + "): ");
  if (dxb.m.v_q[mod_pi] <= 0.0) {
     console.log(stt + "ERROR ISSUE:  quantity at mod_pi=" + mod_pi + " already zero!");
     return(-5031);
  }
  const old_q = dxb.m.v_q[mod_pi];
  dxb.m.tot_q += mod_q - old_q;
  dxb.m.tot_pq += (mod_q - old_q) * dxb.m.v_p[mod_pi];
  dxb.m.v_q[mod_pi] = mod_q;

  let nlbd = 0.0; let dcay = 0.0;
  if (kalgo === Kalgo.ExpDecay) {
    //Actually in this case exponential decay is quite easy can do this here
    // DONT NEED-- self.delete_market_best_other_price_exp_decay(&self, &xb, sdbs, del_pi);
    //  DO IT LIVE
    for (ik=0;ik<nk;ik++) {
         nlbd = (-1.0 ) * ocs.v_1ls[ik].fd;
         dcay =  Math.exp(nlbd * Math.abs((dxb.m.v_p[dxb.m.p0i] - dxb.m.v_p[mod_pi])));
         ocs.v_1ls[ik].m_csumq += (mod_q-old_q) * dcay; 
         ocs.v_1ls[ik].m_csumpq += (mod_q-old_q) * dxb.m.v_p[mod_pi] * dcay; 
    }
    return(40042);
  }
   
  // Regardless of kalgo, we delete quantity from values lists
  for (ik=0;ik<nk;ik++) {
    if (ocs.v_1ls[ik].crit_pi <= mod_pi) {
      ocs.v_1ls[ik].m_csumq += mod_q - old_q;
      ocs.v_1ls[ik].m_csumpq += ((mod_q-old_q) * dxb.m.v_p[mod_pi]);
    }
  }
  if ([Kalgo.NumAll,Kalgo.NumPennies,Kalgo.PctDepth].includes(kalgo)) {
    // Nothing left to do in this case, but others will be harder.
    return(30043);
  }
  let crit_mpi;
  if (!([Kalgo.NumFilled,Kalgo.NumShares,Kalgo.TotalDollars].includes(kalgo))) {
    console.log(stt + " Error, kalgo is " + str_kalgo(kalgo) + ", but we are at only NF/NS/TD stage.");
    return(-30403);
  }
  let ihop = 0; let onmpi = -1;
  for (ik=0;ik<nk;ik++) {
    if (ocs.v_1ls[ik].m_worstpi > mod_pi) {
      // Still no work in this case!
    } else if (old_q > mod_q) {
      crit_mpi = ( (kalgo === Kalgo.NumFilled) ? ocs.crit_move_out_num_filled(dxb,ik) :
                   (kalgo === Kalgo.NumShares) ? ocs.crit_move_out_num_shares(dxb,ik) :
                   (kalgo === Kalgo.TotalDollars) ? ocs.crit_move_out_total_dollars(dxb,ik) :
                   -1);
      ocs.v_1ls[ik].move_out_to_crit(xb, crit_mpi, bs01, ik);
    } else {
      crit_mpi = ( (kalgo === Kalgo.NumFilled) ? ocs.crit_move_in_num_filled(dxb,ik) :
                   (kalgo === Kalgo.NumShares) ? ocs.crit_move_in_num_shares(dxb,ik) :
                   (kalgo === Kalgo.TotalDollars) ? ocs.crit_move_in_total_dollars(dxb,ik) :
                   -1);
      ocs.v_1ls[ik].move_in_to_crit(xb, crit_mpi, bs01, ik);
    }
  }
  if ((ocs.m_wworstpi <= mod_pi) && (kalgo == Kalgo.NumFilled)) {
    // Weights in this case just modify quantity
    ihop = 0; onmpi = dxb.m.p0i;
    while (onmpi > mod_pi) {
        onmpi = dxb.m.v_nxt[onmpi]; ihop += 1;
    }
    ocs.m_wsumq += (mod_q - old_q) * ocs.v_w[ihop];
  }
  return(30064);
}

export {
  TotalCurrentState_mod_qty_at_price
}
