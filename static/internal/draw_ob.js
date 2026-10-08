// draw_ob.js

//
// 2025-10-13
//
// The WebGPU mustering operations are contained here.  Unfortunately WebGPU creates
// significant overhead in devising pipelines from modules/buffers/Redner descriptions etc...
// and it can be difficult to remember the order of operations or purposes of these items.

// Just a console.log() configuration library:
const printer = require("./printer.js");
const is_numeric = printer.is_numeric;
const default_verbose_ob = {'s':[], verbose:0};
var PRINT_N = printer.make_print_n(default_verbose_ob,"draw_ob:");

var buffers = {uniform_buffer:null,nbbo:null,buys:null,sells:null,trades:null};
var device_buffers = null;
var renderPassDescriptor = null;
var presentationFormat = null;
var renderPassDesc = null;
var gpu_renderPass_colorAttachment = null;

const bigmult = function(unit) {
    // Determine multiplier to divide object from, assuming unit
    if (unit == 0) { return(1000000000); 
    } else if (unit <= 1) { return(Math.pow(10,9+unit)) 
    } else if (unit <= 3) { return(60*Math.pow(10,7+unit))
    } else if (unit <= 5) { return(3600*Math.pow(10,5+unit))
    } else if (unit <= 7) { return(3600*24*Math.pow(10,3+unit))
    }
}
// PipelineGeneration
function generate_gpu_renderPassDescriptor() {
  renderPassDesc = {
    label: 'ob canvas based renderPass',
    colorAttachments: [
      { view: 0, clearValue: [0.9, 0.9, 0.9, 1],
        loadOp: 'clear', storeOp: 'store',
      },
    ]
  };  
  return(renderPassDesc);
}

// generate_individual_pipeline()
//   Pipelines combine the "module" (the WebGPU code) with characteristics
//   of the GPU structure.  For 2D this is simpler than requirements for 3D
function generate_individual_pipeline( device, module, verbose_ob, what_pipeline) {
  const vstr = "draw_ob.js->generate_gpu_renderPipeline(" + what_pipeline + "): ";
  const PRINT_N = printer.make_print_n(verbose_ob, vstr);
  DEBUG && PRINT_N(1,"-- initiated");
  presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  PRINT_N(1," -- Creating the pipeline");
  //const positionBufferLayoutDesc = createDepthTextureDesc(device, a_gpuwidget, what_pipeline, verbose_ob) 
  //console.log(InitT + "-- DepthTextureDesc was created supplying back in pipeline about to call createRenderPipeline -- ");
  const individual_pipeline = device.createRenderPipeline({
    label: 'obwidget pipeline: ' + what_pipeline,
    layout: 'auto',  vertex: { module:module },
    fragment: { module, entryPoint: "fs",
                targets: [{ format: presentationFormat }]}
    //primitive: { cullMode: 'back' }, // Used in 3D art for occlusion
    //depthStencil: {  depthWriteEnabled: true,
    // depthCompare: 'less', format: 'depth24plus' } 
  });
  if ((individual_pipeline === null) || (individual_pipeline===undefined)) {
    PRINT_N(-6, "-- generate_individual_pipeline(" + what_pipeline + "): Fail. Debug?"); debugger;
  }
  PRINT_N(1,"-- pipeline was generated with createRenderPipeline -- all concluded.");
  return(individual_pipeline);
}

// createDepthTextureDesc()
function createDepthTextureDesc(device, a_obwidget, what_depth_texture, verbose_ob) {
  const vstr = "draw_ob.js->createDepthTextureDesc(" + what_depth_texture + "): ";
  const PRINT_N = printer.make_print_n(verbose_ob, vstr);
  DEBUG && PRINT_N(1, "-- we have called just initiated " + what_depth_texture);
  const colorTexture = a_obwidget.canvas_gpu.getCurrentTexture();
  const colorTextureView = colorTexture.createView();
  DEBUG && PRINT_N(1, "-- We created a color Texture.");
  gpu_renderPass_colorAttachment = {
    view: colorTextureView,
    clearValue: { r: .9, g: .9, b: .9, a: 1 },
    loadOp: "clear", storeOp: "store",
  };
  const depthTextureDesc = {
   size:[a_gpuwidget.data.width, a_gpuwidget.data.height,1], dimension:'2d',
   format: 'depth24plus-stencil8',
   usage: GPUTextureUsage.RENDER_ATTACHMENT};
  //let depthTexture = device.createTexture(depthTextureDesc);
  //let depthTextureView = depthTexture.createView();
  //const depthAttachment = {
  //  view:depthTextureView, depthClearValue: 1, depthLoadOp: 'clear',
  //  depthStoreOp: 'store', stencilClearValue: 0,
  //  stencilLoadOp: 'clear', stencilStoreOp: 'store'};
  const renderPassDesc = {
     colorAttachments:[gpu_renderPass_colorAttachment], 
  };
  //const renderPassDesc = {
  //   colorAttachments:[gpu_renderPass_colorAttachment], 
  //   depthStencilAttachment: depthAttachment,
  //   depthTexture:depthTexture, depthTextureView:depthTextureView
  //};
  DEBUG && PRINT_N(1,"-- We have a renderPassDesc generated");
  return({renderPassDesc:renderPassDesc, 
           //depthAttachment:depthAttachment, 
           colorAttachment:gpu_renderPass_colorattachment,
           colorTextureView:colorTextureView})
}
function generate_gpu_module(device, module_data, verbose_ob) {
  const PRINT_N = printer.make_print_n(verbose_ob,
   "draw_ob.js->generate_gpu_module(" + module_data.label + "): ");
  DEBUG && PRINT_N(1, "  intiating generation of the module");
  const module = device.createShaderModule({
    label: module_data.label, code: module_data.code });
  DEBUG && PRINT_N(1, "  conclused generation of the module");
  return(module);
}
function OB_generate_gpu_pipeline(gpu_pipeline, gpu_context, adapter, device, a_obwidget) {
  const vstr = "draw_ob.js->OB_generate_gpu_pipeline(): ";
  const verbose_ob = a_obwidget.verbose_ob;
  const PRINT_N = printer.make_print_n(verbose_ob, vstr);
  let update_uniform_int = 0;
  generate_gpu_renderPassDescriptor();
  if (!(device)) {
    PRINT_N(-6, "OB_generate_gpu_pipeline -- error device is null");
    debugger;
  }
  if ((!buffers.uniform_buffer) || (!(buffers.nbbo.time))) {
    create_data_buffers(device, a_obwidget.data, a_obwidget.verbose_ob)
  }
  if (!(buffers.nbbo.time)) {
    PRINT_N(-6, "OB_generate_gpu_pipeline -- error buffers has not populated nbbo vector.");
  }
  if (!(buffers.triangle_vert_buffer)) {
    create_vert_buffers(device);
  }
  if (!(buffers.triangle_vert_buffer)) {
    PRINT_N(-6, "OB_generate_gpu_pipeline -- error, verts buffers was not generated.");
  }
  if (!(a_obwidget.data)) {
    PRINT_N(-6, "ERROR: a_obwidget supplied data is NULL.");  debugger; return(-1);
  }
  if (!(is_numeric(a_obwidget.data.tmin))) {
    PRINT_N(-6, "ERROR: tmin is not evaluated for a_obwidget."); debugger; return(-1);
  }
  if ( (!(gpu_pipeline))  || (!(gpu_pipeline.data_pipeline) )) {
    DEBUG && PRINT_N(2," OB_generate_gpu_pipleine initiate module generation");
    const module_nbbo = generate_gpu_module(device, data_nbbo_module, verbose_ob);
    const module_nbb = generate_gpu_module(device, data_nbb_module, verbose_ob);
    const module_nbo = generate_gpu_module(device, data_nbo_module, verbose_ob);
    const module_bv = (buffers.wp !== null) ? generate_gpu_module(device, data_bv_module,verbose_ob) : null;
    const module_sv = (buffers.wp !== null) ? generate_gpu_module(device, data_sv_module,verbose_ob) :null;
    const module_buys = generate_gpu_module(device, data_buys_module,verbose_ob);
    const module_sells = generate_gpu_module(device, data_sells_module,verbose_ob);
    const module_trades = generate_gpu_module(device, data_trades_module, verbose_ob);
    DEBUG && PRINT_N(1, " OB_generate_gpu_pipeline: we made a module_nbbo");
    DEBUG && PRINT_N(1, " Going towards gnenerate piepline.");
    //const module_buys = generate_gpu_module(device, draw_buys_module, verbose);
    //const module_sells= generate_gpu_module(device, draw_sells_module, verbose);
    PRINT_N(1, "-- now generating pipeline");
    gpu_pipeline = {
       device:device, adapter:adapter,
       module_nbbo: module_nbbo, 
       //module_buys:module_buys, mnodule_sells:module_sells
       nbbo_pipeline:   generate_individual_pipeline( device, module_nbbo, verbose_ob, "nbbo_pipeline"),
       nbb_pipeline:    generate_individual_pipeline( device, module_nbb, verbose_ob, "nbb_pipeline"),
       nbo_pipeline:    generate_individual_pipeline( device, module_nbo, verbose_ob, "nbo_pipeline"),
       bv_pipeline:     (buffers.wp !== null) ? generate_individual_pipeline(device, module_bv, verbose_ob, "bv_pipeline") : null,
       sv_pipeline:     (buffers.wp !== null) ? generate_individual_pipeline(device, module_sv, verbose_ob, "sv_pipeline") : null,
       buys_pipeline:   (buffers.buys !== null) ? generate_individual_pipeline(device, module_buys, verbose_ob, "buys_pipeline") : null,
       sells_pipeline:  (buffers.sells !== null) ? generate_individual_pipeline(device, module_sells, verbose_ob, "sells_pipeline") : null,
       trades_pipeline: generate_individual_pipeline(device, module_trades, verbose_ob, "trades_pipeline"),
       buffers: buffers,
       verbose: a_obwidget.verbose,
       context: gpu_context,
       encoder: null
    } 
    //console.log(" draw_ob.js here we are.");
    //debugger;
    PRINT_N(1, "update uniform window device buffer");
    if (!(a_obwidget.data)) {
      PRINT_N(-1, "ERROR OB_generate_gpu_pipeline, data is not populated"); debugger;
    } else if (!is_numeric(a_obwidget.going.tmin)) {
      PRINT_N(-1, "ERROR OB_generate_gpu_pipeline, data does not contain tmin?"); debugger;
    }
    update_uniform_int = update_uniform_window_device_buffer(device, a_obwidget.data, 0, gpu_pipeline)
    PRINT_N(1, "updating the vertex buffers");
    populate_device_verts_buffers(device, gpu_pipeline);
    PRINT_N(1, "update the device data buffers: running populate_device_data_buffers.");
    populate_device_data_buffers(device, gpu_pipeline);
    PRINT_N(1, "populate_device_data_buffers concluded.");
  } else {
    PRINT_N(1, " -- don't need to re-initiate, material is here.");
    update_uniform_int = update_uniform_window_device_buffer(device, a_obwidget.data, 0, gpu_pipeline)
  }
  PRINT_N(1, " OB_generate_gpu_pipeline:  returning gpu_pipeline.");
  return(gpu_pipeline); 
}

const nbbo_verts = [ 
   [0,1],[0,-1],[1,1],[0,-1],[1,1],[1,-1],
   [1,-1],[1,2],[2,2],[1,-1],[2,-1],[2,2]];

const msg_verts = [
   [0,1],[0,-1],[1,1],[0,-1],[1,1],[1,-1] ];
const default_uniforms = [
  [0,50,20,30,500,1000,.005,(500/1000) * .005, 0, 1.0/(50.0), 1.0 / (10.0), 0, 1.0]];
const ioffset_loc = 16;
const triangle_verts = [
  [  0, ( 2.0/3.0) * (1.0 / Math.sqrt(2))],
  [-.5, (-1.0/3.0) * (1.0/Math.sqrt(2))],[.5,(-1.0/3.0) * (1.0 / Math.sqrt(2))]
]

const triangle_verts_arrow = [
  [0 , 0],
  [  0, ( 2.0/3.0) * (1.0 / Math.sqrt(2))],
  [-.5, (-1.0/3.0) * (1.0/Math.sqrt(2))], 
  [0,0],
  [  0, ( 2.0/3.0) * (1.0 / Math.sqrt(2))],
  [.5,(-1.0/3.0) * (1.0 / Math.sqrt(2))]
]
const uniform_buffer_size  = 16;
const VS_Uniforms_struct_code = ` 
      struct VS_Uniforms_0 {
        tmin: f32, tmax: f32, 
        pmin: f32, pmax: f32,
        height: f32, width_height_aspect: f32,
        lwd_h: f32, lwd_w: f32,
        bs01: f32, max_qty: f32,
        tfrac: f32, pfrac: f32,
        pow_qty: f32, t_c_min: f32,
        trade_mul_fac:f32,msg_mul_fac:f32
      };
`;
const VS_Offset_Uniforms_struct_code = `
  struct VS_Uniforms_1 {
    nn:u32, nk: u32 
  }
`;
const VertexOut_struct_code = `struct VertexOut {
       @builtin(position) position : vec4f,
       @location(0) color : vec4f};
`
const VertexOut_fs_code = `
    @fragment fn fs(fragData: VertexOut) -> @location(0) vec4f {
      return(fragData.color);
    }
` 
const nbbo_group_bindings_code = `
    @group(0) @binding(0) var<storage, read> time: array<f32>;
    @group(0) @binding(1) var<storage, read>  nbb: array<f32>;
    @group(0) @binding(2) var<storage, read>  nbo: array<f32>;
    @group(0) @binding(3) var<storage, read>  lineloc: array<f32>;
    @group(0) @binding(4) var<uniform> u0: VS_Uniforms_0;
`
const get_nbbo_group_bindings_code = function(nbb_or_nbo_code) {
return(`

    @group(0) @binding(0) var<storage, read> time: array<f32>;
    @group(0) @binding(1) var<storage, read>  ${nbb_or_nbo_code}: array<f32>;
    @group(0) @binding(2) var<storage, read>  lineloc: array<f32>;
    @group(0) @binding(3) var<uniform> u0: VS_Uniforms_0;
`)
}
const nbbo_module_header_code = `

`

function create_nbbo_data_module_code( nbb_or_nbo_code, which_color_code) {
   console.log("create_nbbo_data_module_code about to write tagged code with nbb_or_nbo_code = " + nbb_or_nbo_code)
   const code= `
     ${VS_Uniforms_struct_code}
     ${get_nbbo_group_bindings_code(nbb_or_nbo_code)}
     ${VertexOut_struct_code}
     @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      //) -> @builtin(position) vec4f {
      ) -> VertexOut {
      //let nbb0 = nbb[0];  let nbo0 = nbo[0];
      let locx: f32 = lineloc[vertexIndex*2];
      let locy: f32 = lineloc[vertexIndex*2+1];
      let t0_loc:f32 = (time[instanceIndex] - u0.t_c_min) * u0.tfrac  -1.0;
      let t1_loc:f32 = (time[instanceIndex+1] - u0.t_c_min) * u0.tfrac - 1.0;
      let p0_loc:f32 = (${nbb_or_nbo_code}[instanceIndex]  - u0.pmin) * u0.pfrac - 1.0;
      let p2_loc:f32 = (${nbb_or_nbo_code}[instanceIndex+1] - u0.pmin) * u0.pfrac -1.0;
      let sgn = select(-1.0,1.0,p2_loc > p0_loc);
      var output: VertexOut;
      output.position =  vec4f(
          select( t0_loc - u0.lwd_w, 
            select( t1_loc - u0.lwd_w, t1_loc + u0.lwd_w, locx > 1.5), locx > 0.05),
          select(p0_loc - sgn*u0.lwd_h, 
            select(p0_loc + sgn*u0.lwd_h, p2_loc + sgn*u0.lwd_h, locy >= 1.05),locy >= 0.05), 0.0,1.0);
      output.color = ${which_color_code};
      return(output);
     }
     ${VertexOut_fs_code}
   `
   return(code);
}
const data_nbb_module = {label:'NBB Line Draw', code:create_nbbo_data_module_code(`nbb`,`vec4f(0.0,100.0/256.0,0.05,1.0)`)}
const data_nbo_module = {label:'NBO Line Draw', code:create_nbbo_data_module_code(`nbo`,`vec4f((220.0/256.0),(20.0/256.0),(60.0/256.0),1.0)`)}


const gen_wp_group_bindings_code  = function(a_sv) {
return(`
    @group(0) @binding(0) var<storage, read> time: array<f32>;
    @group(0) @binding(1) var<storage, read>  ${a_sv}: array<f32>;
    @group(0) @binding(2) var<storage, read>  lineloc: array<f32>;
    @group(0) @binding(3) var<uniform> u0: VS_Uniforms_0;
    @group(0) @binding(4) var<uniform> u1: VS_Uniforms_1;
`
);
}
function create_pv_data_module_code( which_pv, which_color_code) {
   console.log("create_pv_data_module_code about to write tagged code with which_pv = \"" + which_pv + "\"");
   const code= `
     ${VS_Uniforms_struct_code}
     ${VS_Offset_Uniforms_struct_code}
     ${gen_wp_group_bindings_code(which_pv)}
     ${VertexOut_struct_code}
     @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32,
      //) -> @builtin(position) vec4f {
      ) -> VertexOut {
      let nn:u32 = u1.nn;  let nk:u32 = u1.nk;
      let ik:u32 = instanceIndex / nn; let tii:u32 = instanceIndex - ik*nn;
      let locx: f32 = lineloc[vertexIndex*2];
      let locy: f32 = lineloc[vertexIndex*2+1];
      let lwdw = u0.lwd_w * .5; let lwdh = u0.lwd_h * .5;
      //let ioffset:u32 = u1.ioffset; let glev:f32 = u1.glev;
      let glev = 1.0 - f32(ik) / f32(nk);
      var t0_loc:f32 = (time[tii] - u0.t_c_min) * u0.tfrac  -1.0;
      var t1_loc:f32 = (time[tii+1] - u0.t_c_min) * u0.tfrac - 1.0;
      if (t1_loc < t0_loc) {
        t1_loc = -2;  t0_loc = -2;
      }
      let p0_loc:f32 = (${which_pv}[ instanceIndex]  - u0.pmin) * u0.pfrac - 1.0;
      let p2_loc:f32 = (${which_pv}[ instanceIndex+1] - u0.pmin) * u0.pfrac -1.0;
      let sgn = select(-1.0,1.0,p2_loc > p0_loc);
      var output: VertexOut;
      output.position =  vec4f(
          select( t0_loc - lwdw, 
            select( t1_loc - lwdw, t1_loc + lwdw*2, locx > 1.5), locx > 0.05),
          select(p0_loc - sgn*lwdh, 
            select(p0_loc + sgn*lwdh, p2_loc + sgn*lwdh*2, locy >= 1.05),locy >= 0.05), 0.0,1.0);
      output.color = ${which_color_code};
      output.color[0] = output.color[0] * glev; output.color[1] = output.color[1] * glev; output.color[2] = output.color[2] * glev;
      return(output);
     }
     ${VertexOut_fs_code}
   `
   return(code);
}
const data_bv_module = (false) ? null : {label:'b line Draw', code:create_pv_data_module_code('bv','vec4f(0.0, 128.0/256.0, 128.0/256.0, 1.0)')};
const data_sv_module = (false) ? null : {label:'s line Draw', code:create_pv_data_module_code('sv','vec4f(128.0/256.0, (10.0/256.0), (128/256.0), 1.0)')};

//const trycode = `
//  ${VS_Uniforms_code} `

const data_nbbo_module = {
    label: 'NBBO Line Draw',
    code: `
     ${VS_Uniforms_struct_code}
     ${nbbo_group_bindings_code}
     ${VertexOut_struct_code}
     @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      //) -> @builtin(position) vec4f {
      ) -> VertexOut {
      let locx: f32 = lineloc[vertexIndex*2];
      let locy: f32 = lineloc[vertexIndex*2+1];
      let t0_loc:f32 = (time[instanceIndex] - u0.t_c_min) * u0.tfrac  -1.0;
      let t1_loc:f32 = (time[instanceIndex+1] - u0.t_c_min) * u0.tfrac - 1.0;
      let p0_loc:f32 = select(
        (nbb[instanceIndex] - u0.pmin),
        (nbo[instanceIndex] - u0.pmin), u0.bs01 > 0.5) * u0.pfrac  - 1.0;
      let p2_loc:f32 = select( 
        (nbb[instanceIndex+1] - u0.pmin) ,
        (nbo[instanceIndex+1] - u0.pmin) , u0.bs01 > 0.5) * u0.pfrac  -1.0;
      var output: VertexOut;
      output.position =  vec4f(
          select( t0_loc - u0.lwd_w, 
            select( t1_loc - u0.lwd_w, t1_loc + u0.lwd_w, locx > 1.5), locx > 0.05),
          select(p0_loc - u0.lwd_h, 
            select(p0_loc + u0.lwd_h, p2_loc + u0.lwd_h, locy >= 1.05),
            locy >= 0.05),
        0.0,1.0);
      output.color = 
        select(vec4f(1.0,0.0,0.0,1.0), vec4f(0.0,0.0,1.0,1.0), u0.bs01 < 0.5) ;
      return(output);

    }
   ${VertexOut_fs_code}
 `
};

// Note Blue and Red colors horrendous, learn how to fix this.
const blue_level_text = `
      if (qty_level <= .33) {
         output.color = (1.0/.33) * ((.33-qty_level) * vec4f(173.0/256.0,216.0/256.0,1.0,1.0) +
                                     (qty_level) * vec4f(173.0/256.0, 216.0/256.0, 230.0/256.0,1.0));
      } else if (qty_level <= .67) {
         output.color = (1.0/.34) * ( (.67-qty_level) * vec4f(173.0/256.0, 216.0/256.0, 230.0/256.0,1.0) +
                                      (qty_level-.33) * vec4f(100.0/256.0, 149.0/256.0, 237.0/256.0,1.0));
      } else if (qty_level <= 1.0) {
         output.color = (1.0/.33) * ( (1.0-qty_level) * vec4f(100.0/256.0, 149.0/256.0, 237.0/256.0,1.0) +
                                      (qty_level-.67) * vec4f(0.0,0.0,132.0/256.0,1.0));
      }
`

const red_level_text = `
      if (qty_level <= .33) {
         output.color = (1.0/.33) * ((.33-qty_level) * vec4f(216.0/256.0,173.0/256.0,1.0,1.0) +
                                     (qty_level) * vec4f(230.0/256.0, 216.0/256.0,173.0/256.0,1.0));
      } else if (qty_level <= .67) {
         output.color = (1.0/.34) * ( (.67-qty_level) * vec4f(230.0/256.0, 216.0/256.0, 173.0/256.0,1.0) +
                                      (qty_level-.33) * vec4f(237.0/256.0, 149.0/256.0, 100.0/256.0,1.0));
      } else if (qty_level <= 1.0) {
         output.color = (1.0/.33) * ( (1.0-qty_level) * vec4f(237.0/256.0, 149.0/256.0, 100.0/256.0,1.0) +
                                      (qty_level-.67) * vec4f(132.0,0.0,0.0/256.0,1.0));
      }
`;
//rgb(173,216,255), rgb(173, 216, 230), rgb(100, 149, 237), rgb(0, 0, 132)
const make_ob_module = function(label_text, color_text, bindgroup) {
  let bg = bindgroup;
  const retObject = {
    label: `Orderbook ${label_text} Line Draw`,
    code: `
      ${VS_Uniforms_struct_code}
      @group(${bg}) @binding(0) var<storage, read> price: array<f32>;
      @group(${bg}) @binding(1) var<storage, read>   qty: array<f32>;
      @group(${bg}) @binding(2) var<storage, read>  open: array<f32>;
      @group(${bg}) @binding(3) var<storage, read> close: array<f32>;
      @group(${bg}) @binding(4) var<storage, read>   ivs: array<i32>;
      @group(${bg}) @binding(5) var<storage, read>  msg_lineloc: array<f32>;
      @group(${bg}) @binding(6) var<uniform> u0: VS_Uniforms_0;
     
     ${VertexOut_struct_code}
     @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      //) -> @builtin(position) vec4f {
      ) -> VertexOut {
      let locx: f32 = msg_lineloc[vertexIndex*2];
      let locy: f32 = msg_lineloc[vertexIndex*2 + 1];
      let i0:u32 = instanceIndex / 4; let i1:u32 = instanceIndex % 4;
      let i_in:i32 = ivs[i0]+0;
      //let ikeep:i32 = select((1&ivs[i0]), 
      //                      select(((1<<8)&ivs[i0])>0, 
      //                             select((1<<16)&ivs[i0],(1<<24)&ivs[i0],i1==2),
      //                             i1==1), 
      //                       i1 == 0);
      let t_loc:f32 = select( (open[instanceIndex] - u0.t_c_min) * u0.tfrac - u0.lwd_w*u0.msg_mul_fac,
                           (close[instanceIndex] - u0.t_c_min) * u0.tfrac + u0.lwd_w*u0.msg_mul_fac,
                           locx >= 0.05)-1.0;
      var p_loc:f32 = select(
        (price[instanceIndex] - u0.pmin)* u0.pfrac - u0.lwd_h,
        (price[instanceIndex] - u0.pmin)* u0.pfrac + u0.lwd_h, locy > 0.05)-1.0;
      var output: VertexOut;
      output.position =  vec4f(t_loc, p_loc, 0.0, 1.0);
      var qty_level:f32 = pow( (1.0*qty[instanceIndex]) / (1.0*u0.max_qty), u0.pow_qty );
      //qty_level = .5;
      ${color_text}
      return(output);
    }
   ${VertexOut_fs_code}
 `
}
  return(retObject);
}
const data_buys_module = make_ob_module('buys', blue_level_text, 1);
const data_sells_module = make_ob_module('sells', red_level_text, 2);


//rgb(173,216,255), rgb(173, 216, 230), rgb(100, 149, 237), rgb(0, 0, 132)
const make_trade_module = function(label_text, bindgroup) {
  let bg = bindgroup;
  const retObject = {
    label: `Orderbook ${label_text} TradeEvent Draw`,
    code: `
      ${VS_Uniforms_struct_code}
      @group(${bg}) @binding(0) var<storage, read>  time: array<f32>;
      @group(${bg}) @binding(1) var<storage, read>   qty: array<f32>;
      @group(${bg}) @binding(2) var<storage, read> price: array<f32>;
      @group(${bg}) @binding(3) var<storage, read>  triangle_lineloc: array<f32>;
      @group(${bg}) @binding(4) var<uniform> u0: VS_Uniforms_0;
     
     ${VertexOut_struct_code}
     @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      //) -> @builtin(position) vec4f {
      ) -> VertexOut {
      let locx: f32 = triangle_lineloc[vertexIndex*2];
      let locy: f32 = triangle_lineloc[vertexIndex*2 + 1];
      let t_c:f32 = (time[instanceIndex] - u0.t_c_min) * u0.tfrac-1.0;
      let p_c:f32 = (price[instanceIndex] - u0.pmin) * u0.pfrac-1.0;
      let q_s:f32 = qty[instanceIndex];
      let divisor:f32 = select(1.0/u0.max_qty, 1.0, u0.max_qty <= 0);
      var qty_level:f32 = pow(abs(q_s*1.0) *divisor, u0.pow_qty);  
      //qty_level = .5;
      var output: VertexOut;
      output.position =  vec4f(t_c + u0.trade_mul_fac * qty_level * locx, p_c + u0.width_height_aspect*sign(q_s)*u0.trade_mul_fac*qty_level * locy, 0.0, 1.0);
      output.color = select( vec4f(1.0,0.0,0.0,1.0),vec4f(0.0,0.0,1.0,1.0), q_s > 0);
      //output.position = vec4f(t_c + locx, p_c + locy, 0.0, 1.0);
      return(output);
    }
   ${VertexOut_fs_code}
 `
}
  return(retObject);
}
const data_trades_module = make_trade_module('all_trades:', 3);
const old_data_buys_module = {
    label: 'Orderbook Buys Line Draw',
    code: `
      ${VS_Uniforms_struct_code}
      @group(1) @binding(0) var<storage, read> price: array<f32>;
      @group(1) @binding(1) var<storage, read>   qty: array<f32>;
      @group(1) @binding(2) var<storage, read>  open: array<f32>;
      @group(1) @binding(3) var<storage, read> close: array<f32>;
      @group(1) @binding(4) var<storage, read>  msg_lineloc: array<f32>;
      @group(1) @binding(5) var<uniform> u0: VS_Uniforms_0;
     
     ${VertexOut_struct_code}
     @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      //) -> @builtin(position) vec4f {
      ) -> VertexOut {
      let locx: f32 = msg_lineloc[vertexIndex*2];
      let locy: f32 = msg_lineloc[vertexIndex*2 + 1];
      let t_loc:f32 = select( (open[instanceIndex] - u0.t_c_min) * u0.tfrac - u0.lwd_w,
                           (close[instanceIndex] - u0.t_c_min) * u0.tfrac + u0.lwd_w,
                           locx >= 0.05)-1.0;
      var p_loc:f32 = select(
        (price[instanceIndex] - u0.pmin)* u0.pfrac - u0.lwd_h,
        (price[instanceIndex] - u0.pmin)* u0.pfrac + u0.lwd_h, locy > 0.05)-1.0;
      var output: VertexOut;
      output.position =  vec4f(t_loc, p_loc, 0.0, 1.0);
      let qty_level = sqrt( qty[instanceIndex] / u0.max_qty );
      if (qty_level <= .33) {
         output.color = (1.0/.33) * ((.33-qty_level) * vec4f(173.0/256.0,216.0/256.0,1.0,1.0) +
                                     (qty_level) * vec4f(173.0/256.0, 216.0/256.0, 230.0/256.0,1.0));
      } else if (qty_level <= .67) {
         output.color = (1.0/.34) * ( (.67-qty_level) * vec4f(173.0/256.0, 216.0/256.0, 230.0/256.0,1.0) +
                                      (qty_level-.33) * vec4f(100.0/256.0, 149.0/256.0, 237.0/256.0,1.0));
      } else if (qty_level <= .5) {
         output.color = (1.0/.33) * ( (1.0-qty_level) * vec4f(100.0/256.0, 149.0/256.0, 237.0/256.0,1.0) +
                                      (qty_level-.67) * vec4f(0.0,0.0,132.0/256.0,1.0));
      }
      output.color = vec4f(0.0,0.0,1.0,1.0);
      return(output);

    }
   ${VertexOut_fs_code}
 `
}
 
// Attemtping to learn and extract device buffers if we are not happy with content 
async function get_device_buffer(gpu_pipeline, a_device_buffer) {
  let sourceBuffer = null;  let lengthBuffer = null;
  let stagingBuffer = null; let fData = "not_found"; 
  if (a_device_buffer === gpu_pipeline.uniform_device_buffer) {
    sourceBuffer = gpu_pipeline.uniform_device_buffer; fData = "uniform_device";
    lengthBuffer = gpu_pipeline.buffers.uniform_buffer.length;
  } else if (a_device_buffer = gpu_pipeline.nbbo_vert_device_buffer) {
    sourceBuffer = gpu_pipeline.nbbo_vert_device_buffer;
    lengthBuffer = gpu_pipeline.buffers.nbbo_vert_buffer.length; fData = "nbbo_vert"; 
  } else if (a_device_buffer = gpu_pipeline.device_nbbo_buffers.time) {
    sourceBuffer = gpu_pipeline.device_nbbo_buffers.time;
    lengthBuffer = gpu_pipeline.buffers.nbbo.time.length; fData = "nbbo_time";
  } else if (a_device_buffer = gpu_pipeline.device_nbbo_buffers.nbo) {
    sourceBuffer = gpu_pipeline.device_nbbo_buffers.nbo; fData = "nbbo_nbo";
    lengthBuffer = gpu_pipeline.buffers.nbbo.nbo.length; 
  } else if (a_device_buffer = gpu_pipeline.device_nbbo_buffers.nbb) {
    sourceBuffer = gpu_pipeline.device_nbbo_buffers.nbb; fData = "nbbo_nbb";
    lengthBuffer = gpu_pipeline.buffers.nbbo.nbb.length; 
  } else if (a_device_buffer = gpu_pipeline.device_trades_buffers) {
    sourceBuffer = gpu_pipeline.device_trades_buffers; fData = "trades";
    lengthBuffer = gpu_pipeline.buffers.trades.price.length; 
  }
  const PRINT_N = printer.make_print_n(gpu_pipeline.verbose, "draw_ob.js->get_device_buffer(" + fData + "): ");
  PRINT_N(0, "  Begin looking for length " + lengthBuffer);
  const commandEncoder = gpu_pipeline.device.createCommandEncoder();
  commandEncoder.copyBufferToBuffer(
        sourceBuffer, // Your original GPU buffer
        sourceOffset, // Offset in the source buffer
        stagingBuffer,
        0, // Offset in the staging buffer
        bufferSize // Amount of data to copy
  );
  const commandBuffer = commandEncoder.finish();
  device.queue.submit([commandBuffer]);
  await stagingBuffer.mapAsync(GPUMapMode.READ);
  const copyArrayBuffer = stagingBuffer.getMappedRange(0, lengthBuffer * 4);
  const data = new Float32Array(copyArrayBuffer); // Or other appropriate typed array
  return(data);
    // Now 'data' contains the values from the GPU buffer
}
//      struct VS_Uniforms_0 {
//        tmin: f32, tmax: f32, 
//        pmin: f32, pmax: f32,
//        height: f32, width_height_aspect: f32,
//        lwd_h: f32, lwd_w: f32,
//        bs01: f32, max_qty: f32,
//        tfrac: f32, pfrac: f32,
//        pow: f32, t_c_min: f32,
//        trade_mul_fac:f32,msg_mul_fac:f32
function update_uniform_bs01_device_buffer(device, bs01, gpu_pipeline) {
  //buffers.uniform_buffer.set([bs01,0],8);
  if (!(gpu_pipeline.uniform_device_buffer)) {
    gpu_pipeline.uniform_device_buffer = device.createBuffer({ size: buffers.uniform_buffer.length * 4, 
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
    device.queue.writeBuffer(gpu_pipeline.uniform_device_buffer, 0, buffers.uniform_buffer);
  } else {
    device.queue.writeBuffer(gpu_pipeline.uniform_device_buffer, 8 * 4,
      buffers.uniform_buffer, 8, 2);
  }
}
function update_dynamic_uniform_window_device_buffer(device, gpu_pipeline) {
  if (!(buffers.wp)) { return(-1); }
  if (!(gpu_pipeline.dynamic_uniform_device_buffer)) {
    gpu_pipeline.dynamic_uniform_device_buffer = device.createBuffer({ size:  2 * 4 * (buffers.wp.nk+1),
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  }
  device.queue.writeBuffer(gpu_pipeline.dynamic_uniform_device_buffer, 0, buffers.wp.dynamic_uniform_buffer);
  return(1);
}
function update_uniform_window_device_buffer(device, data, bs01, gpu_pipeline) {
  PRINT_N(3, "update_uniform_window_device_buffer called");
  if (!(data)) {
    PRINT_N(-1, "ERROR - update_uniform_window_device_buffer() error no data.");
    return(-1);
  }
  if (!is_numeric(data.tmin)) {
    PRINT_N(-1, "ERROR - update_uniform_window_device_buffer() error no tmin data is invalid.");
    return(-1);
  }
  if (!(buffers.uniform_buffer)) {
    PRINT_N(3, "update_uniform_window_device_buffer initiating new uniform_Values of size " + uniform_buffer_size);
    renew_uniform_buffer(data, gpu_pipeline, device);
  }
  //buffers.uniform_buffer.set([bs01,data.max_qty],8);
  if (!(gpu_pipeline.uniform_device_buffer)) {
    gpu_pipeline.uniform_device_buffer = device.createBuffer({ size: buffers.uniform_buffer.length * 4, 
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  }
  device.queue.writeBuffer(gpu_pipeline.uniform_device_buffer, 0, buffers.uniform_buffer);
  return(1);
}
function renew_uniform_buffer(data, gpu_pipeline, device) {
  buffers.uniform_buffer = new Float32Array( uniform_buffer_size );
  fill_uniform_buffer(data, gpu_pipeline, device);
}
function fill_uniform_buffer(data, gpu_pipeline, device) {
  if (!is_numeric(data.tmin)) {
    console.log("ERROR fill_uniform_buffer: tmin not populated"); debugger;
  }
  // u0_tmin, u0_tmax, u0_pmin, u0_pmax
  buffers.uniform_buffer.set([data.tmin, data.tmax, data.pmin, data.pmax], 0);
  // u0_height, u0_rat, u0_lwd_h, u0_rat
  buffers.uniform_buffer.set([data.height, (data.width/data.height), data.lwd_h, (data.height)/(data.width) * data.lwd_h], 4);
  //buffers.uniform_buffer.set([data.height, data.width, data.lwd_h, 1.0 * data.lwd_h], 4);
  // min q, maxq, u0_tfrac,  tfrac2.
  buffers.uniform_buffer.set([0.0,data.max_qty,(2.0/data.origmult)/(data.tmax - data.tmin),2.0/(data.pmax-data.pmin)], 8); 
  buffers.uniform_buffer.set([data.pow_qty,data.tmin*data.origmult,data.trade_mul_fac,data.msg_mul_fac],12)
  if (!(gpu_pipeline)) {
    console.log("ERROR -- gpu_pipeline not found."); debugger;
  } else if (!(gpu_pipeline.uniform_device_buffer)) {
    gpu_pipeline.uniform_device_buffer = device.createBuffer({ size: buffers.uniform_buffer.length * 4, 
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  }
  device.queue.writeBuffer(gpu_pipeline.uniform_device_buffer, 0, buffers.uniform_buffer);
}
function create_vert_buffers(device) {
  buffers.triangle_vert_buffer =  new Float32Array( 2* triangle_verts_arrow.length) 
  buffers.nbbo_vert_buffer = new Float32Array( 2 * nbbo_verts.length)
  buffers.msg_vert_buffer = new Float32Array( 2 * msg_verts.length);
  for (let i=0;i < triangle_verts_arrow.length; i++) {
    buffers.triangle_vert_buffer.set(triangle_verts_arrow[i],i*2);
  }
  for (let i=0;i < nbbo_verts.length; i++) {
    buffers.nbbo_vert_buffer.set(nbbo_verts[i],i*2);
  }
  for (let i=0;i < msg_verts.length; i++) {
    buffers.msg_vert_buffer.set(msg_verts[i],i*2);
  }
}

function populate_device_verts_buffers(device, gpu_pipeline) {
  if (!(device)) {
    device = gpu_pipeline.device;
  }
  if (!(buffers.triangle_vert_buffer)) {
    create_vert_buffers(device);
  }
  if (!(buffers.triangle_vert_buffer)) {
    console.log("populate_device_verts_buffers -- we didn't populate triangle_vert_buffer yet?");
    debugger;
  }
  // Vertex buffers depend on the type of line we are plotting. NBBO is step contigous 
  //console.log("populate_device_verts_buffers -- we have triangle_verts of length " + triangle_verts.length);
  gpu_pipeline.triangle_vert_device_buffer = device.createBuffer({ 
    label: 'Triangle Vertex Locations',
    size: triangle_verts_arrow.length * 2 * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(gpu_pipeline.triangle_vert_device_buffer, 0, buffers.triangle_vert_buffer);

  gpu_pipeline.nbbo_vert_device_buffer = device.createBuffer({ 
    label: 'NBBO Vertex Locations',
    size: nbbo_verts.length * 2 * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(gpu_pipeline.nbbo_vert_device_buffer, 0, buffers.nbbo_vert_buffer);
  gpu_pipeline.msg_vert_device_buffer = device.createBuffer({ 
    label: 'Message Vertex Locations',
    size: msg_verts.length * 2 * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
  });
  device.queue.writeBuffer(gpu_pipeline.msg_vert_device_buffer, 0, buffers.msg_vert_buffer);
}
function update_buffers_wp(data, verbose_ob) {
  const PRINT_N = printer.make_print_n(verbose_ob, "draw_ob.js->update_buffers_wp(): ");
  const divit = 1.0 / Number(bigmult(data.unit));
  const bi_st0 = ((data.ps !== null) && (data.ps !== undefined) && (data.ps.bi_st0 !== undefined)) ? BigInt(data.ps.bi_st0) : 0n;
  const map_back_bi = ((x) => (divit * Number(x - bi_st0)));
  if ((!(!(data.ps))) && (data.ps.wpt !== null) && (data.ps.wpt.time !== null) && (data.ps.wpt.time.length > 0)) {
    // Note we have to convert both price and time into Float32.  Price is probably literal.
    //  Time conversion will be based on big int procedure
    buffers.wp = {};
    const n_days = Math.round(Number(data.ps.bi_st0)/(3600*24*1000000000));
    //console.log("looking for days."); debugger;
    const sub_days = BigInt(n_days * 3600 * 24 * 1000000000);
    if ((data.ps.bi_st0 === undefined) || (data.ps.bi_st0 === null) || (typeof(data.ps.bi_st0) !== 'bigint')) {
      console.log("Error, data.ps.bi_st0 is not a bigint."); debugger;
    }
    //console.log("Want to see how this works?"); debugger;
    if ((data.ps.wpt.time === null) ||  (data.ps.wpt.time === undefined) || (data.ps.wpt.time.length < 0)) {
      console.log("Error, data.ps.wpt time is null this shouldn't work."); debugger;
    } else if (typeof(data.ps.wpt.time[0]) !== 'bigint') {
      PRINT_N(-6, "ERROR data.ps.wpt.time is not type bigint.");
      debugger;
    }
    const mapped_ps_wt = data.ps.wpt.time.map(map_back_bi);
    buffers.wp.time = Float32Array.from(mapped_ps_wt);
    buffers.wp.nn = buffers.wp.time.length;
    buffers.wp.bv = []; buffers.wp.sv = [];
    buffers.wp.nr = data.ps.nr;  buffers.wp.nk = data.ps.wpt.v_b_p.length; buffers.wp.doplot=true;
    for (let ik = 0; ik < buffers.wp.nk; ik++) {
      buffers.wp.bv.push( Float32Array.from((data.ps.wpt.v_b_p[ik])));
      buffers.wp.sv.push( Float32Array.from((data.ps.wpt.v_s_p[ik])));
    }
    //buffers.wp.dynamic_uniform_buffer = new ArrayBuffer(2*4 * data.ps.v_b_wp.k.length);
    buffers.wp.dynamic_uniform_buffer = new ArrayBuffer(2*4 * (1+data.ps.wpt.v_b_p.length));
    // Extra Uniforms we reconfigure before redraw
    buffers.wp.u32_vw = new Uint32Array(buffers.wp.dynamic_uniform_buffer);
    buffers.wp.f32_vw = new Float32Array(buffers.wp.dynamic_uniform_buffer);
    buffers.wp.u32_vw[0] = buffers.wp.time.length; buffers.wp.u32_vw[1] = buffers.wp.nk;
    for (let ik = 0; ik < buffers.wp.nk; ik++) { 
      buffers.wp.u32_vw[(ik+1)*2] = ik * buffers.wp.time.length;  buffers.wp.f32_vw[(2*(ik+1)) + 1] = 1.0 - (ik / buffers.wp.nk);
    }
  } else if ((!(!(data.ps))) && ((!(!(data.ps.v_b_wp)))) && (data.ps.v_b_wp.k.length > 0))  {
    // Note we have to convert both price and time into Float32.  Price is probably literal.
    //  Time conversion will be based on big int procedure
    buffers.wp = {};
    const n_days = Math.round(Number(data.ps.v_time[0])/(3600*24*1000000000));
    //console.log("looking for days."); debugger;
    const sub_days = BigInt(n_days * 3600 * 24 * 1000000000);
    const divit = 1.0 / bigmult(data.unit);
    buffers.wp.time = Float32Array.from(data.ps.v_time, (val) => divit*Number(val-sub_days));
    buffers.wp.nn = buffers.wp.time.length;
    buffers.wp.bv = []; buffers.wp.sv = [];
    const nr = data.ps.nr;
    buffers.wp.nr = nr;  buffers.wp.nk = data.ps.v_b_wp.k.length; buffers.wp.doplot=true;
    for (let ik = 0; ik < buffers.wp.nk; ik++) {
      buffers.wp.bv.push( Float32Array.from((data.ps.v_b_wp.k[ik])[nr]));
      buffers.wp.sv.push( Float32Array.from((data.ps.v_s_wp.k[ik])[nr]));
    }
    //buffers.wp.dynamic_uniform_buffer = new ArrayBuffer(2*4 * data.ps.v_b_wp.k.length);
    buffers.wp.dynamic_uniform_buffer = new ArrayBuffer(2*4 * (1+data.ps.v_b_wp.k.length));
    // Extra Uniforms we reconfigure before redraw
    buffers.wp.u32_vw = new Uint32Array(buffers.wp.dynamic_uniform_buffer);
    buffers.wp.f32_vw = new Float32Array(buffers.wp.dynamic_uniform_buffer);
    buffers.wp.u32_vw[0] = buffers.wp.time.length; buffers.wp.u32_vw[1] = buffers.wp.nk;
    for (let ik = 0; ik < buffers.wp.nk; ik++) { 
      buffers.wp.u32_vw[(ik+1)*2] = ik * buffers.wp.time.length;  buffers.wp.f32_vw[(2*(ik+1)) + 1] = 1.0 - (ik / buffers.wp.nk);
    }
    //console.log("Done configuring buffers.wp inspect?"); debugger;
  } else {
    buffers.wp = null;
   }
}
function create_data_buffers(device, data, verbose_ob) { 
  const PRINT_N = printer.make_print_n(verbose_ob, "draw_ob.js->create_data_buffers(): ");
  const divit = 1.0 / Number(bigmult(data.unit));
  const bi_st0 = BigInt(data.ps.bi_st0);
  const map_back_bi = ((x) => (divit * Number(x - bi_st0)));
  const map_back = ((x) => (Number(x)));
  if ((!(!(data.nbbo))) && (data.nbbo.time.length > 0)) {
    const map_t = (typeof(data.nbbo.time[0]) == 'bigint') ? map_back_bi : map_back;
    buffers.nbbo =  {"time": new Float32Array( data.nbbo.time.length + 1),
                    "nbb": new Float32Array( data.nbbo.nbb.length + 1),
                    "nbo": new Float32Array( data.nbbo.nbo.length + 1)  }
    buffers.nbbo.time.set(data.nbbo.time.map(map_t), 0); 
    buffers.nbbo.nbb.set(data.nbbo.nbb, 0); 
    buffers.nbbo.nbo.set(data.nbbo.nbo, 0); 
    const nm1 = data.nbbo.time.length -1;
    buffers.nbbo.time.set([data.nbbo.time[nm1]].map(map_t), data.nbbo.time.length); 
    buffers.nbbo.nbb.set([data.nbbo.nbb[nm1]], data.nbbo.time.length); 
    buffers.nbbo.nbo.set([data.nbbo.nbo[nm1]], data.nbbo.time.length); 
  } else { buffers.nbbo = null; }
  if (!(!(data.buys)) && (data.buys.qty.length > 0)) {
    const b_ivsl = Math.ceil(data.buys.ivs.length / 4);
    buffers.buys =  {"price": new Float32Array( data.buys.price.length),
                       "qty": new Float32Array(   data.buys.qty.length),
                      "open": new Float32Array(  data.buys.open.length),
                     "close": new Float32Array( data.buys.close.length),
                        "ivs": new Int32Array( b_ivsl) }
    buffers.buys.price.set(data.buys.price, 0); 
    buffers.buys.qty.set(data.buys.qty, 0); 
    const map_t = (typeof(data.buys.open[0]) == 'bigint') ? map_back_bi : map_back;
    buffers.buys.open.set(data.buys.open.map(map_t), 0); 
    buffers.buys.close.set(data.buys.close.map(map_t), 0); 
    const allon = 1 + ( 1 << 8) + (1 << 16) + (1 << 24);
    buffers.buys.ivs.set(new Int32Array(b_ivsl).fill(allon),0);
  } else { buffers.buys=null; }
  if ((!(!(data.sells))) && (data.sells.price.length > 0)) {
    const s_ivsl = Math.ceil(data.sells.ivs.length /4 );
    buffers.sells =  {"price": new Float32Array( data.sells.price.length),
                        "qty": new Float32Array( data.sells.qty.length),
                       "open": new Float32Array( data.sells.open.length),
                      "close": new Float32Array( data.sells.close.length),
                         "ivs": new Int32Array( s_ivsl) }
    const map_t = (typeof(data.sells.open[0]) == 'bigint') ? map_back_bi : map_back;
    buffers.sells.price.set(data.sells.price, 0); 
    buffers.sells.qty.set(data.sells.qty, 0); 
    buffers.sells.open.set(data.sells.open.map(map_t), 0); 
    buffers.sells.close.set(data.sells.close.map(map_t), 0); 
    const allon = 1 + ( 1 << 8) + (1 << 16) + (1 << 24);
    buffers.sells.ivs.set(new Int32Array(s_ivsl).fill(allon),0);
  } else { buffers.sells = null; }

  if ((!(!(data.ps))) && (data.ps.wpt !== null) && (data.ps.wpt.time !== null) && (data.ps.wpt.time.length > 0)) {
    update_buffers_wp(data, verbose_ob);
  } else {
    buffers.wp = null;
  }

  if ((!(!(data.trades))) && (data.trades.time.length > 0)) {
    buffers.trades =  {"time": new Float32Array( data.trades.time.length),
                        "qty": new Float32Array( data.trades.qty.length),
                      "price": new Float32Array( data.trades.price.length)  }
    const map_t = (typeof(data.trades.time) == 'bigint') ? map_back_bi : map_back;
    buffers.trades.time.set(data.trades.time.map(map_t), 0); 
    buffers.trades.qty.set(data.trades.qty, 0); 
    buffers.trades.price.set(data.trades.price, 0); 
  } else { buffers.trades = null; }

}
function populate_device_data_wp_buffers(device, gpu_pipeline) {
   //console.log("populate_device_data_wp_buffers");
   //debugger;
   if ((buffers.wp === null) || (buffers.wp === undefined)) { console.log("populate_data_wp_buffers: Failed!"); return; }
   const lt = buffers.wp.time.length;  
   const lk = buffers.wp.bv.length;
   gpu_pipeline.device_wp_buffers = {
     'time': device.createBuffer({label: 'wp.time', size: lt * 4,
     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
     }),
     'bv': device.createBuffer({label: 'wp.bv', size: lt * 4 * lk,
     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
     }),
     'sv': device.createBuffer({label: 'wp.sv', size: lt * 4 * lk, 
     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
     }) };
     if (!(gpu_pipeline.device_wp_buffers.time)) {
       console.log("populate_device_data_buffers -- wp -- we have not created time element?");
       debugger;
     }
     device.queue.writeBuffer(gpu_pipeline.device_wp_buffers.time, 0, buffers.wp.time);
     for (let ik = 0; ik < buffers.wp.bv.length; ik++) {
       device.queue.writeBuffer(gpu_pipeline.device_wp_buffers.bv,  4 * lt * ik, buffers.wp.bv[ik]);
       device.queue.writeBuffer(gpu_pipeline.device_wp_buffers.sv, 4 * lt * ik, buffers.wp.sv[ik]);
     }

     update_dynamic_uniform_window_device_buffer(device, gpu_pipeline);
     //console.log("How did population work?");
     //debugger;
}
function populate_device_data_buffers(device, gpu_pipeline) {
   if (!(buffers.nbbo.time)) {
     console.log("populate_device_data_buffers:: might not work if buffers.nbbo.time is not populated.");
     debugger;
   }
   DEBUG && console.log("populate_device_data_buffers: Starting.");
   if ((buffers.nbbo !== null) && (buffers.nbbo !== undefined)) { 
   //const nd_values = new Float32Array(3*graph_nodes.length)
     gpu_pipeline.device_nbbo_buffers = {
      'time': device.createBuffer({label: 'nbbo.time', size: buffers.nbbo.time.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }),
      'nbb': device.createBuffer({label: 'nbbo.nbb', size: buffers.nbbo.nbb.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }),
      'nbo': device.createBuffer({label: 'nbbo.nbo', size: buffers.nbbo.nbo.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }) };
     if (!(gpu_pipeline.device_nbbo_buffers.time)) {
       console.log("populate_device_data_buffers -- we have not created time element?");
       debugger;
     }
     device.queue.writeBuffer(gpu_pipeline.device_nbbo_buffers.time, 0, buffers.nbbo.time);
     device.queue.writeBuffer(gpu_pipeline.device_nbbo_buffers.nbb, 0, buffers.nbbo.nbb);
     device.queue.writeBuffer(gpu_pipeline.device_nbbo_buffers.nbo, 0, buffers.nbbo.nbo);
   }
   if ((buffers.wp !== null) && (buffers.wp !== undefined)) {
     //console.log("Not populating wp buffer.");
     populate_device_data_wp_buffers(device, gpu_pipeline);
   }
   if ((buffers.buys !== null) && (buffers.buys != undefined)) {
   gpu_pipeline.device_buys_buffers = {
      'price': device.createBuffer({label: 'buys.price', size: buffers.buys.price.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }),
      'qty': device.createBuffer({label: 'buys.qty', size: buffers.buys.qty.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }),
      'open': device.createBuffer({label: 'buys.open', size: buffers.buys.open.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
      }),
      'close': device.createBuffer({label: 'buys.close', size: buffers.buys.close.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST}),
      'ivs': device.createBuffer({label: 'buys.ivs', size: buffers.buys.ivs.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST})
   };
   device.queue.writeBuffer(gpu_pipeline.device_buys_buffers.price, 0, buffers.buys.price);
   device.queue.writeBuffer(gpu_pipeline.device_buys_buffers.qty, 0, buffers.buys.qty);
   device.queue.writeBuffer(gpu_pipeline.device_buys_buffers.open, 0, buffers.buys.open);
   device.queue.writeBuffer(gpu_pipeline.device_buys_buffers.close, 0, buffers.buys.close);
   device.queue.writeBuffer(gpu_pipeline.device_buys_buffers.ivs, 0, buffers.buys.ivs);
   }
   if ((buffers.sells != null) && (buffers.sells != undefined) && (!(!(buffers.sells)))) {
   gpu_pipeline.device_sells_buffers = {
      'price': device.createBuffer({label: 'sells.price', size: buffers.sells.price.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST}),
      'qty': device.createBuffer({label: 'sells.qty', size: buffers.sells.qty.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST}),
      'open': device.createBuffer({label: 'sells.open', size: buffers.sells.open.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST}),
      'close': device.createBuffer({label: 'sells.close', size: buffers.sells.close.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST}),
      'ivs': device.createBuffer({label: 'sells.ivs', size: buffers.sells.ivs.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST})
   };
   device.queue.writeBuffer(gpu_pipeline.device_sells_buffers.price, 0, buffers.sells.price);
   device.queue.writeBuffer(gpu_pipeline.device_sells_buffers.qty, 0, buffers.sells.qty);
   device.queue.writeBuffer(gpu_pipeline.device_sells_buffers.open, 0, buffers.sells.open);
   device.queue.writeBuffer(gpu_pipeline.device_sells_buffers.close, 0, buffers.sells.close);
   device.queue.writeBuffer(gpu_pipeline.device_sells_buffers.ivs, 0, buffers.sells.ivs);
   }
   if ((buffers.trades != null) && (buffers.trades != undefined) && (!(!(buffers.trades))))  {
   gpu_pipeline.device_trades_buffers = {
      'time': device.createBuffer({label: 'trades.time', size: buffers.trades.time.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST}),
      'qty': device.createBuffer({label: 'trades.qty', size: buffers.trades.qty.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST}),
      'price': device.createBuffer({label: 'trades.price', size: buffers.trades.price.length * 4,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST}),
   };
   device.queue.writeBuffer(gpu_pipeline.device_trades_buffers.time, 0, buffers.trades.time);
   device.queue.writeBuffer(gpu_pipeline.device_trades_buffers.qty, 0, buffers.trades.qty);
   device.queue.writeBuffer(gpu_pipeline.device_trades_buffers.price, 0, buffers.trades.price);
   }
   DEBUG && console.log("populate_device_data_buffers() concluded.");
}
function create_nbbo_bindgroup(device,gpu_pipeline, nbb_or_nbo) {
  
  if (!(gpu_pipeline.device_nbbo_buffers)) {
    PRINT_N(-10, " ERROR create_nbbo_bindgroup we don't have device_nbbo_buffers yet."); debugger;
  } else if (!(gpu_pipeline.device_nbbo_buffers.time)) {
    PRINT_N(-10, " ERROR crete_nbbo_bindgroup we don't have time element yet."); debugger;
  }
  //console.log("Look for bindgroupLayout?");
  //debugger;
  if ((nbb_or_nbo == 'nbb')) {
    if ((gpu_pipeline.nbb_pipeline === null) || (gpu_pipeline.nbb_pipeline == undefined)){ return(null); }
  } else if ((nbb_or_nbo == 'nbo')) { 
    if ((gpu_pipeline.nbo_pipeline === null) || (gpu_pipeline.nbo_pipeline == undefined)) { return(null); }
  }
  const bindgrouplayout = ((nbb_or_nbo == 'nbb') ? gpu_pipeline.nbb_pipeline.getBindGroupLayout(0) :
                                                   gpu_pipeline.nbo_pipeline.getBindGroupLayout(0));
  const our_bindgroup = device.createBindGroup({
    label: nbb_or_nbo+ '_bindgroup',
    layout: bindgrouplayout, 
    entries: [
      { binding: 0, resource: { buffer: gpu_pipeline.device_nbbo_buffers.time }},
      { binding: 1, resource: { buffer: (nbb_or_nbo == 'nbb') ? gpu_pipeline.device_nbbo_buffers.nbb : gpu_pipeline.device_nbbo_buffers.nbo }},
      { binding: 2, resource: { buffer: gpu_pipeline.nbbo_vert_device_buffer}},
      { binding: 3, resource: { buffer: gpu_pipeline.uniform_device_buffer}}
    ],
  });
  //console.log("create_nodebindGroup -- writing nodebindGroup to buffer");
  return(our_bindgroup);
}


function create_wp_bindgroup(device,gpu_pipeline, bvorsv) {
  if (!(gpu_pipeline.device_wp_buffers)) {
    PRINT_N(-10, " ERROR create_wp_bindgroup we don't have device_wp_buffers yet."); debugger;
  } else if (!(gpu_pipeline.device_wp_buffers.time)) {
    PRINT_N(-10, " ERROR crete_wp_bindgroup we don't have time element yet."); debugger;
  }
  //console.log("Look for bindgroupLayout?");
  //debugger;
  const want_pipeline = (bvorsv == 'bv') ? "bv_pipeline" : "sv_pipeline";
  if ((gpu_pipeline[want_pipeline] === null) || (gpu_pipeline[want_pipeline] === undefined)){ return(null); }
  let bindgrouplayout = gpu_pipeline[want_pipeline].getBindGroupLayout(0);
  
  //console.log("going for wp_bindgroup");
  //debugger;
  const our_bindgroup = device.createBindGroup({
    label: bvorsv + '_bindgroup',
    layout: bindgrouplayout, 
    entries: [
      { binding: 0, resource: { buffer: gpu_pipeline.device_wp_buffers.time }},
      { binding: 1, resource: { buffer: (bvorsv=="bv") ? gpu_pipeline.device_wp_buffers.bv : gpu_pipeline.device_wp_buffers.sv }},
      { binding: 2, resource: { buffer: gpu_pipeline.nbbo_vert_device_buffer}},
      { binding: 3, resource: { buffer: gpu_pipeline.uniform_device_buffer}},
      { binding: 4, resource: { buffer: gpu_pipeline.dynamic_uniform_device_buffer}}
    ],
  });
  //console.log("create_nodebindGroup -- writing nodebindGroup to buffer");
  return(our_bindgroup);
}

function create_buys_bindgroup(device,gpu_pipeline) {
  if ((gpu_pipeline.buys_pipeline === null) || (gpu_pipeline.buys_pipeline === undefined)) { return(null); }
  const our_bindgroup = device.createBindGroup({
    label: 'buys_bindgroup',
    layout: gpu_pipeline.buys_pipeline.getBindGroupLayout(1),
    entries: [
      { binding: 0, resource: { buffer: gpu_pipeline.device_buys_buffers.price }},
      { binding: 1, resource: { buffer: gpu_pipeline.device_buys_buffers.qty }},
      { binding: 2, resource: { buffer: gpu_pipeline.device_buys_buffers.open }},
      { binding: 3, resource: { buffer: gpu_pipeline.device_buys_buffers.close }},
      { binding: 4, resource: { buffer: gpu_pipeline.device_buys_buffers.ivs }},
      { binding: 5, resource: { buffer: gpu_pipeline.msg_vert_device_buffer}},
      { binding: 6, resource: { buffer: gpu_pipeline.uniform_device_buffer}}
    ],
  });
  //console.log("create_nodebindGroup -- writing nodebindGroup to buffer");
  return(our_bindgroup);
}

function create_sells_bindgroup(device,gpu_pipeline) {
  if ((gpu_pipeline.sells_pipeline === null) || (gpu_pipeline.sells_pipeline === undefined)) { return(null); }
  const our_bindgroup = device.createBindGroup({
    label: 'sells_bindgroup',
    layout: gpu_pipeline.sells_pipeline.getBindGroupLayout(2),
    entries: [
      { binding: 0, resource: { buffer: gpu_pipeline.device_sells_buffers.price }},
      { binding: 1, resource: { buffer: gpu_pipeline.device_sells_buffers.qty }},
      { binding: 2, resource: { buffer: gpu_pipeline.device_sells_buffers.open }},
      { binding: 3, resource: { buffer: gpu_pipeline.device_sells_buffers.close }},
      { binding: 4, resource: { buffer: gpu_pipeline.device_sells_buffers.ivs }},
      { binding: 5, resource: { buffer: gpu_pipeline.msg_vert_device_buffer}},
      { binding: 6, resource: { buffer: gpu_pipeline.uniform_device_buffer}}
    ],
  });
  //console.log("create_nodebindGroup -- writing nodebindGroup to buffer");
  return(our_bindgroup);
}

function create_trades_bindgroup(device,gpu_pipeline) {
  if ((gpu_pipeline.trades_pipeline === null) || (gpu_pipeline.trades_pipeline === undefined)) { return(null); }
  const our_bindgroup = device.createBindGroup({
    label: 'trades_bindgroup',
    layout: gpu_pipeline.trades_pipeline.getBindGroupLayout(3),
    entries: [
      { binding: 0, resource: { buffer: gpu_pipeline.device_trades_buffers.time }},
      { binding: 1, resource: { buffer: gpu_pipeline.device_trades_buffers.qty }},
      { binding: 2, resource: { buffer: gpu_pipeline.device_trades_buffers.price }},
      { binding: 3, resource: { buffer: gpu_pipeline.triangle_vert_device_buffer}},
      { binding: 4, resource: { buffer: gpu_pipeline.uniform_device_buffer}}
    ],
  });
  //console.log("create_nodebindGroup -- writing nodebindGroup to buffer");
  return(our_bindgroup);
}
function Clear_Screen_RenderPass() {
 const renderPassDescriptor = {
  label: 'White Background RenderPass',
   colorAttachments: [ {
     clearValue: [.9, .9, .9, 1], loadOp: 'clear', storeOp: 'store'}],
  };  
  return(renderPassDescriptor);
}
const blank_main = function(gpucontext, device) {
  //console.log("gpunet.js -- GPUNetRender():  We are starting");
  const texture = gpucontext.getCurrentTexture();
  const view = texture.createView(); 
  const encoder = device.createCommandEncoder({ label: 'GPUNet encoder generated to do render pass' });
  const blank_rpd = Clear_Screen_RenderPass();
  blank_rpd.colorAttachments[0].view =
        gpucontext.getCurrentTexture().createView();
  const pass_encoder = encoder.beginRenderPass(blank_rpd);
  pass_encoder.end();
  const command_buffer = encoder.finish();
  device.queue.submit([command_buffer]);
}
function ob_gpu_render(gpu_pipeline, do_plots) {
  DEBUG && PRINT_N(1, "ob_gpu_render  start.");
  const device = gpu_pipeline.device;
  const encoder = device.createCommandEncoder({ label: 'ob_gpu_render: create encoder' });

  if (!(gpu_pipeline.device_nbbo_buffers)) {
    PRINT_N(-6, "ob_gpu_render:: intitiating device_nbbo_buffers?");
    populate_device_data_buffers(gpu_pipeline.device, gpu_pipeline);
  }
  if (!(gpu_pipeline.device_buys_buffers)) {
    PRINT_N(-6, "ob_gpu_render:: intitiating device_nbbo_buffers?");
    populate_device_data_buffers(gpu_pipeline.device, gpu_pipeline);
    PRINT_N(1, "ob_gpu_render() emergency call for buy buffers.");
  }
  if (!(gpu_pipeline.device_nbbo_buffers)) {
    PRINT_N(-6, "ob_gpu_render:: We failed to populate the buffers.");
    debugger;
  }
  if (!(gpu_pipeline.device_nbbo_buffers.time)) {
    PRINT_N(-6, "ob_gpu_render:: we don't have a time buffer.");
    debugger;
  }
  // Create pipelines once, render pass every time;
  const rpd = renderPassDesc;
  if (!(rpd)) {
    PRINT_N(-6, "ob_gpu_render -- errors rpd is still null"); debugger;
  } 
  if (!(gpu_pipeline.context)) {
    PRINT_N(-6, "ob_gpu_render -- we have that gpu_pipeline.context is null"); debugger;
  }
  rpd.canvasTexture = gpu_pipeline.context.getCurrentTexture()
  rpd.colorAttachments[0].view = rpd.canvasTexture.createView();
  if (!(gpu_pipeline.uniform_device_buffer)) {
    gpu_pipeline.uniform_device_buffer = update_uniform_window_device_buffer(gpu_pipeline.device, data, bs01, gpu_pipeline) 
  }
  if (!(gpu_pipeline.dynamic_uniform_device_buffer)) {
    gpu_pipeline.dynamic_uniform_device_buffer = update_dynamic_uniform_window_device_buffer(gpu_pipeline.device, gpu_pipeline) 
  }
  //const node_pipeline = gpu_pipeline.node_pipeline; 
  //const edge_pipeline=gpu_pipeline.edge_pipeline;
  //console.log("Create nbbo_bindgroup");
  const nbb_bindgroup = create_nbbo_bindgroup(gpu_pipeline.device, gpu_pipeline,'nbb');
  const nbo_bindgroup = create_nbbo_bindgroup(gpu_pipeline.device, gpu_pipeline,'nbo');

  // Note for ultra efficiency we are suppoed to create 3 bind groups, seems remarkably difficult.
  const bv_bindgroup =  (buffers.wp !== null) ? create_wp_bindgroup(gpu_pipeline.device, gpu_pipeline, "bv") : null;
  const sv_bindgroup = (buffers.wp !== null) ? create_wp_bindgroup(gpu_pipeline.device, gpu_pipeline, "sv") : null; 
  //let bv_bindgroups = []; let sv_bindgroups = [];
  //for (let ik = 0; ik < buffers.wp.nk; ik++) {
  //  buffers.wp.u32_vw[0] = ik * buffers.wp.nn; buffers.wp.f32_vw[1] = 1.0 - (ik / buffers.wp.nk);
  //  device.queue.writeBuffer(gpu_pipeline.uniform_device_buffer, ioffset_loc * 4, buffers.wp.add_data_buffer);
  //  bv_bindgroups.push(create_wp_bindgroup(gpu_pipeline.device, gpu_pipeline, "bv"));
  //  sv_bindgroups.push(create_wp_bindgroup(gpu_pipeline.device, gpu_pipeline, "sv"));
  //}
  //const bv_bindgroup = ((false) && (buffers.wp !== null)) ? create_wp_bindgroup(gpu_pipeline.device, gpu_pipeline, "bv") : null;
  //const sv_bindgroup = ((false) && (buffers.wp !== null)) ? create_wp_bindgroup(gpu_pipeline.device, gpu_pipeline, "sv") : null; 
  DEBUG && PRINT_N(1, " creating buys_bindgroup.");
  const buys_bindgroup = create_buys_bindgroup(gpu_pipeline.device, gpu_pipeline);
  const sells_bindgroup = create_sells_bindgroup(gpu_pipeline.device, gpu_pipeline);
  const trades_bindgroup = create_trades_bindgroup(gpu_pipeline.device, gpu_pipeline);
  //console.log("create encoder Render pass from rpd"); 
  const render_pass = encoder.beginRenderPass(rpd);
  //update_uniform_bs01_device_buffer(device,0,gpu_pipeline);
  //console.log(" set pipeline with gpu_pipeline.nbbo_pipeline");

  if (!(!(gpu_pipeline.buys_pipeline)) && (do_plots.do_quotes==true)) {
  render_pass.setPipeline(gpu_pipeline.buys_pipeline);
  render_pass.setBindGroup(1, buys_bindgroup);
  render_pass.draw(msg_verts.length, buffers.buys.price.length);
  }
  if (!(!(gpu_pipeline.sells_pipeline)) && (do_plots.do_quotes==true)) {
  render_pass.setPipeline(gpu_pipeline.sells_pipeline);
  render_pass.setBindGroup(2, sells_bindgroup);
  render_pass.draw(msg_verts.length, buffers.sells.price.length);
  }
  if (!(!(gpu_pipeline.nbb_pipeline)) && (do_plots.do_nbbo==true)) {
    render_pass.setPipeline(gpu_pipeline.nbb_pipeline);
    //console.log(" set bind group with nbbo bindgroup");
    render_pass.setBindGroup(0, nbb_bindgroup);
    //console.log(" call draw buffers.");
    render_pass.draw(nbbo_verts.length, buffers.nbbo.time.length-1);  // call our vertex shader 3 times (if function is (3))
  }
  if (!(!(gpu_pipeline.nbo_pipeline)) && (do_plots.do_nbbo == true)) {
  //console.log(" update to call bs01=1 buffers");
  render_pass.setPipeline(gpu_pipeline.nbo_pipeline);
  render_pass.setBindGroup(0, nbo_bindgroup);
  //console.log(" Last Call, length [" + nbbo_verts.length + "," + buffers.nbbo.time.length + "]");
  render_pass.draw(nbbo_verts.length, buffers.nbbo.time.length-1);  // call our vertex shader 3 times (if function is (3))
  }
  if ((buffers.wp !== null) && (buffers.wp.doplot=true) && (do_plots.do_wp==true)) {
    // We take bv pipeline and draw line if instructed.
    //console.log(" update to call bs01=1 buffers");
    render_pass.setPipeline(gpu_pipeline.bv_pipeline);
    render_pass.setBindGroup(0, bv_bindgroup);
    render_pass.draw(nbbo_verts.length, buffers.wp.nn * buffers.wp.nk);  // call our vertex shader 3 times (if function is (3))
    render_pass.setPipeline(gpu_pipeline.sv_pipeline);
    render_pass.setBindGroup(0, sv_bindgroup);
    render_pass.draw(nbbo_verts.length, (buffers.wp.nn * buffers.wp.nk));  // call our vertex shader 3 times (if function is (3))
    buffers.wp.doplot = false;
  }
  if ((true) && (!(!(gpu_pipeline.trades_pipeline))) && (do_plots.do_trades == true)) {
  render_pass.setPipeline(gpu_pipeline.trades_pipeline);
  render_pass.setBindGroup(3, trades_bindgroup);
  render_pass.draw(triangle_verts_arrow.length, buffers.trades.price.length);
  DEBUG && PRINT_N(6, "buffers.trades.price has length " + buffers.trades.price.length);
  }
  render_pass.end();
  //console.log(" Trying to finish commandBuffer.");
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
  DEBUG && PRINT_N(3, "ob_gpu_render, we have submitted buffer and are complete");
  //debugger;
  return({"ob_gpu_object":"running_widget"});
} 

exports = {'buffers':buffers, "populate_device_data_buffers":populate_device_data_buffers, "create_data_buffers":create_data_buffers,
   "data_nbbo_module":data_nbbo_module, "data_buys_module":data_buys_module, "data_bv_module":data_bv_module, "data_sv_module":data_sv_module,
   "update_uniform_bs01_device_buffer":update_uniform_bs01_device_buffer,"update_uniform_window_device_buffer":update_uniform_window_device_buffer,
   "create_vert_buffers":create_vert_buffers,
   "fill_uniform_buffer":fill_uniform_buffer,"renew_uniform_buffer":renew_uniform_buffer,
   "populate_device_verts_buffers":populate_device_verts_buffers, 
   "generate_individual_pipeline":generate_individual_pipeline, "generate_gpu_renderPassDescriptor":generate_gpu_renderPassDescriptor,
   "createDepthTextureDesc":createDepthTextureDesc, "blank_main":blank_main,
   "OB_generate_gpu_pipeline":OB_generate_gpu_pipeline, "ob_gpu_render":ob_gpu_render, "get_device_buffer":get_device_buffer,
   "data_nbb_module":data_nbb_module, "data_nbo_module":data_nbo_module, 'update_buffers_wp':update_buffers_wp
}
module.exports = exports;

