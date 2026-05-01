///////////////////////////////////////////////////////////////
// "pretty.js" -- implementing R concept of "pretty numbers";
//
//
//   To be used in other format zones of numbers;
//
//  This implementation adapted to javascript from a python implementation
//
//   Found on stack Overflow
//  stackoverflow.com/questions/43075617/python-equivalent-to-rs-pretty
// "Pretty function equivalent to R's pretty()"
// 
//


// Answer by "BART" to a stack overflow question, adapted to JS
function nicenumber(x, round) {
  const exp = Math.floor(Math.log10(x));
  const f = x / Math.pow(10,exp);
  let nf = 1.0;
  if (round) {
    if (f < 1.5) { nf = 1.0;
    } else if (f < 3) { nf = 2.0;
    } else if (f < 7) { nf = 5.0;
    } else { nf = 10; } 
  } else {
    if (f <= 1.0) { nf = 1.0;
    } else if (f <= 2.0) { nf = 2.0;
    } else if (f <= 5.0) { nf = 5.0;
    } else { nf = 10.0; }
  }
  return(nf * Math.pow(10.0,exp));
}

function getF10(x) {
  if (x < 1.0) { 
   //console.log("getF10 doesn't really work for numbers less than 1. You called me with x=" + x);  
   return(0); }
  for (let ii = 0; ii < 300; ii=ii+1) {
    let f = x / (Math.pow(10,ii));
    if (f > Math.floor(f)) { return(ii); }
  }
  return(300);
}

function next10(x,curF10) {
  //if (x == 0) { console.log("next10 -- you called me with x = 0, shouldn't happen?"); }
  let exp = 0;
  if (x == 0)  {
    exp = getF10(curF10/2);
  } else { exp = getF10(x); 
  }
  const f = x / Math.pow(10,exp);
  return((Math.floor(f)+1.0) * Math.pow(10,exp));
}

function checkAIn(f, fList) {
  for(let ii = 0; ii < fList.length; ii = ii+1) {
    if (Math.abs(f-fList[ii]) < .0001) { return(true); }
  }
  return(false);
}
//pretty_num(9.5, 20.5, 3, true)
// Default for include10 should be true
function pretty_num(low, high, n, include10) {
  const my_range = nicenumber(high-low, false);
  const d = nicenumber(my_range / (n-1.0), true);
  const miny = Math.floor(low / d ) * d;  
  const maxy = Math.ceil(high/d) * d;
  let propRange = [];
  let onx = miny; const list_max = maxy + 0.5 * d;
  while (onx < list_max) { 
    propRange.push(onx); onx = onx + d;
  }
  if (n > 50) { return(propRange); }
  if ((include10 == true) && (next10(miny,d) < list_max)) {
    if (checkAIn(next10(miny,d), propRange) == false) {
      return(pretty_num(low, high, n+1, true))
    }
  }
  return(propRange);
}
// process_tm() we need to be able to convert from decimal unit to a print string of time
//   and then back again.  This can be hard because there are multiple string representations
//   of time, some of which are better depending on how many digits of precision we desire.
//   "unit" in this case can be negative for nanoseconds, but above seconds, we find that "minutes"
//   Or "10 minutes" or "Hour" units have different properties.
const process_tm = function(on_time, unit) {
  if (on_time.length == 0) { return(0); }
  let splitp = on_time.split(".");
  let decimal = '';  if (splitp.length >= 2) { decimal =  splitp[2]; }
  let pos = splitp[0].split(":");
  if ((pos.length == 0) && (decimal.length == 0)) { return(0); }
  let aboveZero = total_secs(splitp[0]);
  if (unit == 0) { return(aboveZero + Number('0.' + decimal)); }

  if (unit == 1) { return( (aboveZero/10) + Number('0.0' + decimal)); }
  if (unit == 2) { return( (aboveZero/60) + Number('0.'+decmimal)/60 ) } 
  if (unit == 3) { return( (aboveZero/600) + Number('0.'+decmimal)/600 ) } 
  if (unit == 4) { return( (aboveZero/(60*60)) + Number('0.'+decmimal)/(60*60) ) } 
  if (unit == 5) { return( (aboveZero/(600*60)) + Number('0.' + decimal)/(600*60) ) }
  if (unit < 0) {  
    if (decimal == '') { return( (aboveZero) * Math.pow(10,-unit)); }
    return( (aboveZero) * Math.pow(10,-unit) +
                           Number(decimal.substring(0,-unit) + '.' + decimal.substring(-unit, decimal.length) ) ); }
  if (unit > 5) { console.log(" No process for larger time stamps yet, hour is max upper scale."); }
  return(0);
}

const total_secs = function(tmstring) {
  // Given a String, let us ignore fractional milkiseconds/seconds, and merely get seconds from midngiht correct.
  if (tmstring.length == 0) { return(0); }
  let hms = tmstring.split(":"); 
  if (tmstring[0] == ':') { 
    if (hms.length == 1) { return(0); }
    if (hms.length == 2) { return(Number(hms[1])); }
    if (hms.length == 3) { return(Number(hms[1]) * 60 + Number(hms[2])); }
    return(0);
  }
  if (hms.length == 1) { return(60*60 * Number(hms[0])); }
  if (hms.length == 2) { return(60*60 * Number(hms[0]) + 60 * Number(hms[1])); }
  if (hms.length == 3) { return(60*60 * Number(hms[0]) + 60 * Number(hms[1]) + Number(hms[2])); }
  return(0);
}

const total_secs_bi = function(tmstring) {
  // Given a String, let us ignore fractional milkiseconds/seconds, and merely get seconds from midngiht correct.
  if (tmstring.length == 0) { return(0n); }
  let hms = tmstring.split(":"); 
  if (tmstring[0] == ':') { 
    if (hms.length == 1) { return(0n); }
    if (hms.length == 2) { return(BigInt(hms[1])); }
    if (hms.length == 3) { return(BigInt(hms[1]) * 60n + BigInt(hms[2])); }
    return(0n);
  }
  if (hms.length == 1) { return(3600n * BigInt(hms[0])); }
  if (hms.length == 2) { return(3600n * BigInt(hms[0]) + 60n * BigInt(hms[1])); }
  if (hms.length == 3) { return(3600n * BigInt(hms[0]) + 60n * BigInt(hms[1]) + BigInt(hms[2])); }
  return(0n);
}
// total_secs = my_this.pretty_num.total_secs;
const process_del_tm = function(t1, unit, t0) {
  // "Process del_tm".
  //
  // We are looking for most precise measurement of the dfferentce between
  // a timepoint measured at base "t0" versus time "t1" with a unit of difference
  // measured by the "unit" operator ("seconds" are "1", negative numbers are milliseconds/microseconds/manoseconds,
  //    but positive numbers are minutes/hours/days)
  //
  // This creates a challenge, as times like "12:00:00.043023" and "13:00:00.043023" might be exactly an hour
  //   off from each other, but in nanoseconds their difference might be incalculable in float64 time.
  //
  // The second challenge is that "t1" may not be a fully formed string.  If we are trying to simplify output
  // and we have centered t0 at an easy time like "2025-09-08 12:00:00", and if t1 is at 12:00:00.000001 for
  // a "unit" of -6, then t1 will actually look like "1ns" or "::00.000001" depending on print settings
  //
  // Note, BigInt exists as a 64 bit integer which is sufficient for uniquely representing timestamps down
  // to a nanosecond up to decades.
  //
  // However, since we will be inputting timestamps to GPU renders, we expect 32 bit floag precision, so 
  // we need to be able to toggle data by a "unit" operator to represent different time distances relative
  // to a given plot window.
  if (t1.length == 0) { return(0); }
  if (typeof t1 === 'number') {
    console.log("Hey t1 given is a number not good!"); debugger;
  } else if ((t1 === null) || (t1 === undefined) || (!(t1))) {
    console.log("  t1 is null this is problematic."); debugger; 
  }
  if (t1.substring(0,2) == "::") {
     t1 = t0.substring(0,6) + t1.substring(2,t1.length);
     console.log("process_del_tm, recoded :: t1 to " + t1);
  } else if (t1.substring(0,1) == ':') {
     t1 = t0.substring(0,3) + t1.substring(1,t1.length);
     console.log("process_del_tm, t1 from : recoded to " + t1);
  }
  let sgn1 = 1;

  let AV =  clean_process_string0(t0);
  let a0 = AV.a0; let ns0 = AV.ns0;  let d0 = AV.d0;
  let spl0 = t0.split("."); 

  //let d0 = '';  if (spl0.length >= 2) { d0 =  spl0[1]; }
  //let a0 = total_secs(spl0[0]);
  let spl1 = ['','']; let a1 = 0; let d1 = '';
  let nss = (t1.substring(t1.length-2,t1.length));
  sgn1 = 1; spl0 = t0.split('.');  d0 = ''; if (spl0.length >= 2) { d0 = spl0[1];  }
  spl1 = ['','']; a1 = 0; d1 = '';  nss = (t1.substring(t1.length-2,t1.length));
  if (t1[0] == '-') { sgn1 = -1; t1 = t1.substring(1,t1.length); }
  if (nss == 'ms') {
    a1 = a0  * sgn1;
    d1 = '' + Number(t1.split('ms')[0]); 
    if (d1.length >= 3)  {
      d1 = d1.substring(d1.length-3,d1.length)
    } else if (d1.length < 3) { d1 = '0'.repeat(3-d1.length) + d1 }
  } else if (nss == 'us') {
    a1 = a0 * sgn1; 
    d1 = '' + Number(t1.split('us')[0]); if (d1.length >= 6)  {d1 = d1.substring(d1.length-6,d1.length)
    } else if (d1.length < 6) { d1 = '0'.repeat(6-d1.length) + d1 }
  } else if (nss == 'ns') {
    a1 = a0 * sgn1;
    d1 = '' + Number(t1.split('ns')[0]); if (d1.length >= 9)  {d1 = d1.substring(d1.length-9,d1.length)
    } else if (d1.length < 3) { d1 = '0'.repeat(9-d1.length) + d1 }
  } else {
    spl1 = t1.split('.'); a1 = total_secs(spl1[0]);  if (spl1.length >= 2) { d1 = spl1[1] }
  }
  if (unit == 0) { return( (sgn1*a1-a0) + sgn1*Number('0.' + d1) - Number('0.'+d0)); }
  if (unit == 1) { return( (sgn1*a1-a0)/10 + sgn1*Number('0.0' + d1) - Number('0.0'+d0)); }
  if (unit == 2) { return( (sgn1*a1-a0)/60 + sgn1*Number('0.0' + d1)/6 - Number('0.0'+d0)/6); }
  if (unit == 3) { return( (sgn1*a1-a0)/600 + sgn1*Number('0.00' + d1)/6 - Number('0.00'+d0)/6); }
  if (unit == 4) { return( (sgn1*a1-a0)/(60*60) + sgn1*Number('0.00' + d1)/36 - Number('0.00'+d0)/36); }
  if (unit == 5) { return( (sgn1*a1-a0)/(60*600) + sgn1*Number('0.000' + d1)/36 - Number('0.000'+d0)/36); }
  if (unit > 5) { console.log(" process_del_tm -- no work past 10 hour yet.");  return(0); }

  if (unit < 0) {  
    let df1 = 0; if (d1 == '') { df1 = 0.0 
    } else if (d1.length > -unit) { df1 = sgn1*Number(d1.substring(0,-unit) + '.' + d1.substring(-unit,d1.length)); 
    } else if ((d1.length>0) && (d1.length <= -unit)) { df1 = sgn1*Number(d1.substr(0,-unit) + '0'.repeat(-unit - d1.length)); }
    let df0 = 0; if (d0 == '') { df0 = 0.0 
    } else if (d0.length > -unit) { df0 = Number(d0.substring(0,-unit) + '.' + d0.substring(-unit,d0.length)); 
    } else if ((d0.length > 0) && (d0.length < -unit)) { df0 = Number(d0.substr(0,-unit) + '0'.repeat(-unit - d0.length)); }
    return( (sgn1*a1-a0) * Math.pow(10,-unit) + (df1-df0));
  }
  return(0);
}
// Tests for process_del_tm
// process_del_tm('12:00:01',0,'12:00:00');
// process_del_tm('12:00:01.302',0,'12:00:01.303')
// process_del_tm('10.0ms',0,'12:00:00');

// hms_connect me, connect the various integer values for hours, minutes, seconds, and fraction.
//   Noting that for integer values less than 10 we need to cast zeroes.
const hms_connectme = function(hs,ms,ss,fr,dec, full) {
  let hss = ''+hs; if (hs < 10) { hss = '0' + hs; }
  let mss = ''+ms; if (ms < 10) { mss = '0' + ms; }
  let sss = ''+ss; if (ss < 10) { sss = '0' + ss; }
  let frs = ''+fr; if (frs.length > dec) { frs = frs.substring(0,dec) }
  if (Number(frs) == 0) { 
    if ((ss == 0) && (full == false)) { return(hss + ':' + mss); }
    //return(`{hss}:{mss}:{sss}`);
    return(hss + ':' + mss + ':' + sss); 
  }
  //return(`{hss}:{mss}:{sss}.{frs}`);
  return(hss + ':' + mss + ':' + sss + '.' + frs);
}

const ms_connectme = function(ms,ss,fr,dec) {
  let mss = ''+ms; if (ms < 10) { mss = '0' + ms; }
  let sss = ''+ss; if (ss < 10) { sss = '0' + ss; }
  let frs = ''+fr; if (fr.length > dec) { frs = frs.substring(0,dec) }
  if (Number(frs) == 0) {
    return(':' + mss +':' + sss);
  }
  //return(`:{mss}:{sss}.{frs}`);
  return(':' + mss + ':' + sss + '.' + frs);
}


const s_connectme = function(ss,fr,dec) {
  let sss = ''+ss; if (ss < 10) { sss = '0' + ss; }
  let frs = ''+fr; if (fr.length > dec) { frs = frs.substring(0,dec) }
  if (Number(frs) == 0) {
    return('::' + sss + '.0');
  }
  //return(`::{sss}.{frs}`);
  return(':'+':' + sss + '.' + frs);
}
const clean_process_string0 = function (s0) {
  let spl0 = s0.split('.'); let d0 = ''; if (spl0.length >= 2) { d0 = spl0[1]; }
  let a0 = total_secs(spl0[0]);
  let ns0 = Number(0);  
  if (d0.length >= 9) { ns0 = Number(d0.substring(0,9)); } else {
    ns0 = Number( d0 + '0'.repeat(9-d0.length));
  }
  return({'a0':a0,'ns0':ns0,'d0':d0});
}

const clean_process_string0_bi = function (s0) {
  let spl0 = s0.split('.'); let d0 = ''; if (spl0.length >= 2) { d0 = spl0[1]; }
  let a0 = BigInt(total_secs_bi(spl0[0]));
  let ns0 = BigInt(0);  
  if (d0.length >= 9) { ns0 = BigInt(d0.substring(0,9)); } else {
    ns0 = BigInt( d0 + '0'.repeat(9-d0.length));
  }
  return({'a0':a0,'ns0':ns0,'d0':d0});
}
// total_secs = my_this.pretty_num.total_secs
//my_this.pretty_num.string_del_tm(0,0,'12:00:00.000000',true)
//
const recast_unit = function(t0, unit0, unit1, base_st_time) {
  const string_t0 = string_del_tm(t0, unit0, base_st_time, true);
  return(process_del_tm(string_t0, unit1, base_st_time));
}
const compare_two_unit_num = function(t0, unit0, t1, unit1, base_st_time) {
  const t0_unit1 = recast_unit(t0, unit0, unit1, base_st_time);
  return( (t0_unit1 == t1) ? 0 : ((t0_unit1 < t1) ? -1 : 1));  
} 
const string_del_tm = function(t1, unit, st0, fullunit) {
  // st0 is a string representation of a "base time", aka something like "12:00:00.0430239432"
  //
  // "t1" is the delta from st0, in units marked by "unit" parameter.
  //
  //   Note that "unit = 0" means that a unit is 1 second.
  //     a unit = "-1" or (100ms or .1 seconds), then 1.0 = "0.1" seconds
  //     a unit = "+1" or (10 seconds)
  //     a unit = "+2" is a minute, or (60 seconds)
  //     a unit = "+4" is an hour, or (3600 seconds)
  //     a unit = "-9" is a nanosecond so 1.0 = .000000001 seconds;
  //
  //  The goal of this operation is to take t1 and construct a new string version of time at t1.
  //
  //  Our math, so far is rather slow.
  //     1. Take t1 and try and compute "seconds" and "nanosecond remainder" 
  //         This splits "12.30432" to "a1=1 second" and "ns1=230432000 ns" if "unit=-1"
  //     2. Compute st0 into seconds/nanoseconds (hence "10:00:10.34" turns into a0=36010 seconds and ns0=340000000 ns)
  //     3. Try to add seconds and Nanoseconds to get a new "a2 = a0+a1 + seconds(ns0+ns1)" and "ns2=remainder(ns0+ns1)"
  //     4. Convert "a1,ns2" pair into a printable string.  So if st0="10:00:10.34" and t1=12.30432 for unit 1
  //          Then a0+a1= 36011, ns1+ns0=570432000, which means we print a string time of
  //          "10:00:11.570432000".  Given that "unit=-1" is close to seconds in time.
  //
  //    Note if we had to print at higher/lower precision (say unit=-5 or unit=+5) we would round the category, or only show
  //    higher or lower digits.  In general, 4 digits of extra precision over "unit" can be rounded away.
  //
  //    Ideally there is a cleaner way to do this, possibly need to leverage BigInt.
  //    We do need to this flexible units, because we are converting to float 32 and will need to generate plot windows of different
  //    precision levels.
  let a0 = 0; let d0 = 0; let ns0 = 0; let sgn1 = 1;
  let ns1 = 0; let d1 = ''; let np1 = ['','']; let unitmul = 1;
  let ns1d = 0; let ns1n = 0; let sec1 = 0; let nsr = 0; let a2 = 0; let pt = 1;
  let hs = 0; let ms = 0; let ss = 0; let frs = '';
  let decs = unit>=1 ? 1 : ( ( unit > -2) ? 3 : (-unit));
  let AV = clean_process_string0(st0); let str_nsr = '' + '0';
  a0 = AV.a0;  d0 = AV.d0;  ns0=AV.ns0;
  
  sgn1 = 1; if (t1 < 0) { sgn1 = -1; t1 = t1 * -1; }
  ns1 = 0; d1 = ''; np1 = (''+t1).split('.');
  ns1d = 0; ns1n = 0;  // ns1d is extracted from right  and ns1n is extracted from left of period in a number "13.4323" depending on "unit"
  // Note this unitmul calculation is asymmetric.  As unit gets larger than 1, units will go to Minutes/Hours/Days
  unitmul = 1; if (unit == 1) { unitmul = 10; } else if (unit == 2) { unitmul = 60;
  } else if (unit == 3) { unitmul = 600; } else if (unit == 4) { unitmul = 3600; } else if (unit == 5) { unitmul = 36000; 
  } else if (unit == 7) { unitmul = 24*3600; // Now a unit is 1 day.
  } else if (unit < 0) { unitmul = Math.pow(10,unit); } // nanosecond is smallest feasible unit for most applications
  if (unit >= 0) { d1 = ('' + (t1 * unitmul)).split('.'); if (d1.length >= 2) { d1 = d1[1]; } else {d1 = ''}} 
  if (unit < 0) {
    if ((np1[0].length > 1) || (np1[0] != '0')) {
      ns1n = np1[0] + '0'.repeat(9+unit);
      if (ns1n.length > 9) { ns1n = ns1n.substring(ns1n.length - 9, ns1n.length) };
      ns1n = Number(ns1n);
    } 
    if ((np1.length >= 2) && (np1[1].length >= 1)) {
      if (np1[1].length >= 9+unit) { 
         ns1d = Number( np1[1].substring(0,9+unit));
      } else { ns1d = Number(np1[1] + '0'.repeat(9+unit - np1[1].length)) }
    }
    ns1 = ns1d + ns1n;
  } else {
    d1 = ('' + t1*unitmul).split('.');  if (d1.length >= 2) { d1 = d1[1] } else { d1 = '';}
    if (d1 == '') { ns1 = 0; } else if (d1.length >= 9) { d1 = d1.substring(0,9); ns1 = Number(d1); 
    } else {  ns1 =  Number(d1 + '0'.repeat(9-d1.length)); }
  }
  sec1 = Math.floor(t1 * unitmul);
  //console.log(" we have a0,ns0="+a0+"," + ns0 + " and sec1,ns1=" + sec1 + "," + ns1); 
  nsr = ns1*sgn1 + ns0;
  a2 = sec1*sgn1 + a0;
  // Dealing with potential remainder because nsr may be bigger now than +-1 sec
  if (nsr >= 1000000000) {
    a2 = a2 + 1; nsr = nsr - 1000000000;
  }
  if (nsr <= -1000000000) {
    a2 = a2 -1; nsr = nsr + 1000000000;
  }
  if (nsr < 0) {
    pt = Math.floor(nsr / 1000000000)
    a2 = a2 +pt; nsr = (-pt*1000000000) + nsr;
  }
  if (!(typeof nsr === 'number')) { console.log(" warning, before t1=0 correction we have nsr is " + nsr); }
  if ((typeof t1 === 'number') && (t1 == 0)) { a2 = a0*1.0; nsr = ns0*1.0; }
  hs = Math.floor(a2 / (60*60));  ms = Math.floor((a2 - 60 * 60 * hs)/60); ss = (a2 % 60);
  str_nsr = '' + nsr;
  frs = ''; if (nsr > 0) { 
    if (str_nsr.length >= 9) { frs = str_nsr.substring(0,9);
    } else {
       frs = '0'.repeat(9-str_nsr.length) + str_nsr; 
    }
  } else {
    frs = '000000000';
  }
  //console.log(" we have hs:ms:ss = " + hs + ":" + ms + ":" + ss + " and frs = " + frs + " for nsr = " + nsr);
  if ((fullunit == true) || (unit >= 3)) {
    decs = unit >= 1 ? 1 : ( (unit > -2) ? 5-unit : (5-unit));
    return(hms_connectme(hs,ms,ss,frs,decs,fullunit));
  }
  if (unit >= 2) {
    return(ms_connectme(ms,ss,frs,4));
  } else if (unit >= -3) {
    return(s_connectme(ss,frs,5));
  } else  if (unit >= -4) {
     return(Number(frs.substring(0,3) + '.' + frs.substring(3,6)) + 'ms'); 
  } else if (unit >= -6) {
     return(Number(frs.substring(0,6) +'.' + frs.substring(6,9)) + 'us');
  }
  return( Number(frs) + 'ns');
}
//string_del_tm(1,0,'12:00:00',true)

exports = {'pretty_num':pretty_num, 'string_del_tm':string_del_tm, 'process_del_tm':process_del_tm,
   'hms_connectme':hms_connectme, 'ms_connect_me':ms_connectme,'s_connectme':s_connectme, 'clean_process_string0':clean_process_string0,
    'total_secs':total_secs, 'recast_unit':recast_unit,'compare_two_unit_num':compare_two_unit_num};
module.exports = exports;
