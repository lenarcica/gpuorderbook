// draw_ob.js
//
// 2025-10-13
//
// The WebGPU mustering operations are contained here.  Unfortunately WebGPU creates
// significant overhead in devising pipelines from modules/buffers/Redner descriptions etc...
// and it can be difficult to remember the order of operations or purposes of these items.

const printer = require("./printer.js");
const is_numeric = printer.is_numeric;
var PRINT_N = printer.my_printer(1,"draw_ob:");

var buffers = {uniform_buffer:null,nbbo:null,buys:null,sells:null,trades:null};
var device_buffers = null;
var renderPassDescriptor = null;
var presentationFormat = null;
var renderPassDesc = null;
var gpu_renderPass_colorAttachment = null;
// PipelineGeneration
function generate_gpu_renderPassDescriptor() {
  renderPassDesc = {
    label: 'ob canvas based renderPass',
    colorAttachments: [
      { view: 0, clearValue: [0.9, 0.9, 0.9, 1],
        loadOp: 'clear', storeOp: 'store',
      },
    ]
    //,  // We don't need depth in 2D
    //depthStencilAttachment: {
    //depthClearValue: 1.0, depthLoadOp: 'clear', depthStoreOp: 'store',
    //}
  };  
  return(renderPassDesc);
}
/**
function populate_gpu_pipeline(gpu_pipeline, gpu_context, adapter, device, a_obwidget) {
  const verbose = a_obwidget.verbose;
  const PRINT_N = printer.my_printer(verbose, "populate_gpu_pipeline()");
  if ((!(gpu_pipeline)) || (!(gpu_pipeline.nbbo_pipeline))) {
    PRINT_N(1, " Reconstructing gpu pipeline");
    const module_nbbo = generate_gpu_module(device, data_module_nbbo, verbose);
    const module_buys = generate_gpu_module(device, data_module_buys, verbose);
    gpu_pipeline = {
       device:device, adapter:adapter,
       module_nbbo: module_nbbo, module_buys:module_buys, 
       nbbo_pipeline: generate_inividual_pipeline(device, module_nbbo, verbose, "nbbo_pipeline"),
       buys_pipeline: generate_inividual_pipeline(device, module_buys, verbose, "buys_pipeline"),
       context: gpu_context,
       encoder: null
    }
    fill_uniform_buffer(a_obwidget.data, gpu_pipeline) 
    populate_device_verts_buffers(device, gpu_pipeline)
    update_uniform_device_buffer(device,new_pj, gpu_pipeline) 
    
  }
  return(gpu_pipeline);
}
**/
function generate_individual_pipeline( device, module, verbose, what_pipeline) {
  const vstr = "draw_ob.js->generate_gpu_renderPipeline(" + what_pipeline + "): ";
  const PRINT_N = printer.my_printer(verbose, vstr);
  PRINT_N(1,"-- initiated");
  presentationFormat = navigator.gpu.getPreferredCanvasFormat();
  PRINT_N(1," -- Creating the pipeline");
  //const positionBufferLayoutDesc = createDepthTextureDesc(device, a_gpuwidget, what_pipeline) 
  //console.log(InitT + "-- DepthTextureDesc was created supplying back in pipeline about to call createRenderPipeline -- ");
  const individual_pipeline = device.createRenderPipeline({
    label: 'obwidget pipeline: ' + what_pipeline,
    layout: 'auto',  vertex: { module:module },
    fragment: { module, entryPoint: "fs",
                targets: [{ format: presentationFormat }]}
    //primitive: { cullMode: 'back' },
    //depthStencil: {  depthWriteEnabled: true,
    // depthCompare: 'less', format: 'depth24plus' } 
  });
  PRINT_N(1,"-- pipeline was generated with createRenderPipeline -- all concluded.");
  return(individual_pipeline);
}
function createDepthTextureDesc(device, a_obwidget, what_depth_texture) {
  const vstr = "draw_ob.js->createDepthTextureDesc(" + what_depth_texture + "): ";
  const PRINT_N = printer.my_printer(verbose, vstr);
  PRINT_N(1, "-- we have called just initiated " + what_depth_texture);
  const colorTexture = a_obwidget.canvas_gpu.getCurrentTexture();
  const colorTextureView = colorTexture.createView();
  console.log(InitT + "-- We created a color Texture.");
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
  PRINT_N(1,"-- We have a renderPassDesc generated");
   return({renderPassDesc:renderPassDesc, 
           //depthAttachment:depthAttachment, 
           colorAttachment:gpu_renderPass_colorattachment,
           colorTextureView:colorTextureView})
}
function generate_gpu_module(device, module_data, verbose) {
  const PRINT_N = printer.my_printer(verbose,
   "draw_ob.js->generate_gpu_module(" + module_data.label + "): ");
  PRINT_N(1, "  intiating generation of the module");
  const module = device.createShaderModule({
    label: module_data.label, code: module_data.code });
  PRINT_N(1, "  conclused generation of the module");
  return(module);
}
function OB_generate_gpu_pipeline(gpu_pipeline, gpu_context, adapter, device, a_obwidget) {
  const vstr = "draw_ob.js->OB_generate_gpu_pipeline(): ";
  const verbose = a_obwidget.verbose;
  const PRINT_N = printer.my_printer(verbose, vstr);
  generate_gpu_renderPassDescriptor();
  if (!(device)) {
    PRINT_N(-1, "OB_generate_gpu_pipeline -- error device is null");
    debugger;
  }
  if ((!buffers.uniform_buffer) || (!(buffers.nbbo.time))) {
    create_data_buffers(device, a_obwidget.data)
  }
  if (!(buffers.nbbo.time)) {
    PRINT_N(-1, "OB_generate_gpu_pipeline -- error buffers has not populated nbbo vector.");
  }
  if (!(buffers.triangle_vert_buffer)) {
    create_vert_buffers(device);
  }
  if (!(buffers.triangle_vert_buffer)) {
    PRINT_N(-1, "OB_generate_gpu_pipeline -- error, verts buffers was not generated.");
  }
  if ( (!(gpu_pipeline))  || (!(gpu_pipeline.data_pipeline) )) {
    PRINT_N(1," OB_generate_gpu_pipleine initiate module generation");
    const module_nbbo = generate_gpu_module(device, data_nbbo_module, verbose);
    const module_nbb = generate_gpu_module(device, data_nbb_module, verbose);
    const module_nbo = generate_gpu_module(device, data_nbo_module, verbose);
    const module_buys = generate_gpu_module(device, data_buys_module,verbose);
    const module_sells = generate_gpu_module(device, data_sells_module,verbose);
    const module_trades = generate_gpu_module(device, data_trades_module, verbose);
    PRINT_N(1, " OB_generate_gpu_pipeline: we made a module_nbbo");
    //const module_buys = generate_gpu_module(device, draw_buys_module, verbose);
    //const module_sells= generate_gpu_module(device, draw_sells_module, verbose);
    PRINT_N(1, "-- now generating pipeline");
    gpu_pipeline = {
       device:device, adapter:adapter,
       module_nbbo: module_nbbo, 
       //module_buys:module_buys, mnodule_sells:module_sells
       nbbo_pipeline: generate_individual_pipeline( device, module_nbbo, verbose, "nbbo_pipeline"),
       nbb_pipeline: generate_individual_pipeline( device, module_nbb, verbose, "nbb_pipeline"),
       nbo_pipeline: generate_individual_pipeline( device, module_nbo, verbose, "nbo_pipeline"),
       buys_pipeline: generate_individual_pipeline(device, module_buys, verbose, "buys_pipeline"),
       sells_pipeline: generate_individual_pipeline(device, module_sells, verbose, "sells_pipeline"),
       trades_pipeline: generate_individual_pipeline(device, module_trades, verbose, "trades_pipeline"),
       buffers: buffers,
       verbose: a_obwidget.verbose,
       context: gpu_context,
       encoder: null,
    }
    PRINT_N(1, "update uniform window device buffer");
    if (!(a_obwidget.data)) {
      PRINT_N(-1, "ERROR OB_generate_gpu_pipeline, data is not populated"); debugger;
    } else if (!is_numeric(a_obwidget.going.tmin)) {
      PRINT_N(-1, "ERROR OB_generate_gpu_pipeline, data does not contain tmin?"); debugger;
    }
    update_uniform_window_device_buffer(device, a_obwidget.data, 0, gpu_pipeline)
    PRINT_N(1, "updating the vertex buffers");
    populate_device_verts_buffers(device, gpu_pipeline);
    PRINT_N(1, "update the device data buffers");
    populate_device_data_buffers(device, gpu_pipeline);
  } else {
    PRINT_N(1, " -- don't need to re-initiate, material is here.");
    update_uniform_window_device_buffer(device, a_obwidget.data, 0, gpu_pipeline)
  }
  return(gpu_pipeline); 
}

const nbbo_verts = [ 
   [0,1],[0,-1],[1,1],[0,-1],[1,1],[1,-1],
   [1,-1],[1,2],[2,2],[1,-1],[2,-1],[2,2]];

const msg_verts = [
   [0,1],[0,-1],[1,1],[0,-1],[1,1],[1,-1] ];
const default_uniforms = [
  [0,50,20,30,500,1000,.005,(500/1000) * .005, 0, 1.0/(50.0), 1.0 / (10.0)]];
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
const nbbo_module_header_code = `

`
function create_nbbo_data_module_code( nbb_or_nbo_code, which_color_code) {
   console.log("create_nbbo_data_module_code about to write tagged code with nbb_or_nbo_code = " + nbb_or_nbo_code)
   const code= `
     ${VS_Uniforms_struct_code}
     ${nbbo_group_bindings_code}
     ${VertexOut_struct_code}
     @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      //) -> @builtin(position) vec4f {
      ) -> VertexOut {
      let nbb0:f32 = nbb[0];  let nbo0:f32 = nbo[0];
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

const blue_level_text = `
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
`

const red_level_text = `
      if (qty_level <= .33) {
         output.color = (1.0/.33) * ((.33-qty_level) * vec4f(216.0/256.0,173.0/256.0,1.0,1.0) +
                                     (qty_level) * vec4f(230.0/256.0, 216.0/256.0,173.0/256.0,1.0));
      } else if (qty_level <= .67) {
         output.color = (1.0/.34) * ( (.67-qty_level) * vec4f(230.0/256.0, 216.0/256.0, 173.0/256.0,1.0) +
                                      (qty_level-.33) * vec4f(237.0/256.0, 149.0/256.0, 100.0/256.0,1.0));
      } else if (qty_level <= .5) {
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
      @group(${bg}) @binding(4) var<storage, read>  msg_lineloc: array<f32>;
      @group(${bg}) @binding(5) var<uniform> u0: VS_Uniforms_0;
     
     ${VertexOut_struct_code}
     @vertex fn vs(
        @builtin(vertex_index) vertexIndex : u32,
        @builtin(instance_index) instanceIndex: u32
      //) -> @builtin(position) vec4f {
      ) -> VertexOut {
      let locx: f32 = msg_lineloc[vertexIndex*2];
      let locy: f32 = msg_lineloc[vertexIndex*2 + 1];
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
  const PRINT_N = printer.my_printer(gpu_pipeline.verbose, "draw_ob.js->get_device_buffer(" + fData + "): ");
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
function update_uniform_window_device_buffer(device, data, bs01, gpu_pipeline) {
  PRINT_N(3, "update_uniform_window_device_buffer called");
  if ((!(data)) || (!is_numeric(data.tmin))) {
    PRINT_N(-1, "ERROR - update_uniform_window_device_buffer() error no data");
    debugger;
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
}
function renew_uniform_buffer(data, gpu_pipeline, device) {
  buffers.uniform_buffer = new Float32Array( uniform_buffer_size );
  fill_uniform_buffer(data, gpu_pipeline, device);
}
function fill_uniform_buffer(data, gpu_pipeline, device) {
  if (!is_numeric(data.tmin)) {
    console.log("ERROR fill_uniform_buffer: tmin not populated"); debugger;
  }
  buffers.uniform_buffer.set([data.tmin, data.tmax, data.pmin, data.pmax], 0);
  buffers.uniform_buffer.set([data.height, (data.width/data.height), data.lwd_h, (data.height)/(data.width) * data.lwd_h], 4);
  //buffers.uniform_buffer.set([data.height, data.width, data.lwd_h, 1.0 * data.lwd_h], 4);
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
function create_data_buffers(device, data) { 
  if (!(!(data.nbbo))) {
    buffers.nbbo =  {"time": new Float32Array( data.nbbo.time.length + 1),
                    "nbb": new Float32Array( data.nbbo.nbb.length + 1),
                    "nbo": new Float32Array( data.nbbo.nbo.length + 1)  }
    buffers.nbbo.time.set(data.nbbo.time, 0); 
    buffers.nbbo.nbb.set(data.nbbo.nbb, 0); 
    buffers.nbbo.nbo.set(data.nbbo.nbo, 0); 
    buffers.nbbo.time.set([data.nbbo.time[data.nbbo.time.length-1]], data.nbbo.time.length); 
    buffers.nbbo.nbb.set([data.nbbo.nbb[data.nbbo.time.length-1]], data.nbbo.time.length); 
    buffers.nbbo.nbo.set([data.nbbo.nbo[data.nbbo.time.length-1]], data.nbbo.time.length); 
  } else { buffers.nbbo = null; }
  if (!(!(data.buys))) {
    buffers.buys =  {"price": new Float32Array( data.buys.price.length),
                       "qty": new Float32Array(   data.buys.qty.length),
                      "open": new Float32Array(  data.buys.open.length),
                     "close": new Float32Array( data.buys.close.length) }
    buffers.buys.price.set(data.buys.price, 0); 
    buffers.buys.qty.set(data.buys.qty, 0); 
    buffers.buys.open.set(data.buys.open, 0); 
    buffers.buys.close.set(data.buys.close, 0); 
  } else { buffers.buys=null; }
  if (!(!(data.sells))) {
    buffers.sells =  {"price": new Float32Array( data.sells.price.length),
                        "qty": new Float32Array( data.sells.qty.length),
                       "open": new Float32Array( data.sells.open.length),
                      "close": new Float32Array( data.sells.close.length) }
    buffers.sells.price.set(data.sells.price, 0); 
    buffers.sells.qty.set(data.sells.qty, 0); 
    buffers.sells.open.set(data.sells.open, 0); 
    buffers.sells.close.set(data.sells.close, 0); 
  } else { buffers.sells = null; }

  if (!(!(data.trades))) {
    buffers.trades =  {"time": new Float32Array( data.trades.time.length),
                        "qty": new Float32Array( data.trades.qty.length),
                      "price": new Float32Array( data.trades.price.length)  }
    buffers.trades.time.set(data.trades.time, 0); 
    buffers.trades.qty.set(data.trades.qty, 0); 
    buffers.trades.price.set(data.trades.price, 0); 
  } else { buffers.trades = null; }

}
function populate_device_data_buffers(device, gpu_pipeline) {
   if (!(buffers.nbbo.time)) {
     console.log("populate_device_data_buffers:: might not work if buffers.nbbo.time is not populated.");
     debugger;
   }
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
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST})
   };
   device.queue.writeBuffer(gpu_pipeline.device_buys_buffers.price, 0, buffers.buys.price);
   device.queue.writeBuffer(gpu_pipeline.device_buys_buffers.qty, 0, buffers.buys.qty);
   device.queue.writeBuffer(gpu_pipeline.device_buys_buffers.open, 0, buffers.buys.open);
   device.queue.writeBuffer(gpu_pipeline.device_buys_buffers.close, 0, buffers.buys.close);
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
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST})
   };
   device.queue.writeBuffer(gpu_pipeline.device_sells_buffers.price, 0, buffers.sells.price);
   device.queue.writeBuffer(gpu_pipeline.device_sells_buffers.qty, 0, buffers.sells.qty);
   device.queue.writeBuffer(gpu_pipeline.device_sells_buffers.open, 0, buffers.sells.open);
   device.queue.writeBuffer(gpu_pipeline.device_sells_buffers.close, 0, buffers.sells.close);
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
      { binding: 1, resource: { buffer: gpu_pipeline.device_nbbo_buffers.nbb }},
      { binding: 2, resource: { buffer: gpu_pipeline.device_nbbo_buffers.nbo }},
      { binding: 3, resource: { buffer: gpu_pipeline.nbbo_vert_device_buffer}},
      { binding: 4, resource: { buffer: gpu_pipeline.uniform_device_buffer}}
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
      { binding: 4, resource: { buffer: gpu_pipeline.msg_vert_device_buffer}},
      { binding: 5, resource: { buffer: gpu_pipeline.uniform_device_buffer}}
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
      { binding: 4, resource: { buffer: gpu_pipeline.msg_vert_device_buffer}},
      { binding: 5, resource: { buffer: gpu_pipeline.uniform_device_buffer}}
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
function ob_gpu_render(gpu_pipeline) {
  PRINT_N(2, "ob_gpu_render  start.");
  const device = gpu_pipeline.device;
  const encoder = device.createCommandEncoder({ label: 'ob_gpu_render: create encoder' });

  if (!(gpu_pipeline.device_nbbo_buffers)) {
    console.log("ob_gpu_render:: intitiating device_nbbo_buffers?");
    populate_device_data_buffers(gpu_pipeline.device, gpu_pipeline);
  }
  if (!(gpu_pipeline.device_buys_buffers)) {
    console.log("ob_gpu_render:: intitiating device_nbbo_buffers?");
    populate_device_data_buffers(gpu_pipeline.device, gpu_pipeline);
  }
  if (!(gpu_pipeline.device_nbbo_buffers)) {
    console.log("ob_gpu_render:: We failed to populate the buffers.");
    debugger;
  }
  if (!(gpu_pipeline.device_nbbo_buffers.time)) {
    console.log("ob_gpu_render:: we don't have a time buffer.");
    debugger;
  }
  // Create pipelines once, render pass every time;
  const rpd = renderPassDesc;
  if (!(rpd)) {
    console.log("ob_gpu_render -- errors rpd is still null"); debugger;
  } 
  if (!(gpu_pipeline.context)) {
    console.log("ob_gpu_render -- we have that gpu_pipeline.context is null"); debugger;
  }
  rpd.canvasTexture = gpu_pipeline.context.getCurrentTexture()
  rpd.colorAttachments[0].view = rpd.canvasTexture.createView();
  if (!(gpu_pipeline.uniform_device_buffer)) {
    gpu_pipeline.uniform_device_buffer = update_uniform_device_buffer(gpu_pipeline.device, gpu_pipeline) 
  }
  //const node_pipeline = gpu_pipeline.node_pipeline; 
  //const edge_pipeline=gpu_pipeline.edge_pipeline;
  //console.log("Create nbbo_bindgroup");
  const nbb_bindgroup = create_nbbo_bindgroup(gpu_pipeline.device, gpu_pipeline,'nbb');
  const nbo_bindgroup = create_nbbo_bindgroup(gpu_pipeline.device, gpu_pipeline,'nbo');
  const buys_bindgroup = create_buys_bindgroup(gpu_pipeline.device, gpu_pipeline);
  const sells_bindgroup = create_sells_bindgroup(gpu_pipeline.device, gpu_pipeline);
  const trades_bindgroup = create_trades_bindgroup(gpu_pipeline.device, gpu_pipeline);
  //console.log("create encoder Render pass from rpd"); 
  const render_pass = encoder.beginRenderPass(rpd);
  //update_uniform_bs01_device_buffer(device,0,gpu_pipeline);
  //console.log(" set pipeline with gpu_pipeline.nbbo_pipeline");
  if (!(!(gpu_pipeline.nbb_pipeline))) {
    render_pass.setPipeline(gpu_pipeline.nbb_pipeline);
    //console.log(" set bind group with nbbo bindgroup");
    render_pass.setBindGroup(0, nbb_bindgroup);
    //console.log(" call draw buffers.");
    render_pass.draw(nbbo_verts.length, buffers.nbbo.time.length-1);  // call our vertex shader 3 times (if function is (3))
  }
  if (!(!(gpu_pipeline.nbo_pipeline))) {
  //console.log(" update to call bs01=1 buffers");
  render_pass.setPipeline(gpu_pipeline.nbo_pipeline);
  render_pass.setBindGroup(0, nbo_bindgroup);
  //console.log(" Last Call, length [" + nbbo_verts.length + "," + buffers.nbbo.time.length + "]");
  render_pass.draw(nbbo_verts.length, buffers.nbbo.time.length-1);  // call our vertex shader 3 times (if function is (3))
  }
  if (!(!(gpu_pipeline.buys_pipeline))) {
  render_pass.setPipeline(gpu_pipeline.buys_pipeline);
  render_pass.setBindGroup(1, buys_bindgroup);
  render_pass.draw(msg_verts.length, buffers.buys.price.length);
  }
  if (!(!(gpu_pipeline.sells_pipeline))) {
  render_pass.setPipeline(gpu_pipeline.sells_pipeline);
  render_pass.setBindGroup(2, sells_bindgroup);
  render_pass.draw(msg_verts.length, buffers.sells.price.length);
  }

  if ((true) && (!(!(gpu_pipeline.trades_pipeline)))) {
  render_pass.setPipeline(gpu_pipeline.trades_pipeline);
  render_pass.setBindGroup(3, trades_bindgroup);
  render_pass.draw(triangle_verts_arrow.length, buffers.trades.price.length);
  console.log("buffers.trades.price has length " + buffers.trades.price.length);
  }
  render_pass.end();
  //console.log(" Trying to finish commandBuffer.");
  const commandBuffer = encoder.finish();
  device.queue.submit([commandBuffer]);
  PRINT_N(2, "ob_gpu_render, we have submitted buffer and are complete");
  return({"ob_gpu_object":"running_widget"});
} 

exports = {'buffers':buffers, "populate_device_data_buffers":populate_device_data_buffers, "create_data_buffers":create_data_buffers,
   "data_nbbo_module":data_nbbo_module, "data_buys_module":data_buys_module,
   "update_uniform_bs01_device_buffer":update_uniform_bs01_device_buffer,"update_uniform_window_device_buffer":update_uniform_window_device_buffer,
   "create_vert_buffers":create_vert_buffers,
   "fill_uniform_buffer":fill_uniform_buffer,"renew_uniform_buffer":renew_uniform_buffer,
   "populate_device_verts_buffers":populate_device_verts_buffers, 
   "generate_individual_pipeline":generate_individual_pipeline, "generate_gpu_renderPassDescriptor":generate_gpu_renderPassDescriptor,
   "createDepthTextureDesc":createDepthTextureDesc, "blank_main":blank_main,
   "OB_generate_gpu_pipeline":OB_generate_gpu_pipeline, "ob_gpu_render":ob_gpu_render, "get_device_buffer":get_device_buffer,
   "data_nbb_module":data_nbb_module, "data_nbo_module":data_nbo_module
}
module.exports = exports;
