///~//////////////////////////////////////////////////////////////////////
/// sip_algo.js
///
///  Alan Lenarcic, First In Rust November 2024, Copied to Javascript July 2026
///
/// Algorithms for calculating the National Best Bid/Offer from a running
///  feed of uqdf/cqs System Information Processors (SIP) feed are ubiquitous
///  and a basic challenge.
///
/// Here we adapt a typical direct C-based strategy using Rust idioms.
///
/// We keep a running vector of the best price/best offer of the n_venues
/// 
/// The current state is stored in a TSip object ("tsip" in this case).
/// The state is updated with the next record (record index "i_r" in 0..n_r
/// Each record updates the best bid and/or best ask from one venue.
///
/// We merely need to identify if this venue is joining the national best
///   bid or offer, or if it sets a new better price, if the venue is 
///   leaving the nbbo or, if the change is merely at later venues.
///
/// We can store a simple binary structure which records exactly which venues
///   stand at the maximum in each state.  (this is tsip.b.b2v or tsip.s.b2v)
///   That way, we are not spending much time
///
/// We record each step in RecSip/VPublishSip structures. We only need one
///   but it is useful to conser column-based and row-based published records
/// This affects whether we can the array in an Arrow based structure
///   or a numpy--pandas based structure
///
/// Numpy (rec arrays that map to pandas) can be a more common tabular 
///   structure returned by algorithms.  However, there are not easy programatic
///   safe ways to generate an arbitrary shaped numpy table in rust.
///   (This is hard to do with C-Api too, its easier to declare these in python)
///
/// Arrow is a more unsual tabular structure to emit results in, but these results
///   can be saved immediately to disk as .parquet, so they are potentially
///   platform agnostic (python/R/lua all accept these. 
///
/// It should be possible to very quickly evaluate multiple millions of these records
///   in a second.
///
/// The only extra challenge to this algorithm is that it is difficult to predict
///   how many "useful" changes occure.  Any time there a is a record that doesn't
///   change the NBBO meaningfully (it depends what the user thinks is meaningful)
///   or if two records share the same timestamp and happen "simultaneously" and
///   we don't want to record an artificial intermediary state.  
//
import {TSip, RecSip, VPublishSip, B2Vs, NMAXBITVENS, NMAXVENS} from './sip_struct.js';
//use crate::sip_struct::{PublishSipI};
import {dt64_string, u64_string} from './sip_struct.js';


const print_env = require('../printer.js');
const make_print_n = print_env.make_print_n;
const is_numeric = print_env.is_numeric;
const DEBUG_ALGO = 0;

const sip_demo_data = {
  'time':[  0n,  0n,500n,600n, 700n,1000n,5000n,6000n,6100n, 6200n, 8000n,8000n,9000n,10000n,10000n],
   'ven':[   0,   1,   2,   0,    1,    1,    2,    0,    0,     2,     1,    0,    2,     0,     1],
    'bp':[ 100,  99, 100, 101,   80,  100,  101,  100,  100,     0,   100,   99,  100,     0,    99],
    'bq':[ 100, 100, 200, 150,   50,   80,  250,  150,  200,     0,   150,  200,  100,     0,   100],
    'sp':[ 102, 102, 103, 103,  104,  103,    0,    0,    0,   105,   104,  104,  103,     0,   102],
    'sq':[ 100, 200, 200, 100,  100,  100,    0,    0,    0,   120,   100,  150,  200,     0,   199]
};


// verbose_ob = {'s':[],'verbose':2}; verbose=2; PRINT_N=make_print_n(verbose_ob, 'BASIC:');
// We only really need rec_sip implementation given benefit to our Javscript datastructures 
const compute_sip_nbbo_rec_sip = function(n_venues, vt_in, vb_q_in, vs_q_in, 
  vb_p_in, vs_p_in, vb_v_in, vs_v_in, verbose_ob) { 
  const Nn_r = Number(vt_in.length);
  const BIn_r = BigInt(Nn_r);
  const stt = ("sip_algo.compute_sip_nbbo_rec_sip(n=" + Number(Nn_r) + ",n_v=" + n_venues + "): ");
  const verbose = verbose_ob.verbose;
  const PRINT_N = make_print_n(verbose_ob, stt);
  if ( (BIn_r != vb_q_in.length) || (BIn_r != vb_p_in.length) || (BIn_r != vb_v_in.length) ||
      (BIn_r != vs_q_in.length) || (BIn_r != vs_p_in.length) || (BIn_r != vs_v_in.length) ) {
    PRINT_N(0, ( (`- lens:[vt=${vt_in.length},vb_p=${vb_p_in.length},vb_q=${vb_q_in.length}`) +
      `vb_v=${vb_v_in.length},vs_p=${vs_p_in.length},vs_q=${vs_q_in.length},vs_v=${vs_v_in.length}]` + 
      ". -- ERROR should return"));
    return(null);
  }
  if (n_venues < 0) { console.log("ERROR " + stt + " n_venues is " + n_venues); return(null); }
  PRINT_N(0, "sip_algo.rs->compute_sip_nbbo_rec_sip(vb="+verbose +", n_venues=" + n_venues + ", n_r=" + Nn_r + ") -- initiate() -> ");
  let tsip = new TSip({'n_ven':BigInt(n_venues)});
  let rec_sip = new RecSip({'n_r':Nn_r, 'nv':BigInt(n_venues)});
  PRINT_N(2, "  We have NMAXVENS=" + NMAXVENS + ", NMAXBITVENS=" + NMAXBITVENS);
  PRINT_N(1,`(verbose=${verbose},nv=${n_venues},input_len=${vt_in.length} --- We are conducting a zero all trial`);
  tsip.b.b2v.zero_all();  tsip.s.b2v.zero_all();
  PRINT_N(2,` --- Zero All complete`);
  let on_r = 0; let i_r = 0;
  for (i_r=0;i_r<Nn_r;i_r++) {
    PRINT_N(4, " i_r=" + i_r + "/" + Nn_r + ": BEGIN");
    if ((verbose >= 2) && (i_r % 1000) == 0) {
      PRINT_N(2, "(" + i_r + "/" + Nn_r + ") -- " + dt64_string(vt_in[i_r]) + 
       ": moving with " + 
       "B(q,p,v)=(" + vb_q_in[i_r] + "," + vb_p_in[i_r] +"," + vb_v_in[i_r] + "), " + 
       "S(q,p,v)=(" + vs_q_in[i_r] + "," + vs_p_in[i_r] +"," + vs_v_in[i_r] + ") ");
    } 

    // Pretty Simple, update Bid.  Update Ask
    //  Then Verify quality, and record.
    tsip.tt = vt_in[i_r];  tsip.i_r = i_r;
    PRINT_N(4, " --- Run B update [" + vb_v_in[i_r] + "," + vb_p_in[i_r] + "," + vb_q_in[i_r] + "]");
    tsip.b.update(vb_v_in[i_r], vb_p_in[i_r], vb_q_in[i_r]);
    PRINT_N(4, " --- Run S update [" + vs_v_in[i_r] + "," + vs_p_in[i_r] + "," + vs_q_in[i_r] + "]");
    tsip.s.update(vs_v_in[i_r], vs_p_in[i_r], vs_q_in[i_r]);
    if (DEBUG_ALGO > 0) {
      tsip.verify();
    }
    // Note record_state is vector record, which seems easier
    // to work with for returning a Arrow based table
    rec_sip.record_state(tsip);
    if ((verbose >= 2) && ((i_r % 1000 == 0) || (i_r < 10))) {
      PRINT_N(2, ", i_r=" + i_r + "/" + Nn_r + " - [" + 
        "t=" + dt64_string(tsip.tt) + "," + 
        `b[p,q,n,b2]=[${tsip.b.p},${tsip.b.q},${tsip.b.nwv},${tsip.b.b2v.p_string(n_venues)}],` +
        `s[p,q,n,b2]=[${tsip.s.p},${tsip.s.q},${tsip.s.nwv},${tsip.s.b2v.p_string(n_venues)}].` +
         "rec_sip length is now " + rec_sip.i_r + "/" + rec_sip.vt.length + " with rec_sip.n_r=" + rec_sip.n_r);
    } 
  }
  rec_sip.reset_length();
  PRINT_N(0, ` -- Concluded with on_r=${on_r},n_r=${Nn_r}.`);
  rec_sip.verbose_ob = {'s':verbose_ob.s,'verbose':verbose_ob.verbose};
  PRINT_N(0, " we are going to return rec_sip with keys [" + Object.keys(rec_sip).join(",") + "].");
  return(rec_sip);
}


const p_exports = {
  "TSip":TSip,
  "RecSip":RecSip,
  "VPublishSip":VPublishSip,
  "B2Vs":B2Vs,
  "compute_sip_nbbo_rec_sip":compute_sip_nbbo_rec_sip,
  "dt64_string":dt64_string,
  "u64_string":u64_string,
  "sip_demo_data":sip_demo_data,
  "is_numeric":is_numeric
}
module.exports = p_exports;
/*
export {
  TSip,
  RecSip,
  VPublishSip,
  B2Vs,
  compute_sip_nbbo_rec_sip,
  dt64_string,
  u64_string
}
*/
