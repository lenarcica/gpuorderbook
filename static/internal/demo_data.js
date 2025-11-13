// dt_sec is a relative measure of what integer units of time stamps mean
const demo_data = {
dt:"2025-01-01",
st_time: "12:00:00.000000", unit: 0,
dt_sec: .1,
tmin: 0.0, tmax: 44,
pmin: 18, pmax: 30,
height: 400, width: 800,
lwd_h: .01, lwd_w: (400/800 * .01),
max_qty:  150,
pow_qty:  .25,
trade_mul_fac: .1, msg_mul_fac:1.0*.5,
nbbo: {
time: [  0,  1,  2, 10, 20, 21, 22, 24, 25, 28, 30, 32, 40, 45],
nbb:  [ 20, 22, 23, 22, 21, 21, 22, 23, 25, 26, 26, 27, 26, 24],
nbo:  [ 21, 23, 24, 25, 22, 23, 23, 26, 26, 28, 29, 29, 27, 25]
},
buys: { 
  price : [   19,18.5,   21, 25, 22.5 ],
    qty : [  100,  10,   70,  5,   50 ],
   open : [    0,   2, 22.5, 31,    3 ],
  close : [    5,  15,   26, 39,    8 ]
},
sells: {
  price : [   25,  23, 22, 25, 27, 28],
    qty : [   40,  70,100,150,140,120],
   open : [    1,   4, 15, 20, 25, 30],
  close : [   10,  20, 30, 25, 27, 45]
},
trades: {
  time: [  1.5, 11.3, 22.3, 25 ,41],
   qty: [  100,  -20,   30, -20, 140],
 price: [ 22.5,   22,   23, 25.5, 27 ]
},
data_type: "default_data"
}

//exports = {'demo_data':demo_data};
//module.export = exports;
exports = {'demo_data':demo_data}
module.exports = exports;
