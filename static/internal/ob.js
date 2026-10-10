/////////////////////////////vg_zo////////////////////////////////
// ob.js
//
//   Alan Lenarcic  2025
//
//   WebGPU based orderbook timeline visualizaton
//
//   Uses: "draw_ob.js" -- WebGPU Canvas code (Static pixels)
//         "svg_ob.js" -- Interactive SVG on top (selectable pixels)
//
//   Defines an obwidget class which contains information necessary for plotting a subset of timeseries orderbook with NBBO and trades.
//   The goal of this widget is to be performant at plotting 100s of thousands of individual orders and allowing viewers to
//   Zoom in to other scales.
//
//import noUiSlider from '../external/nouislider.js';
var noUiSlider = require("../external/nouislider.js"); // This external slider is a requirement
require('../external/nouislider.min.css'); // Import the CSS as well
//const d3 = require("../external/d3.v7.js");  // We are not using any D3 Elements at this time.
console.log("ob require, do we have d3?");
const debug_code = require("./debug.js");
const demo_data = require("./demo_data.js");
const printer = require("./printer.js");
const default_verbose_ob = {'s':[], 'verbose':0};
//const nouislider = require("../external/nouislider.js");
const draw_ob = require("./draw_ob.js");
const svg_ob = require("./svg_ob.js");
const bars = require("./bars.js");
//esbuild --bundle --format=esm --outdir=outwidget/ord_algo static/internal/ord_algo/ord_algo.js
//esbuild --bundle --format=esm --outdir=outwidget/cumulate static/internal/ord_algo/cumulate.js
//const ord_algo = require("../../outwidget/ord_algo/ord_algo.js");
//const cumulate = require("../../outwidget/cumulate/cumulate.js");

const ord_algo = require("./ord_algo/ord_algo.js");
const cumulate = require("./ord_algo/cumulate.js");
const cumulate_dside = cumulate.cumulate_dside; const sort_tp = cumulate.sort_tp;

const default_form_data = require('./forms/form_default.json');

const make_text_el = svg_ob.make_text_el;
const pretty_num = require("../internal_lib/pretty_num.js");
const bigmult = pretty_num.bigmult
const svgns = "http://www.w3.org/2000/svg"; // SVG Namespace

const compare_two_unit_num = pretty_num.compare_two_unit_num;
const recast_unit = pretty_num.recast_unit;
const string_del_tm = pretty_num.string_del_tm;
const process_del_tm = pretty_num.process_del_tm;
const process_string_bi = pretty_num.process_string_bi;
const default_height = 700;  const default_width = 600; const default_bar_width = 200;
// Note that canvas_pixels cannot exceek 8000
var canvas_pixels = 2; var height_canvas = default_height; var width_canvas = default_width;
var canvas_tweak = 0; // Incase extra tweak to put CANVAS on SVG necessary
const is_numeric = printer.is_numeric; const is_positive_numeric = (x) => (printer.is_numeric(x) && (x > 0));
const xwid = 5; const hline_effect = .15; const ywid = 5; const vline_effect = .15;
const slider_pixels = 20; const price_delta = 1.5;
const priceFontWid = 18;

const buttons_left_loc = ['1000','1300'];


async function WebGPU_GetAdapterAndDevice() {
  const PRINT_N = printer.make_print_n(default_verbose_ob, "ob.js->WebGPU_GetAdapterAndDevice(): ");
  PRINT_N(0,"obwidget.js -- Trying to achieve adapter");
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    console.log("Error, Await Nativator does not return an object.  I think we are broken.");
    console.log('need a browser that supports WebGPU');
    return(null);
  }
  PRINT_N(0, "obwidget.js -- we reached device");
  return({device:device,adapter:adapter});
}

function resort_dside(dside) {
  if (!(dside)) {
    console.log("ERROR resort_dside: dside is undefined currently.");
    return;
  }
  let stindex_pt = [...dside.iprice.keys()].sort((ix,iy)=>{ return(dside.iprice[ix] < dside.iprice[iy] ? -1 :
       (dside.iprice[ix] > dside.iprice[iy] ? 1 :
        (dside.open[ix] < dside.open[iy] ? -1 :
         (dside.open[ix] > dside.open[iy] ? 1 :
          (dside.close[ix] < dside.close[iy] ? -1 : 1))))) });
  dside.price =  stindex_pt.map((ix)=>dside.price[ix]);
  dside.iprice =  stindex_pt.map((ix)=>dside.iprice[ix]);
  dside.qty =  stindex_pt.map((ix)=>dside.qty[ix]);
  dside.open =  stindex_pt.map((ix)=>dside.open[ix]);
  dside.close =  stindex_pt.map((ix)=>dside.close[ix]);
  if (vs in dside) {
    dside.vs = stindex_pt.map((ix)=>dside.vs[ix]);

  }

  dside.stindex_tp = [...dside.iprice.keys()].sort((ix,iy)=>{ return(dside.open[ix] < dside.open[iy] ? -1 :
       (dside.open[ix] > dside.open[iy] ? 1 :
        (dside.iprice[ix] < dside.iprice[iy] ? -1 :
         (dside.iprice[ix] > dside.iprice[iy] ? 1 :
          (dside.close[ix] < dside.close[iy] ? -1 : 1))))) });
    const bd = dside.buys;
    const bm = sort_tp(cumulate_dside({'vo':dside.open,'vc':bd.close,'vq':bd.qty,'vpi':bd.vpi, 'dtitle':'buys_cumulate'}));
    const f1 = (x,i)=>bd.vs[i]==find_sim; 
    console.log("cumulating buy side");
    const br1 = sort_tp(cumulate_dside({'vo':bd.open.filter(f1),'vc':bd.close.filter(f1),'vq':bd.qty.filter(f1),'vpi':bd.vpi.filter(f1),'dtitle':'buys_f1_cumulate'}));
     
    const sd = dside.sells;
    if (sd.open.length <= 0) {
      console.log("runOBATest: there is zero length sells."); debugger;
    }
    const sm = sort_tp(cumulate_dside({'vo':sd.open,'vc':sd.close,'vq':sd.qty,'vpi':sd.vpi,'dtitle':'sells_cumulate'}));
    const g1 = (x,i)=>sd.vs[i]==find_sim; 
    console.log("cumulating sell side");
    const sr1 = sort_tp(cumulate_dside({'vo':sd.open.filter(g1),'vc':sd.close.filter(g1),'vq':sd.qty.filter(g1),'vpi':sd.vpi.filter(g1),'dtitle':'sells_f1_cumulate'}));
  
    const oad_b = cumulate.concatenate_cds([bm,br1], dside.buys.uprice);
    const oad_s = cumulate.concatenate_cds([sm,sr1], dside.sells.uprice);
    const oad = {'b':oad_b,'s':oad_s, 'nr':nven}; 
}


// We call this function to populate "ps" post algorithm data useful by gpu object.
const run_algo = function(my_this, PRINT_N) { 
  DEBUG && PRINT_N(1, "ob.js->run_algo called");
  const multi = pretty_num.bigmult(my_this.orig.unit);
  const time_min_bi = BigInt(Math.round(multi * my_this.orig.tmin)) + my_this.oad.bi_st0;
  const time_max_bi = BigInt(Math.round(multi * my_this.orig.tmax)) + my_this.oad.bi_st0;
  DEBUG && PRINT_N(1, " -- About to run order_algo");
  my_this.data.ps = ord_algo.order_algo(my_this.oad, my_this.algo_data.v_d, null, 
                                         my_this.algo_data.kalgo, my_this.algo_data.w_sum_q, my_this.algo_data.w_sum_pq, 
                                         my_this.algo_data.w_avp, my_this.algo_data.w_wp, my_this.algo_data.w_nocc, 
                                         my_this.algo_data.w_atq, my_this.algo_data.w_crit_pi, my_this.algo_data.w_crit_p, my_this.oad_verbose_ob, time_min_bi, time_max_bi); 
  DEBUG && PRINT_N(1, " -- Order algo returned a ps  length: " + ((my_this.data.ps !== null) && (my_this.data.ps !== undefined) ? my_this.data.ps.length : 0)); 
  my_this.data.bi_st0 = my_this.oad.bi_st0;
  DEBUG && PRINT_N(1, "os.js->run_algo -- success apparently.");
}

//export class obwidget {
class obwidget {
  data = {...demo_data.demo_data};  printer = printer;
  gpu_pipeline = null; debug_button=null; verbose_ob=null;
  renderer = null; device=null; adapter=null; widgetDiv=null; formDiv=null;
  count_renders = 0; draw_ob = draw_ob; svgns = svgns; svg_ob = svg_ob; pretty_num = pretty_num; time_range_dict = [0,1];
  unique_prices = []; oad={}; algo_data = {}; ps = null;  bigmult = pretty_num.bigmult;  ord_algo=ord_algo;
  do_plots = {'do_nbbo':true,'do_trades':true,'do_quotes':true,'do_wp':true}; bars = bars;
  bardr = null; pause_render = false; 
  constructor({model, el}) {
    this.randomStr = (Math.random().toString(36).substring(2, 5) +
          Math.random().toString(36).substring(2, 5));
    this.verbose = is_numeric(model.get('verbose')) ? model.get('verbose') : 0; 
    this.verbose_ob = {'s':[], 'verbose':this.verbose};
    this.oad_verbose_ob = {'s':[], 'verbose':this.verbose-3};
    const vstr = "obwidget()";
    this.PRINT_N = printer.make_print_n(this.verbose_ob, vstr);
    const PRINT_N = this.PRINT_N;
    DEBUG && this.PRINT_N(1, "obwidget() -- constructor called. -- verbose = " + (this.verbose));
    DEBUG && this.PRINT_N(0, "  We have initiated obwidget with verbose = " + this.verbose);
    DEBUG && this.PRINT_N(0, " We completed constructor.  Setting up Defaults.");
    this.setupDefaults();
    this.el = el; this.model = model;  this.draw_ob.verbose_ob = this.verbose_ob;
    const in_data = this.model.get('data');
    if (!(!(in_data))) {  
      this.height = ((!(!(in_data.height))) && (is_numeric(in_data.height))) ? in_data.height : 600;
      this.weight = ((!(!(in_data.width))) && (is_numeric(in_data.width))) ? in_data.width : 400; 
    }
    DEBUG && this.PRINT_N(1, " Setting algo data if it exists.");
    const my_this = this;
    try {
      this.algo_data = {'kalgo': (is_numeric(model.get('kalgo')) ? model.get('kalgo') : 0),
                 'v_d': ((!(!(model.get('v_d')))) ? model.get('v_d') : [1,5,10]),
                 'v_w': ((!(!(model.get('v_w')))) ? model.get('v_w') : []),
                 'w_sum_q': (is_numeric(model.get('w_sum_q')) ? model.get('w_sum_q') : 0),
                 'w_sum_pq':(is_numeric(model.get('w_sum_pq')) ? model.get('w_sum_pq') : 0),
                 'w_avp' :  (is_numeric(model.get('w_avp')) ? model.get('w_avp') : 0),
                 'w_wp' :   (is_numeric(model.get('w_wp')) ? model.get('w_wp') : 0),
                 'w_nocc' : (is_numeric(model.get('w_nocc')) ? model.get('w_nocc') : 0),
                 'w_atp' :  (is_numeric(model.get('w_atq')) ? model.get('w_atq') : 0),
                 'w_crit_pi' : ((is_numeric(model.get('w_crit_pi'))) ? model.get('w_crit_pi') : 0),
                 'w_crit_p' : ((is_numeric(model.get('w_crit_p'))) ? model.get('w_crit_p') : 0),
                 'verbose': this.verbose_ob.verbose };
    } catch {
      PRINT_N(-6, "Error trying to execute Model Get."); debugger;
    }
    DEBUG && PRINT_N(1, " Looking for pause_render"); 
    const pause_render = (!(!(in_data)) && (in_data.pause_render !== undefined) && (in_data.pause_render !== null)) ? (!(!(in_data.pause_render))) : false;
    my_this.pause_render = pause_render;
    // Note time_min/time_max taken from object
    DEBUG && this.PRINT_N(1, " Setting debug button.");
    DEBUG && PRINT_N(1, " Here is debug Button: " + this.debug_button);
    if ((this.debug_button === undefined) || (this.debug_button === null) || (!(this.debug_button))) {
      DEBUG && PRINT_N(1, ":: Running Debug Code configure Default Buttons.");
      debug_code.configureDefaultButtons(my_this);
    }
    DEBUG && PRINT_N(1, ":: about to install in_data from what we have sequenced in model data.");
    this.configureData(in_data, this.model);
    DEBUG && PRINT_N(1, ":: Clear from configureData,  Now testing to pause render flag.  my_this.pause_render=" + my_this.pause_render);
    if ((my_this.pause_render !== undefined) && (!(!(my_this.pause_render))) && (my_this.pause_render == true) ) {
      DEBUG && PRINT_N(1, ":: Will execute configure_pause_render");
      my_this.configure_pause_render();
    } else {
      DEBUG && PRINT_N(1, ":: We are ready to configure Algorithm Data.");
      this.configure_algo_data();
    }
    DEBUG && PRINT_N(1, "We conclude constructor.");
  }
  configure_pause_render() {
    const my_this = this;
    const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "ob.js->configure_pause_render() -- I don't think we need to do anything.");
    DEBUG && PRINT_N(1, " --- Non working function. -- We can now return");
    return(1);
  }
  this_run_algo() {
    const my_this = this;
    const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "ob.js->internal run_algo()");
    PRINT_N(2, "Running Orderbook Algorithm");
    run_algo(my_this, PRINT_N);
    PRINT_N(2, " --- Concluded Running Algorithm.");
  }
  configureData(in_data, model) {
    const PRINT_N = printer.make_print_n(this.verbose_ob, "ob.js->configureData()");
    DEBUG && PRINT_N(1, " Initiate configureData");
    if (!(!(in_data))) { 
      this.data = in_data; PRINT_N(1, ": data given to configureData from input"); 
      if (!(this.data.data_type)) { this.data.data_type = "User supplied data"; }
    } else { 
      PRINT_N(1, " We are working with default demo_data");
      PRINT_N(1, " Note that demo_data.demo_data.data_type = " + demo_data.demo_data.data_type);
      //this.data = Object.assign({}, demo_data); 
      PRINT_N(1, ": Defaulting to demo_data with demo_data.demo_data.data_type=" + 
         (demo_data.demo_data.data_type === undefined) ? "IS UNDEFINED" : 
          (demo_data.demo_data.data_type === null) ? " IS NULL " : demo_data.demo_data.data_type)
      this.data = demo_data.demo_data;
    }
    DEBUG && PRINT_N(1, " Testing data for non Null ness.");
    if ((this.data === undefined) || (this.data === null) || (!(this.data))) {
      PRINT_N(0, ": ERROR data is still null.  This should trigger an Error."); debugger;
    }
    if ((this.data.data_type === undefined) || (this.data.data_type === null) || (!(this.data.data_type))) {
      PRINT_N(0, "ERROR Data.data_type is still undefined"); debugger;
    }
    if ((this.data.tmin === undefined) || (!(is_numeric(this.data.tmin)))) {
      PRINT_N(-1, "ERROR configureData has not been populated"); debugger;
    }
    if ( (this.data.buys === undefined) || (!(this.data.buys)) || (this.data.buys.open===undefined) || 
         (!(this.data.buys.open)) || (this.data.buys.open.length <= 0)) {
      PRINT_N(1, " Invalid this.data.buys setting null. "); this.data.buys = null;
    }

    if ( (!(this.data.sells)) || (this.data.sells ===undefined) || (!(this.data.sells.open)) || (this.data.sells.open.length <= 0)) {
      PRINT_N(1, " Invalid this.data.sells setting null"); this.data.sells = null;
    }
    if ( (this.data.nbbo === undefined) || (!(this.data.nbbo)) || (!(this.data.nbbo.time)) || (this.data.nbbo.time.length <= 0)) {
      PRINT_N(1, " Invalid this.data.nbbo setting null"); this.data.nbbo = null;
    }
    if ( (!(this.data.trades)) || (!(this.data.trades.time)) || (this.data.trades.time.length <= 0)) {
      this.data.trades = null;
    }
    // Making Data own a copy of verbose_ob.
    if ( (!(!(this.data)))) { this.data.verbose_ob = this.verbose_ob; }

    // Setting appreciable height, width, bar width.
    if (is_positive_numeric(this.data.height)) { this.data.height = Math.floor(this.data.height) } else { PRINT_N(0, " invalid data.height."); this.data.height = demo_data.height }
    if (is_positive_numeric(this.data.width)) { this.data.width = Math.floor(this.data.width) } else { PRINT_N(0, " invalid data width."); this.data.width = demo_data.width }
    if (is_positive_numeric(this.data.bar_width)) { this.data.bar_width = Math.floor(this.data.bar_width) 
    } else { PRINT_N(0, ": invalid data bar width."); this.data.bar_width = Math.floor(this.data.width * .35); }
    if ((!(!(this.data.text_win_height))) && (is_positive_numeric(this.data.text_win_height))) { 
      this.data.text_win_height = Math.floor(this.data.text_win_height) 
    } else { 
      this.data.text_win_height = ((!(!(demo_data.text_win_height))) ? demo_data.text_win_height : 200);
    }
    if ((!(!(this.model.get('width')))) && (is_positive_numeric(this.model.get('width')))) { this.data.width = Math.floor(this.model.get('width')) }
    if ((!(!(this.model.get('height')))) && (is_positive_numeric(this.model.get('height')))) { this.data.height = Math.floor(this.model.get('height')) }

    if (!(this.data.height)) {
      PRINT_N(-6, "Weird, after you did this we don't have data.height?"); debugger;
    }
    if (is_numeric(this.data.tmin)) { } else { this.data.tmin = 1.0*demo_data.tmin }
    if (is_numeric(this.data.tmax)) { } else { this.data.tmax = 1.0*demo_data.tmax }
    if (this.data.tmax < this.data.tmin) { let dmm = this.data.tmin*1.0; this.data.tmin=(1.0*this.data.tmax); this.data.tmax = dmm }
    if (is_numeric(this.data.pmin)) { this.data.pmin = this.data.pmin } else { this.data.pmin = demo_data.pmin }
    if (is_numeric(this.data.pmax)) { this.data.pmax = this.data.pmax } else { this.data.pmax = demo_data.pmax }
    if (is_positive_numeric(this.data.pow_qty)) { this.data.pow_qty = this.data.pow_qty } else { this.data.pow_qty = demo_data.pow_qty }
    if (is_positive_numeric(this.data.trade_mul_fac)) { this.data.trade_mul_fac = this.data.trade_mul_fac } else { this.data.trade_mul_fac = demo_data.trade_mul_fac }
    if (is_positive_numeric(this.data.msg_mul_fac)) { this.data.msg_mul_fac = this.data.msg_mul_fac } else { this.data.msg_mul_fac = demo_data.msg_mul_fac }
    if (this.data.pmax < this.data.pmin) { let dmm = this.data.pmin; this.data.pmin=this.data.pmax; this.data.pmax = dmm }
    if (!(this.orig)) {
      this.orig = { "tmin": this.data.tmin * 1.0,  "tmax":this.data.tmax *1.0, 'unit': this.data.unit*1.0,
                    "pmin": this.data.pmin * 1.0,  "pmax":this.data.pmax *1.0, 'st_time': this.data.st_time+''
      }
    } else {
      this.orig.tmin = this.data.tmin * 1.0; this.orig.tmax = this.data.tmax * 1.0;  this.orig.st_time = this.data.st_time + '';
      this.orig.pmin = this.data.pmin * 1.0; this.orig.pmax = this.data.pmax * 1.0;
    } 
    this.data.origmult = 1.0;
    if (!(this.going)) { this.going = {'tmin':this.data.tmin*1.0, 'tmax':this.data.tmax*1.0, 'unit':this.data.unit, 'st_time':this.data.st_time }
    } else { this.going.tmin = this.data.tmin*1.0; this.going.tmax = this.data.tmax*1.0; this.going.unit = this.data.unit; this.going.st_time = this.data.st_time }
    this.data.canvas_pixels = canvas_pixels;
    if (!is_numeric(this.data.tmin)) {
      PRINT_N(-6, "ERROR configureData, this.data tmin is somehow not configured right yet."); debugger;
    }
    if (!is_numeric(this.orig.tmin)) {
      PRINT_N(-6, "ERROR configureData, this.orig.tmin somehow not configured."); debugger;
    }
    DEBUG && PRINT_N(1," -- We are done with initial work.");
    DEBUG && PRINT_N(1," --  this.data.height is " + this.data.height + ", going to algo_data");
    // Follow through with setting up data for algo.
    DEBUG && PRINT_N(1," -- We have determined Basic Data settings.");
  }
  configure_form_pt() {
    const my_this = this;
    DEBUG && console.log("configure_form_pt() initialize.");
    if ((this.formDiv === undefined) || (this.formDiv === null)) {
      console.log("configure_form_pt() can't work with this.formDiv as null.");
    }
    const uv = this.data.unique_venues;  const onm03 = this.data.onm03;
    if ((uv === undefined) || (uv === null)) {
      console.log("configure_form_pt() error unique_venues is undefined!!"); debugger; 
    }
    const PRINT_N = printer.make_print_n(this.verbose_ob, "ob.js->configure_form_pt(len=" + uv.length + ",onm03=" + onm03 + "): ");
    DEBUG && PRINT_N(2, " --- Starting configure_form_pt: uv.length=" + uv.length);
    let Group = ['All'];  
    if (uv.length <= 1) {
    } else if (onm03 == 3) {
      Group.push('market');  for (let ii = 0; ii < uv.length;ii++) { if (uv[ii] != 'market') { Group.push(uv[ii]); }}
    } else if (onm03 == 2) {
      Group.push('m');  for (let ii = 0; ii < uv.length;ii++) { if (uv[ii] != 'm') { Group.push(uv[ii]); }}
    } else if (onm03 == 1) {
      Group.push('market');  for (let ii = 0; ii < uv.length-1;ii++) { Group.push(uv[ii]); }
    } else {
      for (let ii = 0; ii < uv.length;ii++) { Group.push(uv[ii]); }
    }
    DEBUG && PRINT_N(-2, " -- We have Group = [" + Group.join(",") + "]");
    DEBUG && PRINT_N(-2, " -- We have Group = [" + Group.join(",") + "]");
    for (let ii=0;ii<Group.length;ii++) {
      const newOption = new Option("" + Group[ii],"" + Group[ii]);
      this.formDiv.f_input_participant_target.add(newOption);
    }
    my_this.data.pl_filt = null;
    DEBUG && PRINT_N(-2, " Creating Charger Function.");
    const Changer = function(event) {
      console.log("configure_form_pt: Changer() called.");
      const sv = event.target.value;
      if ((sv == 'all') || (sv=='All')) { 
        my_this.data.keep_iv = null;
        my_this.data.pl_filt = ((x)=>(true));
      } else if ( ((onm03==3) && (sv == 'market')) || ((onm03==2) && (sv == 'm')) || ((onm03==1) && (sv == 'market'))) {
        if (onm03 == 3) {
          my_this.data.keep_iv =  my_this.data.nr;
          my_this.data.pl_filt = ((x) => (x==my_this.data.nr));
        } else if (onm03 == 2) {
          my_this.data.keep_iv = my_this.data.nr;
          my_this.data.pl_filt = ((x) => (x==my_this.data.nr));
        } else if (onm03 == 1) {
          my_this.data.keep_iv = null;
          my_this.data.pl_filt = ((x) => (true));
        }
      }  else {
        let bri = -1;
        for (let ii = 0; ii < uv.length;ii++) { if (uv[ii] == sv) { bri=ii; break; } }
        my_this.data.keep_iv = bri;
        my_this.data.pl_filt = ((x) => (x==my_this.data.keep_iv));
      }
      if ((my_this.draw_ob.buffers.uniform_buffer === null) || ((my_this.draw_ob.buffers.buys === null) && (my_this.draw_ob.buffers.sells===null))) {
        return(1);
      }
      my_this.draw_ob.revalue_ivs(my_this.data, my_this.data.pl_filt);
      const str32 = my_this.draw_ob.str_i32bit;
      if (my_this.verbose_ob.verbose >= 2) {
        PRINT_N(1, " --- We will show you reverse buffer. onm03=" + onm03 + ", target = " + event.target.value);
        PRINT_N(1, " buys.vs = [" + my_this.data.buys.vs.slice(0,16).join(",") + "]"); 
        PRINT_N(1, " buys.ivs = [" + my_this.data.buys.ivs.slice(0,16).join(",") + "]");
        PRINT_N(1, " buffers.buys.ivs = [" + my_this.draw_ob.buffers.buys.ivs.subarray(0,4).join(",") + "]");
        PRINT_N(1, (" buffers.buys.ivs = [" + str32(my_this.draw_ob.buffers.buys.ivs,0) + "||" + 
                                             str32(my_this.draw_ob.buffers.buys.ivs,1) + "||" + 
                                             str32(my_this.draw_ob.buffers.buys.ivs,2) + "||" + 
                                             str32(my_this.draw_ob.buffers.buys.ivs,3) + "]")   );


      }
      if (my_this.draw_ob.buffers.uniform_buffer !== null) { my_this.call_plot(); }
    }
    PRINT_N(-5, "installing change.");
    this.formDiv.f_input_participant_target.addEventListener('change',Changer);
    Changer({'target':{'value':'All'}});
  }
  configure_algo_data() {
    const PRINT_N = printer.make_print_n(this.verbose_ob, "ob.js->configure_algo_data()");
    const multi = pretty_num.bigmult(this.orig.unit);
    const bi_st0 = process_string_bi(this.orig.st_time);
    const my_this = this;
    this.orig.bi_st0 = bi_st0;
    const mm = (x) => (bi_st0 + BigInt(Math.floor(multi*x)));
    this.unique_prices = [...new Set([...((this.data.buys !== null) ? this.data.buys.price : []),...(
                                          (this.data.sells != null) ? this.data.sells.price: [])])].sort();
    if (!(!(this.data.buys))) {
      this.data.buys.u_p = [...new Set([...(this.data.buys !== null) ? this.data.buys.price: []])].sort((a,b)=>(a-b));
    }
    if (!(!(this.data.sells))) { 
      this.data.sells.u_p = [...new Set([...(this.data.sells != null) ? this.data.sells.price: []])].sort((a,b)=>(b-a));
    }
    if (!(!(this.data.buys))) { this.data.buys.vpi = this.data.buys.price.map((x)=>this.data.buys.u_p.indexOf(x)); }
    if (!(!(this.data.sells))) { this.data.sells.vpi = this.data.sells.price.map((x)=>this.data.sells.u_p.indexOf(x)); }
    this.data.unique_venues = [...new Set([...((this.data.buys !== null) && (!(!(this.data.buys.vs)))) ? this.data.buys.vs : [],
                                      ...((this.data.sells !== null) && (!(!(this.data.sells.vs)))) ? this.data.sells.vs: []])].sort();
    if (this.data.unique_venues.length > 0)  {
      if ((typeof(this.data.unique_venues[0]) == 'number') && (this.data.nr !== undefined) && is_numeric(this.data.nr)) {
        this.data.unique_venues = [...this.data.unique_venues.filter((x)=>(x !== this.data.nr)),
                                   ...this.data.unique_venues.filter((x)=>(x==this.data.nr))]
      } else if (typeof(this.data.unique_venues[0] == 'string')) {
        this.data.unique_venues = [...this.data.unique_venues.filter((x)=>((x != 'market') && (x !== 'Market') && (x !== 'm'))),
                                   ...this.data.unique_venues.filter((x)=>((x=='market') || (x=='m') || (x == 'Market')))];
      }
    }
    const uv = (this.data.unique_venues === null) ? [] : this.data.unique_venues;
    let nr = (!(!(this.data.nr)) && is_numeric(this.data.nr)) ? this.data.nr : uv.filter((x)=>((x!='market') && (x != 'm') && (x !== 'Market'))).length;
    if ((this.data.buys !== null) && (!(this.data.buys.vs))) { this.data.buys.ivs = Array(this.data.buys.open.length).fill(0); }
    if ((this.data.sells !== null) && (!(this.data.sells.vs))) { this.data.sells.ivs = Array(this.data.sells.open.length).fill(0); }
    if ((this.data.buys !== null) && (!(!(this.data.buys.vs)))) { this.data.buys.ivs = this.data.buys.vs.map((x)=>uv.indexOf(x)); }
    if ((this.data.sells !== null) && (!(!(this.data.sells.vs)))) { this.data.sells.ivs = this.data.sells.vs.map((x)=>uv.indexOf(x)); }
    DEBUG && PRINT_N(2, " About to look at onm03");
    const uvl = uv.length;  const last_uv = (uvl > 0) ? uv[uv.length -1] : -100;
    const case03 = ((uv.includes('market') || (uv.includes('Market')))) ? true : false;
    const case02 = (uv.includes('m')) ? true : false;
    const case01 = ((nr > 0) && (uvl > nr) && (is_positive_numeric(last_uv)) && (Number.isInteger(last_uv)) &&  (last_uv==nr)) ? true : false;
    const onm03 = case03 ? 3 : case02 ? 2 : case01 ? 1 : 0;
    my_this.data.onm03 = onm03;
    my_this.data.nr = (onm03 > 0) ? uvl-1 : uvl;  nr = my_this.data.nr;
    DEBUG && PRINT_N(2, " We got onm03 = " + onm03);
    const byd = ((this.data.buys === undefined) || (this.data.buys === null)) ? {'price':[], 'qty':[], 'open':[], 'close':[], 'ivs':[], 'u_p':[], 'vpi':[]} : this.data.buys;
    DEBUG && PRINT_N(2, " Got byd");
    const filt_b = ((onm03 === 0) ? ((x)=>(true)) :
                    (onm03 === 1) ? ((x,ix)=> (byd.vs[ix] == nr)) :
                    (onm03 === 2) ? ((x,ix)=>(byd.vs[ix] == 'm')) :
                    (onm03 === 3) ? ((x,ix)=>((byd.vs[ix] == 'market') || (byd.vs[ix]=='Market'))) : ((x)=>(true)));
    DEBUG && PRINT_N(2, "Calculate Buy m dside");
    const bm = sort_tp(cumulate_dside({'vo':byd.open.filter(filt_b).map(mm), 'vc':byd.close.filter(filt_b).map(mm), 
                                       'vq':byd.qty.filter(filt_b), 'vpi':byd.vpi.filter(filt_b), 'dtitle': 'buys_cumulate'}));
    let set_buys = [bm];
    for (let iven=0; iven < nr; iven++) {
      const f1 = (x,i)=>byd.ivs[i]==iven; 
      DEBUG && PRINT_N(6, "Calculate Buy iven for " + iven + "/" + uv.length);
      const br1 = sort_tp(cumulate_dside({'vo':byd.open.filter(f1).map(mm),'vc':byd.close.filter(f1).map(mm),'vq':byd.qty.filter(f1),'vpi':byd.vpi.filter(f1),'dtitle':('buys_f1_cumulate'+iven)}));
      set_buys.push(br1);
    }
    DEBUG && PRINT_N(2, "concatenating Buys");
    const oad_b = cumulate.concatenate_cds(set_buys, byd.u_p); 
    DEBUG && PRINT_N(2, " collecting sells.");
    const sd = (this.data.sells == null) ? {'price':[], 'qty':[], 'open':[], 'close':[], 'ivs':[], 'u_p':[], 'vpi':[]} : this.data.sells;
    if (sd.open.length <= 0) {
      PRINT_N(-6, "runOBATest: there is zero length sells."); debugger;
    }
    DEBUG && PRINT_N(2, " Assessing Sells of cumulate_dside.");
    const filt_s = ((onm03 === 0) ? ((x)=>(true)) :
                    (onm03 === 1) ? ((x,ix)=> (sd.vs[ix] == nr)) :
                    (onm03 === 2) ? ((x,ix)=>(sd.vs[ix] == 'm')) :
                    (onm03 === 3) ? ((x,ix)=>((sd.vs[ix] == 'market') || (sd.vs[ix]=='Market'))) : ((x)=>(true)));
    DEBUG && PRINT_N(1, " Creating cumulate_dside for Sells, starting with market. applying filt_s.");
    const sm = sort_tp(cumulate_dside({'vo':sd.open.filter(filt_s).map(mm), 'vc':sd.close.filter(filt_s).map(mm), 
                                       'vq':sd.qty.filter(filt_s), 'vpi':sd.vpi.filter(filt_s), 'dtitle': 'sells_cumulate'}));
    DEBUG && PRINT_N(1, " Creating set_sells initially with sm.");
    let set_sells = [sm];
    DEBUG && PRINT_N(1, " Now installing remaining elements.");
    for (let iven=0; iven < nr; iven++) {
      const g1 = (x,i)=>sd.ivs[i]==iven; 
      DEBUG && PRINT_N(6, "Creating iven = " + iven + " now cumulate_dside");
      const sr1 = sort_tp(cumulate_dside({'vo':sd.open.filter(g1).map(mm),'vc':sd.close.filter(g1).map(mm),'vq':sd.qty.filter(g1),'vpi':sd.vpi.filter(g1),'dtitle':('sells_g1_cumulate:' + iven)}));
      set_sells.push(sr1);
    }
    DEBUG && PRINT_N(1, " Ready to concatenate set_sells from data with sd.u_p length " + sd.u_p.length);
    const oad_s = cumulate.concatenate_cds(set_sells, sd.u_p); 
    DEBUG && PRINT_N(1, " Moving on constructing oad.  Note bi_st0 =" + bi_st0);
    this.oad = {'b':oad_b,'s':oad_s, 'nr': nr, 'bi_st0':bi_st0}; 
    DEBUG && PRINT_N(1, " Checking quality of oad.");
    if ((oad_b.u_p === null) || (oad_b.u_p === undefined) || (oad_s.u_p === null) || (oad_s.u_p === undefined)) {
      DEBUG && PRINT_N(-6, "Configuration of oads: we have u_p is null somewhere?");  debugger;
    }
    DEBUG && PRINT_N(1, " Installing click_func.");
    // Note "run_algo" defined up above;
    const click_func =  function(event) {
      DEBUG && PRINT_N(1, "graphing:::algo_button click: run_algo"); 
      my_this.this_run_algo(); 
      DEBUG && PRINT_N(1, " --- algo button.  Finished"); 
    }

    this.algo_button.addEventListener('click', click_func); 
    this.algo_button.addEventListener('onClick', click_func); 
    DEBUG && PRINT_N(1,"Automatically Run Algo anyway! GO!");
    run_algo(this, PRINT_N);
    if ((this.data.ps === null) || (this.data.ps === undefined)) {
      PRINT_N(-6, " ERROR, we have Order algo was run but returned nothing.");
    } else if (printer.is_numeric(this.data.ps)) {
      PRINT_N(-6, " ERROR on our algo run?" + this.data.ps + " inspect?"); debugger;
    }
    DEBUG && PRINT_N(1, "constructing orig nbbo, will try to replace with algo result.");
    this.orig.nbbo = (((this.data.nbbo !== null) && (this.data.nbbo !== undefined) && (this.data.nbbo.length > 0)) ? 
                       {'time': [...this.data.nbbo.time], 'nbb' : [...this.data.nbbo.nbb], 'nbo' : [...this.data.nbbo.nbb]}
                       : {'time':[], 'nbb':[], 'nbo':[]});
    let nbbo_diffs = this.data.ps.export_reduced_table(['v_best_bids','v_best_asks'], ['nbb','nbo'], 0, 0);
    if (nbbo_diffs === null) {
      PRINT_N(-6, "-- Attempt to algo configure: NBBO diffs returned null.  Why?"); debugger;
    }
    const imulti = 1.0 / multi;
    //nbbo_diffs['time'] = nbbo_diffs['time'].map((x)=>(Number(x) * imulti));
    if ((this.data.nbbo === null) || (this.data.nbbo === undefined) || (!(this.data.nbbo))) {
      if (nbbo_diffs.time.length > 0) {
        this.data.nbbo = nbbo_diffs;
      }
    }
    DEBUG && PRINT_N(2, " moving to out col.");
    const out_col =  (this.algo_data.w_crit_p > 0) ? ['v_b_crit_p','v_s_crit_p'] : ['v_b_wp','v_s_wp'];
    const npr = (this.algo_data.w_crit_p > 0) ? 0 : this.oad.nr;
    this.data.ps.wpt = this.data.ps.export_reduced_table_all_k(out_col, ['v_b_p','v_s_p'],npr);
    // my_this.data.ps.export_reduced_table_all_k(['v_b_crit_p','v_s_crit_p'], ['v_b_p','v_s_p'], 0);
    //for (let onk = 0; onk < this.algo_data.v_d.length; onk++) {
    //  this.data.ps.wpt = this.data.ps.export_reduced_table(['v_b_crit_p','v_s_crit_p'], ['v_b_p','v_s_p'], 0, 0);
    //} else if (this.algo_data.w_wp > 0) {
    //  this.data.ps.wpt = this.data.ps.export_reduced_table(['v_b_wp','v_s_wp'], ['v_b_p','v_s_p'], 0, 0);
    //}
    //nbbo_stuff = my_this.data.ps.export_reduced_table(['v_best_bids','v_best_asks'], ['nbb','nbo'], 0, 0);
    //'nbbo':nbbo.to_dict(orient='list'),'buys':buys.to_dict(orient='list'),'sells':sells.to_dict(orient='list'),
    DEBUG && PRINT_N(2,"configureData-confgure_algo_data: We have completed our data.");
    DEBUG && PRINT_N(2,"configureData, this.oad.b.vpi is length " + this.oad.b.vpi.length);
    DEBUG && PRINT_N(1, "configure Data concluded.");
  }
  //bigmult = pretty_num.bigmult;
  async createRenderer(props) {
    console.log("createRenderer has initiated.");
    const PRINT_N = this.PRINT_N;
    if (!(PRINT_N)) { console.log("createRenderer -- we don't have a PRINT_N"); }
    DEBUG && this.PRINT_N(0, " createRenderer initiated");
    if (!(this.canvas_gpu)) {
      this.setupWidget(props);
    } else {
      PRINT_N(1, "createRenderer -- tried to call setupWidget again.");
    }

    const ADD = await WebGPU_GetAdapterAndDevice();
    if ((ADD === null) || (ADD == undefined)) {
      PRINT_N(-6, "createRenderer() error, the ADD was returned NULL. ");  this.renderer=null;
      return(null);
    }
    PRINT_N(1, "--- I hope we received the Adapter and device");
    this.adapter = ADD.adapter; this.device = ADD.device;
    if (!(this.device)) {
      PRINT_N(-6, "ERROR this device is null in createRender() "); debugger;
    }
    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    if (!(this.presentationFormat)) {
      PRINT_N(-6, "ERROR this device has no presentationFormat"); debugger;
    }
    this.canvas_gpu.configure({ device:this.device, format: this.presentationFormat});
    
    this.renderer =  {
      get canvas() { return this.canvas_gpu; },
      get render() { return this.render; }
    };
    return(this.renderer);
  }
  setupWidget({properties}) {
    console.log("setupWidget has initiated");
    const PRINT_N = this.PRINT_N;
    DEBUG && PRINT_N(1,"rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
    DEBUG && PRINT_N(1,"rrr obwidget->class() calling::: setupWidget()");
    if (!(this.debug_button))  {
      debug_code.configureDebugButton(this);
    }
    if (!(this.widgetDiv)) {
      this.configureWidgetGPU(); this.add_time_slider_div(); this.add_price_slider_div(); this.add_time_axis_div(); this.add_price_axis_div(); this.add_unit_slider_div();
      this.create_mouse_svg()
    }
    DEBUG && PRINT_N(0,"ERROR rrr obwidget->class() we couldn't call configureWidgetGPU?");
    //configureWidgetGPU();
    if (!(this.widgetDiv)) {
      PRINT_N(-6,"ERROR rrr obwidget->class().setupWidget was not generated");
      debugger;
    }
  }
  setupDefaults() {
    this.canvasDiv = null; this.widgetDiv = null; this.canvas_gpu = null;
    this.clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };
    this.device = null; this.adapter = null; this.canvas_gpu = null; 
    this.presentationFormat=null;
    this.call_plot_again =  function() { console.log("default call_plot_again called: we will define"); }
    this.count_renders = 0; this.data = null;
  }
  configureForm() {
      this.formDiv = document.createElement('div');
      this.formDiv.setAttribute('id', "form_Div" + this.randomStr);
      this.formDiv.style.position = 'relative';  
      this.formDiv.style.display = 'flex';
      this.formDiv.style.flexDirection = 'column';
      this.formDiv.style.justifyContent = 'center';
      this.formDiv.style.alignItems = 'center';
      this.formDiv.setAttribute('z-level',0);
      //this.formDiv.form_top_line = svg_ob.make_hline('form_top_line' + this.randomStr, 0, 
      //  Math.floor(.02 * default_form_data.form_height), default_form_data.form_width, 'rgb(0,0,0)',5);
      //this.formDiv.form_bottom_line = svg_ob.make_hline('form_bottom_line' + this.randomStr, 0, 
      //  Math.floor(.98*default_form_data.form_height), default_form_data.form_width, 'rgb(0,0,0)',5);
      //this.formDiv.appendChild(this.formDiv.form_top_line); this.formDiv.appendChild(this.formDiv.form_bottom_line);
      // Implement Auto Widgth later
      //this.widgetDiv.style.width = this.data.width === 'auto' ? '100%' : `${this.width}px`;
      this.formDiv.style.left = 0 + 'px';
      this.formDiv.style.top = default_form_data.form_top + 'px';
      this.formDiv.setAttribute('left', 0 + 'px');
      this.formDiv.setAttribute('top', default_form_data.form_top + 'px');
      this.formDiv.style.width = (default_form_data.form_width) + 'px';
      this.formDiv.setAttribute('width', (default_form_data.form_width) + 'px');
      this.formDiv.style.height = Math.floor(default_form_data.form_height) + 'px'; 
      this.formDiv.setAttribute('height',(default_form_data.form_height) + 'px');
      // BACKGROUND -- Set to BLACK for REGL plot
      this.formDiv.style.background = 'var(--jp-layout-color0)';

      this.formDiv.setAttribute("font-family", "Arial"); 
      this.formDiv.setAttribute("font-size", Math.floor(default_form_data.form_font_size) + "px"); 
      this.formDiv.style.fontSize = Math.floor(default_form_data.form_font_size) + 'px';
      this.formDiv.innerHTML = "<hr>\n" +  default_form_data.Default_Form.filter((x)=>!x.startsWith('Algo Type: <input id')).join('\n') + "\n<hr>\n";

      this.formDiv.f_min = this.formDiv.querySelector("#input_mintime");
      this.formDiv.f_max = this.formDiv.querySelector("#input_maxtime");
      this.formDiv.f_input_participant_target = this.formDiv.querySelector('#input_participant_target');
      if ((this.formDiv.f_input_participant_target === null) || (this.formDiv.f_input_participant_target ===undefined)) {
        console.log("Error f_input_participant_target not found in form."); debugger;
      }
      this.el.appendChild(this.formDiv);
      this.configureFormHandles();
      this.configure_checkbox('drawQuotes','do_quotes');  this.configure_checkbox('drawNBBO', 'do_nbbo');
      this.configure_checkbox('drawTrades', 'do_trades'); this.configure_checkbox('drawDepths', 'do_wp'); 
  }
  configure_checkbox(check_name,do_name) {
     const check_box = this.formDiv.querySelector('#' + check_name);
     const my_this = this;
     check_box.addEventListener('change', () => {
       if (check_box.checked) {  my_this.do_plots[do_name] = true;
       } else { my_this.do_plots[do_name] = false; }
       my_this.call_plot();
     });
  }
  configureFormHandles() {
    const f_min = this.formDiv.querySelector("#input_mintime");
    const f_max = this.formDiv.querySelector("#input_maxtime");
    const numt = function(event) {
      const data = this.data;
      if ((event.target !== null) && (event.target !== undefined) && (event.target.length > 0) && (event.target != '')) {
        const atime = pretty_num.process_del_tm(event.target, data.unit, process_tm(data.st_time, data.unit));
        if (typeof(atime) == 'number') { return(atime); }
      }
      return(null);
    }
    if ((f_min !== null) &&  (f_min !== undefined)) {
      f_min.addEventListener("input", (event) => {
        const ntmin = numt(event);  if ((ntmin === null) || (ntmin == data.tmin)) { return(-1); }
        data.tmin = ntmin;  
        this.time_slider_div.noUiSlider.set([data.tmin, data.tmax]); 
        this.redraw_time_axis();  this.call_plot();
      });
    } else {
      console.log("No f_min yet"); debugger;
    }
    if ((f_max !== null) && (f_max !== undefined)) {
      f_max.addEventListener("input", (event) => {
        const ntmax = numt(event);  if ((ntmax === null) || (ntmax == data.tmin)) { return(-1); }
        data.tmax = ntmax;  
        this.time_slider_div.noUiSlider.set([data.tmin, data.tmax]); 
        this.redraw_time_axis(); this.call_plot();
      });
    } else {
      console.log("No f_max yet"); debugger;
    }
  }
  updateFormTime() {
    const data = this.data;
    //const f_min = this.formDiv.querySelector("#input_mintime");
    if ((this.formDiv.f_min !== null) && (this.formDiv.f_min !== undefined)) {
      this.formDiv.f_min.value = pretty_num.string_del_tm(data.tmin, data.unit, data.st_time, true);
    }
    //const f_max = this.formDiv.querySelector("#input_maxtime");
    if ((this.formDiv.f_max !== null) && (this.formDiv.f_max !== undefined)) {
      this.formDiv.f_max.value = pretty_num.string_del_tm(data.tmax, data.unit, data.st_time, true);
    }
  }
  configureWidgetGPU() {
      // Create a Canvas to draw a line onto
      console.log("ob.js -- configureWidgetGPU() started.");
      const PRINT_N = this.PRINT_N;
      if (!(PRINT_N)) { console.log("configureWidgetGPU() -- PRINT_N wasn't defined?"); }
      PRINT_N(1,"rrr obwidget->class() Declaring and setting DEFAULT Jupyter DIV (name=" + this.randomDIVNAME+ ") location [w,h]=[" + this.width + "," + this.height + "]");
      PRINT_N(1,"rrr obwidget->class() declaring a widgetDiv");
      if (!(this.data)) {
        PRINT_N(0, "ERROR configureWidgetGPU - this.data is not configured yet."); debugger;
      }
      if (!(this.data.width)) {
        PRINT_N(0, "ERROR configureWidgetGPU - this.data does not have width configured yet."); debugger;
      }
      this.margins =  {'left': Math.floor(this.data.width * .35), 'top': Math.floor(this.data.height)*.2, 'bottom': Math.floor(this.data.height)*.7, itm:.1, 'right':Math.floor(this.data.width*.2) }

      this.configureForm();

      this.widgetDiv = document.createElement('div');
      this.widgetDiv.setAttribute('id', "widget_Div" + this.randomStr);
      this.widgetDiv.style.position = 'relative';  
      this.widgetDiv.style.display = 'flex';
      this.widgetDiv.style.flexDirection = 'column';
      this.widgetDiv.style.justifyContent = 'center';
      this.widgetDiv.style.alignItems = 'center';
      this.widgetDiv.setAttribute('z-level',0);
      this.widgetDiv.draw_top = (default_form_data.form_top) + (default_form_data.form_height);
      this.widgetDiv.style.top = this.widgetDiv.draw_top + 'px'; this.widgetDiv.setAttribute('top', this.widgetDiv.draw_top + 'px');
      // Implement Auto Widgth later
      //this.widgetDiv.style.width = this.data.width === 'auto' ? '100%' : `${this.width}px`;
      const widget_width = Math.floor(this.data.width + this.margins.left + this.margins.right);
      this.widgetDiv.style.width = (widget_width) + 'px';
      const widget_height =  Math.floor(this.data.height + this.data.text_win_height + 
         this.margins.top + this.margins.bottom); 
      this.widgetDiv.style.height = widget_height + 'px'; 
      this.widgetDiv.setAttribute('height',(widget_height) + 'px');
      this.widgetDiv.setAttribute('width', (widget_width) + 'px');
      // BACKGROUND -- Set to BLACK for REGL plot
      this.widgetDiv.style.background = 'var(--jp-layout-color0)';
      this.el.appendChild(this.widgetDiv);


      this.textDiv = document.createElement('div');
      this.textDiv.style.font_family = 'Courier New';
      this.textDiv.setAttribute('font-family','Courier New');
      this.textDiv.style.fontFamily = 'Courier New';
      this.textDiv.setAttribute('name','text_Div');
      this.textDiv.setAttribute('id', "text_Div" + this.randomStr);
      this.textDiv.style.position = 'absolute';   
      this.textDiv.style.inset = '0'; this.textDiv.style.fontSize = '24px';
      this.textDiv.style.flexDirection = 'column'; this.textDiv.style.justifyContent = 'center';
      this.textDiv.style.alignItems = 'center'; this.textDiv.setAttribute('z-level',0);
      this.textDiv.style.top = (this.margins.top + this.margins.bottom + this.data.height) + 'px';  
      this.textDiv.style.left = this.margins.left + 'px';
      this.textDiv.style.width = (this.data.width) + 'px';
      this.textDiv.style.height = (this.text_win_height) + 'px'; 
      this.textDiv.setAttribute('top', (this.data.height + this.margins.top + this.margins.bottom) + 'px'); 
      this.textDiv.setAttribute('left', (this.margins.left + 'px'));
      this.textDiv.setAttribute('height',(this.data.text_win_height) + 'px');
      this.textDiv.setAttribute('width', (this.data.width) + 'px');
      this.widgetDiv.appendChild(this.textDiv); 
      this.widgetDiv.draw_top = this.margins.top;
      //this.count_widgettext = 0;
      PRINT_N(1, "obwidget->class->render() generating canvasDiv.");
      // D3 Might not work given the challenges of selection.  But Ideally 
      this.canvasDiv = document.createElement('div');
      this.canvasDiv.style.position = 'absolute';
      this.canvasDiv.style.inset = '0';
      //this.canvasDiv.style.top = (debug_button_heught) + 'px';
      //this.canvasDiv.setAttribute('top', (debug_button_height) + 'px');
      //
      this.canvasDiv.style.top = this.widgetDiv.draw_top +  'px';  this.canvasDiv.style.left = this.margins.left + 'px';
      this.canvasDiv.setAttribute('id', 'canvasDiv' + this.randomStr);
      this.canvasDiv.setAttribute('height',this.data.height + 'px');
      this.canvasDiv.setAttribute('width', Math.floor(this.data.width + this.margins.right + this.data.bar_width) + 'px');
      this.widgetDiv.appendChild(this.canvasDiv);
      PRINT_N(1, "rrr obwidget->class we have declared canvasDiv");
      PRINT_N(1,"rrr obwidget->class->render() we have generated canvasDiv, declaring canvas.");

      this.canvas = document.createElement('canvas');
      this.canvas.style.width=Math.floor(this.data.width) + 'px'; this.canvas.setAttribute('id','glcanvas'); this.canvas.style.height= (this.data.height) + 'px';
      this.canvas.setAttribute('height', this.data.height * this.data.canvas_pixels);
      this.canvas.setAttribute('width', Math.floor(this.data.width * this.data.canvas_pixels) + 'px');
      this.canvas.style.top = 0 + 'px'; this.canvas.style.left = 0 + 'px';
      this.canvas.setAttribute('left', 0 + 'px'); this.canvas.setAttribute('top', 0 + 'px');
      this.canvas.setAttribute('z-level',0);
      this.canvas.style.position = 'absolute';
      this.canvasDiv.appendChild(this.canvas);
      PRINT_N(1,"--- this: a Canvas Div has been created, but is it populated and usable?");
      PRINT_N(1,"--- Trying to get device/and material");

	 this.canvas_gpu = this.canvas.getContext('webgpu', {
        antialias: true,
        preserveDrawingBuffer: true,
        });
      if (!(this.canvas_gpu)) {
        PRINT_N(1,"obwidget->class->render Hm, I think we got this.canvas_gl, it appears to occur?");
      }
      PRINT_N(1, "obwidget-> I wonder where we went with gpu declared?  We need to render the demo data at some point and that is hard.");


      this.svg_zone = document.createElementNS(this.svgns, 'svg');
      this.svg_zone.style.width=(this.data.width) + 'px';  this.svg_zone.setAttribute('id','svg_zone'); this.svg_zone.style.height=(this.data.height)+'px';
      this.svg_zone.setAttribute('height',this.data.height);  this.svg_zone.setAttribute('width',this.data.width); this.svg_zone.setAttribute('z-level',3);
      this.svg_zone.setAttributeNS(this.svgns, "viewBox", "0 0 " + this.data.width + " " + this.data.height);
      this.svg_zone.style.position = 'absolute';
      this.svg_zone.setAttribute('left', 0 + 'px'); this.svg_zone.style.left = '0px'; this.svg_zone.style.top = '0px';
      this.svg_zone.setAttribute('top', 0 + 'px');


      this.canvas_bars = document.createElement('canvas');
      const cbw = Math.floor(this.data.bar_width + .5 * this.margins.right);
      if (!(is_positive_numeric(cbw))) {
        PRINT_N(-6, " Error, cbw from bar width calculated to be " + cbw); const my_this=this; debugger;
      } 
      this.canvas_bars.style.width=cbw + 'px';  this.svg_zone.setAttribute('id','canvas_bars_' + this.randomStr); 
      this.canvas_bars.style.height=(this.data.height)+'px';
      this.canvas_bars.setAttribute('height',this.data.height);  
      this.canvas_bars.setAttribute('width',cbw+"px"); this.svg_zone.setAttribute('z-level',3);
      this.canvas_bars.setAttributeNS(this.svgns, "viewBox", "0 0 " + this.data.width + " " + this.data.height);
      this.canvas_bars.style.position = 'absolute';  this.canvas_bars.style.zIndex='2';
      this.canvas_bars.setAttribute('left', Math.floor(this.data.width + this.margins.itm*this.margins.right) + 'px'); 
      this.canvas_bars.style.left = Math.floor(this.data.width + this.margins.itm * this.margins.right) + 'px'; this.svg_zone.style.top = '0px';
      this.canvas_bars.setAttribute('z-index',1);
      this.canvas_bars.style.zIndex = '1';
      this.canvas_bars.setAttribute('top', 0 + 'px');
      try {
        this.canvas_bars_context = this.canvas_bars.getContext('2d');
      } catch {
        PRINT_N(-6, " Failure to make canvas_bars_context.");
      }
      //const top_frac = 0.0;
      //const top_frac = 0.0;
      this.svg_bars = document.createElementNS(this.svgns, 'svg');
      this.svg_bars.style.width=Math.floor(this.data.bar_width + this.margins.right) + 'px';  this.svg_zone.setAttribute('id','svg_bars' + this.randomStr); 
      this.svg_bars.style.height=(this.data.height)+'px';
      this.svg_bars.setAttribute('height',this.data.height);  
      this.svg_bars.setAttribute('z-index',10);
      this.svg_bars.setAttribute('width',Math.floor(this.data.bar_width + this.margins.right)+"px"); this.svg_zone.setAttribute('z-level',3);
      this.svg_bars.setAttributeNS(this.svgns, "viewBox", "0 0 " + this.data.width + " " + this.data.height);
      this.svg_bars.style.position = 'absolute';
      this.svg_bars.setAttribute('left', 0 + 'px'); 
      this.svg_bars.style.zIndex=10;
      this.svg_bars.style.left = Math.floor(this.data.width + this.margins.itm * this.margins.right) + 'px'; this.svg_zone.style.top = '0px';
      this.svg_bars.setAttribute('top', 0 + 'px');
      //const top_frac = 0.0;
      //const top_frac = 0.0;
      //this.svg_zone.style.top = (top_frac * this.data.height) + 'px';
      this.canvasDiv.appendChild(this.svg_zone);
      this.canvasDiv.appendChild(this.svg_bars);
      this.canvasDiv.appendChild(this.canvas_bars);
      this.install_time_drag_button();  // Needs to be after svg_zone configured;
      this.install_run_algo_button();
      this.install_export_csv_button();
      this.install_draw_bars();
      this.install_dr_touch();
      this.configure_form_pt();
      //console.log("After configure time drag"); debugger;
  }
  viewSyncHandler(viewSync) {
    DEBUG && this.PRINT_N(1, " -- viewSyncHandler has been called .");
      if (!(!(viewSync))) {
        DEBUG && this.PRINT_N(1, "viewSyncHandler: subscribe event");
        //globalPubSub.subscribe(
        //  'gabriel_plot::view',
        //  this.externalViewChangeHandlerBound,
        //);
       } else {
        DEBUG && this.PRINT_N(1, "viewSyncHandler: unsubscribe event");
        //globalPubSub.unsubscribe(
        //  'gabriel_plot::view',
        //  this.externalViewChangeHandlerBound,
        //);
      }
  }
  BlankWindow() {
       console.log("gpuwidget.js->BlankWindow() we have executed.");
       // canvas_gpu is the context
       this.draw_ob.blank_main(this.canvas_gpu, this.device);
  }
  async keep_pause_render(properties) {
    const my_this = this;
    const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "ob.js->keep_pause render()::: ");
    DEBUG && PRINT_N(2, ":: keep_pause_render called.  Press: \"Render Widget\" button to begin widget calculations.");
  }
  async render(properties) {
    const PRINT_N = this.printer.make_print_n(this.verbose_ob, "ob.js->async_render()::: "); 
    
    if (!(PRINT_N)) {
      console.log("render -- issues, PRINT_N not found.");
      debugger
    }
    PRINT_N(1,"rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
    PRINT_N(1,"rrr gpuwidget.js -> await render(count_renders=" + this.count_renders + ") -- Initiate -- properties is developing");
    PRINT_N(1,"rrr: object.keys(properties) == [" + Object.keys(properties).join(",") + "]");
    let here_this = this;
    PRINT_N(1,"rrr gpuwidget.js -- calling setupWidget(properties)");
    if (!(this.canvas_gpu)) {  this.setupWidget(properties); }
    if (!(this.canvas_gpu)) { PRINT_N(0,"ERROR() -- await render() -- error, configureWidgetGPU failed."); debugger;}
    PRINT_N(1,"rrr Now calling this Create Renderer.");
    if (!window.ob_gpu_widget) {
      properties.text = "renderer_for window.gpuwidget";
      here_this.renderer = await here_this.createRenderer(properties);
      if ((here_this.renderer === null) || (here_this.renderer === undefined)) {
        console.log("async - Render, failed to create Renderer, here_this.renderer is null."); return(-1);
      }
      window.ob_gpu_widget = {
        renderer: here_this.renderer,
        versionLog: false,
      };
      PRINT_N(1,"rrr -- windowGPUWidget was given this.createRenderer, now count_renders = " + this.count_renders);
    } else {
      DEBUG && PRINT_N(1, "rrr --- ELSE: window.GLwidget is not null");
      properties.text = "rrr gpuwidget.js->await render(): window.GPUwidget exists?";
      await here_this.createRenderer(properties);
    }
    if (!(this.device)) {
      PRINT_N(-6, "ERROR - aync render(properties) still calling create Renderer one more time.");
      here_this.renderer = await this.createRenderer(properties);
      if ( (!(this.device)) || (this.renderer === null) || (this.renderer == undefined)) {
        PRINT_N(-6, "ERROR - async render(properties) with device is still non existant");
        debugger;
      }
    }
    PRINT_N(1,"rrr -- async render -- now triggering a possible requestAnimationFrame(), count_renders = " + this.count_renders);
    window.requestAnimationFrame(() => {
      DEBUG && PRINT_N(3, "rrr gpuwidget.js->await render(count_renders=" + this.count_renders + ") -- requestAnimationFrame() called -- inserting renderer.");
      const initialOptions = {
        renderer: window.ob_gpu_widget.renderer,
        canvas: here_this.canvas,
        actionKeyMap: { merge: 'meta', remove: 'alt' },
      };
      
      // Further stuff from jupyter-scatter
      if (this.width !== 'auto') {
        initialOptions.width = here_this.width;
      }
      // Not sure what API for container doew.
      // Container for widget
      //this.canvasDiv.api = this.camera_centered;
      this.viewSync = this.model.get('view_sync');
      this.viewSyncHandler(this.viewSync);
      console.log("obwidget.js -- async render() perhaps we should make a draw.");
      //this.camera_centered.draw().then(()=> {
      // })
      DEBUG && PRINT_N(0, " widow.requestAnimationFrame -- going for it call plot");
      this.call_plot();
      DEBUG && PRINT_N(1, "Calling model save changes now.");
      here_this.model.save_changes()
    });
    
    console.log("now is when we render a time slider.");
    //debugger;
    this.render_time_slider();
    this.render_price_slider();
    this.render_unit_slider();
  }
  reset_settings() {
    const my_this = this;
    const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "reset_settings");
    this.data.pmin = this.orig.pmin; this.data.pmax = this.orig.pmax;  this.data.tmin = this.orig.tmin;
    this.data.tmax = this.orig.tmax;  this.data.unit = this.orig.unit;
    this.time_slider_div.noUiSlider.set([my_this.data.tmin,my_this.data.tmax]); 
    this.price_slider_div.noUiSlider.set([my_this.data.pmin, my_this.data.pmax]); 
    this.unit_slider_div.noUiSlider.set( my_this.data.unit);
    this.redraw_price_axis(); this.updateFormTime();
    this.redraw_time_axis();  this.call_plot();
  }
  call_plot() {
    const PRINT_N = this.PRINT_N;
    PRINT_N(5, "this.call Plot has been called.");
    const here_this = this;
    const verbose = this.verbose;
    if (!(!(this.gpu_pipeline))) {
      PRINT_N(5, "this.call_plot() -- refilling uniform buffer.");
      this.draw_ob.fill_uniform_buffer(this.data, this.gpu_pipeline, this.gpu_pipeline.device)
      PRINT_N(5, "this.call_plot(): uniforms now [" + this.gpu_pipeline.buffers.uniform_buffer.join(",") + "]");
    }
    const frameFunction = (this_widget, draw_ob) => ({inputs}) => {
      const PRINT_N = this_widget.PRINT_N;
      PRINT_N(5, "call_plot() -- Generate Pipeline Called");
      if (!(this_widget.device)) {
        PRINT_N(-6, "call_plot() we can not create pipeline because this.device is still null");
        debugger;
      }
      if (!(this_widget.data)) {
        PRINT_N(-6, "call_plot: data is not derived yet."); return(-1);
      }
      if (!(is_numeric(this_widget.data.tmin))) {
        PRINT_N(-6, "call_plot: data.tmin is not numeric now. "); return(-1);
      }
      this_widget.gpu_pipeline = this.draw_ob.OB_generate_gpu_pipeline(this_widget.gpu_pipeline, this_widget.canvas_gpu,
        this_widget.adapter, this_widget.device, this_widget);
      DEBUG && PRINT_N(1, "call_plot()[frameFunction()]-- ob_pu_render to be called.");
      this.draw_ob.ob_gpu_render(this_widget.gpu_pipeline, this.do_plots);
    }
    let frameCallback = frameFunction(here_this, draw_ob);
    PRINT_N(5, "call_plot() -- about to trigger requestAnimationFrame");
    requestAnimationFrame(frameCallback);
    this.count_renders = this.count_renders + 1;
    if (!(this.model.set)) {
      PRINT_N(-1, "call_plot: weird, module set not working?"); debugger;
    }
    this.redraw_time_axis();  this.redraw_price_axis();
    this.model.set('count_renders', this.count_renders);  this.model.save_changes();
  }
  add_time_slider_div() {
    this.time_slider_div = this.add_me_widget_div('time_slider_div',this.widgetDiv,'absolute','0',
        Math.floor(this.widgetDiv.draw_top + this.data.height + .7*this.margins.bottom), this.margins.left,
        slider_pixels, //Math.floor((1.0/5.0)*this.margins.top), 
        this.data.width);
  }
  add_unit_slider_div() {
    this.unit_slider_div = this.add_me_widget_div('unit_slider_div',this.widgetDiv,'absolute','0',
       Math.floor(this.widgetDiv.draw_top - (4.0/7.0)*this.margins.top), this.margins.left,
       slider_pixels, this.data.width);
  }
  add_price_slider_div() {
    this.price_slider_div = this.add_me_widget_div('price_slider_div',this.widgetDiv,'absolute','0',
        this.widgetDiv.draw_top, Math.floor(.23 * this.margins.left),
        this.data.height, slider_pixels); //Math.floor(.15  * this.margins.left));
    //this.price_slider_div = document.createElement('div');
    //this.price_slider_div.setAttribute('id', "price_slider_div" + this.randomStr);
    //this.price_slider_div.style.position = 'absolute';this.price_slider_div.style.inset = '0';
    //this.price_slider_div.style.top = this.margins.top + 'px';  this.price_slider_div.style.left = Math.floor( (1.0/5.0) * this.margins.left) + 'px';
    //this.price_slider_div.style.height = this.data.height + 'px';  this.price_slider_div.style.width = Math.floor((1.0/4.0) * this.margins.left) + 'px';
    //this.price_slider_div.setAttribute('id', 'price_slider_div' + this.randomStr);
    //this.price_slider_div.setAttribute('height', this.data.height + 'px');
    //this.price_slider_div.setAttribute('width',  Math.floor((1.0/4.0) * this.margins.left) + 'px');
    this.price_slider_div.noUiSlider = null;
    //this.price_slider = document.createElement('div');
    //this.price_slider_div.appendChild(this.price_slider);
    //this.widgetDiv.appendChild(this.price_slider_div);
  }
  add_me_widget_div(divname,parent,in_position,in_inset,in_top,in_left,in_height,in_width) {
    let ndv = document.createElement('div');
    ndv = document.createElement('div'); ndv.setAttribute('id', divname + this.randomStr);
    ndv.style.position = in_position; ndv.style.inset = in_inset;
    ndv.style.top = in_top+ 'px';  ndv.style.left = in_left + 'px';
    ndv.style.height = in_height + 'px';  ndv.style.width = in_width + 'px';
    ndv.setAttribute('id', divname + this.randomStr);
    ndv.setAttribute('height', in_height + 'px'); ndv.setAttribute('top', in_top +'px');
    ndv.setAttribute('width',  in_width + 'px');  ndv.setAttribute('left', in_left+'px');
    ndv.noUiSlider = null;
    //this.price_slider = document.createElement('div');
    //this.price_slider_div.appendChild(this.price_slider);
    parent.appendChild(ndv);
    //this.__dict__[divname] = ndv;
    return(ndv);
  }
  add_time_axis_div() {
     const x2wid = xwid * 2;
     this.time_axis_div = this.add_me_widget_div('time_axis_div',this.widgetDiv,'absolute','0', (this.widgetDiv.draw_top + this.data.height), this.margins.left-xwid,
      this.margins.bottom, this.data.width+x2wid);
     const hline_y = Math.floor(this.margins.bottom * hline_effect);
     const tick_s = 30;
     const pathData = ("M " + (xwid) + "," + hline_y + " L " + (xwid+this.data.width) + "," + hline_y + 
                       " M " + (xwid) + "," + Math.floor(.1*hline_y) + " V " + Math.floor(hline_y*1.25) + 
                       " M " + (xwid + this.data.width) + "," + Math.floor(.1*hline_y) + " V " + Math.floor(hline_y*1.25));
     //const pathData = "M 0 " + hline_y + " L " + this.data.width + " " + hline_y; 
     //  Note that because Chrome has problems with svg, we need to createElementNS(this.svgns,...,...);
     this.time_axis_svg  = document.createElementNS(this.svgns,'svg');  this.time_axis_svg.setAttribute('id', 'time_axis_svg' + this.randomStr);
     this.time_axis_svg.style.height = 'auto'; //this.time_axis_svg.style.height = this.margins.bottom + 'px'; 
     this.time_axis_svg.setAttribute('height', this.margins.bottom +'px');
     this.time_axis_svg.style.width = '100%'; //this.time_axis_svg.style.width = (x2wid+this.data.width) + 'px'; 
     this.time_axis_svg.setAttribute('width', (this.data.width + x2wid)+'px' );
     this.time_axis_svg.setAttributeNS(this.svgns,'viewBox', '0 0 ' + (this.data.width + x2wid) + ' ' + (this.margins.bottom));
     //this.time_axis_svg.setAttribute('viewbox', '0 0 ' + (this.data.width + x2wid) + ' ' + (this.margins.bottom));
     this.time_axis_svg.setAttribute('z-level',2);
     // Create a new path element
     const path = document.createElementNS(this.svgns, 'path');
     path.setAttribute('d', pathData);
     // Set styling attributes (optional)
     path.setAttribute('id','main-path-time');
     path.setAttribute('stroke', 'black');
     path.setAttribute('stroke-width', '3');
     path.setAttribute('fill', 'black'); // No fill for a line
     // Append the path to the SVG container
     console.log("add_time_axis_div: pathData is " + pathData);
     this.time_axis_svg.appendChild(path);
     this.time_axis_div.appendChild(this.time_axis_svg);   
     this.time_axis_div.old_tmin = this.data.tmin-1; this.time_axis_div.old_tmax = this.data.tmax+1;
     if (!(is_numeric(this.time_axis_div.old_tmin))) {
       console.log("add_time_axis_div: error old_tmin set to null."); 
     }
     this.updateFormTime();
  }
  serve_times() {
    const u_tmin = this.draw_ob.buffers.uniform_buffer[0];
    const u0_tfrac = this.draw_ob.buffers.uniform_buffer[10];
    const u_tcmin = this.draw_ob.buffers.uniform_buffer[13];
    const rt = {'tmin': this.data.tmin, 'tmax':this.data.tmax, 'origmult':this.data.origmult,
                'unit': this.data.unit, 'st_time':this.data.st_time, 
                'st_tmin': pretty_num.string_del_tm(this.data.tmin, this.data.unit, 
                       this.data.st_time, true),
                'st_tmax': pretty_num.string_del_tm(this.data.tmax, this.data.unit, 
                       this.data.st_time, true),
                'u_tmin': u_tmin,
                'u_tmax': this.draw_ob.buffers.uniform_buffer[1],
                'u_tcmin': u_tcmin, 
                'u0_tfrac': u0_tfrac, 
                'u_2omult': this.draw_ob.buffers.uniform_buffer[11],
                'loc_tmin': u0_tfrac*(u_tmin*this.data.origmult -u_tcmin) - 1
    };
    return(rt);
  }
  redraw_time_axis() {
    if ((this.time_axis_div.old_tmin == this.data.tmin) &&  
        (this.time_axis_div.old_tmax == this.data.tmax)) { return(1); }
    this.time_axis_div.old_tmin = this.data.tmin; 
    this.time_axis_div.old_tmax = this.data.tmax;
    const hline_y = Math.floor(this.margins.bottom * hline_effect);
    //const svgIdnode = document.getElementById(this.time_axis_svg.id);
    //const myNode = document.getElementById("foo");
    const onsvg = this.time_axis_svg;
    const svgns = this.svgns;
    let onChild = onsvg.lastChild;
    while ((onChild) && (onChild.id != 'main-path-time')) {
      onsvg.removeChild(onChild);
      onChild = onsvg.lastChild;
    }
    //if (!(!(this.time_axis_div.values_for_axis))) {
    //for (let ii = 0; ii < this.time_axis_div.values_for_axis.length; ii++) {
    //  let element = this.time_axis_svg.getElementById('val_txt_'+ii);
    //  this.time_svg.removeChild(element);
    //  element = this.time_axis_svg.getElementById('ln_txt_'+ii);
    //}}
    this.time_axis_div.values_for_axis = pretty_num.pretty_num(this.data.tmin, this.data.tmax,7,false);
    //var min_text = this.time_axis_svg.getElementById('min_text'); 
    //if (!(min_text)) { this.time_axis_svg.removeChild(min_text); }
    //var max_text = this.time_axis_svg.getElementById('max_text'); 
    // if (!(max_text)) { this.time_axis_svg.removeChild(max_text); }
    let txtsize = 24;
    //this.time_axis_svg.appendChild(make_text_el('min_text', xwid, Math.floor(hline_y*1.85), (this.data.tmin).toFixed(2),12));
    //this.time_axis_svg.appendChild(make_text_el('max_text', xwid + this.data.width, Math.floor(hline_y*1.85), (this.data.tmax).toFixed(2),12));
    let tratio = 1.0 / (this.data.tmax-this.data.tmin); let pathtext = "";
    for (let ii = 0; ii < this.time_axis_div.values_for_axis.length; ii++) {
      let val = this.time_axis_div.values_for_axis[ii];
      let stval = pretty_num.string_del_tm(val, this.going.unit, this.data.st_time,true);
      let locx = Math.round(xwid + this.data.width * (this.time_axis_div.values_for_axis[ii] - this.data.tmin) * tratio);
      this.time_axis_svg.appendChild(make_text_el('val_txt_'+ii,locx,hline_y*1.55,stval,11));
      pathtext = pathtext + "M " + locx + "," + Math.floor(.5 * hline_y) + " V " + Math.floor(1.2*hline_y);
    } 
    //let element = this.time_axis_svg.getElementById('path2');  if (!(!element)) { this.time_axis_svg.removeChild(element); }
    const path2 = document.createElementNS(svgns,'path');
    path2.setAttribute('id','path2_t');  path2.setAttribute('stroke','black'); path2.setAttribute('stroke-width','2');
    path2.setAttribute('fill','black'); path2.setAttribute('d', pathtext); path2.setAttribute('z-level',2);
    this.time_axis_svg.appendChild(path2);
 
    //const axtext = ("[u,om] = {" + this.data.unit + "," + this.data.origmult + "}, [" + this.data.tmin + "," + this.data.tmax + "] or " +
    //               pretty_num.string_del_tm( this.data.tmin, this.going.unit, this.going.st_time,true) + ' to ' +
    //               pretty_num.string_del_tm( this.data.tmax, this.going.unit, this.going.st_time,true));

    const axtext = ("" +
                   pretty_num.string_del_tm( this.data.tmin, this.going.unit, this.going.st_time,true) + ' to ' +
                   pretty_num.string_del_tm( this.data.tmax, this.going.unit, this.going.st_time,true));
    let uncast_str = [pretty_num.string_del_tm( this.data.tmin, this.going.unit, this.going.st_time, true),
              pretty_num.string_del_tm( this.data.tmax, this.going.unit, this.going.st_time, true) ]
    let uncast =  [pretty_num.process_del_tm( uncast_str[0], this.orig.unit, this.orig.st_time),
                   pretty_num.process_del_tm( uncast_str[1], this.orig.unit, this.orig.st_time) ];
    if (uncast[0] < this.orig.tmin -.02) {
      console.log("Issue: uncast[0] = " + uncast[0] + " for " + uncast_str[0] + 
                  " but this.orig.tmin=" + this.orig.tmin + 
                  " for " + pretty_num.string_del_tm(this.orig.tmin, this.orig.unit, 
                                                     this.orig.st_time,true) 
                  + ".");
      debugger;
    }
    if (uncast[1] > this.orig.tmax + .02) {
      console.log("Issue: uncast[1] = " + uncast[1] + " for " + uncast_str[1] + " but this.orig.tmax=" + this.orig.tmax + 
                  " for " + pretty_num.string_del_tm(this.orig.tmax, this.orig.unit, this.orig.st_time,true) + ".");
      debugger;
    }

    let axis_descriptor = document.getElementById('time_axis_descriptor');
    if ((axis_descriptor == null) || (axis_descriptor == undefined) || (!(axis_descriptor))) {
      this.time_axis_svg.appendChild(make_text_el('time_axis_descriptor',this.data.width*.5, this.margins.bottom*.35,
        axtext, 20));
    } else {   axis_descriptor.textContent = axtext; }

    this.updateFormTime();
  }

  add_price_axis_div() {
     this.price_axis_div = this.add_me_widget_div('price_axis_div',this.widgetDiv,'absolute','0', (this.widgetDiv.draw_top - priceFontWid), 0,
         this.data.height + priceFontWid*10, this.margins.left);
     const pwid = this.margins.left;
     const hline_x = Math.floor(this.margins.left * vline_effect);
     const tick_s = 30;
     const pathData = (" M " + (pwid-hline_x) + "," + (priceFontWid) + " V " + (this.data.height + priceFontWid) +  
                       " M " + (pwid-.1*hline_x) + "," + (priceFontWid) + " H " + Math.floor(pwid-hline_x*1.3) + 
                       " M " + (pwid-.1*hline_x) + "," + (this.data.height + priceFontWid) + " H " + Math.floor(pwid-hline_x*1.3));
     //const pathData = "M 0 " + hline_y + " L " + this.data.width + " " + hline_y; 
     //  Note that because Chrome has problems with svg, we need to createElementNS(this.svgns,...,...);
     this.price_axis_svg  = document.createElementNS(this.svgns,'svg');  this.time_axis_svg.setAttribute('id', 'price_axis_svg' + this.randomStr);
     this.price_axis_svg.style.height = 'auto'; //this.time_axis_svg.style.height = this.margins.bottom + 'px'; 
     this.price_axis_svg.setAttribute('height', (this.data.height+priceFontWid) +'px');
     this.price_axis_svg.style.width = '100%'; //this.time_axis_svg.style.width = (x2wid+this.data.width) + 'px'; 
     this.price_axis_svg.setAttribute('width', (this.margins.left)+'px' );
     this.price_axis_svg.setAttributeNS(this.svgns,'viewBox', '0 0 ' + (this.margins.left) + ' ' + (this.data.height+2*priceFontWid));
     this.price_axis_svg.style.zIndex = 4;
     //this.time_axis_svg.setAttribute('viewbox', '0 0 ' + (this.data.width + x2wid) + ' ' + (this.margins.bottom));
     this.price_axis_svg.setAttribute('z-level',2);
     // Create a new path element
     const path = document.createElementNS(this.svgns, 'path');
     path.setAttribute('d', pathData);
     // Set styling attributes (optional)
     path.setAttribute('id','main-path-price');
     path.setAttribute('stroke', 'black');
     path.setAttribute('stroke-width', '3');
     path.setAttribute('fill', 'black'); // No fill for a line
     // Append the path to the SVG container
     console.log("add_price_axis_div: pathData is " + pathData);
     this.price_axis_svg.appendChild(path);
     this.price_axis_div.appendChild(this.price_axis_svg); 
     this.price_axis_div.old_pmin = this.data.pmin-1; this.price_axis_div.old_pmax = this.data.pmax+1;
  }
  redraw_price_axis() {
    if ((this.price_axis_div.old_pmin == this.data.pmin) &&  (this.price_axis_div.old_pmax == this.data.pmax)) { return(1); }
    this.price_axis_div.old_pmin = this.data.pmin; this.price_axis_div.old_pmax = this.data.pmax;
    const hline_x = Math.floor(this.margins.left * vline_effect);
    //const svgIdnode = document.getElementById(this.time_axis_svg.id);
    //const myNode = document.getElementById("foo");
    const onsvg = this.price_axis_svg;
    const svgns = this.svgns;
    let onChild = onsvg.lastChild;
    while ((onChild) && (onChild.id != 'main-path-price')) {
      onsvg.removeChild(onChild);
      onChild = onsvg.lastChild;
    }
    this.price_axis_div.values_for_axis = pretty_num.pretty_num(this.data.pmin, this.data.pmax,5,false);
    let txtsize = 20;
    let pratio = 1.0 / (this.data.pmax-this.data.pmin); let pathtext = "";
    for (let ii = 0; ii < this.price_axis_div.values_for_axis.length; ii++) {
      let val = this.price_axis_div.values_for_axis[ii];
      let locy =  Math.round(priceFontWid + this.data.height * (this.data.pmax - this.price_axis_div.values_for_axis[ii]) * pratio);
      this.price_axis_svg.appendChild(make_text_el('val_p_txt_'+ii,(this.margins.left - hline_x*2.1),locy,"$" + val.toFixed(2),priceFontWid));
      pathtext = pathtext + "M " + (this.margins.left - .5*hline_x) + "," + (locy) + " H " + (this.margins.left - 1.2 * hline_x);
    } 
    //let element = this.time_axis_svg.getElementById('path2');  if (!(!element)) { this.time_axis_svg.removeChild(element); }
    const path2 = document.createElementNS(svgns,'path');
    path2.setAttribute('id','path2_p');  path2.setAttribute('stroke','black'); path2.setAttribute('stroke-width','2');
    path2.setAttribute('fill','black'); path2.setAttribute('d', pathtext); path2.setAttribute('z-level',4);
    this.price_axis_svg.appendChild(path2);
  }
  get_mult(new_unit, fixed_unit) {
    if (Number.isNaN(new_unit)) {
      console.log("get_mult()  oh now, new_unit is nan?");  debugger;
    }
    let onn = new_unit * 1.0; let relmult = 1.0;
    while (onn > fixed_unit) {
       if ((onn ==4) || (onn ==2)) { relmult = relmult * 6.0; onn = onn-1;
       } else { onn=onn-1; relmult = relmult * 10.0; }}
    while (onn < fixed_unit) {
       if ((onn ==3) || (onn ==1)) { relmult = relmult / 6.0; onn=onn+1
       } else { onn = onn+1; relmult = relmult / 10.0; }}
    return(relmult);
  }
  render_unit_slider() {
    DEBUG && this.PRINT_N(0, ": big change to unit slider called.");
   
    this.unit_format = {
      to: (x) => { '10^{' +x + '}'},
      from: (txt) => { Number( txt.replace('10^{','').replace('}','')) }
    } ;
    this.unit_format = null;
    const values_for_time_slider = [5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9];
    const values_inside = values_for_time_slider.filter((x)=>{ 
      return((x <= this.orig.unit) && (x >= this.orig.unit-3)); 
    });
    this.unit_format = {
      to: function(value) { return ('10<sup>' + ('' + values_inside[Math.round(value)]) + '</sup>'); },
      from: function (value) { 
         console.log("unit_format:from() called on value = " + value);
         if (value == '0') { return(0); }
         //console.log(" help me"); debugger; 
         value = value.replace('10<sup>','');  value = value.replace('</sup>','');
         console.log("unit format->from(), value is now " + value);
         return Number( ('' + value)); }
    };
    noUiSlider.create(this.unit_slider_div, { start: '' + this.orig.unit, 
      step:1, format : this.unit_format, tooltips:true, range: { min: 0, max: values_inside.length - 1 },
      pips: { mode: 'steps', filter: (x) => {return(1)},format: this.unit_format,density:50 }
    });
    this.unit_slider_div.noUiSlider.set( this.orig.unit);
    this.unit_slider_div.noUiSlider.on('set', (values, handle) => {
     console.log('slider has called itself: new unit will be values[0] =' + 
                    values[0] + " from current = " + this.going.unit);
     let new_unit = this.unit_format.from(values[0]) * 1.0;  if (Number.isNaN(new_unit)) { new_unit = 0; }

     const old_unit = this.going.unit * 1.0;
     if (new_unit == old_unit) { return; }
     const origmult = this.get_mult(new_unit*1.0, this.orig.unit*1.0);
     const relmult = this.get_mult(new_unit*1.0, old_unit*1.0);

     this.data.origmult = origmult * 1.0; // unitx = -2                 ; orig.unit = 0
                                    // tm_unitx = 100.0;          ; tm_orig = 1.0
     let try_min = this.orig.tmin;  let try_max = this.orig.tmax;  
     let cpt; let onwid = this.data.tmax-this.data.tmin;
     if (new_unit > old_unit) {
       try_min = (this.going.tmin - (relmult-1) * (this.going.tmax-this.going.tmin)) / relmult;
       try_max= (this.going.tmax + (relmult-1) * (this.going.tmax-this.going.tmin)) / relmult;
     } else {
       if (this.data.tmax - this.data.tmin <   relmult * (this.going.tmax - this.going.tmin)) {
          try_min = this.data.tmin / relmult;  try_max = this.data.tmax / relmult;
       } else {
          cpt = (this.data.tmax + this.data.tmin) * .5;  onwid = (this.data.tmax - this.data.tmin);
          try_min = (cpt - onwid * relmult *2 );  
          try_max = (cpt + onwid * relmult * 2);
       }
     }      
     if (compare_two_unit_num( this.orig.tmin, this.orig.unit, try_min, new_unit, this.orig.st_time) > 0) {
       try_min = pretty_num.recast_unit(this.orig.tmin, this.orig.unit, new_unit, this.orig.st_time);
     }
     if (compare_two_unit_num( this.orig.tmax, this.orig.unit, try_max, new_unit, this.orig.st_time) < 0) {
       try_max = pretty_num.recast_unit(this.orig.tmax, this.orig.unit, new_unit, this.orig.st_time);
     }
     //if (try_min*this.data.origmult < this.orig.tmin) { try_min = this.orig.tmin/this.data.origmult }
     //if (try_max*origmult > this.orig.tmax) { try_max = this.orig.tmax/this.data.origmult }
     if (!(is_numeric(try_min))) {
       console.log("render_unit_slider, we tried to construct try_min but got a non numeric. Look above.");  
       debugger;
     }
     if (!(is_numeric(try_max))) {
       console.log("render_unit_slider, we tried to construct try_max but got a non numeric. Look above.");  
       debugger;
     }
     this.going.tmin = try_min*1.0; this.going.tmax = try_max*1.0; 
     this.going.unit = new_unit*1.0;  this.data.unit = new_unit*1.0;
     this.data.tmin = try_min*1.0; this.data.tmax = try_max*1.0;
     console.log("render_unit_slider we finish with origmult = " + origmult + " now ");
     if (this.going.unit == this.orig.unit) {  this.going.tmax = this.orig.tmax*1.0;  
       this.going.tmin = this.orig.tmin*1.0; 
       this.data.tmax=this.orig.tmax*1.0; this.data.tmin = this.orig.tmin*1.0;
     } 
     this.draw_ob.fill_uniform_buffer(this.data, this.gpu_pipeline, this.gpu_pipeline.device)
     this.render_time_slider(); 
     this.draw_ob.renew_uniform_buffer(this.data, this.gpu_pipeline, this.gpu_pipeline.device)
     if (old_unit < new_unit) {
       //this.draw_ob.ob_gpu_render(this.gpu_pipeline);
       this.call_plot();
       //console.log("ob.js (on) Old unit < new unit.  call_plot() had been called.  Now, what is condition?");
       //debugger; 
       this.BlankWindow();
       if (this.draw_ob.buffers.wp !== null) { this.draw_ob.buffers.wp.doplot = true; }
       this.draw_ob.ob_gpu_render(this.gpu_pipeline, this.do_plots);
       //console.log("ob.js (on) we tried to gpu render.");
       //debugger;
     }
     //console.log("ob.js (on)  we continue where next?");
     return;
    });
  }
  render_time_slider() {
    const on_tmin = this.going.tmin; const on_tmax = this.going.tmax;
    const on_unit = this.going.unit; const on_st_time = this.going.st_time;
    const my_this = this;
    const PRINT_N = this.PRINT_N;
    DEBUG && PRINT_N(0, ": render_time_slider() intiated [" + on_tmin + "," + on_tmax + "]");
    const values_for_time_slider = pretty_num.pretty_num(on_tmin, on_tmax, 5, false);
    const values_inside = values_for_time_slider.filter((x)=> { return((x>=on_tmin) && (x<=on_tmax)) });
    my_this.time_range_dict = {'min': on_tmin, 'max':on_tmax};
    //for (let ii = 0; ii < values_inside.length; ii++) { ddict[ii] = values_inside; }
    //debugger;
    DEBUG && PRINT_N(0,"values_for_time_slider are [" + values_for_time_slider.join(", ") + "]");
    console.log("values_for_time_slider[0] = " + values_for_time_slider[0]);
    //var format = { to: function(value) { return values_for_time_slider[Math.round(value)]; },
    //             from: function (value) { return values_for_time_slider.indexOf(Number(value)); }};

    let process_del_tm = my_this.pretty_num.process_del_tm;
    let string_del_tm = my_this.pretty_num.string_del_tm;
    let clean_process_string0 = my_this.pretty_num.clean_process_string0;
    let total_secs = my_this.pretty_num.total_secs;
    this.time_format = { to: function(value) { return (value.toFixed(2)); },
                 from: function (value) { return Number(value).toFixed(2); }};
    
    const curry_time_function_A = (on_unit,on_st_time) => (value) => { return(
      pretty_num.string_del_tm(value,on_unit, on_st_time,true)
    ); }
    const time_function_A = curry_time_function_A(on_unit, on_st_time);
    const curry_time_function_B = (on_unit, on_st_time) => (value)=> { return(
     pretty_num.process_del_tm(value, on_unit, on_st_time)
     );  
    }
    const time_function_B = curry_time_function_B(on_unit, on_st_time);
    //console.log("debugger on time slider");
    //debugger;
    this.time_format = {to:time_function_A, from:time_function_B };
    if (!(!(my_this.time_slider_div.noUiSlider))) {
      DEBUG && PRINT_N(2, "Destroy existing noUiSlider.");
      my_this.time_slider_div.noUiSlider.destroy();
      my_this.time_slider_div.noUiSlider = null;
    } 
    let keep_funcs = true;  if (my_this.data.unit <= -2) { keep_funcs = false; }
    let CurStringNums =  [my_this.pretty_num.string_del_tm(my_this.data.tmin,my_this.data.unit,my_this.data.st_time,keep_funcs), 
               my_this.pretty_num.string_del_tm(my_this.data.tmax,my_this.data.unit,my_this.data.st_time,keep_funcs)
    ];
    let CastStringNums = [my_this.pretty_num.process_del_tm(CurStringNums[0], my_this.data.unit, my_this.data.st_time),
          my_this.pretty_num.process_del_tm(CurStringNums[1], my_this.data.unit, my_this.data.st_time)];
    // my_this.pretty_num.string_del_tm(CastStringNums[0], my_this.data.unit, my_this.data.st_time)
    if ((Math.abs(CastStringNums[0] - my_this.data.tmin) > .01) || 
        (Math.abs(CastStringNums[1] - my_this.data.tmax) > .01)) {
      PRINT_N(-6, "ERROR inside obs.js->render_time_slider().  tmin/tmax = [" + this.data.tmin + "," + this.data.tmax + "], CurStringNums= " +
                 "[" + CurStringNums.join(",") + "], CastStringNums=[" +  CastStringNums[0] + "," + CastStringNums[1] + "]");
      console.log(" -- note keep_funcs = " + keep_funcs);
      console.log(" -- warning my_this.data.unit = " + my_this.data.unit + ", my_this.data.origmult = " + my_this.data.origmult);
      console.log(" my_this.data.st_time = \"" + my_this.data.st_time + "\"");
      console.log(" my_this.data.unit = " + my_this.data.unit);
      console.log(" CurStringNums[0] = " + CurStringNums[0] + "; CurStringNums[1] = " + CurStringNums[1] + ";");
      debugger;
    }
 
    DEBUG && PRINT_N(2, " Calling ActHandle: orginally my_this(u=" + my_this.data.unit + " times are [" + my_this.data.tmin + "," + my_this.data.tmax + "] or " + 
             "[" + CurStringNums[0] + "," + CurStringNums[1] + "] or [" +
             "" + pretty_num.process_del_tm(CurStringNums[0], my_this.data.unit, my_this.data.st_time) +  ","
                + pretty_num.process_del_tm(CurStringNums[1], my_this.data.unit, my_this.data.st_time) + "]"
              );
    noUiSlider.create(this.time_slider_div, {  start: [this.time_format.to(on_tmin), this.time_format.to(on_tmax)],
       // A linear range from 0 to 15 (16 values)
       range: my_this.time_range_dict, step: .25, connect: true, margin:.25, 
       tooltips: true, format: this.time_format, pips: { mode: 'positions', format: this.time_format, values:[0,20,40,60,80,100],density:10 },
    });
    this.time_slider_div.noUiSlider.set([this.time_format.to(on_tmin), this.time_format.to(on_tmax)]); 

    //if (this.data.unit == -1) { console.log(" look at what you've done "); debugger; }
    const ActHandle = function(values,handle) {
          // Send the updated value back to Python
      let lmbda_B = (on_unit, on_st_time) => (value) => {
        return(pretty_num.process_del_tm(value, on_unit, on_st_time)) };
      let lmbda_BB = lmbda_B(on_unit, on_st_time);
      if (!(is_numeric(lmbda_BB(values[handle])))) {
        PRINT_N(-6, "ActHandle: definition, handle = " + handle + " but the lmbda_BB function does not return a numeric");
        PRINT_N(-9, `-- on_unit = {on_unit}, and on_st_time = {on_st_time}.`);
        debugger;
      }
      if (handle == 0) { my_this.data.tmin = lmbda_BB(values[handle]); my_this.model.set('tmin', my_this.data.tmin); }
      if (handle == 1) { my_this.data.tmax = lmbda_BB(values[handle]); my_this.model.set('tmax', my_this.data.tmax); }
      my_this.redraw_bar_line();
      //console.log("set: we now have this.data.tmin/tmax = [" + this.data.tmin + ", " + this.data.tmax + "]");
      my_this.model.save_changes();

      // TimeUpdateHere
      my_this.call_plot();
      
    };
    ActHandle(CurStringNums,0);
    this.time_slider_div.noUiSlider.on('slide', ActHandle); 
    //console.log("render_time_slider_end");
    //debugger;
   
  }
  render_price_slider() {
    const on_pmin = this.orig.pmin; const on_pmax = this.orig.pmax;
    DEBUG && this.PRINT_N(0, ": render_price_slider() intiated [" + on_pmin + "," + on_pmax + "]");
    const values_for_time_slider = pretty_num.pretty_num(on_pmin, on_pmax, 5, false);
    const values_inside = values_for_time_slider.filter((x)=> { return((x>=on_pmin) && (x<=on_pmax)) });
    var price_range_dict = {'min': on_pmin, 'max':on_pmax};
    //for (let ii = 0; ii < values_inside.length; ii++) { ddict[ii] = values_inside; }
    //debugger;
    DEBUG && this.PRINT_N(0,"render_price_slider(): values_for_time_slider are [" + values_for_time_slider.join(", ") + "]");
    console.log("values_for_time_slider[0] = " + values_for_time_slider[0]);
    //var format = { to: function(value) { return values_for_time_slider[Math.round(value)]; },
    //             from: function (value) { return values_for_time_slider.indexOf(Number(value)); }};

    this.price_format = { to: function(value) { return (value.toFixed(2)); },
                 from: function (value) { return Number(value).toFixed(2); }};
    if (!(!(this.price_slider_div.noUiSlider))) {
      console.log("Destroy existing noUiSlider.");
      this.price_slider_div.noUiSlider.destroy();
      this.price_slider_div.noUiSlider = null;
    }
    noUiSlider.create(this.price_slider_div, {  start: [on_pmin, on_pmax],
       // A linear range from 0 to 15 (16 values)
       range: price_range_dict, step: .25, connect: true, 
       margin:.25,orientation: 'vertical', height:this.data.height,direction:'rtl',
       tooltips: true, format: this.price_format, 
       pips: { mode: 'positions', format: this.price_format, values:[0,20,40,60,80,100],density:10 },
    });
    this.price_slider_div.noUiSlider.set([on_pmin, on_pmax]); 

    // Note "set" will only change plot on let go
    this.price_slider_div.noUiSlider.on('slide', (values, handle) => {
          // Send the updated value back to Python
      if (handle == 1) { this.data.pmax = parseFloat(values[handle]); this.model.set('pmax', this.data.pmax); }
      if (handle == 0) { this.data.pmin = parseFloat(values[handle]); this.model.set('pmin', this.data.pmin); }

      if ((this.bardr !== null) && (this.bardr !== undefined)) { this.draw_bars(); }
      //console.log("set: we now have this.data.tmin/tmax = [" + this.data.tmin + ", " + this.data.tmax + "]");
      this.model.save_changes();
      this.call_plot();
    });
   
  }
  async get_uniform_device_buffer() {
    return(await this.draw_ob.get_device_buffer(this.gpu_pipeline, this.gpu_pipeline.uniform_device_buffer));
  }
  async get_nbbo_vert_device_buffer() {
    return(await this.draw_ob.get_device_buffer(this.gpu_pipeline, this.gpu_pipeline.nbbo_vert_device_buffer));
  }
  async get_device_nbbo_buffers_time() {
    return(await this.draw_ob.get_device_buffer(this.gpu_pipeline, this.gpu_pipeline.device_nbbo_buffers.time));
  }
  create_mouse_svg() {
   const mouse_text_height = Math.floor( (1.0/6.0) * this.margins.top);
   const mouse_text_width = Math.floor(.7 * this.data.width);
   const my_this = this;
   this.mouse_text_div = this.add_me_widget_div('mouse_text_div',
      this.widgetDiv,'absolute','0', Math.floor(mouse_text_height), 
      Math.floor( this.margins.left +  (this.data.width-mouse_text_width)), mouse_text_height, (mouse_text_width));
   this.widgetDiv.appendChild(this.mouse_text_div);
   let nsvg = document.createElementNS(this.svgns,'svg');  
   nsvg.setAttribute('id', 'mouse_text_svg' + this.randomStr);
   nsvg.style.height = 'auto'; 
   nsvg.setAttribute('height', mouse_text_height); 
   nsvg.style.width = '100%'; 
   nsvg.setAttribute('width', mouse_text_width); 
   nsvg.setAttributeNS(this.svgns,'viewBox', '0 0 ' + mouse_text_width + ' ' + mouse_text_height); 
   nsvg.setAttribute('z-level',2);
   this.mouse_text_div.mouse_text_svg = nsvg;  this.mouse_text_div.appendChild(nsvg);
   let ttip_div = document.createElement('div'); 
   ttip_div.setAttribute('id','ttip_div'); ttip_div.setAttribute('title','Selected');
   const ttip_width_height = [Math.floor(this.data.width*.5), Math.floor(this.data.height*.5)];
   ttip_div.style = "position: absolute; visibility: hidden; background-color: white; " + 
                    "border: 1px solid black; padding: 5px";
   ttip_div.setAttribute('position','absolute'); //ttip_div.setAttribute('class','tooltip');
   ttip_div.setAttribute('background-color', '#333');  
   ttip_div.setAttribute('color','#fff');  ttip_div.setAttribute('padding','8px');
   ttip_div.setAttribute('border-radius','4px');  
   ttip_div.setAttribute('z-level',1000);  ttip_div.setAttribute('opacity',1);
   ttip_div.setAttribute('z-index',1000); ttip_div.style.position = 'absolute';  ttip_div.style.zIndex = 1000;
   ttip_div.setAttribute('left', this.margins.left);  ttip_div.setAttribute('bottom',this.margins.top); 
   ttip_div.setAttribute('transition', 'opacity 0.3s ease-in-out'); 
   ttip_div.style.height = Math.floor(this.data.height*.5); ttip_div.style_width = Math.floor(this.data.width * .5);
   ttip_div.setAttribute('width', ttip_width_height[0] + "px");  
   ttip_div.setAttribute('height',ttip_width_height[0] + "px");
   ttip_div.style.width = ttip_width_height[0] + "px"; ttip_div.style.height = ttip_width_height[1] + "px";
   //ttip_div.setAttribute('class','ob_tooltip');
   let ttip_svg = document.createElementNS(this.svgns,'svg'); ttip_svg.setAttribute('id','ttip_svg'); 
   ttip_svg.setAttribute('title','ttip_svg'); ttip_svg.setAttribute('name','ttip_svg');
   ttip_svg.setAttribute('width',ttip_width_height[0] + 'px'); ttip_svg.setAttribute('height',ttip_width_height[1] + 'px');
   ttip_svg.style.height = ttip_width_height[1] + 'px'; ttip_svg.style.width= ttip_width_height[0] + 'px';
   //let ttip_path = document.createElementNS(this.svgns,'path');  ttip_path.setAttribute('id','ttip_path');
   //ttip_path.setAttribute('d','M 0,0 L 200,0 L 200,150 L 0,150 L 0,0');
   //ttip_svg.appendChild(ttip_path); ttip_div.appendChild(ttip_svg);
   my_this.ttip_div = ttip_div;
   ttip_div.appendChild(ttip_svg);
   my_this.widgetDiv.appendChild(ttip_div);  
   svg_ob.add_svg_mouse_over(my_this.canvasDiv, my_this.svg_zone, my_this.mouse_text_div.mouse_text_svg, my_this.data, 
      mouse_text_width, mouse_text_height, price_delta, my_this.widgetDiv, this.margins, this)
   //debugger;
  }
  addClickListener() {
    // How to update data (but we will probably do other things on click) 
    this.el.addEventListener('click', (event) => {
      DEBUG && this.PRINT_N(1, "obwidget -- el was clicked");  return(-1);
      if (event.target === this.canvas) {
      DEBUG && this.PRINT_N(1, "obwidget.el.eventListener('click') -- in canvas you clicked at (X,Y)=(" + event.clientX + ", " + event.clientY + ")");
      DEBUG && this.PRINT_N(1, "obwidget.el.eventListener shifting the camera.");
      const here_this = this;
      const frameFunction = (this_widget, tgpu) => (buttons,x,y) => {
        DEBUG && this.PRINT_N(1, "frameFunction called");
        here_this.gpu_pipeline = tgpu.GPUNetPipeline(here_this.gpu_pipeline, here_this.canvas_gpu, 
           here_this.gpu_camera.st_camera.permapj, here_this.adapter, here_this.device, here_this);
        tgpu.GPUNetRender(here_this.gpu_pipeline, here_this.gpu_camera.st_camera.permapj,1,here_this.count_renders);
      }
      let frameCallback = frameFunction(this, tgpu);
      requestAnimationFrame(frameCallback);
      this.count_renders = this.count_renders + 1;
      this.model.set('mouse_x', event.clientX);
      this.model.set('mouse_y', event.clientY);
      this.model.save_changes();
      DEBUG && this.PRINT_N(1, "gpuwidget.el.eventListener('click') -- end click at (X,Y)=(" + 
        event.clientX + ", " + event.clientY + ")");
      } else {
        DEBUG && this.PRINT_N(1, "el.addEventListner -- hey: clicked but target is not canvas.");
      }
    });
  }
  install_run_algo_button() {
    const my_this = this;
    const off_color = 'rgb(239,239,239)'; const on_color = 'rgb(60,250,60)';
    const PRINT_N = printer.make_print_n(this.verbose_ob, "ob.js->install_run_algo_button(): ");
    this.run_algo_button = document.createElement('button');
    this.run_algo_button.style.height = '60' + 'px'; this.run_algo_button.style.width = '250' + 'px';
    this.run_algo_button.setAttribute('id','run_algo_button' + this.randomStr);
    this.run_algo_button.setAttribute('name','run_aglo_button');
    this.run_algo_button.setAttribute('text','Rerun Algo')
    this.run_algo_button.style.position = 'absolute';  
    this.run_algo_button.setAttribute('value','Zoom in Time')
    this.run_algo_button.setAttribute('height','60px')
    this.run_algo_button.setAttribute('width', '250px')
    this.run_algo_button.style.backgroundColor = off_color;
    this.run_algo_button.setAttribute('top', '10px');  this.run_algo_button.style.top = '10px'; this.run_algo_button.style.left = buttons_left_loc[1] + 'px';
    this.run_algo_button.setAttribute('left','1100px');
    this.run_algo_button.innerHTML = 'Rerun Algo'; this.run_algo_button.style.fontSize = '20px';
      //my_this.algo_button.addEventListener('click', (event) => { in_this=my_this; console.log("graphing:::algo_button clicked");  debugger;});
      //my_this.algo_button.addEventListener('onClick', (event) => { in_this=my_this; console.log("graphing:::algo_button clicked"); debugger;});
    this.run_algo_button.is_down = false;  this.run_algo_button.event0 = null;
    this.run_algo_button.run_mouse = false;
    const handle_run_algo = function() {
       my_this.run_algo_button.run_mouse = false;  my_this.run_algo_button.style.backgroundColor = on_color;
       PRINT_N(2, "handle_run_algo called");
       my_this.formDiv.depths = my_this.formDiv.querySelector("#input_v_d");
       let try_d = (!(!(my_this.formDiv.depths))) ? my_this.formDiv.depths.value : null; let out_try_d = null;
       if ((try_d !== null) && (try_d !== undefined) && (try_d.length > 0) && (typeof(try_d) == 'string')) {
         if ((try_d[0] == '[') && (try_d[try_d.length-1] == ']')) { try_d = try_d.substring(1, try_d.length-1); }
         try_d = try_d.split(',');
         out_try_d = [];
         for (let ii=0; ii < try_d.length;ii++) {
           if ((try_d[ii] !== null) && (try_d[ii] !== undefined) && (!(Number.isNaN(Number(try_d[ii])))) && (Number(try_d[ii]) > 0)) { 
             out_try_d.push(Number(try_d[ii]));
           }
         }
         out_try_d = [...new Set(out_try_d)].sort((a,b) => a-b);
         if (out_try_d.length >= 1) {
           PRINT_N(2, "Update v_d to [" + (out_try_d.join(",")) + "]");
           my_this.algo_data.v_d = out_try_d;
         }
       }
       my_this.formDiv.algoType = my_this.formDiv.querySelector('#input_algo_type');
       let algo_t = (!(!(my_this.formDiv.algoType))) ? my_this.formDiv.algoType.value : null;
       if (algo_t !== null) {
         if (!(Number.isNaN(Number(algo_t)))) {
           algo_t = Number(algo_t);
         }
         algo_t = ord_algo.isin_Kalgo(algo_t);
         if ((algo_t !== ord_algo.Kalgo.Unknown) && (ord_algo.isin_Kalgo(algo_t) != my_this.algo_data.kalgo)) {
            my_this.algo_data.kalgo = ord_algo.isin_Kalgo(algo_t);  PRINT_N(2, "New Kalgo determined: " + ord_algo.str_kalgo(my_this.algo_data.kalgo));
         }
       } else {
         algo_t = ord_algo.Kalgo.Unknown;
       };
       PRINT_N(2, " --- attempting a rerun with new kalgo");
       run_algo(my_this, PRINT_N);
       PRINT_N(2, "handle_run_algo: algorithm concluded: extracting wp");
       const out_col =  (my_this.algo_data.w_crit_p > 0) ? ['v_b_crit_p','v_s_crit_p'] : ['v_b_wp','v_s_wp'];
       const npr = (my_this.algo_data.w_crit_p > 0) ? 0 : my_this.oad.nr;
       my_this.data.ps.wpt = my_this.data.ps.export_reduced_table_all_k(out_col, ['v_b_p','v_s_p'],npr);
       PRINT_N(2, "Okay, we did our run of algo -- did we get wpt?");
       my_this.run_algo_button.style.backgroundColor = 'rgb(250,0,0)';
       PRINT_N(2, " Running  update to buffers wp");
       my_this.draw_ob.update_buffers_wp(my_this.data, my_this.verbose_ob, my_this.pretty_time);
       PRINT_N(2, " Update buffers_wp with new data");
       my_this.call_plot();
       my_this.run_algo_button.style.backgroundColor = off_color;
       PRINT_N(2, " Don rerun algo with algo_t = "  + ord_algo.str_kalgo(algo_t) + ", and data [" + my_this.algo_data.v_d.join(",") + "]");
    }
    this.run_algo_button.addEventListener('click', handle_run_algo);
    this.formDiv.appendChild(this.run_algo_button);
  }

  install_export_csv_button() {
    const my_this = this;
    const off_color = 'rgb(239,239,239)'; const on_color = 'rgb(60,250,60)';
    const PRINT_N = printer.make_print_n(this.verbose_ob, "ob.js->export_csv(): ");
    this.export_orders_csv_button = document.createElement('button');
    this.export_orders_csv_button.style.height = '60' + 'px'; this.export_orders_csv_button.style.width = '250' + 'px';
    this.export_orders_csv_button.setAttribute('id','export_orders_csv_button' + this.randomStr);
    this.export_orders_csv_button.setAttribute('name','export_orders_csv_button');
    this.export_orders_csv_button.setAttribute('text','Export Csv')
    this.export_orders_csv_button.style.position = 'absolute';  
    this.export_orders_csv_button.setAttribute('value','Export Csv')
    this.export_orders_csv_button.setAttribute('height','60px')
    this.export_orders_csv_button.setAttribute('width', '150px')
    this.export_orders_csv_button.style.backgroundColor = off_color;
    this.export_orders_csv_button.setAttribute('top', '90px');  this.export_orders_csv_button.style.top = '90px'; this.export_orders_csv_button.style.left = buttons_left_loc[0] + 'px';
    this.export_orders_csv_button.setAttribute('left','1400px');
    this.export_orders_csv_button.innerHTML = 'Export Orders Csv'; this.export_orders_csv_button.style.fontSize = '20px';
    this.export_algo_csv_button = document.createElement('button');
    this.export_algo_csv_button.style.height = '60' + 'px'; this.export_algo_csv_button.style.width = '250' + 'px';
    this.export_algo_csv_button.setAttribute('id','export_algo_csv_button' + this.randomStr);
    this.export_algo_csv_button.setAttribute('name','export_algo_csv_button');
    this.export_algo_csv_button.setAttribute('text','Export Algo Csv')
    this.export_algo_csv_button.style.position = 'absolute';  
    this.export_algo_csv_button.setAttribute('value','Export Algo Csv')
    this.export_algo_csv_button.setAttribute('height','60px')
    this.export_algo_csv_button.setAttribute('width', '150px')
    this.export_algo_csv_button.style.backgroundColor = off_color;
    this.export_algo_csv_button.setAttribute('top', '90px');  this.export_algo_csv_button.style.top = '90px'; this.export_algo_csv_button.style.left = buttons_left_loc[1] + 'px';
    this.export_algo_csv_button.setAttribute('left','1400px');
    this.export_algo_csv_button.innerHTML = 'Export Algo Csv'; this.export_algo_csv_button.style.fontSize = '20px';
    this.formDiv.appendChild(this.export_orders_csv_button);
    this.formDiv.appendChild(this.export_algo_csv_button);
    const handle_export_orders_click = function(event) {
      PRINT_N(1, ": handle_export_click  called");
      my_this.export_orders_csv_button.style.backgroundColor = on_color;
      my_this.export_window();  
      const csv_data = export_csv_data(my_this.wd_data);
      csv_downloader(csv_data, "window_orders"); 
      PRINT_N(1, " We have exported csv data.");
      //const csv_fmt = this.data.ps.csv_export();
      //debugger;
      my_this.export_orders_csv_button.style.backgroundColor = off_color;
    }
    const handle_export_algo_click = function(event) {
      PRINT_N(1, ": handle_export_click  called");
      my_this.export_algo_csv_button.style.backgroundColor = on_color;
      my_this.export_window();  
      const csv_data = my_this.wd_data.ps.csv_export();
      csv_downloader(csv_data, "window_algo"); 
      PRINT_N(1, " We have exported csv algo data.");
      //const csv_fmt = this.data.ps.csv_export();
      //debugger;
      my_this.export_algo_csv_button.style.backgroundColor = off_color;
    }
    my_this.export_orders_csv_button.addEventListener('click',handle_export_orders_click);
    my_this.export_algo_csv_button.addEventListener('click',handle_export_algo_click);
      //my_this.algo_button.addEventListener('click', (event) => { in_this=my_this; console.log("graphing:::algo_button clicked");  debugger;});
  }
  install_time_drag_button() {
    const my_this = this;
    const off_color = 'rgb(239,239,239)'; const on_color = 'rgb(60,250,60)';
    this.time_button = document.createElement('button');
    this.time_button.style.height = '60' + 'px'; this.time_button.style.width = '250' + 'px';
    this.time_button.setAttribute('id','time_button' + this.randomStr);
    this.time_button.setAttribute('name','time_button');
    this.time_button.setAttribute('text','Click and Zoom Time-Window')
    this.time_button.style.position = 'absolute';  
    this.time_button.setAttribute('value','Zoom in Time')
    this.time_button.setAttribute('height','60px')
    this.time_button.setAttribute('width', '250px')
    this.time_button.style.backgroundColor = off_color;
    this.time_button.setAttribute('top', '10px');  this.time_button.style.top = '10px'; this.time_button.style.left = buttons_left_loc[0] + 'px';
    this.time_button.setAttribute('left','800px');
    this.time_button.innerHTML = 'Time Window Select'; this.time_button.style.fontSize = '20px';
      //my_this.algo_button.addEventListener('click', (event) => { in_this=my_this; console.log("graphing:::algo_button clicked");  debugger;});
      //my_this.algo_button.addEventListener('onClick', (event) => { in_this=my_this; console.log("graphing:::algo_button clicked"); debugger;});
    this.formDiv.appendChild(this.time_button);
    this.time_button.is_down = false;  this.time_button.event0 = null;
    this.time_button.run_mouse = false;
    const handle_mouse_move = function(event) {
       console.log("Mouse Move started");
       my_this.time_button.e2 = event;

       const dPath= ('M ' + my_this.time_button.e0.offsetX + "," + my_this.time_button.e0.offsetY + 
                                                   ' L ' + event.offsetX + ',' + my_this.time_button.e0.offsetY + 
                                                   ' L ' + event.offsetX + ',' + event.offsetY + 
                                                   ' L ' + my_this.time_button.e0.offsetX + ',' + event.offsetY + 
                                                   ' L ' + my_this.time_button.e0.offsetX + ',' +  my_this.time_button.e0.offsetY);
       my_this.time_button.rect.setAttribute( 'd', dPath); 
       console.log("dPath is " + dPath);
    }
    const handle_mouse_up = function(event) {
       console.log("mouse Up event"); const data = my_this.data;
       const clearup = function() {
         my_this.svg_zone.removeEventListener('mouseup', handle_mouse_up); my_this.svg_zone.removeEventListener('mousemove', handle_mouse_move);
         my_this.time_button.rect.setAttribute('d','M -1000,-1000 H 0');  my_this.time_button.is_down = false;
         my_this.svg_zone.removeChild(my_this.time_button.rect);  
       }
       if (event.offsetX == my_this.time_button.e0.offsetX)  { console.log("Zero Capture!"); clearup(); return(0); }
       if ((event.target !== my_this.svg_zone) && (!(my_this.svg_zone.contains(event.target)))) { clearup(); return(0); }
       console.log("Successfull Time Rect [" + my_this.time_button.e0.offsetX + "," + my_this.time_button.e0.offsetY + "] to " + 
                     "[ " + event.offsetX + "," + event.offsetY + "]");
       const x0 = (event.offsetX < my_this.time_button.e0.offsetX) ? event.offsetX : my_this.time_button.e0.offsetX;
       const y0 = (event.offsetY < my_this.time_button.e0.offsetY) ? event.offsetY : my_this.time_button.e0.offsetY;
       const x1 = (event.offsetX > my_this.time_button.e0.offsetX) ? event.offsetX : my_this.time_button.e0.offsetX;
       const y1 = (event.offsetY > my_this.time_button.e0.offsetY) ? event.offsetY : my_this.time_button.e0.offsetY;
       const tx0 = data.tmin + (data.tmax-data.tmin) * (x0*1.0)/(data.width);
       const tx1 = data.tmin + (data.tmax-data.tmin) * (x1*1.0)/(data.width);
       const py1 = data.pmax - (data.pmax-data.pmin) * (y0*1.0)/(data.height);
       const py0 = data.pmax - (data.pmax-data.pmin) * (y1*1.0)/(data.height);
       console.log(" --- Here is our thoughts time [" + tx0 + "(" + pretty_num.string_del_tm(tx0, data.unit, data.st_time, true) + ")" +  
                     ", " + tx0 + "(" + pretty_num.string_del_tm(tx1, data.unit, data.st_time, true) + ")]" + 
                     "p = $[" + py0 + ", " + py1 + "]");
       //debugger;
       data.tmin = tx0;  data.tmax = tx1;  data.pmin = py0; data.pmax = py1;
       console.log("Update sliders?: tmin=" + data.tmin + ", tmax=" + data.tmax);
       my_this.price_slider_div.noUiSlider.set([my_this.price_format.to(data.pmin), my_this.price_format.to(data.pmax)]); 
       my_this.time_slider_div.noUiSlider.set([my_this.time_format.to(data.tmin), my_this.time_format.to(data.tmax)]); 
       my_this.redraw_time_axis();  my_this.redraw_price_axis();  my_this.updateFormTime();
       my_this.call_plot();
       clearup();
    }
    const handle_mouse_down = function(event) {
      //console.log("Mouse Down Event"); debugger;
      if ((my_this.svg_zone === null) || (my_this.svg_zone === undefined)) {
        console.log("Error trying to do mouse down, svg_zone is not in."); debugger;
      }
      if ((event.target !== my_this.svg_zone) && (!(my_this.svg_zone.contains(event.target)))) {
         return(1);
      }
      if (my_this.time_button.is_down == true) {
        handle_mouse_move(event);
      } else {
        console.log("mouse Down in OB");
        my_this.time_button.is_down = true; my_this.time_button.e0 = event;
        my_this.time_button.rect = svg_ob.make_hline('tmp_time', event.offsetX, event.offsetY,event.offsetX, "rgb(80, 80, 80)",3); 
        my_this.time_button.rect.setAttribute('fill','none');
        my_this.time_button.rect.setAttribute('z-level',5);  my_this.svg_zone.appendChild(my_this.time_button.rect);
        my_this.time_button.rect.setAttribute( 'stroke-width', 5);
        my_this.time_button.rect.style.strokeDasharray = '15 5';
        //my_this.time_button.rect.setAttribute('strokeDasharray', '10 5');
        my_this.svg_zone.addEventListener('mousemove', handle_mouse_move);
        my_this.svg_zone.addEventListener('mouseup', handle_mouse_up); 
        console.log("Material Installed");
      }
    }
    my_this.time_button.addEventListener('click', (event) => {
      if ((my_this.svg_zone === null) || (my_this.svg_zone === undefined)) {
        console.log("Error here ! svg zone is null somehow."); debugger;
      }
      if (my_this.time_button.run_mouse == true) {
        my_this.time_button.run_mouse = false;  my_this.time_button.style.backgroundColor = off_color;
        console.log("time Button Click Off");  
        my_this.svg_zone.removeEventListener('mouseup', handle_mouse_up);
        my_this.svg_zone.removeEventListener('mousemove', handle_mouse_move);
        my_this.svg_zone.removeEventListener('mousedown', handle_mouse_down);
      } else {
        console.log("time Button Click On");
        my_this.time_button.run_mouse = true;  my_this.time_button.style.backgroundColor = on_color;
        my_this.svg_zone.addEventListener('mousedown', handle_mouse_down);
      }
    }); 
  }
  clear_bars = function() {
    const my_this = this; const cv = my_this.canvas_bars_context;
    cv.clearRect(0,0, my_this.data.bar_width,  my_this.data.height);
    my_this.bardr = null;
  }
  draw_bars = function() {
    const my_this = this; const cv = my_this.canvas_bars_context;
    const dr = my_this.bardr;
    const PRINT_N = printer.make_print_n(my_this.verbose_ob, "ob.js->draw_bars()");
    PRINT_N(1, " --- Initiate Drawing of Bars");
    if ((cv === null) || (cv === undefined)) {
      PRINT_N(-6, " Error cv is undefined");
    }
    // cv.fillStyle = 'blue';  cv.fillRect(0,0,my_this.data.bar_width, my_this.data.height);
    cv.clearRect(0,0, my_this.data.bar_width,  my_this.data.height);
    cv.lineWidth = 6; cv.strokeStyle='black';
    cv.beginPath(); cv.moveTo(1,0); cv.lineTo(0,my_this.data.height); cv.stroke();
   
    const nmx = bars.count_both_np(dr, my_this.data.pmin, my_this.data.pmax);
    const argm = (x,y) => (x > y) ? x : y;
    my_this.lwdh = argm(Math.floor(.45 * my_this.data.height  / (nmx< 40 ? 40 : nmx)),1);
    const lwdh = my_this.lwdh;

    //PRINT_N(1," lets look for nbb"); debugger;
    // Note, this is lazy NBBO solution, we might be interested in getting Protected BBO from more sophisticated model.
    if (dr.b.cs.vp.length > 0) {
      cv.setLineDash([10,5]);
      const nbb = dr.b.cs.vp[dr.b.cs.vp.length-1];  const nbbl = Math.floor(my_this.data.height * (my_this.data.pmax-nbb) / (my_this.data.pmax-my_this.data.pmin));
      cv.lineWidth = 2; cv.strokeStyle='green';
      cv.beginPath(); cv.moveTo(1,nbbl); cv.lineTo(my_this.data.bar_width,nbbl); cv.stroke();
      cv.setLineDash([]);
    }
    if (dr.s.cs.vp.length > 0) {
      cv.setLineDash([10,5]);
      const nbo = dr.s.cs.vp[dr.s.cs.vp.length-1];  const nbol = Math.floor(my_this.data.height * (my_this.data.pmax-nbo) / (my_this.data.pmax-my_this.data.pmin));
      cv.lineWidth = 2; cv.strokeStyle='red';
      cv.beginPath(); cv.moveTo(1,nbol); cv.lineTo(my_this.data.bar_width,nbol); cv.stroke();
      cv.setLineDash([]);
    }
    if (dr.idx_wpt >= 0) {
      for (let ik = 0; ik < my_this.data.ps.wpt.v_b_p.length; ik++) {
        cv.setLineDash([10* (ik+1),5]);
        const nbb = (my_this.data.ps.wpt.v_b_p[ik])[dr.idx_wpt];  const nbbl = Math.floor(my_this.data.height * (my_this.data.pmax-nbb) / (my_this.data.pmax-my_this.data.pmin));
        cv.lineWidth = 2; cv.strokeStyle='green';
        cv.beginPath(); cv.moveTo(1,nbbl); cv.lineTo(my_this.data.bar_width,nbbl); cv.stroke();
        cv.setLineDash([]);
      }
      for (let ik = 0; ik < my_this.data.ps.wpt.v_s_p.length; ik++) {
        cv.setLineDash([10* (ik+1),5]);
        const nbo = (my_this.data.ps.wpt.v_s_p[ik])[dr.idx_wpt];  const nbol = Math.floor(my_this.data.height * (my_this.data.pmax-nbo) / (my_this.data.pmax-my_this.data.pmin));
        cv.lineWidth = 2; cv.strokeStyle='purple';
        cv.beginPath(); cv.moveTo(1,nbol); cv.lineTo(my_this.data.bar_width,nbol); cv.stroke();
        cv.setLineDash([]);
      }
    }

    cv.fillStyle = 'royalblue';
    for (let itb = 0; itb < dr.b.cs.vqm.length; itb++) {
      const onv = dr.b.cs.vqm[itb];
      if ((onv !== null) && (onv !== undefined) && (typeof(onv) == 'object') && (onv.wx !== undefined)) { 
        const onvwx= onv.wx;
        const nlm = onvwx.length-1;
        const vh = this.data.height * (this.data.pmax - dr.b.cs.vp[itb]) / (this.data.pmax-this.data.pmin)
        cv.fillRect(0, vh-my_this.lwdh, onvwx[nlm], 2*my_this.lwdh);
      }
    }
    cv.fillStyle = 'orange';
    for (let its = 0; its < dr.s.cs.vqm.length; its++) {
      const onv = dr.s.cs.vqm[its];
      if ((onv !== null) && (onv !== undefined) && (typeof(onv) == 'object') && (onv.wx !== undefined)) { 
        const onvwx= onv.wx;
        const nlm = onvwx.length-1;
        const vh = this.data.height * (this.data.pmax - dr.s.cs.vp[its]) / (this.data.pmax-this.data.pmin)
        cv.fillRect(0, vh-lwdh, onvwx[nlm], 2*lwdh);
      }
    }
  }
  redraw_bar_line = function() {
    const my_this = this;
    let nlh = my_this.svg_zone.getElementById('line_bar_click');
    if (this.bardr == null) {  
      if ((nlh !== null) && (nlh !== undefined)) { nlh.setAttribute('d', ''); }
    } else {
      if (nlh == null) {
        nlh = svg_ob.make_hline('line_bar_click', -100, -100,-100, 'rgb(0,0,0)',2); nlh.setAttribute('z-level',3);
        my_this.svg_zone.appendChild(nlh);
      }
      const timeX_bi = my_this.pretty_num.uninvert_bi(this.bardr.timeX, this.bardr.unit, this.bardr.st_time);
      const tmin_bi = my_this.pretty_num.uninvert_bi(this.data.tmin, this.data.unit, this.data.st_time);
      const tmax_bi = my_this.pretty_num.uninvert_bi(this.data.tmax, this.data.unit, this.data.st_time);
      const wp = my_this.data.width * Number(timeX_bi - tmin_bi) / Number(tmax_bi-tmin_bi)
      nlh.setAttribute('d','M ' + wp + ' 0 V ' + my_this.data.height);
    }
  }
  install_dr_touch = function() {
    const my_this = this;  const margins = this.margins;
    const PRINT_N = printer.make_print_n(this.verbose_ob, "install_dr_touch(): ");
    // Clear Highlights or tip (working on tip).
    const clear_f = function(event) {
      if ((my_this.b_bar_line !== undefined) && (my_this.b_bar_line !== null) && (!(!(my_this.b_bar_line)))) {
        my_this.b_bar_line.setAttribute('stroke-width',0);  my_this.b_bar_line.setAttribute('d', 'M 0 0');
      }
      if ((my_this.s_bar_line !== undefined) && (my_this.s_bar_line !== null) && (!(!(my_this.s_bar_line)))) {
        my_this.s_bar_line.setAttribute('stroke-width',0);  my_this.s_bar_line.setAttribute('d', 'M 0 0');
      }
      my_this.bars_tipText = "";
      if (my_this.ttip_div === null) {
        PRINT_N(-6, "Error my_this.ttip_div is already null.");
      }
      svg_ob.write_ttip(my_this.data, my_this.ttip_div, (my_this.margins.left + my_this.data.width + margins.itm * margins.right),
                                                        (my_this.margins.top), my_this.bars_tipText);
      my_this.ttip_div.style.visibility = 'invisible'; 
    }
    const touch_f = function(event) {
      const PRINT_N = printer.make_print_n(my_this.verbose_ob, "dr_touch_f(): ");
      const pretty_num = my_this.pretty_num;
      if (my_this.bardr === null) { return(-1); }
      if ((event.target !== my_this.svg_bars) && (!my_this.svg_bars.contains(event.target))) {
        DEBUG && PRINT_N(1, "Weird, touch_f called target = " + event.target + " but my_this.canvas_bars is " + my_this.canvas_bars);
        return(-1);
      }
      const locX = event.offsetX; const locY = event.offsetY;
      if ((locY < 0) || (locY > my_this.data.height) || (locX < 0) || (locX > my_this.data.bar_width)) { 
        DEBUG && PRINT_N(1, "Hey warning, event.target = " + event.target);
        DEBUG && PRINT_N(1, " locX=" + locX + ", locY = " + locY);
        clear_f(event); 
        return(-1); 
      }
      const find_p = my_this.data.pmax - (my_this.data.pmax-my_this.data.pmin) * locY / my_this.data.height;
      const rt = bars.seek_near(my_this.bardr, locX, locY, my_this.data.pmin, my_this.data.pmax, my_this.data.height);
      DEBUG && PRINT_N(4, "::: find_p=" + find_p + ", we have (locX,locY)=(" + locX + "," + locY + "), bi=" + rt.b_near_pi + ", si=" + rt.s_near_pi);
      //if ((rt.b_near_pi >=0) || (rt.s_near_pi >= 0)) {
      //  PRINT_N(1, "Hey: touch_f: we see your movement here. ");  debugger;
      //}
      my_this.bars_tipText = "";
      if (rt.b_near_pi >= 0) {
           const left_x = rt.b_near_qj <= 0 ? 0 : my_this.bardr.b.cs.vqm[rt.b_near_pi].wx[rt.b_near_qj];
           const right_x = my_this.bardr.b.cs.vqm[rt.b_near_pi].wx[rt.b_near_qj];
           const price_y = Math.floor(my_this.data.height * (my_this.data.pmax - my_this.bardr.b.cs.vp[rt.b_near_pi]) / (my_this.data.pmax-my_this.data.pmin));
           if ((my_this.b_bar_line === undefined) || (my_this.b_bar_line === null) && (!(my_this.b_bar_line))) {
             my_this.b_bar_line = svg_ob.make_hline('b_bar_line', left_x,price_y, (right_x-left_x), 'rgb(10,10,30)',Math.floor(4 * my_this.lwdh));
             my_this.b_bar_line.setAttribute('z-level',3)
             my_this.svg_bars.appendChild(my_this.b_bar_line);
           }  else {
             my_this.b_bar_line.setAttribute('stroke-width',4*my_this.lwdh); 
             my_this.b_bar_line.setAttribute('d', 'M ' + left_x + " " + price_y + " H " + right_x);
           }
           const orig_idx = my_this.bardr.b.cs.vqm[rt.b_near_pi].idx[rt.b_near_qj];
           //PRINT_N(1, "lets look for tip"); debugger;
           my_this.bars_tipText = (my_this.bars_tipText + "<br> BUY[$" + my_this.bardr.b.cs.vp[rt.b_near_pi] + ", " +
              "q=" + my_this.data.buys.qty[orig_idx] + ",<" + 
              (pretty_num.string_del_tm(Number(my_this.data.buys.open[orig_idx]), my_this.orig.unit, my_this.orig.st_time, true) + "--" +
               pretty_num.string_del_tm(Number(my_this.data.buys.close[orig_idx]), my_this.orig.unit, my_this.orig.st_time) + "<]"));

      } else if (!(!(my_this.b_bar_line))) {
        my_this.b_bar_line.setAttribute('d', 'M -100, -100');
      }
      if (rt.s_near_pi >= 0) {
           const left_x = rt.s_near_qj <= 0 ? 0 : my_this.bardr.s.cs.vqm[rt.s_near_pi].wx[rt.s_near_qj];
           const right_x = my_this.bardr.s.cs.vqm[rt.s_near_pi].wx[rt.s_near_qj];
           const price_y = Math.floor(my_this.data.height * (my_this.data.pmax - my_this.bardr.s.cs.vp[rt.s_near_pi]) / (my_this.data.pmax-my_this.data.pmin));
           if (!(my_this.s_bar_line)) {
             my_this.s_bar_line = svg_ob.make_hline('s_bar_line', left_x,price_y, (right_x-left_x), 'rgb(30,10,10)',Math.floor(4 * my_this.lwdh));
             my_this.svg_bars.appendChild(my_this.s_bar_line);
           }  else {
             my_this.s_bar_line.setAttribute('z-level',3)
             my_this.s_bar_line.setAttribute('stroke-width',4*my_this.lwdh); 
             my_this.s_bar_line.setAttribute('d', 'M ' + left_x + " " + price_y + " H " + right_x);
           }
           const orig_idx = my_this.bardr.s.cs.vqm[rt.s_near_pi].idx[rt.s_near_qj];
           my_this.bars_tipText = (my_this.bars_tipText + "<br> SELL[$" + my_this.bardr.s.cs.vp[rt.s_near_pi] + ", " +
              "q=" + my_this.data.sells.qty[orig_idx] + ",<" + 
              (pretty_num.string_del_tm(Number(my_this.data.sells.open[orig_idx]), my_this.orig.unit, my_this.orig.st_time, true) + "--" +
               pretty_num.string_del_tm(Number(my_this.data.sells.close[orig_idx]), my_this.orig.unit, my_this.orig.st_time) + "<]"));
      } else if (!(!(my_this.s_bar_line))) {
        my_this.s_bar_line.setAttribute('d', 'M -100, -100');
      }
      //if ((rt.b_near_pi >=0) || (rt.s_near_pi >= 0)) {
      //  PRINT_N(1, "Hey: touch_f: Anything light up?");  debugger;
      //}
      svg_ob.write_ttip(my_this.data, my_this.ttip_div, (margins.left + my_this.data.width + my_this.margins.itm * my_this.margins.right + locX),
                                                        (margins.top + locY),  my_this.bars_tipText);
    } 
    my_this.svg_bars.addEventListener('mouseover', touch_f);
    my_this.svg_bars.addEventListener('mousemove', touch_f);
    my_this.svg_bars.addEventListener('mouseout', clear_f); 
  }
  install_draw_bars = function() {
    const my_this = this;
    const handle_bars_click = function(event) {
      const PRINT_N = printer.make_print_n(my_this.verbose_ob, "handle_bars_click");
      const data = my_this.data;
      PRINT_N(1, "  Initiate");
      if ((my_this.svg_zone == null) || (my_this.svg_zone ===undefined)) {
         PRINT_N(-6, "Error trying to do mouse down, svg_zone is not in."); debugger;
      }
      if ((event.target !== my_this.svg_zone) && (!(my_this.svg_zone.contains(event.target)))) {
         PRINT_N(1, " Click out of zone.");
         return(1);
      }
      const locX = event.offsetX;
      if ((locX < 0) || (locX > data.width)) { return(1); }
      const timeX = data.tmin + (data.tmax -data.tmin) * locX / (data.width);
      PRINT_N(1, " timeX determined to be " + timeX + " , for unit " + data.unit + " verus origmult=" + data.origmult + " and orig.unit=" + my_this.orig.unit);

      // Bars relevant data will be centered on same t0,t1 time.  If t0,t1 are different can pull all orderbook data.
      my_this.bardr = bars.get_relevant_data(my_this.data, timeX * data.origmult, timeX * data.origmult, my_this.orig.pmin, my_this.orig.pmax, my_this.pretty_num);
      if (!(!(my_this.bardr))) {
        PRINT_N(1, " Putting in line h");
        my_this.redraw_bar_line();
        my_this.draw_bars();
      }
    }
    const out_bars_click = function(event) {
       const PRINT_N = printer.make_print_n(my_this.verbose_ob, "out_bars_click(): ");
       if ((event.target !==my_this.widgetDiv) && (!(my_this.widgetDiv.contains(event.target)))) {
         PRINT_N(1, ":: we don't see event inside widgetDiv.");
         return(1);
       } 
       if ((event.target == my_this.canvasDiv) || (my_this.canvasDiv.contains(event.target))) { return(1); }
       if ((event.target == my_this.svg_zone) || (my_this.svg_zone.contains(event.target))) { return(1); }
       if ((event.target == my_this.svg_bars) || (my_this.svg_bars.contains(event.target))) { return(1); }
       if ((event.target == my_this.price_slider_div) || (my_this.price_slider_div.contains(event.target))) { return(1); }
       if ((event.target == my_this.time_slider_div) || (my_this.time_slider_div.contains(event.target))) { return(1); }
       if ((event.target == my_this.unit_slider_div) || (my_this.unit_slider_div.contains(event.target))) { return(1); }
       if ((event.target == my_this.formDiv) || (my_this.formDiv.contains(event.target))) { return(1); }
       const locX = event.offsetX; const locY = event.offsetY;
       PRINT_N(1, "(locX,locY)=[" + locX + "," + locY + "] for margins=[t,l,r,b]=[" + 
            my_this.margins.top + "," + my_this.margins.left + "," + my_this.margins.right + "," + my_this.margins.bottom + "], " + 
            " and canvas w,h = " + my_this.data.width + "," + my_this.data.height);
       if ((locY <= my_this.margins.top) || (locY >= my_this.margins.top + my_this.data.height)) {
         my_this.clear_bars();
       } else if ((locX <= my_this.margins.left) || (locX >= my_this.margins.left + my_this.data.width)) {
         my_this.clear_bars();
       }
    }
    my_this.svg_zone.addEventListener('click', handle_bars_click);
    my_this.widgetDiv.addEventListener('click', out_bars_click);
  }
  export_window() {
    const my_this = this;
    my_this.wd_data = my_this.bars.get_relevant_data(my_this.data, my_this.data.tmin, my_this.data.tmax, my_this.data.pmin, my_this.data.pmax, my_this.pretty_num) 
    my_this.wd_data.ps  = my_this.data.ps.shrink(my_this.wd_data.timeX0_bi, my_this.wd_data.timeX1_bi);
    // timeX0_bi = wd_data.timeX0_bi;  timeX1_bi = wd_data.timeX1_bi;
  }
}
const csv_downloader = function(csv_export, data_name) {
  // Common practice for export link.
  const blob = new Blob([csv_export], { type: "text/csv;charset=utf-8;"});
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href',url);
  link.setAttribute('download', data_name + '.csv');
  link.style.visibility='hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  console.log("csv_downloader: Finished");
}

const export_csv_data = function(data) {
  const db = ((data.buys !== null) && (data.buys !== undefined) && (!(!(data.buys)))) ? data.buys : ((data.b !== null && data.b !== undefined) ? data.b : null);
  const ds = ((data.sells !== null) && (data.sells !== undefined) && (!(!(data.sells)))) ? data.sells : ((data.s !== null && data.s !== undefined) ? data.s : null);

  const headstr = "side,price,open,close,qty,ivs";
  const bstr = db.vpi.map((x,ix) => (
    'B,' + db.u_p[db.vpi[ix]] + "," + db.open[ix] + ',' +  db.close[ix] + ',' + db.qty[ix] + "," + db.ivs[ix]
  ));
  const sstr = ds.vpi.map((x,ix) => (
    'S,' + ds.u_p[ds.vpi[ix]] + "," + ds.open[ix] + ',' +  ds.close[ix] + ',' + ds.qty[ix] + "," + ds.ivs[ix]
  ));
  return( headstr + "\n" + bstr.join("\n") + sstr.join("\n"));
}
const exports = {"obwidget": obwidget, 'export_csv_data':export_csv_data};
//export default {"obwidget": obwidget};
module.exports = exports;
