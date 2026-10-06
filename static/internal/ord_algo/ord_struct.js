//////////////////////////////////////////////////////////////////////
///  ord_struct.js
///
///  Alan Lenarcic
//   2026/06/09
//
//  Manual Copy from gpuorderbook/ord_struct.rs
//
/// Guidance is not to use BigInt as array indices.
const print_env = require('../printer.js');
const make_print_n = print_env.make_print_n;



const get_d0fd1 = function(kalgo) {
  const list0 = ['NumFilled','NumAll','NumShares'].map((key)=>Kalgo[key])
  const list1 = ['PctDepth','NumPennies','TotalDollars','MultipleSpread','ExpDecay'].map((key)=>Kalgo[key]);
  if ((kalgo == Kalgo.NumFilled) || (kalgo == "NumFilled")) { return(0); }
  if ((kalgo == Kalgo.NumAll) || (kalgo == "NumAll")) { return(0); }
  if ((kalgo == Kalgo.NumShares) || (kalgo == "NumShares")) { return(0); }
  if ((kalgo == Kalgo.NumPennies) || (kalgo == "NumPennies")) { return(1); }
  if ((kalgo == Kalgo.TotalDollars)) { return(1); }
  return(1);
  return(list0.includes(kalgo) ? 0 : 1);
}

class OneSideBook {
  bs="b";bs01=0;np=0;p0i=0;
  v_p=[0.0]; v_q=[0]; v_nxt=[0]; v_prv=[0];
  p_wi = 0; tot_q = 0; tot_pq = 0;
  nocc = 0;
  constructor({bs01, v_p_in}) {
    //bs: Type Buy Sell
    //v_p_in: vector of type price
    const np = v_p_in.length;
    this.bs = (bs01==0) ? 'b' : 's'; 
    this.bs01 = bs01;
    this.v_q = Array(np).fill(0);
    this.v_nxt = Array(np).fill(np); 
    this.v_prv = Array(np).fill(np); 
    this.p_wi = np; this.tot_q = 0;  this.tot_pq = 0;
    this.nocc = 0; this.p0i = np;

    //let v_p = [...v_p_in];
    //v_p.sort();
    //this.bs01 = (this.bs=='b') ? 0 : 1;
    //if (this.bs01===1) {
    //  v_p.reverse();
    //}
    this.v_p = v_p_in; this.np = np;
  }
}
class OneSideCombinedBook {
  bs="b"; bs01=0; m = {}; vr=[{}]; np = 0;
  constructor({bs01, v_p_in, nr}) {
    if ((v_p_in === undefined) || (v_p_in === null) || (v_p_in===false)) {
      console.log("ERROR OneSideCombinedBook: v_p_in not supplied is null please re-construct");
    }
    this.bs = (bs01 == 0) ? 'b' : 's';
    this.bs01 = bs01;
    this.vr = [];
    // For silly reasons "_ir" is unused?
    for (let ir=0; ir < nr; ir++) {
      this.vr.push(new OneSideBook({'bs01':bs01, 'v_p_in':v_p_in}));
    }
    this.m = new OneSideBook({'bs01':bs01,'v_p_in':v_p_in});
    this.np = v_p_in.length;
  }
}
class MarketExchangeBook {
  b={}; s={}; verbose = -1;  verbose_ob={'s':[],verbose:-1}; nr = 0;
  constructor({v_b_p_in, v_s_p_in, nr, verbose}) {
    if ((v_b_p_in === undefined) || (v_b_p_in === null) || (v_b_p_in === false)) {
      console.log("MarketExchangeBook: Error: v_b_p_in supplied is invalid."); debugger;
      return(null);
    }
    if ((v_s_p_in === undefined) || (v_s_p_in === null) || (v_s_p_in === false)) {
      console.log("MarketExchangeBook: Error: v_s_p_in supplied is invalid."); debugger;
      return(null);
    }
    this.b = new OneSideCombinedBook({"bs":"b", "bs01":0, "v_p_in":v_b_p_in, "nr":nr});
    this.s = new OneSideCombinedBook({"bs":"s", "bs01":1, "v_p_in":v_s_p_in, "nr":nr});
    this.verbose_ob={'s':[],'verbose':verbose}; this.nr = nr;
    this.verbose = verbose;
  }
}

const Kalgo = Object.freeze({
  NumFilled:0,
  NumAll:1,
  NumShares:2,
  NumPennies:3,
  MultipleSpread:4,
  TotalDollars:5,
  PctDepth:6,
  ExpDecay:7,
  Unknown:-1
});

const isin_Kalgo = function(in_kalgo) {
  if ((in_kalgo === null) || (in_kalgo === undefined) || (in_kalgo === false)) {
    return(Kalgo.Unknown);
  }
  if ((typeof(in_kalgo) == 'number') && (in_kalgo === 0)) { return(Kalgo.NumFilled); }
  if (!(!(in_kalgo))) {
    if (Object.keys(Kalgo).includes(in_kalgo)) {
      return(Kalgo[in_kalgo]);
    }
    if (Object.values(Kalgo).includes(in_kalgo)) {
      const Kkeys = Object.keys(Kalgo);
      for (let ii = 0; ii < Kkeys.length; ii++) {
        if (Kalgo[Kkeys[ii]] === in_kalgo) { return(Kalgo[Kkeys[ii]]) }
      }
    }
  }
  return(Kalgo.Unknown); 
} 
const str_kalgo = function(int_kalgo) {
  if ((int_kalgo < -1) || (int_kalgo > 7)) {
    return("Unknown");
  }
  return(Object.keys(Kalgo).find(k=> Kalgo[k]===int_kalgo));
}

// This is just to get function names more "Rust" Like
const undKalgo = Object.freeze({
  "NumFilled":"num_filled",
  "NumAll":"num_all",
  "NumShares":"num_shares",
  "NumPennies":"num_pennies",
  "MultipleSpread":"multiple_spread",
  "TotalDollars":"total_dollars",
  "PctDepth":"pct_depth",
  "ExpDecay":"exp_decay",
  "Unknown":"unknown"
})
const und_str_kalgo = function(int_kalgo) {
  const skalgo = str_kalgo(int_kalgo);
  return(undKalgo[skalgo]);
}

class OneLevelState {
  d = 0n; fd = 0.0;
  d0fd1 = 0; crit_pi = 0;
  m_nocc = 0;  m_csumq = 0;
  m_csumpq = 0; m_worstpi = 0; m_atq = 0;
  vr_nocc = []; vr_csumq = []; vr_csumpq = [];
  vr_worstpi = [];
  vr_atq = [];
  constructor({d,fd,d0fd1,np,nr}) {
    this.fd = d0fd1 == 0 ? -1.0 : fd;
    this.d = d; this.d0fd1 = d0fd1;
    this.crit_pi = 0;  this.m_nocc = 0; this.m_csumq = 0;
    this.m_csumpq = 0; this.m_worstpi = np;
    this.m_atq = 0;
    this.vr_nocc = Array(np).fill(0);
    this.vr_csumq = Array(np).fill(0);
    this.vr_csumpq = Array(np).fill(0);
    this.vr_worstpi = Array(np).fill(np);
    this.vr_atq = Array(np).fill(0);
  }
  quality_check(ik, ir, nocc, csumq, worstpi, csumpq) {
    let n_err = 0;
    const c1 = (ir >= this.vr_csumq.length) ? (`quality_check[Error ik=${ik},m] `) : (
                `quality_check[Error ik=${ik},ir=${ir}]` );
    if (ir >= this.vr_csumq.length) {
      if (csumq != this.m_csumq) {
        console.log(c1 + `csumq submitted was ${csumq},` + 
          `this.m_csumq=${this.m_csumq}, d0fd1=${this.d0fd1}.`)
        n_err+=1;
      }
      if (csumpq != this.m_csumpq) {
        console.log(c1 + `csumpq submitted was ${csumpq}, this.m_csumpq=${this.m_csumpq}`);
        n_err+=1;
      }
      if (worstpi != this.m_worstpi) {
        console.log(c1 + `worstpi submitted was ${worstpi}, this.m_worstpi={this.m_worstpi}`);
        n_err+=1;
      }
      if (nocc != this.m_nocc) {
        console.log(c1 + `nocc submitted was ${nocc}, this.m_worstpi=${this.m_nocc}`); 
        n_err+=1;
      }
      return n_err;
    }
    
    if (Math.abs(csumq - this.vr_csumq[ir]) > 0.001) {
      console.log(c1 + `csumq submitted was ${csumq}, this.vr_csumq=${this.vr_csumq[ir]}`);
      n_err+=1;
    }

    if (Math.abs(csumpq - this.vr_csumpq[ir]) > 0.001) {
      console.log(c1 + `csumpq submitted was ${csumpq}, this.vr_csumq=${this.vr_csumpq[ir]}`);
      n_err+=1;
    }

    if (Math.abs(nocc - this.vr_nocc[ir]) > 0.001) {
      console.log(c1 + `nocc submitted was ${nocc}, this.vr_nocc=${this.vr_nocc[ir]}`);
      n_err+=1;
    }

    if (Math.abs(worstpi - this.vr_worstpi[ir]) > 0.001) {
      console.log(c1 + `nocc submitted was ${worstpi}, this.vr_nocc=${this.vr_worstpi[ir]}`);
      n_err+=1;
    }
    return n_err;				
  }
  move_in_to_crit(xb, crit_pi, bs01, ik)  {
    const dxb = (bs01==0) ? xb.b : xb.s;
    const nr = dxb.vr.length;  const np = dxb.m.np;
    if (crit_pi >= np) {
      console.log("OneLevelState.move_in_to_crit: This doesn't work NP given, We cannot be Moving In.  Deleting all prices: ERROR");
      console.log(`crit_pi=${crit_pi}, np=${np} for ik=${ik}`);
      console.log("---   Error "); return(-1001);
    }
    if (crit_pi == 0) {
      return 1043;  // No where to move up from here.  
    }
    for (let ir=0;ir < nr; ir++) {
      if ((this.vr_worstpi[ir] >= np) && (dxb.vr[ir].p0i < np) && (dxb.vr[ir].p0i >= crit_pi)) {
         this.vr_csumq[ir] = dxb.vr[ir].v_q[dxb.vr[ir].p0i];
         this.vr_csumpq[ir] = dxb.vr[ir].v_q[dxb.vr[ir].p0i] *
                                 dxb.vr[ir].v_p[dxb.vr[ir].p0i];
         this.vr_nocc[ir] = 1;
         this.vr_worstpi[ir] = dxb.vr[ir].p0i;
      }
      while (this.vr_worstpi[ir] < crit_pi) {
         this.vr_csumq[ir] -= dxb.vr[ir].v_q[this.vr_worstpi[ir]];
         this.vr_csumpq[ir] -= dxb.vr[ir].v_q[this.vr_worstpi[ir]] *
                                 dxb.vr[ir].v_p[this.vr_worstpi[ir]];
         this.vr_nocc[ir] -= 1;
         this.vr_worstpi[ir] = dxb.vr[ir].v_prv[this.vr_worstpi[ir]];
       }
       if (this.vr_worstpi[ir] == crit_pi) {
         this.vr_atq[ir] = dxb.vr[ir].v_q[this.vr_worstpi[ir]];
       } else {
         this.vr_atq[ir] = 0.0;
       }
    }
    while (this.m_worstpi < crit_pi) {
      this.m_csumq -= dxb.m.v_q[this.m_worstpi];
      this.m_csumpq -= dxb.m.v_q[this.m_worstpi] *
                          dxb.m.v_p[this.m_worstpi];
      this.m_nocc -= 1;
      this.m_worstpi = dxb.m.v_prv[this.m_worstpi];
    }
    if (this.m_worstpi == crit_pi) {
      this.m_atq = dxb.m.v_q[crit_pi];
    } else {
      this.m_atq = 0.0;
    }
    this.crit_pi = crit_pi;
    return(10009);
  }

  move_out_to_crit(xb, crit_pi, bs01, ik) {
    const dxb = (bs01==0) ? xb.b: xb.s;
    const np = dxb.m.np; const nr = dxb.vr.length;
    if (crit_pi >= dxb.m.np) { crit_pi = 0; }  // Understood that Crit move out means all values valid. 
    //if (crit_pi >= dxb.m.np) {
    //  console.log("ord_struct.js->OneLevelState->move_out_to_crit: This doesn't work, Deleting all prices, error, " +
    //    `crit_pi=${crit_pi}, np=${np}, ik=${ik}.`);
    //  console.log("---   Error "); return(-1002);
    //}
    for (let ir=0;ir<nr;ir++) {
      if ((this.vr_worstpi[ir] >= np) && (dxb.vr[ir].p0i < np) && (dxb.vr[ir].p0i >= crit_pi)) {
         this.vr_csumq[ir] = dxb.vr[ir].v_q[dxb.vr[ir].p0i];
         this.vr_csumpq[ir] = dxb.vr[ir].v_q[dxb.vr[ir].p0i] *
                                 dxb.vr[ir].v_p[dxb.vr[ir].p0i];
         this.vr_nocc[ir] = 1;
         this.vr_worstpi[ir] = dxb.vr[ir].p0i;
      }
      if (this.vr_worstpi[ir] >= dxb.m.np) {
        // Nothing to do, no where to move out from. Not sure this should happen
      } else {
        while ((dxb.vr[ir].v_nxt[this.vr_worstpi[ir]] < dxb.m.np) &&
               (dxb.vr[ir].v_nxt[this.vr_worstpi[ir]] >= crit_pi)) {
         this.vr_worstpi[ir] = dxb.vr[ir].v_nxt[this.vr_worstpi[ir]];
         this.vr_csumq[ir] += dxb.vr[ir].v_q[this.vr_worstpi[ir]];
         this.vr_csumpq[ir] += dxb.vr[ir].v_q[this.vr_worstpi[ir]] *
                                 dxb.vr[ir].v_p[this.vr_worstpi[ir]];
         this.vr_nocc[ir] += 1;
        }
        if (this.vr_worstpi[ir] == crit_pi) {
          this.vr_atq[ir] = dxb.vr[ir].v_q[this.vr_worstpi[ir]];
        } else {
          this.vr_atq[ir] = 0.0;
        }
      }
    }
    if (this.m_worstpi >= dxb.m.np) {
      console.log("move_out_to_crit: This doesn't work, m_worstpi = " + 
        `${m_worstpi} np=${np} but crit =${crit_pi}, ik=${ik} How do we move?`);
    }
    while ((dxb.m.v_nxt[this.m_worstpi] < dxb.m.np) && 
          (dxb.m.v_nxt[this.m_worstpi] >= crit_pi)) { 
      this.m_worstpi = dxb.m.v_nxt[this.m_worstpi];
      this.m_csumq += dxb.m.v_q[this.m_worstpi];
      this.m_csumpq += dxb.m.v_q[this.m_worstpi] *
                          dxb.m.v_p[this.m_worstpi];
      this.m_nocc += 1;
    }
    if (this.m_worstpi == crit_pi) {
      this.m_atq = dxb.m.v_q[crit_pi];
    } else {
      this.m_atq = 0.0;
    }
    this.crit_pi = crit_pi;
    return(10010);
  }
}

class OneSideState {
  bs ="u"; bs01=-1; kalgo=Kalgo.Unknown; n_ld = 0;
  v_1ls = []; nw = 0; v_w = [];
  m_wsumq = 0.0;  vr_wsumq = [];
  m_wsumpq = 0.0; vr_wsumpq = [];
  m_worstpi = -1; vr_worstpi = [];
  m_wnocc = 0; vr_wnocc = [];
  m_onw = 0;  vr_onw = []; d0fd1=-1;
  constructor({bs, v_in_d, v_in_fd, v_in_w, nr, kalgo, np}) {
    this.bs = bs.toLowerCase(); this.nr = nr; this.np = np;
    let v_1ls = [];
    this.bs01 = (this.bs==='b') ? 0 : 1;
    this.kalgo = isin_Kalgo(kalgo);
    if ((this.kalgo === undefined) || (this.kalgo === null) || (this.kalgo === Kalgo.Unknown)) {
      console.log("OneSideState: Error, this.kalgo determined to be " + 
        this.kalgo + ":" + str_kalgo(this.kalgo));
    }
    this.d0fd1 = get_d0fd1(kalgo);
    const d0fd1 = this.d0fd1;
    console.log("OneSideState: kalgo=" + kalgo + ":" + str_kalgo(kalgo) + ", d0fd1 = " + d0fd1);
    let v_d = []; let v_fd = [];
    let ii = 0;
    const n_ld = (d0fd1 == 0) ? v_in_d.length : v_in_fd.length;
    this.v_1ls = [];
    if (d0fd1 === 0) {
      if ((v_in_d === undefined) || (v_in_d === null) || (v_in_d === false) || (v_in_d.length <= 0)) {
        console.log("new OneSideState(bs="+bs+",d0fd1="+d0fd1+",kalgo=" + kalgo + ":" + str_kalgo + "): " + 
          "Error, v_in_d supplied is defective somehow"); debugger;
      }
      v_d = (!(v_in_d)) ? [] : [...v_in_d];
      v_d.sort((x,y)=>{ return(x< y) });
      for (ii = 0; ii < n_ld; ii++) {
        this.v_1ls.push(new OneLevelState({'d':v_d[ii], 'fd':-1.0, 'd0fd1':d0fd1, 'np':np,'nr':this.nr}));
      } 
    } else {
      if ((v_in_fd === undefined) || (v_in_fd === null) || (v_in_fd === false) || (v_in_fd.length <= 0)) {
        console.log("new OneSideState(bs="+bs+",d0fd1="+d0fd1+",kalgo=" + kalgo + ":" + str_kalgo + "): " + 
          "Error, v_in_fd supplied is defective somehow"); debugger;
      }
      v_fd = (!(v_fd)) ? [] : [...v_in_fd];
      v_fd.sort((x,y)=>{ return(x<y) });
      for (ii = 0; ii < n_ld; ii++) {
        this.v_1ls.push(new OneLevelState({'fd':v_fd[ii], 'd':-1.0, 'd0fd1':d0fd1, 'np':np,'nr':this.nr}));
      }
    }
    let v_w = (!(v_in_w)) ? [] : [...v_in_w];
    v_w = v_w.sort((v,w)=> { return(v<w); });
    this.v_w = v_w; this.v_d=v_d; this.v_fd = v_fd;  
    this.vr_wsumq = Array(this.nr).fill(0);
    this.vr_wsumpq = Array(this.nr).fill(0);
    this.vr_worstpi = Array(this.nr).fill(0);
    this.vr_onw = Array(this.nr).fill(0.0);
  }
  wp_b_move_in_no_force(ik, xb) {
    const dxb = (this.bs01 === 0) ? (xb.b) : (xb.s);
    if (this.v_1ls[ik].m_worstpi == dxb.m.p0i) {
      console.log("OneSideState: Error, can't move past p0i={}", dxb.m.p0i);
      return(-1);
    }
    const new_worstpi = dxb.m.v_prv[this.v_1ls[ik].m_worstpi];
    if ((this.v_1ls[ik].m_worstpi < dxb.m.np) && (new_worstpi < dxb.m.np)) { 
      this.v_1ls[ik].m_csumq -= dxb.m.v_q[this.v_1ls[ik].m_worstpi];
      this.v_1ls[ik].m_csumpq -= dxb.m.v_q[this.v_1ls[ik].m_worstpi] *
                             dxb.m.v_q[this.v_1ls[ik].m_worstpi];
      this.v_1ls[ik].m_nocc -= 1;
      if (this.v_1ls[ik].m_worstpi == dxb.m.p0i) {
        this.v_1ls[ik].m_worstpi = dxb.m.np;
      } else {
        this.v_1ls[ik].m_worstpi = new_worstpi;
      }
    }
    return(1);
  }
  wp_b_move_out_no_force(ik, xb) {
    const dxb = (this.bs === 0) ? (xb.b) : (xb.s);
    if (this.v_1ls[ik].m_worstpi == dxb.m.p0i) {
      console.log(`OneSideState: Error, can't move past p0i=${dxb.m.p0i}`);
      return(-1);
    }
    const new_worstpi = dxb.m.v_nxt[this.v_1ls[ik].m_worstpi];
    if ( (this.v_1ls[ik].m_worstpi < dxb.m.np) && (new_worstpi < dxb.m.np)) { 
      this.v_1ls[ik].m_csumq -= dxb.m.v_q[this.v_1ls[ik].m_worstpi];
      this.v_1ls[ik].m_csumpq -= dxb.m.v_q[this.v_1ls[ik].m_worstpi] *
                                 dxb.m.v_q[this.v_1ls[ik].m_worstpi];
      this.v_1ls[ik].m_nocc -= 1;
      if (this.v_1ls[ik].m_worstpi == (dxb.m.p0i)) {
        this.v_1ls[ik].m_worstpi = dxb.m.np;
      } else {
        this.v_1ls[ik].m_worstpi = new_worstpi;
      }
    }
    return(1);
  }
  wp_b_move_in_enforced(ik, xb) {
    const PRINT_N = make_print_n(xb.verbose_ob, "wp_b_move_in_enforced");
    // For move in we really only need the same side market/related book
    let dxb = (this.bs01 === 0)  ? (xb.b) : (xb.s); 
    if (this.v_1ls[ik].m_worstpi == dxb.m.p0i) {
      PRINT_N(-6, `OneSideState: Error, can't move past p0i=${dxb.m.p0i}`);
      return(-1);
    }
    // Note enforcement doesn't happen on exo_decay type
    let new_worstpi = dxb.m.v_prv[this.v_1ls[ik].m_worstpi];
    // Note if dxb.vr[ir].p0i >= dxb.vr[ir].np, then
    //   Registrant ir has no non zero prices.
    let ir = 0;
    for (ir=0;ir < this.v_1ls[ik].vr_worstpi.length;ir++) {
      while ( (this.v_1ls[ik].vr_worstpi[ir] < dxb.vr[ir].np) &&
        ( new_worstpi > this.v_1ls[ik].vr_worstpi[ir] )) { 
        this.v_1ls[ik].vr_csumq[ir] -= dxb.vr[ir].v_q[this.v_1ls[ik].vr_worstpi[ir]];
        this.v_1ls[ik].vr_csumpq[ir] -= dxb.vr[ir].v_q[this.v_1ls[ik].vr_worstpi[ir]] *
                                    dxb.vr[ir].v_p[this.v_1ls[ik].vr_worstpi[ir]];
        this.v_1ls[ik].vr_nocc[ir] -= 1;
        if (this.v_1ls[ik].vr_worstpi[ir] == dxb.vr[ir].p0i) {
          this.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].np; // Wipe from board
        } else {
          this.v_1ls[ik].vr_worstpi[ir] = dxb.vr[ir].v_prv[this.v_1ls[ik].vr_worstpi[ir]];
        }
      }
    }
    // Market is only pushing once, and we are moving to new_wpi
    if ((this.v_1ls[ik].m_worstpi < dxb.m.np) && (new_worstpi < dxb.m.np)) { 
      this.v_1ls[ik].m_csumq -= dxb.m.v_q[this.v_1ls[ik].m_worstpi];
      this.v_1ls[ik].m_csumpq -= dxb.m.v_q[this.v_1ls[ik].m_worstpi] *
                             dxb.m.v_q[this.v_1ls[ik].m_worstpi];
      this.v_1ls[ik].m_nocc -= 1;
      if (this.v_1ls[ik].m_worstpi == dxb.m.p0i) {
        this.v_1ls[ik].m_worstpi = dxb.m.np;
      } else {
        this.v_1ls[ik].m_worstpi = new_worstpi;
      }
    }
    return(1);
  }
  wp_b_move_out_enforced(ik, xb) {
    // For move out, we might get to add bonus quantity on all of the items. 
    const dxb = (this.bs01 === 0) ? (xb.b) : (xb.s); 
    const np = dxb.m.np; let nr = dxb.vr.length;
    if (this.v_1ls[ik].m_worstpi == dxb.m.p0i) {
      PRINT_N(-6,`OneSideState: Error, can't move past p0i=${dxb.m.p0i}`);
      return(-1);
    }
    // Note enforcement doesn't happen on exo_decay type
    const new_worstpi = dxb.m.v_nxt[this.v_1ls[ik].m_worstpi];
    if (new_worstpi >= dxb.m.np) {
      // If we can't move out to a concrete location, enforcement is lost.`
      // Note new_worstpi is not an enforcement limit for NumAll, pct_filled values
      // It is NumFilled, NumShares, TotalDollars that is affected by this
      PRINT_N(-6, "wp_b_move_out_enforced, can't move out ok " + 
        `ik=${ik}, because v_worstpi=${v_worstpi}, but the next is` +
        `${new_worstpi}/${np}`);
    }
    // Note if dxb.vr[ir].p0i >= dxb.vr[ir].np, then
    //   Registrant ir has no non zero prices.
    let ir = 0;
    for (ir =0; ir < this.nr; ir++)  {
      // Note that we did OneSidePositions price reversal for side "s"
      // As a result, higher values of pi are always "closer to p0i" or the best price
      // and p0i is always the largest filled value
      while ((this.v_1ls[ik].vr_worstpi[ir] < dxb.vr[ir].np) &&
        (dxb.vr[ir].v_nxt[this.v_1ls[ik].vr_worstpi[ir]] < dxb.vr[ir].np) && 
        ( new_worstpi <= dxb.vr[ir].v_nxt[this.v_1ls[ik].vr_worstpi[ir]])) {
        let nxtpi = dxb.vr[ir].v_nxt[this.v_1ls[ik].vr_worstpi[ir]];
        this.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[nxtpi];
        this.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[nxtpi] *
                                   dxb.vr[ir].v_p[nxtpi];
        this.v_1ls[ik].vr_nocc[ir] += 1;
        this.v_1ls[ik].vr_worstpi[ir] = nxtpi;
      }
    }
    // Market is only pushing once, and we are moving to new_wpi
    if (new_worstpi < dxb.m.np) { 
      this.v_1ls[ik].m_csumq += dxb.m.v_q[new_worstpi];
      this.v_1ls[ik].m_csumpq -= dxb.m.v_p[new_worstpi] *
                             dxb.m.v_q[new_worstpi];
      this.v_1ls[ik].m_nocc += 1;
      this.v_1ls[ik].m_worstpi = new_worstpi;    
    }
    return(1);
  }
  // Move out to target, if we know tgt_pi as boundary, easy enough to 
  // update queues in outward bound direction.
  // Assuming Target it valid 
  move_out_to_target(xb, tgt_pi, ik) {
    const dxb = (this.bs01 === 0) ? (xb.b) : (xb.s); 
    const np = dxb.m.np; let nr = dxb.vr.length; let ir = 0;
    for (ir=0;ir<this.nr;ir++) {
      let ir = ir;
      while ((this.v_1ls[ik].vr_worstpi[ir] < dxb.vr[ir].np) &&
            (dxb.vr[ir].v_nxt[this.v_1ls[ik].vr_worstpi[ir]] < dxb.vr[ir].np) &&
            (dxb.vr[ir].v_nxt[this.v_1ls[ik].vr_worstpi[ir]] >= tgt_pi)) {
        let nxtpi = dxb.vr[ir].v_nxt[this.v_1ls[ik].vr_worstpi[ir]];
        this.v_1ls[ik].vr_csumq[ir] += dxb.vr[ir].v_q[nxtpi];
        this.v_1ls[ik].vr_csumpq[ir] += dxb.vr[ir].v_q[nxtpi] *
                                   dxb.vr[ir].v_p[nxtpi];
        this.v_1ls[ik].vr_nocc[ir] += 1;
        this.v_1ls[ik].vr_worstpi[ir] = nxtpi;
      }
    }
    while ((this.v_1ls[ik].m_worstpi < dxb.m.np) &&
          (dxb.m.v_nxt[this.v_1ls[ik].m_worstpi] < dxb.m.np) &&
          (dxb.m.v_nxt[this.v_1ls[ik].m_worstpi] >= tgt_pi)) {
      let nxtpi = dxb.m.v_nxt[this.v_1ls[ik].m_worstpi];
      this.v_1ls[ik].m_csumq += dxb.m.v_q[nxtpi];
      this.v_1ls[ik].m_csumpq += dxb.m.v_q[nxtpi] *
                             dxb.m.v_p[nxtpi];
      this.v_1ls[ik].m_nocc += 1;
      this.v_1ls[ik].m_worstpi = nxtpi;
    }
    return(1);
  }  
  // Arbitrary weights in the "vw, v_vwwp" vector are enforced differently
  // Property should be that related quantity placed "in between" a weight
  // gets to arbitrarily code it.  
  //
  // Note, moveout, move in of the weights is more of a rewrite all.
  wp_reweight_num_filled(xb)  {
    const dxb = (this.bs01 == 0) ? (xb.b) : (xb.s); 
    const np = dxb.m.np; let nr = dxb.vr.length; let ir = 0;
    if (this.nw <= 0) { 
      console.log("wp_reweight_num_filled: shouldn't be called if nw is zero.");
      return 5; 
    }
    const p0i = dxb.m.p0i;
    if (p0i >= np) {
      for (ir=0;ir<nr;ir++) {
        this.vr_wsumq[ir] = this.v_w[0] * dxb.vr[ir].tot_q;
        this.vr_wsumq[ir] = this.v_w[0] * dxb.vr[ir].tot_pq;
        this.vr_wnocc[ir] = dxb.vr[ir].nocc;  this.vr_onw[ir] = 0;
        this.vr_worstpi[ir] = dxb.vr[ir].p_wi ;
      }
      this.m_wsumq = 0.0; this.m_wnocc = 0; this.m_worstpi = np;
      this.m_wsumpq = 0.0; this.m_onw = 0;
      return(2); 
    }

    let onpi = p0i;
    // When new_p0i, new_wpi rewritten every sum gets blanked out.
    this.m_wsumq = dxb.m.v_q[onpi]; this.m_wnocc = 1; this.m_worstpi = onpi;
    this.m_onw = 0; 
    this.m_wsumq = dxb.m.v_q[onpi] * this.v_w[this.m_onw]; 
    this.m_wsumpq = dxb.m.v_q[onpi] * dxb.m.v_p[onpi] * this.v_w[this.m_onw]; 
    for (ir=0;ir<nr;ir++) {
      this.vr_wsumq[ir] = 0.0; this.vr_wsumpq[ir] = 0.0;  this.vr_onw[ir] = 0;
      this.vr_wnocc[ir] = 0; this.vr_worstpi[ir] = dxb.m.np;
      let onrpi = dxb.vr[ir].p0i;
      while ((onrpi < np) && (onrpi > onpi)) {
        this.vr_wsumq[ir] += dxb.vr[ir].v_q[onrpi] * this.v_w[this.m_onw];
        this.vr_wsumq[ir] += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi] * this.v_w[this.m_onw];
        this.vr_wnocc[ir] += 1; this.vr_worstpi[ir] = onrpi;
        onrpi = dxb.vr[ir].v_nxt[onrpi];
      }
    }
    let onw=0;
    for (onw=0;onw<this.nw;onw++) {
      if ((onpi == 0) || (dxb.m.v_nxt[onpi] >= np)) { break; }
      onpi = dxb.m.v_nxt[onpi];
      this.m_onw = onw;
      if (dxb.m.v_q[onpi] > 0) {
        this.m_wsumq += dxb.m.v_q[onpi] * this.v_w[onw]; this.m_wnocc+=1; 
        this.m_wsumpq += dxb.m.v_q[onpi] * dxb.m.v_p[onpi] * this.v_w[onw];
        this.m_worstpi = onpi;
      }
      for (ir=0;ir<nr;ir++) {
        let onrpi = (np <= this.vr_worstpi[ir]) ?  ( np ) : ( dxb.vr[ir].v_nxt[this.vr_worstpi[ir]] );
        while ((onrpi < np) && (onrpi >= onpi)) { 
          this.vr_wsumq[ir] += dxb.vr[ir].v_q[onrpi] * this.v_w[onw];  this.vr_wnocc[ir] += 1;
          this.vr_wsumpq[ir] += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi] * this.v_w[onw];
          this.vr_worstpi[ir] = onrpi;  this.vr_onw[ir] = onw;
          onrpi = dxb.vr[ir].v_nxt[onrpi];
        }
      }
    }
    return(6); 
  }
  wp_reweight_num_all(xb) {
    const dxb = (this.bs === 0) ? (xb.b) : (xb.s); 
    const np = dxb.m.np; let nr = dxb.vr.length; let ir = 0;
    if (this.nw <= 0) { 
      console.log("wp_reweight_num_all: shouldn't be called if nw is zero.");
      return(5); 
    }
    let mp0i = dxb.m.p0i;
    let onw=0; 
    if (mp0i >= np) {
      for (ir=0;ir<nr;ir++) {
        this.vr_wsumq[ir] = this.v_w[0] * dxb.vr[ir].tot_q;
        this.vr_wsumq[ir] = this.v_w[0] * dxb.vr[ir].tot_pq;
        this.vr_wnocc[ir] = dxb.vr[ir].nocc;  this.vr_onw[ir] = 0;
        this.vr_worstpi[ir] = dxb.vr[ir].p_wi ;
      }
      this.m_wsumq = 0.0; this.m_wnocc = 0; this.m_worstpi = np ;
      this.m_wsumpq = 0.0; this.m_onw = 0;
      return(2); 
    }
    let onpi = mp0i;
    // When new_p0i, new_wpi rewritten every sum gets blanked out.
    // Note we calculate weights for first part of nw here:
    this.m_wsumq = dxb.m.v_q[onpi]; this.m_wnocc = 1; this.m_worstpi = onpi;
    this.m_onw = 0; 
    this.m_wsumq = dxb.m.v_q[onpi] * this.v_w[this.m_onw]; 
    this.m_wsumpq = dxb.m.v_q[onpi] * dxb.m.v_p[onpi] * this.v_w[this.m_onw]; 
    for (ir=0;ir<nr;ir++) {
      this.vr_wsumq[ir] = 0.0; this.vr_wsumpq[ir] = 0.0;  this.vr_onw[ir] = 0;
      this.vr_wnocc[ir] = 0; this.vr_worstpi[ir] = dxb.m.np;
      let onrpi = dxb.vr[ir].p0i;
      while ((onrpi < np) && (onrpi > onpi)) {
        this.vr_wsumq[ir] += dxb.vr[ir].v_q[onrpi] * this.v_w[this.m_onw];
        this.vr_wsumq[ir] += dxb.vr[ir].v_q[onrpi] * dxb.vr[ir].v_p[onrpi] * this.v_w[this.m_onw];
        this.vr_wnocc[ir] += 1; this.vr_worstpi[ir] = onrpi;
        onrpi = dxb.vr[ir].v_nxt[onrpi];
      }
    }
    // Note onw starts at 1 because onw first case already conducted. at A above
    for (onw=1;onw<nw;onw++) {
      if (onpi == 0) { break; }
      onpi = onpi -1;
      this.m_onw = onw;
      if (dxb.m.v_q[onpi] > 0) {
        this.m_wsumq += dxb.m.v_q[onpi] * this.v_w[onw]; this.m_wnocc+=1; 
        this.m_wsumpq += dxb.m.v_q[onpi] * dxb.m.v_p[onpi] * this.v_w[onw];
        this.m_worstpi = onpi;
      }
      for (ir=0;ir<nr;ir++) {
        if (dxb.vr[ir].v_q[onpi] > 0) {
          this.vr_wsumq[ir] += dxb.vr[ir].v_q[onpi] * this.v_w[onw];  this.vr_wnocc[ir] += 1;
          this.vr_wsumpq[ir] += dxb.vr[ir].v_q[onpi] * dxb.vr[ir].v_p[onpi] * this.v_w[onw];
          this.vr_worstpi[ir] = onpi;
        }
      }
    }
    return(6);
  }
  wp_b_move_in_weights_enforced(xb) {
    const dxb = (this.bs01 === 0) ? (xb.b) : (xb.s); 
    const np = dxb.m.np; const nr = dxb.vr.length; let ir = 0;
    if (this.m_worstpi >= mp0i) {
      console.log(`OneSideState: Weighted Worst Error, can't move past p0i=${mp0i}`);
      return(-1);
    }
    // Note enforcement doesn't happen on exo_decay type
    let new_worstwpi = dxb.m.v_prv[this.m_worstpi];
    for (ir=0;ir<nr;ir++) {
      while ((this.vr_worstpi[ir] < np) && (new_worstwpi > this.vr_worstpi[ir]))  {
        this.vr_wsumq[ir] -=  dxb.vr[ir].v_q[this.vr_worstpi[ir]] * 
                                 this.v_w[this.m_wnocc ];
        this.vr_wsumpq[ir] -= dxb.vr[ir].v_q[this.vr_worstpi[ir]] * 
                                 this.v_w[this.m_wnocc ] *
                                 dxb.vr[ir].v_p[this.vr_worstpi[ir]];
        if (this.vr_worstpi[ir] == dxb.vr[ir].p0i) {
          this.vr_worstpi[ir] = np;
        } else {
          this.vr_worstpi[ir] = dxb.vr[ir].v_prv[this.vr_worstpi[ir]];
        }
      }
    }
    // Market is only pushing once, and we are moving to new_wpi
    if ((this.m_worstpi < dxb.m.np) && (new_worstwpi < np)) { 
      this.m_wsumq -= dxb.m.v_q[this.m_worstpi] * this.v_w[this.m_wnocc];
      this.m_wsumpq -= dxb.m.v_q[this.m_worstpi] * this.v_w[this.m_wnocc] *
                          dxb.m.v_p[this.m_worstpi];
      if (this.m_worstpi >= mp0i) {
        this.m_worstpi = np;  // Can't think of why we would shrink past market bound
        this.m_wnocc = 0;
      } else {
        this.m_worstpi = dxb.m.v_prv[this.m_worstpi];
        this.m_wnocc = this.m_wnocc - 1
      }
    }
    return(1);
  }

  wp_b_move_out_weights_enforced(xb) {
    const dxb = (this.bs01 === 0) ? (xb.b) : (xb.s); 
    const np = dxb.m.np; const nr = dxb.vr.length; let ir = 0;
    const mp0i = dxb.m.p0i;  
    if (this.m_worstpi == mp0i) {
      console.log(`OneSideState: Weighted Worst Error, can't move past mp0i=${mp0i}`);
      return(-1);
    }
    // Note enforcement doesn't happen on exo_decay type
    let new_worstwpi = dxb.m.v_nxt[this.m_worstpi];
    if (new_worstwpi >= dxb.m.np) {
      console.log("OneSideState: move out weights enforced: Worst Pi has " +
                   "problems new_worstpi=" +
                   `${new_worstwpi}/${dxb.m.np} though this.m_wworstwpi=${this.m_worstpi}`);
    }
    for (ir=0;ir<nr;ir++) {
      while ((this.vr_worstpi[ir] < dxb.vr[ir].np) &&
        ( new_worstwpi > this.vr_worstpi[ir])) {
        this.vr_wsumq[ir] -= dxb.vr[ir].v_q[this.vr_worstpi[ir]] * this.v_w[this.m_wnocc];
        if (this.vr_worstpi[ir] == dxb.vr[ir].p0i) {
          this.vr_worstpi[ir] = dxb.vr[ir].np;
        } else {
          this.vr_worstpi[ir] = dxb.vr[ir].v_prv[this.vr_worstpi[ir]];
        }
      }
    }
    // Market is only pushing once, and we are moving to new_wpi
    if ((this.m_worstpi < dxb.m.np) && (new_worstwpi < dxb.m.np)) { 
      this.m_wsumq -= dxb.m.v_q[this.m_worstpi] * this.v_w[this.m_wnocc];
      this.m_wsumpq -= dxb.m.v_q[this.m_worstpi] * this.v_w[this.m_wnocc] *
                       dxb.m.v_p[this.m_worstpi];
      if (this.m_worstpi == mp0i) {
        this.m_worstpi = dxb.m.np;  // Can't think of why we would shrink past market bound
        this.m_wnocc = 0;
      } else {
        this.m_worstpi = dxb.m.v_prv[this.m_worstpi];
        this.m_wnocc = (this.m_wnocc - 1);
      }
    }
    return(1);
  } 
  wp_tester(xb, i_t) {
    return(
     (i_t==0) ? this.wp_b_move_in_no_force(0, xb) :
     (i_t==1) ? this.wp_b_move_out_no_force(0, xb) :
     (i_t==2) ? this.wp_b_move_in_enforced(0, xb) :
     (i_t==3) ? this.wp_b_move_out_enforced(0, xb) :
     (i_t==4) ? this.wp_reweight_num_filled(xb) :
     (i_t==5) ? this.move_out_to_target(xb, (this.bs01 === 0) ? (xb.b.m.np-1) : (xb.s.m.np-1), 0) :
     (i_t==6) ? this.wp_reweight_num_all(xb) :
     (i_t==7) ? this.wp_b_move_in_weights_enforced(xb) :
     (i_t==8) ? this.wp_b_move_out_weights_enforced(xb) :
     this.wp_b_move_out_weights_enforced(xb) 
    );  
  }
}


/// TotalCurrentState assembles the two One Side States together
class TotalCurrentState {
  kalgo = Kalgo.Unknown; b=null; s = null;
  verbose = 0; verbose_ob = {'s':[], verbose:0}; nk = 0; d0fd1 = -1;  nr = 0;
  constructor({v_in_d, v_in_fd, v_in_w, nr, kalgo, np_b, np_s, verbose}) {
    this.kalgo = isin_Kalgo(kalgo);
    if (this.kalgo === Kalgo.Unknown) {
      console.log("new: TotalCurrentState(kalgo supplied is Unknown!");
      return(-1);
    }
    this.d0fd1 = get_d0fd1(this.kalgo);
    this.nk = (this.d0fd1 == 0) ? v_in_d.length : v_in_fd.length;
    this.nr = nr;
    this.b = new OneSideState({'bs':"b", 'v_in_d':v_in_d, 'v_in_fd':v_in_fd, 
      'v_in_w':v_in_w, 'nr':nr, 'kalgo':this.kalgo, 'np':np_b});
    this.s = new OneSideState({'bs':"s", 'v_in_d':v_in_d, 'v_in_fd':v_in_fd, 
      'v_in_w':v_in_w, 'nr':nr, 'kalgo':this.kalgo, 'np':np_s});
    this.verbose = verbose;
    this.verbose_ob = {'s':[],verbose:verbose};
  }
  test_tcs_state_no_mkt(bs01, xb) {
    let n_err = 0;
    let dxb = (bs01 === 0) ?  xb.b : xb.s;
    let ocs = (bs01 === 1) ? this.b : this.s;
    const nr = dxb.vr.length; const np = dxb.m.np;
    let ir = 0;  let r_totq = 0; let r_tot_pq = 0; let onpi = 0;
    let worstpi = onpi;  let ik = 0;
    const c0 = "test_current_state no market, summing ";
    for (ir=0; ir < nr; ir++) {
      let r_tot_q = 0;  let r_tot_pq = 0;
      let onpi = dxb.vr[ir].p0i;
      let worstpi = onpi;
      while (onpi < np) {
        r_tot_q += dxb.vr[ir].v_q[onpi]; worstpi = onpi;
        r_tot_pq += dxb.vr[ir].v_q[onpi] * dxb.vr[ir].v_p[onpi]; 
        onpi = dxb.vr[ir].v_nxt[onpi];
      } 
      for (ik=0; ik < ocs.n_ld;ik++) {
        if (Math.abs(r_tot_q - ocs.v_1ls[ik].vr_csumq[ir]) > 0.001) {
          console.log(c0 + `r_tot_q=${r_tot_q}, ir=${ir}/${nr}` + 
            `for ik=${ik}/${ocs.n_ld}, sumq was ${ocs.v_1ls[ik].vr_csumq[ir]}`);
          n_err += 1;
        }
        if (Math.abs(r_tot_pq - ocs.v_1ls[ik].vr_csumpq[ir]) > 0.001) {
          console.log(c0 + `r_tot_pq=${r_tot_pq}, ir=${ir}/${nr}` + 
            `for ik=${ik}/${ocs.n_ld}, sumpq was ${ocs.v_1ls[ik].vr_csumpq[ir]}`);
          n_err += 1;
        }

        if (Math.abs(worstpi - ocs.v_1ls[ik].vr_worstpi[ir]) > 0.001) {
          console.log(c0 + `r_worstpi=${worstpi}, ir=${ir}/${nr}` + 
            `for ik=${ik}/${ocs.n_ld}, worstpi was ${ocs.v_1ls[ik].vr_worstpi[ir]}`);
          n_err += 1;
        }
      }
    }
    return n_err;
  }
}



export {Kalgo, isin_Kalgo, str_kalgo, und_str_kalgo, TotalCurrentState, OneLevelState,OneSideState, OneSideBook, OneSideCombinedBook, MarketExchangeBook, make_print_n};
