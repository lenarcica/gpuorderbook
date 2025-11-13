//////////////////////////////////////////////////////////////
// ob.js
//
//   Alan Lenarcic  2025
//
//   WebGPU based orderbook timeline visualizaton
//
//   Uses: "draw_ob.js" -- WebGPU Canvas code (Static pixels)
//         "svg_ob.js" -- Interactive SVG on top (selectable pixels)
//
//         
//
//import noUiSlider from '../external/nouislider.js';
var noUiSlider = require("../external/nouislider.js"); // This external slider is a requirement
require('../external/nouislider.min.css'); // Import the CSS as well
//const d3 = require("../external/d3.v7.js");  // We are not using any D3 Elements at this time.
console.log("ob require, do we have d3?");
const debug_code = require("./debug.js");
const demo_data = require("./demo_data.js");
const printer = require("./printer.js");
//const nouislider = require("../external/nouislider.js");
const draw_ob = require("./draw_ob.js");
const svg_ob = require("./svg_ob.js");
const make_text_el = svg_ob.make_text_el;
const pretty_num = require("../internal_lib/pretty_num.js");
const svgns = "http://www.w3.org/2000/svg"; // SVG Namespace

const default_height = 500;  const default_width = 600;
var canvas_pixels = 10; var height_canvas = default_height; var width_canvas = default_width;
var canvas_tweak = 0; // Incase extra tweak to put CANVAS on SVG necessary
const is_numeric = printer.is_numeric; const is_positive_numeric = printer.is_numeric;
const xwid = 5; const hline_effect = .15; const ywid = 5; const vline_effect = .15;
const slider_pixels = 20; const price_delta = 1.5;

async function WebGPU_GetAdapterAndDevice() {
  console.log("obwidget.js -- Trying to achieve adapter");
  const adapter = await navigator.gpu?.requestAdapter();
  const device = await adapter?.requestDevice();
  if (!device) {
    fail('need a browser that supports WebGPU');
    return;
  }
  console.log("obwidget.js -- we reached device");
  return({device:device,adapter:adapter});
}

//export class obwidget {
class obwidget {
  data = {...demo_data.demo_data};
  gpu_pipeline = null;
  renderer = null; device=null; adapter=null;
  count_renders = 0; draw_ob = draw_ob; svgns = svgns; svg_ob = svg_ob; pretty_num = pretty_num; time_range_dict = [0,1];
  constructor({model, el}) {
    this.randomStr = (Math.random().toString(36).substring(2, 5) +
          Math.random().toString(36).substring(2, 5));
    this.verbose = is_numeric(model.get('verbose')) ? model.get('verbose') : 0; 
    const vstr = "obwidget()";
    this.PRINT_N = printer.my_printer( this.verbose, vstr);
    this.PRINT_N(1, "obwidget() -- constructor called. -- verbose = " + (this.verbose));
    this.PRINT_N(0, "  We have initiated obwidget with verbose = " + this.verbose);
    this.PRINT_N(0, " We completed constructor.");
    this.setupDefaults();
    this.el = el; this.model = model;
    const in_data = this.model.get('data');
    this.configureData(in_data, this.model);
    this.draw_ob = draw_ob;
  }
  configureData(in_data, model) {
    const PRINT_N = printer.my_printer(20, "ob.js->configureData()");
    if (!(!(in_data))) { 
      this.data = in_data; PRINT_N(1, ": data given to configureData from input"); 
      if (!(this.data.data_type)) { this.data.data_type = "User supplied data"; }
    } else { 
      //this.data = Object.assign({}, demo_data); 
      PRINT_N(1, ": Defaulting to demo_data with demo_data.data_type=" + demo_data.data_type); 
      this.data = demo_data.demo_data;
    }
    if (!(this.data)) {
      PRINT_N(0, ": ERROR data is still null."); debugger;
    }
    if (!(this.data.data_type)) {
      PRINT_N(0, "ERROR Data.data_type is still undefined"); debugger;
    }
    if (!(is_numeric(this.data.tmin))) {
      PRINT_N(-1, "ERROR configureData has not been populated"); debugger;
    }
    if (is_positive_numeric(this.data.height)) { this.data.height = Math.floor(this.data.height) } else { this.data.height = demo_data.height }
    if (is_positive_numeric(this.data.width)) { this.data.width = Math.floor(this.data.width) } else { this.data.width = demo_data.width }
    if ((!(!(this.model.get('width')))) && (is_positive_numeric(this.model.get('width')))) { this.data.width = Math.floor(this.model.get('width')) }
    if ((!(!(this.model.get('height')))) && (is_positive_numeric(this.model.get('height')))) { this.data.height = Math.floor(this.model.get('height')) }

    if (!(this.data.height)) {
      console.log("Weird, after you did this we don't have data.height?"); debugger;
    }
    if (is_numeric(this.data.tmin)) { } else { this.data.tmin = 1.0*demo_data.tmin }
    if (is_numeric(this.data.tmax)) { } else { this.data.tmax = 1.0*demo_data.tmax }
    if (this.data.tmax < this.data.tmin) { let dmm = this.data.tmin*1.0; this.data.tmin=(1.0*this.data.tmax); this.data.tmax = dmm }
    if (is_numeric(this.data.pmin)) { this.data.pmin = this.data.pmin } else { this.data.pmin = demo_data.pmin }
    if (is_numeric(this.data.pmax)) { this.data.pmax = this.data.pmax } else { this.data.pmax = demo_data.pmax }
    if (is_positive_numeric(this.data.pow_qty)) { this.data.pow_qty = this.data.pow_qty } else { this.data.pow_qty = demo_data.pow_qty }
    if (is_positive_numeric(this.data.trade_mul_fac)) { this.data.trade_mul_fac = this.data.trade_mul_fac } else { this.data.trade_mul_fac = demo_data.trade_mul_fac }
    if (is_positive_numeric(this.data.msg_mul_fac)) { this.data.msg_mul_fac = this.data.msg_mul_fac } else { this.data.msg_mul_fac = demo_data.msg_mul_fac }
    if (this.data.pmax < this.data.pmin) { let dmm = this.data.pmin; this.data.pmin=this.data.pmax; this.data.pmax = dmm }
    if (!(this.orig)) {
      this.orig = { "tmin": this.data.tmin * 1.0,  "tmax":this.data.tmax *1.0, 'unit': this.data.unit*1.0,
                    "pmin": this.data.pmin * 1.0,  "pmax":this.data.pmax *1.0, 'st_time': this.data.st_time+''
      }
    } else {
      this.orig.tmin = this.data.tmin * 1.0; this.orig.tmax = this.data.tmax * 1.0;  this.orig.st_time = this.data.st_time + '';
      this.orig.pmin = this.data.pmin * 1.0; this.orig.pmax = this.data.pmax * 1.0;
    } 
    this.data.origmult = 1.0;
    if (!(this.going)) { this.going = {'tmin':this.data.tmin*1.0, 'tmax':this.data.tmax*1.0, 'unit':this.data.unit, 'st_time':this.data.st_time }
    } else { this.going.tmin = this.data.tmin*1.0; this.going.tmax = this.data.tmax*1.0; this.going.unit = this.data.unit; this.going.st_time = this.data.st_time }
    this.data.canvas_pixels = canvas_pixels;
    if (!is_numeric(this.data.tmin)) {
      PRINT_N(-1, "ERROR configureData, this.data tmin is somehow not configured right yet."); debugger;
    }
    if (!is_numeric(this.orig.tmin)) {
      PRINT_N(-1, "ERROR configureData, this.orig.tmin somehow not configured."); debugger;
    }
    PRINT_N(1,"configureData, this.data.height is " + this.data.height);
  }
  async createRenderer(props) {
    console.log("createRenderer has initiated.");
    let PRINT_N = this.PRINT_N;
    if (!(PRINT_N)) { console.log("createRenderer -- we don't have a PRINT_N"); }
    this.PRINT_N(0, " createRenderer initiated");
    if (!(this.canvas_gpu)) {
      this.setupWidget(props);
    } else {
      PRINT_N(0, "createRenderer -- tried to call setupWidget again.");
    }

    const ADD = await WebGPU_GetAdapterAndDevice();
    PRINT_N(1, "--- I hope we received the Adapter and device");
    this.adapter = ADD.adapter; this.device = ADD.device;
    if (!(this.device)) {
      PRINT_N(0, "ERROR this device is null in createRender() "); debugger;
    }
    this.presentationFormat = navigator.gpu.getPreferredCanvasFormat();
    if (!(this.presentationFormat)) {
      PRINT_N(0, "ERROR this device has no presentationFormat"); debugger;
    }
    this.canvas_gpu.configure({ device:this.device, format: this.presentationFormat});
    
    this.renderer =  {
      get canvas() { return this.canvas_gpu; },
      get render() { return this.render; }
    };
    return(this.renderer);
  }
  setupWidget({properties}) {
    console.log("setupWidget has initiated");
    let PRINT_N = this.PRINT_N;
    PRINT_N(1,"rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
    PRINT_N(1,"rrr obwidget->class() calling::: setupWidget()");
    if (!(this.debug_button))  {
      debug_code.configureDebugButton(this);
    }
    if (!(this.widgetDiv)) {
      this.configureWidgetGPU(); this.add_time_slider_div(); this.add_price_slider_div(); this.add_time_axis_div(); this.add_price_axis_div(); this.add_unit_slider_div();
      this.create_mouse_svg()
    }
    PRINT_N(0,"ERROR rrr obwidget->class() we couldn't call configureWidgetGPU?");
    //configureWidgetGPU();
    if (!(this.widgetDiv)) {
      PRINT_N(1,"ERROR rrr obwidget->class() widgetDiv was not generated");
      debugger;
    }
  }
  setupDefaults() {
    this.canvasDiv = null; this.widgetDiv = null; this.canvas_gpu = null;
    this.clearColor = { r: 0.0, g: 0.5, b: 1.0, a: 1.0 };
    this.device = null; this.adapter = null; this.canvas_gpu = null; 
    this.presentationFormat=null;
    this.call_plot_again =  function() { console.log("default call_plot_again called: we will define"); }
    this.count_renders = 0; this.data = null;
  }
  configureWidgetGPU() {
      // Create a Canvas to draw a line onto
      console.log("ob.js -- configureWidgetGPU() started.");
      let PRINT_N = this.PRINT_N;
      if (!(PRINT_N)) { console.log("configureWidgetGPU() -- PRINT_N wasn't defined?"); }
      PRINT_N(1,"rrr obwidget->class() Declaring and setting DEFAULT Jupyter DIV (name=" + this.randomDIVNAME+ ") location [w,h]=[" + this.width + "," + this.height + "]");
      PRINT_N(1,"rrr obwidget->class() declaring a widgetDiv");
      if (!(this.data)) {
        PRINT_N(0, "ERROR configureWidgetGPU - this.data is not configured yet."); debugger;
      }
      if (!(this.data.width)) {
        PRINT_N(0, "ERROR configureWidgetGPU - this.data does not have width configured yet."); debugger;
      }
      this.margins =  {'left': Math.floor(this.data.width * .35), 'top': Math.floor(this.data.height)*.4, 'bottom': Math.floor(this.data.height)*.7 }
      this.widgetDiv = document.createElement('div');
      this.widgetDiv.setAttribute('id', "widget_Div" + this.randomStr);
      this.widgetDiv.style.position = 'relative';  
      this.widgetDiv.style.display = 'flex';
      this.widgetDiv.style.flexDirection = 'column';
      this.widgetDiv.style.justifyContent = 'center';
      this.widgetDiv.style.alignItems = 'center';
      this.widgetDiv.setAttribute('z-level',0);
      // Implement Auto Widgth later
      //this.widgetDiv.style.width = this.data.width === 'auto' ? '100%' : `${this.width}px`;
      this.widgetDiv.style.width = (this.data.width + this.margins.left) + 'px';
      this.widgetDiv.style.height = (this.data.height + this.margins.top + this.margins.bottom) + 'px'; 
      this.widgetDiv.setAttribute('height',(this.data.height + this.margins.top + this.margins.bottom) + 'px');
      this.widgetDiv.setAttribute('width', (this.data.width  + this.margins.left) + 'px');
      // BACKGROUND -- Set to BLACK for REGL plot
      this.widgetDiv.style.background = 'var(--jp-layout-color0)';
      this.el.appendChild(this.widgetDiv);
      this.count_widgettext = 0;
      PRINT_N(1, "obwidget->class->render() generating canvasDiv.");
      // D3 Might not work given the challenges of selection.  But Ideally 
      this.canvasDiv = document.createElement('div');
      this.canvasDiv.style.position = 'absolute';
      this.canvasDiv.style.inset = '0';
      //this.canvasDiv.style.top = (debug_button_heught) + 'px';
      //this.canvasDiv.setAttribute('top', (debug_button_height) + 'px');
      //
      this.canvasDiv.style.top = this.margins.top + 'px';  this.canvasDiv.style.left = this.margins.left + 'px';
      this.canvasDiv.setAttribute('id', 'canvasDiv' + this.randomStr);
      this.canvasDiv.setAttribute('height',this.data.height + 'px');
      this.canvasDiv.setAttribute('width', this.data.width + 'px');
      this.widgetDiv.appendChild(this.canvasDiv);
      PRINT_N(1, "rrr obwidget->class we have declared canvasDiv");
      PRINT_N(1,"rrr obwidget->class->render() we have generated canvasDiv, declaring canvas.");

      this.canvas = document.createElement('canvas');
      this.canvas.style.width=(this.data.width) + 'px'; this.canvas.setAttribute('id','glcanvas'); this.canvas.style.height= (this.data.height) + 'px';
      this.canvas.setAttribute('height', this.data.height * this.data.canvas_pixels);
      this.canvas.setAttribute('width', this.data.width * this.data.canvas_pixels);
      this.canvas.style.top = 0 + 'px'; this.canvas.style.left = 0 + 'px';
      this.canvas.setAttribute('left', 0 + 'px'); this.canvas.setAttribute('top', 0 + 'px');
      this.canvas.setAttribute('z-level',0);
      this.canvas.style.position = 'absolute';
      this.canvasDiv.appendChild(this.canvas);
      PRINT_N(1,"--- this: a Canvas Div has been created, but is it populated and usable?");
      PRINT_N(1,"--- Trying to get device/and material");

      this.canvas_gpu = this.canvas.getContext('webgpu', {
        antialias: true,
        preserveDrawingBuffer: true,
        });
      if (!(this.canvas_gpu)) {
        PRINT_N(1,"obwidget->class->render Hm, I think we got this.canvas_gl, it appears to occur?");
      }
      PRINT_N(1, "obwidget-> I wonder where we went with gpu declared?  We need to render the demo data at some point and that is hard.");


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
  }
  viewSyncHandler(viewSync) {
    this.PRINT_N(1, " -- viewSyncHandler has been called .");
      if (!(!(viewSync))) {
        this.PRINT_N(1, "viewSyncHandler: subscribe event");
        //globalPubSub.subscribe(
        //  'gabriel_plot::view',
        //  this.externalViewChangeHandlerBound,
        //);
       } else {
        this.PRINT_N(1, "viewSyncHandler: unsubscribe event");
        //globalPubSub.unsubscribe(
        //  'gabriel_plot::view',
        //  this.externalViewChangeHandlerBound,
        //);
      }
  }
  BlankWindow() {
       console.log("gpuwidget.js->BlankWindow() we have executed.");
       // canvas_gpu is the context
       draw_ob.blank_main(this.canvas_gpu, this.device);
  }
  async render(properties) {
    const PRINT_N = this.PRINT_N;
    
    if (!(PRINT_N)) {
      console.log("render -- issues, PRINT_N not found.");
      debugger
    }
    PRINT_N(1,"rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr");
    PRINT_N(1,"rrr gpuwidget.js -> await render(count_renders=" + this.count_renders + ") -- Initiate -- properties is developing");
    PRINT_N(1,Object.keys(properties));
    let here_this = this;
    PRINT_N(1,"rrr gpuwidget.js -- calling setupWidget(properties)");
    if (!(this.canvas_gpu)) {  this.setupWidget(properties); }
    if (!(this.canvas_gpu)) { PRINT_N(0,"ERROR() -- await render() -- error, configureWidgetGPU failed."); debugger;}
    PRINT_N(1,"rrr Now calling this Create Renderer.");
    if (!window.ob_gpu_widget) {
      properties.text = "renderer_for window.gpuwidget";
      here_this.renderer = await here_this.createRenderer(properties);
      window.ob_gpu_widget = {
        renderer: here_this.renderer,
        versionLog: false,
      };
      PRINT_N(1,"rrr -- windowGPUWidget was given this.createRenderer, now count_renders = " + this.count_renders);
    } else {
      console.log("rrr --- ELSE: window.GLwidget is not null");
      properties.text = "rrr gpuwidget.js->await render(): window.GPUwidget exists?";
      await here_this.createRenderer(properties);
    }
    if (!(this.device)) {
      PRINT_N(0, "ERROR - aync render(properties) still calling create Renderer one more time.");
      await this.createRenderer(properties);
      if (!(this.device)) {
        PRINT_N(0, "ERROR - async render(properties) with device is still non existant");
        debugger;
      }
    }
    PRINT_N(1,"rrr -- async render -- now triggering a possible requestAnimationFrame(), count_renders = " + this.count_renders);
    window.requestAnimationFrame(() => {
      PRINT_N("rrr gpuwidget.js->await render(count_renders=" + this.count_renders + ") -- requestAnimationFrame() called -- inserting renderer.");
      const initialOptions = {
        renderer: window.ob_gpu_widget.renderer,
        canvas: here_this.canvas,
        actionKeyMap: { merge: 'meta', remove: 'alt' },
      };
      
      // Further stuff from jupyter-scatter
      if (this.width !== 'auto') {
        initialOptions.width = here_this.width;
      }
      // Not sure what API for container doew.
      // Container for widget
      //this.canvasDiv.api = this.camera_centered;
      this.viewSync = this.model.get('view_sync');
      this.viewSyncHandler(this.viewSync);
      console.log("obwidget.js -- async render() perhaps we should make a draw.");
      //this.camera_centered.draw().then(()=> {
      // })
      PRINT_N(0, " widow.requestAnimationFrame -- going for it call plot");
      this.call_plot();
      PRINT_N(1, "Calling model save changes now.");
      here_this.model.save_changes()
    });
    
    console.log("now is when we render a time slider.");
    //debugger;
    this.render_time_slider();
    this.render_price_slider();
    this.render_unit_slider();
  }
  call_plot() {
    const PRINT_N = this.PRINT_N;
    PRINT_N(5, "this.call Plot has been called.");
    const here_this = this;
    const verbose = this.verbose;
    if (!(!(this.gpu_pipeline))) {
      PRINT_N(5, "this.call_plot() -- refilling uniform buffer.");
      draw_ob.fill_uniform_buffer(this.data, this.gpu_pipeline, this.gpu_pipeline.device)
      PRINT_N(5, "this.call_plot(): uniforms now [" + this.gpu_pipeline.buffers.uniform_buffer.join(",") + "]");
    }
    const frameFunction = (this_widget, draw_ob) => ({inputs}) => {
      const PRINT_N = this_widget.PRINT_N;
      PRINT_N(5, "call_plot() -- Generate Pipeline Called");
      if (!(this_widget.device)) {
        console.log("call_plot() we can not create pipeline because this.device is still null");
        debugger;
      }
      if (!(this_widget.data)) {
        console.log("call_plot: data is not derived yet.");
      }
      this_widget.gpu_pipeline = draw_ob.OB_generate_gpu_pipeline(this_widget.gpu_pipeline, this_widget.canvas_gpu,
        this_widget.adapter, this_widget.device, this_widget);
      PRINT_N(5, "call_plot() -- ob_pu_render to be called.");
      draw_ob.ob_gpu_render(this_widget.gpu_pipeline);
    }
    let frameCallback = frameFunction(here_this, draw_ob);
    PRINT_N(5, "call_plot() -- about to trigger requestAnimationFrame");
    requestAnimationFrame(frameCallback);
    this.count_renders = this.count_renders + 1;
    if (!(this.model.set)) {
      PRINT_N(-1, "call_plot: weird, module set not working?"); debugger;
    }
    this.redraw_time_axis();  this.redraw_price_axis();
    this.model.set('count_renders', this.count_renders);  this.model.save_changes();
  }
  add_time_slider_div() {
    this.time_slider_div = this.add_me_widget_div('time_slider_div',this.widgetDiv,'absolute','0',
        Math.floor((2.0/7.0)*this.margins.top), this.margins.left,
        slider_pixels, //Math.floor((1.0/5.0)*this.margins.top), 
        this.data.width);
  }
  add_unit_slider_div() {
    this.unit_slider_div = this.add_me_widget_div('unit_slider_div',this.widgetDiv,'absolute','0',
       Math.floor(this.margins.top + this.data.height + .5*this.margins.bottom), this.margins.left,
       slider_pixels, this.data.width);
  }
  add_price_slider_div() {
    this.price_slider_Div = this.add_me_widget_div('price_slider_Div',this.widgetDiv,'absolute','0',
        this.margins.top, Math.floor(.23 * this.margins.left),
        this.data.height, slider_pixels); //Math.floor(.15  * this.margins.left));
    //this.price_slider_Div = document.createElement('div');
    //this.price_slider_Div.setAttribute('id', "price_slider_Div" + this.randomStr);
    //this.price_slider_Div.style.position = 'absolute';this.price_slider_Div.style.inset = '0';
    //this.price_slider_Div.style.top = this.margins.top + 'px';  this.price_slider_Div.style.left = Math.floor( (1.0/5.0) * this.margins.left) + 'px';
    //this.price_slider_Div.style.height = this.data.height + 'px';  this.price_slider_Div.style.width = Math.floor((1.0/4.0) * this.margins.left) + 'px';
    //this.price_slider_Div.setAttribute('id', 'price_slider_Div' + this.randomStr);
    //this.price_slider_Div.setAttribute('height', this.data.height + 'px');
    //this.price_slider_Div.setAttribute('width',  Math.floor((1.0/4.0) * this.margins.left) + 'px');
    this.price_slider_Div.noUiSlider = null;
    //this.price_slider = document.createElement('div');
    //this.price_slider_Div.appendChild(this.price_slider);
    //this.widgetDiv.appendChild(this.price_slider_Div);
  }
  add_me_widget_div(divname,parent,in_position,in_inset,in_top,in_left,in_height,in_width) {
    let ndv = document.createElement('div');
    ndv = document.createElement('div'); ndv.setAttribute('id', divname + this.randomStr);
    ndv.style.position = in_position; ndv.style.inset = in_inset;
    ndv.style.top = in_top+ 'px';  ndv.style.left = in_left + 'px';
    ndv.style.height = in_height + 'px';  ndv.style.width = in_width + 'px';
    ndv.setAttribute('id', divname + this.randomStr);
    ndv.setAttribute('height', in_height + 'px'); ndv.setAttribute('top', in_top +'px');
    ndv.setAttribute('width',  in_width + 'px');  ndv.setAttribute('left', in_left+'px');
    ndv.noUiSlider = null;
    //this.price_slider = document.createElement('div');
    //this.price_slider_Div.appendChild(this.price_slider);
    parent.appendChild(ndv);
    //this.__dict__[divname] = ndv;
    return(ndv);
  }
  add_time_axis_div() {
     const x2wid = xwid * 2;
     this.time_axis_div = this.add_me_widget_div('time_axis_div',this.widgetDiv,'absolute','0', (this.margins.top + this.data.height), this.margins.left-xwid,
      this.margins.bottom, this.data.width+x2wid);
     const hline_y = Math.floor(this.margins.bottom * hline_effect);
     const tick_s = 30;
     const pathData = ("M " + (xwid) + "," + hline_y + " L " + (xwid+this.data.width) + "," + hline_y + 
                       " M " + (xwid) + "," + Math.floor(.1*hline_y) + " V " + Math.floor(hline_y*1.25) + 
                       " M " + (xwid + this.data.width) + "," + Math.floor(.1*hline_y) + " V " + Math.floor(hline_y*1.25));
     //const pathData = "M 0 " + hline_y + " L " + this.data.width + " " + hline_y; 
     //  Note that because Chrome has problems with svg, we need to createElementNS(this.svgns,...,...);
     this.time_axis_svg  = document.createElementNS(this.svgns,'svg');  this.time_axis_svg.setAttribute('id', 'time_axis_svg' + this.randomStr);
     this.time_axis_svg.style.height = 'auto'; //this.time_axis_svg.style.height = this.margins.bottom + 'px'; 
     this.time_axis_svg.setAttribute('height', this.margins.bottom +'px');
     this.time_axis_svg.style.width = '100%'; //this.time_axis_svg.style.width = (x2wid+this.data.width) + 'px'; 
     this.time_axis_svg.setAttribute('width', (this.data.width + x2wid)+'px' );
     this.time_axis_svg.setAttributeNS(this.svgns,'viewBox', '0 0 ' + (this.data.width + x2wid) + ' ' + (this.margins.bottom));
     //this.time_axis_svg.setAttribute('viewbox', '0 0 ' + (this.data.width + x2wid) + ' ' + (this.margins.bottom));
     this.time_axis_svg.setAttribute('z-level',2);
     // Create a new path element
     const path = document.createElementNS(this.svgns, 'path');
     path.setAttribute('d', pathData);
     // Set styling attributes (optional)
     path.setAttribute('id','main-path-time');
     path.setAttribute('stroke', 'black');
     path.setAttribute('stroke-width', '3');
     path.setAttribute('fill', 'black'); // No fill for a line
     // Append the path to the SVG container
     console.log("add_time_axis_div: pathData is " + pathData);
     this.time_axis_svg.appendChild(path);
     this.time_axis_div.appendChild(this.time_axis_svg);   
     this.time_axis_div.old_tmin = this.data.tmin-1; this.time_axis_div.old_tmax = this.data.tmax+1;
  }
  redraw_time_axis() {
    if ((this.time_axis_div.old_tmin == this.data.tmin) &&  (this.time_axis_div.old_tmax == this.data.tmax)) { return(1); }
    this.time_axis_div.old_tmin = this.data.tmin; this.time_axis_div.old_tmax = this.data.tmax;
    const hline_y = Math.floor(this.margins.bottom * hline_effect);
    //const svgIdnode = document.getElementById(this.time_axis_svg.id);
    //const myNode = document.getElementById("foo");
    const onsvg = this.time_axis_svg;
    const svgns = this.svgns;
    let onChild = onsvg.lastChild;
    while ((onChild) && (onChild.id != 'main-path-time')) {
      onsvg.removeChild(onChild);
      onChild = onsvg.lastChild;
    }
    //if (!(!(this.time_axis_div.values_for_axis))) {
    //for (let ii = 0; ii < this.time_axis_div.values_for_axis.length; ii++) {
    //  let element = this.time_axis_svg.getElementById('val_txt_'+ii);
    //  this.time_svg.removeChild(element);
    //  element = this.time_axis_svg.getElementById('ln_txt_'+ii);
    //}}
    this.time_axis_div.values_for_axis = pretty_num.pretty_num(this.data.tmin, this.data.tmax,7,false);
    //var min_text = this.time_axis_svg.getElementById('min_text'); 
    //if (!(min_text)) { this.time_axis_svg.removeChild(min_text); }
    //var max_text = this.time_axis_svg.getElementById('max_text'); 
    // if (!(max_text)) { this.time_axis_svg.removeChild(max_text); }
    let txtsize = 24;
    //this.time_axis_svg.appendChild(make_text_el('min_text', xwid, Math.floor(hline_y*1.85), (this.data.tmin).toFixed(2),12));
    //this.time_axis_svg.appendChild(make_text_el('max_text', xwid + this.data.width, Math.floor(hline_y*1.85), (this.data.tmax).toFixed(2),12));
    let tratio = 1.0 / (this.data.tmax-this.data.tmin); let pathtext = "";
    for (let ii = 0; ii < this.time_axis_div.values_for_axis.length; ii++) {
      let val = this.time_axis_div.values_for_axis[ii];
      let stval = pretty_num.string_del_tm(val, this.going.unit, this.data.st_time,true);
      let locx = Math.round(xwid + this.data.width * (this.time_axis_div.values_for_axis[ii] - this.data.tmin) * tratio);
      this.time_axis_svg.appendChild(make_text_el('val_txt_'+ii,locx,hline_y*1.55,stval,11));
      pathtext = pathtext + "M " + locx + "," + Math.floor(.5 * hline_y) + " V " + Math.floor(1.2*hline_y);
    } 
    //let element = this.time_axis_svg.getElementById('path2');  if (!(!element)) { this.time_axis_svg.removeChild(element); }
    const path2 = document.createElementNS(svgns,'path');
    path2.setAttribute('id','path2_t');  path2.setAttribute('stroke','black'); path2.setAttribute('stroke-width','2');
    path2.setAttribute('fill','black'); path2.setAttribute('d', pathtext); path2.setAttribute('z-level',2);
    this.time_axis_svg.appendChild(path2);
 
    const axtext = ("[u,om] = " + this.data.unit + "," + this.data.origmult + "[" + this.data.tmin + "," + this.data.tmax + "] or " +
                   pretty_num.string_del_tm( this.data.tmin, this.going.unit, this.going.st_time,true) + ' to ' +
                   pretty_num.string_del_tm( this.data.tmax, this.going.unit, this.going.st_time,true));
    let axis_descriptor = document.getElementById('time_axis_descriptor');
    if ((axis_descriptor == null) || (axis_descriptor == undefined) || (!(axis_descriptor))) {
      this.time_axis_svg.appendChild(make_text_el('time_axis_descriptor',this.data.width*.5, this.margins.bottom*.35,
        axtext, 20));
    } else {   axis_descriptor.textContent = axtext; }
  }

  add_price_axis_div() {
     const y2wid = ywid * 2;
     this.price_axis_div = this.add_me_widget_div('price_axis_div',this.widgetDiv,'absolute','0', (this.margins.top -ywid), 0,
         this.data.height + y2wid, this.margins.left);
     const pwid = this.margins.left;
     const hline_x = Math.floor(this.margins.left * vline_effect);
     const tick_s = 30;
     const pathData = (" M " + (pwid-hline_x) + "," + (ywid) + " V " + (this.data.height + ywid) +  
                       " M " + (pwid-.1*hline_x) + "," + (ywid) + " H " + Math.floor(pwid-hline_x*1.3) + 
                       " M " + (pwid-.1*hline_x) + "," + (this.data.height +ywid) + " H " + Math.floor(pwid-hline_x*1.3));
     //const pathData = "M 0 " + hline_y + " L " + this.data.width + " " + hline_y; 
     //  Note that because Chrome has problems with svg, we need to createElementNS(this.svgns,...,...);
     this.price_axis_svg  = document.createElementNS(this.svgns,'svg');  this.time_axis_svg.setAttribute('id', 'price_axis_svg' + this.randomStr);
     this.price_axis_svg.style.height = 'auto'; //this.time_axis_svg.style.height = this.margins.bottom + 'px'; 
     this.price_axis_svg.setAttribute('height', (this.data.height+y2wid) +'px');
     this.price_axis_svg.style.width = '100%'; //this.time_axis_svg.style.width = (x2wid+this.data.width) + 'px'; 
     this.price_axis_svg.setAttribute('width', (this.margins.left)+'px' );
     this.price_axis_svg.setAttributeNS(this.svgns,'viewBox', '0 0 ' + (this.margins.left) + ' ' + (this.data.height+y2wid));
     //this.time_axis_svg.setAttribute('viewbox', '0 0 ' + (this.data.width + x2wid) + ' ' + (this.margins.bottom));
     this.price_axis_svg.setAttribute('z-level',2);
     // Create a new path element
     const path = document.createElementNS(this.svgns, 'path');
     path.setAttribute('d', pathData);
     // Set styling attributes (optional)
     path.setAttribute('id','main-path-price');
     path.setAttribute('stroke', 'black');
     path.setAttribute('stroke-width', '3');
     path.setAttribute('fill', 'black'); // No fill for a line
     // Append the path to the SVG container
     console.log("add_price_axis_div: pathData is " + pathData);
     this.price_axis_svg.appendChild(path);
     this.price_axis_div.appendChild(this.price_axis_svg); 
     this.price_axis_div.old_pmin = this.data.pmin-1; this.price_axis_div.old_pmax = this.data.pmax+1;
  }
  redraw_price_axis() {
    if ((this.price_axis_div.old_pmin == this.data.pmin) &&  (this.price_axis_div.old_pmax == this.data.pmax)) { return(1); }
    this.price_axis_div.old_pmin = this.data.pmin; this.price_axis_div.old_pmax = this.data.pmax;
    const hline_x = Math.floor(this.margins.left * vline_effect);
    //const svgIdnode = document.getElementById(this.time_axis_svg.id);
    //const myNode = document.getElementById("foo");
    const onsvg = this.price_axis_svg;
    const svgns = this.svgns;
    let onChild = onsvg.lastChild;
    while ((onChild) && (onChild.id != 'main-path-price')) {
      onsvg.removeChild(onChild);
      onChild = onsvg.lastChild;
    }
    this.price_axis_div.values_for_axis = pretty_num.pretty_num(this.data.pmin, this.data.pmax,5,false);
    let txtsize = 20;
    let pratio = 1.0 / (this.data.pmax-this.data.pmin); let pathtext = "";
    for (let ii = 0; ii < this.price_axis_div.values_for_axis.length; ii++) {
      let val = this.price_axis_div.values_for_axis[ii];
      let locy =  Math.round(ywid + this.data.height * (this.data.pmax - this.price_axis_div.values_for_axis[ii]) * pratio);
      this.price_axis_svg.appendChild(make_text_el('val_p_txt_'+ii,(this.margins.left - hline_x*1.8),locy,"$" + val.toFixed(2),11));
      pathtext = pathtext + "M " + (this.margins.left - .5*hline_x) + "," + (locy) + " H " + (this.margins.left - 1.2 * hline_x);
    } 
    //let element = this.time_axis_svg.getElementById('path2');  if (!(!element)) { this.time_axis_svg.removeChild(element); }
    const path2 = document.createElementNS(svgns,'path');
    path2.setAttribute('id','path2_p');  path2.setAttribute('stroke','black'); path2.setAttribute('stroke-width','2');
    path2.setAttribute('fill','black'); path2.setAttribute('d', pathtext); path2.setAttribute('z-level',2);
    this.price_axis_svg.appendChild(path2);
  }
  get_mult(new_unit, fixed_unit) {
    if (Number.isNaN(new_unit)) {
      console.log("get_mult()  oh now, new_unit is nan?");  debugger;
    }
    let onn = new_unit * 1.0; let relmult = 1.0;
    while (onn > fixed_unit) {
       if ((onn ==4) || (onn ==2)) { relmult = relmult * 6.0; onn = onn-1;
       } else { onn=onn-1; relmult = relmult * 10.0; }}
    while (onn < fixed_unit) {
       if ((onn ==3) || (onn ==1)) { relmult = relmult / 6.0; onn=onn+1
       } else { onn = onn+1; relmult = relmult / 10.0; }}
    return(relmult);
  }
  render_unit_slider() {
    this.PRINT_N(0, ": big change to unit slider called.");
   
    var unit_format = {
      to: (x) => { '10^{' +x + '}'},
      from: (txt) => { Number( txt.replace('10^{','').replace('}','')) }
    } ;
    unit_format = null;
    const values_for_time_slider = [5,4,3,2,1,0,-1,-2,-3,-4,-5,-6,-7,-8,-9];
    const values_inside = values_for_time_slider.filter((x)=>{ return((x <= this.orig.unit) && (x >= this.orig.unit-3)); });
    unit_format = {
      to: function(value) { return ('10<sup>' + ('' + values_inside[Math.round(value)]) + '</sup>'); },
      from: function (value) { 
         console.log("unit_format:from() called on value = " + value);
         if (value == '0') { return(0); }
         //console.log(" help me"); debugger; 
         value = value.replace('10<sup>','');  value = value.replace('</sup>','');
         console.log("unit format->from(), value is now " + value);
         return Number( ('' + value)); }
    };
    noUiSlider.create(this.unit_slider_div, { start: '' + this.orig.unit, 
      step:1, format : unit_format, tooltips:true, range: { min: 0, max: values_inside.length - 1 },
      pips: { mode: 'steps', filter: (x) => {return(1)},format: unit_format,density:50 }
    });
    this.unit_slider_div.noUiSlider.set( this.orig.unit);
    this.unit_slider_div.noUiSlider.on('set', (values, handle) => {
     console.log('slider has called itself: new unit will be values[0] =' + values[0] + " from current = " + this.going.unit);
     let new_unit = unit_format.from(values[0]) * 1.0;  if (Number.isNaN(new_unit)) { new_unit = 0; }

     const old_unit = this.going.unit * 1.0;
     if (new_unit == old_unit) { return; }
     const origmult = this.get_mult(new_unit*1.0, this.orig.unit*1.0);
     const relmult = this.get_mult(new_unit*1.0, old_unit*1.0);

     this.data.origmult = origmult * 1.0; // unitx = -2                 ; orig.unit = 0
                                    // tm_unitx = 100.0;          ; tm_orig = 1.0
     let try_min = this.orig.tmin;  let try_max = this.orig.tmax;  let cpt; let onwid = this.data.tmax-this.data.tmin;
     if (new_unit > old_unit) {
       try_min = (this.going.tmin - (relmult-1) * (this.going.tmax-this.going.tmin)) / relmult;
       try_max= (this.going.tmax + (relmult-1) * (this.going.tmax-this.going.tmin)) / relmult;
     } else {
       if (this.data.tmax - this.data.tmin <   relmult * (this.going.tmax - this.going.tmin)) {
          try_min = this.data.tmin / relmult;  try_max = this.data.tmax / relmult;
       } else {
          cpt = (this.data.tmax + this.data.tmin) * .5;  onwid = (this.data.tmax - this.data.tmin);
          try_min = (cpt - onwid * relmult *2 );  
          try_max = (cpt + onwid * relmult * 2);
       }
     }      
     if (try_min*this.data.origmult < this.orig.tmin) { try_min = this.orig.tmin/this.data.origmult }
     if (try_max*origmult > this.orig.tmax) { try_max = this.orig.tmax/this.data.origmult }

     this.going.tmin = try_min*1.0; this.going.tmax = try_max*1.0; this.going.unit = new_unit*1.0;  this.data.unit = new_unit*1.0;
     this.data.tmin = try_min*1.0; this.data.tmax = try_max*1.0;
     console.log("render_unit_slider we finish with origmult = " + origmult + " now ");
     if (this.going.unit == this.orig.unit) {  this.going.tmax = this.orig.tmax*1.0;  this.going.tmin = this.orig.tmin*1.0; this.data.tmax=this.orig.tmax*1.0; this.data.tmin = this.orig.tmin*1.0}
     this.render_time_slider(); return;
    });
  }
  render_time_slider() {
    const on_tmin = this.going.tmin; const on_tmax = this.going.tmax;
    const on_unit = this.going.unit; const on_st_time = this.going.st_time;
    const my_this = this;
    my_this.PRINT_N(0, ": render_time_slider() intiated [" + on_tmin + "," + on_tmax + "]");
    const values_for_time_slider = pretty_num.pretty_num(on_tmin, on_tmax, 5, false);
    const values_inside = values_for_time_slider.filter((x)=> { return((x>=on_tmin) && (x<=on_tmax)) });
    my_this.time_range_dict = {'min': on_tmin, 'max':on_tmax};
    //for (let ii = 0; ii < values_inside.length; ii++) { ddict[ii] = values_inside; }
    //debugger;
    my_this.PRINT_N(0,"values_for_time_slider are [" + values_for_time_slider.join(", ") + "]");
    console.log("values_for_time_slider[0] = " + values_for_time_slider[0]);
    //var format = { to: function(value) { return values_for_time_slider[Math.round(value)]; },
    //             from: function (value) { return values_for_time_slider.indexOf(Number(value)); }};

    let format = { to: function(value) { return (value.toFixed(2)); },
                 from: function (value) { return Number(value).toFixed(2); }};
    
    let function_A = (on_unit,on_st_time) => (value) => { return(
      pretty_num.string_del_tm(value,on_unit, on_st_time,true)
    ); }
    function_A = function_A(on_unit, on_st_time);
    let function_B = (on_init, on_st_time) => (value)=> { return(
     pretty_num.process_del_tm(value, on_unit, on_st_time)
     );  
    }
    function_B = function_B(on_unit, on_st_time);
    //console.log("debugger on time slider");
    //debugger;
    format = {to:function_A, from:function_B };
    if (!(!(my_this.time_slider_div.noUiSlider))) {
      console.log("Destroy existing noUiSlider.");
      my_this.time_slider_div.noUiSlider.destroy();
      my_this.time_slider_div.noUiSlider = null;
    } 
    let keep_funcs = true;  if (my_this.data.unit <= -2) { keep_funcs = false; }
    let CurStringNums =  [my_this.pretty_num.string_del_tm(my_this.data.tmin,my_this.data.unit,my_this.data.st_time,keep_funcs), 
               my_this.pretty_num.string_del_tm(my_this.data.tmax,my_this.data.unit,my_this.data.st_time,keep_funcs)
    ];
    let CastStringNums = [my_this.pretty_num.process_del_tm(CurStringNums[0], my_this.data.unit, my_this.data.st_time),
          my_this.pretty_num.process_del_tm(CurStringNums[1], my_this.data.unit, my_this.data.st_time)];
    if ((Math.abs(CastStringNums[0] - my_this.data.tmin) > .01) || 
        (Math.abs(CastStringNums[1] - my_this.data.tmax) > .01)) {
      console.log("ERROR inside obs.js->render_time_slider().  tmin/tmax = [" + this.data.tmin + "," + this.data.tmax + "], CurStringNums= " +
                  "[" + CurStringNums.join(",") + "], CastStringNums=[" +  CastStringNums[0] + "," + CastStringNums[1] + "]");
      console.log(" -- note keep_funcs = " + keep_funcs);
      console.log(" -- warning my_this.data.unit = " + my_this.data.unit + ", my_this.data.origmult = " + my_this.data.origmult);
      debugger;
    }
 
    console.log(" Calling ActHandle: orginally my_this(u=" + my_this.data.unit + " times are [" + my_this.data.tmin + "," + my_this.data.tmax + "] or " + 
             "[" + CurStringNums[0] + "," + CurStringNums[1] + "] or [" +
             "" + pretty_num.process_del_tm(CurStringNums[0], my_this.data.unit, my_this.data.st_time) +  "," + 
                 + pretty_num.process_del_tm(CurStringNums[1], my_this.data.unit, my_this.data.st_time) + "]"
              );
    noUiSlider.create(this.time_slider_div, {  start: [format.to(on_tmin), format.to(on_tmax)],
       // A linear range from 0 to 15 (16 values)
       range: my_this.time_range_dict, step: .25, connect: true, margin:.25, 
       tooltips: true, format: format, pips: { mode: 'positions', format: format, values:[0,20,40,60,80,100],density:10 },
    });
    this.time_slider_div.noUiSlider.set([format.to(on_tmin), format.to(on_tmax)]); 

    //if (this.data.unit == -1) { console.log(" look at what you've done "); debugger; }
    const ActHandle = function(values,handle) {
          // Send the updated value back to Python
      let lmbda_B = (on_unit, on_st_time) => (value) => {
        return(pretty_num.process_del_tm(value, on_unit, on_st_time)) };
      let lmbda_BB = lmbda_B(on_unit, on_st_time);
      if (handle == 0) { my_this.data.tmin = lmbda_BB(values[handle]); my_this.model.set('tmin', my_this.data.tmin); }
      if (handle == 1) { my_this.data.tmax = lmbda_BB(values[handle]); my_this.model.set('tmax', my_this.data.tmax); }
      //console.log("set: we now have this.data.tmin/tmax = [" + this.data.tmin + ", " + this.data.tmax + "]");
      my_this.model.save_changes();
      my_this.call_plot();
      
    };
    ActHandle(CurStringNums,0);
    this.time_slider_div.noUiSlider.on('slide', ActHandle); 
    //console.log("render_time_slider_end");
    //debugger;
   
  }
  render_price_slider() {
    const on_pmin = this.orig.pmin; const on_pmax = this.orig.pmax;
    this.PRINT_N(0, ": render_price_slider() intiated [" + on_pmin + "," + on_pmax + "]");
    const values_for_time_slider = pretty_num.pretty_num(on_pmin, on_pmax, 5, false);
    const values_inside = values_for_time_slider.filter((x)=> { return((x>=on_pmin) && (x<=on_pmax)) });
    var price_range_dict = {'min': on_pmin, 'max':on_pmax};
    //for (let ii = 0; ii < values_inside.length; ii++) { ddict[ii] = values_inside; }
    //debugger;
    this.PRINT_N(0,"render_price_slider(): values_for_time_slider are [" + values_for_time_slider.join(", ") + "]");
    console.log("values_for_time_slider[0] = " + values_for_time_slider[0]);
    //var format = { to: function(value) { return values_for_time_slider[Math.round(value)]; },
    //             from: function (value) { return values_for_time_slider.indexOf(Number(value)); }};

    var format = { to: function(value) { return (value.toFixed(2)); },
                 from: function (value) { return Number(value).toFixed(2); }};
    if (!(!(this.price_slider_Div.noUiSlider))) {
      console.log("Destroy existing noUiSlider.");
      this.price_slider_Div.noUiSlider.destroy();
      this.price_slider_Div.noUiSlider = null;
    }
    noUiSlider.create(this.price_slider_Div, {  start: [on_pmin, on_pmax],
       // A linear range from 0 to 15 (16 values)
       range: price_range_dict, step: .25, connect: true, margin:.25,orientation: 'vertical', height:this.data.height,direction:'rtl',
       tooltips: true, format: format, pips: { mode: 'positions', format: format, values:[0,20,40,60,80,100],density:10 },
    });
    this.price_slider_Div.noUiSlider.set([on_pmin, on_pmax]); 

    // Note "set" will only change plot on let go
    this.price_slider_Div.noUiSlider.on('slide', (values, handle) => {
          // Send the updated value back to Python
      if (handle == 1) { this.data.pmax = parseFloat(values[handle]); this.model.set('pmax', this.data.pmax); }
      if (handle == 0) { this.data.pmin = parseFloat(values[handle]); this.model.set('pmin', this.data.pmin); }
      //console.log("set: we now have this.data.tmin/tmax = [" + this.data.tmin + ", " + this.data.tmax + "]");
      this.model.save_changes();
      this.call_plot();
    });
   
  }
  async get_uniform_device_buffer() {
    return(await draw_ob.get_device_buffer(this.gpu_pipeline, this.gpu_pipeline.uniform_device_buffer));
  }
  async get_nbbo_vert_device_buffer() {
    return(await draw_ob.get_device_buffer(this.gpu_pipeline, this.gpu_pipeline.nbbo_vert_device_buffer));
  }
  async get_device_nbbo_buffers_time() {
    return(await draw_ob.get_device_buffer(this.gpu_pipeline, this.gpu_pipeline.device_nbbo_buffers.time));
  }
  create_mouse_svg() {
   const mouse_text_height = Math.floor( (1.0/3.0) * this.margins.top);
   const mouse_text_width = Math.floor(.7 * this.data.width);
   this.mouse_text_div = this.add_me_widget_div('mouse_text_div',this.widgetDiv,'absolute','0', Math.floor(this.margins.top-mouse_text_height), 
      Math.floor( this.margins.left +  (this.data.width-mouse_text_width)), mouse_text_height, (mouse_text_width));
   this.widgetDiv.appendChild(this.mouse_text_div);
   let nsvg = document.createElementNS(this.svgns,'svg');  
   nsvg.setAttribute('id', 'mouse_text_svg' + this.randomStr);
   nsvg.style.height = 'auto'; 
   nsvg.setAttribute('height', mouse_text_height); 
   nsvg.style.width = '100%'; 
   nsvg.setAttribute('width', mouse_text_width); 
   nsvg.setAttributeNS(this.svgns,'viewBox', '0 0 ' + mouse_text_width + ' ' + mouse_text_height); 
   nsvg.setAttribute('z-level',2);
   this.mouse_text_div.mouse_text_svg = nsvg;  this.mouse_text_div.appendChild(nsvg);
   const my_this = this; 
   let ttip_div = document.createElement('div'); ttip_div.setAttribute('id','ttip_div'); ttip_div.setAttribute('title','Selected');
   const ttip_width_height = [Math.floor(this.data.width*.5), Math.floor(this.data.height*.5)];
   ttip_div.style = "position: absolute; visibility: hidden; background-color: white; border: 1px solid black; padding: 5px";
   ttip_div.setAttribute('position','absolute'); //ttip_div.setAttribute('class','tooltip');
   ttip_div.setAttribute('background-color', '#333');  ttip_div.setAttribute('color','#fff');  ttip_div.setAttribute('padding','8px');
   ttip_div.setAttribute('border-radius','4px');  ttip_div.setAttribute('z-level',1000);  ttip_div.setAttribute('opacity',1);
   ttip_div.setAttribute('z-index',1000); ttip_div.style.position = 'absolute'; ttip_div.setAttribute('left', this.margins.left);  ttip_div.setAttribute('bottom',this.margins.top); 
   ttip_div.setAttribute('transition', 'opacity 0.3s ease-in-out');   ttip_div.style.height = Math.floor(this.data.height*.5); ttip_div.style_width = Math.floor(this.data.width * .5);
   ttip_div.setAttribute('width', ttip_width_height[0] + "px");  ttip_div.setAttribute('height',ttip_width_height[0] + "px");
   ttip_div.style.width = ttip_width_height[0] + "px"; ttip_div.style.height = ttip_width_height[1] + "px";
   //ttip_div.setAttribute('class','ob_tooltip');
   let ttip_svg = document.createElementNS(this.svgns,'svg'); ttip_svg.setAttribute('id','ttip_svg'); ttip_svg.setAttribute('title','ttip_svg'); ttip_svg.setAttribute('name','ttip_svg');
   ttip_svg.setAttribute('width',ttip_width_height[0] + 'px'); ttip_svg.setAttribute('height',ttip_width_height[1] + 'px');
   ttip_svg.style.height = ttip_width_height[1] + 'px'; ttip_svg.style.width= ttip_width_height[0] + 'px';
   //let ttip_path = document.createElementNS(this.svgns,'path');  ttip_path.setAttribute('id','ttip_path');
   //ttip_path.setAttribute('d','M 0,0 L 200,0 L 200,150 L 0,150 L 0,0');
   //ttip_svg.appendChild(ttip_path); ttip_div.appendChild(ttip_svg);
   ttip_div.appendChild(ttip_svg);
   my_this.widgetDiv.appendChild(ttip_div);  
   svg_ob.add_svg_mouse_over(my_this.canvasDiv, my_this.svg_zone, my_this.mouse_text_div.mouse_text_svg, my_this.data, mouse_text_width, mouse_text_height, price_delta, my_this.widgetDiv, this.margins)
   //debugger;
  }
  addClickListener() {
    // How to update data (but we will probably do other things on click) 
    this.el.addEventListener('click', (event) => {
      this.PRINT_N(1, "obwidget -- el was clicked");  return(-1);
      if (event.target === this.canvas) {
      this.PRINT_N(1, "obwidget.el.eventListener('click') -- in canvas you clicked at (X,Y)=(" + event.clientX + ", " + event.clientY + ")");
      this.PRINT_N(1, "obwidget.el.eventListener shifting the camera.");
      const here_this = this;
      const frameFunction = (this_widget, tgpu) => (buttons,x,y) => {
        this.PRINT_N(1, "frameFunction called");
        here_this.gpu_pipeline = tgpu.GPUNetPipeline(here_this.gpu_pipeline, here_this.canvas_gpu, 
           here_this.gpu_camera.st_camera.permapj, here_this.adapter, here_this.device, here_this);
        tgpu.GPUNetRender(here_this.gpu_pipeline, here_this.gpu_camera.st_camera.permapj,1,here_this.count_renders);
      }
      let frameCallback = frameFunction(this, tgpu);
      requestAnimationFrame(frameCallback);
      this.count_renders = this.count_renders + 1;
      this.model.set('mouse_x', event.clientX);
      this.model.set('mouse_y', event.clientY);
      this.model.save_changes();
      this.PRINT_N(1, "gpuwidget.el.eventListener('click') -- end click at (X,Y)=(" + event.clientX + ", " + event.clientY + ")");
      } else {
        this.PRINT_N(1, "el.addEventListner -- hey: clicked but target is not canvas.");
      }
    });
  }
}

const exports = {"obwidget": obwidget, "d3":d3};
//export default {"obwidget": obwidget};
module.exports = exports;
