var in_this = null;

const debug_button_height = 75; const debug_button_width = 150;
///////////////////////////////////////////////////////////////
// Anywidget Configuration using a widget object class which controls model/el elements
//
// Our goal is to add my_this.to north of widget
function configureDebugButton(my_this) {
  console.log("Start Debug Button.");
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
  my_this.buttonDiv.setAttribute('width', debug_button_width + 'px');
  my_this.buttonDiv.style.background = 'var(--jp-layout-color0)';
  my_this.el.appendChild(my_this.buttonDiv);
  DEBUG && PRINT_N(1, "::: it is time for debug_button");

      my_this.debug_button = document.createElement('button');
      my_this.debug_button.style.height = '75' + 'px'; my_this.debug_button.style.width = '150' + 'px';
      my_this.debug_button.setAttribute('id','debug_button');
      my_this.debug_button.setAttribute('name','debug_button')
      my_this.debug_button.setAttribute('text','Launch Debug')
      my_this.debug_button.style.position = 'absolute';  
      my_this.debug_button.setAttribute('value','Launch Debug')
      my_this.debug_button.setAttribute('height','100px')
      my_this.debug_button.setAttribute('width', '200px')
      my_this.debug_button.setAttribute('top', '0px');  my_this.debug_button.style.top = '0px'; my_this.debug_button.style.left = '0px';
      my_this.debug_button.setAttribute('left','0px');
      my_this.debug_button.innerHTML = 'Launch Debug';
      my_this.debug_button.addEventListener('click', (event) => { in_this=my_this; console.log("graphing:::debug_button clicked");  debugger;});
      my_this.debug_button.addEventListener('onClick', (event) => { in_this=my_this; console.log("graphing:::debug_button clicked"); debugger;});
      my_this.buttonDiv.appendChild(my_this.debug_button);


      my_this.blank_button = document.createElement('button');
      my_this.blank_button.style.height = '75' + 'px'; my_this.debug_button.style.width = '150' + 'px';
      my_this.blank_button.setAttribute('id','blank_button');
      my_this.blank_button.setAttribute('name','blank_button')
      my_this.blank_button.setAttribute('text','Blank')
      my_this.blank_button.setAttribute('value','Blank')
      my_this.blank_button.style.position = 'absolute';  
      my_this.blank_button.setAttribute('height','100px')
      my_this.blank_button.setAttribute('width', '150px')
      my_this.blank_button.setAttribute('top', '0px');  my_this.blank_button.style.top = '0px'; my_this.blank_button.style.left = '200px';
      my_this.blank_button.style.width = '150px';
      my_this.blank_button.setAttribute('left','200px');
      my_this.blank_button.innerHTML = 'Blank';
      my_this.blank_button.addEventListener('click', (event) => { 
         in_this=my_this; console.log("graphing:::blank_button clicked");  
         my_this.BlankWindow();
      });
      my_this.blank_button.addEventListener('onClick', (event) => { 
        in_this=my_this;console.log("graphing:::blank_button clicked");  
        my_this.BlankWindow(); 
      })//;
      my_this.buttonDiv.appendChild(my_this.blank_button);

      my_this.algo_button = document.createElement('button');
      my_this.algo_button.style.height = '75' + 'px'; my_this.algo_button.style.width = '150' + 'px';
      my_this.algo_button.setAttribute('id','algo_button');
      my_this.algo_button.setAttribute('name','algo_button')
      my_this.algo_button.setAttribute('text','Run Algo')
      my_this.algo_button.style.position = 'absolute';  
      my_this.algo_button.setAttribute('value','Run Algo')
      my_this.algo_button.setAttribute('height','100px')
      my_this.algo_button.setAttribute('width', '200px')
      my_this.algo_button.setAttribute('top', '0px');  my_this.algo_button.style.top = '0px'; my_this.algo_button.style.left = '600px';
      my_this.algo_button.setAttribute('left','600px');
      my_this.algo_button.innerHTML = 'Launch Algo';
      //my_this.algo_button.addEventListener('click', (event) => { in_this=my_this; console.log("graphing:::algo_button clicked");  debugger;});
      //my_this.algo_button.addEventListener('onClick', (event) => { in_this=my_this; console.log("graphing:::algo_button clicked"); debugger;});
      my_this.buttonDiv.appendChild(my_this.algo_button);

      my_this.reset_button = document.createElement('button');
      my_this.reset_button.style.height = '75' + 'px'; my_this.debug_button.style.width = '150' + 'px';
      my_this.reset_button.setAttribute('id','call_plot_button');
      my_this.reset_button.setAttribute('name','call_plot_button')
      my_this.reset_button.setAttribute('text','Call to Generate Plot')
      my_this.reset_button.style.position = 'absolute';  
      my_this.reset_button.setAttribute('value','Call to Generate Plot')
      my_this.reset_button.setAttribute('height','100px')
      my_this.reset_button.setAttribute('width', '200px')
      my_this.reset_button.setAttribute('top', '0px');  
      my_this.debug_button.style.top = '0px'; my_this.debug_button.style.left = '400px';
      my_this.reset_button.setAttribute('left','400px');
      my_this.reset_button.innerHTML = 'Reset TimeAxis';
      my_this.reset_button.addEventListener('click', (event) => { 
        in_this=my_this;
        console.log("graphing:::reset_button::clicked:: calling plot."); 
        my_this.call_plot();
        console.log("graphing:::reset_button::clicked:: call_plot finished."); 
      });
      my_this.reset_button.addEventListener('onClick', (event) => { 
        console.log("graphing::reset_button::clicked.  About to call_plot();");  
        in_this=my_this;  my_this.call_plot();
        console.log("graphing:::call_plot_button clicked.  call_lot was called");
      });
  my_this.buttonDiv.appendChild(my_this.reset_button);
  DEBUG && PRINT_N(1, ":: reset button included and now Debug Button Install over.");
}   

exports = {"configureDebugButton":configureDebugButton, "debug_button_height":debug_button_height, "debug_button_width":debug_button_width};
module.exports = exports;
