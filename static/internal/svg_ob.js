///////////////////////////////////////////////////////////////////
// svg related code to E6 pipeline
//
//

// Unfortunately it appears that svg based objects need to be
// reserved with "createElementNS(...)" which adds challenge and complication
// to reserving SVG elements which can be located above the data in the image.
const svgns = "http://www.w3.org/2000/svg";
const pretty_num = require('../internal_lib/pretty_num');
const bigmult = pretty_num.bigmult;
require('./tooltip.css');

const string_del_tm = pretty_num.string_del_tm;
const printer = require("./printer.js");
const is_numeric = printer.is_numeric; const is_positive_numeric = printer.is_numeric;

var prop_mo = {'nText':'', 'tipText':'', n_wp: 0, n_nbbo: 0, n_buys: 0, n_sells: 0, n_trades: 0,
              'wp': {'ntm':-1, 'ltm':-1, 'fd_text':''},
              'buys':{},
              'sells':{},
              'trades':{}, 'locX':null, 'timeX':null, 'priceY':null, 'locY':null,
              'try_lln':-1,
              'last_lln': {'priceY':-1.0,'locY':-1.0,'timeX':0,'locX':null,'wtfac':null,'wtmin':null,
                           'wpmax':-1.0, 'wpfac':1.0, 'unit':0, 'on_fd':-1.0, 'on_wp':-1,
                           'onk':-1, 'nk':0, 'nr':0, 'bs01':-1, 'price_delta':null, 'lln':''
               },
               'last_nbbo': {'pnbb':-1.0, 'pnbo':-1.0, 'new_nbbo_i':-1}
              };
var buy_select = []; var sell_select=[]; var trade_select=[];
var max_ps_fails = 0;
var past_nbbo_i = -1;
// It appears we will have to make a number of svg and svg text elements and configure
// some basic CSS attributes.
const make_svg_el = function(nm, locx,locy,widthx,heighty) {
      let nvd = document.createElementNS(svgns, 'text'); nvd.setAttribute('id',nm);
      nvd.setAttribute('x', locx); 
      //nvd.setAttribute('x',Math.floor(locx - (txt.length * txtsize)*.25)); 
      nvd.setAttribute('y',locy); nvd.setAttribute('position','absolute'); nvd.style.position = 'absolute';
      nvd.setAttribute('width', widthx + "px"); nvd.style.width = widthx + "px";
      nvd.setAttribute('height', heightx + "px"); nvd.style.height = heighty + "px";
      return(nvd);
}    
const make_text_el = function(nm, locx,locy,txt, txtsize) {
      let nvd = document.createElementNS(svgns, 'text'); nvd.setAttribute('id',nm);
      nvd.setAttribute('x', locx); 
      //nvd.setAttribute('x',Math.floor(locx - (txt.length * txtsize)*.25)); 
      nvd.setAttribute('y',locy);
      nvd.setAttribute('text-anchor','middle');
      nvd.setAttribute('dominant-baseline',"middle");
      nvd.setAttribute("font-family", "Arial"); nvd.setAttribute('z-level',2);
      nvd.setAttribute("font-size", txtsize + "px"); nvd.setAttribute("fill", "black");
      nvd.textContent = txt; // The actual text content
      return(nvd);
}    
const circle_rsize = 10;

const calc_scale_wtfac = function(data)   { return((data.width/data.origmult) / (data.tmax - data.tmin));}
const calc_unscale_wtfac = function(data) { return((data.width) / (data.tmax - data.tmin)); }
const calc_scale_wtmin = function(data)   { return((data.tmin) * data.origmult); }
const calc_unscale_wtmin = function(data) { return((data.tmin)); }

var past_ps = {"i":-1, "bs01":-1,"lev":-1, "price":0.0, "dist":-1};
// Binary searches in the data.


// We will have to search Time series data, such as the NBBO table to find nearest
// times matching to timeX
//
// Now, if our mouse is currently attached to a nearby time, linear search may be best
// but if we have not located our mouse near the table in a while, a binary search operation can
// be fastest.  The same will happen in searching buy and sells.
//
// Note we converted timeX into integer times so seekn is different.
const current_nbbo_i = function(timeX, nbbo, pasti) {
  if ((nbbo === null) || (nbbo === undefined)) { return(-1); }
  if (nbbo.length <= 0) { return(-1); }
  if (nbbo.time[0] > timeX) { return(-1); }
  if (nbbo.time[nbbo.time.length-1] <= timeX) { return(nbbo.time.length-1) }
  if ((pasti === undefined) || (pasti < 0) || (pasti > nbbo.time.length-1)) { return(binary_nbbo_i(timeX, nbbo)); }
  if (nbbo.time[pasti] == timeX) { return(pasti); }
  while ((pasti < nbbo.time.length) && (nbbo.time[pasti] <= timeX)) {
    if (nbbo.time[pasti+1] > timeX) { return(pasti); }
    pasti = pasti + 1;
  }
  if (nbbo.time[pasti] == timeX) { return(pasti); } 
  while ((pasti > 0) && (nbbo.time[pasti] > timeX)) {
    if (nbbo.time[pasti-1] <= timeX) { return(pasti-1); }
    pasti = pasti -1;
  }
  return(pasti);
}
const bin_seek_time = function(timeXn, time_v) {
  const nn = time_v.length;
  if (nn <= 0) { return(-1); }
  if (time_v[0] > timeXn) { return(-1); }
  if (nn == 1) { return(0); }
  let u0 = 0; let u1 = nn-1;
  if (time_v[u1] <= timeXn) { return(u1); }
  let ns = 0;
  while (u0+1 < u1) {
    const u_mh = Math.floor(.5*(u0 + u1));
    const u_m = (u_mh >= u1) ? (u1-1) : ((u_mh <= u0) ? (u0 + 1) : u_mh);
    if ((time_v[u_m] <= timeXn) && (time_v[u_m+1] > timeXn)) { return(u_m); }
    if (time_v[u_m+1] < timeXn) { u0 = u_m + 1;
    } else if (time_v[u_m] > timeXn) { u1 = u_m; 
    } else { console.log("what Wrong?");  debugger; }
    //console.log("u0 = " + u0 + ", u_1 = " + u1 + ", u_m = " + u_m + ", time_v[u_m] = " + time_v[u_m]); 
    ns++;
    if (ns >= 10000) { console.log("Error, ns=" + ns + ", u0=" + u0 + ", u1=" + u1); return(-1); }
  }
  return(u0);
}
const walk_seek_time = function(timeXn, time_v, st_i) {
  const nn = time_v.length;
  if (nn <= 0) { return(-1); }
  if (nn == 1) { return(0); }
  if (time_v[0] > timeXn) { return(-1); }
  if (nn == 1) { return(0); }
  let on_i = (st_i < 0) ? 0 : (st_i >= nn) ? nn-1 : st_i;
  if ((time_v[on_i] <= timeXn) && ((on_i >= nn-1) || (time_v[on_i+1] > timeXn))) { return(on_i); }
  if (time_v[nn-1] <= timeXn) { return(nn-1); }
  if (time_v[on_i] < timeXn) {
    while ((on_i < nn) && (time_v[on_i+1] < timeXn)) { on_i++; }
    return(on_i);
  }
  while ((on_i > 0) && (time_v[on_i] > timeXn)) { on_i--; }
  return(on_i);
}
const seek_new_time = function(timeXn, time_v, st_i) {
  if ((time_v === null) || (time_v === undefined)) { return(-1); }
  const ti = ( ((st_i === undefined) || (st_i === null) || (st_i === -1))  ?
     bin_seek_time(timeXn, time_v) : walk_seek_time(timeXn, time_v, st_i) );
  return(ti);
}
const seek_new_ps = function(timeXn, priceY, ps, past_ps) {
  if ((ps === null) || (ps === undefined)) { return({"i":-1, "bs01":-1,"lev":-1}); }
  if ((ps.v_b_wp === null) || (ps.v_b_wp === undefined)) { return({"i":-1,"bs01":-1,"lev":-1, "dist":-1}) }
  if (ps.v_time[0] > timeXn) { return({"i":-1,"bs01":-1,"lev":-1, "dist":-1}) };
  const ti = (((past_ps.i ===undefined) || (past_ps === -1)) 
                   ? bin_seek_time(timeXn, ps.v_time) 
                   : walk_seek_time(timeXn, ps.v_time, past_ps.i));
  let mn_bp = 0; const nr = ps.nr;
  for (let kk = 1; kk < ps.nk; kk++) {
    if (Math.abs(ps.v_b_wp.k[mn_bp][nr][ti] - priceY) > Math.abs(ps.v_b_wp.k[kk][nr][ti] - priceY)) {
      mn_bp = kk; 
    }
  } 
  let mn_sp = 0; 
  for (let kk = 1; kk < ps.nk; kk++) {
    if (Math.abs(ps.v_s_wp.k[mn_sp][nr][ti] - priceY) > Math.abs(ps.v_s_wp.k[kk][nr][ti] - priceY)) {
      mn_sp = kk; 
    }
  }
  if (Math.abs(ps.v_s_wp.k[mn_sp][nr][ti] - priceY) > Math.abs(ps.v_b_wp.k[mn_bp][nr][ti]-priceY)) {
    return({"i":ti,"bs01":0,"lev":mn_bp, "price":ps.v_b_wp.k[mn_bp][nr][ti], 
            "dist":Math.abs(ps.v_b_wp.k[mn_bp][nr][ti]-priceY)});
  }
  return({"i":ti,"bs01":1,"lev":mn_sp, "price":ps.v_s_wp.k[mn_sp][nr][ti], 
            "dist":Math.abs(ps.v_s_wp.k[mn_sp][nr][ti]-priceY)});
}

const generate_wpt_lln = function(new_ps, data, timeX, priceY) {
  const onk = new_ps.lev;  const nr = data.ps.nr; const nk = data.ps.nk;
  const on_wp = new_ps.price;
  const mult_const = bigmult(data.unit);
  const imult_const = 1.0/mult_const;
  //const bi_st0 = pretty_num.process_string_bi(this.orig.st_time);
  //  this.orig.bi_st0 = bi_st0;
  const pseq = data.ps.wpt[(new_ps.bs01==0)?'v_b_p':'v_s_p'][onk];
  const tseq = data.ps.wpt['time'];
  if (pseq === null) {
    console.log("Error, pseq is null.");
  } else if (pseq === undefined) {
    console.log("Error, pseq is undefined.");
  } else if (typeof(pseq) != 'object') {
    console.log("Error, typeof(pseq) = " + typeof(pseq));
    console.log("  --- note onk = " + onk + "/" + nk);
    console.log("Please inspect");
  }
  return(generate_lln(data, pseq, tseq, timeX));
}
const generate_lln = function(data, pseq, tseq, timeX, priceY) {
  const mult_const = bigmult(data.unit);
  const imult_const = 1.0/mult_const;
  const st_time_bi = BigInt(pretty_num.process_tm(data.st_time, -9));
  const wtfac = calc_unscale_wtfac(data);
  const wtmin = calc_unscale_wtmin(data);
  const mm = (x) => (st_time_bi + BigInt(Math.floor(mult_const*x)));
  const imm = (x) => imult_const * Number((BigInt(x)-BigInt(st_time_bi))); 
  const iwt_imm = (x) => Math.floor(wtfac * (imm(x)- wtmin) );

  const wpmin = data.pmin; const wpmax = data.pmax;
  const wpfac = (data.height) / (data.pmax-data.pmin);
  const timeXn = mm(timeX); const time0n = mm(data.tmin); const time1n = mm(data.tmax);
  let ptime0 = 0n; let sumOH = 0; let oH = 0;
  let lln = "";
  for (let jj = 0; jj < pseq.length-1;jj++) {
    const otime = tseq[jj]; const ntime = tseq[jj+1];
    const oprice = pseq[jj]; const nprice = pseq[jj+1]; 
    if (otime >= time1n) {
      break;
    } else if (otime == time0n) {
      lln = ('M ' + iwt_imm(otime) + ' ' + 
                Math.floor(wpfac * (wpmax - oprice)) );   ptime0 = otime;
    } else if (otime < time0n) {
      if (ntime >= time0n) {
        lln = ('M ' + Math.floor(wtfac * (imm(otime)- wtmin)) + ' ' + 
                  Math.floor(wpfac * (wpmax - oprice)) );  ptime0 = otime;
      }
    } else {
      if (oprice == nprice) {
      } else {
        //oH = Math.floor(wtfac * (Number(ntime-ptime0) / mult_const)); sumOH += oH;
        //lln = (lln + ' H ' + oH + ' V ' + 
        //     Math.floor(Number(nprice - oprice)*wpfac)) + ''; ptime0 = ntime;
        const t0 = iwt_imm(ptime0);
        const t1 = iwt_imm(ntime);
        const p0 = Math.floor(wpfac * (wpmax - oprice));
        const p1 = Math.floor(wpfac * (wpmax - nprice));
        lln = (lln + ' L ' + t1 + ' ' + p0 + ' L ' + t1 + ' ' + p1);
      }
    } 
  }
  return(lln);
}
const test_text = (`
svg_svg = my_this.svg_zone;  data = my_this.data; prop_mo = my_this.svg_ob.prop_mo;
last_lln = prop_mo.last_lln;
priceY = last_lln.priceY;  on_wp = last_lln.on_wp; timeX = last_lln.timeX; onk = last_lln.onk; nr = last_lln.nr; nk = last_lln.nk; bs01 = last_lln.bs01;
price_delta = last_lln.price_delta; wtfac = calc_unscale_wtfac(data); wtmin=calc_unscale_wtmin(data); wpfac = last_lln.wpfac; wpmax = last_lln.wpmax;
try_lln = last_lln.lln; generate_lln = my_this.svg_ob.generate_lln;
new_ps = {'onk':onk, 'lev':onk, 'nr':nr, 'bs01':bs01, 'nk':nk,'price':on_wp};
mult_const = my_this.bigmult(data.unit);  imult_const = 1.0/mult_const;  
st_time_bi = BigInt(pretty_num.process_tm(data.st_time, -9));
mm = (x) => (st_time_bi + BigInt(Math.floor(mult_const*x)));  imm = (x) => imult_const * Number((x-st_time_bi)); 
iwt_imm = (x) => Math.floor(wtfac * (imm(x)- wtmin) );
pseq = data.ps.wpt[(new_ps.bs01==0)?'v_b_p':'v_s_p'][onk];
tseq = data.ps.wpt['time'];

timeXn = mm(timeX); time0n = mm(data.tmin); time1n = mm(data.tmax);
ptime0 = 0n; sumOH = 0; oH = 0;  lln = "";

//
lln = generate_lln(new_ps, data, timeX, priceY, price_delta, wtfac, wtmin, wpfac, wpmax);

`);
const place_svg_ps = function(svg_svg, data, timeX, priceY, price_delta, wpfac, wpmax) {
  if ((data.ps === null) || (data.ps === undefined)) { past_ps = null; return(-1); }
  const mult_const = bigmult(data.unit);
  const imult_const = 1.0/mult_const;
  const st_time_bi = BigInt(pretty_num.process_tm(data.st_time, -9));
  //const bi_st0 = pretty_num.process_string_bi(this.orig.st_time);
  //  this.orig.bi_st0 = bi_st0;
  const mm = (x) => (st_time_bi + BigInt(Math.floor(mult_const*x)));
  const imm = (x) => imult_const * Number((x-st_time_bi)); 
  const wtfac = calc_unscale_wtfac(data);
  const wtmin = calc_unscale_wtmin(data);
  const iwt_imm = (x) => Math.floor(wtfac * (imm(x)- wtmin) );
  const timeXn = mm(timeX); const time0n = mm(data.tmin); const time1n = mm(data.tmax);
  //const time0n = pretty_num.uninvert_bi(data.tmin, data.unit, data.st_time); 
  //const time1n = pretty_num.uninvert_bi(data.tmax, data.unit, data.st_time); 
  const new_ps = seek_new_ps(timeXn, priceY, data.ps, past_ps);
  if ((prop_mo === undefined) || (prop_mo === null) || (prop_mo.nText === undefined)) {
    if (prop_mo === undefined) { console.log("place_svg_ps: prop_mo=undefined");
    } else if (prop_mo == null) { console.log("place_svg_ps: prop_mo=null");
    } else if (prop_mo.nText == null) { console.log("place_svg_ps: prop_mo.nText is undefined");
    }
    console.log("place_svg_ps: We have undefined prop_mo?"); debugger;
  }
  if ((new_ps === null) || (new_ps === undefined) || (new_ps.i === null) || (new_ps.i === undefined) || (new_ps.i === -1)) {
     past_ps = new_ps; 
     let cwp = svg_svg.getElementById('circle_wp_price_min');
     if ((cwp !== null) && (cwp !== undefined)) {
       cwp.setAttribute('r',0); cwp.setAttribute('cx',-100); cwp.setAttribute('cy',-100); 
     }
     let lwp = svg_svg.getElementById('line_wp_price_min');
     if ((lwp != null) && (lwp != undefined)) {
       lwp.setAttribute('d', 'M -1000,-1000 H 0');    
     }
  } else {
    past_ps = new_ps;
    const onk = new_ps.lev;  const nr = data.ps.nr; const nk = data.ps.nk;
    const on_fd = data.ps.v_fd[onk];
    const on_wp = new_ps.price;
    //if (Math.abs(Math.abs(on_wp-priceY) - new_ps.dist) > 1.0) {
    //  console.log("Error, Dist has been misapplied?"); debugger;
    //} 
    if (Math.abs(new_ps.dist) < (price_delta*10)) {  
      const fd_text = (", <br>[fd=" + data.ps.v_fd[onk] + ":\$" + on_wp.toFixed(2) + "]");
      prop_mo.try_lln = 1;
      prop_mo.nText = prop_mo.nText + fd_text;
      prop_mo.tipText = prop_mo.tipText + fd_text; 
      prop_mo.n_wp = 1;
      const tm0n = data.ps.v_time[new_ps.i]; 
      const ltm = Math.floor(wtfac * ( imm(tm0n)- wtmin) );
      const ntm = (new_ps.i < data.ps.v_time.length-1) ?  imm(data.ps.v_time[new_ps.i]) :  data.tmax; 
      const lntm = Math.floor(wtfac * (Number(ntm) - wtmin)) ;
      //console.log("new_nbbo_i we have lpnbb=" + lpnbb + ", lpnbo=" + lpnbo + ", ltm = " + ltm + " for ["+pnbb.toFixed(2)+","+pnbo.toFixed(2) + "] " + tm.toFixed(2));
      let cwp =  svg_svg.getElementById('circle_wp_price_min');
      const lpwp =  Math.floor(wpfac * (wpmax-on_wp));
      prop_mo.wp = {'on_fd':on_fd, 'on_wp':on_wp, 'ltm':ltm, 'ntm':ntm, 'lntm':lntm, 'fd_text':fd_text};
      //console.log(" --- About to configure last_lln");
      //debugger;
      prop_mo.last_lln.on_fd = on_fd;  prop_mo.last_lln.priceY=priceY; prop_mo.last_lln.timeX=timeX;  prop_mo.last_lln.on_wp = on_wp;
      prop_mo.last_lln.onk = onk;  prop_mo.last_lln.nk=nk; prop_mo.last_lln.on_wp = on_wp; prop_mo.last_lln.bs01 = new_ps.bs01;
      prop_mo.last_lln.unit = data.unit; prop_mo.last_lln.price_delta = price_delta;  prop_mo.last_lln.wtmin=wtmin;
      prop_mo.last_lln.wtfac = wtfac; prop_mo.last_lln.wpfac = wpfac; prop_mo.last_lln.wpmax = wpmax;
      prop_mo.last_lln.price_delta=price_delta;
      //console.log("Close enough to add effects on WP"); debugger;
      if ((cwp === null) || (cwp === undefined) || (!(cwp))) {
        cwp = make_point_circle("circle_wp_price_min", ltm,lpwp, circle_rsize, rgb_green, 1);
        cwp.setAttribute('z-level',3);
        svg_svg.appendChild(cwp); 
      } else {
        cwp.setAttribute("cx", ltm); cwp.setAttribute("cy", lpwp); cwp.setAttribute('r',circle_rsize);
      }
      const lln = generate_wpt_lln(new_ps, data, timeX, priceY);
      prop_mo.last_lln.lln = lln;
      //const olln = "M " + 0 + "," + lpwp + " H " + Math.floor(wtfac * ( data.tmax-data.tmin));
      let lwp = svg_svg.getElementById('line_wp_price_min');
      const svg_width = Number(svg_svg.getAttribute('width'));
      //console.log(" --- We are ready to try to plot lln: time0n:" + time0n + ", time1n:" + time1n + ", we have sumOH = " + sumOH);
      //console.log(" --- Note svg_svg.width - sumOH = " + svg_width + " - " + sumOH + " = " + (svg_width- sumOH));
      if ((lwp === null) || (lwp === undefined) || (!(lwp))) {
        lwp = make_hline('line_wp_price_min', ltm, lpwp,lntm, rgb_green,5); lwp.setAttribute('z-level',3);
        lwp.setAttribute('d', lln);  lwp.setAttribute('fill','none');
        svg_svg.appendChild(lwp);
      } else {
        lwp.setAttribute('d', lln); lwp.setAttribute('fill', 'none');
        //lwp.setAttribute('d', 'M ' + ltm + "," + lpwp + " H " + Math.floor(lntm)); 
      }
      console.log("prop_mo: Successes on_fd should exit (" +(new_ps.bs01==0?"b":"s")+ on_fd + ",$" + on_wp + ").");
      console.log(" -- tipText :" + prop_mo.tipText);
      //debugger;
    } else {
      //const onk = new_ps.lev;  const nr = data.ps.nr; const nk = data.ps.nk;
      //const on_fd = data.ps.v_fd[onk];
      //const on_wp = data.ps[(new_ps.bs01==0) ? "v_b_wp": "v_s_wp"].k[onk][nr][new_ps.i];
      const on_timeN = data.ps.v_time[new_ps.i];
      //console.log("Failed: 10*price_delta = " + 10*price_delta + ", dist=" + Math.round(new_ps.dist,2) + ".");
      //console.log(" Note Fail: " + 
      //    ((new_ps.bs01==0) ? "b":"s") + ":fd=" + on_fd + ",$" + on_wp + " versus priceY=$" + priceY);
      //console.log(" ti time = " + new_ps.i + ":INT=" + data.ps.v_time[new_ps.i] + ":TM=" + 
      //  string_del_tm(Number(on_timeN), -9, "00:00:00.000000000", true));
      //max_ps_fails++;
      //console.log(" -- Versus our on timeX = " + timeX + "(" + data.unit + "): " + 
      //  string_del_tm(Number(timeX), data.unit, "00:00:00.000000000", true));
      return(0);
    } 
  }
  return(0);
}
const binary_nbbo_i = function(timeX, nbbo) {
  if ((nbbo === null) || (nbbo === undefined)) { return(-1); }
  if (nbbo.length <= 0) { return(-1); }
  if (nbbo.length <= 1) { if (nbbo.time[0] <= timeX) { return(0); } else {return(-1); }}
  //console.log("binary_nbbo_i called for nbbo of length " + nbbo.time.length);
  let i0 = 0; let i1 = nbbo.time.length -1;
  if (nbbo.time[i0] > timeX) { return(-1); }
  if (nbbo.time[i1] <= timeX)  { return(i1); }
  while (i0 < i1-1) {
    let ip = Math.floor((i0+i1)/2);
    if (ip == i0) { ip = ip + 1; } else if (ip == i1) { ip = ip-1 };
    if (nbbo.time[ip] > timeX) { i1 = ip; 
    } else if (nbbo.time[ip] == timeX) { return(ip); 
    } else { i0 = ip; }
  }
  if (nbbo.time[i1] <= timeX) { return(i1); }
  return(i0);
}
const update_bottom = function(obs_tgt, srts, tgt_target, old_i) {
  if (obs_tgt.length <= 0) { return(-1); }
  if (obs_tgt.length <=1) { if (obs_tgt[0] >= tgt_target) { return(0); } else {return(-1); } }
  if ((old_i === undefined) || (old_i < 0) || (old_i >= srts.length)) {
   return(binary_bottom(obs_tgt, srts, tgt_target));
  }
  while ((old_i > 0) && (obs_tgt[srts[old_i]] >= tgt_target )) {
    if ((old_i > 1) && (obs_tgt[srts[old_i-1]] < tgt_target)) { return(old_i)
    } else { old_i = old_i-1 }
  }
  while ((old_i < obs_tgt.length-1) && (obs_tgt[srts[old_i]] < tgt_target)) {
    if (obs_tgt[srts[old_i+1]] >= tgt_target) { return(old_i+1); }
    old_i = old_i + 1;
  }
  return(old_i);
}
const binary_bottom = function(obs_tgt, srts, tgt_target) {
  if (obs_tgt.length <= 0) { return(-1); }
  if (obs_tgt.length <= 1) { if (obs_tgt[0] >= tgt_target) { return(0); } else {return(-1); } }
  let i0 = 0; let i1 = obs_tgt.length-1;
  if (obs_tgt[srts[i0]] > tgt_target) { return(-1); }
  if (obs_tgt[srts[i1]] <= tgt_target) { return(i1); }
  while(i0<i1) {
    let ip = Math.floor((i0+i1)/2);
    if (ip == i0) { ip = ip+1; }
    let p_ip = obs_tgt[srts[ip]];
    if (p_ip >= tgt_target) { i1 = ip
    } else { i0 = ip }
    if (i1-i0<=1) { break; }
  }
  return(i0);
}

const update_top = function(obs_tgt, srts, tgt_target, old_i) {
  if (obs_tgt.length <= 0) { return(-1); }
  if (obs_tgt.length <=1) { if (obs_tgt[0] <= tgt_target) { return(1); } else {return(-1); } }
  if ((old_i === undefined) || (old_i < 0) || (old_i === null) || (old_i >= srts.length)) {
   return(binary_top(obs_tgt, srts, tgt_target));
  }
  while ((old_i > 0) && (obs_tgt[srts[old_i]] > tgt_target )) {
    if ((old_i > 1) && (obs_tgt[srts[old_i-1]] <= tgt_target)) { return(old_i)
    } else { old_i = old_i-1 }
  }
  while ((old_i < obs_tgt.length-1) && (obs_tgt[srts[old_i]] <= tgt_target)) {
    if (obs_tgt[srts[old_i+1]] > tgt_target) { return(old_i+1); }
    old_i = old_i + 1;
  }
  return(old_i);
}
const binary_top = function(obs_tgt, srts, tgt_target) {
  if (obs_tgt.length <= 0) { return(-1); }
  if (obs_tgt.length <= 1) { if (obs_tgt[0] > tgt_target) { return(1); } else {return(-1); }}
  let i0 = 0; let i1 = obs_tgt.length-1;
  if (obs_tgt[srts[i0]] > tgt_target) { return(-1); }
  if (obs_tgt[srts[i1]] <= tgt_target) { return(i1+1); }
  let ip = -1; let p_ip = 0.0;
  while(i0<i1) {
    ip = Math.floor((i0+i1)/2);
    if (ip == i0) { ip = ip+1; }
    p_ip = obs_tgt[srts[ip]];
    if (p_ip > tgt_target) { i1 = ip
    } else { i0 = ip }
    if (i1-i0<=1) { break; }
  }
  return(i1);
}
// obs = data.buys; srts = srt_buys; on_time = 10; on_price = 22; price_delta=3; pastBounds = [-1,srt_buys.length];
const get_obs_range = function(obs, srts, on_time, on_price, price_delta, pastBounds, on_string) {
  if ((obs === null) || (obs === undefined)) { return({new_range:[-1,-1],ret:[]}); }
  let new_range = [update_bottom(obs.price,srts, on_price-price_delta, pastBounds[0]),
                   update_top(obs.price,srts,on_price+price_delta,pastBounds[1])];

  if ((new_range[1] === undefined) || (!is_numeric(new_range[1]))) {
    console(`get_obs_range(${on_string}): we had bounds [${pastBounds[0]},${pastBounds[1]}] but new_range[1] is undefined?`);
    debugger;
    new_range[1] = obs.open.length; 
  }
  if ((new_range[0] === undefined) || (!is_numeric(new_range[0]))) {
    console(`get_obs_range(${on_string}): we had bounds [${pastBounds[0]},${pastBounds[1]}] but new_range[0] is undefined?`);
    debugger;
  }
  if ((new_range[1] < 0) || (new_range[1] >= obs.price.length)) {
    if (obs.price[srts[0]] > on_price + price_delta) {
      new_range[1] = 0;
    } else if (new_range[1] == obs.price.length) {
      if (obs.price[srts[obs.price.length -1]] <= on_price + price_delta) {
      } else {
        console.log(`get_obs_range(${on_string}). new_range[1] == ${new_range[1]} which is obs.price.length and still max obs is ` +
          obs.price[srts[obs.price.length-1]]);
      }
    } else if (obs.price[srts[0]] > on_price+price_delta) {
      
    } else {
      console.log(`get_obs_range(${on_string}), new_range[1] is bad returned as ${new_range[1]} and that is out of bounds.`);
      debugger;
    }
  } 
  if ((new_range[0] < 0) || (new_range[0] >= obs.price.length)) {
    if (obs.price[srts[srts.length-1]] > on_price-price_delta) {
      new_range[0] = -1; 
    } else if (obs.price[srts[obs.price.length-1]] < on_price - price_delta) {
    } else if ((new_range[0] == obs.price.length) || (new_range[0] < 0)) {
      if (obs.price[srts[0]] >= on_price - price_delta) {
        new_range[0] = 0;
      } else {
        console.log(`get_obs_range(${on_string}). new_range[0] == ${new_range[0]} which is obs.price.length and still max obs is ` +
          obs.price[srts[obs.price.length-1]]);
      }
    }
  }
  if (((new_range[0] < 0) || (new_range[0] >= obs.price.length)) && ((new_range[1] < 0) || (new_range[1] >= obs.price.length)) ) {
    return({new_range:new_range, ret:[]});
  }
  let ret = [];
  let up_range = new_range[1]; if (up_range == new_range[0]) { up_range = new_range[0] + 1; }
  if (up_range > obs.open.length) { up_range = obs.open.length; }
  for (let ii = new_range[0]; ii < up_range; ii++) {
    if ((obs.open[srts[ii]] <= on_time) && (obs.close[srts[ii]] >= on_time)) { ret.push(srts[ii]); }
  }
  if (ret.length >= 100) {
    console.log(`get_obs_range(${on_string}) -- we have ret of length ${ret.length}, I think needs more work`)
    console.log(` -- on_price=${on_price}, price_delta=${price_delta} with range = [${new_range[0]},${new_range[1]}]`);
    console.log(` -- we have obs[srts[new_range[0]=${new_range[0]}]] = ${obs.price[srts[new_range[0]]]}, obs[srts[new_range[1]=${new_range[1]}]]= ${obs.price[srts[new_range[1]]]}.`);
    debugger;
  }
  return({new_range:new_range, ret:ret});
}
const place_svg_trades = function(svg_svg, data, srt_buys, orig_timeX, priceY, price_delta, trade_bounds, wpfac, wpmax, srt_trades) {
  const time_delta = (price_delta / (data.pmax-data.pmin)) * (data.tmax-data.tmin) * data.origmult;
  const trade_range = get_obs_range_trades(data.trades, srt_trades, orig_timeX, priceY, price_delta,time_delta,trade_bounds, "is_trades"); 
  trade_select = [...trade_range.ret];
  //console.log(" On this selection, trade_range.ret has length " + trade_range.ret.length + " or [" + trade_range.ret.join(",") + "]");
  trade_bounds[0] = trade_range.new_range[0];  trade_bounds[1] = trade_range.new_range[1];
  let btriangles = svg_svg.getElementById('buy_trade_triangles_selected');
  if ((btriangles===null) || (btriangles===undefined) || (!(btriangles))) {  btriangles = make_ttriangles("buy_trade_triangles_selected",-1,-1,-1,'blue',5); 
       btriangles.setAttribute('z-level',5); svg_svg.appendChild(btriangles); }
  let striangles = svg_svg.getElementById('sell_trade_triangles_selected');
  if ((striangles===null) || (striangles===undefined) || (!(striangles))) {  striangles = make_ttriangles("sell_trade_triangles_selected",-1,-1,-1,'red',5); 
       striangles.setAttribute('z-level',5); svg_svg.appendChild(striangles); }
  if (!(!(trade_select)) && (trade_select.length > 0)) {
            update_ttriangles(data.trades,trade_select, btriangles, data, 0);
            update_ttriangles(data.trades,trade_select, striangles, data, 1);
  } else { btriangles.setAttribute('d','');  striangles.setAttribute('d',''); }
  prop_mo.n_trades = trade_range.ret.length;
  return(prop_mo.n_trades);
}
const place_svg_buys = function(svg_svg, data, srt_buys, orig_timeX, priceY, price_delta, buy_price_bounds, wpfac, wpmax) {
   const wtfac = calc_scale_wtfac(data);
   const wtmin = calc_scale_wtmin(data);
   const buy_range = get_obs_range(data.buys, srt_buys, orig_timeX, priceY, price_delta, buy_price_bounds, "is_buy");
   buy_select = [...buy_range.ret];
   if (buy_select.length >= 100) {
     console.log("CONCERNING -- Buy select, something is concerning, we have buy_select of length " + buy_select.length);
     console.log("  breaking.");
     debugger;
   }
   buy_price_bounds[0] = buy_range.new_range[0];  buy_price_bounds[1] = buy_range.new_range[1];

   let blines = svg_svg.getElementById('line_buys_selected');
   if ((blines===null) || (blines===undefined) || (!(blines))) {  
            blines = make_hline("line_buys_selected",-1,-1,-1,'blue',5); blines.setAttribute('z-level',4);
            svg_svg.appendChild(blines); 
   }
   if (!(!(buy_range.ret)) && (buy_range.ret.length > 0)) {
     update_hline(data.buys,buy_range.ret, blines, data);
     prop_mo.n_buys = buy_range.ret.length;
     prop_mo.tipText = prop_mo.tipText + "<br>Buys :["
     for (let ii = 0; ii < buy_range.ret.length; ii++) {
       prop_mo.tipText = (prop_mo.tipText + "<br>  $" + data.buys.price[buy_range.ret[ii]] + "," + data.buys.qty[buy_range.ret[ii]] + "(" +  
          (pretty_num.string_del_tm(data.buys.open[buy_range.ret[ii]] / data.origmult, data.unit, data.st_time,true))  + "-" +
          (pretty_num.string_del_tm(data.buys.close[buy_range.ret[ii]] / data.origmult, data.unit, data.st_time,true))  + ")");
    }
    prop_mo.tipText = prop_mo.tipText + "<br>]";
  } else { blines.setAttribute('d',''); prop_mo.n_buys = 0;}
  return(buy_select.length);
}
const place_svg_sells = function(svg_svg, data, srt_sells, orig_timeX, priceY, price_delta, sell_price_bounds, wpfac, wpmax) {
  const wtfac = calc_scale_wtfac(data);
  const wtmin = calc_scale_wtmin(data);
  const sell_range = get_obs_range(data.sells, srt_sells, orig_timeX, priceY, price_delta, sell_price_bounds, "is_sell");
  sell_select = [...sell_range.ret];
  if (sell_select.length >= 100) {
    console.log("CONCERNING -- Sell select, something is concerning, we have sell_select of length " + sell_select.length);
    console.log("  breaking.");
    debugger;
  }
  sell_price_bounds[0] = sell_range.new_range[0];  sell_price_bounds[1] = sell_range.new_range[1];
  let slines = svg_svg.getElementById('line_sells_selected');
  if ((slines===null) || (slines===undefined) || (!(slines))) {  
    slines = make_hline("line_sells_selected",-1,-1,-1,'red',5); slines.setAttribute('z-level',4);svg_svg.appendChild(slines); 
  }
  if (!(!(sell_range.ret)) && (sell_range.ret.length > 0)) {
    update_hline(data.sells,sell_range.ret, slines, data);
    prop_mo.n_sells = sell_range.ret.length;
    prop_mo.tipText = prop_mo.tipText + "<br>Sells :["
    for (let ii = 0; ii < sell_range.ret.length; ii++) {
      prop_mo.tipText = (prop_mo.tipText + "<br>  $" + data.sells.price[sell_range.ret[ii]] + "," + data.sells.qty[sell_range.ret[ii]] + "(" +  
        (pretty_num.string_del_tm(data.sells.open[sell_range.ret[ii]] / data.origmult, data.unit, data.st_time,true))  + "-" +
        (pretty_num.string_del_tm(data.sells.close[sell_range.ret[ii]] / data.origmult, data.unit, data.st_time,true))  + ")");
    }
    prop_mo.tipText = prop_mo.tipText + "<br>]";
  } else { slines.setAttribute('d','');  prop_mo.n_sells =0; }
  return(sell_select.length);
}
const place_svg_nbbo = function(svg_svg, data, orig_timeX) {
   const wpfac = (data.height) / (data.pmax-data.pmin); const wpmax = data.pmax;
   if (!(!(data.nbbo))) {
     const mult_const = bigmult(data.unit);
     const st_time_bi = BigInt(pretty_num.process_tm(data.st_time, -9));
     const wtfac = calc_unscale_wtfac(data); const wtmin = data.tmin;
     const mm = (x) => (st_time_bi + BigInt(Math.floor(mult_const*x)));
     const imult_const = 1.0/mult_const;
     const imm = (x) => ((typeof(data.nbbo.time[0]) == 'bigint') ? imult_const * Number((BigInt(Math.floor(x))-BigInt(st_time_bi))) : 
                         (x)=>(x)); 
     //const new_nbbo_i = current_nbbo_i(orig_timeX, data.nbbo, past_nbbo_i);
     const new_nbbo_i = seek_new_time(mm(orig_timeX), data.nbbo.time, past_nbbo_i);
     //console.log("new_nbbo_i found to be: " + new_nbbo_i + "/" + data.nbbo.time.length + ", past_nbbo_i=" + past_nbbo_i);
     if ((new_nbbo_i < 0) || (new_nbbo_i >= data.nbbo.length)) {
       past_nbbo_i = new_nbbo_i;
       let cbb =  svg_svg.getElementById('circle_nbb_price_min');
       let cbo =  svg_svg.getElementById('circle_nbo_price_min');
       let lbb =  svg_svg.getElementById('line_nbb_price_min');
       let lbo =  svg_svg.getElementById('line_nbo_price_min');
       if ((cbb !== null) && (cbb !== undefined)) {
         cbb.setAttribute("cx", -100); cbb.setAttribute("cy", -100); cbb.setAttribute('r',0);
       }
       if ((cbo !== null) && (cbo !== undefined)) {
         cbo.setAttribute("cx", -100); cbo.setAttribute("cy", -100); cbo.setAttribute('r',0);
       }
       if ((lbb !== null) && (lbb !== undefined)) {
         lbb.setAttribute("cx", -100); lbb.setAttribute("cy", -100); lbb.setAttribute('r',0);
       }
       if ((lbo !== null) && (lbo !== undefined)) {
         lbo.setAttribute("cx", -100); lbo.setAttribute("cy", -100); lbo.setAttribute('r',0);
       }
       return(2);
     } else { 
       prop_mo.nText = prop_mo.nText + ", [nbb,nbo]=[$" + data.nbbo.nbb[new_nbbo_i].toFixed(2) + ",$" + data.nbbo.nbo[new_nbbo_i].toFixed(2) + "]";
       prop_mo.tipText = prop_mo.tipText + ("[nbb=$" + data.nbbo.nbb[new_nbbo_i].toFixed(2) + "]<br>" + 
                       "[nbo=$" + data.nbbo.nbo[new_nbbo_i].toFixed(2) + "]")
       prop_mo.last_nbbo.new_nbbo_i = new_nbbo_i;
       const pnbb = data.nbbo.nbb[new_nbbo_i]; let lpnbb = Math.floor(wpfac * ( wpmax-pnbb) );
       const pnbo = data.nbbo.nbo[new_nbbo_i]; let lpnbo = Math.floor(wpfac * ( wpmax-pnbo) );
       prop_mo.last_nbbo.pnbb = pnbb; prop_mo.last_nbbo.pnbo = pnbo; 
       prop_mo.n_nbbo = 2; prop_mo.last_nbbo.n_nbbo = 2;

       const iwt_imm = (x) => Math.floor(wtfac * (imm(x)- wtmin) );

       const tm = data.nbbo.time[new_nbbo_i]; let ltm = iwt_imm(tm);
       const ntm = (new_nbbo_i < data.nbbo.nbb.length-1) ? data.nbbo.time[new_nbbo_i+1] : data.tmax;
       const lntm = iwt_imm(ntm);
       prop_mo.last_nbbo.pnbb=pnbb; prop_mo.last_nbbo.pnbo=pnbo; prop_mo.last_nbbo.tm=tm; prop_mo.last_nbbo.ntm=ntm; prop_mo.last_nbbo.lntm=lntm;
       prop_mo.last_nbbo.wtmin=wtmin; prop_mo.last_nbbo.tmin=data.tmin;  prop_mo.last_nbbo.tmax=data.tmax;
       //console.log("new_nbbo_i we have lpnbb=" + lpnbb + ", lpnbo=" + lpnbo + ", ltm = " + ltm + " for ["+pnbb.toFixed(2)+","+pnbo.toFixed(2) + "] " + tm.toFixed(2));
       let cbb =  svg_svg.getElementById('circle_nbb_price_min');
       if ((cbb === null) || (cbb === undefined) || (!(cbb))) {
              cbb = make_point_circle("circle_nbb_price_min", ltm,lpnbb,circle_rsize, rgb_green, 1);
              cbb.setAttribute('z-level',3);
              //cbb = make_point_circle("circle_nbb_price_min", ltm,lpnbb,, "black", 5);
              svg_svg.appendChild(cbb); 
       } else {
               cbb.setAttribute("cx", ltm); cbb.setAttribute("cy", lpnbb); cbb.setAttribute('r',circle_rsize);
       }
       let cbo =  svg_svg.getElementById('circle_nbo_price_min');
       if ((cbo === null) || (cbo === undefined) || (!(cbo))) {
              cbo = make_point_circle("circle_nbo_price_min", ltm,lpnbo,circle_rsize, rgb_crimson, 1); cbo.setAttribute('z-level',3);
              svg_svg.appendChild(cbo); 
       } else {
              cbo.setAttribute("cx", ltm); cbo.setAttribute("cy", lpnbo); cbo.setAttribute('r',circle_rsize);
       }
       let lbb = svg_svg.getElementById('line_nbb_price_min');
       if ((lbb === null) || (lbb === undefined) || (!(lbb))) {
              lbb = make_hline('line_nbb_price_min', ltm, lpnbb,lntm, rgb_green,5); lbb.setAttribute('z-level',3);
              svg_svg.appendChild(lbb); 
       } else {
         lbb.setAttribute('d', 'M ' + ltm + "," + lpnbb + " H " + Math.floor(lntm)); 
       }
       let lbo = svg_svg.getElementById('line_nbo_price_min');
       if ((lbo === null) || (lbo === undefined) || (!(lbo))) {
         lbo = make_hline('line_nbo_price_min', ltm, lpnbo,lntm, rgb_crimson,5); lbo.setAttribute('z-level',3);
         svg_svg.appendChild(lbo);
       } else {
         lbo.setAttribute('d', 'M ' + ltm + "," + lpnbo + " H " + Math.floor(lntm));
       }
       past_nbbo_i = new_nbbo_i;            
       prop_mo.last_nbbo.tm = tm;  prop_mo.last_nbbo.ltm = ltm;  prop_mo.last_nbbo.ntm = ntm; prop_mo.last_nbbo.lntm;  
       //debugger;
       return(2);
    }  
  }
}
const get_obs_range_trades = function(obs, srts, orig_timeX, priceY, price_delta, time_delta,past_bounds, on_string) {
  if ((obs === null) || (obs === undefined)) { return({new_range:[-1,-1],ret:[]}); }
  let new_range = [update_bottom(obs.time,srts, orig_timeX-time_delta, past_bounds[0]),
                   update_top(obs.time,srts,orig_timeX+time_delta,past_bounds[1])];
  if (new_range[1] === undefined) {
    console(`get_obs_range(${on_string}): we had bounds [${past_bounds[0]},${past_bounds[1]}] but new_range[1] is undefined?`);
    debugger;
    new_range[1] = obs.price.length; 
  }
  if (new_range[0] === undefined) {
    console(`get_obs_range(${on_string}): we had bounds [${past_bounds[0]},${past_bounds[1]}] but new_range[0] is undefined?`);
    debugger;
  }
  if ((new_range[0] < 0) && (new_range[1] < 0)) {
    return({new_range:new_range, ret:[]});
  }
  const ret = [];
  let up_range = new_range[1]; if (up_range == new_range[0]) { up_range = new_range[0] + 1; }
  if (up_range > obs.price.length) { up_range = obs.price.length; }
  const min_price = priceY - price_delta;  const max_price = priceY + price_delta;
  for (let ii = new_range[0]; ii < up_range; ii++) {
    if ((obs.price[srts[ii]] <= max_price) && (obs.price[srts[ii]] >= min_price)) { ret.push(srts[ii]); }
  }
  return({new_range:new_range, ret:ret});
}
const make_point_circle = function(nm, locx,locy,r, fill_color, stw){
   const circle = document.createElementNS(svgns, 'circle'); 
   const my_svgns = null;
    circle.setAttributeNS(my_svgns, 'cx', locx); // X-coordinate of the center
    circle.setAttributeNS(my_svgns, 'cy', locy); // Y-coordinate of the center
    circle.setAttributeNS(my_svgns, 'r', r + 'px');   // Radius
    circle.setAttributeNS(my_svgns, 'fill', fill_color);
    circle.setAttributeNS(my_svgns, 'stroke', fill_color);
    circle.setAttributeNS(my_svgns, 'stroke-width', stw);
    circle.setAttributeNS(my_svgns, "id", nm);
    return(circle);
}
const make_hline = function(nm, locx, locy, nxtx, fill_color, lwdw) {
  const in_line = document.createElementNS(svgns, 'path');
  in_line.setAttribute( 'id', nm);
  in_line.setAttribute( 'd', 'M ' + locx + "," + locy + " H " + Math.floor(nxtx));
  in_line.setAttribute( 'stroke', fill_color);
  in_line.setAttribute( 'stroke-width', lwdw);
  in_line.setAttribute( 'fill', fill_color);
  return(in_line);
}

const make_hpath = function(nm, locx, locy, nxtx, fill_color, lwdw) {
  const in_line = document.createElementNS(svgns, 'path');
  in_line.setAttribute( 'id', nm);
  in_line.setAttribute( 'd', 'M ' + locx + "," + locy + " H " + Math.floor(nxtx));
  in_line.setAttribute( 'stroke', fill_color);
  in_line.setAttribute( 'stroke-width', lwdw);
  in_line.setAttribute( 'fill', fill_color);
  return(in_line);
}


const make_ttriangles = function(nm, locx, locy, nxtx, fill_color, lwdw) {
  const in_line = document.createElementNS(svgns, 'path');
  in_line.setAttribute( 'id', nm);
  in_line.setAttribute( 'd', 'M ' + locx + "," + locy + " H " + Math.floor(nxtx));
  in_line.setAttribute( 'stroke', fill_color);
  in_line.setAttribute( 'stroke-width', lwdw);
  in_line.setAttribute( 'fill', fill_color);
  return(in_line);
}
const update_hline = function(ords, ordids, hline, data) {
 let nPath = '';
 const wtfac = calc_scale_wtfac(data); 
 const wtmin = data.tmin * data.origmult;
 for (let ii = 0; ii < ordids.length; ii++) {
    nPath = (nPath + 'M ' + Math.floor(wtfac*(ords.open[ordids[ii]] - wtmin)) + 
                     ','  + Math.floor(data.height*(data.pmax-ords.price[ordids[ii]])/(data.pmax-data.pmin)) +
                     ' H ' + Math.floor(wtfac*(ords.close[ordids[ii]] - wtmin)));
 }
 hline.setAttribute('d',nPath);
 hline.setAttribute('stroke', 'black');
}

const trade_verts_arrow = [
  [0,0],
  [-.5, (-1.0/3.0) * (1.0/Math.sqrt(2))], 
  [  0, ( 2.0/3.0) * (1.0 / Math.sqrt(2))],
  [.5,(-1.0/3.0) * (1.0 / Math.sqrt(2))],
  [0,0]
]

const update_ttriangles = function(trades, ordids, ttriangles, data, bs01) {
 let nPath = '';
 const wtfac = calc_scale_wtfac(data); 
 const wtmin = data.tmin * data.origmult;
 const width_height_fac =  data.height / data.width;
 const spread_mul =  .5 * data.trade_mul_fac * data.width

 for (let ii = 0; ii < ordids.length; ii++) {
    let t_c = Math.floor(wtfac * (trades.time[ordids[ii]] - wtmin));
    let p_c = Math.floor(data.height*(data.pmax-trades.price[ordids[ii]]) / (data.pmax-data.pmin));
    let tfactor = Math.pow(Math.abs(trades.qty[ordids[ii]]) / (data.max_qty), data.pow_qty);
    if ((trades.qty[ordids[ii]] > 0) && (bs01 == 0))  {
      nPath = nPath + ' M ' + t_c + "," + p_c;
      for (let jj = 1; jj < trade_verts_arrow.length; jj++) {
        nPath = (nPath + ' L ' + Math.floor(t_c + trade_verts_arrow[jj][0] * tfactor * spread_mul) + 
                          ','  + Math.floor(p_c - trade_verts_arrow[jj][1] * tfactor * spread_mul  ));
 
      }
    } else if ((trades.qty[ordids[ii]] < 0) && (bs01 == 1)) { 
      nPath = nPath + ' M ' + t_c + "," + p_c;
      for (let jj = trade_verts_arrow.length-2; jj >= 0; jj--) {
        nPath = (nPath + ' L ' + Math.floor(t_c + trade_verts_arrow[jj][0] * tfactor * spread_mul) + 
                          ','  + Math.floor(p_c + trade_verts_arrow[jj][1] * tfactor * spread_mul  ));
      }
 
    }
 }
 ttriangles.setAttribute('d',nPath);
 ttriangles.setAttribute('stroke', 'black');
}
const rgb_crimson = "rgb(220, 20, 60)";
const rgb_green = "rgb(0, 110, 13)";
const rgb_gray = "rgb(50, 50, 50)";
const add_svg_mouse_over = function(svg_div,svg_svg, text_svg, data, text_width, text_height, price_delta, wDiv, margins, my_this) {
   // Note, hard part of mouse over is detecting and converting screen locations
   //console.log("add_svg_mouse_over -- Conducting");
   past_nbbo_i = -1;
   const our_pd = price_delta;
   let open_i = [];
   let srt_buys = data.buys.open.map((_,i)=>i);
   srt_buys.sort((a,b) => { if (data.buys.price[a] == data.buys.price[b]) { return(data.buys.open[a]-data.buys.open[b]) } else { return(data.buys.price[a]-data.buys.price[b]) } })
   let srt_sells = data.sells.open.map((_,i)=>i);
   srt_sells.sort((a,b) => { if (data.sells.price[a] == data.sells.price[b]) { return(data.sells.open[a]-data.sells.open[b]) } else { return(data.sells.price[a]-data.sells.price[b]) } })
   let srt_trades = data.trades.time.map((_,i)=>i);
   srt_trades.sort((a,b) => { if (data.trades.time[a] == data.trades.time[b]) { return(data.trades.price[a]-data.trades.price[b]) } else { return(data.trades.time[a] - data.trades.time[b]) }});

   let buy_price_bounds = [0, data.buys.length];
   let sell_price_bounds = [0, data.sells.length]; let trade_bounds = [0, data.trades.length];
   const f_binary_top = binary_top; const f_binary_bottom = binary_bottom; const f_current_nbbo_i = current_nbbo_i; const f_update_top = update_top;
   const f_update_bottom = update_bottom; const f_binary_nbbo_i = binary_nbbo_i 
   const copy_data = data;
   // current_nbbo_i(10, nbbo, -1)
   //svg_div.addEventListener('click', (event) => { alert('click'); });
   let reset = 0;
   const MyEventFunction = (event) =>  {
      //data.mouse_ob = {'event':null};
      //this.PRINT_N(1, "obwidget -- el was clicked");  return(-1);
     if ((event.target !== my_this.svg_zone) && (!(my_this.svg_zone.contains(event.target)))) {
       return(0);
     }
     const wtfac = calc_scale_wtfac(data); const wtmin = data.tmin * data.origmult;
     const locX = event.offsetX; const locY = event.offsetY;
     if ((locX > data.width)  || (locX < 0)) { clear_out(event); return(0); }
     if ((locY > data.height) || (locY < 0)) { clear_out(event); return(0); }
     const timeX = data.tmin + (data.tmax-data.tmin) * (locX*1.0)/(data.width);
     const orig_timeX = timeX * data.origmult; 
     const priceY = data.pmin + (data.pmax-data.pmin) * (data.height - locY*1.0)/(data.height);
     const wpfac = (data.height) / (data.pmax-data.pmin); const wpmax = data.pmax;
     prop_mo.nText= ("Loc[x=" + locX + ",y=" + locY + "] = (om=" + data.origmult + ") (" + timeX.toFixed(2) + "=" +
          pretty_num.string_del_tm(timeX, data.unit, data.st_time, true)  +
          ",$" + priceY.toFixed(2) + ")");
     prop_mo.tipText = ''; prop_mo.n_wp = 0; prop_mo.n_nbbo=0; prop_mo.n_buys=0; prop_mo.n_sells=0;
     prop_mo.timeX = timeX; prop_mo.locX=locX; prop_mo.priceY=priceY;  prop_mo.locY=locY;
     prop_mo.wpfac = wpfac; prop_mo.wtfac = wtfac;  prop_mo.wtmin= wtmin; prop_mo.wpmax = wpmax;
     if ((event.target === svg_div) || (svg_div.contains(event.target))) {
       let cross_path = svg_div.cross_path; 
       const pttl_0 = prop_mo.tipText.length;
       const nPath = "M 0, " + locY + " H " + data.width + " M " + locX + ", 0 V " + copy_data.height;
       if ((cross_path===null) || (cross_path === undefined) || (!(cross_path))) {
          cross_path = document.createElementNS(svgns,'path');
          cross_path.setAttribute('id','cross_path');  cross_path.setAttribute('stroke','black'); cross_path.setAttribute('stroke-width','2');
          cross_path.setAttribute('fill','black'); cross_path.setAttribute('d', nPath); cross_path.setAttribute('z-level',3);
          cross_path.style.strokeDasharray = null;
          cross_path.style.strokeDasharray = '4, 4';
          svg_svg.appendChild(cross_path); svg_div.cross_path = cross_path;
        } else {
          cross_path.setAttribute('d', nPath);
        }
        let new_nbbo_i = -1;
      

        const time_delta = (price_delta / (data.pmax-data.pmin)) * (data.tmax-data.tmin) * data.origmult;
        data.mouse_ob = {'event':event, 'locX':locX, 'locY':locY, 'timeX':timeX, 'priceY':priceY,
                         'wpfac':wpfac, 'orig_timeX':orig_timeX, 'time_delta':time_delta, 'wpmax':wpmax};
        //debugger;
        //console.log("after get_obs_range: buy_range = " + buy_range.ret.length + " bounds[" + buy_price_bounds[0] + 
        //  data.buys.price[buy_price_bounds[0]] + "," + buy_price_bounds[1]+"]");
        //
        let ptc = {'nbbo':0, 'ps':0, 'buys':0,'sells':0,'trades':0};
        if  ( (!(!(data.nbbo))) && (!(!(data.nbbo.time))) && (data.nbbo.time.length > 0)) {
          ptc.nbbo = place_svg_nbbo(svg_svg, data, orig_timeX);
        }
        let pttl_1 = prop_mo.tipText.length;
        if (pttl_1 < pttl_0) {
          console.log("Error, pttl_1=" + pttl_1 + ", pttl_0=" + pttl_0); debugger;
        }
        if ( (!(!(data.ps.v_b_wp))) && (data.ps.v_b_wp.length > 0)) {
          ptc.ps = place_svg_ps(svg_svg, data, timeX, priceY, price_delta, wpfac, wpmax);
        }
        let pttl_2 = prop_mo.tipText.length
        if (pttl_2 < pttl_1) {
          console.log("Error, pttl_2=" + pttl_2 + ", pttl_1=" + pttl_1); debugger;
        }
        if ( (!(!(data.buys))) && (!(!(data.buys.open))) && (data.buys.open.length > 0)) {
          ptc.buys = place_svg_buys(svg_svg, data, srt_buys, orig_timeX, priceY, price_delta, buy_price_bounds, wpfac, wpmax);
        }
        let pttl_3 = prop_mo.tipText.length;
        if (pttl_3 < pttl_2) {
          console.log("Error, pttl_3=" + pttl_3 + ", pttl_2=" + pttl_2); debugger;
        }
        if ( (!(!(data.sells)))  && (!(!(data.sells.open))) && (data.sells.open.length > 0)) {
          ptc.sells = place_svg_sells(svg_svg, data, srt_sells, orig_timeX, priceY, price_delta, sell_price_bounds, wpfac, wpmax);
        }
        let pttl_4 = prop_mo.tipText.length;
        if (pttl_4 < pttl_3) {
          console.log("Error, pttl_4=" + pttl_4 + ", pttl_3=" + pttl_3); debugger;
        }
        if ( (!(!(data.trades))) && (!(!(data.trades.time))) && (data.trades.time.length > 0)) {
          ptc.trades = place_svg_trades(svg_svg, data, srt_buys, orig_timeX, priceY, price_delta, trade_bounds, wpfac, wpmax, srt_trades);
          //if (trade_range.ret.length > 0) { debugger; }
        }
        let pttl_5 = prop_mo.tipText.length;
        if (DEBUG) {
          if (pttl_5 < pttl_4) {
            console.log("Error, pttl_5=" + pttl_5 + ", pttl_4=" + pttl_4); debugger;
          }
        }
        //console.log("pttl_1 = " + pttl_1 + ", pttl_5 = " + pttl_5);
        //console.log(" -- calling a search for timeX = " + timeX + " for data.nbbo of length " + data.nbbo.length + " from past_nbbo_i=" + past_nbbo_i);
        let text_el = text_svg.getElementById('text_el');
        if ((text_el === null) || (text_el === undefined) || (!(text_el))) {
          text_el = text_svg.appendChild(make_text_el("text_el", Math.floor(.5*text_width), Math.floor(.5 * text_height), prop_mo.nText, 15));
          text_svg.text_el = text_el;  
        }  else {
          text_el = text_svg.getElementById('text_el');
          text_el.textContent = prop_mo.nText; text_el.innerHTML = prop_mo.nText;
        }
        let ttip_div = wDiv.querySelector('#ttip_div'); 
        let ttip_txt = null;
        let textDiv = my_this.textDiv; 
        if ((textDiv !== null) && (textDiv !== undefined)) {
          textDiv.innerHTML = (prop_mo.tipText + "<br> n_wp = " + prop_mo.n_wp + 
            ("<br> pttl: [" + pttl_0 + "," + pttl_1 + "," + pttl_2 + "," + pttl_3 + "," + pttl_4 + "," + pttl_5 + "]") + 
            ("<br> ptc = [nbbo=" + ptc.nbbo + ",ps=" + ptc.ps + ",buys=" + ptc.buys + ",sells" + ptc.sells + ",trades=" + ptc.trades + "]"));
          //let textDivel = textDiv.getElementById('textDivel');
          ///if ((textDivel === null) || (textDivel === undefined) || (!(textDivel))) {
          //  text_el = textDiv.appendChild(make_text_el("textDivel", 0, .5 * my_this.data.text_win_height, prop_mo.tipText, 15));
          //  textDiv.textDivel = textDivel;  
          //}  else {
          //  textDivel = textDiv.getElementById('textDivel');
          //  text_el.textContent = prop_mo.tipText; text_el.innerHTML = prop_mo.tipText;
          // }
        } 
        if ((!(ttip_div === null)) && (!(ttip_div===undefined)) && (!(!(ttip_div))) && (!(prop_mo.tipText === null)) && 
          (!(prop_mo.tipText === undefined)) && (!(prop_mo.tipText==''))) {
          const tiptextsize = 18;
          let nbr = 2 + 1.1 * prop_mo.tipText.match(/<br>/g).length; const nFontSize = 1.2 *tiptextsize;
          let ttip_goal_size = [Math.floor(.5 * data.width), Math.floor(nbr * nFontSize)];
          const xTextLoc =  Math.floor(.05 * ttip_goal_size[0]);
          const tts = prop_mo.tipText.split("<br>").map((el)=>{ return('<tspan x="' + xTextLoc + '" dy="1.2em">' + el + '</tspan>') });
          ttip_div.style.visibility = 'visible';  ttip_div.style.display = 'block'; // or block flex, inline, etc):w
          let ttip_svg = ttip_div.querySelector('#ttip_svg');
          if ((ttip_svg ===null) || (ttip_svg===undefined) || (!(ttip_svg))) {
             //console.log("did not locate ttip_svg, why?"); debugger;
             ttip_svg = ttip_div.appendChild(make_svg_el("ttip_svg", 0, 0, ttip_goal_size[0], ttip_goal_size[1])); ttip_svg.setAttribute('z-level',1000);
          }
          ttip_div.setAttribute('height',ttip_goal_size[1] + "px"); ttip_div.setAttribute('width',ttip_goal_size[0] + 'px');
          ttip_div.style.height = ttip_goal_size[1] + 'px';  ttip_div.style.width = ttip_goal_size[0] + 'px';
          ttip_svg.setAttribute('height',ttip_goal_size[1] + 'px'); ttip_svg.setAttribute('width', ttip_goal_size[0] + 'px');
          ttip_svg.style.height = ttip_goal_size[1] + 'px';  ttip_svg.style.width = ttip_goal_size[0] + 'px';
          ttip_div.setAttribute('left', (margins.left+locX+5) + "px"); ttip_div.setAttribute('bottom',(margins.top + locY-5) + "px");
          ttip_div.style.left =  (margins.left+locX+5) + "px"; ttip_div.style.top = (margins.top + locY-50) + "px";
          ttip_txt = ttip_svg.querySelector('#ttip_txt');
          if ((ttip_txt === null) || (ttip_txt === undefined) || (!(ttip_txt))) {
            ttip_txt = ttip_svg.appendChild(make_text_el("ttip_txt", Math.floor(.01*ttip_goal_size[0]), Math.floor(.1 * nFontSize), prop_mo.tipText, tiptextsize));
            //console.log("cannot locate ttip_svg?");  debugger;
            ttip_txt.setAttribute('text-anchor', 'start');
          }
          ttip_txt.innerHTML = tts.join('\n')+'';
          //console.log("tipText(" + nbr + "):" + prop_mo.tipText);
          //console.log(" --- Note tts = " + tts.join('\n'));
          //if (prop_mo.n_wp > 0) {
          //  console.log("Do you see wp data?"); 
          //  debugger;
          //}
          //if ((tipText.length > 0) && (locY > 100)) { console.log("look at text?"); debugger;}
        }
        if (DEBUG) {
          if (max_ps_fails >= 200) {
            console.log("ToolTip runner: max_ps_fails = " + max_ps_fails + ".");
            if ((textDiv === null) | (textDiv === undefined)) {
              console.log("note the query Selector failed to get textDiv.");
            } else {
              console.log("Note textDiv.innerHTML is " + textDiv.innerHTML + ".");
            }
            debugger;  max_ps_fails = 0;
          }
        }
      }
    };
    my_this.svg_zone.addEventListener('mouseover', MyEventFunction);
    my_this.svg_zone.addEventListener('mousemove', MyEventFunction);
    const clear_out = function(event) {
      //this.PRINT_N(1, "obwidget -- el was clicked");  return(-1);
      let locX = event.offsetX; let locY = event.offsetY;
      let timeX = data.tmin + (data.tmax-data.tmin) * (locX*1.0)/(data.width);
      let priceY = data.pmin + (data.pmax-data.pmin) * (locY*1.0)/(data.height);
      past_nbbo_i = -1;
      prop_mo.nText = ''; prop_mo.tipText=''; prop_mo.locX = locX; prop_mo.timeX = timeX; prop_mo.priceY=priceY; prop_mo.locY=locY;
      //prop_mo = {'nText': "", 'tipText':'', 'locX':locX, 'timeX':timeX, 'priceY':priceY, 'locY':locY};
      let text_el = text_svg.getElementById('text_el');
      if ((text_el === null) || (text_el === undefined) || (!(text_el))) {
         text_el = text_svg.appendChild(make_text_el("text_el", Math.floor(.5*text_width), Math.floor(.5 * text_height), prop_mo.nText, 15));
         text_svg.text_el = text_el;
      } else {
         text_el = text_svg.getElementById('text_el');
         text_el.textContent = prop_mo.nText; text_el.innerHTML = prop_mo.nText;
      }
      wipe_ob_svgs(svg_div, svg_svg,wDiv);
    }
    my_this.svg_zone.addEventListener('mouseout', clear_out);
}

const write_ttip = function(data, ttip_div, x, y, tipText) {
  const tiptextsize = 18;
  if (ttip_div === null) {
    console.log("write_ttip: error, ttip_div is null.");
  }
  let nbr = 2 + 1.1 * (tipText.length <= 0 ? 0 : tipText.match(/<br>/g).length); const nFontSize = 1.2 *tiptextsize;
  if (tipText.length <= 0) {
    ttip_div.style.visibility='invisible'; return(-1);
  }
  let ttip_goal_size = [Math.floor(.5 * data.width), Math.floor(nbr * nFontSize)];
  const xTextLoc =  Math.floor(.05 * ttip_goal_size[0]);
  const tts = tipText.split("<br>").map((el)=>{ return('<tspan x="' + xTextLoc + '" dy="1.2em">' + el + '</tspan>') });
  ttip_div.style.visibility = 'visible';  ttip_div.style.display = 'block'; // or block flex, inline, etc):w
  let ttip_svg = ttip_div.querySelector('#ttip_svg');
  if ((ttip_svg ===null) || (ttip_svg===undefined) || (!(ttip_svg))) {
    //console.log("did not locate ttip_svg, why?"); debugger;
    ttip_svg = ttip_div.appendChild(make_svg_el("ttip_svg", 0, 0, ttip_goal_size[0], ttip_goal_size[1])); ttip_svg.setAttribute('z-level',1000);
  }
  ttip_div.setAttribute('height',ttip_goal_size[1] + "px"); ttip_div.setAttribute('width',ttip_goal_size[0] + 'px');
  ttip_div.style.height = ttip_goal_size[1] + 'px';  ttip_div.style.width = ttip_goal_size[0] + 'px';
  ttip_svg.setAttribute('height',ttip_goal_size[1] + 'px'); ttip_svg.setAttribute('width', ttip_goal_size[0] + 'px');
  ttip_svg.style.height = ttip_goal_size[1] + 'px';  ttip_svg.style.width = ttip_goal_size[0] + 'px';
  ttip_div.setAttribute('left', (x + "px")); ttip_div.setAttribute('bottom',(y-5) + "px");
  ttip_div.style.left =  (x+5) + "px"; ttip_div.style.top = (y-50) + "px";
  let ttip_txt = ttip_svg.querySelector('#ttip_txt');
  if ((ttip_txt === null) || (ttip_txt === undefined) || (!(ttip_txt))) {
    ttip_txt = ttip_svg.appendChild(make_text_el("ttip_txt", Math.floor(.01*ttip_goal_size[0]), Math.floor(.1 * nFontSize), tipText, tiptextsize));
    //console.log("cannot locate ttip_svg?");  debugger;
    ttip_txt.setAttribute('text-anchor', 'start');
  }
  ttip_txt.innerHTML = tts.join('\n')+'';
  //console.log("tipText(" + nbr + "):" + prop_mo.tipText);

}
const wipe_ob_svgs = function(svg_div, svg_svg, wDiv) { 

        let bsline = svg_svg.getElementById('line_buys_selected');
        if ((!(bsline===null)) && (!(bsline===undefined)) && (!(!(bsline)))) { bsline.setAttribute('d',''); }
        bsline = svg_svg.getElementById('line_sells_selected');
        if ((!(bsline===null)) && (!(bsline===undefined)) && (!(!(bsline)))) { bsline.setAttribute('d',''); }

        let cbb = svg_svg.getElementById('circle_nbb_price_min');
        if ((!(cbb===null)) && (!(cbb===undefined)) && (!(!(cbb)))) { cbb.setAttribute('r','0'); }
        let cbo = svg_svg.getElementById('circle_nbo_price_min');
        if ((!(cbo===null)) && (!(cbo===undefined)) && (!(!(cbo)))) { cbo.setAttribute('r','0'); }
        bsline = svg_svg.getElementById('line_nbb_price_min');
        if ((!(bsline===null)) && (!(bsline===undefined)) && (!(!(bsline)))) { bsline.setAttribute('d',''); }
        bsline = svg_svg.getElementById('line_nbo_price_min');
        if ((!(bsline===null)) && (!(bsline===undefined)) && (!(!(bsline)))) { bsline.setAttribute('d',''); }
        const cwp = svg_svg.getElementById('circle_wp_price_min');
        if ((!(cwp===null)) && (!(cwp=== undefined)) && (!(!(cwp)))) {
          cwp.setAttribute('r','0');
        }
        const lwp = svg_svg.getElementById('line_wp_price_min');
        if ((!(lwp=== null)) && (!(lwp===undefined)) && (!(!(lwp)))) { lwp.setAttribute('d',''); }
        let striangles = svg_svg.getElementById('sell_trade_triangles_selected');
        if ((striangles!==null) && (striangles!==undefined) && (!(!(striangles)))) {  striangles.setAttribute('d',''); }

        let btriangles = svg_svg.getElementById('buy_trade_triangles_selected');
        if ((btriangles!==null) && (btriangles!==undefined) && (!(!(btriangles)))) {  btriangles.setAttribute('d',''); }
        //nPath = "M 0, " + locY + " H " + data.width + " M " + locX + ", 0 V " + data.height;
        const nPath = "";

        let cross_path = svg_div.cross_path;
        if ((cross_path===null) || (cross_path === undefined) || (!(cross_path))) {
        }  else {
          svg_svg.getElementById('cross_path'); 
          cross_path.setAttribute('d', nPath);
        }
        let ttip_div = wDiv.querySelector('#ttip_div');
        if ((!(ttip_div === null)) && (!(ttip_div === undefined)) && (!(!(ttip_div)))) { ttip_div.style.visibility = 'hidden'; ttip_div.style.display='none'}
}
exports = {"add_svg_mouse_over":add_svg_mouse_over, "make_text_el":make_text_el, "binary_top":binary_top, 
   "binary_bottom":binary_bottom, "current_nbbo_i":current_nbbo_i, "binary_nbbo_i": binary_nbbo_i, 'prop_mo':prop_mo, 'place_svg_ps':place_svg_ps, 
   'generate_lln':generate_lln, 'make_hline':make_hline, 'make_svg_el':make_svg_el, 'write_ttip':write_ttip}
module.exports = exports;
