
const calculate_bars_oad = function (oad, data, timeXn)  {
  const b_u_p = oad.b.u_p; const s_u_p = oad.s.u_p;
  const u_b_p = b_u_p.map((x,i)=>i).filter((i)=>(b_u_p[i] >= data.pmin) && (b_u_p[i] <= data.pmax));
  const u_s_p = s_u_p.map((x,i)=>i).filter((i)=>(s_u_p[i] >= data.pmin) && (s_u_p[i] <= data.pmax));
  
  const inv_u_b_p = Array(b_u_p.length).fill(-1); let on_i_b = 0;
  for (let i_b = 0; i_b < inv_u_b_p.length; i_b++) {
     while (u_b_p[on_i_b] < i_b) {on_i_b++; }
     if (u_b_p[on_i_b] == i_b) { inv_u_b_p[i_b] = on_i_b; }
  }
  const n_k_b = u_b_p.length; const n_k_s = u_s_p.length;

  const inv_u_s_p = Array(s_u_p.length).fill(-1); let on_i_s = 0;
  for (let i_s = 0; i_s < inv_u_s_p.length; i_s++) {
     while (u_s_p[on_i_s] < i_s) {on_i_s++; }
     if (u_s_p[on_i_s] == i_s) { inv_u_s_p[i_s] = on_i_s; }
  }
  
  const t_b = Array(u_b_p.length).fill(-1.0); 
  const t_s = Array(u_s_p.length).fill(-1.0);
 
  const st_i_b = find_ti(oad.b.vt, timeXn);
  let n_fill_b = 0;
  for (let i_b = st_i_b; i_b >= 0; i_b--) {
    const ploc = inv_u_b_p[oad.b.vpi[i_b]];
    if (n_fill_b >= n_k_b) { break; }
    if (t_b[ploc] < 0) {
      n_fill_b++;
      t_b[ploc] = oad.b.vq[i_b];
    } 
  }
  if (n_fill_b < n_k_b) {
  for (let i_b = 0; i_b < n_k_b; i_b++) {
    t_b[i_b] = t_b[i_b] < 0 ? 0 : t_b[i_b];
  }
  }

  const st_i_s = find_ti(oad.s.vt, timeXn);
  let n_fill_s = 0;
  for (let i_s = st_i_s; i_s >= 0; i_s--) {
    const ploc = inv_u_s_p[oad.s.vpi[i_is]];
    if (n_fill_s >= n_k_s) { break; }
    if (t_s[ploc] < 0) {
      n_fill_s++;
      t_s[ploc] = oad.s.vq[i_s];
    } 
  }
  if (n_fill_s < n_k_s) { 
  for (let i_s = 0; i_s < n_k_s; i_s++) {
    t_s[i_s] = t_s[i_s] < 0 ? 0 : t_s[i_s];
  }
  }
  return({'u_b_p':u_b_p, 't_b':t_b, 'u_s_p':u_s_p, 't_s':t_s})  
}
const demo_sqrt_squish = function(x,mx,wd) {
  return(Math.floor(Math.sqrt(x/mx) * wd));
}
const calculate_bars_data= function(data, timeX, squish_func) {
  const dr = get_relevant_data(data, timeX);

}
const get_one_time_qmax = function(dr) {
  let onq = 0; let onqs = 'b'; let onqmx = 0; let onqsm = 0; let onqimx = 0;
  // onq = 0; onqs = 'b'; onqmx = 0;  onqsm = 0; onqimx = 0;
  for (let ii = 0; ii < dr.b.qty.length;ii++) {
    if (dr.b.vpi[ii] !== onq) {
      if (onqsm > onqmx) { onqs = 'b';  onqmx = onqsm; onqimx = onq; }
      onqsm = 0; onq = dr.b.vpi[ii];
    }
    onqsm += dr.b.qty[ii];
  }
  if (onqsm > onqmx) { onqs = 'b'; onqmx = onqsm;  onqimx = onq; }
  
  for (let ii = 0; ii < dr.s.qty.length;ii++) {
    if (dr.s.vpi[ii] !== onq) {
      if (onqsm > onqmx) { onqs = 's';  onqmx = onqsm; onqimx = onq; }
      onqsm = 0; onq = dr.s.vpi[ii];
    }
    onqsm += dr.s.qty[ii];
  }
  if (onqsm > onqmx) { onqs = 's'; onqmx = onqsm;  onqimx = onq; }
  
  const onq_mxp = (onqs == 'b') ? dr.b.u_p[onqimx] : dr.s.u_p[onqimx];
  return({'qmax': onqmx, 'qmax_p': onq_mxp,  'qmax_ps': onqs, 'qmax_pi': onqimx});
}
const search_p = function(u_p,bs01,fp) {
  if (u_p.length <= 0) { return(-1); }
  if (u_p.length == 1) { return(0); }
  
  let a_pi = 0; let b_pi = u_p.length-1;
  const gq = ((bs01 == 0) ? ((x,y) => (x>y)) : ((x,y)=>(x < y)));
  const lq = ((bs01 == 0) ? ((x,y) => (x<y)) : ((x,y)=>(x > y)));
  if (lq(u_p[b_pi],fp) || (u_p[b_pi] == fp)) { return(b_pi); }
  if (gq(u_p[a_pi],fp) || (u_p[a_pi] == fp)) { return(a_pi); }
  for (let ii = 0; ii < 1000; ii++) {
    let m_pi = Math.floor(.5 * (a_pi + b_pi));
    if (m_pi == a_pi) { m_pi++; }
    if (gq(u_p[m_pi],fp)) { b_pi = m_pi;
    } else if (lq(u_p[m_pi],fp)) { a_pi = m_pi;
    } else if (u_p[m_pi] == fp) { a_pi = m_pi; break; }
    if (b_pi - a_pi <= 1) {
      if (Math.abs(fp-u_p[b_pi]) < Math.abs(fp-u_p[a_pi])) { a_pi = b_pi; } 
      break;
    }
  } 
  return(a_pi);
}
const count_only_p = function(drsd, pmin, pmax) {
  let cntp = 0; const nn = drsd.cs.vp.length;
  for (let ii = 0; ii < nn; ii++) {
    if ((drsd.cs.vp[ii] >= pmin) && (drsd.cs.vp[ii] <= pmax)) {
      cntp++;
    }
  }
  return(cntp);
}
const count_both_np  = function(dr, pmin, pmax) {
  if (dr.s.cs.vp.length <= 0) {
    return(count_only_p(dr.b, pmin, pmax));
  }
  if (dr.b.cs.vp.length <= 0) {
    return(count_only_p(dr.s, pmin, pmax));
  }  
  // i_s = dr.s.cs.vp.length-1; i_b = 0; n_n = dr.s.cs.vp.length + dr.b.cs.vp.length;  nb = dr.b.cs.vp.length;
  // cnt = 0; onp = -1;
  let i_s=dr.s.cs.vp.length-1;let i_b =0; 
  const nb = dr.b.cs.vp.length;
  const n_n = dr.s.cs.vp.length + dr.b.cs.vp.length;
  let onp = -1;  let cnt = 0;
  for (let i_all =0; i_all < n_n; i_all++) {
    const bs01 = ((i_b >= nb) ? 1  :
                  (i_s < 0  ) ? 0  :
                  (dr.s.cs.vp[i_s] < dr.b.cs.vp[i_b]) ? 1 : 0);
    const tryp = (bs01 == 0) ? dr.b.cs.vp[i_b] : dr.s.cs.vp[i_s]; 
    if (tryp == onp) {

    } else {
      onp = tryp;
      if ((onp >= pmin) && (onp <= pmax)) {
        cnt++;
      }
    }
    if (bs01==0) { i_b++; } else { i_s--; }
  }
  return(cnt); 
}
const get_wj = function(wx, locX) {
  for (let ii = 0; ii < wx.length; ii++) {
    if (wx[ii] >= locX) { return(ii); }
  }
  return(-1);
}
// VO = calc_side(dr.s, 1000, 300, dr.qmax, data.pmin, data.pmax, demo_sqrt_squish);
const seek_near = function(dr,locX, locY, pmin, pmax, ht) {
  const find_p =  pmax - (pmax-pmin) * locY / ht;
  const b_near_pi = search_p(dr.b.cs.vp,0,find_p);
  const s_near_pi = search_p(dr.s.cs.vp,1,find_p);
  const b_near_qj = (b_near_pi < 0) ? -1 : get_wj(dr.b.cs.vqm[b_near_pi].wx, locX);
  const s_near_qj = (s_near_pi < 0) ? -1 : get_wj(dr.s.cs.vqm[s_near_pi].wx, locX);
  const dpb = (b_near_pi < 0) ? -100 : Math.abs(dr.b.cs.vp[b_near_pi] - find_p);
  const dps = (s_near_pi < 0) ? -100 : Math.abs(dr.s.cs.vp[s_near_pi] - find_p);


  const b_npi = ( (s_near_pi < 0) ? b_near_pi : 
                  ((b_near_qj < 0) || (b_near_pi < 0) || (dpb-dps > .01 * (pmax-pmin))) ? - 1 : b_near_pi);
  const s_npi = ( (b_near_pi < 0) ? s_near_pi : 
                  ((s_near_qj < 0) || (s_near_pi < 0) || (dps-dpb > .01 * (pmax-pmin))) ? - 1 : s_near_pi);
  return({'b_near_pi':b_npi, 'b_near_qj': b_near_qj, 's_near_pi':s_npi, 's_near_qj':s_near_qj})
}
// cs = calc_side(dr.s, dr.ht, dr.wd, dr.qmax, dr.pmin, dr.pmax, my_this.data.squish_f)
const calc_side = function(drsd, ht, wd, qmax, pmin, pmax, squish_f) {
  if (drsd.vpi.length <= 0) {
    // Null work:
    return({'npi':0, 'vpi':[], 'vp':[], 'vh':[], 'vqm':[]});
  }
  const n_allpi = (drsd.ipmax - drsd.ipmin + 1);
  let cpi = 1;  const nv = drsd.open.length;  let vpi = []; let onpi = -1;
  for (let iti = 0; iti < nv; iti++) {
    if (drsd.vpi[iti] > onpi) {
      onpi = drsd.vpi[iti];
      vpi.push(onpi);
    } 
  }
  const npi = vpi.length;
  const vp = Array(vpi.length).fill(0);
  for (let ii = 0; ii < npi; ii++) { vp[ii] = drsd.u_p[vpi[ii]]; } 
  const vqm = Array(npi).fill(null);
  const inv_qw = wd;
  let vQ = [];  let vQW = []; let v_idx=[]; onpi = drsd.vpi[0]; let sm = 0; let onprinti = 0;
  if ((drsd.idx === null) || (drsd.idx === undefined) || (!(drsd.idx))) {
    console.log("bars: Error, drsd.idx is not defined?"); debugger;
  }
  for (let iti = 0; iti < nv; iti++) {
    if (onpi !== drsd.vpi[iti]) {
      vqm[onprinti] = {'q':[...vQ],'wx':[...vQW],'idx':[...v_idx] }; onprinti++;
      vQ = [];  vQW = []; v_idx=[]; sm = 0; onpi = drsd.vpi[iti];
    }
    sm += drsd.qty[iti];  vQ.push(sm);  vQW.push( squish_f(sm, qmax, wd) );  v_idx.push( drsd.idx[iti]);
  }
  vqm[onprinti] = {'q':[...vqm], 'wx':[...vQW], 'idx':[...v_idx] };  onprinti++;
  return({'npi':npi, 'vpi': vpi, 'vp':vp, 'vqm': vqm, 'n_allpi': n_allpi});
}
const get_multi_time_qmax = function(dr) {
  const qmax_b = drsd_time_max(dr.b);
  const qmax_s = drsd_time_max(dr.s);
  const b0s1 = qmax_b.qmax >= qmax_s.qmax ? 0 : 1;
  return(b0s1 == 0 ? qmax_b : qmax_s);
}
const drsd_time_qmax = function (drsd) {
  if ((drsd == null) || (drsd.qty.length==0)) {
    return({'qmax':0, 'qmax_p':null, 'qmax_pi':-1, 'qmax_ps':drsd.sd});
  }
  const n = drsd.vpi.length; const n2 = n*2;
  let ct = Array(n*2);  for (let ii = 0; ii < n2; ii++) { ct[ii] = ii; }
  ct = ct.sort((ix,iy) => ((drsd.vpi[ix % n] == drsd.vpi[iy % n] ) ? 
                           Number( ( (ix < n) ? drsd.open[ix] : drsd.close[ix-n]) - 
                                     ( (iy < n) ? drsd.open[iy] : drsd.close[iy-n]) ) :
                           (drsd.vpi[ix %n ] - drsd.vpi[iy % n ])));
  const qt = ct.map((ix)=>(ix >= n) ? -drsd.qty[ix-n] : drsd.qty[ix]); 
  const tm = ct.map((ix)=>(ix >= n) ? drsd.close[ix-n] : drsd.open[ix]); 
  const vpi = ct.map((ix)=> drsd.vpi[ix%n]);
  let csum = qt[0]; let cmax = qt[0]; let t_max = 0; let onpi = vpi[0]; let mx_pi = onpi; let ntm = tm[0];
  // csum = 0; cmax = 0; t_max = 0; mx_pi = -1; onpi = vpi[0];
  for (let iti = 1; iti < n2; iti++) {
    if (onpi != drsd.vpi[iti]) {
      if (cmax > t_max) { 
        mx_pi = onpi;  t_max = cmax; 
      }
      csum = 0; cmax = 0; onpi = vpi[iti];
    }
    csum += qt[iti];
    if (csum > cmax) {
      if ((iti == n2-1) || (vpi[iti+1] != vpi[iti]) || (tm[iti+1] != tm[iti])) {
        cmax = csum;
      }
    }
  } 
  if (cmax > t_max) {
    mx_pi = onpi; t_max = cmax;
  }
  return({'qmax':t_max, 'qmax_p': drsd.u_p[onpi], 'qmax_pi':onpi, 'qmax_ps': drsd.sd});
}
const get_relevant_data = function(data, timeX0, timeX1, targ_pmin, targ_pmax, pretty_num) {
  const nb = data.buys.open.length;
  const db = Array(nb);
  for (let ii = 0; ii < nb; ii++) { db[ii] = ii; }
  const b0w1 = (timeX0 >= timeX1) ? 0 : 1;
  const timeX = (b0w1 == 0) ? timeX0 : null;
  const cmp =  ((timeX0 >= timeX1) ? ( (open,close,timeX0,timeX1) => ((open <= timeX0) && (close > timeX0)) ) :
                                     ( (open,close,timeX0,timeX1) => ((close >= timeX0) && (open < timeX1)) ) );
  const fdb = db.filter(
               (ii)=>( cmp(data.buys.open[ii], data.buys.close[ii], timeX0, timeX1) &&  
                       (data.buys.price[ii] >= targ_pmin) && (data.buys.price[ii] <= targ_pmax)
                     )).sort(
                (ix,iy)=>(data.buys.vpi[ix] == data.buys.vpi[iy] ? 
                         Number(data.buys.open[ix]-data.buys.open[iy]) :
                         data.buys.vpi[ix] - data.buys.vpi[iy] )         );
  const nfb = fdb.length; const bpmin = data.buys.vpi[fdb[0]];  const bpmax = data.buys.vpi[fdb[fdb.length-1]];
  const rtb = {'sd':'b','idx': fdb, 'open':Array(nfb), 'close':Array(nfb), 'qty':Array(nfb), 'vpi':Array(nfb), 'ivs':Array(nfb), 'u_p': data.buys.u_p, 'ipmin':bpmin,'ipmax':bpmax};
  for (let ii = 0; ii < nfb; ii++) { rtb.open[ii] = data.buys.open[fdb[ii]] }
  for (let ii = 0; ii < nfb; ii++) { rtb.close[ii] = data.buys.close[fdb[ii]] }
  for (let ii = 0; ii < nfb; ii++) { rtb.qty[ii] = data.buys.qty[fdb[ii]] }
  for (let ii = 0; ii < nfb; ii++) { rtb.vpi[ii] = data.buys.vpi[fdb[ii]] }
  for (let ii = 0; ii < nfb; ii++) { rtb.ivs[ii] = data.buys.ivs[fdb[ii]] }

  const ns = data.sells.open.length;
  const ds = Array(ns);
  for (let ii = 0; ii < ns; ii++) { ds[ii] = ii; }
  const fds = ds.filter(
               (ii)=>( cmp(data.sells.open[ii], data.sells.close[ii], timeX0, timeX1) && 
                       (data.sells.price[ii] >= targ_pmin) && (data.sells.price[ii] <= targ_pmax)
                     )).sort(
                (ix,iy)=>(data.sells.vpi[ix] == data.sells.vpi[iy] ? 
                         Number(data.sells.open[ix]-data.sells.open[iy]) :
                         data.sells.vpi[ix] - data.sells.vpi[iy] )         );
  const nfs = fds.length;
  const spmin = data.sells.vpi[fds[0]];  const spmax = data.sells.vpi[fds[fds.length-1]];
  const rts = {'sd':'s', 'idx': fds, 'open':Array(nfs), 'close':Array(nfs), 'qty':Array(nfs), 'vpi':Array(nfs), 'ivs':Array(nfs), 'u_p': data.sells.u_p,'ipmin':spmin,'ipmax':spmax};
  for (let ii = 0; ii < nfs; ii++) { rts.open[ii] = data.sells.open[fds[ii]] }
  for (let ii = 0; ii < nfs; ii++) { rts.close[ii] = data.sells.close[fds[ii]] }
  for (let ii = 0; ii < nfs; ii++) { rts.qty[ii] = data.sells.qty[fds[ii]] }
  for (let ii = 0; ii < nfs; ii++) { rts.vpi[ii] = data.sells.vpi[fds[ii]] }
  for (let ii = 0; ii < nfs; ii++) { rts.ivs[ii] = data.sells.ivs[fds[ii]] }
 
  let idx_wpt = -1;  const multi = pretty_num.bigmult(data.unit);
  const timeX_bi = (b0w1 == 0) ? BigInt(Math.round(multi * timeX)) + pretty_num.process_string_bi(data.st_time, data.unit) : -1;
  if ((data.ps.wpt !== null) &&  (data.ps.wpt !== undefined) && (!(!(data.ps.wpt)))) {
    const n_t = data.ps.wpt.time.length;
    for (idx_wpt = 0; idx_wpt < n_t-1; idx_wpt++) {
      if (data.ps.wpt.time[idx_wpt+1] > timeX_bi) { break; }
    }
  }
  let dr = {'b':rtb, 'idx':nfs, 's':rts, 'timeX':timeX, 'pmin':data.pmin, 'pmax':data.pmax, 'wd': data.bar_width, 
            'ht': data.height, 'unit':data.unit, 'st_time': data.st_time, 'timeX_bi': timeX_bi, 'idx_wpt':idx_wpt, 'b0w1':b0w1};
  const qmt = (b0w1 == 0) ? get_one_time_qmax(dr) : get_multi_time_max(dr);
  dr['qmax'] = qmt.qmax;  dr['qmax_p'] = qmt.qmax_p;  dr['qmax_ps'] = qmt.qmax_ps;  dr['qmax_pi'] = qmt.qmax_pi;
  dr['pmin'] = data.pmin;  dr['pmax'] = data.pmax;
  if ((data.squish_f === null) || (data.squish_f === undefined) || (typeof(data.squish_f) != 'function')) {
    data.squish_f = demo_sqrt_squish;
  }
  dr.b['cs'] = (b0w1 == 0) ? calc_side(dr.b, data.height, data.bar_width, dr['qmax'], data.pmin, data.pmax, data.squish_f) : null;
  dr.s['cs'] = (b0w1 == 0) ? calc_side(dr.s, data.height, data.bar_width, dr['qmax'], data.pmin, data.pmax, data.squish_f) : null;
  if (b0w1 == 1) {
     dr['timeX0_bi'] = BigInt(Math.round(multi * timeX0)) + pretty_num.process_string_bi(data.st_time, data.unit);
     dr['timeX1_bi'] = BigInt(Math.round(multi * timeX1)) + pretty_num.process_string_bi(data.st_time, data.unit);
  }
  //dr.ps = (b0w1 == 1) ? limit_ps(data.ps, timeX0_bi, timeX1_bi) : null;
  return(dr);
}
// We are looking for minimum time
const find_ti = function(ts, timeXn) {
  if (ts.length <= 0) { return(-1); }
  if (ts.length <= 1) { if (ts[0] <= timeXn) { return(0); } else { return(-1); } }
  let i_m = 0; let i_M = ts.length-1;
  if (ts[i_M] < timeXn) { return(i_M); }
  for (let jl = 0; jl < 10000; jl ++) {
    let i_a = ((Math.floor(.5*(i_m+i_M)) > i_m) ? Math.floor(.5 * (i_m+i_M)) : i_m + 1);
    if (ts[i_a] > timeXn) {
      i_M = i_a;
    } else if (ts[i_a] < timeXn) {
      i_m = i_a;
    } else {
      while ((i_a > 0) && (ts[i_a-1] == timeXn)) { i_a--; }
      return(i_a);
    }
    if (i_M-i_m <= 1) { return(i_m); }
  }
  return(i_m);
}

const p_exports = {'find_ti':find_ti, 'get_relevant_data':get_relevant_data, 'calculate_bars_oad':calculate_bars_oad, 
  'get_one_time_qmax':get_one_time_qmax, 'search_p':search_p, 'seek_near':seek_near, 'get_wj':get_wj, 'count_both_np':count_both_np, 'count_only_p':count_only_p, 
  'get_multi_time_qmax': get_multi_time_qmax, 'drsd_time_qmax': drsd_time_qmax}
module.exports = p_exports;
