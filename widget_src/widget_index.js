/////////////////////////////////////////////////////////////////////////////////////
// widget_index.js
//
// 2026-05 Alan Lenarcic
//
//  Main Anywidget index function
//
// This is a skeleton of javascript code that merges "model,el" input taken from
//  Jupyter anywidget and interacts it with javascript webgpu code.
// Ideally this widget will become reusable for multiple anywidget projects that
// can be made compatible with technologies like D3, WebGL, WebGPU etc.
//
// In basic anywidget skeleton (compiled with other files using "esbuild" E6 Build)
// calls to render must be called.
//
// Currently we are stressing webgpu render, and so gpuwidget.js will be main target
// If we are successful with webgpu we can move to webgl implementation.

console.log("widget_src/widget_index.js -- initializing, about to call glwidget.js");
//const d3 = require("../static/external_lib/d3.v7.js");
const ob = require("../static/internal/ob.js");
const obwidget = ob.obwidget;
const printer = require("../static/internal/printer.js");


const vstr = "widget_index.js: ";
let verbose = 1;
var PRINT_N = printer.my_printer(0, vstr); 

PRINT_N(0, "ob.keys is [" + Object.keys(ob).join(", ") + "]");
PRINT_N("widget_src/ob.js has been opened");

var my_widget = null;
// glwidget: uses OpenGL, gpuwidget: uses WebGPU

/////////////////////////////////////////////////////////
// Rewriting a widget index using code we have derived.
console.log("---- widget_index.js --- Calling");
async function async_gpu_render({ model, el }) {
  PRINT_N(0,"widget_index.js:: async gpu render has been called.  Calling a new obwidget");
  //var my_widget = null;
  try {
    my_widget = new obwidget({
      "el": el, "model":model
      // Model alterer as found in jupyter scatter
      //model: serializeDataToModel(model, {
      // When WebCL is putting out points vertices this will help us get python nodes
      // Numpy2D won't be accessible until we implement it
      //graph_points: Numpy2D('float32'),
      //graph_vertices: Numpy2D('uint32')
      //}),
    });
  } catch {
    PRINT_N(1, "widget_index.js -- gpu render failed");
    debugger;
  }
  if (!(my_widget)) {
    PRINT_N(0, "widget_index.js()  My Widget failed to generate.");
     debugger;
  }
  if (!(my_widget.gpu_pipeline)) {
    PRINT_N(0, "widget_index.js -- gpu_pipeline does not exist: launching my_widget.render()");
    try {
      let properties = {};
      my_widget.render(properties);
    } catch {
      PRINT_N(0, "widget_index.js -- gpu_pipeline but render didn't get called.");
      debugger;
    }
  } else {
    PRINT_N(0,"widget_index.js -- gpu_pipeline -- calling my_widget.gpu_pipeline.call_plot_again()");
    my_widget.call_plot_again({});
  }
  return () => { console.log("calling my_widget.destroy()"); my_widget.destroy(); }
}

export default {
  initialize({model}) {
    PRINT_N(1, "widget_index.js->initialize(); called."); 
    PRINT_N(1, Object.keys(model));
    PRINT_N(1, "--  widget_index->intialize() end");
  },
  render({model, el}) {
    PRINT_N(1, "-- widget_index.render() called trying to call the async_gpu_render();");
    async_gpu_render({model,el});
    PRINT_N(1, "-- widget_index.render -- end of call to async_gpu_render.");
  }
}
