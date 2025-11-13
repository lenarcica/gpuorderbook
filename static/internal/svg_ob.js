///////////////////////////////////////////////////////////////////
// svg related code to E6 pipeline
//
//

const svgns = "http://www.w3.org/2000/svg";
const pretty_num = require('../internal_lib/pretty_num');
require('./tooltip.css');

const make_svg_el=function(nm, locx,locy,widthx,heighty) {
      let nvd = document.createElementNS(svgns, 'text'); nvd.setAttribute('id',nm);
      nvd.setAttribute('x', locx); 
      //nvd.setAttribute('x',Math.floor(locx - (txt.length * txtsize)*.25)); 
      nvd.setAttribute('y',locy); nvd.setAttribute('position','absolute'); nvd.style.position = 'absolute';
      nvd.setAttribute('width', widthx + "px"); nvd.style.width = widthx + "px";
      nvd.setAttribute('height', heightx + "px"); nvd.style.height = heighty + "px";
      return(nvd);
}    
const make_text_el=function(nm, locx,locy,txt, txtsize) {
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
const current_nbbo_i= function(timeX, nbbo, pasti){
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
const binary_nbbo_i = function(timeX, nbbo) {
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
  if ((old_i === undefined) || (old_i < 0)) {
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
    if (i1-i0==1) { return(i1); }
  }
  return(i0);
}

const update_top = function(obs_tgt, srts, tgt_target, old_i) {
  if (obs_tgt.length <= 0) { return(-1); }
  if (obs_tgt.length <=1) { if (obs_tgt[0] <= tgt_target) { return(1); } else {return(-1); } }
  if ((old_i === undefined) || (old_i < 0)) {
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
  while(i0<i1) {
    let ip = Math.floor((i0+i1)/2);
    if (ip == i0) { ip = ip+1; }
    let p_ip = obs_tgt[srts[ip]];
    if (p_ip > tgt_target) { i1 = ip
    } else { i0 = ip }
    if (i1-i0==1) { return(i1); }
  }
  return(i0);
}
// obs = data.buys; srts = srt_buys; on_time = 10; on_price = 22; price_delta=3; pastBounds = [-1,srt_buys.length];
const get_obs_range = function(obs, srts, on_time, on_price, price_delta, pastBounds) {
  if ((obs === null) || (obs === undefined)) { return({new_range:[-1,-1],ret:[]}); }
  let new_range = [update_bottom(obs.price,srts, on_price-price_delta, pastBounds[0]),
                   update_top(obs.price,srts,on_price+price_delta,pastBounds[1])];
  if (new_range[1] === undefined) {
    console("get_obs_range: we had bounds [" + pastBounds[0] + "," + pastBounds[1] + "] but new_range[1] is undefined?");
    debugger;
    new_range[1] = obs.open.length; 
  }
  const ret = [];
  let up_range = new_range[1]; if (up_range == new_range[0]) { up_range = new_range[0] + 1; }
  if (up_range > obs.open.length) { up_range = obs.open.length; }
  for (let ii = new_range[0]; ii < up_range; ii++) {
    if ((obs.open[srts[ii]] <= on_time) && (obs.close[srts[ii]] >= on_time)) { ret.push(srts[ii]); }
  }
  return({new_range:new_range, ret:ret});
}

const get_obs_range_trades = function(obs, srts, orig_timeX, priceY, price_delta, time_delta,past_bounds) {
  if ((obs === null) || (obs === undefined)) { return({new_range:[-1,-1],ret:[]}); }
  let new_range = [update_bottom(obs.time,srts, orig_timeX-time_delta, past_bounds[0]),
                   update_top(obs.time,srts,orig_timeX+time_delta,past_bounds[1])];
  if (new_range[1] === undefined) {
    console("get_obs_range: we had bounds [" + past_bounds[0] + "," + past_bounds[1] + "] but new_range[1] is undefined?");
    debugger;
    new_range[1] = obs.price.length; 
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
 const wtfac = (data.width/data.origmult) / (data.tmax - data.tmin);
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
 const wtfac = (data.width/data.origmult) / (data.tmax - data.tmin);
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
const add_svg_mouse_over = function(svg_div,svg_svg, text_svg, data, text_width, text_height, price_delta, wDiv, margins) {
   //console.log("add_svg_mouse_over -- Conducting");
   let past_nbbo_i = -1;
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
   let buy_select = []; let sell_select = []; let trade_select =[];
   const f_binary_top = binary_top; const f_binary_bottom = binary_bottom; const f_current_nbbo_i = current_nbbo_i; const f_update_top = update_top;
   const f_update_bottom = update_bottom; const f_binary_nbbo_i = binary_nbbo_i 
   const copy_data = data;
   // current_nbbo_i(10, nbbo, -1)
   //svg_div.addEventListener('click', (event) => { alert('click'); });
   let reset = 0;
   const MyEventFunction = (event) =>  {
      //this.PRINT_N(1, "obwidget -- el was clicked");  return(-1);
      if ((event.target === svg_div) || (svg_div.contains(event.target))) {
        const wtfac = (data.width/data.origmult) / (data.tmax - data.tmin); const wtmin = data.tmin * data.origmult;
        let locX = event.offsetX; let locY = event.offsetY;
        const timeX = data.tmin + (data.tmax-data.tmin) * (locX*1.0)/(data.width);
        const orig_timeX = timeX * data.origmult; 
        let priceY = data.pmin + (data.pmax-data.pmin) * (data.height - locY*1.0)/(data.height);
        let nText = "Loc[x=" + locX + ",y=" + locY + "] = (om=" + data.origmult + ") (" + timeX.toFixed(2) + "=" +
          pretty_num.string_del_tm(timeX, data.unit, data.st_time, true)  +
          ",$" + priceY.toFixed(2) + ")";
        let tipText = "";
        let cross_path = svg_div.cross_path
        const nPath = "M 0, " + locY + " H " + data.width + " M " + locX + ", 0 V " + copy_data.height;
        if ((svg_div.cross_path===null) || (svg_div.cross_path === undefined) || (!(cross_path))) {
          cross_path = document.createElementNS(svgns,'path');
          cross_path.setAttribute('id','cross_path');  cross_path.setAttribute('stroke','black'); cross_path.setAttribute('stroke-width','2');
          cross_path.setAttribute('fill','black'); cross_path.setAttribute('d', nPath); cross_path.setAttribute('z-level',3);
          cross_path.style.strokeDasharray = null;
          cross_path.style.strokeDasharray = '4, 4';
          svg_svg.appendChild(cross_path); svg_div.cross_path = cross_path
        } else {
          cross_path.setAttribute('d', nPath);
        }
        let blines = null; let slines = null; let new_nbbo_i = -1;


        const time_delta = (price_delta / (data.pmax-data.pmin)) * (data.tmax-data.tmin) * data.origmult;
        //debugger;
        //console.log("after get_obs_range: buy_range = " + buy_range.ret.length + " bounds[" + buy_price_bounds[0] + 
        //  data.buys.price[buy_price_bounds[0]] + "," + buy_price_bounds[1]+"]");
        //
        if (!(!(data.nbbo))) {
          new_nbbo_i = current_nbbo_i(orig_timeX, data.nbbo, past_nbbo_i);
          //console.log("new_nbbo_i found to be: " + new_nbbo_i + "/" + data.nbbo.time.length + ", past_nbbo_i=" + past_nbbo_i);
          if ((new_nbbo_i < 0) || (new_nbbo_i >= data.nbbo.length)) {
             past_nbbo_i = new_nbbo_i;
          } else if (new_nbbo_i == past_nbbo_i) {
          } else { 
            nText = nText + ", [nbb,nbo]=[$" + data.nbbo.nbb[new_nbbo_i].toFixed(2) + ",$" + data.nbbo.nbo[new_nbbo_i].toFixed(2) + "]";
            tipText = tipText + ("[nbb=$" + data.nbbo.nbb[new_nbbo_i].toFixed(2) + "]<br>" + 
                       "[nbo=$" + data.nbbo.nbo[new_nbbo_i].toFixed(2) + "]")
            let pnbb = data.nbbo.nbb[new_nbbo_i]; let lpnbb = Math.floor(data.height * ( data.pmax-pnbb) / (data.pmax-data.pmin));
            let pnbo = data.nbbo.nbo[new_nbbo_i]; let lpnbo = Math.floor(data.height * ( data.pmax-pnbo) / (data.pmax-data.pmin));
            let tm = data.nbbo.time[new_nbbo_i]; let ltm = Math.floor(wtfac * ( tm - wtmin) );
            let ntm = data.tmax;  if (new_nbbo_i < data.nbbo.nbb.length-1) { ntm=data.nbbo.time[new_nbbo_i+1]; };
            let lntm = Math.floor(wtfac * (ntm - wtmin)) ;
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
          }  
        }
        if (!(!(data.buys))) {
          const buy_range = get_obs_range(data.buys, srt_buys, orig_timeX, priceY, price_delta, buy_price_bounds);
          buy_select = [...buy_range.ret];
          buy_price_bounds[0] = buy_range.new_range[0];  buy_price_bounds[1] = buy_range.new_range[1];

          blines = svg_svg.getElementById('line_buys_selected');
          if ((blines===null) || (blines===undefined) || (!(blines))) {  blines = make_hline("line_buys_selected",-1,-1,-1,'blue',5); blines.setAttribute('z-level',4);
                                                                       svg_svg.appendChild(blines); }
          if (!(!(buy_range.ret)) && (buy_range.ret.length > 0)) {
            update_hline(data.buys,buy_range.ret, blines, data);
            tipText = tipText + "<br>Buys :["
            for (let ii = 0; ii < buy_range.ret.length; ii++) {
              tipText = (tipText + "<br>  $" + data.buys.price[buy_range.ret[ii]] + "," + data.buys.qty[buy_range.ret[ii]] + "(" +  
                 (pretty_num.string_del_tm(data.buys.open[buy_range.ret[ii]] / data.origmult, data.unit, data.st_time,true))  + "-" +
                 (pretty_num.string_del_tm(data.buys.close[buy_range.ret[ii]] / data.origmult, data.unit, data.st_time,true))  + ")");
            }
          } else { blines.setAttribute('d',''); }
        }
        if (!(!(data.sells))) {
          const sell_range = get_obs_range(data.sells, srt_sells, orig_timeX, priceY, price_delta, sell_price_bounds);
          sell_select = [...sell_range.ret];
          sell_price_bounds[0] = sell_range.new_range[0];  sell_price_bounds[1] = sell_range.new_range[1];
          slines = svg_svg.getElementById('line_sells_selected');
          if ((slines===null) || (slines===undefined) || (!(slines))) {  slines = make_hline("line_sells_selected",-1,-1,-1,'red',5); slines.setAttribute('z-level',4);svg_svg.appendChild(slines); }
          if (!(!(sell_range.ret)) && (sell_range.ret.length > 0)) {
            update_hline(data.sells,sell_range.ret, slines, data);
          } else { slines.setAttribute('d',''); }
        }
        if (!(!(data.trades))) {
          const time_delta = (price_delta / (data.pmax-data.pmin)) * (data.tmax-data.tmin) * data.origmult;
          const trade_range = get_obs_range_trades(data.trades, srt_trades, orig_timeX, priceY, price_delta, time_delta,trade_bounds); 
          trade_select = [...trade_range.ret];
          console.log(" On this selection, trade_range.ret has length " + trade_range.ret.length + " or [" + trade_range.ret.join(",") + "]");
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
          //if (trade_range.ret.length > 0) { debugger; }
        }
        //console.log(" -- calling a search for timeX = " + timeX + " for data.nbbo of length " + data.nbbo.length + " from past_nbbo_i=" + past_nbbo_i);
        let text_el = text_svg.getElementById('text_el');
        if ((text_el === null) || (text_el === undefined) || (!(text_el))) {
          text_el = text_svg.appendChild(make_text_el("text_el", Math.floor(.5*text_width), Math.floor(.5 * text_height), nText, 15));
          text_svg.text_el = text_el;  
        }  else {
          text_el = text_svg.getElementById('text_el');
          text_el.textContent = nText; text_el.innerHTML = nText;
        }
        let ttip_div = wDiv.querySelector('#ttip_div'); 
        let ttip_txt = null;
        if ((!(ttip_div === null)) && (!(ttip_div===undefined)) && (!(!(ttip_div))) && (!(tipText === null)) && (!(tipText === undefined)) && (!(tipText==''))) {
          const tiptextsize = 15;
          let nbr = .5 + tipText.match(/<br>/g).length; const nFontSize = 1.2 *tiptextsize;
          let ttip_goal_size = [Math.floor(.25 * data.width), Math.floor(nbr * nFontSize)];
          const xTextLoc =  Math.floor(.1 * ttip_goal_size[0]);
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
          ttip_div.setAttribute('left', (margins.left+locX+5) + "px"); ttip_div.setAttribute('bottom',(margins.top + locY-5) + "px");
          ttip_div.style.left =  (margins.left+locX+5) + "px"; ttip_div.style.top = (margins.top + locY-50) + "px";
          ttip_txt = ttip_svg.querySelector('#ttip_txt');
          if ((ttip_txt === null) || (ttip_txt === undefined) || (!(ttip_txt))) {
            ttip_txt = ttip_svg.appendChild(make_text_el("ttip_txt", Math.floor(.01*ttip_goal_size[0]), Math.floor(.1 * nFontSize), tipText, tiptextsize));
            //console.log("cannot locate ttip_svg?");  debugger;
            ttip_txt.setAttribute('text-anchor', 'start');
          }
          ttip_txt.innerHTML = tts.join('\n')+'';
          if ((tipText.length > 0) && (locY > 100)) { console.log("look at text?"); debugger;}
        }
      }
   };
   svg_div.addEventListener('mouseover', MyEventFunction);
   svg_div.addEventListener('mousemove', MyEventFunction);
   svg_div.addEventListener('mouseout', (event) => {
      //this.PRINT_N(1, "obwidget -- el was clicked");  return(-1);
        let locX = event.offsetX; let locY = event.offsetY;
        let timeX = data.tmin + (data.tmax-data.tmin) * (locX*1.0)/(data.width);
        let priceY = data.pmin + (data.pmax-data.pmin) * (locY*1.0)/(data.height);
        past_nbbo_i = -1;
        const nText = ""; 
        let text_el = text_svg.getElementById('text_el');
        if ((text_el === null) || (text_el === undefined) || (!(text_el))) {
          text_el = text_svg.appendChild(make_text_el("text_el", Math.floor(.5*text_width), Math.floor(.5 * text_height), nText, 15));
          text_svg.text_el = text_el;
        }  else {
          text_el = text_svg.getElementById('text_el');
          text_el.textContent = nText; text_el.innerHTML = nText;
        }

        wipe_ob_svgs(svg_div, svg_svg,wDiv);
   });
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

        let striangles = svg_svg.getElementById('sell_trade_triangles_selected');
        if ((striangles!==null) || (striangles!==undefined) || (!(!(striangles)))) {  striangles.setAttribute('d',''); }

        let btriangles = svg_svg.getElementById('buy_trade_triangles_selected');
        if ((btriangles!==null) || (btriangles!==undefined) || (!(!(btriangles)))) {  btriangles.setAttribute('d',''); }
        //nPath = "M 0, " + locY + " H " + data.width + " M " + locX + ", 0 V " + data.height;
        const nPath = "";

        let cross_path = svg_div.cross_path;
        if ((cross_path===null) || (cross_path === undefined) || (!(cross_path))) {
        } else {
          svg_svg.getElementById('cross_path'); 
          cross_path.setAttribute('d', nPath);
        }
        let ttip_div = wDiv.querySelector('#ttip_div');
        if ((!(ttip_div === null)) && (!(ttip_div === undefined)) && (!(!(ttip_div)))) { ttip_div.style.visibility = 'hidden'; ttip_div.style.display='none'}
}
exports = {"add_svg_mouse_over":add_svg_mouse_over, "make_text_el":make_text_el, "binary_top":binary_top, 
   "binary_bottom":binary_bottom, "current_nbbo_i":current_nbbo_i, "binary_nbbo_i": binary_nbbo_i}
module.exports = exports;
