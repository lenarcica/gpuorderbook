const cumulate = require("./cumulate.js");
const cumulate_dside = cumulate.cumulate_dside; const sort_tp = cumulate.sort_tp;
const ord_struct = require("./ord_struct/index.js");
const ord_algo = require("./ord_algo.js");
const make_print_n = ord_algo.make_print_n;
const order_algo = ord_algo.order_algo;  const PrintStruct = ord_algo.PrintStruct;
const sip_algo = require("./sip_algo.js");
let verbose = 1;
var PRINT_N = ord_algo.make_print_n({'s':[],verbose}, "app.js:"); 
const is_numeric = sip_algo.is_numeric;
let my_widget = {};
const const_svgns = "http://www.w3.org/2000/svg"; // SVG Namespace

const make_text_el = function(nm, locx,locy,txt,txtsize) {
  let nvd = document.createElementNS(const_svgns, 'text'); nvd.setAttribute('id',nm);
  nvd.setAttribute('x',locx); 
  //nvd.setAttribute('x',Math.floor(locx - (txt.length * txtsize)*.25)); 
  nvd.setAttribute('y',locy);
  nvd.setAttribute('text-anchor','middle');
  nvd.setAttribute('dominant-baseline',"middle");
  nvd.setAttribute("font-family", "Arial"); nvd.setAttribute('z-level',2);
  nvd.setAttribute("font-size", txtsize + "px"); nvd.setAttribute("fill", "black");
  nvd.textContent = txt; // The actual text content
  return(nvd);
}    

class app_widget {
  model=null; el = null; canvasDiv=null; widgetDiv=null; clearColor={}; verbose_ob={'s':[],'verbose':2}; verbose=2; svg_zone=null;
  call_plot_again=null;  count_renders=null; data = null; margins=null;  PRINT_N=(()=>{return(0);}); 
  randomStr=""; svgns=const_svgns; sip_button=null; debug_button=null;  ob_data = {};
  out_data = {};
  constructor({model, el}) {
    this.data = {'width':400,'height':300};
    this.model=model; this.el=el; this.data = this.model.get('data'); 
    this.verbose = this.model.get('verbose'); if (!(this.verbose)) { this.verbose=0; }
    this.ob_data = this.model.get('ob_data');
    const b_o_b = this.model.get('b_o');  const b_c_b = this.model.get('b_c');
    const s_o_b = this.model.get('s_o');  const s_c_b = this.model.get('s_c');
    if ((b_o_b != undefined) && (b_o_b != null)) {
       //console.log("--- constructor: We acheived Times Stamp pulls");
       //console.log("--- Attempting to insert.  Note length of b_o_b is " + b_o_b.length + " for bytesLength = " + b_o_b.byteLength);
       this.ob_data.buys.open = new BigInt64Array(b_o_b.buffer, b_o_b.byteOffset, b_o_b.byteLength/8);
       this.ob_data.buys.close = new BigInt64Array(b_c_b.buffer, b_c_b.byteOffset, b_c_b.byteLength/8);
       this.ob_data.sells.open = new BigInt64Array(s_o_b.buffer, s_o_b.byteOffest, s_o_b.byteLength/8);
       this.ob_data.sells.close = new BigInt64Array(s_c_b.buffer, s_c_b.byteOffset, s_c_b.byteLength/8);
       //if (this.ob_data.sells.open.length <= 0) {
       //  console.log("constructor: Error, sells open is zero length."); debugger;
       //}
       //console.log("What is content?");
    } else {
      console.log("ERROR app_widget constructor.  b_o_b is not supplied");
    }
    this.verbose_ob={'s':[],'verbose':this.verbose};
    this.setupDefaults();  this.setupWindow(); 
    this.PRINT_N = ord_algo.make_print_n(this.verbose_ob, "app_widget:"); 
    this.svg_zone.appendChild(make_text_el("DEFAULT",0,0,11));
  }
  setupDefaults() {
    this.canvasDiv = null; this.widgetDiv = null; 
    this.clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };
    this.call_plot_again =  function() { console.log("default call_plot_again called: we will define"); }
    this.count_renders = 0;  this.out_data = {};
    const a_width = this.model.get('width'); if (!(!(!a_width))) { this.data.width = a_width; }
    const a_height = this.model.get('height'); if (!(!(!a_height))) { this.data.height = a_height; }  
    const tdata = this.model.get('data');
    if (!(!(tdata))) {
      if (!(!(tdata.width))) { this.data.width = tdata.width;  }
      if (!(!(tdata.height))) { this.data.height = tdata.height; }
      if (!(!(tdata.verbose))) { this.verbose = tdata.verbose; this.verbose_ob={'s':[],'verbose':tdata.verbose}; }
    }

    if (!(!(!(this.data.width)))) { this.data.width = 400; }
    if (!(!(!(this.data.height)))) { this.data.height = 300; }
    this.margins = {'left': Math.floor(this.data.width * .35), 'top': Math.floor(this.data.height*.2), 'bottom': Math.floor(this.data.height*.8)}
    this.randomStr = (Math.random().toString(36).substring(2, 5) + Math.random().toString(36).substring(2, 5));

  }
  default_data = {
    buys: { 
     price : [   19,18.5,  21,  21, 25, 22.5, 19, 25,22.5, 19, 19, 19, 21, 25, 19, 19, 19,18.5,18.5,22.5,18.5, 19, 19, 21, 25, 25, 19],
       qty : [  100,  10,  40, 70,  5,   50, 20, 30,  50,  10, 15, 12, 40, 30, 20, 30, 20,  20,  30,  10,  10, 10, 20, 40, 10, 20, 10],
      open : [   0n,  2n,  2n, 23n,31n,   3n,10n,40n, 15n, 2n, 8n, 8n,30n,41n, 1n, 6n, 5n,  3n, 35n, 35n, 38n,38n,40n,42n,46n,49n,51n].map(x=>BigInt(x)*1000n),
     close : [   5n, 15n,  3n, 26n,39n,   8n,20n,43n, 25n, 9n,10n,15n,42n,42n,10n, 8n,15n, 18n, 38n, 37n, 41n,45n,42n,45n,47n,52n,52n].map(x=>BigInt(x)*1000n),
        vs : [  'A',  'B', 'A','A','A',  'A','A','A', 'B','A','A','B','B','A','A','A','B', 'A', 'B', 'A', 'A','B','B','A','A','B','A'],
       vpi : [    1,   0,    2,  2,  4,    3,  1,  4,   3,  1,  1,  1,  2,  4,  1,  1,  1,   0,   0,   3,   0,  1,  1,  2,  4,  4,  1],
    qtymult: 1,
     uprice: [ 18.5, 19,21,22.5,25]
    },
    sells: {
     price : [ 25,  27, 27, 25, 23, 22, 25, 27, 28, 25, 23, 23, 25, 27, 27, 27],
       qty : [ 40,  20, 30, 10, 70,100,150,140,120, 30, 10, 20, 30, 40, 30, 40],
      open : [  1,   2,  3,  2,  6, 15, 20, 25, 30,  5, 35, 39, 32, 38, 44, 48].map(x=>BigInt(x)*1000n),
     close : [ 10,   4,  4,  3, 33, 20, 25, 27, 45, 25, 37, 41, 34, 39, 47, 51].map(x=>BigInt(x)*1000n),
        vs:  ['A', 'B','B','A','B','A','A','B','A','A','A','B','A','B','A','A'],
       vpi:  [  2,   1,  1,  2,  3,  4,  2,  1,  0,  2,  3,  3,  2,  1, 1,   1],
    qtymult: 1,
     uprice: [28,27,25,23,22]
    },
    time_min: 0n,
    time_max: 51n
  }
  runOBATest() {
    this.PRINT_N(1, " We are investigating how to do Orderbook algorithm.");
    const use_data = (((this.ob_data === undefined) || (this.ob_data === null) || (typeof(this.ob_data) != 'object') || (this.ob_data.length <= 0)) ?
                       this.default_data : this.ob_data);

    const find_sim = (((this.ob_data === undefined) || (this.ob_data === null) || (typeof(this.ob_data) != 'object') || (this.ob_data.length <= 0)) ?
                       'A' :0);
    
    if ((this.ob_data === undefined) || (this.ob_data === null) || (typeof(this.ob_data) != 'object') || (this.ob_data.length <= 0)) {
      console.log("runOBATest(): still defaulting to default_data");
    } else if ( (this.ob_data === undefined) || (this.ob_data === null)) {
      console.log("runOBATest() obdata this is a null thing. "); 
    } else if ( (use_data.buys === undefined) || (use_data.buys === null) || (use_data.buys.price === undefined) || (use_data.buys.price.length  <= 0)) {
      console.log("runOBATest: Error length of ob_data is bad."); debugger;
    } else {
      console.log("runOBATest(): Attempting to use use_data[buys,price][length=" + use_data.buys.price.length + "]");
    }
    const bd = use_data.buys;
    const bm = sort_tp(cumulate_dside({'vo':bd.open,'vc':bd.close,'vq':bd.qty,'vpi':bd.vpi, 'dtitle':'buys_cumulate'}));
    const f1 = (x,i)=>bd.vs[i]==find_sim; 
    console.log("cumulating buy side");
    const br1 = sort_tp(cumulate_dside({'vo':bd.open.filter(f1),'vc':bd.close.filter(f1),'vq':bd.qty.filter(f1),'vpi':bd.vpi.filter(f1),'dtitle':'buys_f1_cumulate'}));
     
    const sd = use_data.sells;
    if (sd.open.length <= 0) {
      console.log("runOBATest: there is zero length sells."); debugger;
    }
    const sm = sort_tp(cumulate_dside({'vo':sd.open,'vc':sd.close,'vq':sd.qty,'vpi':sd.vpi,'dtitle':'sells_cumulate'}));
    const g1 = (x,i)=>sd.vs[i]==find_sim; 
    console.log("cumulating sell side");
    const sr1 = sort_tp(cumulate_dside({'vo':sd.open.filter(g1),'vc':sd.close.filter(g1),'vq':sd.qty.filter(g1),'vpi':sd.vpi.filter(g1),'dtitle':'sells_f1_cumulate'}));
  
    const oad_b = cumulate.concatenate_cds([bm,br1], use_data.buys.uprice);
    const oad_s = cumulate.concatenate_cds([sm,sr1], use_data.sells.uprice);
    const oad = {'b':oad_b,'s':oad_s, 'nr':1}; 
    if (oad_s.vq.filter((x)=>isNaN(x)).length > 0) {
      console.log("cumulate.concatenate_cds: Error.  we have a NaN in oad_s!");
    }
    /**
  const Kalgo = Object.freeze({
  NumFilled:0,
  NumAll:1,
  NumShares:2,
  NumPennies:3,
  MultipleSpread:4,
  TotalDollars:5,
  PctDept:6,
  ExpDecay:7,
  Unknown:-1
  }); 
   **/
    const dd = {'kalgoint':6,'w_sum_q':1,'w_sum_pq':1,'w_avp':1,'w_wp':1,'w_nocc':1,'w_atq':1,'verbose':2,
                'time_min':BigInt(use_data.time_min),'time_max': BigInt(use_data.time_max)};
    this.PRINT_N(1, " Hey we have orders[lens=(" + oad.b.vpi.length + "," + oad.s.vpi.length + ")] and are ready to test the algorithm.");
    this.PRINT_N(1, " Note time_min = " + dd.time_min + ", time_max=" + dd.time_max);
    const input_d = [100,10000,1000000]; 
    //const input_d = null;
    const input_fd = [.1,.5,.9];
    //const input_fd = [100,10000,1000000];
    const ps = ord_algo.order_algo(oad,
      input_d, input_fd, null,
      dd.kalgoint, dd.w_sum_q, dd.w_sum_pq, dd.w_avp, dd.w_wp, dd.w_nocc, dd.w_atq, dd.verbose,
      dd.time_min, dd.time_max);
     if ((typeof(ps) == 'string') && ((ps == 'ERROR') || (ps == 'Error'))) {
       console.log("runOBATest: We received an error message on algo out ps."); debugger;
     }
     console.log("ps received: [" + Object.keys(ps).join(",") + "], ps.iprint=" + ps.iprint);
     const nk = ps.v_b_sum_q.k.length; const nkm1 = nk-1;
     const nr = oad.nr;
     if (nk != input_d.length) { console.log("ERROR: input_d.length=" + input_d.length + ", but we thought nk=" + nk); debugger;}
     const u_d = (ps.d0fd1 == 0) ? ps.v_d : ps.v_fd;
     const forPrint = ((ps.iprint < 20) ? ps.iprint : 20);
     const afterPrint = ((ps.iprint < 20) ? 0 : (ps.iprint-20));
     for (let ii = 0; ii < ps.iprint;ii++) {
        if ((ii <= forPrint) || (ii >= afterPrint) || (ii % 1000 == 0)) {
          console.log("[ii=" + ii + ";t=" + ps.v_time[ii] + ";NBBO=[" + (ps.v_best_bids[nr])[ii] + "," + (ps.v_best_asks[nr])[ii] + "]]" + 
            "m_b_" + u_d[nkm1] + "_q=" + ((ps.v_b_sum_q.k[nkm1])[nr])[ii] + ",m_s_" + u_d[nkm1] + "_q=" + ((ps.v_s_sum_q.k[nkm1])[nr])[ii]);
        }
     }
     const out_d = ps.check_count_tu();
     const ok_d = Object.keys(out_d);
     console.log("Here is out_d:");
     let atr = []; for (let jj = 0; jj < ok_d.length; jj++) {
       atr.push(ok_d[jj] + ":" +  out_d[ok_d[jj]])
     }
     console.log("[" + atr.join(",") + "]");
     console.log("Attempt Export");
     const out_csv = ps.csv_export();
     console.log("here is csv:");
     console.log(out_csv.slice(0,200));
     console.log("app.js: Attempting to supply output as csv.");
     if ((this.model === null) || (this.model === undefined)) {
       console.log("app.js: Well, model is null.  trying.");
     }
     console.log("Try to get out_csv");
     let try_csv = this.model.get('out_csv');
     console.log(" well, try_csv is " + try_csv);
     this.model.set('out_csv', out_csv.slice(0,1000)); this.model.save_changes();
   //ord_algo(vin_00_time, vin_01_side, vin_02_price, vin_03_ir,  vin_04_rqty, vin_05_mqty, 
   // v_d, v_fd, v_in_bprices, v_in_sprices, nr, v_w,
   // kalgoint, w_sum_q, w_sum_pq, w_avp, w_wp, w_nlevels, w_atq, verbose,
   // time_min, time_max)
    //debugger;
  }
  runSipTest() {
    //const compute_sip_nbbo_rec_sip = function(n_venues, vt_in, vb_q_in, vs_q_in, 
    //      vb_p_in, vs_p_in, vb_v_in, vs_v_in, verbose_ob) { 
    // Note, first test on demo data, then we can supply data in some ways through App buttons.
    this.PRINT_N(1, "Running Print Objects");
    const sdd = sip_algo.sip_demo_data;
    this.out_data.rec_sip = sip_algo.compute_sip_nbbo_rec_sip(3, sdd.time, sdd.bq, sdd.sq, sdd.bp, sdd.sp, sdd.ven, sdd.ven, this.verbose_ob);
    this.PRINT_N(1, " runSipTest() we just got a rec_sip.");
    //n_r =0; i_r=0; nv=0n; vt=[];
    //vb_nwv=[]; vs_nwv=[];
    //vb_b2v=[]; vs_b2v=[];
    //vb_u=[]; vs_u=[];
    //vb_p=[]; vs_p=[]; 
    //vb_q=[]; vs_q=[]; 
    //vi_line=[];
    const o = this.out_data.rec_sip;
    this.data.n_r = Number(o.n_r); 
    /*
    this.data.vb_nwv = o.vb_nwv;  this.data.vs_nwv = o.vs_nwv;
    this.data.vb_u = o.vb_u; this.data.vs_u = o.vs_u;
    this.data.vb_p = o.vb_p; this.data.vs_p = o.vs_p;
    this.data.vb_q = o.vb_q; this.data.vs_q = o.vs_q;
    this.data.v_out = o.verbose_ob.s;
    */
    this.PRINT_N(1, " runSipTest() as output we got o with keys [" + Object.keys(o).join(",") + "]");
    this.PRINT_N(1, "   -- the keys of this.data are [" + Object.keys(this.data).join(",") + "]");
    this.PRINT_N(1, " Note vt length is " + o.vt.length + " for vt = [" + o.vt.join(",") + "]");
    this.model.set('v_out', o.verbose_ob.s);
    this.model.save_changes();
    this.model.set('n_r', o.n_r.toString()); this.model.save_changes();
    const vt_str = o.vt.map(x => Number(x).toString());
    this.model.set('vt', o.vt); this.model.save_changes();
    this.model.set('data', this.data); this.model.save_changes();
    this.model.set('n_r',this.data.n_r); this.model.save_changes();
    let vt0 = Number(o.vt[0]);
    this.model.set('vt0', vt0.toString()); this.model.save_changes();
    this.model.set('vi_line', o.vi_line); this.model.save_changes();
    this.model.set('vb_u', o.vb_u); this.model.set('vb_p', o.vb_p); this.model.set('vb_q', o.vb_q); this.model.set('vb_nwv',o.vb_nwv);  this.model.save_changes();
    this.model.set('vs_u', o.vs_u); this.model.set('vs_p', o.vs_p); this.model.set('vs_q', o.vb_q); this.model.set('vs_nwv',o.vs_nwv); this.model.save_changes();
    this.PRINT_N(0, " Object.keys(this.model) is [" + Object.keys(this.model).join(",") + "]");
    //this.model.set("n_r",o.n_r); this.model.set('vb_nwv',o.vb_nwv); this.model.set('vs_nwv',o.vs_nwv);
    this.PRINT_N(1, " Note o.vb_u is length " + o.vb_u.length + " [" + o.vb_u.join(",") + "]");
    //this.model.set('vb_u',o.vb_u); this.model.set('vs_u',o.vs_u);
    //this.model.set('vb_p',o.vb_p); this.model.set('vs_p',o.vs_p);
    //this.model.set('vb_q',o.vb_q); this.model.set('vs_q',o.vs_q);
    //this.model.set('vi_line',o.vi_line); 
    //this.model.set('vb_b2v',o.vb_b2v); this.model.set('vs_b2v',o.vs_b2v);
    //this.model.set('v_out',o.verbose_ob);
  }
  setupWindow() {
    this.widgetDiv = document.createElement('div');
    this.widgetDiv.setAttribute('id', "widget_Div" + this.randomStr);
    this.widgetDiv.style.position = 'relative';  this.widgetDiv.style.display = 'flex';
    this.widgetDiv.style.flexDirection = 'column'; this.widgetDiv.style.justifyContent = 'left';
    this.widgetDiv.style.alignItems = 'left'; this.widgetDiv.setAttribute('z-level',0);
    // Implement Auto Widgth later
    //this.widgetDiv.style.width = this.data.width === 'auto' ? '100%' : `${this.width}px`;
    this.widgetDiv.style.width = (this.data.width + this.margins.left) + 'px';
    this.widgetDiv.style.height = (this.data.height + this.margins.top + this.margins.bottom) + 'px'; 
    this.widgetDiv.setAttribute('height',(this.data.height + this.margins.top + this.margins.bottom) + 'px');
    this.widgetDiv.setAttribute('width', (this.data.width  + this.margins.left) + 'px');
    this.widgetDiv.style.background = 'var(--jp-layout-color0)';
    this.el.appendChild(this.widgetDiv);
    this.canvasDiv = document.createElement('div');
    this.canvasDiv.style.position = 'relative';
    this.canvasDiv.style.inset = '0';
    //this.canvasDiv.style.top = (debug_button_heught) + 'px';
    //this.canvasDiv.setAttribute('top', (debug_button_height) + 'px');
    //
    this.canvasDiv.style.top = this.margins.top + 'px';  this.canvasDiv.style.left = this.margins.left + 'px';
    this.canvasDiv.setAttribute('id', 'canvasDiv' + this.randomStr);
    this.canvasDiv.setAttribute('height',this.data.height + 'px');
    this.canvasDiv.setAttribute('width', this.data.width + 'px'); this.canvasDiv.style.position='relative';
    this.widgetDiv.appendChild(this.canvasDiv);
    this.PRINT_N(1, "rrr obwidget->class we have declared canvasDiv");
    this.PRINT_N(1,"rrr obwidget->class->render() we have generated canvasDiv, declaring canvas.");
    this.svg_zone = document.createElementNS(this.svgns, 'svg');
    this.svg_zone.style.width=(this.data.width) + 'px';  this.svg_zone.setAttribute('id','svg_zone'); this.svg_zone.style.height=(this.data.height)+'px';
    this.svg_zone.setAttribute('height',this.data.height);  this.svg_zone.setAttribute('width',this.data.width); this.svg_zone.setAttribute('z-level',3);
    this.svg_zone.setAttributeNS(this.svgns, "viewBox", "0 0 " + this.data.width + " " + this.data.height);
    this.svg_zone.style.position = 'absolute';
    this.svg_zone.setAttribute('left', 0 + 'px'); this.svg_zone.style.left = '0px'; this.svg_zone.style.top = '0px';
    this.svg_zone.setAttribute('top', 0 + 'px');
    //const top_frac = 0.0;
    //this.svg_zone.style.top = (top_frac * this.data.height) + 'px';
    this.canvasDiv.appendChild(this.svg_zone);

    let sip_button = document.createElement('button');
    sip_button.style.top = this.margins.top + 'px'; sip_button.style.left = this.margins.left + 'px';
    sip_button.setAttribute('height', Math.round(.15*this.data.height) + 'px'); sip_button.style.height = Math.round(.15*this.data.height) + 'px';
    sip_button.setAttribute('width', Math.round(.2 * this.data.width) + 'px'); sip_button.style.width = Math.round(.2*this.data.width) + 'px';
    sip_button.setAttribute('top', (0) + 'px');
    sip_button.setAttribute('left', (this.margins.left + 0) + 'px');
    sip_button.innerHTML = 'activate-sip'; sip_button.addEventListener('click', () => {
      this.runSipTest();
      this.model.set("run", "WE-RAN");
      console.log(" End of the algorithm, we are going to save changes to model.");
      this.model.save_changes();
    });
    this.sip_button = sip_button;
    this.widgetDiv.appendChild(sip_button);


    let oba_button = document.createElement('button');
    oba_button.style.top = this.margins.top + 'px'; oba_button.style.left = this.margins.left + 'px';
    oba_button.setAttribute('height', Math.round(.15*this.data.height) + 'px'); oba_button.style.height = Math.round(.15*this.data.height) + 'px';
    oba_button.setAttribute('width', Math.round(.2 * this.data.width) + 'px'); oba_button.style.width = Math.round(.2*this.data.width) + 'px';
    oba_button.setAttribute('top', (0) + 'px');
    oba_button.setAttribute('left', (this.margins.left + 0) + 'px');
    oba_button.innerHTML = 'activate-oba'; oba_button.addEventListener('click', () => {
      this.runOBATest();
      this.model.set("run", "WE-RAN");
      console.log(" End of the algorithm, we are going to save changes to model.");
      this.model.save_changes();
    });
    this.sip_button = sip_button;
    this.widgetDiv.appendChild(sip_button);
    this.oba_button = oba_button;
    this.widgetDiv.appendChild(oba_button);

    let debug_button = document.createElement('button');
    debug_button.style.top = this.margins.top + 'px'; sip_button.style.left = Math.round(this.margins.left + (.2 * this.data.width)) + 'px';
    debug_button.setAttribute('height', Math.round(.15 * this.data.height) + 'px'); debug_button.style.height = Math.round(.15*this.data.height) + 'px';
    debug_button.setAttribute('width', Math.round(.2 * this.data.width) + 'px'); debug_button.style.width = Math.round(.2*this.data.width) + 'px';
    debug_button.setAttribute('top', (0) + 'px');
    debug_button.setAttribute('left', Math.round(this.margins.left + (.2*this.data.width)) + 'px');
    debug_button.innerHTML = 'debug'; 
    debug_button.addEventListener('click', () => { const mythis=this; debugger;
    });
    this.debug_button = debug_button;
    this.widgetDiv.appendChild(debug_button);
  }
  async render(properties) {
    this.PRINT_N(0, "---- Render Called");
    this.PRINT_N(0, " --- What do you want to call?");
  }

}

async function async_app_render({ model, el }) {
  PRINT_N(0,"async_app_render has been called.");
  my_widget = new app_widget({"el": el, "model":model});
  return () => { console.log("calling app.js async_app_render.destroy()"); my_widget.destroy(); }
}
export default {
  initialize({model}) {
    PRINT_N(1, "initialize(); called."); 
    PRINT_N(1, "Object.keys(model) = [" + Object.keys(model).join(",") + "]");
    PRINT_N(1, "intialize() end");
    my_widget.model=model;
  },
  render({model, el}) {
    PRINT_N(1, "render() called trying to call the async_gpu_render();");
    async_app_render({model,el});
    PRINT_N(1, "render() -- end of call to async_gpu_render.");
    my_widget.model=model;
  }
}
