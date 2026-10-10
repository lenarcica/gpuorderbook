var in_this = null;

const debug_button_height = 75; const debug_button_width = 180; const debug_button_margin = 30;

const bheight = 75;  

const off_color = 'rgb(239,239,239)'; const on_color = 'rgb(60,250,60)'; 
const please_color = 'rgb(230,150,230)'; const font_size=25;

const install_buttonDiv = function(my_this) {
  const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "debug.js->install_buttonDiv(): ");
  my_this.buttonDiv = document.createElement('div');
  my_this.buttonDiv.setAttribute('id', "buttonDiv" + my_this.randomStr);
  my_this.buttonDiv.style.position = 'relative';  
  my_this.buttonDiv.style.display = 'flex';
  my_this.buttonDiv.style.flexDirection = 'column';
  my_this.buttonDiv.style.justifyContent = 'left';
  my_this.buttonDiv.style.alignItems = 'top';
  my_this.buttonDiv.style.width = my_this.width === 'auto' ? '100%' : `${my_this.width}px`;
  my_this.buttonDiv.style.height = (debug_button_height) + 'px'; 
  my_this.buttonDiv.setAttribute('height',(debug_button_height) + 'px');
  my_this.buttonDiv.setAttribute('width', (debug_button_width*4 + debug_button_margin*3) + 'px');
  my_this.buttonDiv.style.background = 'var(--jp-layout-color0)';
  my_this.el.appendChild(my_this.buttonDiv);
  DEBUG && PRINT_N(1, "::: Success installing button Div");
}
const install_debug_button = function(my_this) {
  const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "debug.js->install_debug_button(): ");
  DEBUG && PRINT_N(1, " Install debug button.");
  my_this.debug_button = document.createElement('button');
  my_this.debug_button.style.height = '75' + 'px'; my_this.debug_button.style.width = (debug_button_width) + 'px';
  my_this.debug_button.setAttribute('id','debug_button');
  my_this.debug_button.setAttribute('name','debug_button')
  my_this.debug_button.setAttribute('text','Launch Debug')
  my_this.debug_button.style.position = 'absolute';  
  my_this.debug_button.setAttribute('value','Launch Debug')
  my_this.debug_button.setAttribute('height',debug_button_height + 'px')
  my_this.debug_button.setAttribute('width', debug_button_width + 'px')
  my_this.debug_button.setAttribute('top', 0+ 'px');  my_this.debug_button.style.top = '0px'; my_this.debug_button.style.left = '0px';
  my_this.debug_button.setAttribute('left',0 + 'px');
  my_this.debug_button.style.fontSize = font_size+'px';
  my_this.debug_button.innerHTML = 'Launch Debug';
  const click_func = function(event) {
    PRINT_N(2, "DEBUG Button is being clicked.");
    in_this=my_this; console.log("graphing:::debug_button clicked");  debugger;
  }
  my_this.debug_button.addEventListener('click', click_func); 
  my_this.debug_button.addEventListener('onClick', click_func); 
  my_this.buttonDiv.appendChild(my_this.debug_button);
  DEBUG && PRINT_N(1, ":: Debug button installed.");
}
const install_blank_button = function(my_this) {
  const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "debug.js->install_blank_button(): ");
  DEBUG && PRINT_N(1, " Install blank button.");
  my_this.blank_button = document.createElement('button');
  my_this.blank_button.style.height = '75' + 'px'; 
  my_this.blank_button.style.width = debug_button_width + 'px';
  my_this.blank_button.setAttribute('id','blank_button');
  my_this.blank_button.setAttribute('name','blank_button')
  my_this.blank_button.setAttribute('text','Blank')
  my_this.blank_button.setAttribute('value','Blank')
  my_this.blank_button.style.position = 'absolute';  
  my_this.blank_button.setAttribute('height',debug_button_height+ 'px')
  my_this.blank_button.setAttribute('width', debug_button_width+'px')
  my_this.blank_button.setAttribute('top', '0px');  my_this.blank_button.style.top = '0px'; 
  my_this.blank_button.style.left = (debug_button_width + debug_button_margin) + 'px';
  my_this.blank_button.innerHTML = 'Blank';
  my_this.blank_button.style.fontSize = font_size+'px';
  const blanker = function(event) {
    my_this.blank_button.style.backgroundColor = on_color;
    in_this=my_this; console.log("graphing:::blank_button clicked");  
    my_this.BlankWindow();
    my_this.blank_button.style.backgroundColor = off_color;

  }
  my_this.blank_button.style.backgroundColor = off_color;
  my_this.blank_button.addEventListener('click', blanker);
  my_this.blank_button.addEventListener('onClick',blanker);
  my_this.buttonDiv.appendChild(my_this.blank_button);
  DEBUG && PRINT_N(1, ":: blank button successfuuly installed. Returning");
}

const install_run_algo_button = function(my_this) {
  const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "debug.js->install_algo_button(): ");
  DEBUG && PRINT_N(2, " Initiate install algo");
  my_this.algo_button = document.createElement('button');
  my_this.algo_button.style.height = '75' + 'px'; my_this.algo_button.style.width = debug_button_width + 'px';
  my_this.algo_button.setAttribute('id','algo_button');
  my_this.algo_button.setAttribute('name','algo_button')
  my_this.algo_button.setAttribute('text','Run Algo')
  my_this.algo_button.style.position = 'absolute';  
  my_this.algo_button.setAttribute('value','Run Algo')
  my_this.algo_button.setAttribute('height','100px')
  my_this.algo_button.setAttribute('width', '200px')
  my_this.algo_button.setAttribute('top', '0px');  my_this.algo_button.style.top = '0px'; 
  my_this.algo_button.style.left = (3*(debug_button_width + debug_button_margin)) + 'px';
  my_this.algo_button.setAttribute('left','600px');
  my_this.algo_button.innerHTML = 'Launch Algo';
  my_this.algo_button.style.fontSize = font_size+'px';
  my_this.algo_button.style.backgroundColor = on_color;
  my_this.buttonDiv.appendChild(my_this.algo_button);


  DEBUG && PRINT_N(1, ":: algo button installed.");
  const click_func = function(event) { 
    my_this.algo_button.style.backgroundColor = on_color;
    PRINT_N(1, "graphing:::algo_button click: run_algo"); my_this.this_run_algo(); 
    PRINT_N(1, " --- algo button.  Finished");
    my_this.algo_button.style.backgroundColor = off_color;
  }
  my_this.algo_button.addEventListener('click', click_func);
  DEBUG && PRINT_N(1, ":: algo button installed.");
}

const install_render_widget_button = function(my_this) {
  const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "debug.js->install_render_widget_button(): ");
  DEBUG && PRINT_N(1, ":: Initiate Render Widget Install button.");
  my_this.render_widget_button = document.createElement('button');
  my_this.render_widget_button.style.height = '75' + 'px'; 
  my_this.render_widget_button.style.width = ((3*debug_button_width) + (2 * debug_button_margin)) + 'px';
  my_this.render_widget_button.setAttribute('id','render_widget_button');
  my_this.render_widget_button.setAttribute('name','render_widget_button')
  my_this.render_widget_button.setAttribute('text','Render Widget')
  my_this.render_widget_button.style.position = 'absolute';  
  my_this.render_widget_button.setAttribute('value','Render Widget')
  my_this.render_widget_button.setAttribute('height','100px')
  my_this.render_widget_button.setAttribute('width', '600px')
  my_this.render_widget_button.setAttribute('top', '0px');  my_this.render_widget_button.style.top = '0px'; 
  my_this.render_widget_button.style.left = (debug_button_width + debug_button_margin) + 'px';
  my_this.render_widget_button.setAttribute('left','200px');
  my_this.render_widget_button.innerHTML = 'Render Widget';
  my_this.buttonDiv.appendChild(my_this.render_widget_button);
  my_this.render_widget_button.style.backgroundColor = please_color;
  my_this.render_widget_button.style.fontSize = font_size+'px';

  DEBUG && PRINT_N(1, ":: render widget button installed.  Adding click Function");
  const click_func = function(event) { 
    PRINT_N(1, "graphing:::render_widget_button click: rendering widget");
    my_this.pause_render = false;  my_this.data.pause_render = false;
    my_this.render_widget_button.style.backgroundColor = on_color;
    my_this.buttonDiv.removeChild(my_this.render_widget_button);  my_this.render_widget_button = null; 
    install_run_algo_button(my_this);
    install_blank_button(my_this);
    install_reset_button(my_this);
    my_this.algo_button.style.backgroundColor = on_color;
    PRINT_N(2, "Now setting up data in object for rendering.");
    my_this.configure_algo_data();
    let properties = {};
    PRINT_N(1, "Launching initial render for widget");
    my_this.render(properties);
    my_this.algo_button.style.backgroundColor = off_color;
    PRINT_N(1, "Full render widget concluded.  Happy Apping!");
  }
  my_this.render_widget_button.addEventListener('click', click_func);
  DEBUG && PRINT_N(1, ":: render widget button function installed.");
  return(1);
}

const install_reset_button = function(my_this) {
  const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "debug.js->install_reset_button(): ");
  my_this.reset_button = document.createElement('button');
  my_this.reset_button.style.height = '75' + 'px'; 
  my_this.reset_button.style.width = debug_button_width + 'px';
  my_this.reset_button.setAttribute('id','call_plot_button');
  my_this.reset_button.setAttribute('name','call_plot_button')
  my_this.reset_button.setAttribute('text','Call to Generate Plot')
  my_this.reset_button.style.position = 'absolute';  
  my_this.reset_button.setAttribute('value','Call to Generate Plot')
  my_this.reset_button.setAttribute('height','100px')
  my_this.reset_button.setAttribute('width', '200px')
  my_this.reset_button.setAttribute('top', '0px');  
  my_this.debug_button.style.top = '0px'; 
  my_this.debug_button.style.left = (2*(debug_button_width + debug_button_margin)) + 'px';
  my_this.reset_button.setAttribute('left','400px');
  my_this.reset_button.innerHTML = 'Reset TimeAxis';
  my_this.reset_button.style.fontSize = font_size+'px';
  const click_func = function(event) {
    in_this=my_this;
    PRINT_N(2, "graphing:::reset_button::clicked:: calling plot."); 
    my_this.reset_settings();
    my_this.call_plot();
    PRINT_N(2, "graphing:::reset_button::clicked:: call_plot finished."); 
  }
  my_this.reset_button.addEventListener('click', click_func);
  my_this.reset_button.addEventListener('onClick', click_func);
  my_this.buttonDiv.appendChild(my_this.reset_button);
  return(1);
}
///////////////////////////////////////////////////////////////
// Anywidget Configuration using a widget object class which controls model/el elements
//
///////////////////////////////////////////////////////////////
// Anywidget Configuration using a widget object class which controls model/el elements
//
// Our goal is to add my_this.to north of widget
function configureDefaultButtons(my_this) {
  DEBUG && console.log("debug.js->configureDefaultButtons()::: Start Debug Button.");
  if ((!(my_this)) || (!(my_this.printer)) || (!(my_this.printer.make_print_n))) {
    console.log("ERROR configureDebugButton: what went wrong with printer?"); debugger;
  }
  const PRINT_N = my_this.printer.make_print_n(my_this.verbose_ob, "debug.js->configureDebugButton(): ");
  DEBUG && PRINT_N(1, "glwidget->class->configureDebugButton() initiate");
  DEBUG && PRINT_N(1, "rrr glwidget->class() Declaring and setting DEFAULT Jupyter DIV (nameStr=" 
         + my_this.randomStr+ ") location [w,h]=[" + my_this.width + "," + my_this.height + "]");
  DEBUG && PRINT_N(1, "rrr glwidget -- Declaring a buttonDiv");
  if (!(!(my_this.buttonDiv))) {
    console.log("obwidget->configureDebugButton  we have buttonDiv found");
    return(1);
  }
  const draw_ob = my_this.draw_ob;
  install_buttonDiv(my_this);
  DEBUG && PRINT_N(1, "::: INITIATE INSTALLATION of all buttons. First Debug");
  install_debug_button(my_this);
  DEBUG && PRINT_N(1, "::: Successfully concluded installing blank button.");
  if ((my_this.pause_render !== undefined) && (my_this.pause_render !== null) && (!(!(my_this.pause_render))) && (my_this.pause_render == true)) {
    install_render_widget_button(my_this);
  } else {
    install_run_algo_button(my_this);
    install_blank_button(my_this);
    install_reset_button(my_this);
  }
  DEBUG && PRINT_N(1, ":: configureDefaultButtons: Concluded. pause_render=[" + my_this.pause_render + "]");
}   

exports = {"configureDefaultButtons":configureDefaultButtons, "debug_button_height":debug_button_height, "debug_button_width":debug_button_width};
module.exports = exports;
