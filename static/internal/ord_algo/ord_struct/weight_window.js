/// weight_window.js
///
///   Javscript conversion of Rust Code
///   Alan Lenarcic 2026-07-70
///
///  Functions related to weight window information.  If user specifies weights to a differnt length we
///   will do a small calculation weight levels away.
///
/// 
///
///
///
import { MarketExchangeBook, TotalCurrentState, OneSideState, OneSideCombinedBook, Kalgo, str_kalgo} from "../ord_struct.js";


const TotalCurrentState_fresh_w_window_calc = function(xb, bs01, ir)  {
  // xb: MarketExchangeBook input
  // bs01: buy=0,sell=1,
  // ir: index of related exchange. 
  const nk = this.nk; let ik = 0;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s;
  const np = dxb.m.np;  const kalgo = this.b.kalgo;
  let onmwpi = 0; let onrwpi=0;
  const nr = dxb.vr.length;
  if (ir > nr) {
    console.log("weight_window.js->TotalCurrentState_fresh_w_window_calc: Error ir=" + ir + " but nr=" + dxb.vr.length);
    return(-503043);
    // Note ir==nr case is a market update request.
  }
  const stt = ("fresh_w_window_calc(" + str_kalgo(kalgo) + "," + ((bs01==0) ? "b" : "s") + 
    "ir="+ir + "/" + nr + "): "); 

  const p0i = dxb.m.p0i;
  const nw = ocs.nw; let iw = 0;

  let tgti = 0; 
  if (nr <= ir) {
    // Rewrite Market;
    ocs.m_wsumq = 0.0;
    if (kalgo === Kalgo.NumFilled) {
      onmwpi = p0i;
      for (iw=0;iw<nw;iw++) {
        ocs.m_wsumq += ocs.v_w[iw] * dxb.m.v_q[onmwpi];
        onmwpi = dxb.m.v_nxt[onmwpi];
        if (onmwpi >= dxb.m.np) {
          break;
        }
      }
      return(ocs.m_wsumq);
    } else {
      for (iw=0;iw<nw;iw++) {
         if (p0i - iw >= 0) {
           tgti = p0i - iw;
           ocs.m_wsumq += ocs.v_w[ii] * dxb.m.v_q[tgti];
         }
      }
      return(ocs.m_wsumq);
    }
    ocs.vr_wsumq[ir] = 0.0;
    if (kalgo === Kalgo.NumFilled) {
      onmwpi = p0i; onrwpi = dxb.vr[ir].p0i;
      for (iw=0;iw<nw;iw++) {
        while ((onrwpi < np) && (onrwpi >= onmwpi)) {
          ocs.vr_wsumq[ir] += ocs.v_w[ii] * dxb.vr[ir].v_q[onrwpi];
          onrwpi = dxb.vr[ir].v_nxt[onrwpi];
        }
        onmwpi = dxb.m.v_nxt[onmwpi];
        if ((iw < nw-1) && (onmwpi >= np)) {
           while (onrwpi < dxb.m.np) {
             ocs.vr_wsumq[ir] += ocs.v_w[(iw+1)] * dxb.vr[ir].v_q[onrwpi];
             onrwpi = dxb.vr[ir].v_nxt[onrwpi];
           }
           break;
        }
      }
      return(ocs.vr_wsumq[ir]);
    } else {
      //let mut onmwpi = dxb.m.p0i; let mut onrwpi = dxb.vr[ir].p0i;
      for (iw=0;iw<nw;iw++) {
        if (p0i - ii < 0) {
          break;
        } else {
          tgti = p0i - iw;
          ocs.vr_wsumq[ir] += ocs.v_w[iw] * dxb.vr[ir].v_q[ tgti ];
        }
      }
    }
  }
  return(ocs.vr_wsumq[ir]);
}

// This runs against all ir values the above.
const TotalCurrentState_fresh_w_all_window = function(xb, bs01) {
  const nr = (bs01==0) ? xb.b.vr.length : xb.s.vr.length;
  let ir = 0; let fcalc = 0.0;
  for (ir=0;ir<nr;ir++) {
    fcalc = this.fresh_w_window_calc(xb, bs01, ir);
  }
  fcalc = this.fresh_w_window_calc(xb, bs01, nr);
  return(10);
}


const OneSideState_fresh_w_all_window = function(dxb) {
  const nr = dxb.vr.length;
  let ir = 0; let fcalc = 0.0;
  for (ir=0;ir<nr;ir++) {
    fcalc = this.fresh_w_window_calc(dxb, ir);
  }
  fcalc = this.fresh_w_window_calc(dxb, nr);
  return(10);
}

// Updates to single quantities should not change windows too much, though
// the "non filled" incident can actually trigger a window shift.
// A difficulty exists for num_filled, because keeping track of which quantity counts as
// which is still a problem including the problem caused by the vr/related quantities
// can potentially have quantities positive where the market is empty.
//
const TotalCurrentState_upd_w_window = function(xb, bs01, newpi, newq, oldq, ir) {
  // xb: MarketExchangeBook input
  // bs01: buy=0,sell=1,
  // newpi: Price to update quantity
  // newq: New quantity in the location
  // oldq: Old quantity at this position
  // ir: index of related exchange. 
  const nk = this.nk; let ik = 0;
  const spread = ( ((xb.s.m.p0i >= xb.s.m.np) || (xb.b.m.p0i >= xb.b.m.np)) ?
                   0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] <= xb.b.m.v_p[xb.b.m.p0i]) ? 0.0 :
                   (xb.s.m.v_p[xb.s.m.p0i] - xb.b.m.v_p[xb.b.m.p0i]) );
  const ocs = (bs01 == 0) ? this.b : this.s;
  const dxb = (bs01 == 0) ? xb.b : xb.s;
  const np = dxb.m.np;  const kalgo = this.b.kalgo;
  let onmwpi = 0; let onrwpi=0;
  const nr = dxb.vr.length;
  if (ir > nr) {
    console.log("weight_window.js->TotalCurrentState_upd_w_window: Error ir=" + ir + " but nr=" + dxb.vr.length);
    return(-503043);
    // Note ir==nr case is a market update request.
  }
  const stt = ("fresh_w_window_calc(" + str_kalgo(kalgo) + "," + ((bs01==0) ? "b" : "s") + 
    ",ir="+ir + "/" + nr + "): "); 

  const p0i = dxb.m.p0i;
  const nw = ocs.nw; let iw = 0;

  let ihop, onpi;

  let fcalc = 0.0; let idx =0;
  if (nr <= ir) {
    // Rewrite Market;
    ocs.m_wsumq = 0.0;
    if (newq == oldq) { return 400; } // Nothing to do at all, should never see this

    if ( (kalgo === Kalgo.NumFilled) && (ir >= nr) && 
      ((newq == 0.0) && (oldq > 0.0)) || ((newq > 0.0) && (oldq == 0.0)) ) {
      // This is too hard, might as well wipe the whole floor and start again
      // since doing this involves shifting on average 50% data, both market and registrant
      //
      // Shouldn't really be called, or only called once.
      fcalc = this.fresh_w_window_calc(xb, bs01,ir);
      return(100);
    }
    if (newq == oldq) { return 400; } // Nothing to do at all
    if (ir >= nr) {
      if (kalgo === Kalgo.NumFilled) {
        ihop = 0; onpi = p0i;
        // This shouldn't be happening, we just should be changing a weighted column
        //if ((newq == 0.0) && (oldq > 0.0)) || ((newq > 0.0) && (oldq == 0.0)) {
        //  self.shift_w_window(xb, sdbs, newpi, newq, oldq, ir);
        //}
        while ((onpi < np) && (onpi > newpi)) {
          ihop +=1; onpi = dxb.m.v_nxt[onpi];
        }
        if ((oldq > 0.0) && (onpi != newpi)) {
          console.log(stt + "newpi=" + newpi + ", newq=" + newq + ", oldq=" + oldq + 
            ", but onpi=" + onpi + " after search?");
          return(-20);
        }
        if ((newq > 0.0) && (oldq > 0.0)) {
          ocs.m_wsumq += (newq-oldq) * ocs.v_w[ihop];
        } else {
          console.log(stt + ": Error: upd_w_window, newq=" + newq + ", oldq=" + oldq + 
            ", num_fixed, newpi=" + newpi + " Should not be here.");
        } 
      } else {
        // non num_filled, very easy.
        if (p0i - newpi >= nw) {
        } else {
          idx = (p0i - newpi);
          ocs.m_wsumq += (newq-oldq) * ocs.v_w[idx];
        }
        return(200);
      }
    }
  }
  if (kalgo === "NumFilled") {
    ihop = 0; onmpi = p0i;
    while ((onmpi < np) && (onmpi > newpi)) {
      onmpi = dxb.m.v_nxt[onmpi]; ihop +=1;
    }    
    ocs.vr_wsumq[ir] += (newq-oldq) * ocs.v_w[ihop];
  } else {
    idx = (p0i - newpi);
    if (idx < nw) {
      ocs.vr_wsumq[ir] += (newq-oldq) * ocs.v_w[idx];
    }
  }
  return(300);
}
const OneSideState_fresh_w_window_calc = function(dxb, ir) {
  const ocs = this;
  const nr = dxb.vr.length;
  const kalgo = ocs.kalgo;
  const p0i = dxb.m.p0i;
  const np = dxb.m.np;
  let iw=0; let onmwpi=0; let onrwpi=0;
  let tgti = 0;
  const nw = ocs.nw;
  if (nr <= ir) {
    // Rewrite Market;
    ocs.m_wsumq = 0.0;
    if (kalgo === Kalgo.NumFilled) {
        onmwpi = p0i;
        for (iw=0;iw<nw;iw++) {
          ocs.m_wsumq += ocs.v_w[iw] * dxb.m.v_q[onmwpi];
          onmwpi = dxb.m.v_nxt[onmwpi];
          if (onmwpi >= dxb.m.np) {
            break;
          }
        }
        return(ocs.m_wsumq);
      } else {
        for (iw=0;iw<nw;iw++) {
          if (p0i - iw >= 0) {
            tgti = p0i - iw;
            ocs.m_wsumq += ocs.v_w[iw] * dxb.m.v_q[tgti];
          }
        }
        return(ocs.m_wsumq);
      }
  }
  ocs.vr_wsumq[ir] = 0.0;
  if (kalgo === Kalgo.NumFilled) {
    onmwpi = p0i; onrwpi = dxb.vr[ir].p0i;
    for (iw=0;iw<nw;iw++) {
      while ((onrwpi < np) && (onrwpi >= onmwpi)) {
        ocs.vr_wsumq[ir] += ocs.v_w[iw] * dxb.vr[ir].v_q[onrwpi];
        onrwpi = dxb.vr[ir].v_nxt[onrwpi];
      }
      onmwpi = dxb.m.v_nxt[onmwpi];
      if ((iw < nw-1) && (onmwpi >= np)) {
        while (onrwpi < np) {
           ocs.vr_wsumq[ir] += ocs.v_w[(iw+1)] * dxb.vr[ir].v_q[onrwpi];
           onrwpi = dxb.vr[ir].v_nxt[onrwpi];
        }
        break;
      }
    }
    return(ocs.vr_wsumq[ir]);
  } else {
    for (iw=0;iw<nw;iw++) {
      if (p0i - iw < 0) {
        break;
      } else {
        tgti = p0i - iw;
        ocs.vr_wsumq[ir] += ocs.v_w[iw] * dxb.vr[ir].v_q[ tgti ];
      }
    }
  }
  return(ocs.vr_wsumq[ir]);
}

export {
  TotalCurrentState_fresh_w_window_calc,
  TotalCurrentState_fresh_w_all_window,
  TotalCurrentState_upd_w_window,
  OneSideState_fresh_w_window_calc,
  OneSideState_fresh_w_all_window
}
