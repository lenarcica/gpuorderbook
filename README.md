# gpuorderbook -- A Test package for 2D GPU powered orderbook timeline 
 - Alan Lenarcic, study project
 - Version .01 (2025-10-10)

#  A demonstration study of 2D Web GPU graphics feeding off of jupyter source data.

# LICENSE GNU 2.0 (GNU General Public License, version 2)
 This is open source code for demonstration of certain performance characteristics and is not being
maintained as a full deployable solution.  It is recommended that readers implement their own solution.
  
# Methodology:
  NBBO and Orderbook are plotted using WebGPU as a series of static Triangles drawn on the Canvas.

  "nouislider.js" package is used to give users sliders that can shrink and grow time window of the plot.

  "pretty_num.js" functionality is used to support multi-scale approach to time (nanoseconds,... up to hours) and
    allowing to support arbitrary precision of time-stamps as measured versus a given baseline

  SVG based "sprites" are overlayed, representing "selected" orderbook and data, or location of Mouse cursor.

  It is expected that users would want to be able to draw a selection window and select orders around a price movement of interest.

## Dependencies:
  - Python environment supporting Jupyter Notebooks [web server hosting this is within a jupytrer notebook example]
  - AnyWidget environment installed in juypter notebook
  - Nouislider.js Javascript package
  - ESbuilder (to compile the javascript)
   
## Contents:
  widget_src/widget_index.js -- Anywidget interface.  Calling ESBuild on this file builds an entire version of widget
  static/internal : Functional code for the main javascript
     1. demo_data.js: simple example of a basic JSON format to power the orderbook viewer. (larger simulations demoed as well)
     2. ob.js:  Main widget class, constructor of related buttons.
     3. draw_ob.js: WebGPU code covering the canvas based elements.
     4. svg_ob.js: SVG code covering the forground selected SVG elements plotted on top of CANVAS
  static/internal_lib/ : Self Written assistant libraries
    pretty_num.js : functions adapting techniques from R's "pretty()" functionality to try and identify 
      human-intuitive break points amongst a sequence of time and price stamps.
      Note, this is designed to scale based upon any default "Unit Time", which can be hours/minutes/seconds/miliseconds, or
         any base unit in between.  This should adapt so that on "minute" baseline, time breaks are displayed at
         typical minute posts (at 60 second breaks), but zooming into time widths less than a second can take more decimal based breaks
  static/internal 
    mat_alt4.js: Matrix operations for using Cameras (including self-built adaptions of LookAt for quaternion based estimation)
    gl_camera.js: Changing REGL's camera library to deal with WebGPU parameters
      (example: View and Perspective must rely on z scale from 0 to 1, alternate methodologies for drawing new frame)
  static/external_lib: Copies of external JS that could be returned from versions online.
    - 1 External dependency: "nouislider".  Copy a version of the nouislider js and css files to install.

# Compiling this package.
  The Javascript modules, designed primarily with require statments, must be compiled together to produce a final
    "index.js" file that will be called by the jupyer notebook.

  Following advice from Anywidget we recomend ESbuild as a compiler.
