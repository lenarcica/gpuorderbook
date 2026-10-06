// ord_struct/index.js
//   Alan Lenarcic 2026/07/07
//
// This index file tries to mimic file combination work done by Rust version of these algorithms.
// The underlying class structures are updated with functions defined in the following additional local javascripts
// One an esbuild is performed on all of these files, a single updated index.js should contain required package solutions related to ord_struct
// Which defines how ../ord_algo.js will call important functions.
//
import { MarketExchangeBook, OneSideCombinedBook, OneSideBook, 
         TotalCurrentState, OneSideState, OneLevelState, Kalgo, isin_Kalgo, str_kalgo, und_str_kalgo, make_print_n} from '../ord_struct.js';

import { ManualCalc, calc_barrier_algo, 
         calc_barrier_num_filled,
         calc_barrier_num_shares, calc_barrier_total_dollars,
         calc_barrier_num_all, calc_barrier_num_pennies,
         calc_barrier_multiple_spread, calc_barrier_pct_depth, calc_mc_m_algo, calc_mc_ir_algo,
         calc_mc_ir_barrier, calc_mc_m_exp_decay, calc_mc_ir_exp_decay, check_mc_m_algo} from './calc_val.js';

import { TotalCurrentState_crit_move_any, 
         TotalCurrentState_crit_move_out,
         TotalCurrentState_crit_move_in,
         OneSideState_crit_move_out_num_filled,
         OneSideState_crit_move_in_num_filled, 
         OneSideState_crit_move_out_num_all,
         OneSideState_crit_move_in_num_all,
         OneSideState_crit_move_out_num_pennies,
         OneSideState_crit_move_in_num_pennies,
         OneSideState_crit_move_out_pct_depth,
         OneSideState_crit_move_in_pct_depth,
         OneSideState_crit_move_out_multiple_spread,
         OneSideState_crit_move_in_multiple_spread,
         OneSideState_crit_move_out_num_shares,
         OneSideState_crit_move_in_num_shares,
         OneSideState_crit_move_out_total_dollars, OneSideState_crit_move_in_total_dollars
} from './crit_upd.js';

import { TotalCurrentState_delete_market_best_price,
         TotalCurrentState_completely_kill_market,
         TotalCurrentState_delete_market_best_price_exp_decay,
         TotalCurrentState_rewrite_best_price_exp_decay,
         TotalCurrentState_rewrite_ik_best_price_exp_decay,
         OneSideState_rewrite_ik_best_price_exp_decay
} from './del_best.js';

import { TotalCurrentState_delete_market_other_price } from './del_other.js';
import { TotalCurrentState_mod_qty_at_price } from "./mod_qty.js";
import { TotalCurrentState_new_market_other_price } from "./new_other.js";
import { TotalCurrentState_new_market_best_price,
         TotalCurrentState_new_market_best_price_exp_decay,
         TotalCurrentState_new_related_price,
         TotalCurrentState_completely_new_market_best_price,
         TotalCurrentState_update_tcs_r_ir,
         TotalCurrentState_new_m_best_price,
         TotalCurrentState_update_mq_at_bestprice
       } from "./ord_new.js";

import {
TotalCurrentState_fresh_w_window_calc,
TotalCurrentState_fresh_w_all_window,
TotalCurrentState_upd_w_window,
OneSideState_fresh_w_window_calc,
OneSideState_fresh_w_all_window
} from "./weight_window.js";


// crit_upd updates
TotalCurrentState.prototype.crit_move_any = TotalCurrentState_crit_move_any;
TotalCurrentState.prototype.crit_move_out = TotalCurrentState_crit_move_out;
TotalCurrentState.prototype.crit_move_in = TotalCurrentState_crit_move_in;
OneSideState.prototype.crit_move_out_num_filled = OneSideState_crit_move_out_num_filled;
OneSideState.prototype.crit_move_in_num_filled = OneSideState_crit_move_in_num_filled;
OneSideState.prototype.crit_move_out_num_all = OneSideState_crit_move_out_num_all;
OneSideState.prototype.crit_move_in_num_all = OneSideState_crit_move_in_num_all;
OneSideState.prototype.crit_move_out_num_pennies = OneSideState_crit_move_out_num_pennies;
OneSideState.prototype.crit_move_in_num_pennies = OneSideState_crit_move_in_num_pennies
OneSideState.prototype.crit_move_out_pct_depth = OneSideState_crit_move_out_pct_depth;
OneSideState.prototype.crit_move_in_pct_depth = OneSideState_crit_move_in_pct_depth;
OneSideState.prototype.crit_move_out_multiple_spread = OneSideState_crit_move_out_multiple_spread;
OneSideState.prototype.crit_move_in_multiple_spread = OneSideState_crit_move_in_multiple_spread;
try {
  OneSideState.prototype.crit_move_out_num_shares = OneSideState_crit_move_out_num_shares;
  // Seems okay now?  Maybe strange esbuild bug?
} catch {
  console.log("Installation issue: debugger: crit_move_out_num_shares, could we find?");
  debugger;
}
OneSideState.prototype.crit_move_in_num_shares = OneSideState_crit_move_in_num_shares;
OneSideState.prototype.crit_move_out_total_dollars = OneSideState_crit_move_out_total_dollars;
OneSideState.prototype.crit_move_in_total_dollars = OneSideState_crit_move_in_total_dollars;

//del_best.js
TotalCurrentState.prototype.delete_market_best_price = TotalCurrentState_delete_market_best_price;
TotalCurrentState.prototype.completely_kill_market = TotalCurrentState_completely_kill_market;
TotalCurrentState.prototype.delete_market_best_price_exp_decay = TotalCurrentState_delete_market_best_price_exp_decay;
TotalCurrentState.prototype.rewrite_best_price_exp_decay = TotalCurrentState_rewrite_best_price_exp_decay;
TotalCurrentState.prototype.rewrite_ik_best_price_exp_decay = TotalCurrentState_rewrite_ik_best_price_exp_decay;
OneSideState.prototype.rewrite_ik_best_price_exp_decay = OneSideState_rewrite_ik_best_price_exp_decay;


//del_other.js
TotalCurrentState.prototype.delete_market_other_price = TotalCurrentState_delete_market_other_price;

// mod_qty.js
TotalCurrentState.prototype.mod_qty_at_price = TotalCurrentState_mod_qty_at_price;


// new_other.js
TotalCurrentState.prototype.new_market_other_price = TotalCurrentState_new_market_other_price;

// ord_new.js
TotalCurrentState.prototype.new_market_best_price = TotalCurrentState_new_market_best_price;
TotalCurrentState.prototype.new_market_best_price_exp_decay = TotalCurrentState_new_market_best_price_exp_decay;
TotalCurrentState.prototype.new_related_price = TotalCurrentState_new_related_price;
TotalCurrentState.prototype.completely_new_market_best_price = TotalCurrentState_completely_new_market_best_price;
TotalCurrentState.prototype.update_tcs_r_ir = TotalCurrentState_update_tcs_r_ir;
TotalCurrentState.prototype.new_m_best_price = TotalCurrentState_new_m_best_price;
TotalCurrentState.prototype.update_mq_at_bestprice = TotalCurrentState_update_mq_at_bestprice;

// weight_window.js
TotalCurrentState.prototype.fresh_w_window_calc = TotalCurrentState_fresh_w_window_calc;
TotalCurrentState.prototype.fresh_w_all_window = TotalCurrentState_fresh_w_all_window;
TotalCurrentState.prototype.upd_w_window = TotalCurrentState_upd_w_window;
OneSideState.prototype.fresh_w_window_calc = OneSideState_fresh_w_window_calc;
OneSideState.prototype.fresh_w_all_window = OneSideState_fresh_w_all_window;


const p_exports =  { "MarketExchangeBook":MarketExchangeBook, "OneSideCombinedBook":OneSideCombinedBook, 
  "OneSideBook":OneSideBook, "TotalCurrentState":TotalCurrentState, "OneSideState":OneSideState, "OneLevelState":OneLevelState,
  "ManualCalc":ManualCalc, "calc_barrier_algo":calc_barrier_algo, "calc_barrier_num_filled":calc_barrier_num_filled, 
  "calc_barrier_num_all":calc_barrier_num_all, "calc_barrier_num_shares":calc_barrier_num_shares,
  "calc_barreir_total_dollars":calc_barrier_total_dollars, "calc_barreir_num_pennies":calc_barrier_num_pennies,
  "calc_barrier_multiple_spread":calc_barrier_multiple_spread, "calc_barreir_pct_depth":calc_barrier_pct_depth,
  "calc_mc_ir_barrier":calc_mc_ir_barrier, "calc_mc_m_exp_decay":calc_mc_m_exp_decay, 
  "calc_mc_ir_exp_decay":calc_mc_ir_exp_decay, "check_mc_m_algo":check_mc_m_algo, "calc_mc_m_algo":calc_mc_m_algo, 
  "calc_mc_ir_algo":calc_mc_ir_algo,
  "Kalgo":Kalgo, "isin_Kalgo":isin_Kalgo, "str_kalgo":str_kalgo, "und_str_kalgo":und_str_kalgo,
  "make_print_n":make_print_n
};

module.exports = p_exports;
/****
// Extended Class 
export { MarketExchangeBook, OneSideCombinedBook, OneSideBook, TotalCurrentState, OneSideState, OneLevelState,
         ManualCalc, calc_barrier_algo, calc_barrier_num_filled, calc_barrier_num_all, calc_barrier_num_shares,
         calc_barrier_total_dollars, calc_barrier_num_pennies,
         calc_barrier_multiple_spread, calc_barrier_pct_depth,
         calc_mc_ir_barrier, calc_mc_m_exp_decay, calc_mc_ir_exp_decay, Kalgo, isin_Kalgo, str_kalgo, und_str_kalgo
};

***/
