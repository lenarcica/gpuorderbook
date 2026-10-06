/////////////////////////////////////////////////////////////////////
// b2v_struct.js
//
//  Trying to implement Bit Structures in Javascript, porting from C/Rust prior implementations
//
//
const NMAXVENS = 64n; // This is lazy, but realistically US only has O(20) SIP venues now and 128 bit structures not easy in JS

// We don't have 8 bit structures in Javascript, so default will be 64 bit.
const NMAXBITVENS =  (NMAXVENS/64n) + (((NMAXVENS % 64n) > 0n) ? 1n : 0n);

const makeB2V = function() {
  // So here we say a "B2V" will be a BigInt64Array, but usually only of 1 to 2 items.
  return(new BigInt64Array(Number(NMAXBITVENS)));
}

// Kernighan's algoritm should determine 1s in bite quickly
// Now we have a terrible issue that the first zero could be negative
const kern_count = function(bvp) {
  let ntt = 0n;
  let bvpc = BigInt(bvp); // honestly bvp better already be bigint

  // Tackle Sign bit.
  if (bvpc < 0) {
    ntt+=1n; // We know the negative bit is 1 so left most value is 1;
    bvpc=-bvpc;
  }
  while (bvpc > 0n) {
    ntt = ntt + 1n;
    bvpc = bvpc & (bvpc-1n);
  }	  
  return ntt;
}
class B2Vs {
  s = [];
  clone() {
    let ii = 0;
    let new_s = makeB2V();
    for (ii = 0; ii < NMAXBITVENS;ii++) {
      new_s[ii] = this.s[ii];
    }
    return(new_s);
  }
  constructor({}) {
    this.s = makeB2V();
  }
  // So even if we can "support" 128 bit work here, we can't record arbitrary bitlengths in js
  // So our cheat for out64 is merely to convert to a single ugly big integer that may record
  // something useful (at least all zero means we are safe?)
  //
  // My thoughts are this was originally a garblement
  out64() {
    let o1 = 0n;  let ii = 0;
    for (ii=0;ii<NMAXBITVENS;ii++) {
      o1 = o1 | this.s[ii]; // Bitwise Or here, so we just keep turning on!
    }
    return(o1)
  }
  zero_all() {
    let ii = 0;
    for (ii=0;ii<NMAXBITVENS;ii++)  {
  	 this.s[ii] = 0n;	
    }
  }
  is_on_i(i_c) {
    i_c = BigInt(i_c);
    if (i_c > NMAXVENS) {
 	 return(0n);
    }
    const div_l = Number(i_c / 64n);
    const rem_l = (i_c % 64n);
    let on_s = BigInt(this.s[div_l]);
    if (rem_l == 63n) {
      return( (on_s < 0n) ? 1n : 0n);
    }
    on_s = (on_s < 0n) ? -on_s : on_s; 
    if ( ( on_s & ( 1n << rem_l)) > 0n) {
      return(1n);
    }
    return(0n);
  }
  zero_i(i_c) {
    i_c = BigInt(i_c);
    const div_l = Number(i_c / 64n);
    const rem_l = (i_c % 64n);
    if (rem_l == 63n) {
      this.s[div_l] = (this.s[div_l] < 0n) ? (-this.s[div_l]) : this.s[div_l];
    } else if (rem_l == 0n) {
      this.s[div_l] = BigInt(this.s[div_l]) & 0n;
    } else {
      this.s[div_l] = BigInt(this.s[div_l]) & BigInt(!(1n << ((rem_l))));
    }	
  }
  one_i(i_c) {
    i_c = BigInt(i_c);
    const div_l = BigInt(Number(i_c / 64n));
    const rem_l = (i_c % 64n);
    if (rem_l == 63n) {
      if (this.s[div_l] > 0) {
        this.s[div_l] = -this.s[div_l];
      }
    } else {
      this.s[div_l] = BigInt(this.s[div_l]) | ( (1n) << rem_l);  
    }
  }
  eq(other) {
    let ii = 0;
    for (ii = 0;ii < NMAXBITVENS; ii++) {
      if (this.s[ii] != other.s[ii]) { return(false); }
    }
    return(true);
  }
  n_on_total(n_rv) {
    let cnt = 0n;
    const BIn_rv = BigInt(n_rv);
    const n_wrv = (BIn_rv / 64n) + ((BIn_rv % 8n) > 0n) ? 1n : 0n; 
    let ii = 0;
    for (ii=0;ii<n_wrv;ii++) {
	 cnt += BigInt(kern_count(this.s[ii]));
    }
    return(Number(cnt));
  }
  p_string(n_rv) {
    const BIn_rv = BigInt(n_rv);
    const Nn_rv = Number(n_rv);
    let ss = ""; let ii= 0; let val_e;
    for (ii=0;ii<Nn_rv;ii++) { 
      val_e = this.is_on_i(ii);
 	 ss = ss + (val_e > 0) ? '1':'0';
    }
    return(ss);
  }
  bit_tester(n_rv) {
    const BIn_rv = BigInt(n_rv);
    const Nn_rv = Number(n_rv);
    console.log("BitTester ------  EXECUTE -----------------------------------------------------------------------");	
    console.log(`---  Intitiate  nRV=${Nn_rv}. NMAXVENS=${NMAXVENS}.`);
    console.log("--- Number Of Bits On are " +  this.n_on_total(n_rv) + ".");
    console.log("--- We Zero ourselves out. ");
    self.zero_all();
    console.log("--- Now after Zero, number of bits are " +  this.n_on_total(n_rv) + ".");
    console.log("Now we will turn on bits 2 and 3. ");
    this.one_i(2); this.one_i(3);
    console.log(` --- After that number of bits are ${this.n_on_total(Nn_rv)}, which is string ${this.p_string(Nn_rv)}. `);
    console.log(" --- Turn on 9, turn on 10, turn of 2 ");
    this.one_i(9); this.one_i(10); this.zero_i(2);
    console.log(` --- After that number of bits are ${this.n_on_total(Nn_rv)}, which is string ${this.p_string(Nn_rv)}. `);
    console.log(" --- turn 2 on, turn 11 on, turn 10 off. ");  
    this.one_i(11); this.zero_i(10); this.one_i(2);
    console.log(` --- After that number of bits are ${this.n_on_total(Nn_rv)}, which is string ${this.p_string(Nn_rv)}. `);
    this.one_i(0); this.zero_i(2); this.zero_i(3); this.zero_i(9); this.zero_i(10); this.zero_i(11);
    console.log(` --- After that one_i(0), zero_i(2,3,9,10,11), zero_i(2) number of bits are ${this.n_on_total(Nn_rv)}, which is string ${this.p_string(Nn_rv)}.`);
    this.zero_i(0); 
    console.log(` --- After that zero_i(0) number of bits are ${this.n_on_total(Nn_rv)}, which is string ${this.p_string(Nn_rv)}. `);
    this.one_i(7); 
    console.log(` --- After that one_i(7) number of bits are ${this.n_on_total(Nn_rv)}, which is string ${this.p_string(Nn_rv)}.`); 
    this.zero_i(7);  this.one_i(63);
    console.log(` --- After that one_i(63) and zero_i(7) number of bits are ${this.n_on_total(Nn_rv)}, which is string ${this.p_string(Nn_rv)}. `);
  }


}

export {kern_count, NMAXVENS, NMAXBITVENS, B2Vs, makeB2V};
