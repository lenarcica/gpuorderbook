// extensions/crit_upd.js
//
// Here we copy from existing Rust library, removing some computational types
import { TotalCurrentState, OneSideState, OneLevelState, Kalgo, und_str_kalgo, str_kalgo } from '../ord_struct.js';
/*
const OneSideState_crit_move_out_num_filled = function(dxb, ik) {
   // dxb is type OneSideBook, this extension extens OneSideBook
   dcs = this;
   let onwp = dcs.v_1ls[ik].m_worstpi;
   const d= dcs.v_1ls[ik].d;
   let m_nocc = dcs.v_1ls[ik].m_nocc;
   const np = dxb.np;
   if (m_nocc == d) { return onwp; }
   while (((m_nocc < d) &&
     (onwp < np) && dxb.m.v_nxt[onwp] < np)) {
     onwp = dxb.m.v_nxt[onwp]; 
     //if dxb.m.v_q[onwp] <= 0.0 {
     //  println!("ERROR, crit_move_out_num_filled, we were sent to onwp ={} for ik={}, d={} but q is 0.0",
     //    onwp, ik, (*dcs).v_1ls[ik].d);
     // }
     m_nocc+=1;
   }
   if ((onwp == np) && (m_nocc < d)) {
     return(0);
   }
   if (m_nocc < d) {
     return(0);
   }
   if (m_nocc == d) { return(onwp); }
   while ((m_nocc > d) &&
     (onwp < np) && (dxb.m.v_prv[onwp] < np)) {
     onwp = dxb.m.v_prv[onwp]; m_nocc-=1;
   } 
   if (m_nocc == d) { return(onwp); }
   if (m_nocc < d) { return(0); }
   return(onwp); 
};
*/
const TotalCurrentState_crit_move_any = function(xb, bs01, ik, in0out1, kalgo) {
  const tp = (bs01 == 0) ? this.b : this.s; 
  const dxb = (bs01 == 0) ? xb.b : xb.s;
  if (in0out1 == 0) {
    switch (kalgo) {
      case Kalgo.NumAll :
        return(tp.crit_move_in_num_all(dxb,ik));
      case Kalgo.NumFilled :
        return(tp.crit_move_in_num_filled(dxb,ik));
      case Kalgo.NumShares :
        return(tp.crit_move_in_num_shares(dxb,ik));
      case Kalgo.NumPennies :
        return(tp.crit_move_in_num_pennies(dxb,ik));
      case Kalgo.TotalDollars :
        return(tp.crit_move_in_total_dollars(dxb,ik));
      case Kalgo.PctDepth :
        return(tp.crit_move_in_pct_depth(dxb,ik));
      case Kalgo.MultipleSpread :
        const sprd = (   ((xb.b.p0i >= 0) && (xb.s.p0i >= 0)) ?
                         (xb.b.v_p[xb.b.p0i] - xb.s.v_p[xb.s.p0i]) :
                         null);
        return(tp.crit_move_in_multiple_spread(sprd, dxb,ik));
      default :
        return(tp.crit_move_in_num_all(dxb,ik))
    }
  }
  switch (kalgo) {
      case Kalgo.NumAll :
        return(tp.crit_move_out_num_all(dxb,ik));
      case Kalgo.NumFilled :
        return(tp.crit_move_out_num_filled(dxb,ik));
      case Kalgo.NumShares :
        return(tp.crit_move_out_num_shares(dxb,ik));
      case Kalgo.NumPennies :
        return(tp.crit_move_out_num_pennies(dxb,ik));
      case Kalgo.TotalDollars :
        return(tp.crit_move_out_total_dollars(dxb,ik));
      case Kalgo.PctDepth :
        return(tp.crit_move_out_pct_depth(dxb,ik));
      case Kalgo.MultipleSpread :
        const sprd = (   ((xb.b.p0i >= 0) && (xb.s.p0i >= 0)) ?
                         (xb.b.v_p[xb.b.p0i] - xb.s.v_p[xb.s.p0i]) :
                         null);
        return(tp.crit_move_out_multiple_spread(sprd, dxb,ik));
      default :
        return(tp.crit_move_out_num_all(dxb,ik))
  }
}

const TotalCurrentState_crit_move_in = function(xb,bs01,ik,kalgo) {
  const tp = (bs01 == 0) ? this.b : this.s; 
  const dxb = (bs01 == 0) ? xb.b : xb.s;
  switch (kalgo) {
      case Kalgo.NumAll :
        return(tp.crit_move_in_num_all(dxb,ik));
      case Kalgo.NumFilled :
        return(tp.crit_move_in_num_filled(dxb,ik));
      case Kalgo.NumShares :
        return(tp.crit_move_in_num_shares(dxb,ik));
      case Kalgo.NumPennies :
        return(tp.crit_move_in_num_pennies(dxb,ik));
      case Kalgo.TotalDollars :
        return(tp.crit_move_in_total_dollars(dxb,ik));
      case Kalgo.PctDepth :
        return(tp.crit_move_in_pct_depth(dxb,ik));
      case Kalgo.MultipleSpread :
        const sprd = (   ((xb.b.p0i >= 0) && (xb.s.p0i >= 0)) ?
                         (xb.b.v_p[xb.b.p0i] - xb.s.v_p[xb.s.p0i]) :
                         null);
        return(tp.crit_move_in_multiple_spread(sprd, dxb,ik));
      default :
        return(tp.crit_move_in_num_all(dxb,ik))
  }
}
const TotalCurrentState_crit_move_out = function(xb,bs01,ik) {
  const tp = (bs01 == 0) ? this.b : this.s; 
  const dxb = (bs01 == 0) ? xb.b : xb.s;
  const kalgo = this.kalgo;
  //console.log("TCS_crit_move_out: called kalgo = " + str_kalgo(kalgo) + " ik=" + ik);
  //console.log("TotalCurrentState_crit_move_out: Called, what is going on?"); debugger;
  switch (kalgo) {
      case Kalgo.NumAll :
        return(tp.crit_move_out_num_all(dxb,ik));
      case Kalgo.NumFilled :
        return(tp.crit_move_out_num_filled(dxb,ik));
      case Kalgo.NumShares :
        return(tp.crit_move_out_num_shares(dxb,ik));
      case Kalgo.NumPennies :
        return(tp.crit_move_out_num_pennies(dxb,ik));
      case Kalgo.TotalDollars :
        return(tp.crit_move_out_total_dollars(dxb,ik));
      case Kalgo.PctDepth :
        return(tp.crit_move_out_pct_depth(dxb,ik));
      case Kalgo.MultipleSpread :
        const sprd = (   ((xb.b.p0i >= 0) && (xb.s.p0i >= 0)) ?
                         (xb.b.v_p[xb.b.p0i] - xb.s.v_p[xb.s.p0i]) :
                         null);
        return(tp.crit_move_out_multiple_spread(sprd,dxb,ik));
      default :
        return(tp.crit_move_out_num_all(dxb,ik))
  }
}
/// 
const OneSideState_crit_move_out_num_filled = function(dxb, ik) {
   //console.log("crit_move_out_num_filled called: ik=" + ik);
   const dcs = this;
   const np = dxb.np;
   let onwp = dcs.v_1ls[ik].m_worstpi;
   const d = dcs.v_1ls[ik].d;
   let m_nocc = dcs.v_1ls[ik].m_nocc + 0;
   if (m_nocc == d) { return(onwp); }
   while ((m_nocc < d) &&
          (onwp < np) && (dxb.m.v_nxt[onwp] < np)) {
      onwp = dxb.m.v_nxt[onwp]; 
      if (dxb.m.v_q[onwp] <= 0.0) {
        console.log(`ERROR, crit_upd.js:OneSideState_crit_move_out_num_filled, we were sent to onwp =${onwp} for ik=${ik}, d=${d} but q is 0.0`);
        debugger;
      //  return(np);
      }
      m_nocc+=1;
   }
   if ((onwp == np) && (m_nocc < d)) {
     return(0);
   }
   if (m_nocc < d) {
     return(0);
   }
   if (m_nocc == d) { return(onwp); }
   while ((m_nocc > d) &&
          (onwp < np) && (dxb.m.v_prv[onwp] < np)) {
     onwp = dxb.m.v_prv[onwp]; m_nocc-=1;
   } 
   if (m_nocc >= d) { return(onwp); }
   if (m_nocc < d) { return(0); }
   return(onwp); 
} 

const OneSideState_crit_move_in_num_filled = function(dxb, ik) {
   const dcs = this; 
   const d = dcs.v_1ls[ik].d;
   let onwp = dcs.v_1ls[ik].m_worstpi;
   let m_nocc = dcs.v_1ls[ik].m_nocc;
   const np = dxb.np;
   if (m_nocc == d) { return(onwp); }
   while ((m_nocc < d) &&
          (onwp < np) && (dxb.m.v_nxt[onwp] < np)) {
      onwp = dxb.m.v_nxt[onwp]; m_nocc+=1;
   }
   while ((m_nocc > d) &&
          (onwp < np) && (dxb.m.v_prv[onwp] < np)) {
      onwp = dxb.m.v_prv[onwp]; m_nocc-=1;
   } 
   if (m_nocc == d) { return(onwp); }
   if (m_nocc < d) { return(0); }
   return(onwp);
} 

const OneSideState_crit_move_out_num_all = function(dxb, ik) {
   let d = this.v_1ls[ik].d;
   if (dxb.m.p0i < d)  {
     return(0);
   }
   let diff = dxb.m.p0i - d + 1;
   return(diff); 
}

const OneSideState_crit_move_in_num_all = function(dxb, ik) {
   let d = this.v_1ls[ik].d;
   if (dxb.m.p0i < d) {
     return(0);
   }
   let diff = dxb.m.p0i - d + 1;
   return(diff);
}

const OneSideState_crit_move_out_num_pennies = function(dxb, ik)  {
   let onpi = this.v_1ls[ik].crit_pi;
   while ( (onpi >= 1) && 
      (Math.abs(dxb.m.v_p[(dxb).m.p0i] - dxb.m.v_p[onpi - 1]) <=  this.v_1ls[ik].fd))  {
     onpi -= 1; 
   }
   //console.log("how did move out go?");  debugger;
   if ((onpi == 0) && (dxb.m.v_p[dxb.m.p0i] - dxb.m.v_p[onpi] <  this.v_1ls[ik].fd)) {
     return(0); return(dxb.np);
   }
   return(onpi); 
}

const OneSideState_crit_move_in_num_pennies = function(dxb, ik) {
   let onpi = this.v_1ls[ik].crit_pi;
   while ((onpi < dxb.m.p0i) && 
         (Math.abs(dxb.m.v_p[dxb.m.p0i] - dxb.m.v_p[onpi]) > this.v_1ls[ik].fd)) {
     onpi += 1;
   }
   return onpi;
} 
// With something like this spread we have to explore both directions since this is is harder to
// predict.
const OneSideState_crit_move_out_pct_depth = function(dxb, ik) {
   const dcs = this; 
   //console.log("crit_move_out_pct_depth was called"); debugger;
   if (dxb.m.p0i >= dxb.np) { return 0; }
   let onwp = dcs.v_1ls[ik].crit_pi;
   if (onwp >= dxb.np) {
     onwp = dxb.m.p0i;
   }
   let pr_m = dxb.m.v_p[dxb.m.p0i];
   let crit_spread = pr_m * dcs.v_1ls[ik].fd;
   while ( (onwp < dxb.m.p0i) && Math.abs((pr_m - dxb.m.v_p[onwp]) > crit_spread) ) {
    onwp += 1;
   }
   while ( (onwp > 0) && (Math.abs(pr_m - dxb.m.v_p[onwp-1]) <= crit_spread) ) {  
      onwp -= 1;
   }
   if ( (onwp == 0) && (Math.abs(pr_m - dxb.m.v_p[0]) < crit_spread)) {
     return(0);
   }
   return(onwp);
}

const OneSideState_crit_move_in_pct_depth = function(dxb, ik) {
   const dcs = this; 
   if (dxb.m.p0i >= dxb.np) { return 0; }
   let onwp = this.v_1ls[ik].crit_pi;
   if (onwp >= dxb.np) {
      onwp = 0; 
   }
   let pr_m = dxb.m.v_p[dxb.m.p0i];
   let crit_spread = pr_m * dcs.v_1ls[ik].fd;

   while ( (onwp > 0) && (Math.abs(pr_m - dxb.m.v_p[onwp-1]) <= crit_spread)) {  
      onwp -= 1;
   }
   while ( (onwp < dxb.m.p0i) && (Math.abs(pr_m - dxb.m.v_p[onwp]) > crit_spread)) {  
     onwp += 1;
   }
   // Upper bound is
   return(onwp);
}

const OneSideState_crit_move_in_multiple_spread = function(sprd, dxb, ik) {
   if ((!(!(!sprd))) || (sprd <= 0.0)) { return(0); }
   const dcs = this;
   if (ik === undefined) {
     console.log("OnesideState_crit_move_in_multiple_spread: we need ik info."); debugger;
   }
   //if ((this.v_1ls[ik] === undefined) || (this.v_1ls[ik].crit_pi === undefined)) {
   //  console.log("Error: crit_move_in_multiple_spread. ik=" + ik + "/" + this.v_1ls.length + " but no crit_pi?");
   //  debugger;
   //}
   let onwp = this.v_1ls[ik].crit_pi;
   //let sprd = ((*xb).b.m.v_p[xb.b.m.p0i] - (*xb).s.m.v_p[xb.s.m.p0i]).abs();
   let pr_m = dxb.m.v_p[dxb.m.p0i];
   const crit_spread = sprd * dcs.v_1ls[ik].fd;

   while ((onwp < dxb.m.p0i) && (Math.abs(pr_m - dxb.m.v_p[onwp+1]) >= crit_spread) ) {  
     onwp += 1;
   }

   while ((onwp > 0) && (Math.abs(pr_m - dxb.m.v_p[onwp]) < crit_spread)) {  
     onwp -= 1;
   }
   return(onwp);
}
const OneSideState_crit_move_out_multiple_spread = function(sprd, dxb, ik)  {
   if (sprd <= 0.0) { return 0; }
   const dcs = this; let onwp = dcs.v_1ls[ik].crit_pi;
   //let sprd = (xb.b.m.v_p[xb.b.m.p0i] - xb.s.m.v_p[xb.s.m.p0i]).abs();
   let pr_m = dxb.m.v_p[dxb.m.p0i];
   const crit_spread = sprd * dcs.v_1ls[ik].fd;
  

   while ((onwp < dxb.m.p0i) && (Math.abs(pr_m - dxb.m.v_p[onwp]) > crit_spread)) {  
     onwp += 1;
   }
   while ((onwp > 0) && (Math.abs(pr_m - dxb.m.v_p[onwp-1]) <= crit_spread)) {  
     onwp -= 1;
   }
   if ((onwp == 0) && (Math.abs(pr_m - dxb.m.v_p[0]) < sprd * dcs.v_1ls[ik].fd)) {
     return(0);
   }
   return(onwp);
}

const OneSideState_crit_move_out_num_shares = function(dxb, ik)  {
  let onwp = this.v_1ls[ik].m_worstpi;
  let on_tot = this.v_1ls[ik].m_csumq;
  while ((onwp > 0) && (onwp < dxb.np) && (dxb.m.v_nxt[onwp] < dxb.np) 
    && (on_tot < this.v_1ls[ik].d))  {
    onwp = dxb.m.v_nxt[onwp];
    on_tot += dxb.m.v_q[onwp];
  }
  if (on_tot < (this.v_1ls[ik].d)) { 
    return(0);
  }
  return(onwp);
}

const OneSideState_crit_move_in_num_shares = function(dxb, ik) {
  let onwp = this.v_1ls[ik].m_worstpi;
  let on_tot = this.v_1ls[ik].m_csumq;
  if (on_tot < this.v_1ls[ik].d) { return(0); }
  while ((onwp < dxb.m.p0i) && (dxb.m.v_prv[onwp] < dxb.np) 
    && (on_tot - dxb.m.v_q[onwp] >= (this.v_1ls[ik].d)))  {
    on_tot -= dxb.m.v_q[onwp];
    onwp = dxb.m.v_prv[onwp];
  }
  return(onwp);
}



const OneSideState_crit_move_out_total_dollars = function(dxb, ik) {
   const np = dxb.np;
   if (dxb.m.p0i >= np) { return(0); } 
   let onwp = this.v_1ls[ik].m_worstpi;
   let on_t_pq = this.v_1ls[ik].m_csumpq;
   if (onwp >= np) {
      onwp = dxb.m.p0i; 
      on_t_pq = dxb.m.v_q[onwp] * dxb.m.v_p[onwp];
   }
   if (on_t_pq >= this.v_1ls[ik].fd) { return(onwp); }
   while ((onwp < np) && (dxb.m.v_nxt[onwp] < np) 
      && (on_t_pq < this.v_1ls[ik].fd))  {
      onwp = dxb.m.v_nxt[onwp];
      on_t_pq += dxb.m.v_q[onwp] * dxb.m.v_p[onwp];
   }
   if (on_t_pq < this.v_1ls[ik].fd) { 
     return(0);
   }
   return(onwp);
}

const OneSideState_crit_move_in_total_dollars = function(dxb, ik) {
  const np = dxb.np;
  if (dxb.m.p0i >= np) { return(0); }
  let onwp = this.v_1ls[ik].m_worstpi;
  if (onwp >= np) {
    console.log("crit_move_in:  ERROR onwp supplied = " + onwp +
      " for crit_move_in_total_dollars but np=" + np);
    return(np);
  }
  let on_t_pq = this.v_1ls[ik].m_csumpq;
  if (on_t_pq < (this.v_1ls[ik].fd)) { return(0); }
  while ( (onwp < dxb.m.p0i) && (dxb.m.v_prv[onwp] < dxb.np) 
    && (on_t_pq - dxb.m.v_p[onwp] * dxb.m.v_q[onwp] >= this.v_1ls[ik].fd) ) {
    on_t_pq -= dxb.m.v_q[onwp] * dxb.m.v_p[onwp];
    onwp = dxb.m.v_prv[onwp];
  }
  return(onwp);
}


export { 
  TotalCurrentState_crit_move_any,
  TotalCurrentState_crit_move_out,
  TotalCurrentState_crit_move_in,

  OneSideState_crit_move_out_num_filled,
  OneSideState_crit_move_in_num_filled,
  OneSideState_crit_move_out_num_all,
  OneSideState_crit_move_in_num_all,
  OneSideState_crit_move_out_num_shares,
  OneSideState_crit_move_in_num_shares,
  OneSideState_crit_move_out_num_pennies,
  OneSideState_crit_move_in_num_pennies,
  OneSideState_crit_move_out_pct_depth,
  OneSideState_crit_move_in_pct_depth,
  OneSideState_crit_move_out_multiple_spread,
  OneSideState_crit_move_in_multiple_spread,
  OneSideState_crit_move_out_total_dollars,
  OneSideState_crit_move_in_total_dollars
};
