//////////////////////////////////////////////////////////////////
// Structures for reproducing market sip
//
//  Alan B Lenarcic 2026/07/07
//
//  Learning some efficiencies in SIP structures in a 
//    moving from RUST to JS, that said, it is possible these
//    algos are less important in a Client-based application
//
//  BigInt in JS allows bitwise mathematics, so we test that these operations work.
import {B2Vs, NMAXBITVENS, NMAXVENS} from './b2v_struct.js';


// Possibly useful implementation of somesort of date calculation
const dt64_string = function(x) {
  const ML = [31,28,31,30,31,30,31,31,30,31,30,31];
  const init_x = BigInt(x) * 1n;
  x = BigInt(x);
  let yr = 1970n; let pump = 0n; let tdays = x / 86400000000000n; //(24n*60n*60n*1000000000n);
  let nloop = 0;
  while(x < 0n) {
    pump = ((yr%4n)==0n) ? 366n : 365n;
    yr = yr - 1n;
      tdays = tdays + pump;  x = x + BigInt(pump) * 86400000000000n; //24n * 60n*60n*1000000000n
    nloop += 1;
    if (nloop >= 100000000n) {
       console.log("dt64_string: ERROR nloop = " + nloop + " x was " + init_x); return("00000XXXXX Date");
    }
  }
  const ns = x % 1000000000n;
  const sec = (x / 1000000000n) % 60n;
  const min = (x / 60000000000n)  % 60n;
  const hr = (x / 3600000000000n) % 24n;
  const days = x /  86400000000000n; // (24n*3600000000000n);
  tdays = days; let found=0; 
  while (found == 0) {
      pump = ((yr%4n)==0n) ? 366n : 365n;
	 if (tdays < (pump)) {
        found = 1;
	 } else {
        tdays = tdays-pump; yr = yr + 1n;
	 }
      nloop+=1;
      if (nloop >= 2000000) {
        console.log("dt64_string: BIG ERROR CAN't find year, found=" + found + ", and tdays=" + tdays + " and pump=" + pump);
        return("0000XXXX Date");
      }
  }
  found = 0;  let mth = 0;
  while (found == 0) {
      pump = (mth==1) ? ((yr%4n==0n) ? 29n : 28n ) : BigInt(ML[mth]);
      if (tdays < pump) {
        found = 1;
      } else {
        tdays = tdays - pump; mth = mth +1;
      }
      nloop+=1;
      if (nloop >= 2000000) {
        console.log("No way dt64_string, error on days location, pump=" + pump + " and tdays=" + tdays + " mth=" + mth);
        return("0000XXXX Date");
      }
  } 
  return( yr.toString().padStart(4,'0') + '-' +
            mth.toString().padStart(2,'0') + '-' + 
            tdays.toString().padStart(2,'0') + ' ' + 
            hr.toString().padStart(2,'0') + ':' + 
            min.toString().padStart(2,'0') + ':' + 
            sec.toString().padStart(2,'0') + '.' + 
            ns.toString().padStart(9,'0')); 
}
// Yes Lazy way to print a bit string for number of venues out of x being u64.
const  u64_string = function(x, n_rv) {
  let ss = ""; let ii=0; n_rv = Number(n_rv);
  for (ii=(n_rv-1);ii >= 0;ii--) {
    if ((x & ( ( 1n) << BigInt(ii))) > 0) {
      ss = ss+ '1';
    } else {
      ss = ss + '0';
    }
  }
  return(ss);
}
const to_v64 = function(v_usize) {
  let v_64 = Int64Array(v_usize.length); 
  for (let ii=0;ii<v_usize.length;ii++) {
    v_64[ii] = v_usize[ii];
  }
  return(v_64); 
}
class PSip {
  bs01 = -1; //buy or sell 0/1
  nv = 0n; // num venues
  b2v = null; // bit array of BigInt64.
  q=0; // quantity
  p=0; // price
  vq=[]; // Vector quantities at the venues
  vp=[]; // Vector of Prices at venues
  nwv=-1;  // Number of winning venues at the price
  constructor({bs01, n_venues}) {
    this.bs01 = bs01; this.nv = BigInt(n_venues);
    this.b2v = new B2Vs(this.nv);
    this.q=0; this.p=0.0; this.vq = new Float64Array(Number(this.nv));
    this.vp = new Float64Array(Number(this.nv));  this.nwv = -1;
  }
}
class TSip {
  b = null; // PSip for buy
  s = null; // PSip for sell
  i_r=0; // index of line
  tt=0;  // time BigInt
  constructor({n_ven}) {
    this.b = new PSip({"bs01":0,"n_venues":BigInt(n_ven)});
    this.s = new PSip({"bs01":1,"n_venues":BigInt(n_ven)});
    this.i_r=0;this.tt=0;
  }
}
/////////////////////////////////////////////
// RecSip  -- Column based recording.
//
// At least for javascript based problems, RecSip seems superior to PublishSip approach.
//
// RecSip structure records the changes of state
//   NBB is National Best Bid (highest bid price
//   NBO is National Best Offer (lowest sell price)
//
//   n_r: number of total records struct can hold
//   ir: Recording index of current position to write
//   nv: number of venues in sip
//   vT: time vector
class RecSip { 
  n_r =0; i_r=0; nv=0n; vt=[];
  vb_nwv=[]; vs_nwv=[];
  vb_b2v=[]; vs_b2v=[];
  vb_u=[]; vs_u=[];
  vb_p=[]; vs_p=[]; 
  vb_q=[]; vs_q=[]; 
  vi_line=[]; verbose_ob=null;
  constructor({n_r, nv}) {
    this.n_r = n_r; this.nv = BigInt(nv);
    this.i_r = 0;
    this.vt = new BigInt64Array(Number(this.n_r));
    this.vb_nwv = new Int16Array(Number(this.n_r)); // 2^15 too many venues!
    this.vs_nwv = new Int16Array(Number(this.n_r)); // 2^15 too many venues!
    this.vb_u = new BigInt64Array(Number(this.n_r)); // We can only record first 64 most important venues
    this.vs_u = new BigInt64Array(Number(this.n_r)); //  ...
    this.vb_q = new Float64Array(Number(this.n_r)); // Quantity is always fractional now
    this.vs_q = new Float64Array(Number(this.n_r)); // Quantity is always fractional now
    this.vb_p = new Float64Array(Number(this.n_r)); // 
    this.vs_p = new Float64Array(Number(this.n_r)); // 
    this.vi_line = new Uint32Array(Number(this.n_r));
  }
  reset_length() {
    this.vt = this.vt.subarray(0, this.i_r);
    this.vb_nwv = this.vb_nwv.subarray(0, this.i_r);
    this.vs_nwv = this.vs_nwv.subarray(0, this.i_r);
    this.vb_p = this.vb_p.subarray(0, this.i_r);
    this.vs_p = this.vs_p.subarray(0, this.i_r);
    this.vb_q = this.vb_q.subarray(0, this.i_r);
    this.vs_q = this.vs_q.subarray(0, this.i_r);
    this.vi_line = this.vi_line.subarray(0, this.i_r);
  }
  state_match(ptsip) {
    if (this.nv < (ptsip.b.nwv)) {
      console.log("Error statematch, this.nv=" + Number(this.nv) + 
        ", but ptsip b nwv is " + Number(this.ptsip.b.nwv) + ".");
      return(7);
    }
    if (this.nv < (ptsip.s.nwv)) {
      console.log("Error statematch, this.nv=" + Number(this.nv) + 
         ", but ptsip s nwv is " + Number(this.ptsip.s.nwv) + ".");
      return(7);
    }
    if ((ptsip.b.p === this.vb_p[this.i_r]) &&
        (ptsip.b.q === this.vb_q[this.i_r]) &&
        (ptsip.b.nwv === this.vb_nwv[this.i_r]) &&
        (ptsip.b.b2v === this.vb_b2v[this.i_r]) &&
        (ptsip.s.p === this.vs_p[this.i_r]) &&
        (ptsip.s.q === this.vs_q[this.i_r]) &&
        (ptsip.s.nwv === this.vs_nwv[this.i_r]) &&
        (ptsip.s.b2v === this.vs_b2v[this.i_r])) {
      return(1);
    } else {
      return(0);
    }
    //return 128; // UNREACHABLE?
  }
  record_state(ptsip) {
    if (this.state_match(ptsip) > 0) {
      return(0);
    }
    if (this.i_r >= this.n_r) {
      console.log("Error record_state:  i_r=" + this.i_r + " but n_r=" + this.n_r + ". ");
      return(0);
    }
    this.vb_p[this.i_r] = ptsip.b.p;this.vb_q[this.i_r] = ptsip.b.q;
    this.vb_b2v[this.i_r] = ptsip.b.b2v.clone();this.vb_nwv[this.i_r] = Number(ptsip.b.nwv);
    this.vs_p[this.i_r] = ptsip.s.p;this.vs_q[this.i_r] = ptsip.s.q;
    this.vs_b2v[this.i_r] = ptsip.s.b2v.clone();this.vs_nwv[this.i_r] = Number(ptsip.s.nwv);

    // So what will we do?  Only print 64 venue censored information because JS does not have Int128
    this.vb_u[this.i_r]= ptsip.b.b2v.out64(); this.vs_u[this.i_r] = ptsip.s.b2v.out64();
    this.vi_line[this.i_r] = ptsip.i_r;  // note tsip.i_r >= this.i_r
    this.vt[this.i_r] = ptsip.tt;
    this.i_r += 1;
    return(this.i_r);
  }


}

// PublishSIP -- row based recording.
// b_... {buy/Bids/NBB}, s_... {sell/Asks/NBO}
// _q ... Total Quantity at NBB/NBO
// _p ... Price of NBB/NBO
// _nwv ... Number of venues with prices at NBB/NBO
// _b2v ... Bit vector identifying which venues at NBB/NBO
class PublishSip{
  tt=0n; b_p=0.0; s_p=0.0;
  b_q=0.0; s_q=0.0;
  b_vu=0n; s_vu=0n;
  i_line=0;  b_nwv=0; s_nwv=0;
  consructor() {
    this.tt =0n; this.b_p=0.0; this.b_q = 0.0;
    this.s_p=0.0; this.s_q=0.0;
    this.vu = 0n; this.s_vu = 0n;
    this.i_line=0;  this.b_nwv=0;  this.s_nwv=0;
  }
  publish(ttime, i_line, t_sip) {
    this.i_line = i_line; this.tt = ttime;
    this.b_p = t_sip.b.p; this.s_p = t_sip.s.p;
    this.b_q = t_sip.b.q; this.s_q = t_sip.s.q;
    this.b_nwv = t_sip.b.nwv; this.s_nwv = t_sip.s.nwv;
    //this.b_b2v = t_sip.b.b2v.clone(); this.s_b2v = t_sip.s.b2v.clone();
    this.b_vu = t_sip.b.b2v.out64();  this.s_vu = t_sip.s.b2v.out64();
  }

}
class VPublishSip{ 
   v=[]; on_r=0;
  constructor({n}) {
    this.v = []; this.on_r = 0;
  }
  publish(ttime, i_line, tsip) {
    this.v.push(new PublishSip(tt, b_p, s_p, b_q, s_q, b_vu, s_vu, i_line, b_nwv, s_nwv));
    this.on_r += 1;
  }
}


// verification: Validates that calculation is correct
PSip.prototype.verify = function() {
  let n_err= 0; let sumq = 0;
  let tgtp = 0.0; 
  let tot_w = 0.0; let ii = 0; let iv = 0;
  const nv = Number(this.nv);
  const stt = ("PSip.verify(bs=" + ((this.bs01==0)?"b":"s") + 
      ",nv=" + nv + ",p=\$" + this.p + ",q=" + this.q + "): ");
  if (this.bs01 == 0) {
      for (ii=0;ii<nv;ii++) {
        if (this.vq[ii] > (0)) {
          if ((tgtp <= 0.0) || (this.vp[ii] > tgtp)) {
            tgtp = this.vp[ii];
          }			   
        }
      }
  } else {
      for (ii=0;ii<nv;ii++) {
        if (this.vq[ii] > (0)) {
          if ((tgtp <= 0.0) || (this.vp[ii] < tgtp)) {
            tgtp = this.vp[ii];
          }			   
        }
      }
  }
  if ((this.p <= 0.0) && (tgtp <= 0.0)) {
  } else if (this.p != tgtp) {
      console.log(stt + ": p versus tgtp unequal maxP=" + tgtp);
      n_err+=1;		 
  }
  for (iv=0;iv<nv;iv++) {
      if ((this.vp[iv] == tgtp) && (tgtp > 0.0)) {
        sumq += this.vq[iv];  tot_w+=1;
        if (this.b2v.is_on_i(iv) == 0) {
          console.log(stt + " on iv="+iv+"/"+nv+", with price at vp["+iv+"]="+this.vp[iv] + 
            ", best is " + tgtp + " but is_on_i(" + iv + ") is " +
            this.b2v.is_on_i(iv));
          n_err+=1;			 
        }
      } else {
         if (this.b2v.is_on_i(iv) > 0) {
           console.log(stt + " on iv="+iv + "/" + nv + ", its price was " + this.vp[iv] + 
              " with best tgtp=" + tgtp + ", but is_on_i[" + iv + "] as " +
              this.b2v.is_on_i(iv) + ".");
           n_err+=1;
         }
      }
  }
  if (sumq != this.q) {
      console.log(stt + " -- Verify Fail: sumq=" + sumq + ", this.q=" + this.q);
      n_err+=1;
  }
  if (tot_w != this.nwv) {
    console.log(stt + "PSip -- fail to have tot Winning, totW = " + tot_w + 
      " but this.nvw=" + Number(this.nwv));
    n_err+=1;
  }
  if ((n_err) > (0)) {
    const out_st = (this.bs01==0) ? "maxP" : "minP";
    console.log(stt + ": there were n_err=" + n_err + " failures on side " + 
      " with out_st=" + out_st + ", tgtp=" + tgtp);
  }
  return(n_err);
}
PSip.prototype.update = function(newv, newp_in, newq) {
  //newv: Which venue changes
  //newp: New price
  //newq: New quantity at venue
  const newvi = newv; // rename as index
  
  // newq will create shutdown criterion, don't want to accidentally add negative price or
  // price associated with zero quantity.
  const newp = (newq > 0) ? newp_in : 0.0;
  const nv = Number(this.nv); let ii = 0;
  const stt = ("PSip.update(" + ((this.bs01===0) ? "b" : "s") + "," + 
    "newv=" + newv + ",newp=\$" + newp + ",newq=" + newq + "): ");
  if ((this.p == newp) && (this.p <= 0.0)) {
  } else if ((this.p == 0.0) && (newp > 0.0)) {
    this.b2v.zero_all(); this.nwv = 0;
    this.b2v.one_i(newv); this.p = newp; this.q = newq;
  } else if ((newp > 0.0) &&
             ((this.bs01 === 0 && this.p < newp) ||
              (this.bs01 == 1 && this.p > newp))) { 
    this.b2v.zero_all(); this.nwv = 0;
    this.b2v.one_i(newv); this.p = newp; this.q = newq;
  } else if (this.p == newp) {
    if (this.b2v.is_on_i(newv) > 0) {
      this.q += newq - this.vq[newvi];
      this.vq[newvi] = newq; 
    } else {
      this.nwv += 1; 
      this.q += newq;  this.b2v.one_i(newv);
    }
  } else if (((this.bs01 === 0) && (this.p > newp)) ||
             ((this.bs01 === 1) && ((newp <= 0.0) || (this.p < newp)))) {
    if (this.b2v.is_on_i(newv) > 0) {
      if (this.nwv > 1) {
        this.q -= this.vq[newvi]; this.nwv -= 1;
        this.b2v.zero_i(newv);
      } else {
        this.b2v.zero_all(); this.nwv = 0;
        this.vp[newvi] = newp;  this.vq[newvi] = newq;
        this.q = 0;
        let tgtp = 0.0;
        for (ii=0;ii<nv;ii++) {
          if ((tgtp <= 0.0) && (this.vp[ii] > 0.0)) {
            tgtp = this.vp[ii];
          } else if ((this.bs01 === 0) && (this.vp[ii] > tgtp)) {
            tgtp = this.vp[ii];
          } else if ((this.bs01 === 1) && (this.vp[ii] > 0.0) && (this.vp[ii] < tgtp)) {
            tgtp = this.vp[ii];
          }
        }
        if (tgtp > 0.0) {
          for (ii=0;ii<nv;ii++) {
            if (this.vp[ii] == tgtp) {
              this.b2v.one_i(ii); this.q += this.vq[ii];
              this.nwv += 1;
            }
          }
          this.p = tgtp;
          } else {
            this.p = 0.0; this.q = 0; this.nwv = 0;
          }
        }
      }
  } else {
    // Pass, nothing to do?
    console.log(stt + "Why are we here in edge case?");
  }
  this.vp[newvi] = newp; this.vq[newvi] = newq;
  return(newv);
}
export {PSip, TSip, RecSip, B2Vs, dt64_string, u64_string, PublishSip, VPublishSip, NMAXBITVENS, NMAXVENS};

