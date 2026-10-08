///~///////////////////////////////////////////////////////////////////
///  ord_algo.js
///
///  Home function running the orderbook algorithm
///
///
///
///
//
//
import { MarketExchangeBook, TotalCurrentState, OneSideState, OneSideCombinedBook, Kalgo, str_kalgo, isin_Kalgo, check_mc_m_algo, 
   calc_mc_m_algo, calc_mc_ir_algo} from "./ord_struct/index.js";
const PRINTNAN = -1.0;
const p_my_printer = require('../printer.js');
const is_numeric = p_my_printer.is_numeric;
const make_print_n = p_my_printer.make_print_n;
const my_printer = p_my_printer.my_printer;

// ESbuild will have "DEBUG" flag.
const DEBUG_MODE = ((DEBUG !== undefined) && (DEBUG !== null)) ? DEBUG : true;
// In general we are hoping people use TypeUpdate Enums correctly
const TypeUpdate = Object.freeze({
  "UpdateRelated":0,
  "CompletelyNewMarket":1,
  "NewMarketBestPrice":2,
  "NewMarketOtherPrice":3,
  "ModMarketExistQty":4,
  "DelMarketBestPrice":5,
  "DelMarketOtherPrice":6,
  "CompletelyDeleteMarket":7,
  "NoMarketChange":8,
  "Unknown":-1});

const isin_TypeUpdate = function(in_tu) {
  if (!(!(in_tu))) {
    if (Object.keys(TypeUpdate).includes(in_tu)) {
      return(TypeUpdate[in_tu]);
    }
    if (Object.values(TypeUpdate).includes(in_tu)) {
      const TUkeys = Object.keys(TypeUpdate);
      for (let ii = 0; ii < TUkeys.length; ii++) {
        if (TypeUpdate[TUkeys[ii]] === in_kalgo) { return(TypeUpdate[TUkeys[ii]]) }
      }
    }
  }
  return(TypeUpdate.Unknown); 
} 
const str_tu = function(int_tu) {
  if ((int_tu < -1) || (int_tu > 8)) {
    return("Unknown");
  }
  return(Object.keys(TypeUpdate).find(k=> TypeUpdate[k]===int_tu));
}
//let p_exports = {'TypeUpdate':TypeUpdate,'str_tu':str_tu,'isin_TypeUpdate':isin_TypeUpdate};
///~////////////////////////////////////////////////////////////////////////
///  A "null table"
///
///  If no data we will return this basic empty table. 
///  Of course, depending on user inputs, we might need to create a more complicated
///  table with arbitrary number of columns, so this is only a preliminary null
//
//  Of course, question is if javascript libraries eventually support Arrow Record Batch
const null_table = function(null_code, verbose) {
  verbose = Math.round(Number(verbose));
  if (verbose >= 1) {
    console.log(`-- ord_algo.js: we are returning a null table. null_code = ${null_code}`);
  }
  //let field_time = Field::new("time", DataType::Int64, false);
  //let vs: Vec<Field> = Vec<Field>::new();
  //vs.push(field_time);
  let tb = {'time': new BigInt64Array(0),
            'best_bid': new Float64Array(0),
            'best_ask': new Float64Array(0) }
  if (verbose >= 1) {
    console.log("ord_algo.js->null_table() we now have a table like object");
  }
  return(tb);
}
class best_vec {
  v=null;
  constructor({nrp1, nn}) {
    //println!("get_best_vec() sharing with nrp1={}, nn={}", nrp1, nn);
    this.v = [];
    if (nn < 0) {
      console.log("best_vec: Error nn supplied is " + nn);
    }
    //v_out.reserve(nrp1);
    //println!("get_best_vec(), we reserved a v_out of length {}.", v_out.len());
    for (let i =0;i < nrp1; i++) {
      //println!("get_best_vec(i={}/{}) - but nn={})", i, nrp1, nn);
      this.v.push(new Float64Array(Number(nn)));
    }
    //println!("--- We now have v_out populated.");
  }
  limit_splice(nin) {
    for (let i = 0; i < this.v.length; i++) {
      this.v[i] = this.v[i].subarray(0, nin);
    }
  }
}

// Int 64, Double, "Vectors" for output.
// Structure is   OB.k[0..nk][ir=0..nr(inclusive)]
//   Note k is the measurement, r is the related party.
class Kf64Vec {  
  k = null; nr = 0; nk = 0;
  // The Kf64Vec will store NN (or less) worth of information
  //  covering the many steps of the algorithm.
  constructor ({nn,nk,nr}) {
    nk = Math.round(Number(nk));
    nr = Math.round(Number(nr));
    nn = BigInt(nn);
    const nrp1 = (nr + 1);
    this.k = []; this.nr = nr; this.nk = nk;
    if (nk > 0) {
    for (let ik = 0; ik < nk; ik++) {
      this.k.push([]);
      for (let ir = 0; ir < nrp1; ir++) {
        this.k[ik].push(new Float64Array(Number(nn)));
      }
    }
    }
  }
  limit_splice(nin) {
    if (this.k.length > 0) {
      for (let ik = 0; ik < this.k.length; ik++) {
        for (let ir = 0; ir < this.k[ik].length; ir++) {
          (this.k[ik])[ir] = (this.k[ik])[ir].subarray(0, nin);
        }
      }
    }
  }
  shrink(ixmin, ixmax) {
    const new_n = ixmax-ixmin+1;
    const nk = this.nk;  const nr = this.nr;  
    // nk = my_this.data.ps.nk;  nr = my_this.data.ps.nr;
    let nvec = new Kf64Vec({'nn':new_n, 'nk':nk, 'nr':nr});
    const nrp1 = nr + 1;
    if (nk > 0) {
      for (let ik = 0; ik < nk; ik++) {
        for (let ir = 0; ir <  nrp1; ir++) {
          for (let ii = 0; ii < new_n; ii++) {
            ((nvec.k[ik])[ir])[ii] = ((this.k[ik])[ir])[ii + ixmin];
          }
        }
      }
    }
    return(nvec);
  }

}


// Note "nocc" is sort of more integer like, though I64 can be annoying if it doesn't support
//  NAN, all depends whether we are converting to Arrow Recordbatch at some point, which
//  will support NAN values.
class Ki64Vec {  
  k = null; nr = 0; nk = 0;
  // The Ki64Vec will store NN (or less) worth of information
  //  covering the many steps of the algorithm.
  constructor ({nn,nk,nr}) {
    nk = Math.round(Number(nk));
    nr = Math.round(Number(nr));
    nn = BigInt(nn);
    const nrp1 = (nr + 1);
    this.k = []; this.nr = nr; this.nk = nk;
    if (nk > 0) {
    for (let ik = 0; ik < this.k.length; ik++) {
      this.k.push([]);
      for (let ir = 0; ir < nrp1; ir++) {
        this.k[ik].push(new BigInt64Array(Number(nn)));
      }
    }
    }
  }
  limit_splice(nin) {
    if (this.k.length > 0) {
      for (let ik = 0; ik < this.k.length; ik++) {
        for (let ir = 0; ir < this.k[ik].length; ir++) {
          (this.k[ik])[ir] = (this.k[ik])[ir].splice(0, nin);
        }
      }
    }
  }
  shrink(ixmin, ixmax) {
    const new_n = ixmax-ixmin+1;
    let nvec = new Ki64Vec({'nn':new_n, 'nk':this.nk, 'nr':this.nr});
    const nrp1 = this.nr + 1;
    if (this.nk > 0) {
      for (let ik = 0; ik < this.nk; ik++) {
        for (let ir = 0; ir <  nrp1; ir++) {
          for (let ii = 0; ii < new_n; ii++) {
            ((nvec.k[ik])[ir])[ii] = ((this.k[ik])[ir])[ii + ixmin];
          }
        }
      }
    }
    return(nvec);
  }
}


class Ki32Vec {  
  k = null; nr = 0; nk = 0;
  // The Ki64Vec will store NN (or less) worth of information
  //  covering the many steps of the algorithm.
  constructor ({nn,nk,nr}) {
    nk = Math.round(Number(nk));
    nr = Math.round(Number(nr));
    nn = BigInt(nn);
    const nrp1 = (nr + 1); this.nk = nk; this.nr = nr;
    this.k = [];
    if (nk > 0) {
    for (let ik = 0; ik < nk; ik++) {
      this.k.push([]);
      for (let ir = 0; ir < nrp1; ir++) {
        this.k[ik].push(new Int32Array(Number(nn)));
      }
    }
    }
  }

  limit_splice(nin) {
    if (this.k.length > 0) {
      for (let ik = 0; ik < this.k.length; ik++) {
        for (let ir = 0; ir < this.k[ik].length; ir++) {
          (this.k[ik])[ir] = (this.k[ik])[ir].subarray(0, nin);
        }
      }
    }
  }
  shrink(ixmin, ixmax) {
    const new_n = ixmax-ixmin+1;
    let nvec = new Ki32Vec({'nn':new_n, 'nk':this.nk, 'nr':this.nr});
    const nrp1 = this.nr + 1;
    if (this.nk > 0) {
      for (let ik = 0; ik < this.nk; ik++) {
        for (let ir = 0; ir <  nrp1; ir++) {
          for (let ii = 0; ii < new_n; ii++) {
            ((nvec.k[ik])[ir])[ii] = ((this.k[ik])[ir])[ii + ixmin];
          }
        }
      }
    }
    return(nvec);
  }
}


class PrintStruct {
  kalgo=Kalgo.Unknown; nn=-1; nk=-1;nr=-1; verbose = -1;
  iprint=0;v_time=null;
  v_best_bids=null; v_best_asks=null;
  v_b_sum_q=null; v_s_sum_q=null;
  v_b_sum_pq=null;v_s_sum_pq=null;
  v_b_wp=null;v_s_wp=null;
  v_b_avp=null;v_s_avp=null;
  v_b_nocc=null;v_s_nocc=null;
  v_b_atq=null;v_x_atq=null; bi_st0=0n;
  n_change = 0; time_min = 0n;  time_max = 0n;
  w_sum_q = 0; w_sum_pq =0; w_nocc=0; w_avp=0; w_wp=0; w_atq=0; w_crit_pi=0; w_crit_p = 0;v_d=null; v_fd=null; d0fd1 = -1;
  count_tu = {};
  wpt = null;
  constructor({kalgo, nn, nk, nr, w_sum_q, w_sum_pq, w_nocc, w_avp, w_wp, w_atq, w_crit_pi, w_crit_p, verbose, d0fd1, v_d, v_fd, time_min, time_max, bi_st0}) {
    this.kalgo = isin_Kalgo(kalgo); this.kalgostr = str_kalgo(this.kalgo);  this.verbose = Number(verbose);
    if (this.verbose >= 1) {
      console.log(`new PrintStruct() start for nn=${nn}, nk=${nk}, nr=${nr}, kalgo=${str_kalgo(this.kalgo)} `);
    }
    const nrp1 = Math.round(Number(nr)) + 1;
    this.nn = BigInt(nn);
    this.nk = Math.round(Number(nk));
    this.nr = Math.round(Number(nr));
    if (this.verbose >= 2) {
      console.log(`ord_algo.rs->PrintStruct::new() getting get_best_vec, nrp1=${nrp1}, nn=${this.nn}`);
    }
    this.v_best_bids = new best_vec({'nrp1':nrp1, 'nn':nn}); 
    this.v_best_asks = new best_vec({'nrp1':nrp1, 'nn':nn}); 
    if (verbose >= 2) {
      console.log(`ord_algo.rs->PrintStruct::new() moving to gen v_b_sum_q for w_sum_q=${w_sum_q}, nn=${nn}, nk=${nk}, nr=${nr}`);
    }
    this.iprint = 0; this.count_tu = {};
    this.d0fd1 = d0fd1;
    this.v_d = (d0fd1 == 0 ?  v_d : v_fd); this.v_fd = (d0fd1==0) ? v_d : v_fd; 
    const nf = (x) => ((x===undefined) || (x===null)) ? 0 : x;
    this.w_sum_q = nf(w_sum_q); this.w_sum_pq = nf(w_sum_pq); this.w_nocc=nf(w_nocc); this.w_avp=nf(w_avp); this.w_wp = nf(w_wp);
    this.w_atq = nf(w_atq); this.w_crit_pi = nf(w_crit_pi);  this.w_crit_p = nf(w_crit_p);
    this.v_b_sum_q = (this.w_sum_q > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_s_sum_q = (this.w_sum_q > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_b_sum_pq = (this.w_sum_pq > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_s_sum_pq = (this.w_sum_pq > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_b_avp = (this.w_avp > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_s_avp = (this.w_avp > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_b_nocc = (this.w_nocc > 0) ? (new Ki32Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_s_nocc = (this.w_nocc > 0) ? (new Ki32Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_b_wp = (this.w_wp > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_s_wp = (this.w_wp > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_b_atq = (this.w_atq > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_s_atq = (this.w_atq > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':this.nr}) ) : null; 
    this.v_b_crit_pi = (this.w_crit_pi > 0) ? (new Ki32Vec({'nn':this.nn,'nk':this.nk,'nr':0}) ) : null; 
    this.v_s_crit_pi = (this.w_crit_pi > 0) ? (new Ki32Vec({'nn':this.nn,'nk':this.nk,'nr':0}) ) : null; 
    this.v_b_crit_p = (this.w_crit_p > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':0}) ) : null; 
    this.v_s_crit_p = (this.w_crit_p > 0) ? (new Kf64Vec({'nn':this.nn,'nk':this.nk,'nr':0}) ) : null; 
    this.time_min = time_min; this.time_max = time_max;
    this.v_time = new BigInt64Array(Number(nn));
    this.bi_st0 = bi_st0;
  }
  shrink(timeX0_bi, timeX1_bi) {
    const iprint = this.iprint; const v_time = this.v_time;
    let ix_min = -1; let ix_max = v_time.length-1; // ix_min = -1; ix_max = v_time.length-1;
    for (let ii = 1; ii < iprint; ii++) { 
       if (v_time[ii] > timeX0_bi) { if(ix_min < 0) { ix_min = ii-1; } }
       if (v_time[ii] > timeX1_bi) { ix_max = ii-1; break; }
    }
    let new_nn = ix_max - ix_min + 1;
    //console.log("shrink: ix_min=" + ix_min + "," + ix_max + ", new_nn=" + new_nn);
    if (new_nn < 0) {
      console.log(" Error, shrink: times [" + timeX0_bi + "," + timeX1_bi + "], but ix_min_max=[" + ix_min + "," + ix_max + "], new_nn=" + new_nn);
      debugger;
    }
    let new_ps = new PrintStruct({'kalgo':this.kalgo, 'nn':new_nn, 'nk':this.nk, 'nr':this.nr, 'w_sum_q':this.w_sum_q,
      'w_sum_pq':this.w_sum_pq, 'w_nocc':this.w_nocc, 'w_avp':this.w_avp, 'w_wp':this.w_wp, 'w_atq':this.w_atq, 'w_crit_pi':this.w_crit_pi, 'w_crit_p':this.w_crit_p,
      'verbose':this.verbose, 'd0fd1':this.d0fd1, 'v_d':this.v_d, 'v_fd':this.v_fd, 'time_min': timeX0_bi, 'time_max':timeX1_bi, 'bi_st0': this.bi_st0});
    new_ps.iprint = new_nn;
    new_ps.v_b_sum_q = (this.w_sum_q > 0) ? this.v_b_sum_q.shrink(ix_min, ix_max) : null;
    new_ps.v_s_sum_q = (this.w_sum_q > 0) ? this.v_s_sum_q.shrink(ix_min, ix_max) : null;
    new_ps.v_b_sum_pq = (this.w_sum_pq > 0) ? this.v_b_sum_pq.shrink(ix_min, ix_max) : null;
    new_ps.v_s_sum_pq = (this.w_sum_pq > 0) ? this.v_s_sum_pq.shrink(ix_min, ix_max) : null;
    new_ps.v_b_avp = (this.w_avp > 0) ? this.v_b_avp.shrink(ix_min, ix_max) : null;
    new_ps.v_s_avp = (this.w_avp > 0) ? this.v_s_avp.shrink(ix_min, ix_max) : null;
    new_ps.v_b_nocc = (this.w_nocc > 0) ? this.v_b_nocc.shrink(ix_min, ix_max) : null;
    new_ps.v_s_nocc = (this.w_nocc > 0) ? this.v_s_nocc.shrink(ix_min, ix_max) : null;
    new_ps.v_b_wp = (this.w_wp > 0) ? this.v_b_wp.shrink(ix_min, ix_max) : null;
    new_ps.v_s_wp = (this.w_wp > 0) ? this.v_s_wp.shrink(ix_min, ix_max) : null;
    new_ps.v_b_atq = (this.w_atq > 0) ? this.v_b_atq.shrink(ix_min, ix_max) : null;
    new_ps.v_s_atq = (this.w_atq > 0) ? this.v_s_atq.shrink(ix_min, ix_max) : null;
    new_ps.v_b_crit_pi = (this.w_crit_pi > 0) ? this.v_b_crit_pi.shrink(ix_min, ix_max) : null;
    new_ps.v_s_crit_pi = (this.w_crit_pi > 0) ? this.v_s_crit_pi.shrink(ix_min, ix_max) : null;
    new_ps.v_b_crit_p = (this.w_crit_p > 0) ? this.v_b_crit_p.shrink(ix_min, ix_max) : null;
    new_ps.v_s_crit_p = (this.w_crit_p > 0) ? this.v_s_crit_p.shrink(ix_min, ix_max) : null;
    new_ps.ix_min = ix_min; new_ps.ix_max = ix_max;
    new_ps.v_time = v_time.subarray(ix_min, ix_max+1);
    return(new_ps);
    // ix_min = ps_shrink.ix_min;  ix_max = ps_shrink.ix_max;  my_this.data.ps.v_b_crit_p.shrink(ix_min, ix_max);
  }
  splice_limit() {
    //console.log("splice_limit: Well lets take a look?");
    //debugger;
    this.v_time = this.v_time.subarray(0, this.iprint);
    this.v_best_bids.limit_splice(this.iprint);
    this.v_best_asks.limit_splice(this.iprint);
    if (this.v_b_sum_q !== null) { this.v_b_sum_q.limit_splice(this.iprint); }
    if (this.v_b_sum_pq !== null) { this.v_b_sum_pq.limit_splice(this.iprint); }
    if (this.v_b_avp !== null) { this.v_b_avp.limit_splice(this.iprint); }
    if (this.v_b_wp !== null) { this.v_b_wp.limit_splice(this.iprint); }
    if (this.v_b_atq !== null) { this.v_b_atq.limit_splice(this.iprint); }
    if (this.v_b_nocc !== null) { this.v_b_nocc.limit_splice(this.iprint); }
    if (this.v_b_crit_pi !== null) { this.v_b_crit_pi.limit_splice(this.iprint); }
    if (this.v_b_crit_p !== null) { this.v_b_crit_p.limit_splice(this.iprint); }
    if (this.v_s_sum_q !== null) { this.v_s_sum_q.limit_splice(this.iprint); }
    if (this.v_s_sum_pq !== null) { this.v_s_sum_pq.limit_splice(this.iprint); }
    if (this.v_s_avp !== null) { this.v_s_avp.limit_splice(this.iprint); }
    if (this.v_s_wp !== null) { this.v_s_wp.limit_splice(this.iprint); }
    if (this.v_s_atq !== null) { this.v_s_atq.limit_splice(this.iprint); }
    if (this.v_s_nocc !== null) { this.v_s_nocc.limit_splice(this.iprint); }
    if (this.v_s_crit_pi !== null) { this.v_s_crit_pi.limit_splice(this.iprint); }
    if (this.v_s_crit_p !== null) { this.v_s_crit_p.limit_splice(this.iprint); }
    this.nn = this.iprint;
  }
    // valid fragment specifiers are `ident`, `block`, `stmt`, `expr`, `pat`, `ty`, `lifetime`, `literal`, `path`, `meta`, `tt`, `item` and `vis`
  print_in(v_v,tcs_side,vr_val,m_val) {
    if (this[v_v] === null) { return; }
    let ik = 0; const iprint = this.iprint; let ir = 0; const nr = this[v_v].nr; const nk = this[v_v].nk;
    /*if ((this[v_v] === undefined) || (this[v_v] === null)) {
      console.log("print_in: error v_v=" + v_v + ", tcs_side=" + tcs_side + " not going to work."); debugger;
    }
    if ((this[v_v].k === undefined) || (this[v_v] === null)) {
      console.log("print_in: error v_v=" + v_v + ", but its k is null"); debugger;
    }*/
    if (nk > 0) {
      for (ik=0;ik<nk;ik++) {
        if (nr > 0) {
          for (ir=0;ir<nr;ir++) { 
            ((this[v_v].k[ik])[ir])[iprint] = ((tcs_side.v_1ls[ik])[vr_val])[ir];
            if ((this.n_change == 0) && ( ((this[v_v].k[ik])[ir])[iprint] != 
                                        ((this[v_v].k[ik])[ir])[iprint-1] )) { 
              this.n_change += 1; 
            }
          }
        }
        ((this[v_v].k[ik])[nr])[iprint] = (tcs_side.v_1ls[ik])[m_val]; 
        if (isNaN((tcs_side.v_1ls[ik])[m_val])) {
          console.log("Error, ik = " + ik + "/" + this.nk + ", m_val = " + m_val + " we get tcs_side.v_1ls is NaN");
          debugger; 
        }
        if ( (this.n_change == 0) && ( ((this[v_v].k[ik])[nr])[iprint] != 
                                     ((this[v_v].k[ik])[nr])[iprint-1] )
           ) { 
          this.n_change += 1; 
        }
      }
    }
  }

  print_in_avp(v_v,tcs_side) {
    if ((this[v_v] === null) || (this[v_v] === undefined)) { return; }
    let ik = 0; const iprint = this.iprint; let ir = 0; const nr = this[v_v].nr;
    //console.log("Let's look at avp: tcs_side = " + ((tcs_side.bs01==0) ? "B" : "S")); debugger;
    if (this[v_v].k.length > 0) {
      for (ik=0;ik<this.nk;ik++) {
        if (this.nr > 0) {
        for (ir=0;ir<this.nr;ir++) { 
          const onq = tcs_side.v_1ls[ik].vr_csumq[ir]; 
          const avp = tcs_side.v_1ls[ik].vr_csumpq[ir] / onq;
          ((this[v_v].k[ik])[ir])[iprint] = (onq >= 0) ? avp : PRINTNAN;
          if ( 
               (this.n_change == 0) && ( ((this[v_v].k[ik])[ir])[iprint] != 
                                       ((this[v_v].k[ik])[ir])[iprint-1] ) 
             ) { 
            this.n_change += 1; 
          }
        }}
        const m_onq = tcs_side.v_1ls[ik].m_csumq;
        const m_avp = tcs_side.v_1ls[ik].m_csumpq / m_onq;
        ((this[v_v].k[ik])[nr])[iprint] = m_onq > 0 ? m_avp : PRINTNAN;
        if  ( (this.n_change == 0) && ( ((this[v_v].k[ik])[nr])[iprint] != 
                                      ((this[v_v].k[ik])[nr])[iprint-1] ) 
            ) { 
            this.n_change += 1; 
        }
      }
    }
  } 

  print_in_worst_price(v_v,tcs_side,xb_side) {
    if ((this[v_v] === null) || (this[v_v] === undefined)) { return; }
    let ik = 0; const iprint = this.iprint; let ir = 0; const nr = this[v_v].nr;
    const v_p = xb_side.m.v_p;
    if (this[v_v].k.length > 0) {
      for (ik=0;ik<this.nk;ik++) {
        for (ir=0;ir<this.nr;ir++) { 
          const ir_wp = (tcs_side).v_1ls[ik].vr_worstpi[ir];
          if ((ir_wp < 0) || (ir_wp >= v_p.length)) {
            //if (xb_side.vr[ir].p0i < v_p.length) {
            //  console.log("print_in_worst_price: Error, ir_wp = " + ir_wp); 
            //  console.log(" -- note ir=" + ir + "/" + this.nr + ", ik=" + ik + "/" + this.nr + " for side " + 
            //    ((tcs_side.bs01 === 0) ? "B" : "S") + ", with p0i = " + xb_side.vr[ir].p0i + ".");
            //  debugger;
            //}
          }
          ((this[v_v].k[ik])[ir])[iprint] = v_p[ir_wp];
          if ( (this.n_change == 0) && ( ((this[v_v].k[ik])[ir])[iprint] != 
                                         ((this[v_v].k[ik])[ir])[iprint-1] )
             ) { 
            this.n_change += 1; 
          }
        }
        const im_wp = (tcs_side).v_1ls[ik].m_worstpi;
        if ((im_wp < 0) || (im_wp >= v_p.length)) {
          if (xb_side.m.p0i < v_p.length) {
            console.log("print_in_worst_price: Error, im_wp = " + im_wp + " but xb_side + " + 
              ((xb_side.bs01==0) ? "B" :"S") + " is len " + v_p.length); debugger;
          }
        }
        ((this[v_v].k[ik])[nr])[iprint] = v_p[im_wp]; 
        if ( (this.n_change == 0) && ( ((this[v_v].k[ik])[nr])[iprint] != 
                                       ((this[v_v].k[ik])[nr])[iprint-1] ) 
           ) { 
          this.n_change += 1; 
        }
      }
    }
  }

  print_in_crit_pi(v_v,tcs_side) {
    if ((this[v_v] === null) || (this[v_v] === undefined)) { return; }
    let ik = 0; const iprint = this.iprint; let ir = 0; const nr = this[v_v].nr;
    if (this[v_v].k.length > 0) {
      for (ik=0;ik<this.nk;ik++) {
        const on_wpi = (tcs_side).v_1ls[ik].crit_pi;
        this[v_v].k[ik][0][iprint] = on_wpi
      }
    }
  }
  print_in_crit_p(v_v,tcs_side,xb_side) {
    if ((this[v_v] === null) || (this[v_v] === undefined)) { return; }
    let ik = 0; const iprint = this.iprint; let ir = 0; const nr = this[v_v].nr;
    const v_p = xb_side.m.v_p;
    if (this[v_v].k.length > 0) {
      for (ik=0;ik<this.nk;ik++) {
        const on_wpi = (tcs_side).v_1ls[ik].crit_pi;
        const on_wp = v_p[on_wpi];
        this[v_v].k[ik][0][iprint] = on_wp
      }
    }
  }
  update_tu(tu) {
    const strtu = str_tu(tu);
    if (strtu in this.count_tu) {
      this.count_tu[strtu] = this.count_tu[strtu]+1;
    } else {
      this.count_tu[strtu] = 1;
    }
    return(this.count_tu[strtu]);
  }
  check_count_tu() {
    let out_d = {};
    const kTypeUpdate = Object.keys(TypeUpdate);
    for (let ii = 0; ii < kTypeUpdate.length; ii++) {
      if (!(kTypeUpdate[ii] in this.count_tu)) {
        out_d[kTypeUpdate[ii]] = 0;
      } else {
        out_d[kTypeUpdate[ii]] = this.count_tu[kTypeUpdate[ii]];
      }
    }
    return(out_d); 
  }
  export_reduced_table(list_u_c, name_uc, onk, onr) {
    console.log("export_reduced_table: launched");
    const tthis = this;

    if ((tthis.v_time === null) || ((tthis.iprint <= 0))) { return(null); }
    // list_u_c = ['v_best_bids','v_best_asks']; name_uc = ['nbb','nbo']; onk=0; onr=0;tthis = my_this.data.ps;
    let expl = {'time':[tthis.v_time[0]]};
    for (let kk = 0; kk < list_u_c.length; kk++) {
      if ((list_u_c[kk] == 'v_best_bids') || (list_u_c[kk] == 'v_best_asks')) {
        expl[name_uc[kk]] = [tthis[list_u_c[kk]].v[onr][0]];
      } else {
        expl[name_uc[kk]] = [tthis[list_u_c[kk]].k[onk][onr][0]];
      }
    }
    for (let tt = 1; tt < tthis.iprint; tt++) {
      let isdiff = 0;
      for (let kk = 0; kk < list_u_c.length; kk++) {
        if ((list_u_c[kk] == 'v_best_bids') || (list_u_c[kk] == 'v_best_asks')) {
          if (tthis[list_u_c[kk]].v[onr][tt] != tthis[list_u_c[kk]].v[onr][tt-1]) {
            isdiff = 1; break;
          }
        } else {
          if (tthis[list_u_c[kk]].k[onk][onr][tt] != tthis[list_u_c[kk]].k[onk][onr][tt-1]) {
            isdiff = 1; break;
          }
        }
      }
      if (isdiff > 0) {
        expl['time'].push(tthis.v_time[tt]);
        for (let kk = 0; kk < list_u_c.length; kk++) {
          if ((list_u_c[kk] == 'v_best_bids') || (list_u_c[kk] == 'v_best_asks')) {
            expl[name_uc[kk]].push(tthis[list_u_c[kk]].v[onr][tt])
          } else {
            expl[name_uc[kk]].push(tthis[list_u_c[kk]].k[onk][onr][tt])
          }
        }
      }
    }
    return(expl);
  }
  export_reduced_table_all_k(list_u_c, name_uc, onr) {
    console.log("export_reduced_table: launched");
    const tthis = this;
    // list_u_c = ['v_best_bids','v_best_asks']; name_uc = ['nbb','nbo']; onk=0; onr=0;tthis = my_this.data.ps;
    let expl = {'time':[tthis.v_time[0]]};
    for (let jj = 0; jj < list_u_c.length; jj++) {
      if ((list_u_c[jj] == 'v_best_bids') || (list_u_c[jj] == 'v_best_asks')) {
        expl[name_uc[jj]] = [tthis[list_u_c[jj]].v[onr][0]];
      } else {
        expl[name_uc[jj]] = [];
        for (let kk = 0; kk < tthis[list_u_c[jj]].k.length; kk++) {
          expl[name_uc[jj]].push([tthis[list_u_c[jj]].k[kk][onr][0]]);
        }
      }
    }
    for (let tt = 1; tt < tthis.iprint; tt++) {
      let isdiff = 0;
      for (let jj = 0; jj < list_u_c.length; jj++) {
        if ((list_u_c[jj] == 'v_best_bids') || (list_u_c[jj] == 'v_best_asks')) {
          if (tthis[list_u_c[jj]].v[onr][tt] != tthis[list_u_c[jj]].v[onr][tt-1]) {
            isdiff = 1; break;
          }
        } else {
          for (let kk = 0;kk < tthis[list_u_c[jj]].k.length;kk++) {
            if (tthis[list_u_c[jj]].k[kk][onr][tt] != tthis[list_u_c[jj]].k[kk][onr][tt-1]) {
              isdiff = 1; break;
            }
          }
          if (isdiff > 0) { break; }
        }
      }
      if (isdiff > 0) {
        expl['time'].push(tthis.v_time[tt]);
        for (let jj = 0; jj < list_u_c.length; jj++) {
          for (let kk = 0; kk < tthis[list_u_c[jj]].k.length;kk++) { 
            if ((list_u_c[jj] == 'v_best_bids') || (list_u_c[jj] == 'v_best_asks')) {
              expl[name_uc[jj]].push(tthis[list_u_c[jj]].v[onr][tt]);
            } else {
              expl[name_uc[jj]][kk].push(tthis[list_u_c[jj]].k[kk][onr][tt]);
            }
          }
        }
      }
    }
    return(expl);
  }
  print_state(tcs, xb, curtime) {
    // tcs: total current state,
    // xb: State of MarketExchangeBook
    // curtime: Current time
    this.n_change = 0;  // Might not print new values unless change
    const iprint = this.iprint + 0;
    if (iprint == 0) { this.n_change = 1; }
    if (this.iprint >= this.nn) {
      console.log(`print_state(curtime=${curtime}): uh-oh, iprint=${iprint}, nn=${this.nn}.`);
    }
    const nr = xb.b.vr.length;
    const nk = tcs.b.v_1ls.length;
    const nbp = xb.b.m.np;  const nsp = xb.s.m.np;

    this.v_time[iprint] = BigInt(curtime);
    let ir=0;
    //console.log("Lets look at print state."); debugger;
    for (ir=0;ir<nr;ir++) {
       if (xb.b.vr[ir].p0i < nbp) {
         (this.v_best_bids.v[ir])[iprint] = xb.b.vr[ir].v_p[xb.b.vr[ir].p0i];
       } else {
         (this.v_best_bids.v[ir])[iprint] = PRINTNAN;
       }
       if ( (this.n_change == 0) && 
            (this.v_best_bids.v[ir])[iprint] != (this.v_best_bids.v[ir])[(iprint-1)]
          ) { 
         this.n_change += 1;
       }
    }
    if (xb.b.m.p0i < nbp) {
      (this.v_best_bids.v[nr])[iprint] = xb.b.m.v_p[xb.b.m.p0i];
    } else {
      (this.v_best_bids.v[nr])[iprint] = PRINTNAN; 
    }
    if ( (this.n_change == 0) && 
         (this.v_best_bids.v[nr])[iprint] != (this.v_best_bids.v[nr])[iprint-1]) { 
      this.n_change += 1; 
    }
    for (ir=0;ir<nr;ir++) {
      if (xb.s.vr[ir].p0i < nsp) {
        (this.v_best_asks.v[ir])[iprint] = xb.s.vr[ir].v_p[xb.s.vr[ir].p0i];
      } else {
        (this.v_best_asks.v[ir])[iprint] = PRINTNAN; 
      }
      if ( (this.n_change == 0) && 
           (this.v_best_asks.v[ir])[iprint] != (this.v_best_asks.v[ir])[iprint-1]
         ) { 
        this.n_change += 1; 
      }
    }
    if (xb.s.m.p0i < nsp) {
      (this.v_best_asks.v[nr])[iprint] = xb.s.m.v_p[xb.s.m.p0i];
    } else {
      (this.v_best_asks.v[nr])[iprint] = PRINTNAN; 
    }
    if  ( (this.n_change == 0) && 
          (this.v_best_asks.v[nr])[iprint] != (this.v_best_asks.v[nr])[iprint-1]
        ) { 
       this.n_change += 1; 
    }
    // Note printing columns is complex, many columns of ir/ik variety.
    // Things work fine but "nocc" is a u32 though we probably want to be 
    // lazy and print as f64 anyway.
    this.print_in( "v_b_sum_q", tcs.b, "vr_csumq", "m_csumq");
    this.print_in( "v_s_sum_q", tcs.s, "vr_csumq", "m_csumq");
    this.print_in( "v_b_sum_pq", tcs.b, "vr_csumpq", "m_csumpq");
    this.print_in( "v_s_sum_pq", tcs.s, "vr_csumpq", "m_csumpq");
    this.print_in( "v_b_atq", tcs.b, "vr_atq", "m_atq");
    this.print_in( "v_s_atq", tcs.s, "vr_atq", "m_atq");
    this.print_in_worst_price( "v_b_wp", tcs.b, xb.b);
    this.print_in_worst_price( "v_s_wp", tcs.s, xb.s);
    this.print_in( "v_b_nocc", tcs.b, "vr_nocc", "m_nocc");
    this.print_in( "v_s_nocc", tcs.s, "vr_nocc", "m_nocc");
    this.print_in_avp( "v_b_avp", tcs.b);
    this.print_in_avp( "v_s_avp", tcs.s);
    this.print_in_crit_pi( "v_b_crit_pi", tcs.b );
    this.print_in_crit_pi( "v_s_crit_pi", tcs.s );
    this.print_in_crit_p('v_b_crit_p',tcs.b,xb.b);
    this.print_in_crit_p('v_s_crit_p',tcs.s,xb.s);
    const rec_change = this.n_change + 0;
    if (rec_change > 0) {
      this.iprint += 1;  this.n_change = 0;
    }
    return(rec_change);
  }
  head_print_vp(b_str, s_str) {
    const nr = this.nr; const anr = Array.from({ length:nr}, (_, i) => i);
    return( b_str + "_m" + "," + s_str + "_m" + 
            ((nr <= 0) ? "" :
             "," + anr.map((x)=>(b_str + "_r" + (""+x) + "," + s_str + "_r" + (""+x))).join(",")) )
  }
  ix_print_vp(b_side, s_side, ii) {
     const nr = this.nr; const anr = Array.from({length:nr}, (_, i)=>i);
     //if ((b_side === null) || (b_side===undefined) || (this[b_side] === null) || 
     //    (this[b_side] === undefined) || (this[s_side] === null) || (this[s_side] === undefined)) {
     //  console.log("ix_print_vp: we have b_side,s_side invalid on ii=" + ii + ",(" + b_side + "," + s_side + ")");
     //  debugger;
     //}
     return(((this[b_side].v)[nr])[ii] + "," + ((this[s_side].v)[nr])[ii] +
            ((nr <= 0) ? "" : 
             "," + anr.map((x)=>( ((this[b_side].v)[x])[ii] + "," + ((this[s_side].v)[x])[ii])).join(",")));
  }
  head_print_vk(b_str, s_str) {
    const nk = this.nk; const ank = Array.from({length:nk}, (_,i)=>i);
    const nr = this.nr; const anr = Array.from({length:nr}, (_,i)=>i);
    return( ank.map((ik)=> ( b_str + "_" + this.v_d[ik] + "_m," + 
                             s_str + "_" + this.v_d[ik] + "_m" + 
                             ((nr <=0) ? "" :
                              "," + anr.map((ir)=>( b_str+"_"+this.v_d[ik] + "_r" + ir + "," + 
                                                    s_str+"_"+this.v_d[ik] + "_r" + ir )).join(","))
                           )).join(",")
          )
  }
  ix_print_vk(b_side, s_side,ii) {
    const nk = this.nk; const ank = Array.from({length:nk}, (_,i)=>i);
    const nr = this.nr; const anr = Array.from({length:nr}, (_,i)=>i);
    return( ank.map((ik)=> ( ((this[b_side].k[ik])[nr])[ii] + "," +
                             ((this[s_side].k[ik])[nr])[ii] +
                             ((nr <=0) ? "" :
                              "," + anr.map((ir)=>( ((this[b_side].k[ik])[ir])[ii] + "," +
                                                    ((this[s_side].k[ik])[ir])[ii] ) ).join(","))   
                           )).join(",")
          )
  }
  head_csv_map() {
    return(  "time" + "," + 
             this.head_print_vp("bb", "bo") + 
             ((this.w_sum_q===0) ? "" :
              "," + this.head_print_vk("b_tq", "s_tq")) +
             ((this.w_sum_pq===0) ? "" :
              "," + this.head_print_vk("b_tdol", "s_tdol")) +
             ((this.w_atq===0) ? "" :
              "," + this.head_print_vk("b_atq", "s_atq")) +
             ((this.w_nocc===0) ? "" :
              "," + this.head_print_vk("b_nocc", "s_nocc")) +
             ((this.w_avp===0) ? "" :
              "," + this.head_print_vk("v_b_avp", "v_s_avp")) +
             ((this.w_wp===0) ? "" :
              "," + this.head_print_vk("v_b_wp", "v_s_wp"))
    );
  }
  ix_csv_map(ii) {
    if ((ii < 0) ||  (ii >= this.iprint)) { return(""); }
    return(  this.v_time[ii] + "," + 
             this.ix_print_vp("v_best_bids", "v_best_asks", ii) + 
             ((this.w_sum_q===0) ? "" :
              "," + this.ix_print_vk("v_b_sum_q", "v_s_sum_q",ii)) +
             ((this.w_sum_pq===0) ? "" :
              "," + this.ix_print_vk("v_b_sum_pq", "v_s_sum_pq",ii)) +
             ((this.w_atq===0) ? "" :
              "," + this.ix_print_vk("v_b_atq", "v_s_atq",ii)) +
             ((this.w_nocc===0) ? "" :
              "," + this.ix_print_vk("v_b_nocc", "v_s_nocc",ii)) +
             ((this.w_avp===0) ? "" :
              "," + this.ix_print_vk("v_b_avp", "v_s_avp",ii)) +
             ((this.w_wp===0) ? "" :
              "," + this.ix_print_vk("v_b_wp", "v_s_wp",ii))

    )
  }
  csv_export() {
    const rows =  Array(this.iprint).fill("");
    for (let ii =0; ii < this.iprint;ii++) {
      rows[ii] = this.ix_csv_map(ii);
    }
    return(this.head_csv_map() + "\n" +   
           rows.join("\n"));
  }
}

const example_oa_data = {
  vs : [  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  0,  1,  1,  1,  1,  1,  1,  1,  1,  1,  1],
  vp : [  1,  1,  1, 10, 10, 10, 11, 11, 11, 12, 12, 12, 12, 12, 13, 13, 14, 14, 40, 40, 40],
 vmq : [  5, 20,  5, 20, 40, 20, 20,  0, 20,  5,  0,  5,  0,  5, 10, 20, 50, 20,  5, 40,  5],
  vt : [ 0n, 2n, 6n, 0n, 1n, 3n, 1n, 3n, 5n, 6n, 8n, 1n, 5n, 9n, 0n, 4n, 1n, 7n, 0n, 2n, 4n].map(x=>x*1000n),
 vrq : [  5, 15,  0, 20, 20,  0, 10,  0, 10,  5,  0,  5,  0,  1,  5, 10, 10, 10,  5, 35,  0],
 vir : [  0,  1,  1,  1,  0,  1,  0,  0,  0,  1,  1,  0,  0,  0,  1,  1,  0,  0,  0,  1,  0]
};
const merge_oads = function(oads) {
   if (oads.length === 1) { return(oads); }
   return({'b':merge_oads_bs01(oads,0),'s':merge_oads_bs01(oads,1)});
}
// v_p0 = [10,10,14,14,11,11,15]; v_pi0 = [0,0,2,2,1,1,3]
// u_p0 = [10,11,14,15]; u_p1= [10,13,16],u_p2=[10,11,17];
// set_u_p = [10,11,13,14,15,16,17]
// unmap_all = Object.fromEntries(set_u_p.map((k,i)=>[k,i])); 
// unimap = u_p0.map((x)=>unmap_all[x])
// unmaps_0 = Object.fromEntries(unimap.map((k,i)=>[i,k])); 
// v_pi0.map((x)=>unmaps_0[x])
const merge_oads_bs01 = function(oads,bs01) {
  // Merging Tallied functions.
  //
  // Proposal, We will have different market and related streams we have to tally separately
  //   (Related number any where from 0 to ... 10?)
  // To merge back we need a tally algorithm.  We are hoping this is relatively fast though of course
  // it is possibly easier to map complete vectors than one at a time.  
  let all_u_p = (bs01===0) ? [...oads[0].b.u_p] : [...oads[0].s.u_p]
  let ii = 0;
  if (bs01===0) {
    for (ii=1;ii<oads.length;ii++) {
      all_u_p.push(...oads[ii].b.u_p)
    }
  } else {
    for (ii=1;ii<oads.length;ii++) {
      all_u_p.push(...oads[ii].s.u_p)
    }
  }
  const set_u_p = (on_bs01==0) ? [...new Set(all_u_p)].sort() : [...new Set(all_u_p)].sort((a,b)=>b-a); 
  let iis = Array(len(oads)).fill(0);
  let ii_n = 0; let n_n = 0;
  const unmap_all = Object.fromEntries(set_u_p.map((k,i)=>[k,i]));
  let umaps = [];
  if (bs01==0) {
    for (ii=0;ii<oads.length;ii++) {
      n_n += oads[ii].b.vpi.length;
      const unimap = oads[ii].b.u_p.map((x)=>unmap_all[x]);
      umaps.push(Object.fromEntries(unimap.map((k,i)=>[k,i])))
    }
  } else {
    for (ii=0;ii<oads.length;ii++) {
      n_n += oads[ii].s.vpi.length;
      const unimap = oads[ii].s.u_p.map((x)=>unmap_all[x]);
      umaps.push(Object.fromEntries(unimap.map((k,i)=>[i,k])))
    }
  }
  const vt = BigInt64Array(n_n);
  const vpi = Array(n_n);  const vq = Array(n_n); const vir = Array(n_n);
  const nr = oads.length -1;
  if (bs01==0) {
    for (ii_n=0;ii_n<n_n;ii++) {
      let on_a = 0; let on_t = oads[0].b.vt[iis[0]];
      for (ii=1;ii<oads.length;ii++) {
        if (oads[ii].b.vt[iis[ii]] < on_t) {
          on_t = oads[ii].b.vt[iis[ii]];  on_a = ii;
        }
      }
      vpi[ii_n] = (umaps[on_a])[oads[on_a].b.vpi[iis[on_a]]];
       vq[ii_n] = oads[on_a].b.vq[iis[on_a]];
      vir[ii_n] = (on_a==0) ? nr : on_a-1;
       vt[ii_n] = oads[on_a].b.vt[iis[on_a]];
      iis[on_a] += 1;
    }
  } else {
    for (ii_n=0;ii_n<n_n;ii++) {
      let on_a = 0; let on_t = oads[0].s.vt[iis[0]];
      for (ii=1;ii<oads.length;ii++) {
        if (oads[ii].s.vt[iis[ii]] < on_t) {
          on_t = oads[ii].s.vt[iis[ii]];  on_a = ii;
        }
      }
      vpi[ii_n] = (umaps[on_a])[oads[on_a].s.vpi[iis[on_a]]];
       vq[ii_n] = oads[on_a].s.vq[iis[on_a]];
      vir[ii_n] = (on_a==0) ? nr : on_a-1;
       vt[ii_n] = oads[on_a].s.vt[iis[on_a]];
      iis[on_a] += 1;
    }
  } 
  return({vpi:vpi,vq:vq,vir:vir,vt:vt,u_p:set_u_p});
}
const pivot_oa_data_bs01 = function(oad, bs01) {
  const vt = oad.vt.filter((x,i)=>{return(oad.vs[i]==bs01)});
  const vp = oad.vp.filter((x,i)=>{return(oad.vs[i]==bs01)});
  const u_p = (bs01 == 0) ? [...new Set(vp)].sort((a,b)=>a-b) : [...new Set(vp)].sort((a,b)=>b-a);
  const umap = Object.fromEntries(u_p.map((k, i) => [k, i]))
  const vpi = vp.map((x)=>umap[x]);
  let ii = 0;
  let idx = Array(vt.length);
  for (ii = 0; ii < idx.length; ii++) { idx[ii] = ii; }
  idx.sort((a,b)=>{ return ((vt[a] === vt[b]) ? (vpi[a]-vpi[b]) : Number(vt[a] -vt[b]))});
  const st1 = {vp:idx.map((x)=>vp[x]),
               vpi:idx.map((x)=>vpi[x]),
               vt:idx.map((x)=>vt[x]),
               vmq:idx.map((x)=>(oad.vmq.filter((x,i)=>oad.vs[i]==bs01))[x]),
               vir:idx.map((x)=>(oad.vir.filter((x,i)=>oad.vs[i]==bs01))[x]),
               vrq:idx.map((x)=>(oad.vmq.filter((x,i)=>oad.vs[i]==bs01))[x])};
  const u_ir = [...new Set(st1.vir)].sort((a,b)=>a-b);
  const nm = u_ir.length;
  let st0 = {vpi:[...st1.vpi],vt:[...st1.vt],vq:[...st1.vmq],vir:Array(st1.vt.length).fill(nm), u_p:u_p}
  for (ii = 0; ii < nm; ii++) {
    st0.vpi.push(...st1.vpi.filter((x,i)=>st1.vir[i]==u_ir[ii]));
    st0.vt.push(...st1.vt.filter((x,i)=>st1.vir[i]==u_ir[ii]));
    st0.vq.push(...st1.vrq.filter((x,i)=>st1.vir[i]==u_ir[ii]));
    st0.vir.push(...Array(  st1.vir.filter((x,i)=>st1.vir[i]==u_ir[ii]).length ).fill(u_ir[ii]));
  }
  for (ii =0; ii < st0.vpi.length; ii++) { idx[ii] = ii; }
  idx.sort((a,b)=> { return ((st0.vt[a]===st0.vt[b]) ? ((st0.vpi[a]===st0.vpi[b]) ? ( st0.vir[a]-st0.vir[b]) : (st0.vpi[a]-st0.vpi[b])): Number(st0.vt[a]-st0.vt[b])) })

  // So here we propose a new "orderbook input" (splitting buys and sells into two input categories)
  //   These 4 are long vectors same length:
  // vpi -- indexed price
  //  vt -- times of the
  //  vq -- quantity vector
  // vir -- indicator of "market" (if vir[on_i]=nr) or "related" (vir[on_i] < nr)
  //
  // Finally a unique price vector comes along for ride:
  // u_p -- unique prices, sorted increasing for Buy type, decreasing for Sell type
  return({vpi:idx.map((x)=>st0.vpi[x]),
           vt:idx.map((x)=>st0.vt[x]),
           vq:idx.map((x)=>st0.vq[x]),
          vir:idx.map((x)=>st0.vir[x]),
          u_p:u_p
  })
}

const pivot_oa_data = function(oad) {
  return({'b':pivot_oa_data_bs01(oad,0),'s':pivot_oa_data_bs01(oad,1)});
}
///  order_algo() parent algorithm
///
///  In Rust, The main algorithm needs to own the input data and datastructures, thus it can be hard
///    for it not to orchestrate not just algorithm, but also datastructure construction and output
///    construction.
///
///   inputs: 
///      vin columns from input table:
///        vin_01_side, vin_02+_price, vin_03_ir, vin_04_qty,
///      The inputs "vin" come from an Arrow Table given to the algorithm from lib.rs.  Vectors
///      bprices/sprices should be unique and sorted (sprices will be reverse sorted)
///      (vin_03_ir: id of registrant for record, rqty: registrants quantity, mqty: market
///      quantity)
///      v_bprices,v_sprices: Buy and Sell list of distinct prices to use
///      Note if nr > 1 then if vin_03_ir < nr then indicator of registrant quantity.
///
///   Critical Data objects:
///     matched_pi: An integer price index match to v_prices/v_sprices vectors
///     tcs: TotalCurrentState -- State of the calculated system including running totals
///     xb:  MarketExchangeBook -- State of the exchanges and Market in running dataset
///     ps: PrintStruct -- On a change, we print the new state onto a running series of vectors
///         These are approximately prepared to write to a final output arrow table
///
///   matched_pi is a match between v_bprices/v_sprices and the price vector.
///      This allows us to look up prices in lists without using hash or floating point looked up.
///
///   The MarketExchangeBook: will record price locations and state of all orders on exchange
///   TotalCurrentState: will be State of the algorithm's sums and statistics.
///
///   On change, tcs:TotalCurrentState is printed into a running series of vectors contained in
///     ps:PrintStruct, the printing structure.  The structure itthis.does not necessarily
///     copy straight into final output arrow table

//vin_00_time, vin_01_side, vin_02_price, vin_03_ir, vin_04_qty, 
const order_algo =  function(oad,
   v_in_d, v_w,
   kalgoint, w_sum_q, w_sum_pq, w_avp, w_wp, w_nocc, w_atq, w_crit_pi, w_crit_p,
   verbose_ob, time_min, time_max)  {
  const v_ob = verbose_ob;  const verbose = v_ob.verbose;
  const PRINT_N = make_print_n(v_ob, "ord_algo.js->order_algo(v=" + v_ob.verbose + ") : ");
  DEBUG &&  PRINT_N(0, " NOTE: DEBUG_MODE is Activated");
  if ( (oad.nr === null) || (oad.nr === false) || (oad.nr === undefined) || (typeof(oad.nr) != 'number')  || (oad.nr < 0)) {
    PRINT_N(-1, " ORDER ALGO, supply nr in oad object.");  return(-40302);
  }   
  if ( (!(!(!(oad.b)))) ||  (!(!(!(oad.s)))) ) {
    PRINT_N(-1, " ORDER ALGO, oad.b or oad.s. are empty? "); return(-40403);
  }
  const nr = oad.nr;
  const nt_s = oad.s.vt.length; const nt_b = oad.b.vt.length;
  const nt = nt_s + nt_b;
  const nk = v_in_d.length;
  const v_d = [...v_in_d].map((x)=>Math.round(x)).sort((a,b)=>a-b);; 
  const v_fd = [...v_in_d].sort((a,b)=>a-b);
  DEBUG && PRINT_N(1, " Note kalgoint supplied is [" + kalgoint + "] and it converts to :{" + 
   isin_Kalgo(kalgoint) + ":" + str_kalgo(isin_Kalgo(kalgoint)) + " }");
  const kalgo = isin_Kalgo(kalgoint);

  DEBUG && PRINT_N(1, ` ---- Initiate, nt_s=${nt_s}, verbose=${v_ob.verbose}. `);
  let iit = 0n; let ir = 0;
  if (kalgo === Kalgo.Unknown) {
    PRINT_N(-6, `: Error, kalgoint supplied is Kalgo Unknown for ${kalgoint} for kalgo=${str_kalgo(kalgo)}`);
    return(-104032);
  }
  DEBUG && PRINT_N(1, ` we converted kalgoint=${kalgoint} to kalgo=${str_kalgo(kalgo)}.`);

  const v_bprices = [...oad.b.u_p].sort((a,b)=>a-b); const v_sprices = [...oad.s.u_p].sort((a,b)=>b-a);
  DEBUG && PRINT_N(1, " we have sorted and modified v_bprices, v_sprices."); 

  // Sorted Index of time.
  //let t_ord = new BigInt64Array(Number(nt));
  //for (iit=0n; iit < nt; iit++) {
  //  t_ord[iit] = BigInt(iit);
  //}
  //t_ord.sort((t_ord_x,t_ord_y) => { return(vin_00_time[t_ord_x] < vin_00_time[t_ord_y]); }); 
  DEBUG && PRINT_N(1, " we have generated sorted t_ord of length ${t_ord.length}."); 
 
  const xb = new MarketExchangeBook({"v_b_p_in":v_bprices, "v_s_p_in":v_sprices, "nr":nr, "verbose":v_ob.verbose});
  //console.log("check xb"); debugger;
  DEBUG && PRINT_N(1, " Initiate new TotalCurrentState with kalgo = " + kalgo + ":" + str_kalgo(kalgo) + 
    ", v_d.length=" + (((v_d === undefined) || (v_d === null)) ? 0 : v_d.length) + "," + 
    " v_fd.length=" + (((v_fd === undefined) || (v_fd === null)) ? 0 : v_fd.length) + "."); 
  const tcs = new TotalCurrentState({"v_in_d":v_d, "v_in_fd":v_fd, "v_in_w":v_w, 
    "nr":nr, "kalgo":kalgo, "np_b":v_bprices.length, "np_s":v_sprices.length, "verbose": v_ob.verbose});


  const ps = new PrintStruct(
     {"kalgo":kalgo, "nn":nt, "nk":nk, "nr":nr, "w_sum_q":w_sum_q, "w_sum_pq":w_sum_pq, "w_nocc":w_nocc,
      "w_avp":w_avp, "w_wp":w_wp,  "w_atq":w_atq, 'w_crit_pi':w_crit_pi, 'w_crit_p':w_crit_p, "verbose":v_ob.verbose,
      "d0fd1":tcs.d0fd1, "v_d":v_d, "v_fd": v_fd, "time_min":time_min, "time_max":time_max, 'bi_st0':oad.bi_st0});
  DEBUG && PRINT_N(1, ` Print Struct has been generated for w_sum_q=${w_sum_q}, ` +  
                `w_sum_pq=${w_sum_pq}, w_avp=${w_avp}, w_wp=${w_wp}`); 

  // This will contain information on what most recent algorithmic update classified as.
  let tu = TypeUpdate.Unknown;
  if (nr != xb.b.vr.length) {
    PRINT_N(-6, ` -- well nr=${nr} but xb.b.vr.length=${xb.b.vr.length} this is error`);
    return(-50340323);
  }
  DEBUG && PRINT_N(3,` --  xb.v=${xb.verbose} -- tcs.kalgo=${tcs.kalgo}, tcs.b.kalgo=${str_kalgo(tcs.b.kalgo)}` + 
                `, tcs.b.v_1ls[0].d0fd1=${tcs.b.v_1ls[0].d0fd1}`);
  DEBUG && PRINT_N(3,`n_ld = ${tcs.b.n_ld}, m_wsumq=${tcs.b.m_wsumq}, m_wsumpq=${tcs.b.m_wsumpq}, ` + 
                `vr_wsumq=${ (nr > 0) ? tcs.b.vr_wsumq[0] : -1 }, ` + 
                `vr_wsumpq=${ (nr > 0) ? tcs.b.vr_wsumpq[0] : -1 }, ` + 
                `m_worstpi=${tcs.m_worstpi}, vr_worstpi=${(nr > 0) ? tcs.b.vr_worstpi[0] : -1} `);
  DEBUG && PRINT_N(3, ` m_wnocc=${tcs.b.m_wnocc}, vr_wnocc[0] = ${(nr>0) ? tcs.b.vr_wnocc[0] : -1 }, ` + 
                ` m_onw=${tcs.b.n_onw}, vr_onw[0]=${(nr>0) ? tcs.b.vr_onw[0] : -1}`);

  DEBUG && PRINT_N(1, " -- About to run matchprice() ");

  //const matched_pi = matchprice(v_bprices, v_sprices,
  //  vin_00_time, vin_01_side, vin_02_price, verbose - 2);
  DEBUG && PRINT_N(1, ` -- testing quality of matched prices, necessary?`);
  let n_err = 0;
  // Test Match not performed because matched_pi not generated.
  //if (!(!(DEBUG_MODE))) {
  //  n_err = test_match(matched_pi, v_bprices, v_sprices, vin_01_side, vin_02_price);
  //}
  //if (n_err > 0) {
  //  PRINT_N(-6, `Error on generation of matched_pi, please fix this algo. `);
  //  return(null_table(3, 1));
  // }
  DEBUG && PRINT_N(2, ` congrats, test_match had n_err=${n_err}`);
  let d_code = 0n; let d_code_r = 0n;
  if (DEBUG) {
    if (v_ob.verbose >= 1) {
      PRINT_N(1, ` -- About to begin the ii loop. start d_code=${d_code}, d_code_r=${d_code_r}.`);
      if (v_ob.verbose >= 10) {
        const crit1 = tcs.crit_move_in(xb, "B", 0);
        const crit2 = tcs.crit_move_out(xb, "B", 0);
        PRINT_N(10, ` test of Kalgo gets crit1=${crit1}, crit2=${crit2}, xb.b.bs=${xb.b.bs}, xb.b.m.bs=${bs.b.m.bs}.`);
      }
    }
  }
 
  let former_time = BigInt((oad.b.vt[0] <= oad.s.vt[0]) ? oad.b.vt[0] : oad.s.vt[0]); 
  let ii_s = 0; let ii_b = 0; let ii_n = 0;
  for (ii_n=0; ii_n < nt; ii_n++) {
    const on_bs01 = (ii_b>=nt_b) ? 1 : ((ii_s >= nt_s) ? 0 : ((oad.b.vt[ii_b] <= oad.s.vt[ii_s]) ? 0 : 1));

    const ooad = on_bs01 == 0 ? oad.b : oad.s; const on_i = on_bs01==0 ? ii_b : ii_s; const on_t=ooad.vt[on_i];
    DEBUG && PRINT_N(5, " Start ii_n=" + ii_n + "/" + nt + ": ii_b=" + ii_b + "/" + nt_b + ", ii_s=" + ii_s + "/" + nt_s + ", on_bs01=" + on_bs01+"t=" + on_t);

    if (former_time > ooad.vt[on_i]) {
      PRINT_N(-6, "  -- time sequence error on ooad.vt[" + on_i + "]");
      PRINT_N(-6, "ERROR out of time order compute on Order Algo.  former_time=" + former_time + ", onbs01=" + on_bs01 + 
         " for vt[" + on_i + "] = " + ooad.vt[on_i] + " overall ii_n=" + ii_n + "/" + nt);
      debugger;
    }
    former_time = BigInt(ooad.vt[on_i]);

    const old_mp0i = (on_bs01==0) ? xb.b.m.p0i : xb.s.m.p0i;
    const on_pi = ooad.vpi[on_i];
    const np = (on_bs01==0) ? (xb.b.m.v_p.length) : (xb.s.m.v_p.length);
    const on_r = (ooad.vir !== null)  && (ooad.vir !== undefined) ? ooad.vir[on_i] : 0;  

    const old_p0i = (on_r < nr) ? ((on_bs01===0) ? xb.b.vr[on_r].p0i : xb.s.vr[on_r].p0i) : old_mp0i;
    if ((on_pi < 0) || (on_pi >= np)) {
      PRINT_N(-6, "ERROR, ii_n" + ii_n + "/" + nt + ", on_pi = " + on_pi + " for bs01=" + on_bs01 + ", np=" + np);
      tu = TypeUpdate.Unknown;
      PRINT_N(-6, `Error State: This can't be true bs01=${on_bs01}, and we checked,ii_n=${ii_n},` + 
                  ( (on_bs01==0) ? ("ii_b="+ii_b+"/" +nt_b) : ("ii_s="+ii_s+"/"+nt_s)) + 
                  "on_pi=" + (on_pi) + "/" + ((on_bs01===0) ? v_bprices.length : v_sprices.length) + ".");
      PRINT_N(-6, "Failed Error State(on_bs01=" + on_bs01 + "): " + str_tu(tu) + ".");
      return(null_table(4,1));
    }
    const on_p = (on_bs01===0) ? xb.b.m.v_p[on_pi] : xb.s.m.v_p[on_pi];
    const on_new_q = ooad.vq[on_i]; 
    //if (ii_n == 1) { console.log("ERROR to Debugger, on_r = " + on_r); debugger;}
    const old_q = ( (on_r < nr) ?  ((on_bs01===0) ? xb.b.vr[on_r].v_q[on_pi] : xb.s.vr[on_r].v_q[on_pi]) :
                                   ((on_bs01===0) ? xb.b.m.v_q[on_pi] : xb.s.m.v_q[on_pi]) );
    if (DEBUG) {
      if ((v_ob.verbose >= 5) || ((v_ob.verbose >= 2) && (ii_n % 1000 == 0))) {
        PRINT_N(2, "(ii_n=${ii_n}, " +
                  ((on_bs01==0) ? ("ii_b="+ii_b + "/" + oad.b.vt.length) : ("ii_s="+ii_s+"/" + oad.s.vt.length)) + 
                  "\"" + tcs.b.kalgo + "\") " +
                  `(sd,pi($p),ir,q)=(${(on_bs01==0)? 'B' : 'S'},${on_pi}/(${on_p}),` +
                  `${on_r}/${nr},${on_new_q}, ` + 
                  `${(on_bs01===0) ? 'b' : 's'}.p0i=${(on_bs01==0) ? xb.b.m.p0i : xb.s.m.p0i}/` + 
                  `${(on_bs01===0) ? xb.b.m.np : xb.s.m.np}, ${(on_bs01===0) ?'b':'s'}.v_1ls[0].crit_pi=` + 
                  `${(on_bs01==0) ? tcs.b.v_1ls[0].crit_pi : tcs.s.v_1ls[0].crit_pi}`);
      //if (nr > 0) {
      //  let more_str = "vr_p0i[";
      //  for (ir =0; ir < nr; ir++) {
      //    more_str = more_str + ((on_bs01==0) ? xb.b.vr[ir].p0i : xb.s.vr[ir].p0i);
      //    if (ir < xb.b.vr.length -1) { a_str = a_str + ","; }
      //  }
      //  more_str = more_str + '];';
      //  PRINT_N(2, more_str);
      //}
    }}
    d_code_r = 0;
    if (old_q === on_new_q) {
      // NOTHING TO DO THIS CASE, registrant or Market
      tu = TypeUpdate.NoMarketChange; d_code = 0;
      ps.update_tu(tu);
    } else if ((nr>0) && (on_r < nr)) {
       if (old_q == on_new_q) {
         d_code_r = 0;
       } else {
         d_code_r = tcs.update_tcs_r_ir(xb, on_r, on_bs01,
           on_pi, on_new_q); 
         tu = TypeUpdate.UpdateRelated;
        
         if (DEBUG) {
           // Note Rust function was called "checkbook": Altered for JS to "check_mc_m_algo()";
           // In production checking is unnecessary, but during debug it is probably useful to check
           // every iteration
           //console.log("First HALT on Debug"); debugger;
           n_err = check_mc_m_algo(kalgo, xb, tcs, ii_n, (on_bs01==0 ? ii_b : ii_s), nt, on_bs01, old_p0i, str_tu(tu));
           if (n_err > 0) {
             PRINT_N(-6, "---------------------------------------------------------------------------");
             PRINT_N(-6, "ERROR TRIGGERED after update_tcs_r_ir: returns n_err=" + n_err + ".");
             PRINT_N(-6, ` --- ERROR ON CHECK --- n_err=${n_err}`);
             PRINT_N(-6, "Note: " + ((on_bs01==0) ? "b" : "s") + ", on_r=" + on_r + "/" + nr + ".");
             PRINT_N(-6, `--------------------- ERROR after on_r=${on_r}/${nr} update, upd_type=${str_tu(tu)}. (ii_n=${ii_n},` +
                        `${(on_bs01===0)? "ii_b" : "ii_s"}=${(on_bs01===0)? ii_b: ii_s},nt=${nt},` + 
                        ` on_r=${on_r}/${nr}), n_err = ${n_err}, d_code_r = ${d_code_r}`);
             PRINT_N(-6, `---- We are on matched price = ${on_pi}/${np} = ` + 
                         ((on_bs01===0) ? xb.b.m.v_p[on_pi] : xb.s.m.v_p[on_pi]) + 
                         `, on_r=${on_r}/${nr}, old_mp0i=${old_mp0i}/${np}=${(on_bs01===0)? xb.b.m.v_p[old_mp0i] : xb.s.m.v_p[old_mp0i]}, ` + 
                         `new qty=${on_new_q}, old qty=${old_q}`);
             PRINT_N(-6, "on_r=" + on_r + "/" + nr + ", and on_pi=" + on_pi + " and on_new_q=" + on_new_q + " versus old_q=" + old_q);
             PRINT_N(-6, "d_code_r was " + d_code_r);
             debugger;
             return("ERROR");
           }

           if ((n_err === 0) && (v_ob.verbose >= 3)) {
             PRINT_N(3, "ii_n=" + ii_n + "/" + nt + ", " +
               ((on_bs01==0) ? ("ii_b=" + ii_b + "/" + nt_b) : 
                        ("ii_s=" + ii_s + "/" + nt_s) ) + " PASS CHECK, nerr=0.");
           }
        }
      }
      ps.update_tu(tu);
    } else if (on_new_q <= 0.0) { 
      if ( ((on_bs01 == 0) && (on_pi == xb.b.m.p0i)) ||
           ((on_bs01 == 1) && (on_pi == xb.s.m.p0i)) )  {
        if (((on_bs01 == 0) && (xb.b.m.nocc == 1)) || 
              ((on_bs01 == 1) && (xb.s.m.nocc == 1))) {
          d_code = tcs.completely_kill_market(xb, on_bs01);
          tu = TypeUpdate.CompletelyDeleteMarket;
        } else {
          d_code = tcs.delete_market_best_price(xb, on_bs01); 
          tu = TypeUpdate.DelMarketBestPrice;
        }
      } else { 
        d_code = tcs.delete_market_other_price(xb, on_bs01, on_pi);
        tu = TypeUpdate.DelMarketOtherPrice;
      } 
    } else {
      // Cleaned up duplication in definition of tu in a marketable case
      //  Because sprices reverse sorted and bprices sorted increasing, we can use
      //  on_pi > old_mp0i as proxy for "new best price"
      if (np<=old_mp0i) {
        // Empty market add a best price
        d_code = tcs.completely_new_market_best_price(xb, on_bs01, on_pi, on_new_q);   
        tu = TypeUpdate.CompletelyNewMarket;
      } else if (on_pi > old_mp0i) {
        d_code = tcs.new_market_best_price(xb, on_bs01, on_pi, on_new_q);   
        tu = TypeUpdate.NewMarketBestPrice; 
      } else if (old_q <= 0.0) {
        d_code = tcs.new_market_other_price(xb, on_bs01, on_pi, on_new_q);
        tu = TypeUpdate.NewMarketOtherPrice;
      } else {
        d_code = tcs.mod_qty_at_price(xb, on_bs01, on_pi, on_new_q);
        tu = TypeUpdate.ModMarketExistQty;
      }
    }  
    if (DEBUG) {
      if ((verbose >= 5) || ((verbose >= 2) && (BigInt(ii_n) % BigInt(1000) == 0n))) {
        PRINT_N(2, "ii_n=" + ii_n + "/" + nt + " -- Update, before Checkbook, upd_type=\"" + str_tu(tu) + "\", " + 
          `d_code=${d_code}, ${(on_bs01===0 ? "b":"s")}.crit_pi[0] = ` + 
          ((on_bs01 == 0) ? (tcs.b.v_1ls[0].crit_pi) : (tcs.s.v_1ls[0].crit_pi)) );
      }
    }

    if (DEBUG) {
      // Only check errors in debug mode, this completely duplicates calculation with slower, more
      // patient check and validates the faster calculation
      n_err = check_mc_m_algo(kalgo, xb, tcs, ii_n, ((on_bs01==0) ? ii_b: ii_s), nt, on_bs01, old_p0i, str_tu(tu));
      if ((n_err === 0) && (verbose >= 3)) {
        PRINT_N(3, "ii_n=" + ii_n + "/" + nt + ", " +
        ((on_bs01==0) ? ("ii_b=" + ii_b + "/" + nt_b) : 
                        ("ii_s=" + ii_s + "/" + nt_s) ) + " PASS CHECK, nerr=0.");
      }
      // Note, this code is just because Rust compiler complains about unused functions that we have
      // for redundancy
      if ((n_err > 0) && (verbose >= -1)) {
        PRINT_N(-6, "ERROR - calc_mc_m_algo_test returned " + n_err + " errors.");
        const mc = calc_mc_m_algo(kalgo, xb, tcs, on_bs01, 0);
        PRINT_N(-6, "calc_mc_m_algo() -- mc returns " + mc.total_q + ", " +
                mc.total_pq + ", " + mc.worstpi + ", " + mc.nocc + ", " + xb.b.bs);
        const mc_r = calc_mc_ir_algo(kalgo, xb, tcs, on_bs01, 0,0);
        PRINT_N(-6, "calc_mc_ir_algo() -- mc[ir=0] returns " + mc_r.total_q + ", " + 
          mc_r.total_q + ", " + mc_r.total_pq+ ", " + mc_r.worstpi + ", " + mc_r.nocc); 
        const critpi = tcs.crit_move_any(xb, on_bs01, 0, 0, kalgo);
        console.log("tcs.crit_move_any(0) returns tpi=" + critpi);
        if (tcs.b.v_1ls.length > 0) {
          const move_in_test = tcs.b.v_1ls[0].move_in_to_crit(xb, critpi, on_bs01, 0);
          console.log("--- calc returned move_in_test = " +  move_in_test + ".");
          if (tcs.b.v_1ls.length > 0) {
            tcs.b.v_1ls[0].quality_check(0, 0, mc_r.nocc, mc_r.total_q, mc_r.worstpi, mc_r.total_pq);
            if (tcs.b.kalgo == "ExpDecay") {
              tcs.test_exp_decay_ir(on_bs01, xb, 0, verbose);
            }
            const ttsnm = tcs.test_tcs_state_no_mkt(on_bs01, xb);
            console.log("ord_algo, we tested test_tcs_state_no_mkt=" + ttsnm);
          }
        if (xb.b.m.p0i < xb.b.m.np-1) {
            PRINT_N(-6, ` --- HEY WE ARE RUNNING SOME SORT OF DESTRUCTIVE TEST.`);
            const nrp = tcs.new_related_price(xb, 0, on_bs01, 0,0.0); 
            console.log("Hopefully new related price didn't change anything, nrp=" + nrp);
            const nmbp=tcs.new_m_best_price(xb, on_bs01, xb.b.m.p0i + 1, 400.0);
            console.log("nmbp  -- new_m_best_price() tested:: we have some issue with nmbp = " + nmbp);
            const umabp = tcs.update_mq_at_bestprice(xb, on_bs01, 400.0, xb); 
            console.log("umabp -- update_mq_at_bestprice -- we got umabp = " + umabp);
            const up_w_w = tcs.upd_w_window(xb, on_bs01, xb.b.m.p0i, 100.0, 200.0, 0);
            console.log("up_w_w:  upd_w_window() we got " +  up_w_w + ".");
            const a_wt = tcs.b.wp_tester(xb, 0);
            console.log("up_w_w, wp_tester returned " + a_wt);

            const rbpeb = tcs.rewrite_best_price_exp_decay(xb, on_bs01); 
            const ribpex = tcs.rewrite_ik_best_price_exp_decay(xb, on_bs01, 0);
            console.log(" we have rbpeb = " + rbpeb + ", ribpex=" + ribpex + ".");
          }
        }
      }
      if (n_err > 0) { return("ERROR"); }
    }
    if (d_code < 0) {
      PRINT_N(-6, "Error state, d_code returned of type " + d_code + ", d_code_r=" + d_code_r + 
               ", for update of type " + str_tu(tu) + ", n_err was " + n_err + (", [ii_n=" + ii_n + "/" + nt + ",") +
               ((on_bs01===0) ? ("ii_b="+ii_b+"/"+oad.b.vt.length) : ("ii_s="+ii_s+"/"+oad.s.vt.length)) + 
               "] on_pi=" + on_pi + ",on_bs01=" + on_bs01 + 
               ", " + ((on_r < nr)?("r[" + on_r + "/" + nr+"]"):"m") + "qty=" + ooad.vq[on_i] + "."); 
      PRINT_N(-6, "ERROR ERROR ERROR ERROR we have to Break!");
      break;
    } 
    const next_t = ( (ii_n == nt-1) ? (on_t+1n < time_min ? time_min : on_t+1n) :
                     (  (on_bs01==0) ? 
                          ((ii_b+1===oad.b.vt.length) ? 
                             oad.s.vt[ii_s] :
                             ((oad.b.vt[ii_b+1] <= oad.s.vt[ii_s]) ? oad.b.vt[ii_b+1] : oad.s.vt[ii_s])
                          )
                        : ((ii_s+1===oad.s.vt.length) ?
                             oad.b.vt[ii_b] :
                             ((oad.s.vt[ii_s+1] < oad.b.vt[ii_b] ? oad.s.vt[ii_s+1] : oad.b.vt[ii_b]))
                          )
                      )
                   );
     ps.update_tu(tu);
     if (on_t <= time_min) {
      if (next_t > time_min) {
        const old_iit = ps.iprint;
        const nch = ps.print_state(tcs, xb, BigInt(time_min));
        if (DEBUG) {
          if (verbose >= 2) {
            if (old_iit != ps.iprint) {
              PRINT_N(2, "  --- INITIAL print ii_n=" + ii_n +"/" + nt + ", " + 
                ((on_bs01==0) ? ("ii_b="+ii_b+"/"+oad.b.vt.length) : ("ii_s="+ii_s+"/"+oad.s.vt.length)) + 
                "old_iit=" + old_iit + ", iprint=" + ps.iprint + ", n_change=" + nch + ", time_min=" + time_min + ".");
            }
          }
        }
      } else {
        DEBUG && PRINT_N(3, "  --- Too early on [ii_n=" + ii_n + "/" + nt +"," + 
              ((on_bs01==0) ? ("ii_b="+ii_b+"/"+oad.b.vt.length) : ("ii_s="+ii_s+"/"+oad.s.vt.length)) +
              "]: " + ooad.vt[on_i]);
      }
    } else if (next_t > on_t) {
      const old_iit = ps.iprint;
      const nch = ps.print_state(tcs, xb, BigInt(on_t));
      if (verbose >= 3) {
        if (old_iit != ps.iprint) {
          DEBUG && PRINT_N(3, "  --- successful print ii_n=" + ii_n +"/"+nt + "," +
              ((on_bs01==0) ? ("ii_b="+ii_b+"/"+oad.b.vt.length) : ("ii_s="+ii_s+"/"+oad.s.vt.length)) + 
              " on_t=" + on_t + ", next_t=" + next_t + ", iprint=" + ps.iprint + ", n_change=" + nch + ".");
        }
      }
    }
    if (n_err > 0) {
      DEBUG && PRINT_N(-6, "Error state[iit=" + iit + "," + itr + "/" + nt_s + "] upd_type=" + str_tu(tu) + 
                  ", d_code=" + dd_code + ", d_code_r=" + d_code_r + ", n_err from checkbook returned as " + n_err + ".");
      break;
    }
    if ((ii_n >= nt-1) || (next_t > time_max)) {
      DEBUG && PRINT_N(1, "We reach time_max=" + time_max + ", for ii_n=" + ii_n + "/" + nt + "," + 
            ((on_bs01==0) ? ("ii_b="+ii_b+"/"+oad.b.vt.length) : ("ii_s="+ii_s+"/"+oad.s.vt.length))  +
           " for time=" + on_t + ", next_t = " + next_t);
      break;
    }
    if (on_bs01 == 0) { ii_b++; } else { ii_s++; }
    //debugger;
  }
  PRINT_N(1, " --- Note time_max was " + time_max);
  PRINT_N(1, " --- We have exited loop, we are nearly completed with no errors.  Now to convert PrintState to a RecordBatch");
  ps.splice_limit();
  ps.xb = xb;  ps.tcs = tcs;
  PRINT_N(1, " --- Splice Limit successful.");
  // Note we might not do this in most javascript, as this is completely finished record batch.
  //const rb = ps.make_record_batch(tcs, verbose);
  //return(rb);
  // Returning PrintStruct as it was generated with all of the summary data.
  return(ps);
}

const p_exports = {'order_algo':order_algo, 'PrintStruct':PrintStruct,
                   'Kf64Vec':Kf64Vec,'Ki64Vec':Ki64Vec,'isin_TypeUpdate':isin_TypeUpdate,
                   'TypeUpdate':TypeUpdate, 'str_tu':str_tu,'null_table':null_table, 'is_numeric':is_numeric,
                   'example_oa_data':example_oa_data,'pivot_oa_data':pivot_oa_data, 'pivot_oa_data_bs01':pivot_oa_data_bs01,
                   'make_print_n':make_print_n, 'isin_Kalgo': isin_Kalgo, 'Kalgo':Kalgo, 'str_kalgo':str_kalgo, 'Ki32Vec':Ki32Vec};
module.exports = p_exports;
//export {order_algo, PrintStruct, Kf64Vec,Ki64Vec, isin_TypeUpdate,TypeUpdate,str_tu,null_table, is_numeric, 
//        example_oa_data, pivot_oa_data, pivot_oa_data_bs01};
